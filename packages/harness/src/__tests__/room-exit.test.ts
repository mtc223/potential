import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Room, RoomId } from "@potential/shared";

// Mock the db before any module that imports it is loaded.
vi.mock("../db/life-sim-db.js", () => ({
  db: {
    rooms: { clear: vi.fn().mockResolvedValue(undefined) },
    currentLife: { clear: vi.fn().mockResolvedValue(undefined) },
  },
}));

// Mock insertRoom so tests never touch real IndexedDB.
vi.mock("../db/room-store.js", () => ({
  insertRoom: vi.fn().mockResolvedValue(undefined),
}));

import { onRoomExit } from "../room-exit.js";
import { useSessionStore, initialSessionState } from "../store/session-store.js";
import { insertRoom } from "../db/room-store.js";
import { LinkedListError } from "../db/errors.js";

const mockInsertRoom = vi.mocked(insertRoom);

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: `room_${crypto.randomUUID()}` as RoomId,
    sequenceIndex: 0,
    previousRoomId: null,
    nextRoomId: null,
    label: "Test Room",
    description: "A test room.",
    objects: new Map(),
    summary: null,
    era: "modern",
    createdAt: Date.now(),
    exitedAt: null,
    ...overrides,
  };
}

const stubCompressRoom = vi.fn().mockResolvedValue("[compression stub]");

beforeEach(() => {
  useSessionStore.setState({ ...initialSessionState });
  mockInsertRoom.mockClear();
  mockInsertRoom.mockResolvedValue(undefined);
  stubCompressRoom.mockClear();
  stubCompressRoom.mockResolvedValue("[compression stub]");
});

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

describe("onRoomExit — happy path", () => {
  it("inserts the room into Dexie with a non-null exitedAt", async () => {
    await onRoomExit(makeRoom(), stubCompressRoom);

    expect(mockInsertRoom).toHaveBeenCalledOnce();
    expect(mockInsertRoom).toHaveBeenCalledWith(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expect.objectContaining returns AsymmetricMatcher typed as any in Vitest
      expect.objectContaining({ exitedAt: expect.any(Number) }),
    );
  });

  it("inserts the room into Dexie with the compression summary set", async () => {
    await onRoomExit(makeRoom(), stubCompressRoom);

    expect(mockInsertRoom).toHaveBeenCalledWith(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expect.objectContaining returns AsymmetricMatcher typed as any in Vitest
      expect.objectContaining({ summary: "[compression stub]" }),
    );
  });

  it("updates lifeContext in the session store with the compression summary", async () => {
    await onRoomExit(makeRoom(), stubCompressRoom);

    expect(useSessionStore.getState().lifeContext?.summary).toBe("[compression stub]");
  });

  it("passes the room with exitedAt stamped to compressRoom", async () => {
    await onRoomExit(makeRoom({ exitedAt: null }), stubCompressRoom);

    expect(stubCompressRoom).toHaveBeenCalledWith(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expect.objectContaining returns AsymmetricMatcher typed as any in Vitest
      expect.objectContaining({ exitedAt: expect.any(Number) }),
      expect.anything(),
    );
  });

  it("passes the current lifeContext from the session store to compressRoom", async () => {
    useSessionStore.setState({ lifeContext: { summary: "prior context" } });

    await onRoomExit(makeRoom(), stubCompressRoom);

    expect(stubCompressRoom).toHaveBeenCalledWith(
      expect.anything(),
      { summary: "prior context" },
    );
  });

  it("falls back to empty summary when lifeContext is null", async () => {
    // Initial state has lifeContext: null.
    await onRoomExit(makeRoom(), stubCompressRoom);

    expect(stubCompressRoom).toHaveBeenCalledWith(
      expect.anything(),
      { summary: "" },
    );
  });
});

// ---------------------------------------------------------------------------
// Pipeline step ordering
// ---------------------------------------------------------------------------

describe("onRoomExit — pipeline ordering", () => {
  it("calls compressRoom before insertRoom", async () => {
    const callOrder: string[] = [];

    const orderedCompress = vi.fn().mockImplementation(() => {
      callOrder.push("compressRoom");
      return Promise.resolve("[stub]");
    });
    mockInsertRoom.mockImplementation(() => {
      callOrder.push("insertRoom");
      return Promise.resolve();
    });

    await onRoomExit(makeRoom(), orderedCompress);

    expect(callOrder).toEqual(["compressRoom", "insertRoom"]);
  });
});

// ---------------------------------------------------------------------------
// Compression failure
// ---------------------------------------------------------------------------

describe("onRoomExit — compression failure", () => {
  it("propagates the error from compressRoom", async () => {
    const failingCompress = vi.fn().mockRejectedValue(new Error("LLM unavailable"));

    await expect(onRoomExit(makeRoom(), failingCompress)).rejects.toThrow("LLM unavailable");
  });

  it("does not write to Dexie when compressRoom throws", async () => {
    const failingCompress = vi.fn().mockRejectedValue(new Error("LLM unavailable"));

    await expect(onRoomExit(makeRoom(), failingCompress)).rejects.toThrow();
    expect(mockInsertRoom).not.toHaveBeenCalled();
  });

  it("does not update lifeContext when compressRoom throws", async () => {
    useSessionStore.setState({ lifeContext: { summary: "unchanged" } });
    const failingCompress = vi.fn().mockRejectedValue(new Error("LLM unavailable"));

    await expect(onRoomExit(makeRoom(), failingCompress)).rejects.toThrow();
    expect(useSessionStore.getState().lifeContext?.summary).toBe("unchanged");
  });
});

// ---------------------------------------------------------------------------
// insertRoom failure
// ---------------------------------------------------------------------------

describe("onRoomExit — insertRoom failure", () => {
  it("propagates the error from insertRoom", async () => {
    mockInsertRoom.mockRejectedValueOnce(new LinkedListError("list invariant violated"));

    await expect(onRoomExit(makeRoom(), stubCompressRoom)).rejects.toThrow(LinkedListError);
  });

  it("does not update lifeContext when insertRoom throws", async () => {
    useSessionStore.setState({ lifeContext: { summary: "unchanged" } });
    mockInsertRoom.mockRejectedValueOnce(new LinkedListError("list invariant violated"));

    await expect(onRoomExit(makeRoom(), stubCompressRoom)).rejects.toThrow();
    expect(useSessionStore.getState().lifeContext?.summary).toBe("unchanged");
  });
});
