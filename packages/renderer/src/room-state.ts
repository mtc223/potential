import { GAME_CONFIG, type Facing, type Room, type WorldObject } from "@potential/shared";

/**
 * Pure room-space logic: collision, movement, interaction targeting, exit
 * detection. No React, no canvas — unit-testable and shared by the renderer.
 * All positions are in pixels (1 sub-tile unit = 1 px at native scale,
 * 32 px per tile).
 */

const T = 32;

export interface PlayerSprite {
  x: number; // feet-center, px
  y: number;
  facing: Facing;
  moving: boolean;
}

export interface SolidRect {
  x: number;
  y: number;
  w: number;
  h: number;
  object: WorldObject | null; // null = wall
}

/** Solid rects for a room: boundary walls (with door gaps) + solid objects. */
export function buildSolids(room: Room): SolidRect[] {
  const { widthTiles, heightTiles, entryTile, exitTile } = room.layout;
  const W = widthTiles * T;
  const H = heightTiles * T;
  const solids: SolidRect[] = [];

  // Top wall band (one tile of visible wall) and bottom boundary.
  solids.push({ x: 0, y: 0, w: W, h: T, object: null });
  solids.push({ x: 0, y: H, w: W, h: T, object: null });
  // Left/right walls with door gaps (one tile tall at the door rows).
  const doorGap = (col: number, row: number, x: number): SolidRect[] => [
    { x, y: 0, w: T / 2, h: row * T, object: null },
    { x, y: (row + 1) * T, w: T / 2, h: H - (row + 1) * T, object: null },
  ];
  solids.push(...doorGap(entryTile.col, entryTile.row, 0));
  solids.push(...doorGap(exitTile.col, exitTile.row, W - T / 2));

  for (const object of room.objects.values()) {
    if (object.solid !== true || object.position === undefined) continue;
    if (object.category === "npc") {
      solids.push({
        x: object.position.col * T + 8,
        y: object.position.row * T + 12,
        w: 16,
        h: 18,
        object,
      });
      continue;
    }
    const def = footprint(object);
    solids.push({
      x: object.position.col * T + 2,
      y: object.position.row * T + def.h * T * 0.25,
      w: def.w * T - 4,
      h: def.h * T * 0.75,
      object,
    });
  }
  return solids;
}

function footprint(object: WorldObject): { w: number; h: number } {
  // Footprints live in the asset catalog; renderer falls back to 1x1 when
  // the object has no catalog id (shouldn't happen post-validation).
  return objectFootprints.get(object.assetId ?? "") ?? { w: 1, h: 1 };
}

/** Filled by the host app from the asset catalog (keeps renderer decoupled). */
export const objectFootprints = new Map<string, { w: number; h: number }>();

const PLAYER_BOX = { w: 16, h: 10 }; // feet collision box

/** Movement speed for a character sprite id, per life stage (GameConfig §2.2). */
export function speedForAsset(assetId: string): number {
  const speeds = GAME_CONFIG.movement.baseSpeed;
  if (assetId === "chr_baby" || assetId === "chr_toddler") return speeds.toddler;
  if (assetId === "chr_child") return speeds.child;
  if (assetId === "chr_teen") return speeds.teen;
  if (assetId === "chr_middle_aged") return speeds.middleAged;
  if (assetId === "chr_senior") return speeds.senior;
  return speeds.adult;
}

export function movePlayer(
  player: PlayerSprite,
  dx: number,
  dy: number,
  room: Room,
  solids: SolidRect[],
  speed: number = GAME_CONFIG.movement.baseSpeed.adult,
): PlayerSprite {
  const nx = player.x + dx * speed;
  const ny = player.y + dy * speed;
  const W = room.layout.widthTiles * T;
  const H = room.layout.heightTiles * T;

  const tryPos = (x: number, y: number): boolean => {
    const box = { x: x - PLAYER_BOX.w / 2, y: y - PLAYER_BOX.h, w: PLAYER_BOX.w, h: PLAYER_BOX.h };
    if (box.x < 0 || box.y < T * 0.6 || box.x + box.w > W || box.y + box.h > H) {
      // Allow stepping into door gaps at the left/right edges.
      const inDoorRow = (tile: { col: number; row: number }) =>
        y > tile.row * T - 6 && y < (tile.row + 1) * T + 10;
      if (box.x < 0 && inDoorRow(room.layout.entryTile)) return true;
      if (box.x + box.w > W && inDoorRow(room.layout.exitTile)) return true;
      return false;
    }
    return !solids.some(
      (s) => box.x < s.x + s.w && box.x + box.w > s.x && box.y < s.y + s.h && box.y + box.h > s.y,
    );
  };

  let x = player.x;
  let y = player.y;
  if (tryPos(nx, y)) x = nx;
  if (tryPos(x, ny)) y = ny;

  // Corner slide: pushing straight into an obstacle edge (furniture corner,
  // door jamb, NPC) nudges one step per frame toward the nearest clear lane,
  // so players never snag on geometry. The probe reach is a fixed pixel span
  // (integer steps — speed-accumulated floats fall one probe short).
  const nudge = Math.max(1, Math.abs(speed));
  const SLIDE_REACH = 28;
  if (x === player.x && dx !== 0 && dy === 0) {
    for (let n = 2; n <= SLIDE_REACH; n += 2) {
      if (tryPos(nx, y - n)) {
        if (tryPos(x, y - nudge)) y -= nudge;
        break;
      }
      if (tryPos(nx, y + n)) {
        if (tryPos(x, y + nudge)) y += nudge;
        break;
      }
    }
    if (y !== player.y && tryPos(nx, y)) x = nx;
  } else if (y === player.y && dy !== 0 && dx === 0) {
    for (let n = 2; n <= SLIDE_REACH; n += 2) {
      if (tryPos(x - n, ny)) {
        if (tryPos(x - nudge, y)) x -= nudge;
        break;
      }
      if (tryPos(x + n, ny)) {
        if (tryPos(x + nudge, y)) x += nudge;
        break;
      }
    }
    if (x !== player.x && tryPos(x, ny)) y = ny;
  }

  const facing: Facing =
    Math.abs(dx) >= Math.abs(dy)
      ? dx < 0
        ? "left"
        : dx > 0
          ? "right"
          : player.facing
      : dy < 0
        ? "up"
        : "down";

  return { x, y, facing, moving: x !== player.x || y !== player.y || dx !== 0 || dy !== 0 };
}

/** The interactable object the player is facing, within interaction radius. */
export function interactTarget(player: PlayerSprite, room: Room): WorldObject | null {
  const reach = GAME_CONFIG.interaction.characterInteractRadius;
  let best: WorldObject | null = null;
  let bestDist = Infinity;
  const fx = player.facing === "left" ? -1 : player.facing === "right" ? 1 : 0;
  const fy = player.facing === "up" ? -1 : player.facing === "down" ? 1 : 0;

  for (const object of room.objects.values()) {
    if (object.position === undefined) continue;
    if (object.interaction === undefined && object.characterId === undefined) continue;
    const def = footprint(object);
    const ox = object.position.col * T + (def.w * T) / 2;
    const oy = object.position.row * T + (def.h * T) / 2;
    const dx = ox - player.x;
    const dy = oy - player.y - 8;
    const dist = Math.hypot(dx, dy);
    const radius =
      object.characterId !== undefined
        ? GAME_CONFIG.interaction.characterInteractRadius
        : GAME_CONFIG.interaction.objectInteractRadius;
    const maxReach = Math.max(radius, (Math.max(def.w, def.h) * T) / 2 + 20);
    if (dist > Math.min(maxReach, reach + Math.max(def.w, def.h) * 16)) continue;
    // Must be roughly in the facing direction (or very close).
    const dot = dx * fx + dy * fy;
    if (dist > 26 && dot <= 0) continue;
    if (dist < bestDist) {
      best = object;
      bestDist = dist;
    }
  }
  return best;
}

/** True when the player is standing in the exit doorway. */
export function atExit(player: PlayerSprite, room: Room): boolean {
  const { exitTile, widthTiles } = room.layout;
  return (
    player.x >= widthTiles * T - 10 &&
    player.y > exitTile.row * T - 6 &&
    player.y < (exitTile.row + 1) * T + 12
  );
}

export function spawnPosition(room: Room): { x: number; y: number } {
  return { x: T * 0.9, y: room.layout.entryTile.row * T + T * 0.8 };
}
