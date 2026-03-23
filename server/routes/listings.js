const express = require('express');
const { body, validationResult } = require('express-validator');

const pool = require('../db/connection');
const { verifyToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// ── helpers ────────────────────────────────────────────────────────────────

function validationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }
  return false;
}

// Resolve the listing and verify ownership (or admin).
// Returns the listing row, or sends the error response and returns null.
async function resolveOwned(req, res, listingId) {
  const { rows } = await pool.query(
    'SELECT * FROM listings WHERE id = $1',
    [listingId]
  );
  const listing = rows[0];
  if (!listing) {
    res.status(404).json({ error: 'Listing not found' });
    return null;
  }
  if (listing.owner_id !== req.user.id && !req.user.is_admin) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }
  return listing;
}

// ── GET /api/listings ──────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  const {
    category,
    keyword,
    min_price,
    max_price,
    owner_id,
    page  = 1,
    limit = 12,
  } = req.query;

  const pageNum  = Math.max(1, parseInt(page, 10)  || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 12));
  const offset   = (pageNum - 1) * pageSize;

  // Build WHERE clauses dynamically.
  // When owner_id is supplied (public profile view) we show all active listings
  // regardless of is_available so the owner's full catalogue is visible.
  const conditions = owner_id
    ? ['l.is_active = true']
    : ['l.is_active = true', 'l.is_available = true'];
  const params = [];

  if (owner_id) {
    params.push(parseInt(owner_id, 10));
    conditions.push(`l.owner_id = $${params.length}`);
  }
  if (category) {
    params.push(parseInt(category, 10));
    conditions.push(`l.category_id = $${params.length}`);
  }
  if (keyword) {
    params.push(`%${keyword}%`);
    conditions.push(
      `(l.title ILIKE $${params.length} OR l.description ILIKE $${params.length})`
    );
  }
  if (min_price) {
    params.push(parseFloat(min_price));
    conditions.push(`l.price_per_day >= $${params.length}`);
  }
  if (max_price) {
    params.push(parseFloat(max_price));
    conditions.push(`l.price_per_day <= $${params.length}`);
  }

  const where = conditions.join(' AND ');

  try {
    // Total count for pagination metadata
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM listings l WHERE ${where}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    // Paginated results
    params.push(pageSize, offset);
    const { rows } = await pool.query(
      `SELECT
         l.id,
         l.title,
         l.price_per_day,
         l.condition,
         l.location,
         l.created_at,
         u.name          AS owner_name,
         c.name          AS category_name,
         img.image_url   AS primary_image
       FROM listings l
       JOIN users       u   ON u.id   = l.owner_id
       LEFT JOIN categories c   ON c.id   = l.category_id
       LEFT JOIN listing_images img
              ON img.listing_id = l.id AND img.is_primary = true
       WHERE ${where}
       ORDER BY l.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.json({
      listings: rows,
      pagination: {
        total,
        page:  pageNum,
        limit: pageSize,
        pages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    console.error('GET /listings error:', err);
    return res.status(500).json({ error: 'Server error fetching listings' });
  }
});

// ── GET /api/listings/:id ──────────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         l.*,
         u.name        AS owner_name,
         u.bio         AS owner_bio,
         u.avatar_url  AS owner_avatar,
         u.created_at  AS owner_member_since,
         c.name        AS category_name,
         ROUND(AVG(r.rating), 2)::FLOAT AS average_rating,
         COUNT(r.id)::INT               AS review_count
       FROM listings l
       JOIN users       u ON u.id = l.owner_id
       LEFT JOIN categories  c ON c.id = l.category_id
       LEFT JOIN bookings    b ON b.listing_id = l.id
       LEFT JOIN reviews     r ON r.booking_id = b.id
       WHERE l.id = $1
       GROUP BY l.id, u.name, u.bio, u.avatar_url, u.created_at, c.name`,
      [req.params.id]
    );

    const listing = rows[0];
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    // Fetch all images separately so the GROUP BY stays clean
    const imgRes = await pool.query(
      `SELECT id, image_url, is_primary, uploaded_at
       FROM listing_images
       WHERE listing_id = $1
       ORDER BY is_primary DESC, uploaded_at ASC`,
      [req.params.id]
    );

    // Strip internal columns; expose only safe owner fields
    const {
      password_hash,
      owner_id,
      ...rest
    } = listing;

    return res.json({ listing: { ...rest, images: imgRes.rows } });
  } catch (err) {
    console.error('GET /listings/:id error:', err);
    return res.status(500).json({ error: 'Server error fetching listing' });
  }
});

// ── POST /api/listings ─────────────────────────────────────────────────────

router.post(
  '/',
  verifyToken,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('price_per_day')
      .isFloat({ min: 0 })
      .withMessage('price_per_day must be a non-negative number'),
    body('category_id').isInt().withMessage('category_id must be an integer'),
    body('condition')
      .optional()
      .isIn(['new', 'good', 'fair'])
      .withMessage("condition must be 'new', 'good', or 'fair'"),
  ],
  async (req, res) => {
    if (validationErrors(req, res)) return;

    const {
      title,
      description,
      category_id,
      price_per_day,
      condition,
      location,
    } = req.body;

    try {
      const { rows } = await pool.query(
        `INSERT INTO listings
           (owner_id, category_id, title, description, price_per_day, condition, location)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [req.user.id, category_id, title, description, price_per_day, condition, location]
      );
      return res.status(201).json({ listing: rows[0] });
    } catch (err) {
      console.error('POST /listings error:', err);
      return res.status(500).json({ error: 'Server error creating listing' });
    }
  }
);

// ── PUT /api/listings/:id ──────────────────────────────────────────────────

router.put(
  '/:id',
  verifyToken,
  [
    body('price_per_day')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('price_per_day must be a non-negative number'),
    body('condition')
      .optional()
      .isIn(['new', 'good', 'fair'])
      .withMessage("condition must be 'new', 'good', or 'fair'"),
    body('is_available')
      .optional()
      .isBoolean()
      .withMessage('is_available must be a boolean'),
  ],
  async (req, res) => {
    if (validationErrors(req, res)) return;

    try {
      const listing = await resolveOwned(req, res, req.params.id);
      if (!listing) return;

      const ALLOWED_FIELDS = [
        'title', 'description', 'category_id',
        'price_per_day', 'condition', 'location', 'is_available',
      ];

      // Build SET clause from only the fields present in the request body
      const updates = [];
      const values  = [];
      for (const field of ALLOWED_FIELDS) {
        if (req.body[field] !== undefined) {
          values.push(req.body[field]);
          updates.push(`${field} = $${values.length}`);
        }
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No updatable fields provided' });
      }

      // Always bump updated_at
      updates.push(`updated_at = NOW()`);
      values.push(req.params.id);

      const { rows } = await pool.query(
        `UPDATE listings SET ${updates.join(', ')}
         WHERE id = $${values.length}
         RETURNING *`,
        values
      );

      return res.json({ listing: rows[0] });
    } catch (err) {
      console.error('PUT /listings/:id error:', err);
      return res.status(500).json({ error: 'Server error updating listing' });
    }
  }
);

// ── DELETE /api/listings/:id ───────────────────────────────────────────────

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const listing = await resolveOwned(req, res, req.params.id);
    if (!listing) return;

    await pool.query(
      `UPDATE listings SET is_active = false, updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );

    return res.json({ message: 'Listing deactivated successfully' });
  } catch (err) {
    console.error('DELETE /listings/:id error:', err);
    return res.status(500).json({ error: 'Server error deactivating listing' });
  }
});

// ── POST /api/listings/:id/images ─────────────────────────────────────────

router.post(
  '/:id/images',
  verifyToken,
  upload.array('images', 5),
  async (req, res) => {
    // Handle multer errors (file type / size)
    // (multer errors surface as the next middleware's err argument;
    //  here we rely on Express's default error handler unless a global
    //  error handler is added — see index.js note)
    try {
      const listing = await resolveOwned(req, res, req.params.id);
      if (!listing) return;

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No image files provided' });
      }

      // Check whether the listing already has images
      const existingRes = await pool.query(
        'SELECT COUNT(*) FROM listing_images WHERE listing_id = $1',
        [req.params.id]
      );
      const existingCount = parseInt(existingRes.rows[0].count, 10);

      const insertedIds = [];
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const imageUrl  = `/uploads/${file.filename}`;
        const isPrimary = existingCount === 0 && i === 0; // first ever image is primary

        const { rows } = await pool.query(
          `INSERT INTO listing_images (listing_id, image_url, is_primary)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [req.params.id, imageUrl, isPrimary]
        );
        insertedIds.push(rows[0].id);
      }

      // Return all images for this listing
      const { rows: images } = await pool.query(
        `SELECT id, image_url, is_primary, uploaded_at
         FROM listing_images
         WHERE listing_id = $1
         ORDER BY is_primary DESC, uploaded_at ASC`,
        [req.params.id]
      );

      return res.status(201).json({ images });
    } catch (err) {
      console.error('POST /listings/:id/images error:', err);
      return res.status(500).json({ error: 'Server error uploading images' });
    }
  }
);

// ── DELETE /api/listings/:id/images/:imageId ───────────────────────────────

router.delete('/:id/images/:imageId', verifyToken, async (req, res) => {
  try {
    const listing = await resolveOwned(req, res, req.params.id);
    if (!listing) return;

    // Fetch the target image (must belong to this listing)
    const imgRes = await pool.query(
      `SELECT * FROM listing_images WHERE id = $1 AND listing_id = $2`,
      [req.params.imageId, req.params.id]
    );
    const image = imgRes.rows[0];
    if (!image) return res.status(404).json({ error: 'Image not found' });

    await pool.query('DELETE FROM listing_images WHERE id = $1', [req.params.imageId]);

    // If the deleted image was primary, promote the next oldest image
    if (image.is_primary) {
      await pool.query(
        `UPDATE listing_images
         SET is_primary = true
         WHERE listing_id = $1
           AND id = (
             SELECT id FROM listing_images
             WHERE listing_id = $1
             ORDER BY uploaded_at ASC
             LIMIT 1
           )`,
        [req.params.id]
      );
    }

    return res.json({ message: 'Image deleted successfully' });
  } catch (err) {
    console.error('DELETE /listings/:id/images/:imageId error:', err);
    return res.status(500).json({ error: 'Server error deleting image' });
  }
});

module.exports = router;
