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

/** A spoken line to render as a bubble above an NPC's head. */
export interface SpeechEvent {
  /** Matched against object labels (case-insensitive). */
  targetLabel: string;
  text: string;
  /** Monotonic — a new seq triggers a new bubble. */
  seq: number;
}

export interface RoomCanvasProps {
  room: Room;
  atlas: SpriteAtlas;
  /** chr_* sprite for the player's current life stage. */
  playerAssetId: string;
  /** Freeze movement while dialogue/input/overlays are open. */
  paused: boolean;
  /** Movement control unlocked (CONTROLS registry). Locked = held/carried. */
  canMove: boolean;
  /** Interact control unlocked (CONTROLS registry). */
  canInteract: boolean;
  /** When true (held rooms only): the holder walks the player out to the
   * exit, then onExit fires — the parent carries you to the next room. */
  carryOut?: boolean;
  /** Latest spoken line — rendered as a bubble above the speaker. */
  speech?: SpeechEvent | null;
  onInteract: (target: WorldObject) => void;
  onExit: () => void;
  onTargetChange?: (target: WorldObject | null) => void;
}

/** Floor coverings draw under everything — never over the player. */
const FLAT_ASSETS = new Set(["rug"]);

/**
 * Internal supersampling: the canvas backing store is SCALE× the room's
 * native pixels. Sprites scale crisply (integer nearest-neighbor); text is
 * drawn in screen space at full resolution instead of being blown up.
 */
const SCALE = 3;

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
  canMove,
  canInteract,
  carryOut = false,
  speech = null,
  onInteract,
  onExit,
  onTargetChange,
}: RoomCanvasProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const controlsRef = useRef({ canMove, canInteract });
  controlsRef.current = { canMove, canInteract };
  const carryOutRef = useRef(carryOut);
  carryOutRef.current = carryOut;
  const speechRef = useRef<SpeechEvent | null>(speech);
  speechRef.current = speech;
  const callbacksRef = useRef({ onInteract, onExit, onTargetChange });
  callbacksRef.current = { onInteract, onExit, onTargetChange };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return;
    ctx.imageSmoothingEnabled = false;

    const solids = buildSolids(room);
    // Held/carried (movement locked): spawn in the arms of the first NPC
    // instead of at the door. Otherwise spawn at the entry.
    const firstNpc = [...room.objects.values()].find((o) => o.characterId !== undefined);
    const spawn =
      !controlsRef.current.canMove && firstNpc?.position !== undefined
        ? { x: firstNpc.position.col * T + T / 2, y: firstNpc.position.row * T + T - 2 }
        : spawnPosition(room);
    let player: PlayerSprite = { x: spawn.x, y: spawn.y, facing: "right", moving: false };
    let animClock = 0;
    let exited = false;
    let lastTarget: WorldObject | null = null;
    let lastSpeechSeq = -1;
    const keys = new Set<string>();
    // Ambient speech: each NPC says their line once, when you first get close.
    const spoken = new Set<string>();
    const bubbles = new Map<string, { text: string; x: number; y: number; until: number }>();

    const onKeyDown = (e: KeyboardEvent): void => {
      if (pausedRef.current) return;
      const key = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) e.preventDefault();
      if (controlsRef.current.canMove) keys.add(key);
      if (
        controlsRef.current.canInteract &&
        (key === "e" || key === " " || key === "enter") &&
        lastTarget !== null
      ) {
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
    let carryDx = 0;
    let carryDone = false;
    const frame = (): void => {
      animClock += 1;

      // Spoken lines bubble up even while an input has the game paused —
      // conversation replies arrive exactly then.
      const speechEvent = speechRef.current;
      if (speechEvent !== null && speechEvent.seq !== lastSpeechSeq) {
        lastSpeechSeq = speechEvent.seq;
        const speaker = [...room.objects.values()].find(
          (o) =>
            o.characterId !== undefined &&
            o.label.toLowerCase() === speechEvent.targetLabel.toLowerCase() &&
            o.position !== undefined,
        );
        if (speaker?.position !== undefined) {
          bubbles.set(speaker.id, {
            text: speechEvent.text.slice(0, 160),
            x: speaker.position.col * T + T / 2,
            y: speaker.position.row * T,
            until: animClock + Math.min(600, 180 + speechEvent.text.length * 2),
          });
        }
      }

      // The parent walks you out: the holder carries the player toward the
      // exit, then the transition fires. Runs regardless of pause state.
      if (carryOutRef.current && !carryDone && firstNpc?.position !== undefined) {
        carryDx += 1.4;
        const carrierX = firstNpc.position.col * T + T / 2 + carryDx;
        player = { x: carrierX, y: firstNpc.position.row * T + T - 2, facing: "right", moving: true };
        if (carrierX >= room.layout.widthTiles * T - 8) {
          carryDone = true;
          callbacksRef.current.onExit();
        }
      } else if (carryOutRef.current && !carryDone) {
        carryDone = true;
        callbacksRef.current.onExit();
      }

      if (!pausedRef.current && !carryOutRef.current) {
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

        if (controlsRef.current.canMove && !exited && atExit(player, room)) {
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

      // ── draw ── (sprites under a SCALE× transform; text in screen space)
      const W = room.layout.widthTiles * T;
      const H = room.layout.heightTiles * T;
      ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
      ctx.imageSmoothingEnabled = false;
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
          const isCarrier = carryDx > 0 && object.id === firstNpc?.id;
          const px = col * T + (isCarrier ? carryDx : 0);
          const py = row * T;
          drawables.push({
            baseline: py + T,
            draw: () => {
              if (isCarrier) {
                const step: 0 | 1 | 2 = ([0, 1, 0, 2] as const)[Math.floor(animClock / 9) % 4] ?? 0;
                drawCharacter(object.assetId ?? "chr_adult_casual", characterFrame("right", step), px, py);
                return;
              }
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
          // Floor coverings (rugs) lie flat — baseline 0 keeps them under
          // every standing sprite, including the player.
          const flat = FLAT_ASSETS.has(object.assetId);
          drawables.push({
            baseline: flat ? 0 : row * T + r.sh,
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

      // Speech bubbles — drawn in screen space so text renders at full
      // resolution instead of being scaled up blurry.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.font = `${String(9 * SCALE)}px monospace`;
      for (const [id, bubble] of bubbles) {
        if (animClock > bubble.until) {
          bubbles.delete(id);
          continue;
        }
        const words = bubble.text.split(" ");
        const lines: string[] = [];
        let line = "";
        for (const word of words) {
          if ((line + " " + word).trim().length > 26 && line.length > 0) {
            lines.push(line);
            line = word;
          } else {
            line = (line + " " + word).trim();
          }
          if (lines.length === 4) break;
        }
        if (lines.length < 4 && line.length > 0) lines.push(line);
        const bw = Math.min(170 * SCALE, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 10 * SCALE);
        const bh = (lines.length * 11 + 7) * SCALE;
        const cx = bubble.x * SCALE;
        const bx = Math.max(2, Math.min(W * SCALE - bw - 2, cx - bw / 2));
        const by = Math.max(2, bubble.y * SCALE - bh - 6 * SCALE);
        ctx.fillStyle = "#f2f2ee";
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = "#23213a";
        ctx.lineWidth = SCALE;
        ctx.strokeRect(bx, by, bw, bh);
        ctx.fillStyle = "#23213a";
        ctx.fillRect(cx - 2 * SCALE, by + bh, 4 * SCALE, 4 * SCALE); // tail
        lines.forEach((l, i) => {
          ctx.fillText(l, bx + 5 * SCALE, by + (13 + i * 11) * SCALE);
        });
      }

      // Interaction target brackets (back under the room-space transform).
      ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
      if (lastTarget?.position !== undefined && !pausedRef.current && controlsRef.current.canInteract) {
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
      width={room.layout.widthTiles * T * SCALE}
      height={room.layout.heightTiles * T * SCALE}
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
