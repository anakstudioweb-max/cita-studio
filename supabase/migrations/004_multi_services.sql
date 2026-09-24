-- Multi-service bookings: store all selected professional_service ids + joined display names.
-- Keep professional_service_id as the primary/first service for backward compatibility.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS service_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS service_names text NOT NULL DEFAULT '';

-- Backfill existing single-service rows
UPDATE bookings b
SET
  service_ids = ARRAY[b.professional_service_id],
  service_names = COALESCE(ps.name, '')
FROM professional_services ps
WHERE ps.id = b.professional_service_id
  AND (
    cardinality(b.service_ids) = 0
    OR b.service_names = ''
  );
