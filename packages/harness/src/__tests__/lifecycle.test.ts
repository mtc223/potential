import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { LifeSimDb } from "../db/life-sim-db.js";
import { startLife, endLife, clearLife, hasResumableLife } from "../life/lifecycle.js";
import { insertRoom } from "../db/room-store.js";
import { upsertCharacter, getCharacter, getActiveCharacters, setCharacterStatus } from "../db/character-store.js";
import { loadLifeContext } from "../db/life-context-store.js";
import { makeRoom, makeCharacter, makeCharacterId } from "./fixtures.js";

let testDb: LifeSimDb;

beforeEach(() => {
  testDb = new LifeSimDb(`test-${crypto.randomUUID()}`);
});

afterEach(async () => {
  await testDb.delete();
});

const startParams = {
  playerName: "Rae",
  birthDate: "1985-06-15",
  era: "modern" as const,
  natureStats: { curiosity: 60, resilience: 50, empathy: 55, ambition: 40, creativity: 65 },
};

describe("startLife", () => {
  it("creates identity and context records", async () => {
    const context = await startLife(startParams, testDb);

    expect(context.playerName).toBe("Rae");
    expect(context.playerAgeYears).toBe(0);
    expect(context.worldDate).toBe("1985-06-15");
    expect(context.deceased).toBe(false);

    const identity = await testDb.currentLife.get(1);
    expect(identity?.name).toBe("Rae");
    expect(await hasResumableLife(testDb)).toBe(true);
  });

  it("wipes all data from a previous life", async () => {
    await startLife(startParams, testDb);
    await insertRoom(makeRoom(), testDb);
    await upsertCharacter(makeCharacter(), testDb);

    await startLife({ ...startParams, playerName: "Niko" }, testDb);

    expect(await testDb.rooms.count()).toBe(0);
    expect(await testDb.characters.count()).toBe(0);
    const context = await loadLifeContext(testDb);
    expect(context?.playerName).toBe("Niko");
  });
});

describe("endLife", () => {
  it("marks the life deceased but retains data for the legacy screen", async () => {
    await startLife(startParams, testDb);
    await insertRoom(makeRoom(), testDb);

    const ended = await endLife("old age", testDb);

    expect(ended.deceased).toBe(true);
    expect(ended.causeOfDeath).toBe("old age");
    expect(await testDb.rooms.count()).toBe(1); // retained
    expect(await hasResumableLife(testDb)).toBe(false);
  });

  it("throws when no life is active", async () => {
    await expect(endLife("nothing", testDb)).rejects.toThrow("no active life");
  });
});

describe("clearLife", () => {
  it("empties all four tables", async () => {
    await startLife(startParams, testDb);
    await insertRoom(makeRoom(), testDb);
    await upsertCharacter(makeCharacter(), testDb);

    await clearLife(testDb);

    expect(await testDb.rooms.count()).toBe(0);
    expect(await testDb.currentLife.count()).toBe(0);
    expect(await testDb.characters.count()).toBe(0);
    expect(await testDb.lifeContext.count()).toBe(0);
  });
});

describe("character store", () => {
  it("round-trips a character", async () => {
    const character = makeCharacter({ name: "Marcus" });
    await upsertCharacter(character, testDb);
    const loaded = await getCharacter(character.id, testDb);
    expect(loaded?.name).toBe("Marcus");
  });

  it("preserves firstMetAtSequence on update", async () => {
    const character = makeCharacter({ firstMetAtSequence: 3 });
    await upsertCharacter(character, testDb);

    await upsertCharacter({ ...character, firstMetAtSequence: 99, intent: "new intent" }, testDb);

    const loaded = await getCharacter(character.id, testDb);
    expect(loaded?.firstMetAtSequence).toBe(3);
    expect(loaded?.intent).toBe("new intent");
  });

  it("filters active characters", async () => {
    await upsertCharacter(makeCharacter({ status: "active" }), testDb);
    await upsertCharacter(makeCharacter({ status: "inactive" }), testDb);

    const active = await getActiveCharacters(testDb);
    expect(active).toHaveLength(1);
    expect(active[0]?.status).toBe("active");
  });

  it("transitions status but never deletes", async () => {
    const character = makeCharacter();
    await upsertCharacter(character, testDb);

    await setCharacterStatus(character.id, "deceased", testDb);

    const loaded = await getCharacter(character.id, testDb);
    expect(loaded?.status).toBe("deceased");
    expect(await testDb.characters.count()).toBe(1);
  });

  it("throws on status transition for unknown character", async () => {
    await expect(setCharacterStatus(makeCharacterId(), "blocked", testDb)).rejects.toThrow(
      "not found",
    );
  });
});
