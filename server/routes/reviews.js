const express = require('express');
const { body, validationResult } = require('express-validator');

const pool = require('../db/connection');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// ── POST /api/reviews ──────────────────────────────────────────────────────

router.post(
  '/',
  verifyToken,
  [
    body('booking_id').isInt().withMessage('booking_id must be an integer'),
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('rating must be an integer between 1 and 5'),
    body('comment').optional({ nullable: true }).isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { booking_id, rating, comment = null } = req.body;
    const me = req.user.id;

    try {
      // Verify booking exists and is completed
      const bookingRes = await pool.query(
        'SELECT * FROM bookings WHERE id = $1',
        [booking_id]
      );
      const booking = bookingRes.rows[0];

      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      if (booking.status !== 'completed') {
        return res.status(400).json({ error: 'Only completed bookings can be reviewed' });
      }

      // Only the renter or lender of this booking may review
      const isRenter = booking.renter_id === me;
      const isLender = booking.lender_id === me;
      if (!isRenter && !isLender) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // The person being reviewed is the other party
      const reviewed_user_id = isRenter ? booking.lender_id : booking.renter_id;

      // Check for existing review by this user for this booking
      const dupRes = await pool.query(
        'SELECT id FROM reviews WHERE booking_id = $1 AND reviewer_id = $2',
        [booking_id, me]
      );
      if (dupRes.rows.length > 0) {
        return res.status(409).json({ error: 'You have already reviewed this booking' });
      }

      const { rows } = await pool.query(
        `INSERT INTO reviews
           (booking_id, reviewer_id, reviewed_user_id, rating, comment)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [booking_id, me, reviewed_user_id, rating, comment]
      );

      return res.status(201).json({ review: rows[0] });
    } catch (err) {
      console.error('POST /reviews error:', err);
      return res.status(500).json({ error: 'Server error creating review' });
    }
  }
);

// ── GET /api/reviews/user/:userId ──────────────────────────────────────────

router.get('/user/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  if (isNaN(userId)) return res.status(400).json({ error: 'userId must be an integer' });

  try {
    const { rows: reviews } = await pool.query(
      `SELECT
         r.id,
         r.rating,
         r.comment,
         r.created_at,
         u.id         AS reviewer_id,
         u.name       AS reviewer_name,
         u.avatar_url AS reviewer_avatar
       FROM reviews r
       JOIN users u ON u.id = r.reviewer_id
       WHERE r.reviewed_user_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    );

    const statsRes = await pool.query(
      `SELECT
         ROUND(AVG(rating), 2)::FLOAT AS average_rating,
         COUNT(*)::INT                AS total_count
       FROM reviews
       WHERE reviewed_user_id = $1`,
      [userId]
    );

    const { average_rating, total_count } = statsRes.rows[0];

    return res.json({ reviews, average_rating, total_count });
  } catch (err) {
    console.error('GET /reviews/user/:userId error:', err);
    return res.status(500).json({ error: 'Server error fetching reviews' });
  }
});

module.exports = router;
