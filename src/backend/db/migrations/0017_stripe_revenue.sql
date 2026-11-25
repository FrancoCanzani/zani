CREATE INDEX `visitor_site_email_idx` ON `visitor` (`site_id`,`email`);--> statement-breakpoint
CREATE TABLE `stripe_connection` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`stripe_account_id` text DEFAULT '' NOT NULL,
	`api_key_cipher` text NOT NULL,
	`webhook_secret_cipher` text NOT NULL,
	`livemode` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stripe_connection_workspace_id_unique` ON `stripe_connection` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `stripe_connection_workspaceId_idx` ON `stripe_connection` (`workspace_id`);--> statement-breakpoint
CREATE TABLE `stripe_customer` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`stripe_customer_id` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`metadata_user_id` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stripe_customer_workspace_stripe_idx` ON `stripe_customer` (`workspace_id`,`stripe_customer_id`);--> statement-breakpoint
CREATE INDEX `stripe_customer_workspace_email_idx` ON `stripe_customer` (`workspace_id`,`email`);--> statement-breakpoint
CREATE INDEX `stripe_customer_workspace_userId_idx` ON `stripe_customer` (`workspace_id`,`metadata_user_id`);--> statement-breakpoint
CREATE TABLE `stripe_subscription` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`stripe_subscription_id` text NOT NULL,
	`stripe_customer_id` text NOT NULL,
	`status` text NOT NULL,
	`mrr_cents` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'usd' NOT NULL,
	`interval` text DEFAULT '' NOT NULL,
	`cancel_at_period_end` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stripe_subscription_workspace_stripe_idx` ON `stripe_subscription` (`workspace_id`,`stripe_subscription_id`);--> statement-breakpoint
CREATE INDEX `stripe_subscription_workspace_customer_idx` ON `stripe_subscription` (`workspace_id`,`stripe_customer_id`);--> statement-breakpoint
CREATE INDEX `stripe_subscription_workspace_status_idx` ON `stripe_subscription` (`workspace_id`,`status`);
