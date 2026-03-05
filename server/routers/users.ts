import { z } from "zod";
import { router, publicProcedure, protectedProcedure, adminProcedure } from "./_utils/trpc.js";
import { db } from "./_utils/db.js";
import { users } from "../_schema.ts";
import { eq } from "drizzle-orm";

export const usersRouter = router({
  // Get current user
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, ctx.userId!))
      .then((res: Array<typeof users.$inferSelect>) => res[0]);

    return user || null;
  }),

  // Get user by ID
  getById: publicProcedure
    .input(z.number())
    .query(async ({ input }) => {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, input))
        .then((res: Array<typeof users.$inferSelect>) => res[0]);

      if (!user) {
        throw new Error("User not found");
      }

      // Don't expose sensitive info
      const { openId, ...safe } = user;
      return safe;
    }),

  // Register user (for testing, use real auth in production)
  register: publicProcedure
    .input(
      z.object({
        openId: z.string().optional(),
        name: z.string(),
        email: z.string().email(),
        role: z.enum(["livreiro", "comprador"]).default("comprador"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const generatedOpenId = input.openId || `email:${input.email.toLowerCase()}`;
        const newUser = await db
          .insert(users)
          .values({
            openId: generatedOpenId,
            name: input.name,
            email: input.email,
            role: input.role,
            loginMethod: "email",
          })
          .$returningId();

        return newUser;
      } catch (error: any) {
        if (error.code === "ER_DUP_ENTRY") {
          throw new Error("User already exists");
        }
        throw error;
      }
    }),

  loginByEmail: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
      })
    )
    .mutation(async ({ input }) => {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .then((res: Array<typeof users.$inferSelect>) => res[0] ?? null);

      if (!user) {
        throw new Error("Usuário não encontrado para este e-mail");
      }

      return user;
    }),

  // Update user
  update: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        email: z.string().email().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await db
        .update(users)
        .set(input)
        .where(eq(users.id, ctx.userId!));

      return { success: true };
    }),

  adminList: adminProcedure.query(async () => {
    return db.select().from(users);
  }),

  adminUpdateRole: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        role: z.enum(["admin", "livreiro", "comprador", "user"]),
      })
    )
    .mutation(async ({ input }) => {
      await db
        .update(users)
        .set({ role: input.role })
        .where(eq(users.id, input.userId));

      return { success: true };
    }),
});
