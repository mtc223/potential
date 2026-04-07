import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Room, RoomId } from "@potential/shared";
import { LifeSimDb } from "../db/life-sim-db.js";
import { insertRoom, getTailRoom } from "../db/room-store.js";
import { LinkedListError } from "../db/errors.js";

// Each test gets a fresh DB with a unique name to avoid cross-test contamination.
let testDb: LifeSimDb;

beforeEach(() => {
  testDb = new LifeSimDb(`test-${crypto.randomUUID()}`);
});

afterEach(async () => {
  await testDb.delete();
});

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeRoomId(): RoomId {
  return `room_${crypto.randomUUID()}` as RoomId;
}

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: makeRoomId(),
    sequenceIndex: 0,
    previousRoomId: null,
    nextRoomId: null,
    label: "Test Room",
    description: "A room for testing.",
    objects: new Map(),
    summary: "A quiet beginning.",
    era: "modern",
    createdAt: Date.now(),
    exitedAt: Date.now() + 1000,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

describe("getTailRoom", () => {
  it("returns null when the table is empty", async () => {
    expect(await getTailRoom(testDb)).toBeNull();
  });

  it("returns the birth room after it is inserted", async () => {
    const birth = makeRoom();
    await insertRoom(birth, testDb);
    const tail = await getTailRoom(testDb);
    expect(tail?.id).toBe(birth.id);
  });

  it("returns the latest room after sequential inserts", async () => {
    const birth = makeRoom({ id: makeRoomId() });
    await insertRoom(birth, testDb);

    const second = makeRoom({
      id: makeRoomId(),
      sequenceIndex: 1,
      previousRoomId: birth.id,
    });
    await insertRoom(second, testDb);

    const tail = await getTailRoom(testDb);
    expect(tail?.id).toBe(second.id);
    expect(tail?.nextRoomId).toBeNull();
  });
});

describe("insertRoom — happy path", () => {
  it("inserts the birth room into an empty table", async () => {
    const birth = makeRoom();
    await insertRoom(birth, testDb);
    const count = await testDb.rooms.count();
    expect(count).toBe(1);
  });

  it("sets nextRoomId on the tail after inserting a subsequent room", async () => {
    const birth = makeRoom({ id: makeRoomId() });
    await insertRoom(birth, testDb);

    const second = makeRoom({
      id: makeRoomId(),
      sequenceIndex: 1,
      previousRoomId: birth.id,
    });
    await insertRoom(second, testDb);

    const updatedBirth = await testDb.rooms.get(birth.id);
    expect(updatedBirth?.nextRoomId).toBe(second.id);
  });

  it("supports forward traversal via nextRoomId pointers", async () => {
    const ids = [makeRoomId(), makeRoomId(), makeRoomId()] as [RoomId, RoomId, RoomId];

    await insertRoom(makeRoom({ id: ids[0] }), testDb);
    await insertRoom(makeRoom({ id: ids[1], sequenceIndex: 1, previousRoomId: ids[0] }), testDb);
    await insertRoom(makeRoom({ id: ids[2], sequenceIndex: 2, previousRoomId: ids[1] }), testDb);

    // Walk forward from birth.
    const r0 = await testDb.rooms.get(ids[0]);
    const r1 = r0?.nextRoomId != null ? await testDb.rooms.get(r0.nextRoomId) : null;
    const r2 = r1?.nextRoomId != null ? await testDb.rooms.get(r1.nextRoomId) : null;

    expect(r0?.id).toBe(ids[0]);
    expect(r1?.id).toBe(ids[1]);
    expect(r2?.id).toBe(ids[2]);
    expect(r2?.nextRoomId).toBeNull();
  });

  it("supports backward traversal via previousRoomId pointers", async () => {
    const ids = [makeRoomId(), makeRoomId(), makeRoomId()] as [RoomId, RoomId, RoomId];

    await insertRoom(makeRoom({ id: ids[0] }), testDb);
    await insertRoom(makeRoom({ id: ids[1], sequenceIndex: 1, previousRoomId: ids[0] }), testDb);
    await insertRoom(makeRoom({ id: ids[2], sequenceIndex: 2, previousRoomId: ids[1] }), testDb);

    const tail = await getTailRoom(testDb);
    const prev = tail?.previousRoomId != null ? await testDb.rooms.get(tail.previousRoomId) : null;
    const birth = prev?.previousRoomId != null ? await testDb.rooms.get(prev.previousRoomId) : null;

    expect(tail?.id).toBe(ids[2]);
    expect(prev?.id).toBe(ids[1]);
    expect(birth?.id).toBe(ids[0]);
    expect(birth?.previousRoomId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Invariant violations
// ---------------------------------------------------------------------------

describe("insertRoom — invariant violations", () => {
  it("rejects birth room when table is non-empty", async () => {
    await insertRoom(makeRoom({ id: makeRoomId() }), testDb);
    const secondBirth = makeRoom({ id: makeRoomId(), previousRoomId: null, sequenceIndex: 0 });
    await expect(insertRoom(secondBirth, testDb)).rejects.toThrow(LinkedListError);
  });

  it("rejects birth room with sequenceIndex !== 0", async () => {
    const room = makeRoom({ previousRoomId: null, sequenceIndex: 5 });
    await expect(insertRoom(room, testDb)).rejects.toThrow(LinkedListError);
  });

  it("rejects insert when previousRoomId does not match tail", async () => {
    await insertRoom(makeRoom({ id: makeRoomId() }), testDb);
    const wrong = makeRoom({
      id: makeRoomId(),
      sequenceIndex: 1,
      previousRoomId: "room_does-not-exist" as RoomId,
    });
    await expect(insertRoom(wrong, testDb)).rejects.toThrow(LinkedListError);
  });

  it("rejects insert when sequenceIndex is wrong", async () => {
    const birth = makeRoom({ id: makeRoomId() });
    await insertRoom(birth, testDb);
    const wrong = makeRoom({
      id: makeRoomId(),
      sequenceIndex: 99,
      previousRoomId: birth.id,
    });
    await expect(insertRoom(wrong, testDb)).rejects.toThrow(LinkedListError);
  });

  it("rejects insert when summary is null", async () => {
    const room = makeRoom({ summary: null });
    await expect(insertRoom(room, testDb)).rejects.toThrow(LinkedListError);
  });

  it("rejects insert when exitedAt is null", async () => {
    const room = makeRoom({ exitedAt: null });
    await expect(insertRoom(room, testDb)).rejects.toThrow(LinkedListError);
  });

  it("rejects insert when nextRoomId is non-null on the incoming room", async () => {
    const id = makeRoomId();
    const room = makeRoom({ nextRoomId: id });
    await expect(insertRoom(room, testDb)).rejects.toThrow(LinkedListError);
  });
});

// ---------------------------------------------------------------------------
// Transaction rollback
// ---------------------------------------------------------------------------

describe("insertRoom — transaction rollback", () => {
  it("leaves the table unchanged when a validation fails mid-insert", async () => {
    const birth = makeRoom({ id: makeRoomId() });
    await insertRoom(birth, testDb);

    const countBefore = await testDb.rooms.count();

    // This will fail because previousRoomId doesn't match the tail.
    const bad = makeRoom({
      id: makeRoomId(),
      sequenceIndex: 1,
      previousRoomId: "room_wrong" as RoomId,
    });

    await expect(insertRoom(bad, testDb)).rejects.toThrow(LinkedListError);

    // Table must be unchanged — birth room still present, no partial write.
    const countAfter = await testDb.rooms.count();
    expect(countAfter).toBe(countBefore);

    // Birth room's nextRoomId must still be null — not partially updated.
    const updatedBirth = await testDb.rooms.get(birth.id);
    expect(updatedBirth?.nextRoomId).toBeNull();
  });
});
