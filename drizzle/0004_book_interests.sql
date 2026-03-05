CREATE TABLE `book_interests` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `userId` integer NOT NULL,
  `bookId` integer NOT NULL,
  `createdAt` integer NOT NULL
);

CREATE UNIQUE INDEX `idx_book_interests_user_book` ON `book_interests` (`userId`, `bookId`);
CREATE INDEX `idx_book_interests_book` ON `book_interests` (`bookId`);
