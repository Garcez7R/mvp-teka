import { initTRPC } from "@trpc/server";
import type { Context } from "./context.js";
import { TRPCError } from "@trpc/server";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(async (opts) => {
  if (!opts.ctx.userId || !opts.ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
  return opts.next({
    ctx: {
      ...opts.ctx,
      userId: opts.ctx.userId,
      user: opts.ctx.user,
      role: opts.ctx.role,
    },
  });
});

export const livreiroProcedure = protectedProcedure.use(async (opts) => {
  if (opts.ctx.role !== "livreiro" && opts.ctx.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only livreiros can perform this action" });
  }
  return opts.next();
});

export const adminProcedure = protectedProcedure.use(async (opts) => {
  if (opts.ctx.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
  }
  return opts.next();
});
