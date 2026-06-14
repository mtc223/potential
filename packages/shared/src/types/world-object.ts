/**
 * WorldObject — the atomic unit of the game world.
 * Every entity (NPC, item, building, sound source) is a WorldObject.
 * Stale ObjectRefs are tombstoned, not removed.
 */

import type { CharacterId } from "./character.js";

export type ObjectId = `obj_${string}`;

export type ObjectCategory =
  | "npc"
  | "item"
  | "fixture"
  | "exit"
  | "ambient"
  | "player";

/** Tile coordinates within a room. (0,0) is top-left. */
export interface GridPos {
  col: number;
  row: number;
}

export type Facing = "up" | "down" | "left" | "right";

export type InteractionType =
  | "examine"
  | "use"
  | "talk_to"
  | "pick_up"
  | "eat"
  | "drink"
  | "sit";

export interface ObjectInteraction {
  type: InteractionType;
  /** Result text shown in the dialogue box for examine/use/pick_up. */
  text?: string;
  hungerDelta?: number;
  healthDelta?: number;
}

export interface WorldObject {
  readonly id: ObjectId;
  readonly category: ObjectCategory;
  label: string;
  description: string;
  /** Audio is a WorldObject property, not a room-level system. */
  audio?: AudioSpec;
  tags: string[];
  tombstoned: boolean;
  /** Asset taxonomy reference. The LLM selects from the catalog, never invents ids. */
  assetId?: string;
  /** Tile anchor in the room. Absent for non-physical objects (ambient). */
  position?: GridPos;
  facing?: Facing;
  /** Blocks the walkable grid at its position. */
  solid?: boolean;
  interaction?: ObjectInteraction;
  /** For category 'npc' — link to the persistent character roster. */
  characterId?: CharacterId;
  /** A line this NPC may say ambiently while the player is in the room. */
  ambientLine?: string;
}

export interface AudioSpec {
  ambientLoop?: string;
  interactSound?: string;
  volume: number; // 0–1
}
