CREATE TABLE `estimate` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`public_slug` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`customer_name` text DEFAULT '' NOT NULL,
	`customer_phone` text,
	`customer_email` text,
	`currency` text DEFAULT 'usd' NOT NULL,
	`line_items` text NOT NULL,
	`deposit_percent` integer DEFAULT 30 NOT NULL,
	`notes` text,
	`created_by_user_id` text,
	`sent_at` integer,
	`viewed_at` integer,
	`accepted_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `estimate_public_slug_unique` ON `estimate` (`public_slug`);--> statement-breakpoint
CREATE INDEX `estimate_workspaceId_idx` ON `estimate` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `estimate_workspace_updated_idx` ON `estimate` (`workspace_id`,`updated_at`);