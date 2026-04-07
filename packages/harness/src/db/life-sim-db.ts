import Dexie, { type Table } from "dexie";
import type { PlayerIdentity, Room } from "@potential/shared";

/**
 * StoredCurrentLife — PlayerIdentity keyed with a fixed id for single-record storage.
 *
 * `id: 1` is always the sole record. Only one life is active at a time.
 * On life end (death), the `currentLife` table is cleared alongside `rooms`.
 *
 * On app load: presence of a `currentLife` record signals a resumable life;
 * absence signals character creation. Both paths are handled by the session layer, not here.
 */
export type StoredCurrentLife = PlayerIdentity & { readonly id: 1 };

/**
 * LifeSimDb — Dexie schema for Life Simulator.
 *
 * Version history:
 *   v1 — initial schema: rooms (append-only singly-linked list) + currentLife (single-record)
 *
 * Any structural change (new table, added index, removed index) MUST increment the version
 * and supply an explicit migration function via `.upgrade()`.
 *
 * IndexedDB is a crash-recovery buffer, not a multi-life archive.
 * On death: clear both tables. Rooms are never deleted mid-life.
 *
 * Room.objects is Map<ObjectId, WorldObject>. IndexedDB supports Map via the Structured Clone
 * Algorithm — no serialization shim required.
 */
export class LifeSimDb extends Dexie {
  /**
   * Append-only singly-linked list of rooms for the active life.
   *
   * Indexed fields:
   *   - id           (primary key)
   *   - sequenceIndex (ordered traversal)
   *   - previousRoomId (linked-list pointer; null for birth room)
   *   - exitedAt      (null while current room; set on transition)
   *
   * Rooms are never updated after creation except: `summary` and `exitedAt` (written on exit).
   * All other mutations are forbidden to preserve the singly-linked list invariant (#3).
   */
  rooms!: Table<Room, Room["id"]>;

  /**
   * Single-record store for the active player identity.
   * Always keyed at id=1. Only one record exists at a time.
   */
  currentLife!: Table<StoredCurrentLife, 1>;

  constructor() {
    super("LifeSimulator");

    // v1 — locked. Future structural changes require .version(2).stores({...}).upgrade().
    this.version(1).stores({
      rooms: "id, sequenceIndex, previousRoomId, exitedAt",
      currentLife: "id",
    });
  }
}

export const db = new LifeSimDb();
