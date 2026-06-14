import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { PlayerStats, Room, RoomId } from "@potential/shared";
import { LifeSimDb, type StoredCurrentLife } from "../db/life-sim-db.js";

const baseLayout: Room["layout"] = {
  widthTiles: 13,
  heightTiles: 8,
  sizeTemplate: "medium",
  floorAssetId: "floor_wood",
  wallAssetId: "wall_plaster",
  entryTile: { col: 0, row: 4 },
  exitTile: { col: 12, row: 4 },
};

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: `room_test-${crypto.randomUUID()}` as RoomId,
    sequenceIndex: 0,
    previousRoomId: null,
    nextRoomId: null,
    label: "Test Room",
    description: "A test room.",
    situation: "The room is quiet.",
    objects: new Map(),
    layout: baseLayout,
    duration: "day",
    playerAgeYears: 0,
    worldDate: "1985-06-15",
    events: [],
    summary: null,
    era: "modern",
    createdAt: Date.now(),
    exitedAt: null,
    ...overrides,
  };
}

let testDb: LifeSimDb;

beforeEach(() => {
  testDb = new LifeSimDb(`test-${crypto.randomUUID()}`);
});

afterEach(async () => {
  await testDb.delete();
});

// ---------------------------------------------------------------------------
// Schema structure
// ---------------------------------------------------------------------------

describe("LifeSimDb — schema structure", () => {
  it("opens successfully", async () => {
    await testDb.open();
    expect(testDb.isOpen()).toBe(true);
  });

  it("exposes a rooms table", () => {
    expect(testDb.rooms).toBeDefined();
  });

  it("exposes a currentLife table", () => {
    expect(testDb.currentLife).toBeDefined();
  });

  it("rooms table starts empty", async () => {
    expect(await testDb.rooms.count()).toBe(0);
  });

  it("currentLife table starts empty", async () => {
    expect(await testDb.currentLife.count()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// currentLife — single-record semantics
// ---------------------------------------------------------------------------

const mockStats: PlayerStats = {
  nature: { curiosity: 50, resilience: 50, empathy: 50, ambition: 50, creativity: 50 },
  nurture: { curiosity: 50, resilience: 50, empathy: 50, ambition: 50, creativity: 50 },
};

const mockLife: StoredCurrentLife = {
  id: 1,
  name: "Alex",
  age: 0,
  birthEra: "modern",
  stats: mockStats,
};

describe("LifeSimDb — currentLife table", () => {
  it("stores a StoredCurrentLife record at id=1", async () => {
    await testDb.currentLife.add(mockLife);
    const record = await testDb.currentLife.get(1);
    expect(record?.name).toBe("Alex");
    expect(record?.birthEra).toBe("modern");
  });

  it("retrieves all PlayerIdentity fields correctly", async () => {
    await testDb.currentLife.add(mockLife);
    const record = await testDb.currentLife.get(1);
    expect(record?.age).toBe(0);
    expect(record?.stats.nature.curiosity).toBe(50);
    expect(record?.stats.nurture.resilience).toBe(50);
  });

  it("only ever holds one record (overwrite via put)", async () => {
    await testDb.currentLife.put(mockLife);
    await testDb.currentLife.put({ ...mockLife, name: "Jordan" });
    expect(await testDb.currentLife.count()).toBe(1);
    const record = await testDb.currentLife.get(1);
    expect(record?.name).toBe("Jordan");
  });

  it("returns undefined when no life is active (app-load resume check)", async () => {
    const record = await testDb.currentLife.get(1);
    expect(record).toBeUndefined();
  });

  it("clears completely after life end", async () => {
    await testDb.currentLife.add(mockLife);
    await testDb.currentLife.clear();
    expect(await testDb.currentLife.count()).toBe(0);
    expect(await testDb.currentLife.get(1)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// rooms table — basic storage (invariant enforcement is tested in room-store.test.ts)
// ---------------------------------------------------------------------------

describe("LifeSimDb — rooms table", () => {
  it("stores and retrieves a room by id", async () => {
    const room = makeRoom({ label: "Birth Room", description: "The beginning.", summary: "It begins.", exitedAt: Date.now() + 1000 });
    await testDb.rooms.add(room);
    const retrieved = await testDb.rooms.get(room.id);
    expect(retrieved?.id).toBe(room.id);
    expect(retrieved?.sequenceIndex).toBe(0);
    expect(retrieved?.previousRoomId).toBeNull();
    expect(retrieved?.nextRoomId).toBeNull();
  });

  it("preserves Map<ObjectId, WorldObject> via Structured Clone", async () => {
    const objects = new Map([
      ["obj_npc1" as const, { id: "obj_npc1" as const, category: "npc" as const, label: "Guard", description: "", tags: [], tombstoned: false }],
    ]);
    const room = makeRoom({ label: "Room with NPC", objects, era: "medieval", summary: "A guard stands watch.", exitedAt: Date.now() + 500 });
    await testDb.rooms.add(room);
    const retrieved = await testDb.rooms.get(room.id);
    expect(retrieved?.objects).toBeInstanceOf(Map);
    expect(retrieved?.objects.get("obj_npc1")?.label).toBe("Guard");
  });
});

// ---------------------------------------------------------------------------
// DB isolation — name parameter
// ---------------------------------------------------------------------------

describe("LifeSimDb — constructor name param", () => {
  it("two instances with different names are independent", async () => {
    const dbA = new LifeSimDb(`test-a-${crypto.randomUUID()}`);
    const dbB = new LifeSimDb(`test-b-${crypto.randomUUID()}`);

    await dbA.currentLife.add(mockLife);

    expect(await dbA.currentLife.count()).toBe(1);
    expect(await dbB.currentLife.count()).toBe(0);

    await dbA.delete();
    await dbB.delete();
  });
});
