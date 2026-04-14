import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module before the store is imported so Dexie never touches IndexedDB.
vi.mock("../db/life-sim-db.js", () => ({
  db: {
    rooms: { clear: vi.fn().mockResolvedValue(undefined) },
    currentLife: { clear: vi.fn().mockResolvedValue(undefined) },
  },
}));

import { useSessionStore, initialSessionState } from "./session-store.js";
import { db } from "../db/life-sim-db.js";

const mockDb = db as unknown as {
  rooms: { clear: ReturnType<typeof vi.fn> };
  currentLife: { clear: ReturnType<typeof vi.fn> };
};

const testPlayer = {
  name: "Ada",
  age: 0,
  birthEra: "modern",
  stats: {
    nature: {
      curiosity: 50,
      resilience: 50,
      empathy: 50,
      ambition: 50,
      creativity: 50,
    },
    nurture: {
      curiosity: 50,
      resilience: 50,
      empathy: 50,
      ambition: 50,
      creativity: 50,
    },
  },
};

beforeEach(() => {
  // Reset data fields between tests — do not pass replace=true or actions are wiped.
  useSessionStore.setState({ ...initialSessionState });
  // Reset mock call history.
  mockDb.rooms.clear.mockClear();
  mockDb.currentLife.clear.mockClear();
});

describe("useSessionStore", () => {
  describe("initial state", () => {
    it("starts in character-creation phase with nulled fields", () => {
      const state = useSessionStore.getState();
      expect(state.gamePhase).toBe("character-creation");
      expect(state.currentRoom).toBeNull();
      expect(state.player).toBeNull();
      expect(state.lifeContext).toBeNull();
      expect(state.isGenerating).toBe(false);
    });
  });

  describe("full lifecycle", () => {
    it("startLife → setActiveRoom → updateLifeContext → endLife resets state", async () => {
      const { startLife, setActiveRoom, updateLifeContext, endLife } =
        useSessionStore.getState();

      // startLife transitions to playing and initialises context
      startLife(testPlayer);
      expect(useSessionStore.getState().gamePhase).toBe("playing");
      expect(useSessionStore.getState().player).toEqual(testPlayer);
      expect(useSessionStore.getState().lifeContext).toEqual({ summary: "" });

      // setActiveRoom stores the active room
      const room = {
        id: "room_abc" as const,
        sequenceIndex: 0,
        previousRoomId: null,
        nextRoomId: null,
        label: "Birth room",
        description: "A warm room.",
        objects: new Map(),
        summary: null,
        era: "modern" as const,
        createdAt: Date.now(),
        exitedAt: null,
      };
      setActiveRoom(room);
      expect(useSessionStore.getState().currentRoom).toEqual(room);

      // updateLifeContext stores the compression output
      updateLifeContext({ summary: "Born in a warm room." });
      expect(useSessionStore.getState().lifeContext).toEqual({
        summary: "Born in a warm room.",
      });

      // endLife transitions to dead and clears everything
      await endLife();
      const after = useSessionStore.getState();
      expect(after.gamePhase).toBe("dead");
      expect(after.currentRoom).toBeNull();
      expect(after.player).toBeNull();
      expect(after.lifeContext).toBeNull();
      expect(after.isGenerating).toBe(false);
    });
  });

  describe("endLife()", () => {
    it("clears both Dexie tables", async () => {
      useSessionStore.getState().startLife(testPlayer);
      await useSessionStore.getState().endLife();

      expect(mockDb.rooms.clear).toHaveBeenCalledOnce();
      expect(mockDb.currentLife.clear).toHaveBeenCalledOnce();
    });

    it("can be called from any phase without throwing", async () => {
      // character-creation phase
      await expect(
        useSessionStore.getState().endLife()
      ).resolves.toBeUndefined();

      // dead phase
      await expect(
        useSessionStore.getState().endLife()
      ).resolves.toBeUndefined();
    });
  });

  describe("invalid transitions", () => {
    it("setActiveRoom before startLife throws", () => {
      const room = {
        id: "room_xyz" as const,
        sequenceIndex: 0,
        previousRoomId: null,
        nextRoomId: null,
        label: "Test room",
        description: "A test.",
        objects: new Map(),
        summary: null,
        era: "modern" as const,
        createdAt: Date.now(),
        exitedAt: null,
      };
      expect(() => {
        useSessionStore.getState().setActiveRoom(room);
      }).toThrow('setActiveRoom called in invalid phase: "character-creation"');
    });

    it("setActiveRoom after endLife throws", async () => {
      useSessionStore.getState().startLife(testPlayer);
      await useSessionStore.getState().endLife();

      const room = {
        id: "room_xyz" as const,
        sequenceIndex: 0,
        previousRoomId: null,
        nextRoomId: null,
        label: "Test room",
        description: "A test.",
        objects: new Map(),
        summary: null,
        era: "modern" as const,
        createdAt: Date.now(),
        exitedAt: null,
      };
      expect(() => {
        useSessionStore.getState().setActiveRoom(room);
      }).toThrow('setActiveRoom called in invalid phase: "dead"');
    });
  });
});
