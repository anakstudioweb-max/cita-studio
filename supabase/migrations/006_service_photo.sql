-- Per-service photo for booking cards and pro/admin editors.
ALTER TABLE professional_services
  ADD COLUMN IF NOT EXISTS photo_url text;

ALTER TABLE catalog_services
  ADD COLUMN IF NOT EXISTS photo_url text;
