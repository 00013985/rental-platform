-- RentIt Database Schema
-- Run this file to create all tables: psql $DATABASE_URL -f server/db/schema.sql

-- ============================================================
-- 1. USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(150)  UNIQUE NOT NULL,
  password_hash TEXT          NOT NULL,
  phone         VARCHAR(30),
  avatar_url    TEXT,
  bio           TEXT,
  is_admin      BOOLEAN       NOT NULL DEFAULT false,
  created_at    TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  icon VARCHAR(50)
);

-- ============================================================
-- 3. LISTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS listings (
  id            SERIAL PRIMARY KEY,
  owner_id      INTEGER       NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
  category_id   INTEGER       REFERENCES categories(id),
  title         VARCHAR(200)  NOT NULL,
  description   TEXT,
  price_per_day NUMERIC(10,2) NOT NULL CHECK (price_per_day >= 0),
  condition     VARCHAR(50)   CHECK (condition IN ('new', 'good', 'fair')),
  location      VARCHAR(200),
  is_available  BOOLEAN       NOT NULL DEFAULT true,
  is_active     BOOLEAN       NOT NULL DEFAULT true,
  created_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. LISTING IMAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS listing_images (
  id          SERIAL PRIMARY KEY,
  listing_id  INTEGER   NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  image_url   TEXT      NOT NULL,
  is_primary  BOOLEAN   NOT NULL DEFAULT false,
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. BOOKINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id              SERIAL PRIMARY KEY,
  listing_id      INTEGER       NOT NULL REFERENCES listings(id),
  renter_id       INTEGER       NOT NULL REFERENCES users(id),
  lender_id       INTEGER       NOT NULL REFERENCES users(id),
  start_date      DATE          NOT NULL,
  end_date        DATE          NOT NULL,
  total_price     NUMERIC(10,2) CHECK (total_price >= 0),
  platform_fee    NUMERIC(10,2) CHECK (platform_fee >= 0),
  status          VARCHAR(30)   NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'completed')),
  renter_message  TEXT,
  created_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP     NOT NULL DEFAULT NOW(),

  CONSTRAINT bookings_dates_check CHECK (end_date >= start_date)
);

-- ============================================================
-- 6. MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id          SERIAL PRIMARY KEY,
  booking_id  INTEGER   REFERENCES bookings(id) ON DELETE CASCADE,   -- nullable (pre-booking inquiry)
  sender_id   INTEGER   NOT NULL REFERENCES users(id),
  receiver_id INTEGER   NOT NULL REFERENCES users(id),
  listing_id  INTEGER   REFERENCES listings(id),
  content     TEXT      NOT NULL,
  is_read     BOOLEAN   NOT NULL DEFAULT false,
  sent_at     TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT messages_different_users CHECK (sender_id <> receiver_id)
);

-- ============================================================
-- 7. REVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id               SERIAL PRIMARY KEY,
  booking_id       INTEGER   NOT NULL REFERENCES bookings(id),
  reviewer_id      INTEGER   NOT NULL REFERENCES users(id),
  reviewed_user_id INTEGER   NOT NULL REFERENCES users(id),
  rating           INTEGER   NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment          TEXT,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Each user may leave at most one review per booking (both parties can review)
  CONSTRAINT reviews_one_per_reviewer UNIQUE (booking_id, reviewer_id),
  CONSTRAINT reviews_different_users  CHECK  (reviewer_id <> reviewed_user_id)
);
