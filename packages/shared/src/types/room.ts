/**
 * Room — the singly-linked, append-only unit of observable reality.
 *
 * Epistemological premise: only the current room exists as observable reality.
 * Generated rooms may have always existed or been just created.
 * Rooms are summarized on exit (compression) before N+1 selection.
 */

import type { CharacterId } from "./character.js";
import type { GridPos, ObjectId, WorldObject } from "./world-object.js";

export type RoomId = `room_${string}`;

/** How much life this room spans. Selected by the LLM from narrative density. */
export type RoomDuration = "day" | "week" | "month" | "year";

export const ROOM_DURATION_DAYS: Record<RoomDuration, number> = {
  day: 1,
  week: 7,
  month: 30,
  year: 365,
};

export type RoomSizeTemplate = "tiny" | "small" | "medium" | "large" | "wide" | "tall";

/**
 * RoomLayout — the physical space. Walls/floor are deterministic scaffolding
 * from the size template; objects carry their own positions (WorldObject.position).
 * Entry is always on the left wall, exit on the right. Time moves forward.
 */
export interface RoomLayout {
  widthTiles: number;
  heightTiles: number;
  sizeTemplate: RoomSizeTemplate;
  /** Asset id for the base floor tile. */
  floorAssetId: string;
  /** Asset id for the wall tile. */
  wallAssetId: string;
  /** Left wall. Where the player spawns on entry. */
  entryTile: GridPos;
  /** Right wall only. Stepping here transitions to the next room. */
  exitTile: GridPos;
}

export type RoomEventType =
  | "dialogue"
  | "interaction"
  | "thought"
  | "speech"
  | "item"
  | "transition"
  | "ambient"
  | "death";

export interface RoomEvent {
  readonly id: string;
  type: RoomEventType;
  description: string;
  playerChoice: string | null;
  outcome: string;
  /** ms since room entry */
  atMs: number;
  characterIds: CharacterId[];
}

export interface Room {
  readonly id: RoomId;
  readonly sequenceIndex: number;
  /** Pointer to prior room — null for birth room. Singly-linked list. */
  readonly previousRoomId: RoomId | null;
  /**
   * Pointer to the next room — null for the current tail.
   * Set atomically when the subsequent room is inserted.
   * This is the sole controlled mutation allowed on a persisted room record.
   */
  nextRoomId: RoomId | null;
  label: string;
  description: string;
  /** What is happening in this room. Rooms present, never prescribe. */
  situation: string;
  objects: Map<ObjectId, WorldObject>;
  layout: RoomLayout;
  duration: RoomDuration;
  /** Player's fractional age in years when this room was entered. */
  playerAgeYears: number;
  /** ISO8601 calendar date in the game world at room entry. */
  worldDate: string;
  /** Append-only log of what happened during the visit. */
  events: RoomEvent[];
  /** Compressed summary written on room exit. Must be non-null before a room is persisted. */
  summary: string | null;
  era: Era;
  createdAt: number; // unix ms
  exitedAt: number | null;
}

export type Era =
  | "prehistoric"
  | "ancient"
  | "medieval"
  | "renaissance"
  | "industrial"
  | "modern"
  | "near-future"
  | "far-future";
