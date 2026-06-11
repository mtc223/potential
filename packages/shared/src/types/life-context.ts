/**
 * LifeContext — the accumulated story of the current life.
 *
 * This is the "life layer" on top of the player Character. It is the primary
 * input to room generation: the LLM reads it to fabricate the next room.
 * It grows by appending CompressedRoomSummary entries on every room exit.
 *
 * LifeEvents (isLifeEvent: true) are permanent anchors — never further compressed.
 */

import type { Era, RoomId } from "./room.js";
import type { HiddenStatBlock } from "./player.js";

export type PacingPreference = "slow" | "normal" | "fast";

/**
 * CompressedRoomSummary — output of compress_player_memory.
 * Written on room exit, before N+1 candidate selection. This is causality,
 * not just memory: the freshest signal shaping what rooms come next.
 */
export interface CompressedRoomSummary {
  roomId: RoomId;
  sequenceIndex: number;
  /** 1–2 sentence human-readable summary. Journal-facing. */
  narrative: string;
  /** How the player behaved — choices, tone, patterns. LLM-facing. */
  behavioralSignal: string;
  tags: string[];
  /** Overall emotional tone of the room, -1.0 to 1.0. */
  emotionalValence: number;
  /** LifeEvents are permanent anchors, never further compressed. */
  isLifeEvent: boolean;
  /** e.g. 'first_day_of_school', 'married', 'parent_died'. Null if none. */
  milestone: string | null;
  playerAgeYears: number;
  worldDate: string;
}

export interface LifeContext {
  playerName: string;
  /** ISO8601 — anchors era-appropriate generation. */
  birthDate: string;
  playerAgeYears: number;
  worldDate: string;
  era: Era;
  /** Immutable, seeded at birth. Never surfaced as numbers. */
  natureStats: HiddenStatBlock;
  /** Environmentally shaped. Internal LLM signal only. */
  nurtureStats: HiddenStatBlock;
  /** Recurring player behavior tags, e.g. 'defiance', 'generosity'. */
  behavioralPatterns: string[];
  /** Permanent anchors. Never compressed further. */
  lifeEvents: CompressedRoomSummary[];
  /** Rolling compressed room history. */
  compressedHistory: CompressedRoomSummary[];
  /** Rolling valence history, most recent last. */
  emotionalTrajectory: number[];
  /** 0–1. Visible HUD bar (red). */
  health: number;
  /** 0–1. Visible HUD bar (green). */
  hunger: number;
  /** Liquid money in dollars. */
  money: number;
  jobTitle: string | null;
  pacing: PacingPreference;
  /** True once the life has ended. The session becomes read-only. */
  deceased: boolean;
  causeOfDeath: string | null;
}
