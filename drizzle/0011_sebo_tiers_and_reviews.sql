ALTER TABLE sebos ADD COLUMN maxActiveBooks INTEGER;
ALTER TABLE sebos ADD COLUMN showPublicPhone INTEGER DEFAULT 0;
ALTER TABLE sebos ADD COLUMN showPublicAddress INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS sebo_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seboId INTEGER NOT NULL,
  userId INTEGER NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  isVisible INTEGER NOT NULL DEFAULT 1,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sebo_reviews_unique_user_per_sebo ON sebo_reviews(seboId, userId);
CREATE INDEX IF NOT EXISTS idx_sebo_reviews_sebo ON sebo_reviews(seboId);
