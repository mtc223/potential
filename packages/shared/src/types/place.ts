import type { RoomSizeTemplate } from "./room.js";

/**
 * PlaceRecord — a remembered recurring location. The room list is
 * append-only and never revisited (open-path), but PLACES persist: your
 * childhood home looks like your childhood home every time life returns
 * there. prompt_room receives known places and reproduces their layout,
 * evolving only small details.
 */
export interface PlaceRecord {
  /** Stable slug declared by the room script, e.g. "home_nursery". */
  readonly id: string;
  label: string;
  sizeTemplate: RoomSizeTemplate;
  floorAssetId: string;
  wallAssetId: string;
  /** Condensed layout in room-script SET notation: "crib@5,1 rug@5,4 …". */
  layoutScript: string;
  lastSeenSequence: number;
}
