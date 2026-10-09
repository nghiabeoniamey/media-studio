import type { Platform } from "./enums";
import type { PlatformMeta } from "./script";

/**
 * Video SEO + authenticity rules (docs/SEO_CONTENT.md). Platforms index the title, caption,
 * spoken words and on-screen text; monetization reviews reward original, non-templated work
 * and punish engagement bait. These checks run on every generated PlatformMeta.
 */

export const SEO_WRITING_RULES = [
  "Title: start with the searchable story or character name within the first 40 characters (e.g. 'Moses Strikes the Rock | Water in the Desert'), 40-70 characters total, sentence case, no ALL CAPS words, no clickbait or promises the video does not keep.",
  "The first spoken sentence and the first on-screen text must name the story or main character, because platforms index speech and on-screen text for search.",
  "Caption/description: first sentence says what happens and names the story and its scripture reference; then 2-3 sentences of context in your own words (setting, why it matters today); then the scripture citation with translation.",
  "Hashtags: 3-5 specific ones (story, character, theme, plus one broad tag such as #BibleStory). Never more than 5; at most 3 in a YouTube description.",
  "Never use engagement bait: do not ask viewers to type Amen, share to receive a blessing, prove their faith, or 'not scroll past'; no guilt, fear or threats.",
  "Every video must add original value: a retelling with historical or cultural context and a reflection question, never a bare reading of scripture over images.",
  "Mark imagined details honestly (e.g. 'as the story is often imagined') when depicting things scripture does not describe.",
  "End on a line that echoes the hook so the Short loops naturally.",
] as const;

/** Phrases that read as engagement bait (Meta and YouTube demote or demonetize them). */
export const ENGAGEMENT_BAIT: RegExp[] = [
  /\btype\s+["'“]?(amen|yes|i believe)\b/i,
  /\b(comment|write)\s+["'“]?(amen|yes)\b/i,
  /\bshare\s+(this|if|to\s+(be|receive))/i,
  /\blike\s+if\s+you\b/i,
  /\b1\s*like\s*=\s*1\b/i,
  /\b(don'?t|do\s+not)\s+(scroll|skip|ignore)\b/i,
  /\bscroll(ing)?\s+past\b/i,
  /\bignore\s+(this|god|jesus)\b/i,
  /\btag\s+(\d+|a\s+friend|someone|three)\b/i,
  /\bonly\s+true\s+(believers|christians)\b/i,
  /\b(god|jesus)\s+(is|will\s+be)\s+watching\b/i,
];

const CLICKBAIT = /\b(you\s+won'?t\s+believe|shocking|gone\s+wrong|must\s+watch|insane)\b/i;

export const PLATFORM_SEO = {
  youtube: { titleMax: 100, titleIdealMax: 70, keywordWithin: 40, descriptionHashtagsMax: 3, tagsCharsMax: 500 },
  facebook: { previewChars: 125, hashtagsMax: 5 },
  instagram: { previewChars: 125, hashtagsMax: 5 },
  tiktok: { previewChars: 125, hashtagsMax: 5 },
} as const;

export interface SeoIssue {
  platform: Platform;
  field: string;
  severity: "error" | "warn";
  message: string;
}

function hasKeyword(text: string, keyword: string, within?: number): boolean {
  const words = keyword.toLowerCase().split(/\s+/).filter(Boolean);
  const scope = (within ? text.slice(0, within) : text).toLowerCase();
  return words.length > 0 && words.every((w) => scope.includes(w));
}

function hashtagsIn(text: string): string[] {
  return text.match(/#[\p{L}\p{N}_]+/gu) ?? [];
}

function checkHashtags(platform: Platform, tags: string[], max: number, issues: SeoIssue[]): void {
  if (tags.length > max) issues.push({ platform, field: "hashtags", severity: "error", message: `${tags.length} hashtags; keep at most ${max}` });
  if (tags.length < 2) issues.push({ platform, field: "hashtags", severity: "warn", message: "use 3-5 specific hashtags" });
  const seen = new Set<string>();
  for (const t of tags) {
    const norm = t.replace(/^#/, "").toLowerCase();
    if (!/^[\p{L}\p{N}_]+$/u.test(norm)) issues.push({ platform, field: "hashtags", severity: "error", message: `invalid hashtag "${t}"` });
    if (seen.has(norm)) issues.push({ platform, field: "hashtags", severity: "warn", message: `duplicate hashtag "${t}"` });
    seen.add(norm);
  }
}

function checkBait(platform: Platform, field: string, text: string, issues: SeoIssue[]): void {
  for (const re of ENGAGEMENT_BAIT) {
    const m = re.exec(text);
    if (m) issues.push({ platform, field, severity: "error", message: `engagement bait: "${m[0]}"` });
  }
}

/**
 * Lint generated metadata. `primaryKeyword` is the searchable story name
 * (e.g. "Moses strikes the rock"); `scriptureRef` is the main passage, when there is one.
 */
export function lintPlatformMeta(meta: PlatformMeta, opts: { primaryKeyword: string; scriptureRef?: string | null }): SeoIssue[] {
  const issues: SeoIssue[] = [];
  const yt = meta.youtube;
  const lim = PLATFORM_SEO.youtube;

  if (yt.title.length > lim.titleMax) issues.push({ platform: "youtube", field: "title", severity: "error", message: `title is ${yt.title.length} chars (max ${lim.titleMax})` });
  else if (yt.title.length > lim.titleIdealMax) issues.push({ platform: "youtube", field: "title", severity: "warn", message: `title is ${yt.title.length} chars; aim for 40-${lim.titleIdealMax}` });
  if (!hasKeyword(yt.title, opts.primaryKeyword, lim.keywordWithin)) {
    issues.push({ platform: "youtube", field: "title", severity: "warn", message: `put "${opts.primaryKeyword}" in the first ${lim.keywordWithin} characters` });
  }
  if ((yt.title.match(/\b[A-Z]{4,}\b/g) ?? []).length > 0) issues.push({ platform: "youtube", field: "title", severity: "warn", message: "avoid ALL CAPS words" });
  if (CLICKBAIT.test(yt.title)) issues.push({ platform: "youtube", field: "title", severity: "warn", message: "clickbait wording" });
  if (hashtagsIn(yt.title).length > 0) issues.push({ platform: "youtube", field: "title", severity: "warn", message: "keep hashtags out of the title" });
  checkBait("youtube", "title", yt.title, issues);

  const firstLine = yt.description.split(/\n/)[0] ?? "";
  if (!hasKeyword(firstLine, opts.primaryKeyword)) issues.push({ platform: "youtube", field: "description", severity: "warn", message: "first line should name the story" });
  if (opts.scriptureRef && !yt.description.includes(opts.scriptureRef)) issues.push({ platform: "youtube", field: "description", severity: "warn", message: `cite ${opts.scriptureRef}` });
  const descTags = hashtagsIn(yt.description);
  if (descTags.length > lim.descriptionHashtagsMax) issues.push({ platform: "youtube", field: "description", severity: "warn", message: `${descTags.length} hashtags in the description; keep 1-${lim.descriptionHashtagsMax}` });
  if (descTags.length > 15) issues.push({ platform: "youtube", field: "description", severity: "error", message: "over 15 hashtags: YouTube ignores all of them" });
  checkBait("youtube", "description", yt.description, issues);
  const tagChars = yt.tags.join(",").length;
  if (tagChars > lim.tagsCharsMax) issues.push({ platform: "youtube", field: "tags", severity: "error", message: `tags total ${tagChars} chars (max ${lim.tagsCharsMax})` });

  for (const platform of ["facebook", "instagram", "tiktok"] as const) {
    const m = meta[platform];
    const p = PLATFORM_SEO[platform];
    if (!hasKeyword(m.caption, opts.primaryKeyword, p.previewChars)) {
      issues.push({ platform, field: "caption", severity: "warn", message: `name "${opts.primaryKeyword}" in the first ${p.previewChars} characters` });
    }
    checkBait(platform, "caption", m.caption, issues);
    checkHashtags(platform, m.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)), p.hashtagsMax, issues);
  }
  return issues;
}

export function hasBlockingSeoIssues(issues: SeoIssue[]): boolean {
  return issues.some((i) => i.severity === "error");
}

/**
 * YouTube description in the recommended order: keyword-led summary, context, scripture citation,
 * series link, a transparent production note, then at most 3 hashtags.
 */
export function buildYoutubeDescription(args: {
  summary: string;
  context: string;
  scripture: { ref: string; translation: string } | null;
  seriesName: string | null;
  callToAction: string | null;
  hashtags: string[];
}): string {
  const tags = args.hashtags
    .map((h) => (h.startsWith("#") ? h : `#${h}`))
    .filter((h, i, all) => all.findIndex((x) => x.toLowerCase() === h.toLowerCase()) === i)
    .slice(0, PLATFORM_SEO.youtube.descriptionHashtagsMax);
  return [
    args.summary.trim(),
    args.context.trim(),
    args.scripture ? `Scripture: ${args.scripture.ref} (${args.scripture.translation})` : null,
    args.seriesName ? `Part of our series "${args.seriesName}".` : null,
    args.callToAction?.trim() || null,
    "Visuals and narration are made with AI tools; every story is researched, written and reviewed by our team.",
    tags.join(" ") || null,
  ]
    .filter(Boolean)
    .join("\n\n");
}
