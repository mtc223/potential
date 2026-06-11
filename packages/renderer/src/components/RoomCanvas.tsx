import { useEffect, useRef } from "react";
import type { Room, WorldObject } from "@potential/shared";
import { characterFrame, type SpriteAtlas } from "../atlas.js";
import {
  atExit,
  buildSolids,
  interactTarget,
  movePlayer,
  spawnPosition,
  speedForAsset,
  type PlayerSprite,
} from "../room-state.js";

const T = 32;

export interface RoomCanvasProps {
  room: Room;
  atlas: SpriteAtlas;
  /** chr_* sprite for the player's current life stage. */
  playerAssetId: string;
  /** Freeze movement while dialogue/input/overlays are open. */
  paused: boolean;
  onInteract: (target: WorldObject) => void;
  onExit: () => void;
  onTargetChange?: (target: WorldObject | null) => void;
}

/**
 * RoomCanvas — the pixel world. 32px tiles, 3/4 top-down, y-sorted sprites,
 * WASD/arrow movement with collision, E/Space to interact. Runs its own
 * requestAnimationFrame loop; React re-renders only on room change.
 */
export function RoomCanvas({
  room,
  atlas,
  playerAssetId,
  paused,
  onInteract,
  onExit,
  onTargetChange,
}: RoomCanvasProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const callbacksRef = useRef({ onInteract, onExit, onTargetChange });
  callbacksRef.current = { onInteract, onExit, onTargetChange };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return;
    ctx.imageSmoothingEnabled = false;

    const solids = buildSolids(room);
    const spawn = spawnPosition(room);
    let player: PlayerSprite = { x: spawn.x, y: spawn.y, facing: "right", moving: false };
    let animClock = 0;
    let exited = false;
    let lastTarget: WorldObject | null = null;
    const keys = new Set<string>();
    // Ambient speech: each NPC says their line once, when you first get close.
    const spoken = new Set<string>();
    const bubbles = new Map<string, { text: string; x: number; y: number; until: number }>();

    const onKeyDown = (e: KeyboardEvent): void => {
      if (pausedRef.current) return;
      const key = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) e.preventDefault();
      keys.add(key);
      if ((key === "e" || key === " " || key === "enter") && lastTarget !== null) {
        callbacksRef.current.onInteract(lastTarget);
      }
    };
    const onKeyUp = (e: KeyboardEvent): void => {
      keys.delete(e.key.toLowerCase());
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const sprite = (id: string): { sx: number; sy: number; sw: number; sh: number } | null => {
      const rect = atlas.sprites[id];
      if (rect === undefined) return null;
      return { sx: rect.x, sy: rect.y, sw: rect.w, sh: rect.h };
    };

    const drawTile = (id: string, dx: number, dy: number): void => {
      const r = sprite(id);
      if (r === null) return;
      ctx.drawImage(atlas.image, r.sx, r.sy, T, T, dx, dy, T, T);
    };

    const drawCharacter = (
      assetId: string,
      frame: number,
      dx: number,
      dy: number,
    ): void => {
      const r = sprite(assetId);
      if (r === null) return;
      ctx.drawImage(atlas.image, r.sx + frame * T, r.sy, T, T, dx, dy, T, T);
    };

    let raf = 0;
    let stopped = false;
    const frame = (): void => {
      animClock += 1;

      if (!pausedRef.current) {
        const dx = (keys.has("arrowright") || keys.has("d") ? 1 : 0) - (keys.has("arrowleft") || keys.has("a") ? 1 : 0);
        const dy = (keys.has("arrowdown") || keys.has("s") ? 1 : 0) - (keys.has("arrowup") || keys.has("w") ? 1 : 0);
        if (dx !== 0 || dy !== 0) {
          player = movePlayer(player, dx, dy, room, solids, speedForAsset(playerAssetId));
        } else if (player.moving) {
          player = { ...player, moving: false };
        }

        const target = interactTarget(player, room);
        if (target !== lastTarget) {
          lastTarget = target;
          callbacksRef.current.onTargetChange?.(target);
        }

        // Dev/automation hook: live player position for scripted playtests.
        (window as unknown as Record<string, unknown>)["__playerPos"] = { x: player.x, y: player.y, facing: player.facing };

        if (!exited && atExit(player, room)) {
          exited = true;
          callbacksRef.current.onExit();
        }

        for (const object of room.objects.values()) {
          if (object.ambientLine === undefined || object.position === undefined) continue;
          if (spoken.has(object.id)) continue;
          const ox = object.position.col * T + T / 2;
          const oy = object.position.row * T + T / 2;
          if (Math.hypot(ox - player.x, oy - player.y) < 90) {
            spoken.add(object.id);
            bubbles.set(object.id, { text: object.ambientLine, x: ox, y: object.position.row * T, until: animClock + 240 });
          }
        }
      }

      // ── draw ──
      const W = room.layout.widthTiles * T;
      const H = room.layout.heightTiles * T;
      ctx.clearRect(0, 0, W, H);

      for (let row = 0; row < room.layout.heightTiles; row++)
        for (let col = 0; col < room.layout.widthTiles; col++)
          drawTile(room.layout.floorAssetId, col * T, row * T);

      for (let col = 0; col < room.layout.widthTiles; col++)
        drawTile(room.layout.wallAssetId, col * T, 0);

      // Doors: entry (left, behind you) and exit (right, glowing forward).
      const entryY = room.layout.entryTile.row * T;
      const exitY = room.layout.exitTile.row * T;
      ctx.fillStyle = "#23213a";
      ctx.fillRect(0, entryY, 6, T);
      ctx.fillRect(W - 6, exitY, 6, T);
      ctx.fillStyle = "#e3c350";
      const pulse = Math.sin(animClock / 18) * 2;
      ctx.fillRect(W - 4, exitY + 6 + pulse, 4, T - 12);

      // y-sorted drawables: objects, NPCs, player.
      type Drawable = { baseline: number; draw: () => void };
      const drawables: Drawable[] = [];

      for (const object of room.objects.values()) {
        if (object.position === undefined || object.assetId === undefined) continue;
        const { col, row } = object.position;
        if (object.category === "npc") {
          const px = col * T;
          const py = row * T;
          drawables.push({
            baseline: py + T,
            draw: () => {
              // NPCs face the player when close; otherwise face down.
              const ddx = player.x - (px + T / 2);
              const ddy = player.y - (py + T / 2);
              const near = Math.hypot(ddx, ddy) < 72;
              const facing = !near
                ? "down"
                : Math.abs(ddx) > Math.abs(ddy)
                  ? ddx < 0
                    ? "left"
                    : "right"
                  : ddy < 0
                    ? "up"
                    : "down";
              drawCharacter(object.assetId ?? "chr_adult_casual", characterFrame(facing, 0), px, py);
            },
          });
        } else {
          const r = sprite(object.assetId);
          if (r === null) continue;
          drawables.push({
            baseline: row * T + r.sh,
            draw: () => {
              ctx.drawImage(atlas.image, r.sx, r.sy, r.sw, r.sh, col * T, row * T, r.sw, r.sh);
            },
          });
        }
      }

      drawables.push({
        baseline: player.y + 2,
        draw: () => {
          const step: 0 | 1 | 2 = player.moving ? (([0, 1, 0, 2] as const)[Math.floor(animClock / 9) % 4] ?? 0) : 0;
          drawCharacter(playerAssetId, characterFrame(player.facing, step), player.x - T / 2, player.y - T + 4);
        },
      });

      drawables.sort((a, b) => a.baseline - b.baseline);
      for (const d of drawables) d.draw();

      // Ambient speech bubbles.
      for (const [id, bubble] of bubbles) {
        if (animClock > bubble.until) {
          bubbles.delete(id);
          continue;
        }
        ctx.font = "9px monospace";
        const words = bubble.text.split(" ");
        const lines: string[] = [];
        let line = "";
        for (const word of words) {
          if ((line + " " + word).trim().length > 24 && line.length > 0) {
            lines.push(line);
            line = word;
          } else {
            line = (line + " " + word).trim();
          }
          if (lines.length === 2) break;
        }
        if (lines.length < 2 && line.length > 0) lines.push(line);
        const bw = Math.min(150, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 10);
        const bh = lines.length * 11 + 7;
        const bx = Math.max(2, Math.min(W - bw - 2, bubble.x - bw / 2));
        const by = Math.max(2, bubble.y - bh - 6);
        ctx.fillStyle = "#f2f2ee";
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = "#23213a";
        ctx.lineWidth = 1;
        ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
        ctx.fillStyle = "#23213a";
        ctx.fillRect(bubble.x - 2, by + bh, 4, 4); // tail
        lines.forEach((l, i) => {
          ctx.fillText(l, bx + 5, by + 13 + i * 11);
        });
      }

      // Interaction target brackets.
      if (lastTarget?.position !== undefined && !pausedRef.current) {
        const r = lastTarget.assetId !== undefined ? sprite(lastTarget.assetId) : null;
        const w = lastTarget.category === "npc" ? T : (r?.sw ?? T);
        const h = lastTarget.category === "npc" ? T : (r?.sh ?? T);
        const bx = lastTarget.position.col * T;
        const by = lastTarget.position.row * T;
        ctx.strokeStyle = "#f2f2ee";
        ctx.lineWidth = 1;
        const c = 5;
        ctx.beginPath();
        for (const [cx, cy, ex, ey] of [
          [bx, by, bx + c, by],
          [bx, by, bx, by + c],
          [bx + w, by, bx + w - c, by],
          [bx + w, by, bx + w, by + c],
          [bx, by + h, bx + c, by + h],
          [bx, by + h, bx, by + h - c],
          [bx + w, by + h, bx + w - c, by + h],
          [bx + w, by + h, bx + w, by + h - c],
        ] as const) {
          ctx.moveTo(cx + 0.5, cy + 0.5);
          ctx.lineTo(ex + 0.5, ey + 0.5);
        }
        ctx.stroke();
      }

    };
    // RAF drives the loop at 60fps while the tab is visible. A dedicated
    // Web Worker ticker (immune to background-tab timer throttling) keeps
    // the world running at ~30fps when the tab is hidden or unfocused.
    let lastTick = 0;
    const tick = (): void => {
      if (stopped) return;
      lastTick = performance.now();
      frame();
    };
    const rafLoop = (): void => {
      if (stopped) return;
      tick();
      raf = requestAnimationFrame(rafLoop);
    };
    raf = requestAnimationFrame(rafLoop);

    const worker = new Worker(
      URL.createObjectURL(
        new Blob(["setInterval(() => postMessage(0), 33);"], { type: "application/javascript" }),
      ),
    );
    worker.onmessage = () => {
      if (!stopped && performance.now() - lastTick > 60) tick();
    };

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      worker.terminate();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [room, atlas, playerAssetId]);

  return (
    <canvas
      ref={canvasRef}
      width={room.layout.widthTiles * T}
      height={room.layout.heightTiles * T}
      style={{
        imageRendering: "pixelated",
        width: "100%",
        height: "100%",
        objectFit: "contain",
        background: "#16141f",
      }}
    />
  );
}
