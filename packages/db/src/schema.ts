import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type {
  AssetKind,
  AssetRole,
  NicheSettings,
  Platform,
  PlatformConnection,
  ProductionStrategy,
  PublishStatus,
  ReviewChannel,
  ReviewDecision,
  ReviewGate,
  Script,
  SeriesSettings,
  ShotKind,
  ShotList,
  ShotSpec,
  ShotStatus,
  StoryBrief,
  StoryInput,
  UserRole,
  VideoStatus,
  ModelRef,
  CostEstimate,
  WordTiming,
} from "@media-studio/core";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
/** USD amounts as numeric(12,4), mapped to JS numbers. */
const money = (name: string) => numeric(name, { precision: 12, scale: 4, mode: "number" });

// ---------- auth ----------

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").$type<UserRole>().notNull().default("editor"),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const sessions = pgTable(
  "sessions",
  {
    /** sha256 of the session token; the raw token only lives in the cookie. */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/** Editors only see niches they are assigned to; admins see all. */
export const nicheMembers = pgTable(
  "niche_members",
  {
    nicheId: uuid("niche_id")
      .notNull()
      .references(() => niches.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("niche_members_pk").on(t.nicheId, t.userId)],
);

export const telegramLinks = pgTable("telegram_links", {
  id: id(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  chatId: text("chat_id").notNull().unique(),
  /** One-time code the user sends to the bot to link their chat. */
  linkCode: text("link_code"),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

// ---------- configuration ----------

export const niches = pgTable("niches", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  settings: jsonb("settings").$type<NicheSettings>().notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const series = pgTable(
  "series",
  {
    id: id(),
    nicheId: uuid("niche_id")
      .notNull()
      .references(() => niches.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    settings: jsonb("settings").$type<SeriesSettings>().notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("series_niche_slug").on(t.nicheId, t.slug)],
);

export const characters = pgTable(
  "characters",
  {
    id: id(),
    nicheId: uuid("niche_id")
      .notNull()
      .references(() => niches.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    aliases: text("aliases").array().notNull().default(sql`'{}'::text[]`),
    appearance: text("appearance").notNull(),
    wardrobe: text("wardrobe").notNull().default(""),
    /** Default characters are always available to the planner for this niche. */
    isDefault: boolean("is_default").notNull().default(false),
    /** User-uploaded image the sheet is derived from (AI/illustrated characters only). */
    sourceAssetId: uuid("source_asset_id").references(() => assets.id, { onDelete: "set null" }),
    sheetStatus: text("sheet_status").$type<"none" | "generating" | "ready" | "failed">().notNull().default("none"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("characters_niche_name").on(t.nicheId, t.name)],
);

export const characterViews = pgTable(
  "character_views",
  {
    id: id(),
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    view: text("view").notNull(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    approved: boolean("approved").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("character_views_char_view").on(t.characterId, t.view)],
);

export const locations = pgTable(
  "locations",
  {
    id: id(),
    nicheId: uuid("niche_id")
      .notNull()
      .references(() => niches.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull(),
    era: text("era").notNull().default(""),
    referenceAssetId: uuid("reference_asset_id").references(() => assets.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("locations_niche_name").on(t.nicheId, t.name)],
);

export const musicTracks = pgTable("music_tracks", {
  id: id(),
  nicheId: uuid("niche_id")
    .notNull()
    .references(() => niches.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  mood: text("mood").notNull(),
  assetId: uuid("asset_id")
    .notNull()
    .references(() => assets.id, { onDelete: "cascade" }),
  durationSec: real("duration_sec").notNull(),
  timesUsed: integer("times_used").notNull().default(0),
  createdAt: createdAt(),
});

export const platformAccounts = pgTable("platform_accounts", {
  id: id(),
  nicheId: uuid("niche_id")
    .notNull()
    .references(() => niches.id, { onDelete: "cascade" }),
  platform: text("platform").$type<Platform>().notNull(),
  handle: text("handle").notNull(),
  connection: text("connection").$type<PlatformConnection>().notNull().default("manual"),
  /** Name of the env var / secret holding credentials. Never store tokens in plain columns. */
  credentialsRef: text("credentials_ref"),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

// ---------- production ----------

export const assets = pgTable(
  "assets",
  {
    id: id(),
    nicheId: uuid("niche_id").references(() => niches.id, { onDelete: "cascade" }),
    videoId: uuid("video_id"),
    kind: text("kind").$type<AssetKind>().notNull(),
    role: text("role").$type<AssetRole>().notNull(),
    /** Object-storage key (R2/S3) or local path under STORAGE_DIR. */
    storageKey: text("storage_key").notNull().unique(),
    mimeType: text("mime_type").notNull(),
    bytes: integer("bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    durationSec: real("duration_sec"),
    provider: text("provider"),
    model: text("model"),
    prompt: text("prompt"),
    costUsd: money("cost_usd").notNull().default(0),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("assets_video_idx").on(t.videoId), index("assets_niche_role_idx").on(t.nicheId, t.role)],
);

export const stories = pgTable(
  "stories",
  {
    id: id(),
    nicheId: uuid("niche_id")
      .notNull()
      .references(() => niches.id, { onDelete: "cascade" }),
    seriesId: uuid("series_id")
      .notNull()
      .references(() => series.id, { onDelete: "restrict" }),
    input: jsonb("input").$type<StoryInput>().notNull(),
    title: text("title"),
    brief: jsonb("brief").$type<StoryBrief>(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("stories_niche_idx").on(t.nicheId)],
);

export const videos = pgTable(
  "videos",
  {
    id: id(),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    nicheId: uuid("niche_id")
      .notNull()
      .references(() => niches.id, { onDelete: "cascade" }),
    seriesId: uuid("series_id")
      .notNull()
      .references(() => series.id, { onDelete: "restrict" }),
    /** Videos produced from the same story for an A/B comparison share a group id. */
    variantGroupId: uuid("variant_group_id"),
    variantLabel: text("variant_label"),
    status: text("status").$type<VideoStatus>().notNull().default("draft"),
    strategy: text("strategy").$type<ProductionStrategy>().notNull(),
    /** Per-video overrides on top of the niche settings (e.g. a different video model for A/B). */
    overrides: jsonb("overrides")
      .$type<{ video?: { primary: ModelRef; resolution?: string }; llm?: ModelRef }>()
      .notNull()
      .default({}),
    targetDurationSec: integer("target_duration_sec").notNull(),
    workflowId: text("workflow_id"),
    estimate: jsonb("estimate").$type<CostEstimate>(),
    actualCostUsd: money("actual_cost_usd").notNull().default(0),
    narrationAssetId: uuid("narration_asset_id").references(() => assets.id, { onDelete: "set null" }),
    musicAssetId: uuid("music_asset_id").references(() => assets.id, { onDelete: "set null" }),
    wordTimings: jsonb("word_timings").$type<WordTiming[]>(),
    outputBrandedAssetId: uuid("output_branded_asset_id").references(() => assets.id, { onDelete: "set null" }),
    outputCleanAssetId: uuid("output_clean_asset_id").references(() => assets.id, { onDelete: "set null" }),
    thumbnailAssetId: uuid("thumbnail_asset_id").references(() => assets.id, { onDelete: "set null" }),
    exportAssetId: uuid("export_asset_id").references(() => assets.id, { onDelete: "set null" }),
    error: text("error"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("videos_niche_status_idx").on(t.nicheId, t.status),
    index("videos_variant_group_idx").on(t.variantGroupId),
  ],
);

export const scripts = pgTable(
  "scripts",
  {
    id: id(),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    content: jsonb("content").$type<Script>().notNull(),
    shotList: jsonb("shot_list").$type<ShotList>().notNull(),
    /** "ai" or the editing user's id. */
    author: text("author").notNull().default("ai"),
    notes: text("notes"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("scripts_video_version").on(t.videoId, t.version)],
);

export const shots = pgTable(
  "shots",
  {
    id: id(),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    scriptVersion: integer("script_version").notNull(),
    index: integer("index").notNull(),
    kind: text("kind").$type<ShotKind>().notNull(),
    durationSec: real("duration_sec").notNull(),
    startSec: real("start_sec"),
    spec: jsonb("spec").$type<ShotSpec>().notNull(),
    status: text("status").$type<ShotStatus>().notNull().default("pending"),
    keyframeAssetId: uuid("keyframe_asset_id").references(() => assets.id, { onDelete: "set null" }),
    clipAssetId: uuid("clip_asset_id").references(() => assets.id, { onDelete: "set null" }),
    videoProvider: text("video_provider"),
    videoModel: text("video_model"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    costUsd: money("cost_usd").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("shots_video_version_index").on(t.videoId, t.scriptVersion, t.index)],
);

export const reviews = pgTable(
  "reviews",
  {
    id: id(),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    gate: text("gate").$type<ReviewGate>().notNull(),
    decision: text("decision").$type<ReviewDecision>().notNull(),
    notes: text("notes").notNull().default(""),
    /** Shots to regenerate when decision = regenerate_shots. */
    shotIndexes: integer("shot_indexes").array().notNull().default(sql`'{}'::integer[]`),
    reviewerId: uuid("reviewer_id").references(() => users.id, { onDelete: "set null" }),
    channel: text("channel").$type<ReviewChannel>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("reviews_video_idx").on(t.videoId)],
);

export const publishJobs = pgTable(
  "publish_jobs",
  {
    id: id(),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    nicheId: uuid("niche_id")
      .notNull()
      .references(() => niches.id, { onDelete: "cascade" }),
    platform: text("platform").$type<Platform>().notNull(),
    accountId: uuid("account_id").references(() => platformAccounts.id, { onDelete: "set null" }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    status: text("status").$type<PublishStatus>().notNull().default("pending_manual"),
    /** Always true for AI-generated videos (is_ai_generated / containsSyntheticMedia / is_aigc). */
    aiDisclosure: boolean("ai_disclosure").notNull().default(true),
    externalId: text("external_id"),
    externalUrl: text("external_url"),
    error: text("error"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("publish_jobs_due_idx").on(t.status, t.scheduledAt),
    uniqueIndex("publish_jobs_video_platform").on(t.videoId, t.platform),
  ],
);

export const costLedger = pgTable(
  "cost_ledger",
  {
    id: id(),
    nicheId: uuid("niche_id")
      .notNull()
      .references(() => niches.id, { onDelete: "cascade" }),
    videoId: uuid("video_id").references(() => videos.id, { onDelete: "set null" }),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    operation: text("operation").notNull(),
    units: real("units").notNull(),
    unitType: text("unit_type").notNull(),
    costUsd: money("cost_usd").notNull(),
    /** Idempotency key so a retried workflow step never double-books a charge. */
    idempotencyKey: text("idempotency_key").notNull().unique(),
    createdAt: createdAt(),
  },
  (t) => [index("cost_ledger_niche_created_idx").on(t.nicheId, t.createdAt)],
);

// ---------- relations ----------

export const nichesRelations = relations(niches, ({ many }) => ({
  series: many(series),
  characters: many(characters),
  locations: many(locations),
  videos: many(videos),
}));

export const seriesRelations = relations(series, ({ one }) => ({
  niche: one(niches, { fields: [series.nicheId], references: [niches.id] }),
}));

export const charactersRelations = relations(characters, ({ one, many }) => ({
  niche: one(niches, { fields: [characters.nicheId], references: [niches.id] }),
  views: many(characterViews),
}));

export const characterViewsRelations = relations(characterViews, ({ one }) => ({
  character: one(characters, { fields: [characterViews.characterId], references: [characters.id] }),
  asset: one(assets, { fields: [characterViews.assetId], references: [assets.id] }),
}));

export const locationsRelations = relations(locations, ({ one }) => ({
  niche: one(niches, { fields: [locations.nicheId], references: [niches.id] }),
}));

export const storiesRelations = relations(stories, ({ one, many }) => ({
  niche: one(niches, { fields: [stories.nicheId], references: [niches.id] }),
  series: one(series, { fields: [stories.seriesId], references: [series.id] }),
  videos: many(videos),
}));

export const videosRelations = relations(videos, ({ one, many }) => ({
  story: one(stories, { fields: [videos.storyId], references: [stories.id] }),
  niche: one(niches, { fields: [videos.nicheId], references: [niches.id] }),
  series: one(series, { fields: [videos.seriesId], references: [series.id] }),
  scripts: many(scripts),
  shots: many(shots),
  reviews: many(reviews),
  publishJobs: many(publishJobs),
}));

export const scriptsRelations = relations(scripts, ({ one }) => ({
  video: one(videos, { fields: [scripts.videoId], references: [videos.id] }),
}));

export const shotsRelations = relations(shots, ({ one }) => ({
  video: one(videos, { fields: [shots.videoId], references: [videos.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  video: one(videos, { fields: [reviews.videoId], references: [videos.id] }),
}));

export const publishJobsRelations = relations(publishJobs, ({ one }) => ({
  video: one(videos, { fields: [publishJobs.videoId], references: [videos.id] }),
}));
