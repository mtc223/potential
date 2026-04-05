/**
 * WorldObject — the atomic unit of the game world.
 * Every entity (NPC, item, building, sound source) is a WorldObject.
 * Stale ObjectRefs are tombstoned, not removed.
 */

export type ObjectId = `obj_${string}`;

export type ObjectCategory =
  | "npc"
  | "item"
  | "fixture"
  | "exit"
  | "ambient"
  | "player";

export interface WorldObject {
  readonly id: ObjectId;
  readonly category: ObjectCategory;
  label: string;
  description: string;
  /** Audio is a WorldObject property, not a room-level system. */
  audio?: AudioSpec;
  tags: string[];
  tombstoned: boolean;
}

export interface AudioSpec {
  ambientLoop?: string;
  interactSound?: string;
  volume: number; // 0–1
}
