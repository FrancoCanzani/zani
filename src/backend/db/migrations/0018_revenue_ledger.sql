DROP TABLE `stripe_subscription`;--> statement-breakpoint
DROP TABLE `stripe_customer`;--> statement-breakpoint
DROP TABLE `stripe_connection`;--> statement-breakpoint
CREATE TABLE `visitor_identity` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`user_ref` text NOT NULL,
	`email_hash` text,
	`signed_up_at` integer NOT NULL,
	`country` text DEFAULT '' NOT NULL,
	`device` text DEFAULT '' NOT NULL,
	`first_source` text NOT NULL,
	`first_medium` text DEFAULT '' NOT NULL,
	`first_campaign` text DEFAULT '' NOT NULL,
	`first_referrer` text DEFAULT '' NOT NULL,
	`first_landing` text DEFAULT '' NOT NULL,
	`first_seen_at` integer NOT NULL,
	`last_source` text NOT NULL,
	`last_medium` text DEFAULT '' NOT NULL,
	`last_campaign` text DEFAULT '' NOT NULL,
	`last_referrer` text DEFAULT '' NOT NULL,
	`last_landing` text DEFAULT '' NOT NULL,
	`last_seen_at` integer NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `site`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `visitor_identity_site_user_idx` ON `visitor_identity` (`site_id`,`user_ref`);--> statement-breakpoint
CREATE INDEX `visitor_identity_site_email_idx` ON `visitor_identity` (`site_id`,`email_hash`);--> statement-breakpoint
CREATE INDEX `visitor_identity_site_signed_up_idx` ON `visitor_identity` (`site_id`,`signed_up_at`);--> statement-breakpoint
CREATE TABLE `mrr_snapshot` (
	`site_id` text NOT NULL,
	`source_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`subscription_id` text NOT NULL,
	`at` integer NOT NULL,
	`mrr` integer NOT NULL,
	`currency` text NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `site`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mrr_snapshot_site_source_idx` ON `mrr_snapshot` (`site_id`,`source_id`);--> statement-breakpoint
CREATE INDEX `mrr_snapshot_site_customer_idx` ON `mrr_snapshot` (`site_id`,`customer_id`);--> statement-breakpoint
CREATE TABLE `revenue_movement` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`kind` text NOT NULL,
	`amount` integer NOT NULL,
	`mrr_after` integer NOT NULL,
	`currency` text NOT NULL,
	`at` integer NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `site`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `revenue_movement_site_at_idx` ON `revenue_movement` (`site_id`,`at`);--> statement-breakpoint
CREATE INDEX `revenue_movement_site_customer_idx` ON `revenue_movement` (`site_id`,`customer_id`);--> statement-breakpoint
CREATE TABLE `stripe_connection` (
	`site_id` text PRIMARY KEY NOT NULL,
	`api_key_cipher` text NOT NULL,
	`api_key_hint` text NOT NULL,
	`webhook_secret_cipher` text,
	`livemode` integer NOT NULL,
	`sync_phase` text DEFAULT 'customers' NOT NULL,
	`sync_cursor` text,
	`synced_at` integer,
	`sync_error` text,
	`last_webhook_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `site`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `stripe_customer` (
	`site_id` text NOT NULL,
	`id` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`email_hash` text,
	`name` text DEFAULT '' NOT NULL,
	`user_ref` text,
	`identity_id` text,
	`currency` text DEFAULT '' NOT NULL,
	`mrr` integer DEFAULT 0 NOT NULL,
	`first_paid_at` integer,
	`churned_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `site`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`identity_id`) REFERENCES `visitor_identity`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stripe_customer_site_id_idx` ON `stripe_customer` (`site_id`,`id`);--> statement-breakpoint
CREATE INDEX `stripe_customer_site_identity_idx` ON `stripe_customer` (`site_id`,`identity_id`);--> statement-breakpoint
CREATE INDEX `stripe_customer_site_email_idx` ON `stripe_customer` (`site_id`,`email_hash`);--> statement-breakpoint
