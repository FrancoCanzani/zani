CREATE TABLE `link` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`code` text NOT NULL,
	`destination_url` text NOT NULL,
	`name` text,
	`created_by_user_id` text,
	`disabled_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `link_code_unique` ON `link` (`code`);--> statement-breakpoint
CREATE INDEX `link_workspaceId_idx` ON `link` (`workspace_id`);--> statement-breakpoint
CREATE TABLE `click` (
	`id` text PRIMARY KEY NOT NULL,
	`link_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`country` text,
	`city` text,
	`region` text,
	`referrer_host` text NOT NULL,
	`device` text NOT NULL,
	`browser` text NOT NULL,
	`os` text NOT NULL,
	`bot` integer NOT NULL,
	FOREIGN KEY (`link_id`) REFERENCES `link`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `click_link_occurred_idx` ON `click` (`link_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `click_workspace_occurred_idx` ON `click` (`workspace_id`,`occurred_at`);
