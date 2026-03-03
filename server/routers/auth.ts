import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "./_utils/trpc.js";
import { db } from "./_utils/db.js";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const authRouter = router({
  // Get current user
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) {
      return null;
    }

    try {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, ctx.userId))
        .limit(1);

      return user[0] || null;
    } catch {
      return null;
    }
  }),

  // Logout
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    // No-op for now, auth is handled client-side
    return { success: true };
  }),
});
