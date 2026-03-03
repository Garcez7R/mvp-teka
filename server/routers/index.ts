import { router } from "./_utils/trpc.js";
import { booksRouter } from "./books.js";
import { sebosRouter } from "./sebos.js";
import { usersRouter } from "./users.js";
import { favoritesRouter } from "./favorites.js";
import { uploadRouter } from "./upload.js";

export const appRouter = router({
  books: booksRouter,
  sebos: sebosRouter,
  users: usersRouter,
  favorites: favoritesRouter,
  upload: uploadRouter,
});

export type AppRouter = typeof appRouter;
