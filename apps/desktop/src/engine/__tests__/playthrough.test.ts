import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { LifeSimDb, getTailRoom, loadLifeContext, getAllCharacters } from "@potential/harness";
import { MockAdapter } from "@potential/agent";
import { GAME_CONFIG, type Room, type WorldObject } from "@potential/shared";
import { GameEngine } from "../engine.js";

/**
 * Phase 3 — issue #15 (10-room smoke) and #16 (100-room stress with
 * compression quality audit). Runs on MockAdapter in CI; the same engine
 * drives real-key playthroughs.
 */

let db: LifeSimDb;
let engine: GameEngine;

beforeEach(() => {
  db = new LifeSimDb(`test-${crypto.randomUUID()}`);
  engine = new GameEngine(new MockAdapter(), db);
});

afterEach(async () => {
  await db.delete();
});

const startParams = {
  playerName: "Rae",
  birthDate: "1985-06-15",
  era: "modern" as const,
  natureStats: { curiosity: 70, resilience: 40, empathy: 60, ambition: 30, creativity: 80 },
};

function must<T>(value: T | null | undefined, label = "value"): T {
  if (value === null || value === undefined) {
    throw new Error(`${label} unexpectedly missing`);
  }
  return value;
}

function currentRoom(): Room {
  return must(engine.currentRoom, "currentRoom");
}

function findNpc(room: Room): WorldObject | undefined {
  return [...room.objects.values()].find((o) => o.characterId !== undefined);
}

describe("10-room end-to-end smoke test (#15)", () => {
  it("plays a life through 10 rooms with intact invariants", async () => {
    const birth = await engine.startNewLife(startParams);
    expect(birth.sequenceIndex).toBe(0);
    expect(birth.previousRoomId).toBeNull();
    expect(birth.objects.size).toBeGreaterThan(0);

    for (let i = 0; i < 9; i++) {
      // Touch the world a little each room so events flow into compression.
      const interactable = [...currentRoom().objects.values()].find(
        (o) => o.interaction?.type === "examine",
      );
      if (interactable !== undefined) {
        await engine.interactWith(interactable, "examine");
      }
      const npc = findNpc(currentRoom());
      if (npc !== undefined) {
        const { response } = await engine.talkTo(npc, "Hello there.");
        expect(response.dialogue.length).toBeGreaterThan(0);
      }
      const next = await engine.transition();
      expect(next.sequenceIndex).toBe(i + 1);
    }

    // Linked list invariants: 9 exited rooms persisted, all linked.
    const persisted = await db.rooms.orderBy("sequenceIndex").toArray();
    expect(persisted).toHaveLength(9);
    for (let i = 0; i < persisted.length; i++) {
      const room = must(persisted[i], `room ${String(i)}`);
      expect(room.sequenceIndex).toBe(i);
      expect(room.summary).not.toBeNull();
      expect(room.exitedAt).not.toBeNull();
      if (i > 0) {
        expect(room.previousRoomId).toBe(must(persisted[i - 1]).id);
      }
      if (i < persisted.length - 1) {
        expect(room.nextRoomId).toBe(must(persisted[i + 1]).id);
      } else {
        // The persisted tail points forward to nothing yet — the live room
        // is in memory only until its own exit.
        expect(room.nextRoomId).toBeNull();
      }
    }

    // The current (10th) room is in memory, not persisted.
    expect(currentRoom().sequenceIndex).toBe(9);
    expect(currentRoom().summary).toBeNull();

    // Context advanced: one compressed entry per exited room, time moved.
    const context = must(await loadLifeContext(db), "lifeContext");
    expect(context.compressedHistory).toHaveLength(9);
    expect(context.playerAgeYears).toBeGreaterThan(0);
    expect(new Date(context.worldDate).getTime()).toBeGreaterThan(
      new Date(startParams.birthDate).getTime(),
    );

    // Characters persisted with roster semantics.
    const roster = await getAllCharacters(db);
    expect(roster.length).toBeGreaterThan(0);
    for (const character of roster) {
      expect(character.firstMetAtSequence).toBeLessThanOrEqual(character.lastSeenAtSequence);
    }
  });

  it("crying records an event and the care response feeds the baby", async () => {
    await engine.startNewLife(startParams);
    const before = must(engine.context, "context").hunger;
    engine.cry();
    const after = must(engine.context, "context");
    expect(after.hunger).toBeGreaterThanOrEqual(before);
    expect(currentRoom().events.some((e) => e.playerChoice === "cry")).toBe(true);
  });

  it("the time dial persists and feeds candidate generation", async () => {
    await engine.startNewLife(startParams);
    await engine.setTimeDial("year");
    expect(must(await loadLifeContext(db), "ctx").preferredRoomDuration).toBe("year");

    const mock = new MockAdapter();
    let sawDial = false;
    engine.adapter.complete = (req): Promise<string> => {
      if (req.fn === "generate_candidates") sawDial = req.system.task.includes('TIME DIAL') && req.system.task.includes('"year"');
      return mock.complete(req);
    };
    await engine.transition();
    expect(sawDial).toBe(true);

    await engine.setTimeDial(undefined);
    expect(must(await loadLifeContext(db), "ctx").preferredRoomDuration).toBeUndefined();
  });

  it("a failed silent character update never aborts the transition", async () => {
    await engine.startNewLife(startParams);
    const mock = new MockAdapter();
    engine.adapter.complete = (req): Promise<string> =>
      req.fn === "update_character_state"
        ? Promise.reject(new Error("character update outage"))
        : mock.complete(req);

    // Character updates run concurrently with candidate selection; their
    // failure degrades gracefully instead of rejecting the transition.
    const next = await engine.transition();
    expect(next.sequenceIndex).toBe(1);
  });

  it("resumes a transition that failed after the exit was persisted", async () => {
    await engine.startNewLife(startParams);
    const birthId = currentRoom().id;

    // Adapter that dies on room fabrication once, then recovers.
    const mock = new MockAdapter();
    let failures = 1;
    engine.adapter.complete = (req): Promise<string> => {
      if (req.fn === "prompt_room" && failures > 0) {
        failures -= 1;
        return Promise.reject(new Error("simulated API outage"));
      }
      return mock.complete(req);
    };

    await expect(engine.transition()).rejects.toThrow("simulated API outage");
    // The exit persisted: in-memory room is marked exited, context advanced.
    expect(currentRoom().id).toBe(birthId);
    expect(currentRoom().exitedAt).not.toBeNull();
    expect(must(await loadLifeContext(db), "ctx").compressedHistory).toHaveLength(1);

    // Retry resumes at candidate generation — no double exit, one new room.
    const next = await engine.transition();
    expect(next.sequenceIndex).toBe(1);
    expect(next.previousRoomId).toBe(birthId);
    expect(must(await loadLifeContext(db), "ctx").compressedHistory).toHaveLength(1);
  });

  it("replaces a pre-verbal player's speech with babble before it reaches the world", async () => {
    await engine.startNewLife(startParams); // newborn — age 0
    const npc = must(findNpc(currentRoom()), "npc in birth room");
    const { spokenText } = await engine.talkTo(npc, "Hello there, fine sir.");
    expect(spokenText.length).toBeGreaterThan(0);
    expect(spokenText.toLowerCase()).not.toContain("hello");
    // The event log records what came out of the mouth, not the typed text.
    const event = must(currentRoom().events.find((e) => e.type === "dialogue"), "dialogue event");
    expect(event.playerChoice).toBe(spokenText.slice(0, 200));
  });

  it("prefers the model's phonetic babble over the local fallback", async () => {
    await engine.startNewLife(startParams); // newborn — age 0
    const npc = must(findNpc(currentRoom()), "npc in birth room");
    const mock = new MockAdapter();
    engine.adapter.complete = (req): Promise<string> =>
      req.fn === "character_response"
        ? Promise.resolve(
            '{"spokenBabble": "Ma-ma!", "dialogue": "Yes! Mama is right here!", "mood": "melting", "endsConversation": false}',
          )
        : mock.complete(req);
    const { spokenText, response } = await engine.talkTo(npc, "mama");
    expect(spokenText).toBe("Ma-ma!");
    expect(response.dialogue).toContain("Mama");
    const event = must(
      currentRoom().events.filter((e) => e.type === "dialogue").at(-1),
      "dialogue event",
    );
    expect(event.playerChoice).toBe("Ma-ma!");
  });

  it("records dialogue and interactions as room events that reach compression", async () => {
    await engine.startNewLife(startParams);
    const npc = must(findNpc(currentRoom()), "npc in birth room");
    await engine.talkTo(npc, "Hi!");
    expect(currentRoom().events.some((e) => e.type === "dialogue")).toBe(true);

    await engine.transition();
    const tail = must(await getTailRoom(db), "tail room");
    expect(tail.events.some((e) => e.type === "dialogue")).toBe(true);
  });
});

describe("100-room stress test with compression audit (#16)", () => {
  it("survives 100 transitions with bounded growth and intact memory", async () => {
    await engine.startNewLife(startParams);

    for (let i = 0; i < 100; i++) {
      await engine.transition();
    }

    const context = must(await loadLifeContext(db), "lifeContext");

    // Compression audit: every room compressed, exactly once.
    expect(context.compressedHistory).toHaveLength(100);
    const sequences = context.compressedHistory.map((c) => c.sequenceIndex);
    expect(new Set(sequences).size).toBe(100);

    // LifeEvents are a strict subset and never lost.
    expect(context.lifeEvents.length).toBeGreaterThan(0);
    expect(context.lifeEvents.length).toBeLessThan(40);
    for (const event of context.lifeEvents) {
      expect(context.compressedHistory.some((c) => c.roomId === event.roomId)).toBe(true);
    }

    // Narratives stay within the configured budget (no runaway strings).
    for (const entry of context.compressedHistory) {
      expect(entry.narrative.length).toBeLessThanOrEqual(GAME_CONFIG.compression.maxNarrativeChars);
    }

    // Emotional trajectory tracks 1:1 with compressed rooms.
    expect(context.emotionalTrajectory).toHaveLength(100);

    // World clock advanced monotonically and age follows it.
    expect(context.playerAgeYears).toBeGreaterThan(1);
    const dates = context.compressedHistory.map((c) => new Date(c.worldDate).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(must(dates[i])).toBeGreaterThanOrEqual(must(dates[i - 1]));
    }

    // Linked list: 100 persisted rooms, fully traversable end to end.
    const rooms = await db.rooms.orderBy("sequenceIndex").toArray();
    expect(rooms).toHaveLength(100);
    let walked = 0;
    let cursor: Room | undefined = rooms[0];
    while (cursor !== undefined && cursor.nextRoomId !== null) {
      const nextId: string = cursor.nextRoomId;
      walked += 1;
      cursor = rooms.find((r) => r.id === nextId);
    }
    expect(walked).toBe(99);

    // Roster: characters reused across rooms, never deleted, statuses sane.
    const roster = await getAllCharacters(db);
    expect(roster.length).toBeGreaterThan(0);
    expect(roster.length).toBeLessThan(60); // reuse happening, not 100+ strangers
  }, 60000);

  it("hunger and health stay clamped to valid ranges across a long life", async () => {
    await engine.startNewLife(startParams);
    for (let i = 0; i < 30; i++) {
      await engine.transition();
      const context = must(await loadLifeContext(db), "lifeContext");
      expect(context.hunger).toBeGreaterThanOrEqual(0);
      expect(context.hunger).toBeLessThanOrEqual(1);
      expect(context.health).toBeGreaterThanOrEqual(0);
      expect(context.health).toBeLessThanOrEqual(1);
    }
  }, 30000);
});
