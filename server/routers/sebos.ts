import { z } from "zod";
import { router, publicProcedure, protectedProcedure, adminProcedure } from "./_utils/trpc.js";
import { db } from "./_utils/db.js";
import { sebos, books, users, favorites, bookInterests, seboReviews } from "../_schema.ts";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { logAuditEvent } from "./_utils/audit.js";
import { featureFlags } from "./_utils/features.ts";

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

function normalizeLocation(value: string | undefined | null): string | null {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return null;
  return trimmed.toLowerCase();
}

function normalizeState(value: string | undefined | null): string | null {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return null;
  return trimmed.toUpperCase();
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
  userId: sebos.userId,
  name: sebos.name,
  plan: sebos.plan,
  proSlug: sebos.proSlug,
  proEnabledAt: sebos.proEnabledAt,
  description: sebos.description,
  logoUrl: sebos.logoUrl,
  maxActiveBooks: sebos.maxActiveBooks,
  showPublicPhone: sebos.showPublicPhone,
  showPublicAddress: sebos.showPublicAddress,
  whatsapp: sebos.whatsapp,
  addressLine: sebos.addressLine,
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

function serializePublicSebo(
  sebo: typeof sebos.$inferSelect,
  canSeePrivateContact: boolean,
  includeInternalFields = false
) {
  const canShowPublicContact = featureFlags.publicSeboContact();
  const exposePhone = canSeePrivateContact || (canShowPublicContact && Boolean(sebo.showPublicPhone));
  const exposeAddress = canSeePrivateContact || (canShowPublicContact && Boolean(sebo.showPublicAddress));

  return {
    id: sebo.id,
    ...(includeInternalFields ? { userId: sebo.userId } : {}),
    name: sebo.name,
    plan: sebo.plan,
    proSlug: sebo.proSlug,
    proEnabledAt: sebo.proEnabledAt,
    description: sebo.description,
    logoUrl: sebo.logoUrl,
    maxActiveBooks: sebo.maxActiveBooks,
    showPublicPhone: Boolean(sebo.showPublicPhone),
    showPublicAddress: Boolean(sebo.showPublicAddress),
    whatsapp: exposePhone ? sebo.whatsapp : null,
    addressLine: exposeAddress ? sebo.addressLine : null,
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
}

async function getReviewSummaries(seboIds: number[]) {
  if (!featureFlags.reviews() || seboIds.length === 0) {
    return new Map<number, { avgRating: number; totalReviews: number; topRated: boolean }>();
  }

  const rows = await db
    .select({
      seboId: seboReviews.seboId,
      avgRating: sql<number>`round(avg(${seboReviews.rating}), 2)`.as("avgRating"),
      totalReviews: sql<number>`count(*)`.as("totalReviews"),
    })
    .from(seboReviews)
    .where(and(inArray(seboReviews.seboId, seboIds), eq(seboReviews.isVisible, true)))
    .groupBy(seboReviews.seboId);

  const output = new Map<number, { avgRating: number; totalReviews: number; topRated: boolean }>();
  for (const row of rows) {
    const avgRating = Number(row.avgRating ?? 0);
    const totalReviews = Number(row.totalReviews ?? 0);
    output.set(Number(row.seboId), {
      avgRating,
      totalReviews,
      topRated: avgRating >= 4.7 && totalReviews >= 5,
    });
  }
  return output;
}

export const sebosRouter = router({
  // Get all sebos
  list: publicProcedure.query(async ({ ctx }) => {
    const items = await db.select(seboPublicSelect).from(sebos);
    const summaryBySeboId = await getReviewSummaries(items.map((sebo) => Number(sebo.id)));
    return items.map((sebo) => ({
      ...serializePublicSebo(sebo as any, false, ctx.role === "admin"),
      reviewSummary: summaryBySeboId.get(Number(sebo.id)) ?? {
        avgRating: 0,
        totalReviews: 0,
        topRated: false,
      },
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

      const summaryBySeboId = await getReviewSummaries([Number(sebo.id)]);
      const reviewSummary = summaryBySeboId.get(Number(sebo.id)) ?? {
        avgRating: 0,
        totalReviews: 0,
        topRated: false,
      };
      const publicSebo = serializePublicSebo(sebo as any, canSeeHidden);

      return { ...publicSebo, books: visibleBooks, reviewSummary };
    }),

  // Get sebo pro storefront by slug
  getBySlug: publicProcedure
    .input(z.string().trim().min(2))
    .query(async ({ input, ctx }) => {
      const normalizedSlug = slugifySeboName(input);
      const sebo = await db
        .select()
        .from(sebos)
        .where(
          and(
            eq(sebos.proSlug, normalizedSlug),
            sql`${sebos.plan} in ('pro', 'gold')`
          )
        )
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

      const summaryBySeboId = await getReviewSummaries([Number(sebo.id)]);
      const reviewSummary = summaryBySeboId.get(Number(sebo.id)) ?? {
        avgRating: 0,
        totalReviews: 0,
        topRated: false,
      };
      const publicSebo = serializePublicSebo(sebo as any, canSeeHidden);

      return {
        ...publicSebo,
        books: visibleBooks,
        reviewSummary,
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
        showPublicPhone: z.boolean().optional(),
        showPublicAddress: z.boolean().optional(),
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

      const newSebo = await db
        .insert(sebos)
        .values({
          userId: ctx.userId!,
          ...input,
          cityNormalized: normalizeLocation(input.city),
          stateNormalized: normalizeState(input.state),
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
        maxActiveBooks: z.number().int().positive().optional(),
        showPublicPhone: z.boolean().optional(),
        showPublicAddress: z.boolean().optional(),
        whatsapp: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input;
      const hasCity = Object.prototype.hasOwnProperty.call(updateData, "city");
      const hasState = Object.prototype.hasOwnProperty.call(updateData, "state");
      const normalizedUpdate = {
        ...updateData,
        ...(hasCity ? { cityNormalized: normalizeLocation(updateData.city) } : {}),
        ...(hasState ? { stateNormalized: normalizeState(updateData.state) } : {}),
      };

      const sebo = await db
        .select()
        .from(sebos)
        .where(eq(sebos.id, id))
        .then((res: Array<typeof sebos.$inferSelect>) => res[0]);

      const canEdit = Boolean(sebo && (sebo.userId === ctx.userId || ctx.role === "admin"));
      if (!canEdit) {
        throw new Error("Unauthorized");
      }

      await db.update(sebos).set(normalizedUpdate).where(eq(sebos.id, id));

      await logAuditEvent({
        actorUserId: ctx.userId,
        actorRole: ctx.role,
        action: "sebo.update",
        entityType: "sebo",
        entityId: id,
        metadata: {
          changedFields: Object.keys(normalizedUpdate),
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
        maxActiveBooks: z.number().int().positive().optional(),
        showPublicPhone: z.boolean().optional(),
        showPublicAddress: z.boolean().optional(),
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
          cityNormalized: normalizeLocation(input.city),
          stateNormalized: normalizeState(input.state),
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
        maxActiveBooks: z.number().int().positive().optional(),
        showPublicPhone: z.boolean().optional(),
        showPublicAddress: z.boolean().optional(),
        whatsapp: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        verified: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input;
      const hasCity = Object.prototype.hasOwnProperty.call(updateData, "city");
      const hasState = Object.prototype.hasOwnProperty.call(updateData, "state");
      const normalizedUpdate = {
        ...updateData,
        ...(hasCity ? { cityNormalized: normalizeLocation(updateData.city) } : {}),
        ...(hasState ? { stateNormalized: normalizeState(updateData.state) } : {}),
      };
      await db.update(sebos).set(normalizedUpdate).where(eq(sebos.id, id));
      await logAuditEvent({
        actorUserId: ctx.userId,
        actorRole: ctx.role,
        action: "admin.sebo.update",
        entityType: "sebo",
        entityId: id,
        metadata: {
          changedFields: Object.keys(normalizedUpdate),
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
        throw new Error("Este sebo ainda não está em um plano com URL personalizada.");
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

  listReviews: publicProcedure
    .input(z.object({ seboId: z.number(), limit: z.number().min(1).max(100).default(20) }))
    .query(async ({ input }) => {
      if (!featureFlags.reviews()) {
        return [];
      }
      const rows = await db
        .select({
          id: seboReviews.id,
          seboId: seboReviews.seboId,
          userId: seboReviews.userId,
          rating: seboReviews.rating,
          comment: seboReviews.comment,
          isVisible: seboReviews.isVisible,
          createdAt: seboReviews.createdAt,
          updatedAt: seboReviews.updatedAt,
          reviewerName: users.name,
        })
        .from(seboReviews)
        .leftJoin(users, eq(users.id, seboReviews.userId))
        .where(and(eq(seboReviews.seboId, input.seboId), eq(seboReviews.isVisible, true)))
        .orderBy(desc(seboReviews.updatedAt))
        .limit(input.limit);

      return rows.map((row) => ({
        ...row,
        reviewerName: row.reviewerName || "Usuário",
      }));
    }),

  upsertReview: protectedProcedure
    .input(
      z.object({
        seboId: z.number(),
        rating: z.number().int().min(1).max(5),
        comment: z.string().trim().max(400).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!featureFlags.reviews()) {
        throw new Error("Avaliações desativadas no momento.");
      }
      const targetSebo = await db
        .select({ id: sebos.id, userId: sebos.userId })
        .from(sebos)
        .where(eq(sebos.id, input.seboId))
        .then((res) => res[0] ?? null);

      if (!targetSebo) {
        throw new Error("Sebo not found");
      }
      if (Number(targetSebo.userId) === Number(ctx.userId)) {
        throw new Error("Você não pode avaliar seu próprio sebo.");
      }
      if (ctx.role !== "comprador" && ctx.role !== "admin") {
        throw new Error("Apenas compradores podem avaliar sebos.");
      }

      const existing = await db
        .select({ id: seboReviews.id })
        .from(seboReviews)
        .where(and(eq(seboReviews.seboId, input.seboId), eq(seboReviews.userId, ctx.userId!)))
        .then((res) => res[0] ?? null);

      if (existing) {
        await db
          .update(seboReviews)
          .set({
            rating: input.rating,
            comment: input.comment || null,
            isVisible: true,
            updatedAt: new Date(),
          })
          .where(eq(seboReviews.id, existing.id));
      } else {
        await db.insert(seboReviews).values({
          seboId: input.seboId,
          userId: ctx.userId!,
          rating: input.rating,
          comment: input.comment || null,
          isVisible: true,
        });
      }

      await logAuditEvent({
        actorUserId: ctx.userId,
        actorRole: ctx.role,
        action: "sebo.review.upsert",
        entityType: "sebo_review",
        entityId: `${input.seboId}:${ctx.userId}`,
        metadata: {
          seboId: input.seboId,
          rating: input.rating,
        },
      });

      return { success: true };
    }),

  adminListReviews: adminProcedure
    .input(
      z
        .object({
          seboId: z.number().optional(),
          limit: z.number().min(1).max(200).default(100),
        })
        .optional()
    )
    .query(async ({ input }) => {
      if (!featureFlags.reviews()) return [];
      const filters = [] as any[];
      if (input?.seboId) {
        filters.push(eq(seboReviews.seboId, input.seboId));
      }
      const where = filters.length ? and(...filters) : undefined;
      return await db
        .select({
          id: seboReviews.id,
          seboId: seboReviews.seboId,
          userId: seboReviews.userId,
          rating: seboReviews.rating,
          comment: seboReviews.comment,
          isVisible: seboReviews.isVisible,
          createdAt: seboReviews.createdAt,
          updatedAt: seboReviews.updatedAt,
          reviewerName: users.name,
          reviewerEmail: users.email,
          seboName: sebos.name,
        })
        .from(seboReviews)
        .leftJoin(users, eq(users.id, seboReviews.userId))
        .leftJoin(sebos, eq(sebos.id, seboReviews.seboId))
        .where(where)
        .orderBy(desc(seboReviews.updatedAt))
        .limit(input?.limit ?? 100);
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
        .set({
          isVisible: input.isVisible,
          updatedAt: new Date(),
        })
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

      await db.delete(seboReviews).where(eq(seboReviews.seboId, input.id));

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
