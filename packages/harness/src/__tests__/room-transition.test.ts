import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { LifeSimDb } from "../db/life-sim-db.js";
import { exitRoom, advanceContext, RoomTransitionError } from "../life/room-transition.js";
import { loadLifeContext, saveLifeContext } from "../db/life-context-store.js";
import { getTailRoom } from "../db/room-store.js";
import { makeRoom, makeLifeContext, makeCompressed } from "./fixtures.js";

let testDb: LifeSimDb;

beforeEach(() => {
  testDb = new LifeSimDb(`test-${crypto.randomUUID()}`);
});

afterEach(async () => {
  await testDb.delete();
});

function currentRoom(overrides = {}) {
  // A room still being played: no summary, not exited.
  return makeRoom({ summary: null, exitedAt: null, ...overrides });
}

describe("exitRoom — compression trigger", () => {
  it("compresses, persists the room, and returns updated context", async () => {
    const room = currentRoom();
    const context = makeLifeContext();
    const compress = vi.fn().mockResolvedValue(makeCompressed(room));

    const result = await exitRoom(room, context, compress, testDb);

    expect(compress).toHaveBeenCalledOnce();
    expect(result.exitedRoom.summary).toBe("A quiet day passed.");
    expect(result.exitedRoom.exitedAt).not.toBeNull();

    const tail = await getTailRoom(testDb);
    expect(tail?.id).toBe(room.id);
    expect(tail?.summary).toBe("A quiet day passed.");
  });

  it("fires compression BEFORE the room is persisted", async () => {
    const room = currentRoom();
    const context = makeLifeContext();
    const compress = vi.fn().mockImplementation(async () => {
      // At compression time the room must not yet be in the list.
      expect(await getTailRoom(testDb)).toBeNull();
      return makeCompressed(room);
    });

    await exitRoom(room, context, compress, testDb);
    expect(compress).toHaveBeenCalledOnce();
  });

  it("appends the compressed summary to context history and persists it", async () => {
    const room = currentRoom();
    const context = makeLifeContext();
    const compress = vi.fn().mockResolvedValue(makeCompressed(room, { emotionalValence: -0.4 }));

    const { updatedContext } = await exitRoom(room, context, compress, testDb);

    expect(updatedContext.compressedHistory).toHaveLength(1);
    expect(updatedContext.emotionalTrajectory).toEqual([-0.4]);

    const persisted = await loadLifeContext(testDb);
    expect(persisted?.compressedHistory).toHaveLength(1);
  });

  it("records LifeEvents in the permanent anchor list", async () => {
    const room = currentRoom();
    const context = makeLifeContext();
    const compress = vi.fn().mockResolvedValue(
      makeCompressed(room, { isLifeEvent: true, milestone: "first_day_of_school" }),
    );

    const { updatedContext } = await exitRoom(room, context, compress, testDb);

    expect(updatedContext.lifeEvents).toHaveLength(1);
    expect(updatedContext.lifeEvents[0]?.milestone).toBe("first_day_of_school");
    // LifeEvents also appear in the rolling history.
    expect(updatedContext.compressedHistory).toHaveLength(1);
  });

  it("rejects a room that was already exited", async () => {
    const room = makeRoom(); // fixture default has summary + exitedAt set
    const context = makeLifeContext();
    const compress = vi.fn();

    await expect(exitRoom(room, context, compress, testDb)).rejects.toThrow(RoomTransitionError);
    expect(compress).not.toHaveBeenCalled();
  });

  it("rejects transitions after death", async () => {
    const room = currentRoom();
    const context = makeLifeContext({ deceased: true });
    const compress = vi.fn();

    await expect(exitRoom(room, context, compress, testDb)).rejects.toThrow(RoomTransitionError);
    expect(compress).not.toHaveBeenCalled();
  });

  it("does not persist the room if compression fails", async () => {
    const room = currentRoom();
    const context = makeLifeContext();
    const compress = vi.fn().mockRejectedValue(new Error("LLM unavailable"));

    await expect(exitRoom(room, context, compress, testDb)).rejects.toThrow("LLM unavailable");
    expect(await getTailRoom(testDb)).toBeNull();
  });
});

describe("advanceContext — world clock and survival ticks", () => {
  it("advances age and world date by room duration", () => {
    const room = makeRoom({ duration: "year" });
    const context = makeLifeContext({ playerAgeYears: 5, worldDate: "1990-06-15" });

    const advanced = advanceContext(context, room, makeCompressed(room));

    expect(advanced.playerAgeYears).toBe(6);
    expect(advanced.worldDate).toBe("1991-06-15");
  });

  it("drains hunger with duration but never below the floor", () => {
    const room = makeRoom({ duration: "month" });
    const context = makeLifeContext({ hunger: 1 });

    const advanced = advanceContext(context, room, makeCompressed(room));

    expect(advanced.hunger).toBeLessThan(1);
    expect(advanced.hunger).toBeGreaterThanOrEqual(0.05);
  });

  it("decays health faster when starving", () => {
    const room = makeRoom({ duration: "day" });
    const fed = advanceContext(makeLifeContext({ hunger: 1 }), room, makeCompressed(room));
    const starving = advanceContext(makeLifeContext({ hunger: 0.06 }), room, makeCompressed(room));

    expect(starving.health).toBeLessThan(fed.health);
  });

  it("week+ rooms include off-screen meals — hunger floors at the meal baseline", () => {
    const room = makeRoom({ duration: "month" });
    const context = makeLifeContext({ hunger: 0.1 });

    const advanced = advanceContext(context, room, makeCompressed(room));
    expect(advanced.hunger).toBeGreaterThanOrEqual(0.6);
  });

  it("clamps health at 0", () => {
    const room = makeRoom({ duration: "year" });
    const context = makeLifeContext({ health: 0.001, hunger: 0.01 });

    const advanced = advanceContext(context, room, makeCompressed(room));
    expect(advanced.health).toBe(0);
  });
});

describe("life context store", () => {
  it("round-trips a LifeContext", async () => {
    const context = makeLifeContext({ playerName: "Rae" });
    await saveLifeContext(context, testDb);
    const loaded = await loadLifeContext(testDb);
    expect(loaded).toEqual(context);
  });

  it("returns null when no context is stored", async () => {
    expect(await loadLifeContext(testDb)).toBeNull();
  });
});
