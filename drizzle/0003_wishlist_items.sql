CREATE TABLE `wishlist_items` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `userId` integer NOT NULL,
  `title` text,
  `isbn` text,
  `createdAt` integer NOT NULL
);

CREATE INDEX `idx_wishlist_user` ON `wishlist_items` (`userId`);
CREATE INDEX `idx_wishlist_isbn` ON `wishlist_items` (`isbn`);
