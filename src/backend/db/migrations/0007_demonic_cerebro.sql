ALTER TABLE `estimate` RENAME TO `invoice`;--> statement-breakpoint
CREATE TABLE `product` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`unit_amount_cents` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'usd' NOT NULL,
	`archived_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `product_workspaceId_idx` ON `product` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `product_workspace_name_idx` ON `product` (`workspace_id`,`name`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_invoice` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`public_slug` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`number` text NOT NULL,
	`customer_id` text,
	`customer_name` text DEFAULT '' NOT NULL,
	`customer_phone` text,
	`customer_email` text,
	`customer_address` text,
	`customer_tax_id` text,
	`currency` text DEFAULT 'usd' NOT NULL,
	`issue_date` text NOT NULL,
	`due_date` text,
	`payment_terms` text,
	`notes` text,
	`tax_name` text,
	`tax_rate_bps` integer DEFAULT 0 NOT NULL,
	`tax_inclusive` integer DEFAULT false NOT NULL,
	`line_items` text NOT NULL,
	`amount_paid_cents` integer DEFAULT 0 NOT NULL,
	`created_by_user_id` text,
	`sent_at` integer,
	`paid_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_invoice`("id", "workspace_id", "public_slug", "status", "number", "customer_id", "customer_name", "customer_phone", "customer_email", "customer_address", "customer_tax_id", "currency", "issue_date", "due_date", "payment_terms", "notes", "tax_name", "tax_rate_bps", "tax_inclusive", "line_items", "amount_paid_cents", "created_by_user_id", "sent_at", "paid_at", "created_at", "updated_at") SELECT "id", "workspace_id", "public_slug", "status", "number", "customer_id", "customer_name", "customer_phone", "customer_email", "customer_address", "customer_tax_id", "currency", "issue_date", "due_date", "payment_terms", "notes", "tax_name", "tax_rate_bps", "tax_inclusive", "line_items", "amount_paid_cents", "created_by_user_id", "sent_at", "paid_at", "created_at", "updated_at" FROM `invoice`;--> statement-breakpoint
DROP TABLE `invoice`;--> statement-breakpoint
ALTER TABLE `__new_invoice` RENAME TO `invoice`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `invoice_public_slug_unique` ON `invoice` (`public_slug`);--> statement-breakpoint
CREATE INDEX `invoice_workspaceId_idx` ON `invoice` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `invoice_workspace_updated_idx` ON `invoice` (`workspace_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `invoice_customerId_idx` ON `invoice` (`customer_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `invoice_workspace_number_idx` ON `invoice` (`workspace_id`,`number`);--> statement-breakpoint
ALTER TABLE `customer` ADD `address` text;--> statement-breakpoint
ALTER TABLE `customer` ADD `tax_id` text;--> statement-breakpoint
ALTER TABLE `workspace` ADD `default_currency` text DEFAULT 'usd' NOT NULL;--> statement-breakpoint
ALTER TABLE `workspace` ADD `invoice_number_prefix` text DEFAULT 'INV-' NOT NULL;--> statement-breakpoint
ALTER TABLE `workspace` ADD `next_invoice_number` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `workspace` ADD `default_payment_terms` text;--> statement-breakpoint
ALTER TABLE `workspace` ADD `default_tax_name` text;--> statement-breakpoint
ALTER TABLE `workspace` ADD `default_tax_rate_bps` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `workspace` ADD `tax_inclusive` integer DEFAULT false NOT NULL;