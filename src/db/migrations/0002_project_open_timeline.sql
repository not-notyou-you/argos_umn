CREATE TYPE "public"."timeline_request_kind" AS ENUM('status', 'dates');--> statement-breakpoint
CREATE TYPE "public"."timeline_status" AS ENUM('not_yet', 'done');--> statement-breakpoint
CREATE TABLE "project_timeline_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" timeline_status DEFAULT 'not_yet' NOT NULL,
	"completed_at" date,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "timeline_dates" CHECK ("project_timeline_items"."end_date" >= "project_timeline_items"."start_date")
);
--> statement-breakpoint
CREATE TABLE "timeline_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"kind" timeline_request_kind NOT NULL,
	"proposed_status" timeline_status,
	"proposed_start" date,
	"proposed_end" date,
	"note" text DEFAULT '' NOT NULL,
	"evidence_url" text,
	"status" "request_status" DEFAULT 'pending' NOT NULL,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"decision_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "timeline_request_payload" CHECK (("timeline_requests"."kind" = 'status' and "timeline_requests"."proposed_status" is not null) or ("timeline_requests"."kind" = 'dates' and "timeline_requests"."proposed_start" is not null and "timeline_requests"."proposed_end" >= "timeline_requests"."proposed_start"))
);
--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "status" SET DEFAULT 'on_progress'::text;--> statement-breakpoint
DROP TYPE "public"."project_status";--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('open', 'on_progress', 'done', 'cancelled');--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "status" SET DEFAULT 'on_progress'::"public"."project_status";--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "status" SET DATA TYPE "public"."project_status" USING "status"::"public"."project_status";--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "registration_open" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "registration_url" text;--> statement-breakpoint
ALTER TABLE "project_timeline_items" ADD CONSTRAINT "project_timeline_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_requests" ADD CONSTRAINT "timeline_requests_item_id_project_timeline_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."project_timeline_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_requests" ADD CONSTRAINT "timeline_requests_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_requests" ADD CONSTRAINT "timeline_requests_decided_by_accounts_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "timeline_project_idx" ON "project_timeline_items" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "timeline_request_pending" ON "timeline_requests" USING btree ("item_id","member_id","kind") WHERE "timeline_requests"."status" = 'pending';