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

// ── GET /api/admin/stats ───────────────────────────────────────────────────

router.get('/stats', async (req, res) => {
  try {
    // Platform-wide overview (single query, subqueries for each metric)
    const overviewRes = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users  WHERE is_admin = false)::INT                          AS total_users,
        (SELECT COUNT(*) FROM listings WHERE is_active = true)::INT                        AS active_listings,
        (SELECT COUNT(*) FROM listings WHERE is_active = false)::INT                       AS inactive_listings,
        (SELECT COUNT(*) FROM listings)::INT                                               AS total_listings,
        (SELECT COUNT(*) FROM bookings)::INT                                               AS total_bookings,
        (SELECT COUNT(*) FROM bookings WHERE status = 'pending')::INT                      AS pending_bookings,
        (SELECT COUNT(*) FROM bookings WHERE status = 'accepted')::INT                     AS accepted_bookings,
        (SELECT COUNT(*) FROM bookings WHERE status = 'completed')::INT                    AS completed_bookings,
        (SELECT COUNT(*) FROM bookings WHERE status = 'cancelled')::INT                    AS cancelled_bookings,
        (SELECT COUNT(*) FROM bookings WHERE status = 'declined')::INT                     AS declined_bookings,
        (SELECT COALESCE(SUM(total_price),  0) FROM bookings WHERE status = 'completed')   AS total_revenue,
        (SELECT COALESCE(SUM(platform_fee), 0) FROM bookings WHERE status = 'completed')   AS platform_fees,
        (SELECT COUNT(*) FROM messages)::INT                                               AS total_messages,
        (SELECT COUNT(*) FROM reviews)::INT                                                AS total_reviews,
        (SELECT ROUND(AVG(rating)::NUMERIC, 1) FROM reviews)                               AS avg_rating
    `);

    // Monthly bookings + revenue — last 6 months, filled even for empty months
    const monthlyRes = await pool.query(`
      WITH months AS (
        SELECT generate_series(
          DATE_TRUNC('month', NOW() - INTERVAL '5 months'),
          DATE_TRUNC('month', NOW()),
          '1 month'::interval
        ) AS month_start
      ),
      stats AS (
        SELECT
          DATE_TRUNC('month', created_at)                                                 AS month_start,
          COUNT(*)::INT                                                                    AS booking_count,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN total_price ELSE 0 END), 0)   AS revenue
        FROM bookings
        WHERE created_at >= DATE_TRUNC('month', NOW() - INTERVAL '5 months')
        GROUP BY 1
      )
      SELECT
        TO_CHAR(m.month_start, 'Mon')  AS label,
        COALESCE(s.booking_count, 0)   AS booking_count,
        COALESCE(s.revenue, 0)         AS revenue
      FROM months m
      LEFT JOIN stats s ON s.month_start = m.month_start
      ORDER BY m.month_start
    `);

    // Per-category listing and booking counts
    const categoryRes = await pool.query(`
      SELECT
        c.name,
        c.icon,
        COUNT(DISTINCT l.id)::INT   AS listing_count,
        COUNT(DISTINCT b.id)::INT   AS booking_count
      FROM categories c
      LEFT JOIN listings l ON l.category_id = c.id AND l.is_active = true
      LEFT JOIN bookings b ON b.listing_id = l.id
      GROUP BY c.id, c.name, c.icon
      ORDER BY listing_count DESC
    `);

    // 8 most recent bookings
    const recentBookingsRes = await pool.query(`
      SELECT
        b.id,
        b.status,
        b.start_date,
        b.end_date,
        b.total_price,
        b.created_at,
        r.name  AS renter_name,
        ln.name AS lender_name,
        l.title AS listing_title
      FROM bookings b
      JOIN users    r  ON r.id  = b.renter_id
      JOIN users    ln ON ln.id = b.lender_id
      JOIN listings l  ON l.id  = b.listing_id
      ORDER BY b.created_at DESC
      LIMIT 8
    `);

    // 6 most recently joined users
    const recentUsersRes = await pool.query(`
      SELECT id, name, email, avatar_url, is_admin, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 6
    `);

    // Top 5 listings by booking count
    const topListingsRes = await pool.query(`
      SELECT
        l.id,
        l.title,
        l.price_per_day,
        u.name AS owner_name,
        COUNT(b.id)::INT AS booking_count,
        COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_price ELSE 0 END), 0) AS revenue
      FROM listings l
      JOIN users u ON u.id = l.owner_id
      LEFT JOIN bookings b ON b.listing_id = l.id
      WHERE l.is_active = true
      GROUP BY l.id, l.title, l.price_per_day, u.name
      ORDER BY booking_count DESC, revenue DESC
      LIMIT 5
    `);

    return res.json({
      overview:       overviewRes.rows[0],
      monthly:        monthlyRes.rows,
      categories:     categoryRes.rows,
      recentBookings: recentBookingsRes.rows,
      recentUsers:    recentUsersRes.rows,
      topListings:    topListingsRes.rows,
    });
  } catch (err) {
    console.error('GET /admin/stats error:', err);
    return res.status(500).json({ error: 'Server error fetching stats' });
  }
});

module.exports = router;
