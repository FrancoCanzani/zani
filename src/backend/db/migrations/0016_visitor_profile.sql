DROP TABLE `vital`;--> statement-breakpoint
CREATE TABLE `visitor` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`anonymous_id` text NOT NULL,
	`user_id` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`first_path` text DEFAULT '' NOT NULL,
	`first_referrer_host` text DEFAULT '' NOT NULL,
	`first_referrer_path` text DEFAULT '' NOT NULL,
	`first_utm_source` text DEFAULT '' NOT NULL,
	`first_utm_medium` text DEFAULT '' NOT NULL,
	`first_utm_campaign` text DEFAULT '' NOT NULL,
	`first_utm_content` text DEFAULT '' NOT NULL,
	`first_utm_term` text DEFAULT '' NOT NULL,
	`first_seen_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`identified_at` integer,
	FOREIGN KEY (`site_id`) REFERENCES `site`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `visitor_site_anonymous_idx` ON `visitor` (`site_id`,`anonymous_id`);--> statement-breakpoint
CREATE INDEX `visitor_site_userId_idx` ON `visitor` (`site_id`,`user_id`);
