ALTER TABLE `link` RENAME COLUMN "code" TO "slug";--> statement-breakpoint
DROP INDEX `link_code_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `link_slug_unique` ON `link` (`slug`);