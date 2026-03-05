import { int, sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = sqliteTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").primaryKey({ autoIncrement: true }),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  whatsapp: text("whatsapp"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["user", "admin", "livreiro", "comprador"] })
    .default("comprador")
    .notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull(),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Tabela de sebos (livrarias/vendedores)
export const sebos = sqliteTable("sebos", {
  id: int("id").primaryKey({ autoIncrement: true }),
  userId: int("userId").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  whatsapp: text("whatsapp").notNull(),
  city: text("city"),
  state: text("state"),
  verified: integer("verified", { mode: "boolean" }).default(false),
  createdAt: integer("createdAt", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export type Sebo = typeof sebos.$inferSelect;
export type InsertSebo = typeof sebos.$inferInsert;

// Tabela de livros
export const books = sqliteTable("books", {
  id: int("id").primaryKey({ autoIncrement: true }),
  seboId: int("seboId").notNull(),
  title: text("title").notNull(),
  author: text("author"),
  isbn: text("isbn"),
  category: text("category"),
  description: text("description"),
  price: real("price").notNull(),
  condition: text("condition", {
    enum: ["Excelente", "Bom estado", "Usado", "Desgastado"],
  }).default("Bom estado"),
  pages: int("pages"),
  year: int("year"),
  coverUrl: text("coverUrl"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export type Book = typeof books.$inferSelect;
export type InsertBook = typeof books.$inferInsert;

// Tabela de favoritos
export const favorites = sqliteTable("favorites", {
  id: int("id").primaryKey({ autoIncrement: true }),
  userId: int("userId").notNull(),
  bookId: int("bookId").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = typeof favorites.$inferInsert;

// Tabela de interesses em livros
export const bookInterests = sqliteTable("book_interests", {
  id: int("id").primaryKey({ autoIncrement: true }),
  userId: int("userId").notNull(),
  bookId: int("bookId").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export type BookInterest = typeof bookInterests.$inferSelect;
export type InsertBookInterest = typeof bookInterests.$inferInsert;

// Tabela de lista de procura (wishlist)
export const wishlistItems = sqliteTable("wishlist_items", {
  id: int("id").primaryKey({ autoIncrement: true }),
  userId: int("userId").notNull(),
  title: text("title"),
  isbn: text("isbn"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export type WishlistItem = typeof wishlistItems.$inferSelect;
export type InsertWishlistItem = typeof wishlistItems.$inferInsert;

// Relacoes
export const usersRelations = relations(users, ({ many }) => ({
  sebos: many(sebos),
  favorites: many(favorites),
  bookInterests: many(bookInterests),
  wishlistItems: many(wishlistItems),
}));

export const sebosRelations = relations(sebos, ({ one, many }) => ({
  user: one(users, {
    fields: [sebos.userId],
    references: [users.id],
  }),
  books: many(books),
}));

export const booksRelations = relations(books, ({ one, many }) => ({
  sebo: one(sebos, {
    fields: [books.seboId],
    references: [sebos.id],
  }),
  favorites: many(favorites),
  interests: many(bookInterests),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
  book: one(books, {
    fields: [favorites.bookId],
    references: [books.id],
  }),
}));

export const bookInterestsRelations = relations(bookInterests, ({ one }) => ({
  user: one(users, {
    fields: [bookInterests.userId],
    references: [users.id],
  }),
  book: one(books, {
    fields: [bookInterests.bookId],
    references: [books.id],
  }),
}));

export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
  user: one(users, {
    fields: [wishlistItems.userId],
    references: [users.id],
  }),
}));
