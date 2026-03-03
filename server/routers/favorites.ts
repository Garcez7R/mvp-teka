import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_utils/trpc.js";
import { db } from "./_utils/db.js";
import { favorites, books } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

export const favoritesRouter = router({
  // Get user's favorites
  list: protectedProcedure.query(async ({ ctx }) => {
    const favBooks = await db
      .select({
        favorite: favorites,
        book: books,
      })
      .from(favorites)
      .innerJoin(books, eq(favorites.bookId, books.id))
      .where(eq(favorites.userId, ctx.userId!));

    return favBooks.map((item) => item.book);
  }),

  // Check if book is favorited
  isFavorited: protectedProcedure
    .input(z.number())
    .query(async ({ input, ctx }) => {
      const fav = await db
        .select()
        .from(favorites)
        .where(
          and(
            eq(favorites.userId, ctx.userId!),
            eq(favorites.bookId, input)
          )
        )
        .then((res) => res[0]);

      return !!fav;
    }),

  // Toggle favorite
  toggle: protectedProcedure
    .input(z.number())
    .mutation(async ({ input, ctx }) => {
      const existing = await db
        .select()
        .from(favorites)
        .where(
          and(
            eq(favorites.userId, ctx.userId!),
            eq(favorites.bookId, input)
          )
        )
        .then((res) => res[0]);

      if (existing) {
        await db.delete(favorites).where(eq(favorites.id, existing.id));
        return { favorited: false };
      } else {
        await db.insert(favorites).values({
          userId: ctx.userId!,
          bookId: input,
        });
        return { favorited: true };
      }
    }),
});
