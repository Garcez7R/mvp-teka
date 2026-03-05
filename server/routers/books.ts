import { z } from "zod";
import { router, publicProcedure, protectedProcedure, livreiroProcedure } from "./_utils/trpc.js";
import { db } from "./_utils/db.js";
import { books, sebos, favorites } from "../_schema.ts";
import { eq, ilike, and, lte, gte, inArray, sql } from "drizzle-orm";

const STATUS_MARKER = /^\[STATUS:(ATIVO|RESERVADO|VENDIDO)\]\s*/i;
type AvailabilityStatus = "ativo" | "reservado" | "vendido";
const interestKey = "__TEKA_BOOK_INTEREST_MAP__";

function getInterestMap(): Map<number, Set<number>> {
  const globalAny = globalThis as any;
  if (!globalAny[interestKey]) {
    globalAny[interestKey] = new Map<number, Set<number>>();
  }
  return globalAny[interestKey];
}

function normalizeBookDescription(raw?: string | null): {
  availabilityStatus: AvailabilityStatus;
  description: string | null;
} {
  const value = (raw ?? "").trim();
  if (!value) {
    return { availabilityStatus: "ativo", description: null };
  }

  const match = value.match(STATUS_MARKER);
  const description = value.replace(STATUS_MARKER, "").trim() || null;
  if (!match?.[1]) {
    return { availabilityStatus: "ativo", description };
  }
  const status = match[1].toLowerCase() as AvailabilityStatus;
  return { availabilityStatus: status, description };
}

function withStatusMarker(
  availabilityStatus: AvailabilityStatus,
  description?: string | null
): string | null {
  const clean = normalizeBookDescription(description).description;
  if (availabilityStatus === "ativo") {
    return clean;
  }
  const marker = availabilityStatus === "reservado" ? "RESERVADO" : "VENDIDO";
  return clean ? `[STATUS:${marker}] ${clean}` : `[STATUS:${marker}]`;
}

export const booksRouter = router({
  // List all books with filters
  list: publicProcedure
    .input(
      z.object({
        search: z.string().optional(),
        category: z.string().optional(),
        seboId: z.number().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        condition: z
          .enum(["Excelente", "Bom estado", "Usado", "Desgastado"])
          .optional(),
        availabilityStatus: z.enum(["ativo", "reservado", "vendido"]).optional(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const filters: any[] = [];

      if (input.search) {
        filters.push(
          ilike(books.title, `%${input.search}%`)
        );
      }

      if (input.category) {
        filters.push(eq(books.category, input.category));
      }

      if (input.seboId) {
        filters.push(eq(books.seboId, input.seboId));
      }
      if (input.city) {
        filters.push(ilike(sebos.city, `%${input.city}%`));
      }
      if (input.state) {
        filters.push(eq(sebos.state, input.state.toUpperCase()));
      }

      if (input.condition) {
        filters.push(eq(books.condition, input.condition));
      }

      if (input.minPrice !== undefined) {
        filters.push(gte(books.price, input.minPrice.toString()));
      }

      if (input.maxPrice !== undefined) {
        filters.push(lte(books.price, input.maxPrice.toString()));
      }

      const where = filters.length > 0 ? and(...filters) : undefined;

      const dataRaw = await db
        .select()
        .from(books)
        .leftJoin(sebos, eq(books.seboId, sebos.id))
        .where(where)
        .limit(input.limit)
        .offset(input.offset);

      // Format response to include sebo info
      const data = dataRaw
        .map((row: { books: typeof books.$inferSelect; sebos: typeof sebos.$inferSelect | null }) => {
          const normalized = normalizeBookDescription(row.books.description);
          return {
            ...row.books,
            description: normalized.description,
            availabilityStatus: normalized.availabilityStatus,
            sebo: row.sebos
              ? { id: row.sebos.id, name: row.sebos.name, city: row.sebos.city, state: row.sebos.state }
              : null,
          };
        })
        .filter((book) =>
          input.availabilityStatus ? book.availabilityStatus === input.availabilityStatus : true
        );
      return data;
    }),

  // Get single book
  getById: publicProcedure
    .input(z.number())
    .query(async ({ input }) => {
      const book = await db
        .select()
        .from(books)
        .where(eq(books.id, input))
        .then((res: Array<typeof books.$inferSelect>) => res[0]);

      if (!book) {
        throw new Error("Book not found");
      }

      // Get sebo info
      const sebo = await db
        .select()
        .from(sebos)
        .where(eq(sebos.id, book.seboId))
        .then((res: Array<typeof sebos.$inferSelect>) => res[0]);

      const normalized = normalizeBookDescription(book.description);
      const seboBooksCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(books)
        .where(eq(books.seboId, book.seboId))
        .then((res: Array<{ count: number }>) => Number(res[0]?.count ?? 0));

      return {
        ...book,
        description: normalized.description,
        availabilityStatus: normalized.availabilityStatus,
        sebo,
        seboStats: {
          totalBooks: seboBooksCount,
          score: sebo?.verified ? 4.8 : 4.3,
          responseTime: "Responde em ate 1h",
        },
      };
    }),

  // List books by sebo (for seller/owner)
  listBySebo: protectedProcedure
    .input(z.number())
    .query(async ({ input, ctx }) => {
      // Verify user owns this sebo
      const sebo = await db
        .select()
        .from(sebos)
        .where(eq(sebos.id, input))
        .then((res: Array<typeof sebos.$inferSelect>) => res[0]);

      const canRead = Boolean(sebo && (sebo.userId === ctx.userId || ctx.role === "admin"));
      if (!canRead) {
        throw new Error("Unauthorized");
      }

      const data = await db
        .select()
        .from(books)
        .where(eq(books.seboId, input));

      return data.map((book) => {
        const normalized = normalizeBookDescription(book.description);
        return {
          ...book,
          description: normalized.description,
          availabilityStatus: normalized.availabilityStatus,
        };
      });
    }),

  // Create new book (livreiro/admin)
  create: livreiroProcedure
    .input(
      z.object({
        title: z.string(),
        author: z.string(),
        isbn: z.string().optional(),
        category: z.string(),
        description: z.string().optional(),
        price: z.number(),
        condition: z.enum(["Excelente", "Bom estado", "Usado", "Desgastado"]),
        pages: z.number().optional(),
        year: z.number().optional(),
        coverUrl: z.string().optional(),
        seboId: z.number(),
        availabilityStatus: z.enum(["ativo", "reservado", "vendido"]).default("ativo"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify sebo exists
      const sebo = await db
        .select()
        .from(sebos)
        .where(eq(sebos.id, input.seboId))
        .then((res: Array<typeof sebos.$inferSelect>) => res[0]);

      if (!sebo) {
        throw new Error("Sebo not found");
      }
      if (sebo.userId !== ctx.userId && ctx.role !== "admin") {
        throw new Error("Unauthorized");
      }

      const newBook = await db
        .insert(books)
        .values({
          ...input,
          description: withStatusMarker(input.availabilityStatus, input.description),
          price: input.price.toString(),
        })
        .$returningId();

      return newBook;
    }),

  // Update book
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        author: z.string().optional(),
        isbn: z.string().optional(),
        category: z.string().optional(),
        description: z.string().optional(),
        price: z.number().optional(),
        condition: z
          .enum(["Excelente", "Bom estado", "Usado", "Desgastado"])
          .optional(),
        availabilityStatus: z.enum(["ativo", "reservado", "vendido"]).optional(),
        coverUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const book = await db
        .select()
        .from(books)
        .where(eq(books.id, input.id))
        .then((res: Array<typeof books.$inferSelect>) => res[0]);

      if (!book) {
        throw new Error("Book not found");
      }

      const sebo = await db
        .select()
        .from(sebos)
        .where(eq(sebos.id, book.seboId))
        .then((res: Array<typeof sebos.$inferSelect>) => res[0]);

      const canEdit = Boolean(sebo && (sebo.userId === ctx.userId || ctx.role === "admin"));
      if (!canEdit) {
        throw new Error("Unauthorized");
      }

      const { id, availabilityStatus, ...updateData } = input;
      const targetStatus =
        availabilityStatus ?? normalizeBookDescription(book.description).availabilityStatus;
      const updateDataWithStringPrice: any = {
        ...updateData,
        description: withStatusMarker(targetStatus, updateData.description ?? book.description),
        ...(updateData.price !== undefined && { price: updateData.price.toString() }),
      };
      // cast to any because drizzle expects price string and our union could still
      // include number otherwise
      await db.update(books).set(updateDataWithStringPrice as any).where(eq(books.id, id));

      return { success: true };
    }),

  sellerMetrics: livreiroProcedure
    .input(z.object({ seboId: z.number().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const targetSeboId = input?.seboId;
      const mySebo = await db
        .select()
        .from(sebos)
        .where(eq(sebos.userId, ctx.userId!))
        .then((res: Array<typeof sebos.$inferSelect>) => res[0] ?? null);

      const seboId = ctx.role === "admin" ? targetSeboId ?? mySebo?.id : mySebo?.id;
      if (!seboId) {
        return {
          totalBooks: 0,
          activeBooks: 0,
          reservedBooks: 0,
          soldBooks: 0,
          totalFavorites: 0,
          topBooks: [],
        };
      }

      const myBooks = await db.select().from(books).where(eq(books.seboId, seboId));
      const bookIds = myBooks.map((book) => book.id);

      const statusCount = myBooks.reduce(
        (acc, book) => {
          const status = normalizeBookDescription(book.description).availabilityStatus;
          if (status === "reservado") acc.reservedBooks += 1;
          else if (status === "vendido") acc.soldBooks += 1;
          else acc.activeBooks += 1;
          return acc;
        },
        { activeBooks: 0, reservedBooks: 0, soldBooks: 0 }
      );

      if (bookIds.length === 0) {
        return {
          totalBooks: 0,
          ...statusCount,
          totalFavorites: 0,
          topBooks: [],
        };
      }

      const favoritesByBook = await db
        .select({
          bookId: favorites.bookId,
          count: sql<number>`count(*)`,
        })
        .from(favorites)
        .where(inArray(favorites.bookId, bookIds))
        .groupBy(favorites.bookId);

      const favoritesMap = new Map<number, number>(
        favoritesByBook.map((row) => [row.bookId, Number(row.count ?? 0)])
      );
      const topBooks = myBooks
        .map((book) => ({
          id: book.id,
          title: book.title,
          favorites: favoritesMap.get(book.id) ?? 0,
        }))
        .sort((a, b) => b.favorites - a.favorites)
        .slice(0, 5);

      const totalFavorites = Array.from(favoritesMap.values()).reduce((sum, value) => sum + value, 0);
      const interestMap = getInterestMap();
      const totalInterests = bookIds.reduce(
        (sum, id) => sum + (interestMap.get(id)?.size ?? 0),
        0
      );

      return {
        totalBooks: myBooks.length,
        ...statusCount,
        totalFavorites,
        totalInterests,
        topBooks,
      };
    }),

  registerInterest: protectedProcedure
    .input(z.object({ bookId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const map = getInterestMap();
      const current = map.get(input.bookId) ?? new Set<number>();
      current.add(ctx.userId!);
      map.set(input.bookId, current);
      return { success: true, totalInterests: current.size };
    }),

  // Delete book
  delete: protectedProcedure
    .input(z.number())
    .mutation(async ({ input, ctx }) => {
      const book = await db
        .select()
        .from(books)
        .where(eq(books.id, input))
        .then((res: Array<typeof books.$inferSelect>) => res[0]);

      if (!book) {
        throw new Error("Book not found");
      }

      const sebo = await db
        .select()
        .from(sebos)
        .where(eq(sebos.id, book.seboId))
        .then((res: Array<typeof sebos.$inferSelect>) => res[0]);

      const canDelete = Boolean(sebo && (sebo.userId === ctx.userId || ctx.role === "admin"));
      if (!canDelete) {
        throw new Error("Unauthorized");
      }

      await db.delete(books).where(eq(books.id, input));

      return { success: true };
    }),

  // Get categories
  getCategories: publicProcedure.query(async () => {
      const result = await db
        .selectDistinct({ category: books.category })
        .from(books);

      return result.map((r: { category: string | null }) => r.category).filter((c: string | null) => c);
  }),
});
