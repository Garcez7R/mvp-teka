import { initTRPC } from "@trpc/server";
import type { Context } from "./context.js";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(async (opts) => {
  if (!opts.ctx.userId) {
    throw new Error("Not authenticated");
  }
  return opts.next({
    ctx: {
      ...opts.ctx,
      userId: opts.ctx.userId,
    },
  });
});
