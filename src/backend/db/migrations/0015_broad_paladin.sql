CREATE TABLE `vital` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`timestamp` integer NOT NULL,
	`metric` text NOT NULL,
	`value` real NOT NULL,
	`rating` text NOT NULL,
	`path` text NOT NULL,
	`element` text DEFAULT '' NOT NULL,
	`nav_type` text DEFAULT '' NOT NULL,
	`visitor_id` text NOT NULL,
	`session_id` text NOT NULL,
	`country` text DEFAULT '' NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`browser` text DEFAULT '' NOT NULL,
	`device` text DEFAULT '' NOT NULL,
	`os` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `site`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `vital_site_timestamp_idx` ON `vital` (`site_id`,`timestamp`);--> statement-breakpoint
CREATE INDEX `vital_site_metric_timestamp_idx` ON `vital` (`site_id`,`metric`,`timestamp`);