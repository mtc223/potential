/**
 * Room — the singly-linked, append-only unit of observable reality.
 *
 * Epistemological premise: only the current room exists as observable reality.
 * Generated rooms may have always existed or been just created.
 * Rooms are summarized on exit (compression) before N+1 selection.
 */

import type { ObjectId, WorldObject } from "./world-object.js";

export type RoomId = `room_${string}`;

export interface Room {
  readonly id: RoomId;
  readonly sequenceIndex: number;
  /** Pointer to prior room — null for birth room. Singly-linked list. */
  readonly previousRoomId: RoomId | null;
  label: string;
  description: string;
  objects: Map<ObjectId, WorldObject>;
  /** Compressed summary written on room exit. */
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
