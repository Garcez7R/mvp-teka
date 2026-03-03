import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_utils/trpc.js";
import { db } from "./_utils/db.js";
import { users } from "../drizzle/schema.js";
import { eq } from "drizzle-orm";

export const usersRouter = router({
  // Get current user
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, ctx.userId!))
      .then((res) => res[0]);

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
        .then((res) => res[0]);

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
        openId: z.string(),
        name: z.string(),
        email: z.string().email().optional(),
        role: z.enum(["user", "admin", "livreiro", "comprador"]).default("comprador"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const newUser = await db
          .insert(users)
          .values({
            openId: input.openId,
            name: input.name,
            email: input.email,
            role: input.role,
            loginMethod: "manus",
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
});
