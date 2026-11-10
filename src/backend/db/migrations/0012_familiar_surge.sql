DROP TABLE `invoice`;
--> statement-breakpoint
DROP TABLE `product`;
--> statement-breakpoint
DROP TABLE `customer`;
--> statement-breakpoint
CREATE TABLE `site` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`domain` text NOT NULL,
	`write_key_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`revoked_at` integer,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `site_write_key_hash_unique` ON `site` (`write_key_hash`);
--> statement-breakpoint
CREATE INDEX `site_workspaceId_idx` ON `site` (`workspace_id`);
--> statement-breakpoint
CREATE TABLE `event` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`timestamp` integer NOT NULL,
	`name` text NOT NULL,
	`visitor_id` text NOT NULL,
	`session_id` text NOT NULL,
	`path` text NOT NULL,
	`referrer_host` text DEFAULT '' NOT NULL,
	`country` text DEFAULT '' NOT NULL,
	`browser` text DEFAULT '' NOT NULL,
	`device` text DEFAULT '' NOT NULL,
	`utm_source` text DEFAULT '' NOT NULL,
	`utm_medium` text DEFAULT '' NOT NULL,
	`utm_campaign` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `site`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `event_site_timestamp_idx` ON `event` (`site_id`,`timestamp`);
--> statement-breakpoint
ALTER TABLE `workspace` DROP COLUMN `email`;
--> statement-breakpoint
ALTER TABLE `workspace` DROP COLUMN `phone`;
--> statement-breakpoint
ALTER TABLE `workspace` DROP COLUMN `address`;
--> statement-breakpoint
ALTER TABLE `workspace` DROP COLUMN `tax_id`;
--> statement-breakpoint
ALTER TABLE `workspace` DROP COLUMN `default_currency`;
--> statement-breakpoint
ALTER TABLE `workspace` DROP COLUMN `invoice_number_prefix`;
--> statement-breakpoint
ALTER TABLE `workspace` DROP COLUMN `next_invoice_number`;
--> statement-breakpoint
ALTER TABLE `workspace` DROP COLUMN `default_payment_terms`;
--> statement-breakpoint
ALTER TABLE `workspace` DROP COLUMN `default_tax_name`;
--> statement-breakpoint
ALTER TABLE `workspace` DROP COLUMN `default_tax_rate_bps`;
--> statement-breakpoint
ALTER TABLE `workspace` DROP COLUMN `tax_inclusive`;
--> statement-breakpoint
ALTER TABLE `workspace` DROP COLUMN `details_skipped_at`;
