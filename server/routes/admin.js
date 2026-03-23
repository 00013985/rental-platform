const express = require('express');

const pool = require('../db/connection');
const { verifyToken } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminOnly');

const router = express.Router();

// All admin routes require a valid JWT AND is_admin = true
router.use(verifyToken, adminOnly);

// ── GET /api/admin/listings ────────────────────────────────────────────────

router.get('/listings', async (req, res) => {
  const page     = Math.max(1, parseInt(req.query.page,  10) || 1);
  const limit    = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset   = (page - 1) * limit;

  try {
    const countRes = await pool.query('SELECT COUNT(*) FROM listings');
    const total    = parseInt(countRes.rows[0].count, 10);

    const { rows } = await pool.query(
      `SELECT
         l.*,
         u.name    AS owner_name,
         c.name    AS category_name
       FROM listings l
       JOIN users       u ON u.id = l.owner_id
       LEFT JOIN categories c ON c.id = l.category_id
       ORDER BY l.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return res.json({
      listings: rows,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('GET /admin/listings error:', err);
    return res.status(500).json({ error: 'Server error fetching listings' });
  }
});

// ── PATCH /api/admin/listings/:id/deactivate ──────────────────────────────

router.patch('/listings/:id/deactivate', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE listings
       SET is_active = false, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Listing not found' });
    return res.json({ listing: rows[0] });
  } catch (err) {
    console.error('PATCH /admin/listings/:id/deactivate error:', err);
    return res.status(500).json({ error: 'Server error deactivating listing' });
  }
});

// ── PATCH /api/admin/listings/:id/activate ────────────────────────────────

router.patch('/listings/:id/activate', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE listings
       SET is_active = true, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Listing not found' });
    return res.json({ listing: rows[0] });
  } catch (err) {
    console.error('PATCH /admin/listings/:id/activate error:', err);
    return res.status(500).json({ error: 'Server error activating listing' });
  }
});

// ── GET /api/admin/users ───────────────────────────────────────────────────

router.get('/users', async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page,  10) || 1);
  const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  try {
    const countRes = await pool.query('SELECT COUNT(*) FROM users');
    const total    = parseInt(countRes.rows[0].count, 10);

    const { rows } = await pool.query(
      `SELECT id, name, email, phone, avatar_url, bio, is_admin, created_at
       FROM users
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return res.json({
      users: rows,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('GET /admin/users error:', err);
    return res.status(500).json({ error: 'Server error fetching users' });
  }
});

module.exports = router;
