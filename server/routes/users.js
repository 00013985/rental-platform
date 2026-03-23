const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

const pool = require('../db/connection');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/users/:id  (public profile) ──────────────────────────────────

router.get('/:id', async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId)) return res.status(400).json({ error: 'userId must be an integer' });

  try {
    const { rows } = await pool.query(
      `SELECT
         u.id,
         u.name,
         u.bio,
         u.avatar_url,
         u.created_at,
         ROUND(AVG(r.rating), 2)::FLOAT AS average_rating,
         COUNT(DISTINCT r.id)::INT      AS review_count,
         COUNT(DISTINCT l.id)::INT      AS listing_count
       FROM users u
       LEFT JOIN reviews  r ON r.reviewed_user_id = u.id
       LEFT JOIN listings l ON l.owner_id = u.id AND l.is_active = true
       WHERE u.id = $1
       GROUP BY u.id`,
      [userId]
    );

    if (!rows[0]) return res.status(404).json({ error: 'User not found' });

    return res.json({ user: rows[0] });
  } catch (err) {
    console.error('GET /users/:id error:', err);
    return res.status(500).json({ error: 'Server error fetching user profile' });
  }
});

// ── PUT /api/users/me  (update own profile) ───────────────────────────────

router.put(
  '/me',
  verifyToken,
  [
    body('name').optional().notEmpty().withMessage('name cannot be blank'),
    body('bio').optional({ nullable: true }).isString(),
    body('phone').optional({ nullable: true }).isString(),
    body('avatar_url').optional({ nullable: true }).isURL().withMessage('avatar_url must be a valid URL'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const ALLOWED = ['name', 'bio', 'phone', 'avatar_url'];
    const updates = [];
    const values  = [];

    for (const field of ALLOWED) {
      if (req.body[field] !== undefined) {
        values.push(req.body[field]);
        updates.push(`${field} = $${values.length}`);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided' });
    }

    values.push(req.user.id);

    try {
      const { rows } = await pool.query(
        `UPDATE users
         SET ${updates.join(', ')}
         WHERE id = $${values.length}
         RETURNING id, name, email, phone, avatar_url, bio, is_admin, created_at`,
        values
      );

      return res.json({ user: rows[0] });
    } catch (err) {
      console.error('PUT /users/me error:', err);
      return res.status(500).json({ error: 'Server error updating profile' });
    }
  }
);

// ── PUT /api/users/me/password ─────────────────────────────────────────────

router.put(
  '/me/password',
  verifyToken,
  [
    body('current_password').notEmpty().withMessage('current_password is required'),
    body('new_password')
      .isLength({ min: 8 })
      .withMessage('new_password must be at least 8 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { current_password, new_password } = req.body;

    try {
      const { rows } = await pool.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [req.user.id]
      );

      const valid = await bcrypt.compare(current_password, rows[0].password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      const new_hash = await bcrypt.hash(new_password, 10);

      await pool.query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [new_hash, req.user.id]
      );

      return res.json({ message: 'Password updated successfully' });
    } catch (err) {
      console.error('PUT /users/me/password error:', err);
      return res.status(500).json({ error: 'Server error updating password' });
    }
  }
);

module.exports = router;
