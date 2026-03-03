import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "livreiro", "comprador"]).default("comprador").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Tabela de sebos (livrarias/vendedores)
export const sebos = mysqlTable("sebos", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  whatsapp: varchar("whatsapp", { length: 20 }).notNull(),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  verified: boolean("verified").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Sebo = typeof sebos.$inferSelect;
export type InsertSebo = typeof sebos.$inferInsert;

// Tabela de livros
export const books = mysqlTable("books", {
  id: int("id").autoincrement().primaryKey(),
  seboId: int("seboId").notNull(),
  title: text("title").notNull(),
  author: text("author"),
  isbn: varchar("isbn", { length: 20 }),
  category: varchar("category", { length: 100 }),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  condition: mysqlEnum("condition", ["Excelente", "Bom estado", "Usado", "Desgastado"]).default("Bom estado"),
  pages: int("pages"),
  year: int("year"),
  coverUrl: text("coverUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Book = typeof books.$inferSelect;
export type InsertBook = typeof books.$inferInsert;

// Tabela de favoritos
export const favorites = mysqlTable("favorites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  bookId: int("bookId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = typeof favorites.$inferInsert;

// Relacoes
export const usersRelations = relations(users, ({ many }) => ({
  sebos: many(sebos),
  favorites: many(favorites),
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
