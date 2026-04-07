import type { Room } from "@potential/shared";
import { LinkedListError } from "./errors.js";
import { db as defaultDb, type LifeSimDb } from "./life-sim-db.js";

/**
 * getTailRoom — returns the current tail of the room list (nextRoomId === null),
 * or null if the table is empty.
 *
 * Uses sequenceIndex ordering for O(log n) lookup. The list invariant guarantees
 * the highest sequenceIndex is always the tail.
 */
export async function getTailRoom(dbInstance: LifeSimDb = defaultDb): Promise<Room | null> {
  const tail = await dbInstance.rooms.orderBy("sequenceIndex").last();
  return tail ?? null;
}

/**
 * insertRoom — appends a room to the singly-linked list in a single atomic transaction.
 *
 * Invariants enforced:
 *   - room.summary must be non-null (compression must have run before insert)
 *   - room.exitedAt must be non-null (room must have been exited)
 *   - For birth room (previousRoomId === null): table must be empty, sequenceIndex must be 0
 *   - For subsequent rooms: previousRoomId must match the current tail's id,
 *     sequenceIndex must be tail.sequenceIndex + 1
 *   - room.nextRoomId must be null (caller never sets the forward pointer)
 *
 * On success:
 *   - The current tail's nextRoomId is updated to room.id
 *   - The new room is inserted with nextRoomId: null
 *
 * On any invariant violation: throws LinkedListError and the transaction rolls back.
 * No partial writes are possible — Dexie aborts the entire transaction on throw.
 *
 * @throws LinkedListError
 */
export async function insertRoom(room: Room, dbInstance: LifeSimDb = defaultDb): Promise<void> {
  if (room.summary === null) {
    throw new LinkedListError("insertRoom: room.summary must be non-null (compression must run before insert)");
  }
  if (room.exitedAt === null) {
    throw new LinkedListError("insertRoom: room.exitedAt must be non-null (room must be exited before insert)");
  }
  if (room.nextRoomId !== null) {
    throw new LinkedListError("insertRoom: room.nextRoomId must be null on insert (forward pointer is set by the list, not the caller)");
  }

  await dbInstance.transaction("rw", dbInstance.rooms, async () => {
    const count = await dbInstance.rooms.count();
    const isBirthRoom = room.previousRoomId === null;

    if (isBirthRoom) {
      // Birth room: only valid when the table is empty.
      if (count !== 0) {
        throw new LinkedListError("insertRoom: birth room (previousRoomId: null) rejected — rooms table is not empty");
      }
      if (room.sequenceIndex !== 0) {
        throw new LinkedListError(`insertRoom: birth room must have sequenceIndex 0, got ${String(room.sequenceIndex)}`);
      }
      // No tail to update — insert directly.
      await dbInstance.rooms.add(room);
      return;
    }

    // Subsequent room: validate against the current tail.
    if (count === 0) {
      throw new LinkedListError("insertRoom: cannot insert a non-birth room into an empty table");
    }

    const tail = await dbInstance.rooms.orderBy("sequenceIndex").last();
    if (tail === undefined) {
      throw new LinkedListError("insertRoom: could not read tail room within transaction");
    }

    if (room.previousRoomId !== tail.id) {
      throw new LinkedListError(
        `insertRoom: previousRoomId mismatch — expected "${tail.id}", got "${room.previousRoomId}"`,
      );
    }
    if (room.sequenceIndex !== tail.sequenceIndex + 1) {
      throw new LinkedListError(
        `insertRoom: sequenceIndex mismatch — expected ${String(tail.sequenceIndex + 1)}, got ${String(room.sequenceIndex)}`,
      );
    }

    // Update the tail's forward pointer and insert the new room atomically.
    await dbInstance.rooms.update(tail.id, { nextRoomId: room.id });
    await dbInstance.rooms.add(room);
  });
}
