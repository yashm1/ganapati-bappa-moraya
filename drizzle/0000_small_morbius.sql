CREATE TABLE "crowd_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"pandal_id" text NOT NULL,
	"level" text NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pandals" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"area" text NOT NULL,
	"longitude" real NOT NULL,
	"latitude" real NOT NULL,
	"image_key" text NOT NULL,
	"image_url" text NOT NULL,
	"eco" boolean DEFAULT false NOT NULL,
	"crowd" text DEFAULT 'Moderate' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE INDEX "crowd_reports_pandal_time_idx" ON "crowd_reports" USING btree ("pandal_id","created_at");--> statement-breakpoint
CREATE INDEX "pandals_status_idx" ON "pandals" USING btree ("status");