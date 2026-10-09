CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"niche_id" uuid,
	"video_id" uuid,
	"kind" text NOT NULL,
	"role" text NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"duration_sec" real,
	"provider" text,
	"model" text,
	"prompt" text,
	"cost_usd" numeric(12, 4) DEFAULT 0 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assets_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "character_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"character_id" uuid NOT NULL,
	"view" text NOT NULL,
	"asset_id" uuid NOT NULL,
	"approved" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"niche_id" uuid NOT NULL,
	"name" text NOT NULL,
	"aliases" text[] DEFAULT '{}'::text[] NOT NULL,
	"appearance" text NOT NULL,
	"wardrobe" text DEFAULT '' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"source_asset_id" uuid,
	"sheet_status" text DEFAULT 'none' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"niche_id" uuid NOT NULL,
	"video_id" uuid,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"operation" text NOT NULL,
	"units" real NOT NULL,
	"unit_type" text NOT NULL,
	"cost_usd" numeric(12, 4) NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cost_ledger_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"niche_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"era" text DEFAULT '' NOT NULL,
	"reference_asset_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "music_tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"niche_id" uuid NOT NULL,
	"title" text NOT NULL,
	"mood" text NOT NULL,
	"asset_id" uuid NOT NULL,
	"duration_sec" real NOT NULL,
	"times_used" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "niche_members" (
	"niche_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "niches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"settings" jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "niches_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "platform_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"niche_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"handle" text NOT NULL,
	"connection" text DEFAULT 'manual' NOT NULL,
	"credentials_ref" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publish_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"niche_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"account_id" uuid,
	"scheduled_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'pending_manual' NOT NULL,
	"ai_disclosure" boolean DEFAULT true NOT NULL,
	"external_id" text,
	"external_url" text,
	"error" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"gate" text NOT NULL,
	"decision" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"shot_indexes" integer[] DEFAULT '{}'::integer[] NOT NULL,
	"reviewer_id" uuid,
	"channel" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scripts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"content" jsonb NOT NULL,
	"shot_list" jsonb NOT NULL,
	"author" text DEFAULT 'ai' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"niche_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"settings" jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"script_version" integer NOT NULL,
	"index" integer NOT NULL,
	"kind" text NOT NULL,
	"duration_sec" real NOT NULL,
	"start_sec" real,
	"spec" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"keyframe_asset_id" uuid,
	"clip_asset_id" uuid,
	"video_provider" text,
	"video_model" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"cost_usd" numeric(12, 4) DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"niche_id" uuid NOT NULL,
	"series_id" uuid NOT NULL,
	"input" jsonb NOT NULL,
	"title" text,
	"brief" jsonb,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"chat_id" text,
	"link_code" text,
	"link_code_expires_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "telegram_links_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "telegram_links_chat_id_unique" UNIQUE("chat_id"),
	CONSTRAINT "telegram_links_link_code_unique" UNIQUE("link_code")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'editor' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"niche_id" uuid NOT NULL,
	"series_id" uuid NOT NULL,
	"variant_group_id" uuid,
	"variant_label" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"strategy" text NOT NULL,
	"overrides" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"target_duration_sec" integer NOT NULL,
	"workflow_id" text,
	"estimate" jsonb,
	"actual_cost_usd" numeric(12, 4) DEFAULT 0 NOT NULL,
	"narration_asset_id" uuid,
	"music_asset_id" uuid,
	"word_timings" jsonb,
	"output_branded_asset_id" uuid,
	"output_clean_asset_id" uuid,
	"thumbnail_asset_id" uuid,
	"export_asset_id" uuid,
	"error" text,
	"approved_at" timestamp with time zone,
	"approved_by" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_niche_id_niches_id_fk" FOREIGN KEY ("niche_id") REFERENCES "public"."niches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_views" ADD CONSTRAINT "character_views_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_views" ADD CONSTRAINT "character_views_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_niche_id_niches_id_fk" FOREIGN KEY ("niche_id") REFERENCES "public"."niches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_source_asset_id_assets_id_fk" FOREIGN KEY ("source_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_ledger" ADD CONSTRAINT "cost_ledger_niche_id_niches_id_fk" FOREIGN KEY ("niche_id") REFERENCES "public"."niches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_ledger" ADD CONSTRAINT "cost_ledger_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_niche_id_niches_id_fk" FOREIGN KEY ("niche_id") REFERENCES "public"."niches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_reference_asset_id_assets_id_fk" FOREIGN KEY ("reference_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_tracks" ADD CONSTRAINT "music_tracks_niche_id_niches_id_fk" FOREIGN KEY ("niche_id") REFERENCES "public"."niches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_tracks" ADD CONSTRAINT "music_tracks_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "niche_members" ADD CONSTRAINT "niche_members_niche_id_niches_id_fk" FOREIGN KEY ("niche_id") REFERENCES "public"."niches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "niche_members" ADD CONSTRAINT "niche_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_accounts" ADD CONSTRAINT "platform_accounts_niche_id_niches_id_fk" FOREIGN KEY ("niche_id") REFERENCES "public"."niches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publish_jobs" ADD CONSTRAINT "publish_jobs_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publish_jobs" ADD CONSTRAINT "publish_jobs_niche_id_niches_id_fk" FOREIGN KEY ("niche_id") REFERENCES "public"."niches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publish_jobs" ADD CONSTRAINT "publish_jobs_account_id_platform_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."platform_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scripts" ADD CONSTRAINT "scripts_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series" ADD CONSTRAINT "series_niche_id_niches_id_fk" FOREIGN KEY ("niche_id") REFERENCES "public"."niches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shots" ADD CONSTRAINT "shots_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shots" ADD CONSTRAINT "shots_keyframe_asset_id_assets_id_fk" FOREIGN KEY ("keyframe_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shots" ADD CONSTRAINT "shots_clip_asset_id_assets_id_fk" FOREIGN KEY ("clip_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_niche_id_niches_id_fk" FOREIGN KEY ("niche_id") REFERENCES "public"."niches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_links" ADD CONSTRAINT "telegram_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_niche_id_niches_id_fk" FOREIGN KEY ("niche_id") REFERENCES "public"."niches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_narration_asset_id_assets_id_fk" FOREIGN KEY ("narration_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_music_asset_id_assets_id_fk" FOREIGN KEY ("music_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_output_branded_asset_id_assets_id_fk" FOREIGN KEY ("output_branded_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_output_clean_asset_id_assets_id_fk" FOREIGN KEY ("output_clean_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_thumbnail_asset_id_assets_id_fk" FOREIGN KEY ("thumbnail_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_export_asset_id_assets_id_fk" FOREIGN KEY ("export_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assets_video_idx" ON "assets" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "assets_niche_role_idx" ON "assets" USING btree ("niche_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "character_views_char_view" ON "character_views" USING btree ("character_id","view");--> statement-breakpoint
CREATE UNIQUE INDEX "characters_niche_name" ON "characters" USING btree ("niche_id","name");--> statement-breakpoint
CREATE INDEX "cost_ledger_niche_created_idx" ON "cost_ledger" USING btree ("niche_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "locations_niche_name" ON "locations" USING btree ("niche_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "niche_members_pk" ON "niche_members" USING btree ("niche_id","user_id");--> statement-breakpoint
CREATE INDEX "publish_jobs_due_idx" ON "publish_jobs" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE UNIQUE INDEX "publish_jobs_video_platform" ON "publish_jobs" USING btree ("video_id","platform");--> statement-breakpoint
CREATE INDEX "reviews_video_idx" ON "reviews" USING btree ("video_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scripts_video_version" ON "scripts" USING btree ("video_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "series_niche_slug" ON "series" USING btree ("niche_id","slug");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shots_video_version_index" ON "shots" USING btree ("video_id","script_version","index");--> statement-breakpoint
CREATE INDEX "stories_niche_idx" ON "stories" USING btree ("niche_id");--> statement-breakpoint
CREATE INDEX "videos_niche_status_idx" ON "videos" USING btree ("niche_id","status");--> statement-breakpoint
CREATE INDEX "videos_variant_group_idx" ON "videos" USING btree ("variant_group_id");