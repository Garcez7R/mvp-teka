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

CREATE UNIQUE INDEX IF NOT EXISTS idx_sebo_reviews_unique_user_sebo
  ON sebo_reviews(seboId, userId);

CREATE INDEX IF NOT EXISTS idx_sebo_reviews_sebo
  ON sebo_reviews(seboId);

CREATE INDEX IF NOT EXISTS idx_sebo_reviews_visible
  ON sebo_reviews(seboId, isVisible);
