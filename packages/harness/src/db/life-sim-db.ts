import Dexie, { type Table } from "dexie";
import type { Room } from "@potential/shared";

/**
 * LifeSimDb — append-only room store.
 *
 * Rooms are never updated after creation except for:
 * - summary (written on room exit)
 * - exitedAt (timestamp set on transition)
 *
 * All other mutations are forbidden to preserve the singly-linked list invariant.
 */
export class LifeSimDb extends Dexie {
  rooms!: Table<Room>;

  constructor() {
    super("LifeSimulator");
    this.version(1).stores({
      rooms: "id, sequenceIndex, previousRoomId, exitedAt",
    });
  }
}

export const db = new LifeSimDb();
