import {
  countWords,
  formatScriptureRef,
  validateShotList,
  type BeatPurpose,
  type BriefCharacter,
  type BriefLocation,
  type CameraAngle,
  type CameraMovement,
  type KeyframeQa,
  type KeyframeQaContext,
  type Lens,
  type PolicyCheck,
  type PolicyCheckContext,
  type Script,
  type ScriptBeat,
  type ScriptContext,
  type ScriptureRef,
  type SensitiveFlag,
  type ShotCharacter,
  type ShotList,
  type ShotListContext,
  type ShotSize,
  type ShotSpec,
  type StoryBrief,
  type StoryBriefContext,
  type StoryInput,
  type TimeOfDay,
} from "@media-studio/core";
import { hash32, pick, titleCase } from "./util";

/*
 * Deterministic stand-ins for the LLM stages. They read the <context> block and return
 * schema-valid objects that reference the real inputs (characters, locations, scripture),
 * so the whole pipeline can run offline and its outputs stay recognisable in the UI.
 */

// ---------------------------------------------------------------- StoryBrief

const NOT_NAMES = new Set(
  (
    "The A An And But Then When So He She They It His Her Their Its Him We You I In On At Of For With From To By As " +
    "This That These Those Now Behold Yes No Not Who What Why How Where After Before While Because If Or Nor Yet " +
    "God Lord LORD Jesus Christ Spirit Holy Heaven Israel Israelites Bible Story Stories Gospel King Queen Sea Red River Mount " +
    "Valley Lake Day Night Book Chapter Verse Psalm Amen Hallelujah Father Son Daughter Mother Brother Sister Prophet Priest " +
    "People Land City Temple Egypt Philistines Hebrews One Two Three All Every Some Then Also"
  ).split(" "),
);

const FEMALE_NAMES = new Set(
  "Mary Ruth Esther Sarah Sarai Rebekah Rachel Leah Hannah Miriam Deborah Naomi Martha Elizabeth Anna Eve Hagar Rahab Jezebel Bathsheba Dorcas Tabitha Lydia Priscilla Tamar Delilah Abigail Zipporah Jochebed Salome Joanna Susanna Phoebe".split(
    " ",
  ),
);

const ROLE_WORDS =
  /\b((?:prodigal|good|lost|faithful|rich|poor|young|old|blind|wise|foolish)\s+)?(son|father|shepherd|woman|man|king|prophet|widow|servant|samaritan|disciple|fisherman|farmer|sower|soldier|centurion|leper|beggar|tax collector)\b/i;

const LOCATION_KEYWORDS: [RegExp, string, string][] = [
  [/\bsea\b|\bshore\b|\bgalilee\b/i, "Sea shore", "a wide pebbled shore with fishing boats pulled onto the sand and hills beyond the water"],
  [/\bmount|\bmountain|\bhill\b/i, "Mountain slope", "a rocky mountain slope with scrub brush, wind-bent trees and a far horizon"],
  [/\bvalley\b/i, "Valley floor", "a dry valley floor between two ridges, scattered stones and a thin stream bed"],
  [/\btemple\b|\bsynagogue\b/i, "Temple courtyard", "a stone courtyard with tall columns, worn steps and oil lamps"],
  [/\bdesert\b|\bwilderness\b/i, "Desert wilderness", "an open desert of ochre sand and sandstone outcrops under a vast sky"],
  [/\briver\b|\bjordan\b|\bnile\b/i, "Riverbank", "a reed-lined riverbank with slow brown water and palm trees"],
  [/\bfield\b|\bharvest\b|\bsow/i, "Wheat field", "golden wheat fields bordered by low stone walls and olive trees"],
  [/\bpalace\b|\bthrone\b|\bking\b/i, "Royal palace hall", "a cedar-panelled palace hall with woven tapestries and bronze braziers"],
  [/\bvillage|\btown\b|\bcity\b|\bhome\b|\bhouse\b/i, "Village square", "a dusty village square of mud-brick houses, a stone well and market stalls"],
  [/\bcamp\b|\btent/i, "Tent camp", "a camp of goat-hair tents, cooking fires and tethered animals"],
];

const DEFAULT_LOCATIONS: [string, string][] = [
  ["Village outskirts", "the edge of an ancient village where mud-brick houses give way to olive groves"],
  ["Open hillside", "a grassy hillside dotted with sheep, stone terraces and a winding footpath"],
];

const DAYTIMES: TimeOfDay[] = ["dawn", "morning", "afternoon", "golden_hour", "dusk"];

function storySource(input: StoryInput): string {
  switch (input.kind) {
    case "topic":
    case "calendar":
      return input.topic;
    case "text":
      return input.text;
    case "reference_url":
      return input.notes || "an original Bible story";
  }
}

function storyTitle(input: StoryInput): string {
  let raw: string;
  if (input.kind === "text") {
    const first = input.text.split(/(?<=[.!?])\s/)[0] ?? input.text;
    raw = first.split(/\s+/).slice(0, 8).join(" ").replace(/[.,;:!?]+$/, "");
  } else if (input.kind === "reference_url") {
    raw = input.notes ? input.notes.split(/\s+/).slice(0, 6).join(" ") : "A Story of Faith";
  } else {
    raw = input.topic;
  }
  const title = titleCase(raw.replace(/\s+/g, " ")).slice(0, 80).trim();
  return title || "A Story of Faith";
}

function mentions(corpus: string, names: string[]): boolean {
  const lower = corpus.toLowerCase();
  return names.some((n) => n.trim().length > 1 && new RegExp(`\\b${escapeRegExp(n.toLowerCase())}\\b`).test(lower));
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function nameCandidates(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\b[A-Z][a-z]{2,}\b/g)) {
    const word = m[0];
    if (!NOT_NAMES.has(word) && !out.includes(word)) out.push(word);
  }
  return out;
}

function newCharacter(name: string, role: string, seed: string): BriefCharacter {
  const female = FEMALE_NAMES.has(name) || /\b(woman|widow|daughter|mother|sister|queen)\b/i.test(name);
  const age = female
    ? pick(["young woman in her early twenties", "woman in her thirties", "woman in her fifties"], `${seed}age`)
    : pick(["young man in his early twenties", "man in his thirties", "man in his late forties", "older man in his sixties"], `${seed}age`);
  const hair = female
    ? pick(["long dark-brown hair under a linen head covering", "black braided hair partly covered by a veil"], `${seed}hair`)
    : pick(["short curly black hair and a trimmed beard", "shoulder-length dark hair and a full beard", "greying hair and a long grey beard"], `${seed}hair`);
  const build = pick(["slender build", "lean wiry build", "sturdy build"], `${seed}build`);
  const eyes = pick(["deep brown eyes", "dark hazel eyes", "warm amber-brown eyes"], `${seed}eyes`);
  const wardrobe = female
    ? pick(["sand-coloured linen dress with a blue woven shawl and leather sandals", "undyed wool tunic with a terracotta mantle"], `${seed}ward`)
    : pick(
        ["rough brown wool tunic with a rope belt, a sheepskin cloak and leather sandals", "cream linen robe with a faded red sash and a travel staff", "dark tunic with a leather belt and a simple head wrap"],
        `${seed}ward`,
      );
  return {
    name,
    role,
    appearance: `${age}, ${build}, ${hair}, olive skin, ${eyes}`,
    wardrobe,
    existingCharacterId: null,
  };
}

/** "1 Samuel 17:1-54" → { book: "1 Samuel", chapter: 17, verseStart: 1, verseEnd: 54 }. */
export function parseRef(ref: string): ScriptureRef | null {
  const m = /^\s*(.+?)\s+(\d+):(\d+)(?:\s*[-–]\s*(?:(\d+):)?(\d+))?\s*$/.exec(ref);
  if (!m) return null;
  const chapter = Number(m[2]);
  const verseStart = Number(m[3]);
  const endChapter = m[4] ? Number(m[4]) : chapter;
  const end = m[5] ? Number(m[5]) : verseStart;
  const verseEnd = endChapter === chapter ? Math.max(verseStart, end) : verseStart;
  return { book: m[1]!.trim(), chapter, verseStart, verseEnd };
}

const THEMES: [RegExp, string][] = [
  [/giant|goliath|battle|fear|afraid|lion/i, "courage that comes from trusting God"],
  [/forgiv|prodigal|return|mercy/i, "forgiveness and the father's mercy"],
  [/sea|storm|wave|water|flood/i, "God's power over chaos"],
  [/bread|feed|manna|harvest|provid/i, "God's provision"],
  [/heal|blind|leper|sick/i, "healing and compassion"],
  [/promise|covenant|son|child|baby/i, "God keeps His promises"],
  [/prayer|pray/i, "prayer and dependence on God"],
];

export function mockStoryBrief(ctx: StoryBriefContext): StoryBrief {
  const source = storySource(ctx.input);
  const notes = "notes" in ctx.input ? (ctx.input.notes ?? "") : "";
  const scriptureText = ctx.scripture.map((s) => s.text).join(" ");
  const corpus = [source, notes, scriptureText].join(" ");
  const title = storyTitle(ctx.input);
  const seed = `${title}|${ctx.seriesFormat}`;

  const existing = ctx.existingCharacters.filter((c) => mentions(corpus, [c.name, ...c.aliases])).slice(0, 4);
  const existingNames = new Set(ctx.existingCharacters.flatMap((c) => [c.name, ...c.aliases]).map((n) => n.toLowerCase()));
  const candidates = [...nameCandidates(`${source} ${notes}`), ...nameCandidates(scriptureText)].filter(
    (n) => !existingNames.has(n.toLowerCase()) && ![...existingNames].some((e) => e.split(/\s+/).includes(n.toLowerCase())),
  );
  const roleMatch = ROLE_WORDS.exec(`${source} ${notes}`);
  const newName = candidates[0] ?? (roleMatch ? titleCase(roleMatch[0]) : null);

  const characters: BriefCharacter[] = existing.map((c, i) => ({
    name: c.name,
    role: i === 0 ? "protagonist" : "supporting character",
    appearance: `${c.name} as established in the character library`,
    wardrobe: "as established in the character library",
    existingCharacterId: c.id,
  }));
  if (newName) characters.push(newCharacter(newName, characters.length === 0 ? "protagonist" : "supporting character", `${seed}${newName}`));
  if (characters.length === 0) {
    const first = ctx.existingCharacters[0];
    if (first) {
      characters.push({ name: first.name, role: "protagonist", appearance: `${first.name} as established in the character library`, wardrobe: "as established in the character library", existingCharacterId: first.id });
    } else {
      characters.push(newCharacter("Villager", "protagonist", `${seed}villager`));
    }
  }

  const locations: BriefLocation[] = ctx.existingLocations
    .filter((l) => mentions(corpus, [l.name]))
    .slice(0, 2)
    .map((l, i) => ({
      name: l.name,
      description: `${l.name} as established in the location library`,
      era: "Biblical era, ancient Near East",
      timeOfDay: pick(DAYTIMES, `${seed}${l.name}${i}`),
      existingLocationId: l.id,
    }));
  for (const [pattern, name, description] of LOCATION_KEYWORDS) {
    if (locations.length >= 2) break;
    if (pattern.test(corpus) && !locations.some((l) => l.name === name)) {
      locations.push({ name, description, era: "Biblical era, ancient Near East", timeOfDay: pick(DAYTIMES, `${seed}${name}`), existingLocationId: null });
    }
  }
  if (locations.length === 0) {
    for (const [name, description] of DEFAULT_LOCATIONS.slice(0, 1 + (hash32(seed) % 2))) {
      locations.push({ name, description, era: "Biblical era, ancient Near East", timeOfDay: pick(DAYTIMES, `${seed}${name}`), existingLocationId: null });
    }
  }

  const scriptureRefs: ScriptureRef[] = [];
  for (const s of ctx.scripture) {
    const ref = parseRef(s.ref);
    if (ref && !scriptureRefs.some((r) => formatScriptureRef(r) === formatScriptureRef(ref))) scriptureRefs.push(ref);
  }

  const sensitiveFlags: SensitiveFlag[] = [];
  if (/\b(child|children|baby|babies|infant|newborn|boy|girl|toddler|kid|kids)\b/i.test(corpus)) {
    sensitiveFlags.push({ type: "minor", note: "A child appears in the story: keep children fully clothed, calm and in a wholesome family setting." });
  }
  if (/crucif/i.test(corpus)) {
    sensitiveFlags.push({ type: "violence", note: "Crucifixion: show it through implication (silhouettes, hands, shadows, aftermath); no wounds or blood." });
  }
  if (characters.some((c) => /^jesus\b/i.test(c.name))) {
    sensitiveFlags.push({ type: "deity_depiction", note: "Depict Jesus in traditional Western iconography and narrate in the third person." });
  }

  const themes = THEMES.filter(([p]) => p.test(corpus)).map(([, t]) => t);
  const keyThemes = (themes.length > 0 ? themes : ["faith in an uncertain moment", "God's faithfulness"]).slice(0, 4);
  const protagonist = characters[0]!.name;
  const refText = scriptureRefs.map(formatScriptureRef);
  const where = locations[0]!.name.toLowerCase();

  return {
    title,
    summary: `${protagonist} faces a defining moment at the ${where}. Drawing on ${refText[0] ?? "the biblical account"}, this retelling follows how trust in God answers fear, staying faithful to the text in ${ctx.translation}.`,
    scriptureRefs,
    keyThemes,
    characters,
    locations,
    sensitiveFlags,
    theologicalNotes: [
      refText.length > 0 ? `Grounded in ${refText.join(", ")} (${ctx.translation}).` : `No passage supplied; keep claims general and check against ${ctx.translation}.`,
      "Expressions, weather and camera framing are dramatisation for the visuals, not additions to the text.",
    ],
    hookIdeas: [`What would you have done if you were ${protagonist}?`, `${title}: the moment everything changed.`],
  };
}

// ---------------------------------------------------------------- Script

const PURPOSES: BeatPurpose[] = ["hook", "context", "rising", "turning_point", "resolution", "reflection", "cta"];
const PURPOSE_WEIGHT: Record<BeatPurpose, number> = {
  hook: 0.11,
  context: 0.18,
  rising: 0.21,
  turning_point: 0.21,
  resolution: 0.16,
  reflection: 0.13,
  cta: 0,
};

const POOLS: Record<Exclude<BeatPurpose, "cta">, string[]> = {
  hook: [
    "What happens when {P} has nothing left but faith?",
    "Everyone expected {P} to fail that day.",
    "One quiet choice at the {L} changed everything.",
  ],
  context: [
    "Long ago, {P} lived among people who had almost given up hope.",
    "This story comes from {REF}.",
    "Every day at the {L} felt heavier than the last.",
    "{S} watched and wondered what would happen next.",
  ],
  rising: [
    "Then the pressure grew, and fear spread through the crowd.",
    "{P} could have turned back, but kept walking forward.",
    "Voices of doubt grew louder with every step.",
    "{S} warned that it could not be done.",
  ],
  turning_point: [
    "In that moment, {P} remembered who God is.",
    "Quietly, {P} chose to trust instead of panic.",
    "And then, against every expectation, God moved.",
    "The answer came, not with noise, but with faithfulness.",
  ],
  resolution: [
    "The fear that filled the {L} gave way to wonder.",
    "{S} saw what trust in God can do.",
    "What looked like the end became a new beginning.",
  ],
  reflection: [
    "Maybe the giant in your life looks different today.",
    "The same God who met {P} still meets us in our fear.",
    "Faith is not the absence of fear; it is trust in the middle of it.",
  ],
};

function fillWords(pool: string[], target: number, seed: string, vars: Record<string, string>): string {
  const sentences = pool.map((s) => s.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? k));
  const words: string[] = [];
  let i = hash32(seed) % sentences.length;
  while (words.length < target) {
    words.push(...sentences[i % sentences.length]!.split(/\s+/));
    i++;
  }
  const out = words.slice(0, Math.max(2, target));
  const last = out.length - 1;
  if (!/[.!?]$/.test(out[last]!)) out[last] = `${out[last]!.replace(/[,;:]+$/, "")}.`;
  return out.join(" ");
}

function camel(text: string): string {
  return text
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

export function mockScript(ctx: ScriptContext): Script {
  const { brief } = ctx;
  const protagonist = brief.characters[0]?.name ?? "the faithful one";
  const second = brief.characters[1]?.name ?? "the crowd";
  const location = (brief.locations[0]?.name ?? "village").toLowerCase();
  const ref = brief.scriptureRefs[0] ? formatScriptureRef(brief.scriptureRefs[0]) : null;
  const vars = { P: protagonist, S: second, L: location, REF: ref ?? "the Bible" };
  const seed = `${brief.title}|${ctx.revisionNotes ?? ""}|${ctx.previousScript ? "rev" : ""}`;

  const cta = (ctx.ctaText ?? "Follow for a Bible story every day.").trim();
  const ctaWords = countWords(cta);
  const remaining = Math.max(12, ctx.targetWords - ctaWords);
  const beats: ScriptBeat[] = PURPOSES.map((purpose, i) => {
    const text =
      purpose === "cta"
        ? cta
        : fillWords(POOLS[purpose], Math.max(3, Math.round(remaining * PURPOSE_WEIGHT[purpose])), `${seed}|${purpose}`, vars);
    return {
      id: `b${i + 1}`,
      purpose,
      text,
      scriptureRef: ref && (purpose === "context" || purpose === "turning_point") ? ref : null,
    };
  });

  const characterTags = brief.characters.map((c) => camel(c.name)).filter(Boolean);
  const hashtags = [...new Set(["#BibleStory", "#Faith", `#${camel(brief.title)}`, ...characterTags.map((t) => `#${t}`), "#Shorts"])]
    .filter((h) => h.length > 1)
    .slice(0, 5);
  const hook = beats[0]!.text;
  const caption = truncate(
    [hook, brief.summary, ref ? `Read it in ${ref}.` : "", "What part of this story speaks to you? Tell us below."].filter(Boolean).join("\n\n"),
    2200,
  );
  const verseText = brief.summary.split(/(?<=[.!?])\s/)[0] ?? brief.summary;

  return {
    title: brief.title,
    beats,
    onScreenVerse: ref ? { text: verseText, ref } : null,
    platformMeta: {
      youtube: {
        title: truncate(`${brief.title} | Bible Story`, 100),
        description: truncate([brief.summary, ref ? `Scripture: ${ref} (${ctx.translation})` : "", hashtags.join(" ")].filter(Boolean).join("\n\n"), 5000),
        tags: [...new Set(["bible story", "faith", ...brief.characters.map((c) => c.name.toLowerCase()), ...brief.keyThemes])].slice(0, 15),
      },
      facebook: { caption, hashtags },
      instagram: { caption, hashtags },
      tiktok: { caption: truncate(`${hook} ${hashtags.join(" ")}`, 2200), hashtags },
    },
  };
}

// ---------------------------------------------------------------- ShotList

interface Setup {
  size: ShotSize;
  angle: CameraAngle;
  movement: CameraMovement;
}

const SETUPS: Record<BeatPurpose, Setup[]> = {
  hook: [
    { size: "extreme_wide", angle: "high", movement: "push_in" },
    { size: "close_up", angle: "eye_level", movement: "push_in" },
  ],
  context: [
    { size: "wide", angle: "eye_level", movement: "pan_right" },
    { size: "medium", angle: "eye_level", movement: "truck_left" },
  ],
  rising: [
    { size: "full", angle: "low", movement: "handheld" },
    { size: "medium_close", angle: "over_the_shoulder", movement: "tilt_up" },
  ],
  turning_point: [
    { size: "close_up", angle: "low", movement: "push_in" },
    { size: "wide", angle: "low", movement: "crane_up" },
  ],
  resolution: [
    { size: "medium", angle: "eye_level", movement: "pull_out" },
    { size: "wide", angle: "high", movement: "orbit" },
  ],
  reflection: [
    { size: "extreme_wide", angle: "eye_level", movement: "crane_up" },
    { size: "insert", angle: "overhead", movement: "static" },
  ],
  cta: [
    { size: "wide", angle: "eye_level", movement: "static" },
    { size: "medium_close", angle: "eye_level", movement: "pull_out" },
  ],
};

const LENS_FOR: Record<ShotSize, Lens> = {
  extreme_wide: "wide_24mm",
  wide: "wide_24mm",
  full: "standard_35mm",
  medium: "standard_35mm",
  medium_close: "normal_50mm",
  close_up: "portrait_85mm",
  extreme_close_up: "portrait_85mm",
  insert: "telephoto_135mm",
};

const BEAT_LOOK: Record<BeatPurpose, { action: string; motion: string; expression: string; lighting: string; mood: string }> = {
  hook: { action: "stands alone, looking toward the horizon", motion: "turns slowly toward the camera as wind tugs at the robes", expression: "searching", lighting: "soft golden backlight with haze", mood: "expectant" },
  context: { action: "walks slowly along the path", motion: "walks forward at an unhurried pace, dust rising around the sandals", expression: "weary", lighting: "diffused overcast daylight", mood: "heavy, uncertain" },
  rising: { action: "steps forward despite the danger", motion: "takes a determined step forward while others hold back", expression: "determined", lighting: "hard side light with long shadows", mood: "tense" },
  turning_point: { action: "lifts their eyes toward the sky", motion: "slowly raises their head and opens their hands as light breaks through the clouds", expression: "awestruck", lighting: "shafts of sunlight breaking through clouds", mood: "awe" },
  resolution: { action: "stands at peace among the others", motion: "exhales and smiles as the crowd gathers around", expression: "peaceful", lighting: "warm late-afternoon glow", mood: "relief, wonder" },
  reflection: { action: "sits quietly, hands folded", motion: "closes their eyes in prayer as the light warms", expression: "serene", lighting: "gentle dawn light", mood: "contemplative" },
  cta: { action: "looks out over the landscape", motion: "turns away toward the horizon as the light fades softly", expression: "hopeful", lighting: "warm low sun", mood: "hopeful" },
};

const SIZE_DETAIL: Partial<Record<ShotSize, string>> = {
  extreme_wide: "The landscape dominates the frame; figures are small against it.",
  wide: "The whole scene is visible, with depth from foreground to background.",
  insert: "A detail fills the frame: weathered hands, a staff, a clay lamp.",
  close_up: "The face fills the frame with fine detail in the eyes and skin.",
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function splitWords(text: string, parts: number[]): string[] {
  const words = text.trim().split(/\s+/);
  const total = parts.reduce((a, b) => a + b, 0);
  const out: string[] = [];
  let start = 0;
  parts.forEach((p, i) => {
    const end = i === parts.length - 1 ? words.length : Math.max(start + 1, Math.min(words.length - (parts.length - 1 - i), Math.round(start + (words.length * p) / total)));
    out.push(words.slice(start, end).join(" "));
    start = end;
  });
  return out;
}

export function mockShotList(ctx: ShotListContext): ShotList {
  const beats = ctx.script.beats;
  const total = ctx.targetDurationSec;
  const names = ctx.characterNames;
  const locs = ctx.locationNames.length > 0 ? ctx.locationNames : ctx.brief.locations.map((l) => l.name);
  const locationNames = locs.length > 0 ? locs : ["Village outskirts"];
  const timeFor = (location: string): TimeOfDay =>
    ctx.brief.locations.find((l) => l.name.toLowerCase() === location.toLowerCase())?.timeOfDay ?? "golden_hour";

  // beat durations proportional to narration length, at least 1.5 s each
  const weights = beats.map((b) => Math.max(1, countWords(b.text)));
  const sumWeights = weights.reduce((a, b) => a + b, 0);
  let beatDur = weights.map((w) => Math.max(1.5, (total * w) / sumWeights));
  const scale = total / beatDur.reduce((a, b) => a + b, 0);
  beatDur = beatDur.map((d) => d * scale);

  const shots: ShotSpec[] = [];
  const firstShotOfPurpose = new Map<BeatPurpose, number>();
  beats.forEach((beat, b) => {
    const dur = beatDur[b]!;
    const count = dur > 15 ? Math.ceil(dur / 15) : dur >= 5.5 ? 2 : 1;
    const parts = Array.from({ length: count }, () => dur / count);
    const narration = splitWords(beat.text, parts);
    const look = BEAT_LOOK[beat.purpose];
    const late = b >= beats.length / 2;
    const location = locationNames[late && locationNames.length > 1 ? 1 : 0]!;
    const direction = locationNames.indexOf(location) % 2 === 0 ? "left_to_right" : "right_to_left";
    for (let k = 0; k < count; k++) {
      const setup = SETUPS[beat.purpose][k % SETUPS[beat.purpose].length]!;
      const index = shots.length;
      if (!firstShotOfPurpose.has(beat.purpose)) firstShotOfPurpose.set(beat.purpose, index);
      const castSize = setup.size === "insert" ? 0 : setup.size === "close_up" || setup.size === "extreme_wide" ? 1 : 2;
      const cast = names.slice(0, castSize);
      const characters: ShotCharacter[] = cast.map((name, c) => ({
        name,
        action: look.action,
        expression: look.expression,
        position: setup.size === "extreme_wide" ? "background" : cast.length === 1 ? "center" : c === 0 ? "left" : "right",
        facing: setup.size === "close_up" ? "camera" : cast.length === 1 ? (direction === "left_to_right" ? "right" : "left") : c === 0 ? "right" : "left",
      }));
      const who = cast.length > 0 ? cast.join(" and ") : "No people;";
      const detail = SIZE_DETAIL[setup.size] ?? "Natural, grounded staging with period-accurate props.";
      shots.push({
        index,
        beatId: beat.id,
        kind: "still",
        durationSec: round1(parts[k]!),
        narration: narration[k] || beat.text,
        camera: {
          size: setup.size,
          angle: setup.angle,
          movement: setup.movement,
          lens: LENS_FOR[setup.size],
          screenDirection: cast.length === 0 ? "neutral" : direction,
        },
        characters,
        location,
        timeOfDay: timeFor(location),
        lighting: look.lighting,
        mood: look.mood,
        keyframePrompt: `${who} ${cast.length > 0 ? look.action : "the empty landscape"} at ${location}. ${detail}`,
        motionPrompt:
          cast.length > 0
            ? `${cast[0]} ${look.motion}; robes and dust move gently in the wind.`
            : "Clouds drift slowly; grass and dust stir in a light breeze.",
        continuity: { matchSetupOf: null, continueFrom: null },
      });
    }
  });

  // land exactly on the target duration
  const drift = round1(total - shots.reduce((a, s) => a + s.durationSec, 0));
  const last = shots[shots.length - 1]!;
  last.durationSec = round1(Math.min(15, Math.max(1, last.durationSec + drift)));

  // at least two hero shots: the hook and the turning point
  const heroes = new Set<number>([firstShotOfPurpose.get("hook") ?? 0, firstShotOfPurpose.get("turning_point") ?? Math.floor(shots.length / 2)]);
  if (heroes.size < 2) heroes.add(shots.length - 1 === [...heroes][0] ? 0 : shots.length - 1);
  for (const i of heroes) shots[i]!.kind = "hero";

  // one returning setup: the resolution comes back to the framing of the context shot
  let target = firstShotOfPurpose.get("resolution") ?? shots.length - 1;
  let source = firstShotOfPurpose.get("context") ?? 0;
  if (source >= target) {
    source = 0;
    target = shots.length - 1;
  }
  const src = shots[source]!;
  const dst = shots[target]!;
  dst.continuity = { matchSetupOf: source, continueFrom: null };
  dst.camera = { ...src.camera, movement: dst.camera.movement };
  dst.location = src.location;
  dst.timeOfDay = src.timeOfDay;

  const list: ShotList = { shots };
  const issues = validateShotList(list, {
    beatIds: beats.map((b) => b.id),
    characterNames: names,
    locationNames,
  });
  if (issues.length > 0) {
    throw new Error(`mock shot list is invalid: ${issues.map((i) => i.message).join("; ")}`);
  }
  return list;
}

// ---------------------------------------------------------------- QA & policy

export function mockKeyframeQa(_ctx: KeyframeQaContext | null): KeyframeQa {
  return { pass: true, issues: [] };
}

export function mockPolicyCheck(ctx: PolicyCheckContext): PolicyCheck {
  const reasons: string[] = [];
  if (/crucif/i.test(ctx.prompt)) reasons.push("Depicts a crucifixion; most video models block graphic execution scenes.");
  if (/blood/i.test(ctx.prompt)) reasons.push("Mentions blood; graphic injury is likely to be filtered.");
  if (reasons.length === 0) return { safe: true, saferPrompt: null, reasons: [] };
  const saferPrompt = ctx.prompt
    .replace(/\b(the\s+)?crucifixion\b/gi, "a solemn hilltop with three crosses seen from far away, in silhouette against a stormy sky")
    .replace(/\bcrucif\w*/gi, "shown only in distant silhouette")
    .replace(/\b(blood[\w-]*)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return { safe: false, saferPrompt: `${saferPrompt} Shown through implication only: shadows, hands, and aftermath, no wounds.`, reasons };
}
