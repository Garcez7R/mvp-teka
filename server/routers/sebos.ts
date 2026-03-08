import { z } from "zod";
import { router, publicProcedure, protectedProcedure, adminProcedure } from "./_utils/trpc.js";
import { db } from "./_utils/db.js";
import { sebos, books, users, favorites, bookInterests } from "../_schema.ts";
import { eq, inArray } from "drizzle-orm";
import { logAuditEvent } from "./_utils/audit.js";

const HIDDEN_MARKER = /^\[HIDDEN\]\s*/i;
const STATUS_MARKER = /^\[STATUS:(ATIVO|RESERVADO|VENDIDO)\]\s*/i;
type AvailabilityStatus = "ativo" | "reservado" | "vendido";

const seboPublicSelect = {
  id: sebos.id,
  name: sebos.name,
  description: sebos.description,
  logoUrl: sebos.logoUrl,
  whatsapp: sebos.whatsapp,
  city: sebos.city,
  state: sebos.state,
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
    return await db.select(seboPublicSelect).from(sebos);
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
        description: sebo.description,
        logoUrl: sebo.logoUrl,
        whatsapp: sebo.whatsapp,
        city: sebo.city,
        state: sebo.state,
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
