-- Anak.Studio marketplace schema (Supabase-compatible Postgres)
-- Apply via Supabase SQL editor or: psql $DATABASE_URL -f supabase/migrations/001_init.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('owner', 'professional');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pro_status AS ENUM ('pending', 'active', 'paused', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE service_category AS ENUM ('lashes', 'brows', 'both');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM ('requested', 'confirmed', 'done', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role user_role NOT NULL DEFAULT 'professional',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS professionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  bio text NOT NULL DEFAULT '',
  photo_url text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT 'Houston',
  address text NOT NULL DEFAULT '',
  whatsapp text NOT NULL DEFAULT '',
  instagram text NOT NULL DEFAULT '',
  hours_json jsonb NOT NULL DEFAULT '{"start":"10:00","end":"19:00"}'::jsonb,
  closed_days_json jsonb NOT NULL DEFAULT '[0,1]'::jsonb,
  status pro_status NOT NULL DEFAULT 'pending',
  paid_until date,
  categories service_category NOT NULL DEFAULT 'both',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS professionals_status_paid_idx ON professionals(status, paid_until);

CREATE TABLE IF NOT EXISTS catalog_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category service_category NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  duration_min integer NOT NULL,
  base_price_cents integer NOT NULL
);

CREATE TABLE IF NOT EXISTS professional_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  catalog_service_id uuid REFERENCES catalog_services(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  duration_min integer NOT NULL,
  price_cents integer NOT NULL,
  visible boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS pro_services_pro_idx ON professional_services(professional_id);

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_code text NOT NULL UNIQUE,
  professional_id uuid NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  professional_service_id uuid NOT NULL REFERENCES professional_services(id) ON DELETE RESTRICT,
  client_name text NOT NULL,
  client_phone text NOT NULL,
  notes text NOT NULL DEFAULT '',
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  price_cents integer NOT NULL,
  status booking_status NOT NULL DEFAULT 'requested',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Prevent double-booking the same start slot for a professional
CREATE UNIQUE INDEX IF NOT EXISTS bookings_pro_start_unique
  ON bookings(professional_id, start_at);

CREATE INDEX IF NOT EXISTS bookings_pro_start_idx ON bookings(professional_id, start_at);

-- RLS sketches (enable when using Supabase Auth; app currently uses cookie JWT + service role / direct Postgres)
-- ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "public read active paid pros" ON professionals FOR SELECT USING (
--   status = 'active' AND paid_until >= CURRENT_DATE
-- );
-- CREATE POLICY "pro updates own row" ON professionals FOR UPDATE USING (auth.uid() = user_id);
-- CREATE POLICY "owner all" ON professionals FOR ALL USING (
--   EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'owner')
-- );
