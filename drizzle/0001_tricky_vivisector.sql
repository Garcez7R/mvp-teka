CREATE TABLE `books` (
	`id` int AUTO_INCREMENT NOT NULL,
	`seboId` int NOT NULL,
	`title` text NOT NULL,
	`author` text,
	`isbn` varchar(20),
	`category` varchar(100),
	`description` text,
	`price` decimal(10,2) NOT NULL,
	`condition` enum('Excelente','Bom estado','Usado','Desgastado') DEFAULT 'Bom estado',
	`pages` int,
	`year` int,
	`coverUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `books_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bookId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `favorites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sebos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`whatsapp` varchar(20) NOT NULL,
	`city` varchar(100),
	`state` varchar(2),
	`verified` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sebos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','livreiro','comprador') NOT NULL DEFAULT 'comprador';