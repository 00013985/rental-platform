-- RentIt Seed Data — Tashkent demo dataset
-- All demo users share the password: password
-- Hash generated with bcrypt cost factor 10.
-- Run: psql $DATABASE_URL -f server/db/seed.sql

-- ============================================================
-- CATEGORIES
-- ============================================================
INSERT INTO categories (name, icon) VALUES
  ('Tools & DIY',           '🔧'),
  ('Camping & Outdoors',    '⛺'),
  ('Electronics & Gadgets', '📷'),
  ('Sports & Fitness',      '🎽'),
  ('Gaming',                '🎮'),
  ('Party & Events',        '🎉')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- USERS  (password = "password123" for all demo accounts)
-- ============================================================
-- bcrypt hash for "password123" (cost 10) — safe to use in dev/demo only
INSERT INTO users (name, email, password_hash, phone, bio) VALUES
  (
    'Zafar Toshmatov',
    'zafar@example.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    '+998-90-123-4567',
    'Tashkent handyman with a garage full of tools. Happy to lend gear to good neighbours in Chilanzar.'
  ),
  (
    'Malika Yusupova',
    'malika@example.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    '+998-91-234-5678',
    'Outdoor enthusiast based in Yunusabad. I rent out camping and sports equipment on weekends.'
  ),
  (
    'Jasur Karimov',
    'jasur@example.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    '+998-93-345-6789',
    'Tech lover from Mirzo Ulugbek. I own a lot of gadgets I rarely use — rent them cheap!'
  )
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- LISTINGS (12 spread across all 6 categories & 3 districts)
-- ============================================================
INSERT INTO listings
  (owner_id, category_id, title, description, price_per_day, condition, location)
VALUES

  -- ── Tools & DIY ──────────────────────────────────────────
  (
    (SELECT id FROM users WHERE email = 'zafar@example.com'),
    (SELECT id FROM categories WHERE name = 'Tools & DIY'),
    'Bosch Cordless Drill Set',
    'Professional 18 V drill kit with two batteries, fast charger, and 20-piece bit set. Perfect for shelving, furniture, or renovation projects.',
    9.00, 'good', 'Chilanzar, Tashkent'
  ),
  (
    (SELECT id FROM users WHERE email = 'zafar@example.com'),
    (SELECT id FROM categories WHERE name = 'Tools & DIY'),
    'Angle Grinder (125mm)',
    'Makita 840 W angle grinder with cutting and grinding discs. Protective guard included. Great for metalwork or tile cutting.',
    7.00, 'good', 'Chilanzar, Tashkent'
  ),
  (
    (SELECT id FROM users WHERE email = 'zafar@example.com'),
    (SELECT id FROM categories WHERE name = 'Tools & DIY'),
    'Pressure Washer — Karcher K4',
    'High-pressure cleaner ideal for cars, patios, or exteriors. 130 bar pressure, includes hose and surface cleaner attachment.',
    18.00, 'new', 'Chilanzar, Tashkent'
  ),

  -- ── Camping & Outdoors ───────────────────────────────────
  (
    (SELECT id FROM users WHERE email = 'malika@example.com'),
    (SELECT id FROM categories WHERE name = 'Camping & Outdoors'),
    '4-Person Camping Tent',
    'Spacious weatherproof dome tent — 10-minute pitch. Includes carry bag, pegs, and a rain fly. Tested at Chimgan.',
    14.00, 'good', 'Yunusabad, Tashkent'
  ),
  (
    (SELECT id FROM users WHERE email = 'malika@example.com'),
    (SELECT id FROM categories WHERE name = 'Camping & Outdoors'),
    'Hiking Backpack 60L',
    'Osprey Atmos 60 L trekking backpack with frame suspension and rain cover. Ideal for multi-day hikes in the Tian Shan.',
    12.00, 'good', 'Yunusabad, Tashkent'
  ),
  (
    (SELECT id FROM users WHERE email = 'malika@example.com'),
    (SELECT id FROM categories WHERE name = 'Camping & Outdoors'),
    'Portable Gas BBQ Grill',
    '2-burner portable propane grill with carry bag. Perfect for picnics at Yangiobod or Chorvoq. Gas canister not included.',
    10.00, 'good', 'Yunusabad, Tashkent'
  ),

  -- ── Electronics & Gadgets ────────────────────────────────
  (
    (SELECT id FROM users WHERE email = 'jasur@example.com'),
    (SELECT id FROM categories WHERE name = 'Electronics & Gadgets'),
    'Sony A7 III Mirrorless Camera',
    'Full-frame mirrorless camera body + 28-70 mm kit lens. Great for events, weddings, or content creation. Memory card included.',
    45.00, 'new', 'Mirzo Ulugbek, Tashkent'
  ),
  (
    (SELECT id FROM users WHERE email = 'jasur@example.com'),
    (SELECT id FROM categories WHERE name = 'Electronics & Gadgets'),
    'DJI Mini 3 Drone',
    'Foldable 4K drone with obstacle avoidance. Up to 38 min flight time. Includes controller, 3 batteries, and carrying case.',
    35.00, 'new', 'Mirzo Ulugbek, Tashkent'
  ),
  (
    (SELECT id FROM users WHERE email = 'jasur@example.com'),
    (SELECT id FROM categories WHERE name = 'Electronics & Gadgets'),
    'Projector — Epson EB-X51',
    '3600 lumen HD projector with HDMI, VGA, and USB inputs. Includes remote and 2 m HDMI cable. Ideal for home cinema nights.',
    20.00, 'good', 'Mirzo Ulugbek, Tashkent'
  ),

  -- ── Sports & Fitness ─────────────────────────────────────
  (
    (SELECT id FROM users WHERE email = 'malika@example.com'),
    (SELECT id FROM categories WHERE name = 'Sports & Fitness'),
    'Mountain Bike — Trek Marlin 7',
    '29" hardtail mountain bike, size M. Hydraulic disc brakes, 1x11 drivetrain. Helmet and lock included.',
    15.00, 'good', 'Yunusabad, Tashkent'
  ),

  -- ── Gaming ───────────────────────────────────────────────
  (
    (SELECT id FROM users WHERE email = 'jasur@example.com'),
    (SELECT id FROM categories WHERE name = 'Gaming'),
    'PlayStation 5 Console',
    'PS5 disc edition with 2 DualSense controllers and 3 games (FIFA 25, Spider-Man 2, GTA V). Pick up in Mirzo Ulugbek.',
    25.00, 'good', 'Mirzo Ulugbek, Tashkent'
  ),

  -- ── Party & Events ───────────────────────────────────────
  (
    (SELECT id FROM users WHERE email = 'zafar@example.com'),
    (SELECT id FROM categories WHERE name = 'Party & Events'),
    'Bluetooth PA Speaker (1000W)',
    'Audiocenter GT412A 1000 W powered column speaker. Mic input, Bluetooth, and built-in mixer. Perfect for garden parties.',
    22.00, 'good', 'Chilanzar, Tashkent'
  );

-- ============================================================
-- BOOKINGS
-- ============================================================

-- Booking 1: Jasur rents Zafar's drill — pending
INSERT INTO bookings
  (listing_id, renter_id, lender_id, start_date, end_date, total_price, platform_fee, status, renter_message)
VALUES (
  (SELECT id FROM listings WHERE title = 'Bosch Cordless Drill Set'),
  (SELECT id FROM users   WHERE email  = 'jasur@example.com'),
  (SELECT id FROM users   WHERE email  = 'zafar@example.com'),
  CURRENT_DATE + 3,
  CURRENT_DATE + 5,
  18.00,   -- 2 days × $9
  1.80,    -- 10 % platform fee
  'pending',
  'Hi Zafar, I need the drill for a weekend shelf-fitting project. Will take great care of it!'
);

-- Booking 2: Malika rents Jasur's projector — completed (so a review can follow)
INSERT INTO bookings
  (listing_id, renter_id, lender_id, start_date, end_date, total_price, platform_fee, status, renter_message)
VALUES (
  (SELECT id FROM listings WHERE title = 'Projector — Epson EB-X51'),
  (SELECT id FROM users   WHERE email  = 'malika@example.com'),
  (SELECT id FROM users   WHERE email  = 'jasur@example.com'),
  CURRENT_DATE - 10,
  CURRENT_DATE - 8,
  40.00,   -- 2 days × $20
  4.00,
  'completed',
  'Looking forward to a home cinema night. Thanks!'
);

-- ============================================================
-- MESSAGES
-- ============================================================

-- Message 1: Jasur enquires about the drill before booking
INSERT INTO messages (sender_id, receiver_id, listing_id, content) VALUES (
  (SELECT id FROM users    WHERE email = 'jasur@example.com'),
  (SELECT id FROM users    WHERE email = 'zafar@example.com'),
  (SELECT id FROM listings WHERE title = 'Bosch Cordless Drill Set'),
  'Salom Zafar! Is the drill available from next Friday to Sunday?'
);

-- Message 2: Zafar replies
INSERT INTO messages (sender_id, receiver_id, listing_id, content) VALUES (
  (SELECT id FROM users    WHERE email = 'zafar@example.com'),
  (SELECT id FROM users    WHERE email = 'jasur@example.com'),
  (SELECT id FROM listings WHERE title = 'Bosch Cordless Drill Set'),
  'Ha, albatta! Those dates are free. Go ahead and make a booking request.'
);

-- ============================================================
-- REVIEWS
-- ============================================================

-- Malika reviews Jasur (lender) after the completed projector booking
INSERT INTO reviews
  (booking_id, reviewer_id, reviewed_user_id, rating, comment)
VALUES (
  (SELECT b.id
   FROM bookings b
   JOIN listings l ON l.id = b.listing_id
   WHERE l.title = 'Projector — Epson EB-X51'
     AND b.status = 'completed'
   LIMIT 1),
  (SELECT id FROM users WHERE email = 'malika@example.com'),
  (SELECT id FROM users WHERE email = 'jasur@example.com'),
  5,
  'Jasur was super helpful and the projector worked perfectly. Great quality, highly recommended!'
);
