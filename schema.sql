-- ============================================================
--  Kamakshi Catering — PostgreSQL Schema (v3)
--  Run once: psql -U postgres -d kamakshi_db -f schema.sql
-- ============================================================

-- CREATE DATABASE kamakshi_db;

-- ── Reviews (with optional photo) ────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
    id              SERIAL PRIMARY KEY,
    customer_name   VARCHAR(100) NOT NULL,
    rating          INT CHECK (rating >= 1 AND rating <= 5),
    review_message  TEXT NOT NULL,
    photo_filename  VARCHAR(255),                  -- stored under static/uploads/
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Upgrade existing installs (safe if column already exists)
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS photo_filename VARCHAR(255);

-- ── Event Bookings ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
    id           SERIAL PRIMARY KEY,
    full_name    VARCHAR(150) NOT NULL,
    phone        VARCHAR(20)  NOT NULL,
    event_type   VARCHAR(100) NOT NULL,
    event_date   DATE         NOT NULL,
    guests       INT          DEFAULT 0,
    address      TEXT,
    menu         TEXT,
    message      TEXT,
    status       VARCHAR(20)  DEFAULT 'pending',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Upgrade existing installs (safe if columns already exist)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS menu TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';

-- ── Gallery Photos ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gallery (
    id             SERIAL PRIMARY KEY,
    photo_filename VARCHAR(255) NOT NULL,
    caption        VARCHAR(200) DEFAULT '',
    sort_order     INT          DEFAULT 0,
    is_static      BOOLEAN      DEFAULT FALSE,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Safe upgrade for existing installs
ALTER TABLE gallery ADD COLUMN IF NOT EXISTS is_static BOOLEAN DEFAULT FALSE;

-- ============================================================
--  Kamakshi Catering — Menu Items Table (v4)
--  Run once: psql -U postgres -d kamakshi_db -f schema_menu.sql
--  Safe to run on existing installs — uses IF NOT EXISTS
-- ============================================================

CREATE TABLE IF NOT EXISTS menu_items (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(200) NOT NULL,
    category   VARCHAR(100) NOT NULL DEFAULT 'General',
    is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order INT          NOT NULL DEFAULT 0,
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast category grouping
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items (category);
CREATE INDEX IF NOT EXISTS idx_menu_items_active   ON menu_items (is_active);



-- ── Sample seed data ─────────────────────────────────────────
INSERT INTO reviews (customer_name, rating, review_message) VALUES
  ('Ramesh Reddy',   5, 'అద్భుతమైన వంటకాలు! పెళ్ళి కార్యక్రమానికి చాలా బాగుంది. Everyone loved the food!'),
  ('Sunitha Devi',   5, 'Traditional Brahmin meals were absolutely authentic. Banana leaf serving was special!'),
  ('Kishore Kumar',  4, 'Very professional team. Food quality was excellent for our housewarming ceremony.');