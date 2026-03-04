import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_utils/trpc.js";
import { db } from "./_utils/db.js";
import { books, sebos } from "../_schema.ts";
import { eq, ilike, and, lte, gte } from "drizzle-orm";

export const booksRouter = router({
  // List all books with filters
  list: publicProcedure
    .input(
      z.object({
        search: z.string().optional(),
        category: z.string().optional(),
        seboId: z.number().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        condition: z
          .enum(["Excelente", "Bom estado", "Usado", "Desgastado"])
          .optional(),
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

      const data = await db
        .select()
        .from(books)
        .leftJoin(sebos, eq(books.seboId, sebos.id))
        .where(where)
        .limit(input.limit)
        .offset(input.offset);

      // Format response to include sebo info
      return data.map((row) => ({
        ...row.books,
        sebo: row.sebos ? { id: row.sebos.id, name: row.sebos.name } : null,
      }));
    }),

  // Get single book
  getById: publicProcedure
    .input(z.number())
    .query(async ({ input }) => {
      const book = await db
        .select()
        .from(books)
        .where(eq(books.id, input))
        .then((res) => res[0]);

      if (!book) {
        throw new Error("Book not found");
      }

      // Get sebo info
      const sebo = await db
        .select()
        .from(sebos)
        .where(eq(sebos.id, book.seboId))
        .then((res) => res[0]);

      return { ...book, sebo };
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
        .then((res) => res[0]);

      if (!sebo || sebo.userId !== ctx.userId) {
        throw new Error("Unauthorized");
      }

      const data = await db
        .select()
        .from(books)
        .where(eq(books.seboId, input));

      return data;
    }),

  // Create new book (protected)
  create: protectedProcedure
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
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify user owns this sebo
      const sebo = await db
        .select()
        .from(sebos)
        .where(eq(sebos.id, input.seboId))
        .then((res) => res[0]);

      if (!sebo || sebo.userId !== ctx.userId) {
        throw new Error("Unauthorized: You don't own this sebo");
      }

      const newBook = await db
        .insert(books)
        .values({
          ...input,
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
        coverUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const book = await db
        .select()
        .from(books)
        .where(eq(books.id, input.id))
        .then((res) => res[0]);

      if (!book) {
        throw new Error("Book not found");
      }

      const sebo = await db
        .select()
        .from(sebos)
        .where(eq(sebos.id, book.seboId))
        .then((res) => res[0]);

      if (!sebo || sebo.userId !== ctx.userId) {
        throw new Error("Unauthorized");
      }

      const { id, ...updateData } = input;
      const updateDataWithStringPrice: any = {
        ...updateData,
        ...(updateData.price !== undefined && { price: updateData.price.toString() }),
      };
      // cast to any because drizzle expects price string and our union could still
      // include number otherwise
      await db.update(books).set(updateDataWithStringPrice as any).where(eq(books.id, id));

      return { success: true };
    }),

  // Delete book
  delete: protectedProcedure
    .input(z.number())
    .mutation(async ({ input, ctx }) => {
      const book = await db
        .select()
        .from(books)
        .where(eq(books.id, input))
        .then((res) => res[0]);

      if (!book) {
        throw new Error("Book not found");
      }

      const sebo = await db
        .select()
        .from(sebos)
        .where(eq(sebos.id, book.seboId))
        .then((res) => res[0]);

      if (!sebo || sebo.userId !== ctx.userId) {
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

    return result.map((r) => r.category).filter((c) => c);
  }),
});
