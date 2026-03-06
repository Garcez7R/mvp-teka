import { z } from "zod";
import { and, eq, isNull, like, or } from "drizzle-orm";
import { router, protectedProcedure } from "./_utils/trpc.js";
import { db } from "./_utils/db.js";
import { books, sebos, wishlistItems } from "../_schema.ts";
import { normalizeBookTitle } from "./_utils/text.js";

const STATUS_MARKER = /^\[STATUS:(ATIVO|RESERVADO|VENDIDO)\]\s*/i;

type MatchType = "isbn" | "title";

function normalizeISBN(value?: string | null): string | null {
  if (!value) return null;
  const normalized = value.toUpperCase().replace(/[^0-9X]/g, "");
  if (normalized.length === 10 || normalized.length === 13) {
    return normalized;
  }
  return null;
}

function normalizeTitle(value?: string | null): string | null {
  const normalized = (value || "").trim().toLowerCase();
  return normalized || null;
}

function normalizeBookStatus(raw?: string | null): "ativo" | "reservado" | "vendido" {
  const value = (raw ?? "").trim();
  const match = value.match(STATUS_MARKER);
  if (!match?.[1]) return "ativo";
  return match[1].toLowerCase() as "ativo" | "reservado" | "vendido";
}

export const wishlistRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(wishlistItems)
      .where(eq(wishlistItems.userId, ctx.userId!));
  }),

  add: protectedProcedure
    .input(
      z
        .object({
          title: z.string().optional(),
          isbn: z.string().optional(),
        })
        .refine((v) => Boolean((v.title || "").trim() || (v.isbn || "").trim()), {
          message: "Informe um titulo ou ISBN",
        })
    )
    .mutation(async ({ ctx, input }) => {
      const title = normalizeTitle(input.title);
      const isbn = normalizeISBN(input.isbn);

      const existing = await db
        .select()
        .from(wishlistItems)
        .where(
          and(
            eq(wishlistItems.userId, ctx.userId!),
            title
              ? eq(wishlistItems.title, title)
              : isNull(wishlistItems.title),
            isbn
              ? eq(wishlistItems.isbn, isbn)
              : isNull(wishlistItems.isbn)
          )
        )
        .limit(1)
        .then((res) => res[0] ?? null);

      if (existing) {
        return existing;
      }

      const inserted = await db
        .insert(wishlistItems)
        .values({
          userId: ctx.userId!,
          title,
          isbn,
        })
        .returning();

      return inserted[0];
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(wishlistItems)
        .where(and(eq(wishlistItems.id, input.id), eq(wishlistItems.userId, ctx.userId!)));
      return { success: true };
    }),

  matches: protectedProcedure
    .input(
      z
        .object({ includeUnavailable: z.boolean().optional() })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const includeUnavailable = Boolean(input?.includeUnavailable);
      const wishlist = await db
        .select()
        .from(wishlistItems)
        .where(eq(wishlistItems.userId, ctx.userId!));

      if (wishlist.length === 0) {
        return [] as Array<{
          itemId: number;
          bookId: number;
          title: string;
          isbn: string | null;
          seboName: string | null;
          price: string;
          availabilityStatus: "ativo" | "reservado" | "vendido";
          matchType: MatchType;
        }>;
      }

      const results: Array<{
        itemId: number;
        bookId: number;
        title: string;
        isbn: string | null;
        seboName: string | null;
        price: string;
        availabilityStatus: "ativo" | "reservado" | "vendido";
        matchType: MatchType;
      }> = [];

      for (const item of wishlist) {
        const conditions = [] as any[];

        if (item.isbn) {
          conditions.push(eq(books.isbn, item.isbn));
        }
        if (item.title) {
          conditions.push(like(books.title, `%${item.title}%`));
        }

        if (conditions.length === 0) {
          continue;
        }

        const foundBooks = await db
          .select({
            id: books.id,
            title: books.title,
            isbn: books.isbn,
            price: books.price,
            description: books.description,
            seboName: sebos.name,
          })
          .from(books)
          .leftJoin(sebos, eq(books.seboId, sebos.id))
          .where(or(...conditions));

        for (const book of foundBooks) {
          const availabilityStatus = normalizeBookStatus(book.description);
          if (!includeUnavailable && availabilityStatus !== "ativo") {
            continue;
          }

          const matchType: MatchType =
            item.isbn && book.isbn && item.isbn === book.isbn ? "isbn" : "title";

          results.push({
            itemId: item.id,
            bookId: book.id,
            title: normalizeBookTitle(book.title) ?? book.title,
            isbn: book.isbn,
            seboName: book.seboName,
            price: String(book.price),
            availabilityStatus,
            matchType,
          });
        }
      }

      const seen = new Set<string>();
      return results.filter((item) => {
        const key = `${item.itemId}:${item.bookId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }),
});
