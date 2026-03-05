import { router } from "./_utils/trpc.js";
import { authRouter } from "./auth.js";
import { booksRouter } from "./books.js";
import { sebosRouter } from "./sebos.js";
import { usersRouter } from "./users.js";
import { favoritesRouter } from "./favorites.js";

export const appRouter = router({
  auth: authRouter,
  books: booksRouter,
  sebos: sebosRouter,
  users: usersRouter,
  favorites: favoritesRouter,
});

export type AppRouter = typeof appRouter;
