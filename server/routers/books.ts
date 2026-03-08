import { z } from "zod";
import { router, publicProcedure, protectedProcedure, livreiroProcedure } from "./_utils/trpc.js";
import { db } from "./_utils/db.js";
import { books, sebos, favorites, bookInterests } from "../_schema.ts";
import { eq, like, and, lte, gte, inArray, sql, asc, desc } from "drizzle-orm";
import { normalizeBookTitle } from "./_utils/text.js";
import { logAuditEvent } from "./_utils/audit.js";

const STATUS_MARKER = /^\[STATUS:(ATIVO|RESERVADO|VENDIDO)\]\s*/i;
const HIDDEN_MARKER = /^\[HIDDEN\]\s*/i;
type AvailabilityStatus = "ativo" | "reservado" | "vendido";
const seboBaseSelect = {
  id: sebos.id,
  userId: sebos.userId,
  name: sebos.name,
  description: sebos.description,
  whatsapp: sebos.whatsapp,
  city: sebos.city,
  state: sebos.state,
  verified: sebos.verified,
  supportsPickup: sebos.supportsPickup,
  shipsNeighborhood: sebos.shipsNeighborhood,
  shipsCity: sebos.shipsCity,
  shipsState: sebos.shipsState,
  shipsNationwide: sebos.shipsNationwide,
  shippingAreas: sebos.shippingAreas,
  shippingFeeNotes: sebos.shippingFeeNotes,
  shippingEta: sebos.shippingEta,
  shippingNotes: sebos.shippingNotes,
  createdAt: sebos.createdAt,
  updatedAt: sebos.updatedAt,
} as const;

function sanitizeBookDescription(raw?: string | null): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw
    .replace(/source\s*title\s*:[^\n\r]*/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return cleaned || null;
}

function normalizeBookDescription(raw?: string | null): {
  availabilityStatus: AvailabilityStatus;
  isVisible: boolean;
  description: string | null;
} {
  let value = (raw ?? "").trim();
  if (!value) {
    return { availabilityStatus: "ativo", isVisible: true, description: null };
  }

  let availabilityStatus: AvailabilityStatus = "ativo";
  let isVisible = true;

  // Accept either marker order at the beginning: [HIDDEN] and [STATUS:*]
  let changed = true;
  while (changed) {
    changed = false;
    const hiddenMatch = value.match(HIDDEN_MARKER);
    if (hiddenMatch) {
      isVisible = false;
      value = value.replace(HIDDEN_MARKER, "").trim();
      changed = true;
    }
    const statusMatch = value.match(STATUS_MARKER);
    if (statusMatch?.[1]) {
      availabilityStatus = statusMatch[1].toLowerCase() as AvailabilityStatus;
      value = value.replace(STATUS_MARKER, "").trim();
      changed = true;
    }
  }

  const description = sanitizeBookDescription(value);
  return { availabilityStatus, isVisible, description };
}

function withBookMetadata(
  availabilityStatus: AvailabilityStatus,
  isVisible: boolean,
  description?: string | null
): string | null {
  const clean = sanitizeBookDescription(normalizeBookDescription(description).description);
  const markers: string[] = [];
  if (!isVisible) {
    markers.push("[HIDDEN]");
  }
  if (availabilityStatus !== "ativo") {
    const marker = availabilityStatus === "reservado" ? "RESERVADO" : "VENDIDO";
    markers.push(`[STATUS:${marker}]`);
  }
  if (markers.length === 0) {
    return clean;
  }
  return clean ? `${markers.join(" ")} ${clean}` : markers.join(" ");
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
          .enum(["Novo", "Excelente", "Bom estado", "Usado", "Desgastado"])
          .optional(),
        availabilityStatus: z.enum(["ativo", "reservado", "vendido"]).optional(),
        sortBy: z
          .enum([
            "recent",
            "most_searched",
            "most_favorited",
            "title_asc",
            "author_asc",
            "price_asc",
            "price_desc",
          ])
          .default("recent"),
        includeHidden: z.boolean().optional(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const filters: any[] = [];

      if (input.search) {
        const pattern = `%${input.search.toLowerCase()}%`;
        filters.push(
          like(sql`lower(${books.title})`, pattern)
        );
      }

      if (input.category) {
        filters.push(eq(books.category, input.category));
      }

      if (input.seboId) {
        filters.push(eq(books.seboId, input.seboId));
      }
      if (input.city) {
        filters.push(like(sql`lower(${sebos.city})`, `%${input.city.toLowerCase()}%`));
      }
      if (input.state) {
        filters.push(eq(sebos.state, input.state.toUpperCase()));
      }

      if (input.condition) {
        filters.push(eq(books.condition, input.condition));
      }

      if (input.minPrice !== undefined) {
        filters.push(gte(books.price, input.minPrice));
      }

      if (input.maxPrice !== undefined) {
        filters.push(lte(books.price, input.maxPrice));
      }

      const where = filters.length > 0 ? and(...filters) : undefined;

      const favoriteCounts = db
        .select({
          bookId: favorites.bookId,
          count: sql<number>`count(*)`.as("count"),
        })
        .from(favorites)
        .groupBy(favorites.bookId)
        .as("favorite_counts");

      const listQuery = db
        .select({
          book: books,
          sebo: seboBaseSelect,
        })
        .from(books)
        .leftJoin(sebos, eq(books.seboId, sebos.id))
        .leftJoin(favoriteCounts, eq(books.id, favoriteCounts.bookId))
        .where(where);

      let orderByClauses: any[] = [desc(books.createdAt)];
      switch (input.sortBy) {
        case "title_asc":
          orderByClauses = [asc(books.title), desc(books.createdAt)];
          break;
        case "author_asc":
          orderByClauses = [asc(books.author), desc(books.createdAt)];
          break;
        case "price_asc":
          orderByClauses = [asc(books.price), desc(books.createdAt)];
          break;
        case "price_desc":
          orderByClauses = [desc(books.price), desc(books.createdAt)];
          break;
        case "most_favorited":
          orderByClauses = [
            desc(sql`coalesce(${favoriteCounts.count}, 0)`),
            desc(books.createdAt),
          ];
          break;
        case "most_searched":
          // TODO: swap to real metric once search analytics table is available.
          orderByClauses = [desc(books.createdAt)];
          break;
        case "recent":
        default:
          orderByClauses = [desc(books.createdAt)];
          break;
      }

      const dataRaw = await listQuery
        .orderBy(...orderByClauses)
        .limit(input.limit)
        .offset(input.offset);

      // Format response to include sebo info
      const data = dataRaw
        .map((row) => {
          const normalized = normalizeBookDescription(row.book.description);
          return {
            ...row.book,
            title: normalizeBookTitle(row.book.title) ?? row.book.title,
            description: normalized.description,
            availabilityStatus: normalized.availabilityStatus,
            isVisible: normalized.isVisible,
            sebo: row.sebo
              ? {
                  id: row.sebo.id,
                  name: row.sebo.name,
                  city: row.sebo.city,
                  state: row.sebo.state,
                  verified: Boolean(row.sebo.verified),
                  supportsPickup: Boolean(row.sebo.supportsPickup),
                  shipsNeighborhood: Boolean(row.sebo.shipsNeighborhood),
                  shipsCity: Boolean(row.sebo.shipsCity),
                  shipsState: Boolean(row.sebo.shipsState),
                  shipsNationwide: Boolean(row.sebo.shipsNationwide),
                  shippingAreas: row.sebo.shippingAreas,
                  shippingFeeNotes: row.sebo.shippingFeeNotes,
                  shippingEta: row.sebo.shippingEta,
                  shippingNotes: row.sebo.shippingNotes,
                }
              : null,
            _ownerUserId: row.sebo?.userId ?? null,
          };
        })
        .filter((book: any) => {
          const wantsHidden = input.includeHidden === true;
          const hasPrivilegedHiddenAccess =
            ctx.role === "admin" ||
            (ctx.userId !== null &&
              Number(book._ownerUserId || 0) === Number(ctx.userId));
          return book.isVisible || (wantsHidden && hasPrivilegedHiddenAccess);
        })
        .filter((book: any) =>
          input.availabilityStatus ? book.availabilityStatus === input.availabilityStatus : true
        )
        .map(({ _ownerUserId, ...safeBook }) => safeBook);
      return data;
    }),

  // Get single book
  getById: publicProcedure
    .input(z.number())
    .query(async ({ input, ctx }) => {
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
        .select(seboBaseSelect)
        .from(sebos)
        .where(eq(sebos.id, book.seboId))
        .then((res) => res[0]);

      const normalized = normalizeBookDescription(book.description);
      const seboBooksCount = await db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(books)
        .where(eq(books.seboId, book.seboId))
        .then((res: Array<{ count: number }>) => Number(res[0]?.count ?? 0));
      const canSeeHidden =
        normalized.isVisible ||
        ctx.role === "admin" ||
        (ctx.userId !== null && sebo?.userId === ctx.userId);
      if (!canSeeHidden) {
        throw new Error("Book not found");
      }

      return {
        ...book,
        title: normalizeBookTitle(book.title) ?? book.title,
        description: normalized.description,
        availabilityStatus: normalized.availabilityStatus,
        isVisible: normalized.isVisible,
        sebo,
        seboStats: {
          totalBooks: seboBooksCount,
        },
      };
    }),

  // List books by sebo (for seller/owner)
  listBySebo: protectedProcedure
    .input(z.number())
    .query(async ({ input, ctx }) => {
      // Verify user owns this sebo
      const sebo = await db
        .select(seboBaseSelect)
        .from(sebos)
        .where(eq(sebos.id, input))
        .then((res) => res[0]);

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
          title: normalizeBookTitle(book.title) ?? book.title,
          description: normalized.description,
          availabilityStatus: normalized.availabilityStatus,
          isVisible: normalized.isVisible,
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
        condition: z.enum(["Novo", "Excelente", "Bom estado", "Usado", "Desgastado"]),
        pages: z.number().optional(),
        year: z.number().optional(),
        coverUrl: z.string().optional(),
        seboId: z.number(),
        quantity: z.number().int().min(0).default(1),
        availabilityStatus: z.enum(["ativo", "reservado", "vendido"]).default("ativo"),
        isVisible: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify sebo exists
      const sebo = await db
        .select(seboBaseSelect)
        .from(sebos)
        .where(eq(sebos.id, input.seboId))
        .then((res) => res[0]);

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
          title: normalizeBookTitle(input.title) ?? input.title,
          description: withBookMetadata(
            input.availabilityStatus,
            input.isVisible,
            input.description
          ),
          price: input.price,
          quantity: input.quantity,
        })
        .returning({ id: books.id });

      await logAuditEvent({
        actorUserId: ctx.userId,
        actorRole: ctx.role,
        action: "book.create",
        entityType: "book",
        entityId: newBook[0]?.id ?? null,
        metadata: {
          seboId: input.seboId,
          quantity: input.quantity,
          availabilityStatus: input.availabilityStatus,
        },
      });

      return newBook;
    }),

  clone: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        condition: z
          .enum(["Novo", "Excelente", "Bom estado", "Usado", "Desgastado"])
          .optional(),
        quantity: z.number().int().min(0).optional(),
        availabilityStatus: z.enum(["ativo", "reservado", "vendido"]).optional(),
        isVisible: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const original = await db
        .select()
        .from(books)
        .where(eq(books.id, input.id))
        .then((res: Array<typeof books.$inferSelect>) => res[0]);

      if (!original) {
        throw new Error("Book not found");
      }

      const sebo = await db
        .select(seboBaseSelect)
        .from(sebos)
        .where(eq(sebos.id, original.seboId))
        .then((res) => res[0]);

      const canClone = Boolean(sebo && (sebo.userId === ctx.userId || ctx.role === "admin"));
      if (!canClone) {
        throw new Error("Unauthorized");
      }

      const normalizedOriginal = normalizeBookDescription(original.description);
      const quantity = input.quantity ?? original.quantity ?? 1;
      const availabilityStatus = quantity === 0
        ? "vendido"
        : input.availabilityStatus ?? normalizedOriginal.availabilityStatus;
      const isVisible = input.isVisible ?? normalizedOriginal.isVisible;

      const created = await db
        .insert(books)
        .values({
          seboId: original.seboId,
          title: normalizeBookTitle(original.title) ?? original.title,
          author: original.author,
          isbn: original.isbn,
          category: original.category,
          description: withBookMetadata(
            availabilityStatus,
            isVisible,
            normalizedOriginal.description
          ),
          price: original.price,
          condition: input.condition ?? original.condition,
          pages: original.pages,
          year: original.year,
          coverUrl: original.coverUrl,
          quantity,
        })
        .returning({ id: books.id });

      await logAuditEvent({
        actorUserId: ctx.userId,
        actorRole: ctx.role,
        action: "book.clone",
        entityType: "book",
        entityId: created[0]?.id ?? null,
        metadata: {
          sourceBookId: input.id,
          condition: input.condition ?? original.condition,
          quantity,
          availabilityStatus,
          isVisible,
        },
      });

      return created[0];
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
          .enum(["Novo", "Excelente", "Bom estado", "Usado", "Desgastado"])
          .optional(),
        pages: z.number().int().optional(),
        year: z.number().int().optional(),
        availabilityStatus: z.enum(["ativo", "reservado", "vendido"]).optional(),
        isVisible: z.boolean().optional(),
        coverUrl: z.string().optional(),
        quantity: z.number().int().min(0).optional(),
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
        .select(seboBaseSelect)
        .from(sebos)
        .where(eq(sebos.id, book.seboId))
        .then((res) => res[0]);

      const canEdit = Boolean(sebo && (sebo.userId === ctx.userId || ctx.role === "admin"));
      if (!canEdit) {
        throw new Error("Unauthorized");
      }

      const { id, availabilityStatus, isVisible, quantity, ...updateData } = input;
      const nextQuantity = quantity ?? book.quantity ?? 1;
      const currentNormalized = normalizeBookDescription(book.description);
      const targetStatus = quantity === 0
        ? "vendido"
        : availabilityStatus ?? currentNormalized.availabilityStatus;
      const targetVisibility = isVisible ?? currentNormalized.isVisible;
      const updateDataWithStringPrice: any = {
        ...updateData,
        ...(updateData.title !== undefined && {
          title: normalizeBookTitle(updateData.title) ?? updateData.title,
        }),
        ...(quantity !== undefined && { quantity: nextQuantity }),
        description: withBookMetadata(
          targetStatus,
          targetVisibility,
          updateData.description ?? book.description
        ),
        ...(updateData.price !== undefined && { price: updateData.price }),
      };
      // cast to any because drizzle expects price string and our union could still
      // include number otherwise
      await db.update(books).set(updateDataWithStringPrice as any).where(eq(books.id, id));

      await logAuditEvent({
        actorUserId: ctx.userId,
        actorRole: ctx.role,
        action: "book.update",
        entityType: "book",
        entityId: id,
        metadata: {
          changedFields: Object.keys(input).filter((field) => field !== "id"),
          quantity,
          availabilityStatus: targetStatus,
          isVisible: targetVisibility,
        },
      });

      return { success: true };
    }),

  sellerMetrics: livreiroProcedure
    .input(z.object({ seboId: z.number().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const targetSeboId = input?.seboId;
      const mySebo = await db
        .select(seboBaseSelect)
        .from(sebos)
        .where(eq(sebos.userId, ctx.userId!))
        .then((res) => res[0] ?? null);

      const seboId = ctx.role === "admin" ? targetSeboId ?? mySebo?.id : mySebo?.id;
      if (!seboId) {
        return {
          totalBooks: 0,
          activeBooks: 0,
          reservedBooks: 0,
          soldBooks: 0,
          totalFavorites: 0,
          totalInterests: 0,
          topBooks: [],
        };
      }

      const myBooks = await db.select().from(books).where(eq(books.seboId, seboId));
      const bookIds = myBooks.map((book: typeof books.$inferSelect) => book.id);

      const statusCount = myBooks.reduce(
        (
          acc: { activeBooks: number; reservedBooks: number; soldBooks: number },
          book: typeof books.$inferSelect
        ) => {
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
          totalInterests: 0,
          topBooks: [],
        };
      }

      const favoritesByBook = await db
        .select({
          bookId: favorites.bookId,
          count: sql<number>`count(*)`.as("count"),
        })
        .from(favorites)
        .where(inArray(favorites.bookId, bookIds))
        .groupBy(favorites.bookId);

      const favoritesMap = new Map<number, number>(
        favoritesByBook.map((row: { bookId: number; count: number }) => [row.bookId, Number(row.count ?? 0)])
      );
      const topBooks = myBooks
        .map((book: typeof books.$inferSelect) => ({
          id: book.id,
          title: normalizeBookTitle(book.title) ?? book.title,
          favorites: favoritesMap.get(book.id) ?? 0,
        }))
        .sort((a: { favorites: number }, b: { favorites: number }) => b.favorites - a.favorites)
        .slice(0, 5);

      const totalFavorites = Array.from(favoritesMap.values()).reduce((sum, value) => sum + value, 0);
      const interestsByBook = await db
        .select({
          bookId: bookInterests.bookId,
          count: sql<number>`count(*)`.as("count"),
        })
        .from(bookInterests)
        .where(inArray(bookInterests.bookId, bookIds))
        .groupBy(bookInterests.bookId);
      const totalInterests = interestsByBook.reduce(
        (sum, row) => sum + Number(row.count ?? 0),
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
      const book = await db
        .select({ id: books.id })
        .from(books)
        .where(eq(books.id, input.bookId))
        .limit(1)
        .then((res) => res[0] ?? null);
      if (!book) {
        throw new Error("Book not found");
      }

      await db
        .insert(bookInterests)
        .values({
          userId: ctx.userId!,
          bookId: input.bookId,
        })
        .onConflictDoNothing({
          target: [bookInterests.userId, bookInterests.bookId],
        });

      const totalInterests = await db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(bookInterests)
        .where(eq(bookInterests.bookId, input.bookId))
        .then((res) => Number(res[0]?.count ?? 0));

      return { success: true, totalInterests };
    }),

  myInterests: protectedProcedure.query(async ({ ctx }) => {
    const data = await db
      .select({
        interestId: bookInterests.id,
        interestedAt: bookInterests.createdAt,
        book: books,
        sebo: seboBaseSelect,
      })
      .from(bookInterests)
      .innerJoin(books, eq(bookInterests.bookId, books.id))
      .leftJoin(sebos, eq(books.seboId, sebos.id))
      .where(eq(bookInterests.userId, ctx.userId!));

    return data
      .map((row) => {
        const normalized = normalizeBookDescription(row.book.description);
        return {
          interestId: row.interestId,
          interestedAt: row.interestedAt,
          book: {
            ...row.book,
            title: normalizeBookTitle(row.book.title) ?? row.book.title,
            description: normalized.description,
            availabilityStatus: normalized.availabilityStatus,
          },
          sebo: row.sebo
            ? {
                id: row.sebo.id,
                name: row.sebo.name,
                city: row.sebo.city,
                state: row.sebo.state,
              }
            : null,
        };
      })
      .sort((a, b) => Number(b.interestedAt) - Number(a.interestedAt));
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
        .select(seboBaseSelect)
        .from(sebos)
        .where(eq(sebos.id, book.seboId))
        .then((res) => res[0]);

      const canDelete = Boolean(sebo && (sebo.userId === ctx.userId || ctx.role === "admin"));
      if (!canDelete) {
        throw new Error("Unauthorized");
      }

      await db.delete(books).where(eq(books.id, input));

      await logAuditEvent({
        actorUserId: ctx.userId,
        actorRole: ctx.role,
        action: "book.delete",
        entityType: "book",
        entityId: input,
        metadata: {
          seboId: book.seboId,
          title: book.title,
        },
      });

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
