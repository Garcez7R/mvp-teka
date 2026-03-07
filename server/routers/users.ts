import { z } from "zod";
import { router, publicProcedure, protectedProcedure, adminProcedure } from "./_utils/trpc.js";
import { db } from "./_utils/db.js";
import { users, sebos, books, favorites, bookInterests, wishlistItems, auditLogs } from "../_schema.ts";
import { eq, inArray, sql, desc, gte } from "drizzle-orm";
import { logAuditEvent } from "./_utils/audit.js";

export const usersRouter = router({
  adminMetrics: adminProcedure.query(async () => {
    const now = Date.now();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [usersTotalRow, usersByRoleRows, sebosTotalRow, activeSebosRow, booksRaw, newUsersRow, newSebosRow, newBooksRow] =
      await Promise.all([
        db.select({ count: sql<number>`count(*)`.as("count") }).from(users).then((res) => Number(res[0]?.count ?? 0)),
        db
          .select({
            role: users.role,
            count: sql<number>`count(*)`.as("count"),
          })
          .from(users)
          .groupBy(users.role),
        db.select({ count: sql<number>`count(*)`.as("count") }).from(sebos).then((res) => Number(res[0]?.count ?? 0)),
        db
          .select({ count: sql<number>`count(distinct ${books.seboId})`.as("count") })
          .from(books)
          .then((res) => Number(res[0]?.count ?? 0)),
        db.select({ description: books.description }).from(books),
        db
          .select({ count: sql<number>`count(*)`.as("count") })
          .from(users)
          .where(gte(users.createdAt, sevenDaysAgo))
          .then((res) => Number(res[0]?.count ?? 0)),
        db
          .select({ count: sql<number>`count(*)`.as("count") })
          .from(sebos)
          .where(gte(sebos.createdAt, sevenDaysAgo))
          .then((res) => Number(res[0]?.count ?? 0)),
        db
          .select({ count: sql<number>`count(*)`.as("count") })
          .from(books)
          .where(gte(books.createdAt, sevenDaysAgo))
          .then((res) => Number(res[0]?.count ?? 0)),
      ]);

    const roleCounts = new Map<string, number>();
    for (const row of usersByRoleRows) {
      const role = String(row.role || "comprador");
      roleCounts.set(role, Number(row.count ?? 0));
    }

    const bookStatus = booksRaw.reduce(
      (acc, row) => {
        const raw = String(row.description || "").toUpperCase();
        if (raw.includes("[STATUS:VENDIDO]")) acc.sold += 1;
        else if (raw.includes("[STATUS:RESERVADO]")) acc.reserved += 1;
        else acc.active += 1;
        return acc;
      },
      { active: 0, reserved: 0, sold: 0 }
    );

    let recentAudit: Array<{
      action: string;
      entityType: string;
      entityId: string | null;
      actorRole: string | null;
      createdAt: Date;
    }> = [];
    try {
      recentAudit = await db
        .select({
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          actorRole: auditLogs.actorRole,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .orderBy(desc(auditLogs.createdAt))
        .limit(10);
    } catch {
      recentAudit = [];
    }

    return {
      users: {
        total: usersTotalRow,
        buyers: roleCounts.get("comprador") ?? 0,
        sellers: roleCounts.get("livreiro") ?? 0,
        admins: roleCounts.get("admin") ?? 0,
      },
      sebos: {
        total: sebosTotalRow,
        active: activeSebosRow,
      },
      books: {
        total: booksRaw.length,
        active: bookStatus.active,
        reserved: bookStatus.reserved,
        sold: bookStatus.sold,
      },
      growth7d: {
        users: newUsersRow,
        sebos: newSebosRow,
        books: newBooksRow,
      },
      recentAudit,
    };
  }),

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
          .returning({ id: users.id });

        return newUser;
      } catch (error: any) {
        if (error?.code === "ER_DUP_ENTRY" || error?.code === "SQLITE_CONSTRAINT") {
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

  setMyRole: protectedProcedure
    .input(
      z.object({
        role: z.enum(["livreiro", "comprador"]),
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

      if (currentUser.role === "admin") {
        return { success: true, role: "admin" as const };
      }

      await db
        .update(users)
        .set({ role: input.role })
        .where(eq(users.id, ctx.userId!));

      return { success: true, role: input.role };
    }),

  // Update user
  update: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        email: z.string().email().optional(),
        whatsapp: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        lgpdConsent: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { lgpdConsent, ...rest } = input;
      const payload: any = {
        ...rest,
        ...(rest.state ? { state: rest.state.toUpperCase() } : {}),
      };
      if (lgpdConsent !== undefined) {
        payload.lgpdConsentAt = lgpdConsent ? new Date() : null;
      }
      await db
        .update(users)
        .set(payload)
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
    .mutation(async ({ input, ctx }) => {
      await db
        .update(users)
        .set({ role: input.role })
        .where(eq(users.id, input.userId));

      await logAuditEvent({
        actorUserId: ctx.userId,
        actorRole: ctx.role,
        action: "admin.user.update_role",
        entityType: "user",
        entityId: input.userId,
        metadata: { role: input.role },
      });

      return { success: true };
    }),

  adminCreate: adminProcedure
    .input(
      z.object({
        name: z.string().optional(),
        email: z.string().email(),
        role: z.enum(["admin", "livreiro", "comprador", "user"]).default("comprador"),
        openId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const newUser = await db
        .insert(users)
        .values({
          openId: input.openId ?? `admin-email:${input.email.toLowerCase()}`,
          name: input.name ?? null,
          email: input.email,
          role: input.role,
          loginMethod: "admin",
        })
        .returning({ id: users.id });

      await logAuditEvent({
        actorUserId: ctx.userId,
        actorRole: ctx.role,
        action: "admin.user.create",
        entityType: "user",
        entityId: newUser[0]?.id ?? null,
        metadata: {
          role: input.role,
          email: input.email,
        },
      });

      return newUser[0];
    }),

  adminUpdate: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        whatsapp: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        lgpdConsentAt: z.date().nullable().optional(),
        role: z.enum(["admin", "livreiro", "comprador", "user"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { userId, ...updateData } = input;
      await db.update(users).set(updateData).where(eq(users.id, userId));
      await logAuditEvent({
        actorUserId: ctx.userId,
        actorRole: ctx.role,
        action: "admin.user.update",
        entityType: "user",
        entityId: userId,
        metadata: {
          changedFields: Object.keys(updateData),
        },
      });
      return { success: true };
    }),

  adminDelete: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.userId === input.userId) {
        throw new Error("Admin cannot delete current session user");
      }

      const ownedSebos = await db
        .select({ id: sebos.id })
        .from(sebos)
        .where(eq(sebos.userId, input.userId));

      const ownedSeboIds = ownedSebos.map((row) => row.id);
      if (ownedSeboIds.length > 0) {
        const ownedBooks = await db
          .select({ id: books.id })
          .from(books)
          .where(inArray(books.seboId, ownedSeboIds));
        const ownedBookIds = ownedBooks.map((row) => row.id);

        if (ownedBookIds.length > 0) {
          await db.delete(favorites).where(inArray(favorites.bookId, ownedBookIds));
          await db.delete(bookInterests).where(inArray(bookInterests.bookId, ownedBookIds));
          await db.delete(books).where(inArray(books.id, ownedBookIds));
        }

        await db.delete(sebos).where(inArray(sebos.id, ownedSeboIds));
      }

      await db.delete(favorites).where(eq(favorites.userId, input.userId));
      await db.delete(bookInterests).where(eq(bookInterests.userId, input.userId));
      await db.delete(wishlistItems).where(eq(wishlistItems.userId, input.userId));
      await db.delete(users).where(eq(users.id, input.userId));

      await logAuditEvent({
        actorUserId: ctx.userId,
        actorRole: ctx.role,
        action: "admin.user.delete",
        entityType: "user",
        entityId: input.userId,
        metadata: {
          deletedSebos: ownedSeboIds.length,
        },
      });

      return { success: true };
    }),
});
