import { describe, it, expect } from "vitest";
import type { ObjectId, Room, WorldObject } from "@potential/shared";
import {
  atExit,
  buildSolids,
  interactTarget,
  movePlayer,
  spawnPosition,
  type PlayerSprite,
} from "../room-state.js";

const T = 32;

function makeObject(overrides: Partial<WorldObject> & { id: ObjectId }): WorldObject {
  return {
    category: "fixture",
    label: "Thing",
    description: "A thing.",
    tags: [],
    tombstoned: false,
    assetId: "couch",
    solid: true,
    ...overrides,
  };
}

function makeRoom(objects: WorldObject[] = []): Room {
  return {
    id: "room_r1",
    sequenceIndex: 0,
    previousRoomId: null,
    nextRoomId: null,
    label: "Test",
    description: "d",
    situation: "s",
    objects: new Map(objects.map((o) => [o.id, o])),
    layout: {
      widthTiles: 12,
      heightTiles: 10,
      sizeTemplate: "small",
      floorAssetId: "floor_wood",
      wallAssetId: "wall_plaster",
      entryTile: { col: 0, row: 5 },
      exitTile: { col: 11, row: 5 },
    },
    duration: "day",
    playerAgeYears: 20,
    worldDate: "2005-06-15",
    events: [],
    summary: null,
    era: "modern",
    createdAt: 0,
    exitedAt: null,
  };
}

function player(x: number, y: number, facing: PlayerSprite["facing"] = "right"): PlayerSprite {
  return { x, y, facing, moving: false };
}

describe("movement and collision", () => {
  it("moves freely in open floor", () => {
    const room = makeRoom();
    const solids = buildSolids(room);
    const moved = movePlayer(player(6 * T, 5 * T), 1, 0, room, solids);
    expect(moved.x).toBeGreaterThan(6 * T);
    expect(moved.facing).toBe("right");
  });

  it("never overlaps solid objects (corner slide routes around, not through)", () => {
    const couch = makeObject({ id: "obj_couch", position: { col: 7, row: 5 } });
    const room = makeRoom([couch]);
    const solids = buildSolids(room);
    const couchSolid = solids.find((s) => s.object?.id === "obj_couch");
    expect(couchSolid).toBeDefined();
    let p = player(6 * T + 8, 5 * T + 24);
    for (let i = 0; i < 60; i++) {
      p = movePlayer(p, 1, 0, room, solids);
      const box = { x: p.x - 8, y: p.y - 10, w: 16, h: 10 };
      const s = couchSolid as NonNullable<typeof couchSolid>;
      const overlaps = box.x < s.x + s.w && box.x + box.w > s.x && box.y < s.y + s.h && box.y + box.h > s.y;
      expect(overlaps).toBe(false);
    }
  });

  it("slides around an NPC parked on the door row (toddler speed)", () => {
    const npc = makeObject({
      id: "obj_npc",
      category: "npc",
      solid: true,
      position: { col: 9, row: 5 },
      characterId: "chr_block",
    });
    const room = makeRoom([npc]);
    const solids = buildSolids(room);
    let p = player(286.2, 185.6);
    for (let i = 0; i < 300; i++) p = movePlayer(p, 1, 0, room, solids, 1.8);
    expect(p.x).toBeGreaterThan(10 * T);
  });

  it("slides around a furniture corner instead of snagging", () => {
    const couch = makeObject({ id: "obj_couch", position: { col: 7, row: 5 } });
    const room = makeRoom([couch]);
    const solids = buildSolids(room);
    let p = player(6 * T + 8, 5 * T + 24);
    for (let i = 0; i < 120; i++) p = movePlayer(p, 1, 0, room, solids);
    // With the slide, sustained rightward input eventually clears the couch.
    expect(p.x).toBeGreaterThan(10 * T);
  });

  it("blocks movement through the top wall", () => {
    const room = makeRoom();
    const solids = buildSolids(room);
    let p = player(6 * T, 3 * T);
    for (let i = 0; i < 80; i++) p = movePlayer(p, 0, -1, room, solids);
    expect(p.y).toBeGreaterThan(T * 0.5);
  });

  it("non-solid objects do not block", () => {
    const rug = makeObject({ id: "obj_rug", assetId: "rug", solid: false, position: { col: 7, row: 5 } });
    const room = makeRoom([rug]);
    const solids = buildSolids(room);
    let p = player(6 * T, 5 * T + 16);
    for (let i = 0; i < 40; i++) p = movePlayer(p, 1, 0, room, solids);
    expect(p.x).toBeGreaterThan(8 * T);
  });
});

describe("interaction targeting", () => {
  it("targets a nearby interactable in the facing direction", () => {
    const fridge = makeObject({
      id: "obj_fridge",
      assetId: "refrigerator",
      position: { col: 7, row: 5 },
      interaction: { type: "examine", text: "Cold." },
    });
    const room = makeRoom([fridge]);
    const target = interactTarget(player(6 * T + 6, 5 * T + 20, "right"), room);
    expect(target?.id).toBe("obj_fridge");
  });

  it("ignores objects behind the player unless adjacent", () => {
    const fridge = makeObject({
      id: "obj_fridge",
      assetId: "refrigerator",
      position: { col: 3, row: 5 },
      interaction: { type: "examine" },
    });
    const room = makeRoom([fridge]);
    const target = interactTarget(player(7 * T, 5 * T + 20, "right"), room);
    expect(target).toBeNull();
  });

  it("ignores objects with no interaction and no character link", () => {
    const decor = makeObject({ id: "obj_decor", position: { col: 7, row: 5 } });
    const room = makeRoom([decor]);
    expect(interactTarget(player(6 * T + 6, 5 * T + 20, "right"), room)).toBeNull();
  });
});

describe("doors", () => {
  it("spawns at the entry door on the left wall", () => {
    const room = makeRoom();
    const spawn = spawnPosition(room);
    expect(spawn.x).toBeLessThan(2 * T);
    expect(Math.abs(spawn.y - (5 * T + T * 0.8))).toBeLessThan(1);
  });

  it("detects the exit only at the exit doorway", () => {
    const room = makeRoom();
    expect(atExit(player(12 * T - 6, 5 * T + 16), room)).toBe(true);
    expect(atExit(player(12 * T - 6, 2 * T), room)).toBe(false);
    expect(atExit(player(6 * T, 5 * T), room)).toBe(false);
  });

  it("lets the player walk into the exit doorway through the right wall", () => {
    const room = makeRoom();
    const solids = buildSolids(room);
    let p = player(10 * T, 5 * T + 20);
    for (let i = 0; i < 90; i++) p = movePlayer(p, 1, 0, room, solids);
    expect(atExit(p, room)).toBe(true);
  });
});
