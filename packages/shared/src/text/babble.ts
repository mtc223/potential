import { GAME_CONFIG } from "../config/game-config.js";

/**
 * Pre-verbal speech — below GAME_CONFIG.speech.speechAgeYears, anything the
 * player tries to SAY comes out as babble. The inner monologue stays
 * articulate (the self lives there); the mouth just can't keep up yet.
 *
 * Deterministic: the same input always babbles the same way, so events,
 * compression, and tests are stable. Parenthetical stage directions like
 * "(reaches up)" pass through untouched — gestures are a baby's real channel.
 */

const BABY_SYLLABLES = [
  "goo",
  "gah",
  "ba",
  "da",
  "ma",
  "buh",
  "boo",
  "aah",
  "ooh",
  "nuh",
  "pbbt",
  "mmm",
] as const;

/** From ~1 year, real proto-words start surfacing in the stream. */
const TODDLER_WORDS = [
  "mama",
  "dada",
  "no no",
  "mine!",
  "uppy",
  "bye-bye",
  "uh-oh",
  "nana",
  "more!",
  "dis?",
] as const;

export function isPreverbal(ageYears: number): boolean {
  return ageYears < GAME_CONFIG.speech.speechAgeYears;
}

/**
 * Replace spoken text with age-appropriate babble. Returns the input
 * unchanged once the player can talk.
 */
export function babbleize(text: string, ageYears: number): string {
  if (!isPreverbal(ageYears)) return text;
  const trimmed = text.trim();
  if (trimmed.length === 0) return trimmed;

  // Keep (actions), babble the words between them.
  const segments = trimmed.split(/(\([^)]*\))/);
  const out = segments
    .map((segment) =>
      segment.startsWith("(") ? segment : babbleSegment(segment, ageYears),
    )
    .filter((segment) => segment.length > 0)
    .join(" ");
  return out.replace(/\s+/g, " ").trim();
}

function babbleSegment(segment: string, ageYears: number): string {
  const words = segment.trim().split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return "";

  const rnd = mulberry32(hash(segment));
  const pick = <T>(pool: readonly T[]): T => {
    const item = pool[Math.floor(rnd() * pool.length)];
    if (item === undefined) throw new Error("babble: empty pool");
    return item;
  };

  const count = Math.max(2, Math.min(8, words.length));
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    if (ageYears >= 1 && rnd() < 0.3) {
      parts.push(pick(TODDLER_WORDS));
    } else {
      const syllable = pick(BABY_SYLLABLES);
      // Babies love reduplication: "ba" becomes "ba-ba".
      parts.push(rnd() < 0.4 ? `${syllable}-${syllable}` : syllable);
    }
  }

  let babble = parts.join(" ");
  babble = babble.charAt(0).toUpperCase() + babble.slice(1);
  const last = segment.trim().slice(-1);
  if ((last === "?" || last === "!") && !babble.endsWith("!") && !babble.endsWith("?")) {
    babble += last;
  } else if (!/[!?.]$/.test(babble)) {
    babble += ".";
  }
  return babble;
}

function hash(text: string): number {
  let h = 1779033703;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
