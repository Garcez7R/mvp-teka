ALTER TABLE sebos ADD COLUMN cityNormalized TEXT;
ALTER TABLE sebos ADD COLUMN stateNormalized TEXT;

UPDATE sebos
SET
  cityNormalized = lower(trim(city)),
  stateNormalized = upper(trim(state))
WHERE city IS NOT NULL OR state IS NOT NULL;
