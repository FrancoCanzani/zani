CREATE TABLE `event_prop` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`site_id` text NOT NULL,
	`timestamp` integer NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`site_id`) REFERENCES `site`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `event_prop_eventId_idx` ON `event_prop` (`event_id`);--> statement-breakpoint
CREATE INDEX `event_prop_site_timestamp_idx` ON `event_prop` (`site_id`,`timestamp`);--> statement-breakpoint
CREATE INDEX `event_prop_site_key_idx` ON `event_prop` (`site_id`,`key`);--> statement-breakpoint
ALTER TABLE `event` ADD `referrer_path` text DEFAULT '' NOT NULL;