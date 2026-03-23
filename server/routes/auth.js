const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const pool = require('../db/connection');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// ── helpers ────────────────────────────────────────────────────────────────

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, is_admin: user.is_admin },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function safeUser(row) {
  const { password_hash, ...user } = row;
  return user;
}

// ── POST /api/auth/register ────────────────────────────────────────────────

router.post(
  '/register',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    try {
      // check for duplicate email
      const existing = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Email is already in use' });
      }

      const password_hash = await bcrypt.hash(password, 10);

      const { rows } = await pool.query(
        `INSERT INTO users (name, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [name, email, password_hash]
      );

      const user = rows[0];
      const token = signToken(user);

      return res.status(201).json({ token, user: safeUser(user) });
    } catch (err) {
      console.error('register error:', err);
      return res.status(500).json({ error: 'Server error during registration' });
    }
  }
);

// ── POST /api/auth/login ───────────────────────────────────────────────────

router.post(
  '/login',
  [
    body('email').notEmpty().withMessage('Email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const { rows } = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      // generic failure — do not reveal whether the email exists
      const user = rows[0];
      const passwordMatch = user
        ? await bcrypt.compare(password, user.password_hash)
        : false;

      if (!user || !passwordMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = signToken(user);
      return res.status(200).json({ token, user: safeUser(user) });
    } catch (err) {
      console.error('login error:', err);
      return res.status(500).json({ error: 'Server error during login' });
    }
  }
);

// ── GET /api/auth/me ───────────────────────────────────────────────────────

router.get('/me', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, phone, avatar_url, bio, is_admin, created_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (!rows[0]) {
      return res.status(401).json({ error: 'User not found' });
    }

    return res.status(200).json({ user: rows[0] });
  } catch (err) {
    console.error('me error:', err);
    return res.status(500).json({ error: 'Server error fetching profile' });
  }
});

module.exports = router;
