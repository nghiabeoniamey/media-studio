/**
 * Download public-domain corpora and normalize them to data/<CODE>.json:
 *   pnpm --filter @media-studio/bible fetch-data            # all translations
 *   pnpm --filter @media-studio/bible fetch-data BSB DRC    # selected
 * Source: github.com/scrollmapper/bible_databases (formats/json). Writes data/manifest.json with sha256.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { bookByDatasetName } from "../src/books";
import { TRANSLATIONS, dataDir, type Corpus } from "../src/corpus";

const SOURCE = "https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/json";

interface SourceJson {
  translation: string;
  books: { name: string; chapters: { chapter: number; verses: { verse: number; text: string }[] }[] }[];
}

function clean(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/\{[^}]*\}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeCorpus(code: string, name: string, src: SourceJson): Corpus {
  const books: Corpus["books"] = {};
  for (const b of src.books) {
    const info = bookByDatasetName(b.name);
    if (!info) continue; // apocrypha outside the Catholic canon (e.g. Prayer of Manasses, Laodiceans)
    const chapters: string[][] = [];
    for (const ch of b.chapters) {
      const verses: string[] = [];
      for (const v of ch.verses) verses[v.verse - 1] = clean(v.text);
      chapters[ch.chapter - 1] = Array.from(verses, (t) => t ?? "");
    }
    books[info.id] = Array.from(chapters, (c) => c ?? []);
  }
  return { code, name, books };
}

async function main() {
  const wanted = process.argv.slice(2).map((c) => c.toUpperCase());
  const targets = TRANSLATIONS.filter((t) => wanted.length === 0 || wanted.includes(t.code));
  const dir = dataDir();
  await mkdir(dir, { recursive: true });
  const manifestPath = join(dir, "manifest.json");
  const manifest: Record<string, { sha256: string; source: string; fetchedAt: string }> = JSON.parse(
    await readFile(manifestPath, "utf8").catch(() => "{}"),
  );

  for (const t of targets) {
    const url = `${SOURCE}/${t.code}.json`;
    process.stdout.write(`${t.code}: downloading ... `);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
    const raw = Buffer.from(await res.arrayBuffer());
    const sha256 = createHash("sha256").update(raw).digest("hex");
    const previous = manifest[t.code]?.sha256;
    if (previous && previous !== sha256) console.warn(`\n  warning: ${t.code} source changed since last fetch (${previous.slice(0, 12)} -> ${sha256.slice(0, 12)})`);
    const corpus = normalizeCorpus(t.code, t.name, JSON.parse(raw.toString("utf8")) as SourceJson);
    await writeFile(join(dir, `${t.code}.json`), JSON.stringify(corpus));
    manifest[t.code] = { sha256, source: url, fetchedAt: new Date().toISOString() };
    console.log(`${Object.keys(corpus.books).length} books`);
  }
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
