import { z } from "zod";
import { router, publicProcedure, protectedProcedure, livreiroProcedure } from "./_utils/trpc.js";
import { db } from "./_utils/db.js";
import { sebos, books } from "../_schema.ts";
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

  // Create sebo (livreiro/admin)
  create: livreiroProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        whatsapp: z.string(),
        city: z.string().optional(),
        state: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
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
});
