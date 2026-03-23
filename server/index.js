require('dotenv').config();
const path    = require('path');
const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
const multer  = require('multer');

const authRouter     = require('./routes/auth');
const listingsRouter = require('./routes/listings');
const bookingsRouter = require('./routes/bookings');
const messagesRouter = require('./routes/messages');
const reviewsRouter  = require('./routes/reviews');
const usersRouter    = require('./routes/users');
const adminRouter    = require('./routes/admin');
const pool           = require('./db/connection');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── CORS ──────────────────────────────────────────────────────────────────────
// Allow the configured frontend origin; also accept requests with no Origin
// header (e.g. mobile clients, curl) by passing a function.
app.use(
  cors({
    origin: (origin, cb) => {
      const allowed = process.env.CLIENT_URL || 'http://localhost:5173';
      if (!origin || origin === allowed) return cb(null, true);
      cb(new Error(`CORS policy: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

// ── Request logging (development only) ───────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use(express.json());

// ── Static uploads ────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ── Categories (public, cached on frontend) ───────────────────────────────────
app.get('/api/categories', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, icon FROM categories ORDER BY id ASC'
    );
    res.json({ categories: rows });
  } catch (err) {
    next(err);
  }
});

// ── Feature routers ───────────────────────────────────────────────────────────
app.use('/api/auth',     authRouter);
app.use('/api/listings', listingsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/reviews',  reviewsRouter);
app.use('/api/users',    usersRouter);
app.use('/api/admin',    adminRouter);

// ── Global error handler ─────────────────────────────────────────────────────
// Must be defined AFTER all routes (4-argument signature).
// Handles both multer errors and any other unhandled errors.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message?.includes('Only JPEG')) {
    return res.status(400).json({ error: err.message });
  }
  console.error('Unhandled error:', err);
  const status  = err.status ?? err.statusCode ?? 500;
  const message = err.expose ? err.message : 'Internal server error';
  return res.status(status).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} [${process.env.NODE_ENV ?? 'development'}]`);
});
