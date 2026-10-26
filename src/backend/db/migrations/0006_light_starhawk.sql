CREATE TABLE `customer` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`email` text,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `customer_workspaceId_idx` ON `customer` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `customer_workspace_name_idx` ON `customer` (`workspace_id`,`name`);--> statement-breakpoint
ALTER TABLE `estimate` ADD `customer_id` text REFERENCES customer(id);--> statement-breakpoint
CREATE INDEX `estimate_customerId_idx` ON `estimate` (`customer_id`);