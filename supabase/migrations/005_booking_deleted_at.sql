-- Soft-delete bookings (trash). Keep cancelled status separate.
-- Partial unique index so trashed rows don't block the same start slot.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS bookings_deleted_at_idx ON bookings(deleted_at);

DROP INDEX IF EXISTS bookings_pro_start_unique;
CREATE UNIQUE INDEX IF NOT EXISTS bookings_pro_start_unique
  ON bookings(professional_id, start_at)
  WHERE deleted_at IS NULL;
