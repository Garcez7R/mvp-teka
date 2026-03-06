import { z } from "zod";
import { router, publicProcedure, protectedProcedure, adminProcedure } from "./_utils/trpc.js";
import { db } from "./_utils/db.js";
import { sebos, books, users, favorites, bookInterests } from "../_schema.ts";
import { eq, inArray } from "drizzle-orm";

export const sebosRouter = router({
  // Get all sebos
  list: publicProcedure.query(async () => {
    return await db.select().from(sebos);
  }),

  // Get sebo by ID with books
  getById: publicProcedure
    .input(z.number())
    .query(async ({ input }) => {
      const sebo = await db
        .select()
        .from(sebos)
        .where(eq(sebos.id, input))
        .then((res: Array<typeof sebos.$inferSelect>) => res[0]);

      if (!sebo) {
        throw new Error("Sebo not found");
      }

      const seboBooks = await db
        .select()
        .from(books)
        .where(eq(books.seboId, input));

      return { ...sebo, books: seboBooks };
    }),

  // Get current user's sebo
  getMySebo: protectedProcedure.query(async ({ ctx }) => {
      const mySebo = await db
      .select()
      .from(sebos)
      .where(eq(sebos.userId, ctx.userId!))
      .then((res: Array<typeof sebos.$inferSelect>) => res[0]);

    return mySebo || null;
  }),

  // Create sebo (authenticated user; promotes buyer to seller on first creation)
  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        ownerName: z.string().optional(),
        documentId: z.string().optional(),
        addressLine: z.string().optional(),
        postalCode: z.string().optional(),
        openingYear: z.number().int().optional(),
        logoUrl: z.string().optional(),
        supportsPickup: z.boolean().optional(),
        shipsNeighborhood: z.boolean().optional(),
        shipsCity: z.boolean().optional(),
        shipsState: z.boolean().optional(),
        shipsNationwide: z.boolean().optional(),
        shippingAreas: z.string().optional(),
        shippingFeeNotes: z.string().optional(),
        shippingEta: z.string().optional(),
        shippingNotes: z.string().optional(),
        whatsapp: z.string(),
        city: z.string().optional(),
        state: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const currentUser = await db
        .select()
        .from(users)
        .where(eq(users.id, ctx.userId!))
        .then((res: Array<typeof users.$inferSelect>) => res[0] ?? null);

      if (!currentUser) {
        throw new Error("User not found");
      }

      if (currentUser.role === "comprador" || currentUser.role === "user") {
        await db
          .update(users)
          .set({ role: "livreiro" })
          .where(eq(users.id, currentUser.id));
      }

      const newSebo = await db.insert(sebos).values({
        userId: ctx.userId!,
        ...input,
      })
      .returning({ id: sebos.id });

      return newSebo;
    }),

  // Update sebo
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        ownerName: z.string().optional(),
        documentId: z.string().optional(),
        addressLine: z.string().optional(),
        postalCode: z.string().optional(),
        openingYear: z.number().int().optional(),
        logoUrl: z.string().optional(),
        supportsPickup: z.boolean().optional(),
        shipsNeighborhood: z.boolean().optional(),
        shipsCity: z.boolean().optional(),
        shipsState: z.boolean().optional(),
        shipsNationwide: z.boolean().optional(),
        shippingAreas: z.string().optional(),
        shippingFeeNotes: z.string().optional(),
        shippingEta: z.string().optional(),
        shippingNotes: z.string().optional(),
        whatsapp: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input;

      const sebo = await db
        .select()
        .from(sebos)
        .where(eq(sebos.id, id))
        .then((res: Array<typeof sebos.$inferSelect>) => res[0]);

      const canEdit = Boolean(sebo && (sebo.userId === ctx.userId || ctx.role === "admin"));
      if (!canEdit) {
        throw new Error("Unauthorized");
      }

      await db.update(sebos).set(updateData).where(eq(sebos.id, id));

      return { success: true };
    }),

  adminCreate: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        name: z.string(),
        description: z.string().optional(),
        ownerName: z.string().optional(),
        documentId: z.string().optional(),
        addressLine: z.string().optional(),
        postalCode: z.string().optional(),
        openingYear: z.number().int().optional(),
        logoUrl: z.string().optional(),
        supportsPickup: z.boolean().optional(),
        shipsNeighborhood: z.boolean().optional(),
        shipsCity: z.boolean().optional(),
        shipsState: z.boolean().optional(),
        shipsNationwide: z.boolean().optional(),
        shippingAreas: z.string().optional(),
        shippingFeeNotes: z.string().optional(),
        shippingEta: z.string().optional(),
        shippingNotes: z.string().optional(),
        whatsapp: z.string(),
        city: z.string().optional(),
        state: z.string().optional(),
        verified: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const created = await db
        .insert(sebos)
        .values({
          ...input,
          verified: input.verified ?? false,
        })
        .returning({ id: sebos.id });

      return created[0];
    }),

  adminUpdate: adminProcedure
    .input(
      z.object({
        id: z.number(),
        userId: z.number().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        ownerName: z.string().optional(),
        documentId: z.string().optional(),
        addressLine: z.string().optional(),
        postalCode: z.string().optional(),
        openingYear: z.number().int().optional(),
        logoUrl: z.string().optional(),
        supportsPickup: z.boolean().optional(),
        shipsNeighborhood: z.boolean().optional(),
        shipsCity: z.boolean().optional(),
        shipsState: z.boolean().optional(),
        shipsNationwide: z.boolean().optional(),
        shippingAreas: z.string().optional(),
        shippingFeeNotes: z.string().optional(),
        shippingEta: z.string().optional(),
        shippingNotes: z.string().optional(),
        whatsapp: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        verified: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;
      await db.update(sebos).set(updateData).where(eq(sebos.id, id));
      return { success: true };
    }),

  adminDelete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const existingSebo = await db
        .select({ id: sebos.id })
        .from(sebos)
        .where(eq(sebos.id, input.id))
        .then((res) => res[0] ?? null);

      if (!existingSebo) {
        throw new Error("Sebo not found");
      }

      const seboBooks = await db
        .select({ id: books.id })
        .from(books)
        .where(eq(books.seboId, input.id));

      const seboBookIds = seboBooks.map((row) => row.id);
      if (seboBookIds.length > 0) {
        await db.delete(favorites).where(inArray(favorites.bookId, seboBookIds));
        await db.delete(bookInterests).where(inArray(bookInterests.bookId, seboBookIds));
        await db.delete(books).where(inArray(books.id, seboBookIds));
      }

      await db.delete(sebos).where(eq(sebos.id, input.id));

      return { success: true };
    }),
});
