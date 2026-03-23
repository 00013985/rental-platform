const express = require('express');
const { body, validationResult } = require('express-validator');

const pool = require('../db/connection');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// ── POST /api/messages ─────────────────────────────────────────────────────

router.post(
  '/',
  verifyToken,
  [
    body('receiver_id').isInt().withMessage('receiver_id must be an integer'),
    body('listing_id').isInt().withMessage('listing_id must be an integer'),
    body('content').notEmpty().withMessage('content is required'),
    body('booking_id').optional({ nullable: true }).isInt()
      .withMessage('booking_id must be an integer'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { receiver_id, listing_id, content, booking_id = null } = req.body;

    // Cannot message yourself
    if (receiver_id === req.user.id) {
      return res.status(400).json({ error: 'You cannot send a message to yourself' });
    }

    try {
      // Verify receiver exists
      const receiverRes = await pool.query(
        'SELECT id FROM users WHERE id = $1',
        [receiver_id]
      );
      if (!receiverRes.rows[0]) {
        return res.status(404).json({ error: 'Receiver not found' });
      }

      // Verify listing exists
      const listingRes = await pool.query(
        'SELECT id FROM listings WHERE id = $1',
        [listing_id]
      );
      if (!listingRes.rows[0]) {
        return res.status(404).json({ error: 'Listing not found' });
      }

      const { rows } = await pool.query(
        `INSERT INTO messages
           (sender_id, receiver_id, listing_id, booking_id, content)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [req.user.id, receiver_id, listing_id, booking_id, content]
      );

      return res.status(201).json({ message: rows[0] });
    } catch (err) {
      console.error('POST /messages error:', err);
      return res.status(500).json({ error: 'Server error sending message' });
    }
  }
);

// ── GET /api/messages/conversations ───────────────────────────────────────
//
// One "conversation" = the unique (listing_id, canonical_pair) combination,
// where canonical_pair = (LEAST(u1,u2), GREATEST(u1,u2)) so a ↔ b and b ↔ a
// don't produce two rows.
//
// Strategy:
//   1. CTE `ranked` — assign row_number() per conversation partition, ordered
//      by sent_at DESC, so row 1 is the latest message.
//   2. Filter to row 1 to get the "last message" row for each conversation.
//   3. JOIN users for the other party's profile.
//   4. Subquery for unread count per conversation.

router.get('/conversations', verifyToken, async (req, res) => {
  const me = req.user.id;

  try {
    const { rows } = await pool.query(
      `WITH ranked AS (
         SELECT
           m.*,
           LEAST(m.sender_id, m.receiver_id)    AS user_a,
           GREATEST(m.sender_id, m.receiver_id) AS user_b,
           ROW_NUMBER() OVER (
             PARTITION BY m.listing_id,
                          LEAST(m.sender_id, m.receiver_id),
                          GREATEST(m.sender_id, m.receiver_id)
             ORDER BY m.sent_at DESC
           ) AS rn
         FROM messages m
         WHERE m.sender_id = $1 OR m.receiver_id = $1
       )
       SELECT
         r.listing_id,
         r.user_a,
         r.user_b,
         r.content          AS last_message,
         r.sent_at          AS last_sent_at,
         l.title            AS listing_title,
         other_u.id         AS other_user_id,
         other_u.name       AS other_user_name,
         other_u.avatar_url AS other_user_avatar,
         (
           SELECT COUNT(*)
           FROM messages unread
           WHERE unread.receiver_id = $1
             AND unread.is_read     = false
             AND unread.listing_id  = r.listing_id
             AND LEAST(unread.sender_id, unread.receiver_id)    = r.user_a
             AND GREATEST(unread.sender_id, unread.receiver_id) = r.user_b
         )::INT AS unread_count
       FROM ranked r
       JOIN listings l    ON l.id = r.listing_id
       JOIN users other_u ON other_u.id = CASE
                               WHEN r.sender_id = $1 THEN r.receiver_id
                               ELSE r.sender_id
                             END
       WHERE r.rn = 1
       ORDER BY r.sent_at DESC`,
      [me]
    );

    return res.json({ conversations: rows });
  } catch (err) {
    console.error('GET /messages/conversations error:', err);
    return res.status(500).json({ error: 'Server error fetching conversations' });
  }
});

// ── GET /api/messages/conversation/:userId/:listingId ─────────────────────
//
// Returns every message in the thread between the current user and :userId
// for a given listing, then marks all unread messages (received by the current
// user) as read in the same request.

router.get('/conversation/:userId/:listingId', verifyToken, async (req, res) => {
  const me      = req.user.id;
  const other   = parseInt(req.params.userId,   10);
  const listing = parseInt(req.params.listingId, 10);

  if (isNaN(other) || isNaN(listing)) {
    return res.status(400).json({ error: 'userId and listingId must be integers' });
  }

  try {
    // Fetch all messages in this thread
    const { rows: messages } = await pool.query(
      `SELECT
         m.*,
         sender.name       AS sender_name,
         sender.avatar_url AS sender_avatar
       FROM messages m
       JOIN users sender ON sender.id = m.sender_id
       WHERE m.listing_id = $1
         AND (
           (m.sender_id = $2 AND m.receiver_id = $3)
           OR
           (m.sender_id = $3 AND m.receiver_id = $2)
         )
       ORDER BY m.sent_at ASC`,
      [listing, me, other]
    );

    // Mark messages received by the current user as read
    await pool.query(
      `UPDATE messages
       SET is_read = true
       WHERE listing_id   = $1
         AND sender_id    = $2
         AND receiver_id  = $3
         AND is_read      = false`,
      [listing, other, me]
    );

    return res.json({ messages });
  } catch (err) {
    console.error('GET /messages/conversation error:', err);
    return res.status(500).json({ error: 'Server error fetching conversation' });
  }
});

// ── GET /api/messages/unread-count ────────────────────────────────────────

router.get('/unread-count', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::INT AS count
       FROM messages
       WHERE receiver_id = $1 AND is_read = false`,
      [req.user.id]
    );
    return res.json({ count: rows[0].count });
  } catch (err) {
    console.error('GET /messages/unread-count error:', err);
    return res.status(500).json({ error: 'Server error fetching unread count' });
  }
});

module.exports = router;
