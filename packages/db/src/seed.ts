import { and, eq } from "drizzle-orm";
import { BIBLE_NICHE_SETTINGS, BIBLE_SERIES_PRESETS, DEFAULT_BIBLE_CHARACTERS, MOCK_PROVIDERS, type NicheSettings } from "@media-studio/core";
import { createDb, type Database } from "./client";
import { characters, niches, series } from "./schema";

/**
 * Idempotently create the Bible niche with its series and default characters.
 * `mock: true` swaps every provider for the offline mocks (demo / CI).
 */
export async function seedBibleNiche(db: Database, opts: { mock?: boolean; slug?: string } = {}): Promise<string> {
  const slug = opts.slug ?? "bible-stories";
  const settings: NicheSettings = opts.mock ? { ...BIBLE_NICHE_SETTINGS, providers: MOCK_PROVIDERS, defaultVoice: { ...BIBLE_NICHE_SETTINGS.defaultVoice, provider: "mock", model: "mock-tts" } } : BIBLE_NICHE_SETTINGS;

  const [existing] = await db.select({ id: niches.id }).from(niches).where(eq(niches.slug, slug));
  const nicheId =
    existing?.id ??
    (
      await db
        .insert(niches)
        .values({ slug, name: "Daily Bible Stories", description: "Bible stories and Catholic faith, cinematic style", settings })
        .returning({ id: niches.id })
    )[0]!.id;

  for (const preset of BIBLE_SERIES_PRESETS) {
    const seriesSettings = opts.mock && preset.settings.voice ? { ...preset.settings, voice: { ...preset.settings.voice, provider: "mock", model: "mock-tts" } } : preset.settings;
    await db
      .insert(series)
      .values({ nicheId, slug: preset.slug, name: preset.name, settings: seriesSettings })
      .onConflictDoNothing({ target: [series.nicheId, series.slug] });
  }

  for (const c of DEFAULT_BIBLE_CHARACTERS) {
    const [found] = await db
      .select({ id: characters.id })
      .from(characters)
      .where(and(eq(characters.nicheId, nicheId), eq(characters.name, c.name)));
    if (!found) {
      await db.insert(characters).values({
        nicheId,
        name: c.name,
        aliases: [...c.aliases],
        appearance: c.appearance,
        wardrobe: c.wardrobe,
        isDefault: true,
      });
    }
  }
  return nicheId;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const handle = createDb();
  seedBibleNiche(handle.db, { mock: process.argv.includes("--mock") })
    .then((id) => console.log(`seeded niche ${id}`))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => handle.close());
}
