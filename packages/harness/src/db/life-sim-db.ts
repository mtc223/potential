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
 *   v2 — rooms: add nextRoomId index (enables forward traversal; null = current tail)
 *
 * Any structural change (new table, added index, removed index) MUST increment the version.
 * Data migrations require an explicit `.upgrade()` callback.
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
   *   - id             (primary key)
   *   - sequenceIndex  (ordered traversal; used for getTailRoom)
   *   - previousRoomId (backward pointer; null for birth room)
   *   - nextRoomId     (forward pointer; null for current tail)
   *   - exitedAt       (null while current room; set on transition)
   *
   * Rooms are persisted only after exit (summary + exitedAt must be set).
   * The sole post-insert mutation: nextRoomId is set when the next room is inserted.
   */
  rooms!: Table<Room, Room["id"]>;

  /**
   * Single-record store for the active player identity.
   * Always keyed at id=1. Only one record exists at a time.
   */
  currentLife!: Table<StoredCurrentLife, 1>;

  /**
   * @param name - DB name. Override in tests for isolation (default: "LifeSimulator").
   */
  constructor(name = "LifeSimulator") {
    super(name);

    // v1 — original schema.
    this.version(1).stores({
      rooms: "id, sequenceIndex, previousRoomId, exitedAt",
      currentLife: "id",
    });

    // v2 — add nextRoomId index for forward traversal.
    // No data migration needed: adding an index is handled automatically by IndexedDB.
    this.version(2).stores({
      rooms: "id, sequenceIndex, previousRoomId, exitedAt, nextRoomId",
      currentLife: "id",
    });
  }
}

export const db = new LifeSimDb();
