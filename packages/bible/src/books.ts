/** Canonical books with the dataset's name and accepted spellings/abbreviations (lowercase, no dots). */
export interface BookInfo {
  id: string;
  name: string;
  /** Name used by the scrollmapper/bible_databases JSON. */
  datasetName: string;
  aliases: string[];
  deuterocanonical: boolean;
}

const B = (id: string, name: string, datasetName: string, aliases: string[], deuterocanonical = false): BookInfo => ({
  id,
  name,
  datasetName,
  aliases,
  deuterocanonical,
});

export const BOOKS: BookInfo[] = [
  B("GEN", "Genesis", "Genesis", ["gen", "ge", "gn"]),
  B("EXO", "Exodus", "Exodus", ["exod", "exo", "ex"]),
  B("LEV", "Leviticus", "Leviticus", ["lev", "lv"]),
  B("NUM", "Numbers", "Numbers", ["num", "nm", "nb"]),
  B("DEU", "Deuteronomy", "Deuteronomy", ["deut", "deu", "dt"]),
  B("JOS", "Joshua", "Joshua", ["josh", "jos", "jsh"]),
  B("JDG", "Judges", "Judges", ["judg", "jdg", "jg"]),
  B("RUT", "Ruth", "Ruth", ["rth", "ru"]),
  B("1SA", "1 Samuel", "I Samuel", ["1 sam", "1 sa", "1sam", "1 kingdoms"]),
  B("2SA", "2 Samuel", "II Samuel", ["2 sam", "2 sa", "2sam", "2 kingdoms"]),
  B("1KI", "1 Kings", "I Kings", ["1 kgs", "1 ki", "1kgs", "3 kings", "3 kingdoms"]),
  B("2KI", "2 Kings", "II Kings", ["2 kgs", "2 ki", "2kgs", "4 kings", "4 kingdoms"]),
  B("1CH", "1 Chronicles", "I Chronicles", ["1 chron", "1 chr", "1 ch", "1 paralipomenon"]),
  B("2CH", "2 Chronicles", "II Chronicles", ["2 chron", "2 chr", "2 ch", "2 paralipomenon"]),
  B("EZR", "Ezra", "Ezra", ["ezr"]),
  B("NEH", "Nehemiah", "Nehemiah", ["neh", "ne"]),
  B("TOB", "Tobit", "Tobit", ["tob", "tb", "tobias"], true),
  B("JDT", "Judith", "Judith", ["jdt", "jdth"], true),
  B("EST", "Esther", "Esther", ["esth", "est", "es"]),
  B("JOB", "Job", "Job", ["jb"]),
  B("PSA", "Psalms", "Psalms", ["psalm", "ps", "psa", "pss", "psalter"]),
  B("PRO", "Proverbs", "Proverbs", ["prov", "pro", "prv", "pr"]),
  B("ECC", "Ecclesiastes", "Ecclesiastes", ["eccl", "ecc", "qoheleth"]),
  B("SNG", "Song of Songs", "Song of Solomon", ["song of solomon", "song", "sos", "canticle of canticles", "canticles"]),
  B("WIS", "Wisdom", "Wisdom", ["wisdom of solomon", "wis", "ws"], true),
  B("SIR", "Sirach", "Sirach", ["ecclesiasticus", "sir", "ben sira"], true),
  B("ISA", "Isaiah", "Isaiah", ["isa", "is", "isaias"]),
  B("JER", "Jeremiah", "Jeremiah", ["jer", "je", "jeremias"]),
  B("LAM", "Lamentations", "Lamentations", ["lam", "la"]),
  B("BAR", "Baruch", "Baruch", ["bar"], true),
  B("EZK", "Ezekiel", "Ezekiel", ["ezek", "eze", "ezk", "ezechiel"]),
  B("DAN", "Daniel", "Daniel", ["dan", "dn", "da"]),
  B("HOS", "Hosea", "Hosea", ["hos", "osee"]),
  B("JOL", "Joel", "Joel", ["jl"]),
  B("AMO", "Amos", "Amos", ["am"]),
  B("OBA", "Obadiah", "Obadiah", ["obad", "ob", "abdias"]),
  B("JON", "Jonah", "Jonah", ["jon", "jonas"]),
  B("MIC", "Micah", "Micah", ["mic", "micheas"]),
  B("NAM", "Nahum", "Nahum", ["nah", "na"]),
  B("HAB", "Habakkuk", "Habakkuk", ["hab", "habacuc"]),
  B("ZEP", "Zephaniah", "Zephaniah", ["zeph", "zep", "sophonias"]),
  B("HAG", "Haggai", "Haggai", ["hag", "aggeus"]),
  B("ZEC", "Zechariah", "Zechariah", ["zech", "zec", "zacharias"]),
  B("MAL", "Malachi", "Malachi", ["mal", "malachias"]),
  B("1MA", "1 Maccabees", "I Maccabees", ["1 macc", "1 mac", "1 mc", "1 machabees"], true),
  B("2MA", "2 Maccabees", "II Maccabees", ["2 macc", "2 mac", "2 mc", "2 machabees"], true),
  B("MAT", "Matthew", "Matthew", ["matt", "mat", "mt"]),
  B("MRK", "Mark", "Mark", ["mrk", "mk", "mar"]),
  B("LUK", "Luke", "Luke", ["luk", "lk"]),
  B("JHN", "John", "John", ["jhn", "jn", "joh"]),
  B("ACT", "Acts", "Acts", ["acts of the apostles", "act", "ac"]),
  B("ROM", "Romans", "Romans", ["rom", "ro", "rm"]),
  B("1CO", "1 Corinthians", "I Corinthians", ["1 cor", "1 co", "1cor"]),
  B("2CO", "2 Corinthians", "II Corinthians", ["2 cor", "2 co", "2cor"]),
  B("GAL", "Galatians", "Galatians", ["gal", "ga"]),
  B("EPH", "Ephesians", "Ephesians", ["eph", "ephes"]),
  B("PHP", "Philippians", "Philippians", ["phil", "php", "pp"]),
  B("COL", "Colossians", "Colossians", ["col"]),
  B("1TH", "1 Thessalonians", "I Thessalonians", ["1 thess", "1 thes", "1 th"]),
  B("2TH", "2 Thessalonians", "II Thessalonians", ["2 thess", "2 thes", "2 th"]),
  B("1TI", "1 Timothy", "I Timothy", ["1 tim", "1 ti"]),
  B("2TI", "2 Timothy", "II Timothy", ["2 tim", "2 ti"]),
  B("TIT", "Titus", "Titus", ["tit"]),
  B("PHM", "Philemon", "Philemon", ["philem", "phm", "phlm"]),
  B("HEB", "Hebrews", "Hebrews", ["heb"]),
  B("JAS", "James", "James", ["jas", "jm"]),
  B("1PE", "1 Peter", "I Peter", ["1 pet", "1 pe", "1 pt"]),
  B("2PE", "2 Peter", "II Peter", ["2 pet", "2 pe", "2 pt"]),
  B("1JN", "1 John", "I John", ["1 jn", "1 jhn", "1 joh"]),
  B("2JN", "2 John", "II John", ["2 jn", "2 jhn", "2 joh"]),
  B("3JN", "3 John", "III John", ["3 jn", "3 jhn", "3 joh"]),
  B("JUD", "Jude", "Jude", ["jud", "jd"]),
  B("REV", "Revelation", "Revelation of John", ["revelation of john", "rev", "re", "apocalypse", "apoc", "revelations"]),
];

/** Lowercase, drop dots, unify dashes/spaces and leading ordinals (I/II/III, first/second/third, 1st). */
export function normalizeBookName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(iii|third|3rd)\s+/, "3 ")
    .replace(/^(ii|second|2nd)\s+/, "2 ")
    .replace(/^(i|first|1st)\s+/, "1 ")
    .replace(/^([123])(?=[a-z])/, "$1 ");
}

const LOOKUP = new Map<string, BookInfo>();
for (const b of BOOKS) {
  for (const key of [b.name, b.datasetName, b.id, ...b.aliases]) LOOKUP.set(normalizeBookName(key), b);
}

export function findBook(raw: string): BookInfo | null {
  return LOOKUP.get(normalizeBookName(raw)) ?? null;
}

export function bookById(id: string): BookInfo | null {
  return BOOKS.find((b) => b.id === id) ?? null;
}

export function bookByDatasetName(name: string): BookInfo | null {
  return BOOKS.find((b) => b.datasetName === name) ?? null;
}

/**
 * Hebrew (modern) psalm number → Vulgate number used by Douay-Rheims/CPDV.
 * Split psalms (Hebrew 116 and 147) depend on the verse; merged ones (9–10, 114–115) map to one.
 */
export function hebrewToVulgatePsalm(chapter: number, verse: number | null = null): number {
  if (chapter <= 8) return chapter;
  if (chapter === 9 || chapter === 10) return 9;
  if (chapter <= 113) return chapter - 1;
  if (chapter === 114 || chapter === 115) return 113;
  if (chapter === 116) return verse !== null && verse >= 10 ? 115 : 114;
  if (chapter <= 146) return chapter - 1;
  if (chapter === 147) return verse !== null && verse >= 12 ? 147 : 146;
  return chapter;
}
