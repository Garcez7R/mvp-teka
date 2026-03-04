import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_utils/trpc.js";
import { db } from "./_utils/db.js";
import { sebos, users, books } from "../_schema.ts";
import { eq } from "drizzle-orm";

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

  // Create sebo (public)
  create: publicProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        whatsapp: z.string(),
        city: z.string().optional(),
        state: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // MVP fallback: allow public creation by assigning a technical owner user.
      let ownerUserId: number;
      const fallbackOpenId = "public-sebo-owner";

      const existingOwner = await db
        .select()
        .from(users)
        .where(eq(users.openId, fallbackOpenId))
        .then((res: Array<typeof users.$inferSelect>) => res[0]);

      if (existingOwner) {
        ownerUserId = existingOwner.id;
      } else {
        const insertedOwner = await db
          .insert(users)
          .values({
            openId: fallbackOpenId,
            name: "Public Sebo Owner",
            role: "livreiro",
            loginMethod: "public",
          })
          .$returningId();
        ownerUserId = insertedOwner[0].id;
      }

      const newSebo = await db.insert(sebos).values({
        userId: ownerUserId,
        ...input,
      })
      .$returningId();

      return newSebo;
    }),

  // Update sebo
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
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

      if (!sebo || sebo.userId !== ctx.userId) {
        throw new Error("Unauthorized");
      }

      await db.update(sebos).set(updateData).where(eq(sebos.id, id));

      return { success: true };
    }),
});
