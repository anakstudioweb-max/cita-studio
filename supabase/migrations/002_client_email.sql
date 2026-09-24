-- Optional client email on bookings (empty string when not provided)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS client_email text NOT NULL DEFAULT '';
