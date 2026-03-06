-- TEKA D1 bootstrap schema
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  openId TEXT NOT NULL UNIQUE,
  name TEXT,
  email TEXT,
  whatsapp TEXT,
  loginMethod TEXT,
  role TEXT NOT NULL DEFAULT 'comprador',
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  lastSignedIn INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sebos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  ownerName TEXT,
  documentId TEXT,
  addressLine TEXT,
  postalCode TEXT,
  openingYear INTEGER,
  logoUrl TEXT,
  supportsPickup INTEGER DEFAULT 1,
  shipsNeighborhood INTEGER DEFAULT 0,
  shipsCity INTEGER DEFAULT 0,
  shipsState INTEGER DEFAULT 0,
  shipsNationwide INTEGER DEFAULT 0,
  shippingAreas TEXT,
  shippingFeeNotes TEXT,
  shippingEta TEXT,
  shippingNotes TEXT,
  whatsapp TEXT NOT NULL,
  city TEXT,
  state TEXT,
  verified INTEGER DEFAULT 0,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seboId INTEGER NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  isbn TEXT,
  category TEXT,
  description TEXT,
  price REAL NOT NULL,
  condition TEXT DEFAULT 'Bom estado',
  pages INTEGER,
  year INTEGER,
  coverUrl TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  bookId INTEGER NOT NULL,
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS book_interests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  bookId INTEGER NOT NULL,
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS wishlist_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  title TEXT,
  isbn TEXT,
  createdAt INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_favorites_user_book ON favorites(userId, bookId);
CREATE UNIQUE INDEX IF NOT EXISTS idx_book_interests_user_book ON book_interests(userId, bookId);
CREATE INDEX IF NOT EXISTS idx_book_interests_book ON book_interests(bookId);
CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist_items(userId);
CREATE INDEX IF NOT EXISTS idx_wishlist_isbn ON wishlist_items(isbn);
CREATE INDEX IF NOT EXISTS idx_books_sebo ON books(seboId);
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);
CREATE INDEX IF NOT EXISTS idx_sebos_user ON sebos(userId);
