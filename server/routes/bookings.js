const express = require('express');
const { body, validationResult } = require('express-validator');

const pool = require('../db/connection');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// ── helpers ────────────────────────────────────────────────────────────────

// Returns whole days between two ISO date strings.
function daysBetween(start, end) {
  const ms = new Date(end) - new Date(start);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

// Shared SELECT that enriches a booking with listing info + party names.
// The caller appends a WHERE clause via the `where` argument.
function bookingSelectSql(where) {
  return `
    SELECT
      b.*,
      l.title          AS listing_title,
      l.price_per_day  AS listing_price_per_day,
      img.image_url    AS listing_primary_image,
      renter.name      AS renter_name,
      lender.name      AS lender_name
    FROM bookings b
    JOIN listings       l      ON l.id      = b.listing_id
    JOIN users          renter ON renter.id = b.renter_id
    JOIN users          lender ON lender.id = b.lender_id
    LEFT JOIN listing_images img
           ON img.listing_id = l.id AND img.is_primary = true
    WHERE ${where}
    ORDER BY b.created_at DESC
  `;
}

// ── POST /api/bookings ─────────────────────────────────────────────────────

router.post(
  '/',
  verifyToken,
  [
    body('listing_id').isInt().withMessage('listing_id must be an integer'),
    body('start_date').isDate().withMessage('start_date must be a valid date (YYYY-MM-DD)'),
    body('end_date').isDate().withMessage('end_date must be a valid date (YYYY-MM-DD)'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { listing_id, start_date, end_date, renter_message } = req.body;

    if (new Date(end_date) <= new Date(start_date)) {
      return res.status(400).json({ error: 'end_date must be after start_date' });
    }

    try {
      // 1. Verify listing exists and is bookable
      const listingRes = await pool.query(
        'SELECT * FROM listings WHERE id = $1',
        [listing_id]
      );
      const listing = listingRes.rows[0];

      if (!listing) {
        return res.status(404).json({ error: 'Listing not found' });
      }
      if (!listing.is_active || !listing.is_available) {
        return res.status(400).json({ error: 'Listing is not available for booking' });
      }

      // 2. Renter cannot book their own listing
      if (listing.owner_id === req.user.id) {
        return res.status(400).json({ error: 'You cannot book your own listing' });
      }

      // 3. Overlap check — an ACCEPTED booking that touches the requested range blocks it.
      //    Range overlap condition: existing.start < requested.end AND existing.end > requested.start
      const overlapRes = await pool.query(
        `SELECT id FROM bookings
         WHERE listing_id = $1
           AND status     = 'accepted'
           AND start_date < $3
           AND end_date   > $2`,
        [listing_id, start_date, end_date]
      );
      if (overlapRes.rows.length > 0) {
        return res.status(409).json({
          error: 'The listing is already booked for part of the requested dates',
        });
      }

      // 4. Pricing
      const days        = daysBetween(start_date, end_date);
      const total_price = parseFloat((listing.price_per_day * days).toFixed(2));
      const platform_fee = parseFloat((total_price * 0.10).toFixed(2));

      // 5. Insert
      const { rows } = await pool.query(
        `INSERT INTO bookings
           (listing_id, renter_id, lender_id,
            start_date, end_date,
            total_price, platform_fee,
            status, renter_message)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
         RETURNING *`,
        [
          listing_id,
          req.user.id,
          listing.owner_id,
          start_date,
          end_date,
          total_price,
          platform_fee,
          renter_message || null,
        ]
      );

      return res.status(201).json({ booking: rows[0] });
    } catch (err) {
      console.error('POST /bookings error:', err);
      return res.status(500).json({ error: 'Server error creating booking' });
    }
  }
);

// ── GET /api/bookings/my ───────────────────────────────────────────────────

router.get('/my', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      bookingSelectSql('b.renter_id = $1 OR b.lender_id = $1'),
      [req.user.id]
    );
    return res.json({ bookings: rows });
  } catch (err) {
    console.error('GET /bookings/my error:', err);
    return res.status(500).json({ error: 'Server error fetching bookings' });
  }
});

// ── GET /api/bookings/:id ──────────────────────────────────────────────────

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      bookingSelectSql('b.id = $1'),
      [req.params.id]
    );
    const booking = rows[0];

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isParty =
      booking.renter_id === req.user.id ||
      booking.lender_id === req.user.id ||
      req.user.is_admin;

    if (!isParty) return res.status(403).json({ error: 'Forbidden' });

    return res.json({ booking });
  } catch (err) {
    console.error('GET /bookings/:id error:', err);
    return res.status(500).json({ error: 'Server error fetching booking' });
  }
});

// ── PATCH /api/bookings/:id/status ────────────────────────────────────────

// Declarative transition table — all business rules in one place.
//
//   action    actor           valid from-states        to-state
//   ────────  ──────────────  ───────────────────────  ──────────
//   accept    lender only     pending                  accepted
//   decline   lender only     pending                  declined
//   cancel    renter or lend  pending, accepted         cancelled
//   complete  lender only     accepted                 completed

const TRANSITIONS = {
  accept:   { actorKey: 'lender', from: ['pending'],             to: 'accepted'  },
  decline:  { actorKey: 'lender', from: ['pending'],             to: 'declined'  },
  cancel:   { actorKey: 'either', from: ['pending', 'accepted'], to: 'cancelled' },
  complete: { actorKey: 'lender', from: ['accepted'],            to: 'completed' },
};

router.patch(
  '/:id/status',
  verifyToken,
  [
    body('action')
      .isIn(Object.keys(TRANSITIONS))
      .withMessage(`action must be one of: ${Object.keys(TRANSITIONS).join(', ')}`),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { action } = req.body;
    const { actorKey, from, to } = TRANSITIONS[action];

    try {
      const { rows } = await pool.query(
        'SELECT * FROM bookings WHERE id = $1',
        [req.params.id]
      );
      const booking = rows[0];
      if (!booking) return res.status(404).json({ error: 'Booking not found' });

      const isLender = booking.lender_id === req.user.id;
      const isRenter = booking.renter_id === req.user.id;

      // Actor check
      if (actorKey === 'lender' && !isLender) {
        return res.status(403).json({ error: `Only the lender can ${action} a booking` });
      }
      if (actorKey === 'either' && !isLender && !isRenter && !req.user.is_admin) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // From-state check
      if (!from.includes(booking.status)) {
        return res.status(400).json({
          error: `Cannot ${action} a booking that is currently '${booking.status}'`,
        });
      }

      const { rows: updated } = await pool.query(
        `UPDATE bookings
         SET status = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [to, req.params.id]
      );

      return res.json({ booking: updated[0] });
    } catch (err) {
      console.error('PATCH /bookings/:id/status error:', err);
      return res.status(500).json({ error: 'Server error updating booking status' });
    }
  }
);

module.exports = router;
