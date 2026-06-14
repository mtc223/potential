/**
 * CharacterRecord — a persistent person in the player's life.
 *
 * Characters live in the roster (Dexie `characters` table) and persist across
 * rooms. Rooms reference them via WorldObject.characterId. Memory is asymmetric:
 * each character carries their own compressed memory of the player.
 *
 * Characters are never deleted — status-transitioned only (referential integrity).
 */

export type CharacterId = `chr_${string}`;

export type CharacterStatus = "active" | "inactive" | "deceased" | "blocked";

/**
 * AffectionState — all floats 0–1.
 * Never surfaced as numbers in UI; drives NPC behavior and dialogue tone only.
 */
export interface AffectionState {
  attraction: number;
  trust: number;
  respect: number;
  resentment: number;
  /** Do they know the player exists yet. 0 for strangers. */
  awareness: number;
  intimacy: number;
}

export interface CharacterRecord {
  readonly id: CharacterId;
  name: string;
  /** Semantic relationship to the player: 'mother', 'teacher', 'friend', 'boss', 'stranger', … */
  role: string;
  age: number;
  /** Short trait line, e.g. 'warm but anxious, deflects with humor'. */
  personality: string;
  backstory: string;
  /** What this character is trying to accomplish in the current room. Updated per room. */
  intent: string;
  emotionalState: string;
  affection: AffectionState;
  /** Compressed memory of the player — their side of the relationship. */
  memorySummary: string;
  behavioralPatterns: string[];
  status: CharacterStatus;
  firstMetAtSequence: number;
  lastSeenAtSequence: number;
}

export function neutralAffection(): AffectionState {
  return { attraction: 0, trust: 0, respect: 0, resentment: 0, awareness: 0, intimacy: 0 };
}
