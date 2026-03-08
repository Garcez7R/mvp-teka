import { z } from "zod";
import { router, publicProcedure, protectedProcedure, adminProcedure } from "./_utils/trpc.js";
import { db } from "./_utils/db.js";
import { sebos, books, users, favorites, bookInterests, seboReviews } from "../_schema.ts";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { logAuditEvent } from "./_utils/audit.js";

const HIDDEN_MARKER = /^\[HIDDEN\]\s*/i;
const STATUS_MARKER = /^\[STATUS:(ATIVO|RESERVADO|VENDIDO)\]\s*/i;
type AvailabilityStatus = "ativo" | "reservado" | "vendido";

function slugifySeboName(value?: string | null): string {
  const base = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();
  return base || "sebo";
}

async function ensureUniqueProSlug(baseSlug: string, currentSeboId?: number): Promise<string> {
  let nextSlug = baseSlug;
  let suffix = 1;
  while (true) {
    const existing = await db
      .select({ id: sebos.id })
      .from(sebos)
      .where(eq(sebos.proSlug, nextSlug))
      .then((res) => res[0] ?? null);
    if (!existing || (currentSeboId && Number(existing.id) === Number(currentSeboId))) {
      return nextSlug;
    }
    suffix += 1;
    nextSlug = `${baseSlug}-${suffix}`;
  }
}

const seboPublicSelect = {
  id: sebos.id,
  name: sebos.name,
  plan: sebos.plan,
  proSlug: sebos.proSlug,
  proEnabledAt: sebos.proEnabledAt,
  maxActiveBooks: sebos.maxActiveBooks,
  showPublicPhone: sebos.showPublicPhone,
  showPublicAddress: sebos.showPublicAddress,
  description: sebos.description,
  addressLine: sebos.addressLine,
  logoUrl: sebos.logoUrl,
  whatsapp: sebos.whatsapp,
  city: sebos.city,
  state: sebos.state,
  postalCode: sebos.postalCode,
  verified: sebos.verified,
  supportsPickup: sebos.supportsPickup,
  shipsNeighborhood: sebos.shipsNeighborhood,
  shipsCity: sebos.shipsCity,
  shipsState: sebos.shipsState,
  shipsNationwide: sebos.shipsNationwide,
  shippingAreas: sebos.shippingAreas,
  shippingFeeNotes: sebos.shippingFeeNotes,
  shippingEta: sebos.shippingEta,
  shippingNotes: sebos.shippingNotes,
  createdAt: sebos.createdAt,
  updatedAt: sebos.updatedAt,
} as const;

function sanitizeBookDescription(raw?: string | null): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw
    .replace(/source\s*title\s*:[^\n\r]*/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return cleaned || null;
}

function normalizeBookDescription(raw?: string | null): {
  availabilityStatus: AvailabilityStatus;
  isVisible: boolean;
  description: string | null;
} {
  let value = String(raw ?? "").trim();
  if (!value) {
    return { availabilityStatus: "ativo", isVisible: true, description: null };
  }

  let availabilityStatus: AvailabilityStatus = "ativo";
  let isVisible = true;
  let changed = true;
  while (changed) {
    changed = false;
    if (HIDDEN_MARKER.test(value)) {
      isVisible = false;
      value = value.replace(HIDDEN_MARKER, "").trim();
      changed = true;
    }
    const statusMatch = value.match(STATUS_MARKER);
    if (statusMatch?.[1]) {
      availabilityStatus = statusMatch[1].toLowerCase() as AvailabilityStatus;
      value = value.replace(STATUS_MARKER, "").trim();
      changed = true;
    }
  }

  return {
    availabilityStatus,
    isVisible,
    description: sanitizeBookDescription(value),
  };
}

export const sebosRouter = router({
  // Get all sebos
  list: publicProcedure.query(async () => {
    const rows = await db.select(seboPublicSelect).from(sebos);
    return rows.map((row) => ({
      ...row,
      addressLine: row.showPublicAddress ? row.addressLine : null,
    }));
  }),

  // Get all sebos owned by current user
  listMine: protectedProcedure.query(async ({ ctx }) => {
    return await db.select().from(sebos).where(eq(sebos.userId, ctx.userId!));
  }),

  // Get sebo by ID with books
  getById: publicProcedure
    .input(z.number())
    .query(async ({ input, ctx }) => {
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

      const canSeeHidden = ctx.role === "admin" || (ctx.userId !== null && sebo.userId === ctx.userId);
      const visibleBooks = seboBooks
        .map((book) => {
          const normalized = normalizeBookDescription(book.description);
          return {
            ...book,
            description: normalized.description,
            availabilityStatus: normalized.availabilityStatus,
            isVisible: normalized.isVisible,
          };
        })
        .filter((book) => canSeeHidden || book.isVisible);

      const publicSebo = {
        id: sebo.id,
        name: sebo.name,
        plan: sebo.plan,
        proSlug: sebo.proSlug,
        proEnabledAt: sebo.proEnabledAt,
        maxActiveBooks: sebo.maxActiveBooks,
        showPublicPhone: sebo.showPublicPhone,
        showPublicAddress: sebo.showPublicAddress,
        description: sebo.description,
        addressLine: sebo.showPublicAddress ? sebo.addressLine : null,
        logoUrl: sebo.logoUrl,
        whatsapp: sebo.whatsapp,
        city: sebo.city,
        state: sebo.state,
        postalCode: sebo.postalCode,
        verified: sebo.verified,
        supportsPickup: sebo.supportsPickup,
        shipsNeighborhood: sebo.shipsNeighborhood,
        shipsCity: sebo.shipsCity,
        shipsState: sebo.shipsState,
        shipsNationwide: sebo.shipsNationwide,
        shippingAreas: sebo.shippingAreas,
        shippingFeeNotes: sebo.shippingFeeNotes,
        shippingEta: sebo.shippingEta,
        shippingNotes: sebo.shippingNotes,
        createdAt: sebo.createdAt,
        updatedAt: sebo.updatedAt,
      };

      return { ...publicSebo, books: visibleBooks };
    }),

  // Get sebo pro storefront by slug
  getBySlug: publicProcedure
    .input(z.string().trim().min(2))
    .query(async ({ input, ctx }) => {
      const normalizedSlug = slugifySeboName(input);
      const sebo = await db
        .select()
        .from(sebos)
        .where(and(eq(sebos.proSlug, normalizedSlug), inArray(sebos.plan, ["pro", "gold"])))
        .then((res: Array<typeof sebos.$inferSelect>) => res[0]);

      if (!sebo) {
        throw new Error("Sebo not found");
      }

      const seboBooks = await db
        .select()
        .from(books)
        .where(eq(books.seboId, sebo.id));

      const canSeeHidden = ctx.role === "admin" || (ctx.userId !== null && sebo.userId === ctx.userId);
      const visibleBooks = seboBooks
        .map((book) => {
          const normalized = normalizeBookDescription(book.description);
          return {
            ...book,
            description: normalized.description,
            availabilityStatus: normalized.availabilityStatus,
            isVisible: normalized.isVisible,
          };
        })
        .filter((book) => canSeeHidden || book.isVisible);

      return {
        id: sebo.id,
        name: sebo.name,
        plan: sebo.plan,
        proSlug: sebo.proSlug,
        proEnabledAt: sebo.proEnabledAt,
        maxActiveBooks: sebo.maxActiveBooks,
        showPublicPhone: sebo.showPublicPhone,
        showPublicAddress: sebo.showPublicAddress,
        description: sebo.description,
        addressLine: sebo.showPublicAddress ? sebo.addressLine : null,
        logoUrl: sebo.logoUrl,
        whatsapp: sebo.whatsapp,
        city: sebo.city,
        state: sebo.state,
        postalCode: sebo.postalCode,
        verified: sebo.verified,
        supportsPickup: sebo.supportsPickup,
        shipsNeighborhood: sebo.shipsNeighborhood,
        shipsCity: sebo.shipsCity,
        shipsState: sebo.shipsState,
        shipsNationwide: sebo.shipsNationwide,
        shippingAreas: sebo.shippingAreas,
        shippingFeeNotes: sebo.shippingFeeNotes,
        shippingEta: sebo.shippingEta,
        shippingNotes: sebo.shippingNotes,
        createdAt: sebo.createdAt,
        updatedAt: sebo.updatedAt,
        books: visibleBooks,
      };
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
        ownerName: z.string().trim().min(3, "Nome completo do sebista é obrigatório"),
        documentId: z.string().trim().min(11, "CPF/CNPJ é obrigatório"),
        maxActiveBooks: z.number().int().optional(),
        showPublicPhone: z.boolean().optional(),
        showPublicAddress: z.boolean().optional(),
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

      await logAuditEvent({
        actorUserId: ctx.userId,
        actorRole: ctx.role,
        action: "sebo.create",
        entityType: "sebo",
        entityId: newSebo[0]?.id ?? null,
        metadata: {
          ownerUserId: ctx.userId,
          name: input.name,
        },
      });

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
        maxActiveBooks: z.number().int().optional(),
        showPublicPhone: z.boolean().optional(),
        showPublicAddress: z.boolean().optional(),
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

      await logAuditEvent({
        actorUserId: ctx.userId,
        actorRole: ctx.role,
        action: "sebo.update",
        entityType: "sebo",
        entityId: id,
        metadata: {
          changedFields: Object.keys(updateData),
        },
      });

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
        maxActiveBooks: z.number().int().optional(),
        showPublicPhone: z.boolean().optional(),
        showPublicAddress: z.boolean().optional(),
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
    .mutation(async ({ input, ctx }) => {
      const created = await db
        .insert(sebos)
        .values({
          ...input,
          verified: input.verified ?? false,
        })
        .returning({ id: sebos.id });

      await logAuditEvent({
        actorUserId: ctx.userId,
        actorRole: ctx.role,
        action: "admin.sebo.create",
        entityType: "sebo",
        entityId: created[0]?.id ?? null,
        metadata: {
          targetUserId: input.userId,
          verified: input.verified ?? false,
        },
      });

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
        maxActiveBooks: z.number().int().optional(),
        showPublicPhone: z.boolean().optional(),
        showPublicAddress: z.boolean().optional(),
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
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input;
      await db.update(sebos).set(updateData).where(eq(sebos.id, id));
      await logAuditEvent({
        actorUserId: ctx.userId,
        actorRole: ctx.role,
        action: "admin.sebo.update",
        entityType: "sebo",
        entityId: id,
        metadata: {
          changedFields: Object.keys(updateData),
        },
      });
      return { success: true };
    }),

  adminSetPlan: adminProcedure
    .input(
      z.object({
        id: z.number(),
        plan: z.enum(["free", "pro", "gold"]),
        proSlug: z.string().trim().optional(),
        maxActiveBooks: z.number().int().nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await db
        .select()
        .from(sebos)
        .where(eq(sebos.id, input.id))
        .then((res: Array<typeof sebos.$inferSelect>) => res[0] ?? null);

      if (!existing) {
        throw new Error("Sebo not found");
      }

      if (input.plan === "pro" || input.plan === "gold") {
        const requested = slugifySeboName(input.proSlug || existing.proSlug || existing.name);
        const uniqueSlug = await ensureUniqueProSlug(requested, existing.id);
        await db
          .update(sebos)
          .set({
            plan: input.plan,
            proSlug: uniqueSlug,
            proEnabledAt: new Date(),
            maxActiveBooks: input.maxActiveBooks === undefined ? existing.maxActiveBooks : input.maxActiveBooks,
          })
          .where(eq(sebos.id, input.id));

        await logAuditEvent({
          actorUserId: ctx.userId,
          actorRole: ctx.role,
          action: "admin.sebo.set_plan",
          entityType: "sebo",
          entityId: input.id,
          metadata: {
            plan: input.plan,
            proSlug: uniqueSlug,
            maxActiveBooks: input.maxActiveBooks === undefined ? existing.maxActiveBooks : input.maxActiveBooks,
          },
        });

        return {
          success: true,
          plan: input.plan,
          proSlug: uniqueSlug,
        };
      }

      await db
        .update(sebos)
        .set({
          plan: "free",
          proEnabledAt: null,
          maxActiveBooks: input.maxActiveBooks === undefined ? existing.maxActiveBooks : input.maxActiveBooks,
        })
        .where(eq(sebos.id, input.id));

      await logAuditEvent({
        actorUserId: ctx.userId,
        actorRole: ctx.role,
        action: "admin.sebo.set_plan",
        entityType: "sebo",
        entityId: input.id,
        metadata: {
          plan: "free",
        },
      });

      return {
        success: true,
        plan: "free" as const,
        proSlug: existing.proSlug ?? null,
      };
    }),

  setMyProSlug: protectedProcedure
    .input(
      z.object({
        seboId: z.number(),
        proSlug: z.string().trim().min(2),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await db
        .select()
        .from(sebos)
        .where(eq(sebos.id, input.seboId))
        .then((res: Array<typeof sebos.$inferSelect>) => res[0] ?? null);

      if (!existing) {
        throw new Error("Sebo not found");
      }

      const canEdit = existing.userId === ctx.userId || ctx.role === "admin";
      if (!canEdit) {
        throw new Error("Unauthorized");
      }

      if (existing.plan !== "pro" && existing.plan !== "gold") {
        throw new Error("Este sebo ainda não está em plano com URL personalizada.");
      }

      const requested = slugifySeboName(input.proSlug);
      const uniqueSlug = await ensureUniqueProSlug(requested, existing.id);

      await db
        .update(sebos)
        .set({ proSlug: uniqueSlug, updatedAt: new Date() })
        .where(eq(sebos.id, input.seboId));

      await logAuditEvent({
        actorUserId: ctx.userId,
        actorRole: ctx.role,
        action: "sebo.update_pro_slug",
        entityType: "sebo",
        entityId: existing.id,
        metadata: {
          proSlug: uniqueSlug,
        },
      });

      return {
        success: true,
        proSlug: uniqueSlug,
      };
    }),

  reviewSummary: publicProcedure
    .input(z.object({ seboId: z.number() }))
    .query(async ({ input }) => {
      const rows = await db
        .select({
          count: sql<number>`count(*)`.as("count"),
          avg: sql<number>`avg(${seboReviews.rating})`.as("avg"),
        })
        .from(seboReviews)
        .where(and(eq(seboReviews.seboId, input.seboId), eq(seboReviews.isVisible, true)));

      const count = Number(rows[0]?.count ?? 0);
      const average = Number(rows[0]?.avg ?? 0);
      const isTopRated = count >= 10 && average >= 4.7;
      return {
        seboId: input.seboId,
        count,
        average,
        isTopRated,
      };
    }),

  listReviews: publicProcedure
    .input(z.object({ seboId: z.number(), limit: z.number().int().min(1).max(50).default(10) }))
    .query(async ({ input }) => {
      const rows = await db
        .select({
          id: seboReviews.id,
          rating: seboReviews.rating,
          comment: seboReviews.comment,
          createdAt: seboReviews.createdAt,
          userName: users.name,
        })
        .from(seboReviews)
        .leftJoin(users, eq(users.id, seboReviews.userId))
        .where(and(eq(seboReviews.seboId, input.seboId), eq(seboReviews.isVisible, true)))
        .orderBy(desc(seboReviews.createdAt))
        .limit(input.limit);

      return rows;
    }),

  upsertReview: protectedProcedure
    .input(
      z.object({
        seboId: z.number(),
        rating: z.number().int().min(1).max(5),
        comment: z.string().max(600).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const sebo = await db
        .select()
        .from(sebos)
        .where(eq(sebos.id, input.seboId))
        .then((res: Array<typeof sebos.$inferSelect>) => res[0] ?? null);
      if (!sebo) throw new Error("Sebo not found");
      if (Number(sebo.userId) === Number(ctx.userId)) {
        throw new Error("Você não pode avaliar seu próprio sebo.");
      }

      const existing = await db
        .select()
        .from(seboReviews)
        .where(and(eq(seboReviews.seboId, input.seboId), eq(seboReviews.userId, ctx.userId!)))
        .then((res: Array<typeof seboReviews.$inferSelect>) => res[0] ?? null);

      if (existing) {
        await db
          .update(seboReviews)
          .set({
            rating: input.rating,
            comment: input.comment?.trim() || null,
            updatedAt: new Date(),
          })
          .where(eq(seboReviews.id, existing.id));
      } else {
        await db.insert(seboReviews).values({
          seboId: input.seboId,
          userId: ctx.userId!,
          rating: input.rating,
          comment: input.comment?.trim() || null,
          isVisible: true,
        });
      }

      await logAuditEvent({
        actorUserId: ctx.userId,
        actorRole: ctx.role,
        action: "sebo.review.upsert",
        entityType: "sebo",
        entityId: input.seboId,
        metadata: {
          rating: input.rating,
        },
      });

      return { success: true };
    }),

  adminModerateReview: adminProcedure
    .input(
      z.object({
        reviewId: z.number(),
        isVisible: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await db
        .update(seboReviews)
        .set({ isVisible: input.isVisible, updatedAt: new Date() })
        .where(eq(seboReviews.id, input.reviewId));

      await logAuditEvent({
        actorUserId: ctx.userId,
        actorRole: ctx.role,
        action: "admin.sebo.review.moderate",
        entityType: "sebo_review",
        entityId: input.reviewId,
        metadata: {
          isVisible: input.isVisible,
        },
      });

      return { success: true };
    }),

  adminDelete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
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

      await logAuditEvent({
        actorUserId: ctx.userId,
        actorRole: ctx.role,
        action: "admin.sebo.delete",
        entityType: "sebo",
        entityId: input.id,
        metadata: {
          deletedBooks: seboBookIds.length,
        },
      });

      return { success: true };
    }),
});
