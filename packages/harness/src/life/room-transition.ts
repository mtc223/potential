import {
  GAME_CONFIG,
  ROOM_DURATION_DAYS,
  type CompressedRoomSummary,
  type LifeContext,
  type Room,
} from "@potential/shared";
import { insertRoom } from "../db/room-store.js";
import { saveLifeContext } from "../db/life-context-store.js";
import { db as defaultDb, type LifeSimDb } from "../db/life-sim-db.js";

/**
 * Room exit — the core causal loop of the game:
 *
 *   Exit Room → Compress → (caller: Select N+1 Candidates → Generate N+1)
 *
 * Compression fires HERE, on room exit, before any N+1 selection begins.
 * The compressor is injected: the harness never imports the agent package
 * (package boundary — harness imports from shared only). The agent supplies
 * compress_player_memory; tests supply a deterministic stub.
 */

export type RoomCompressorFn = (
  room: Room,
  context: LifeContext,
) => Promise<CompressedRoomSummary>;

export class RoomTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RoomTransitionError";
  }
}

export interface ExitRoomResult {
  /** The room as persisted: summary + exitedAt set. */
  exitedRoom: Room;
  compressed: CompressedRoomSummary;
  /** LifeContext after time advance, stat ticks, and history append. Already persisted. */
  updatedContext: LifeContext;
}

/**
 * exitRoom — compresses the current room, appends it to the linked list,
 * advances world time, and persists the updated LifeContext.
 *
 * Ordering guarantee: compression output is written into the room record
 * (summary) and into LifeContext BEFORE the caller may begin candidate
 * selection. Compression output is causality, not just memory.
 */
export async function exitRoom(
  room: Room,
  context: LifeContext,
  compress: RoomCompressorFn,
  dbInstance: LifeSimDb = defaultDb,
): Promise<ExitRoomResult> {
  if (room.summary !== null || room.exitedAt !== null) {
    throw new RoomTransitionError(
      `exitRoom: room "${room.id}" has already been exited`,
    );
  }
  if (context.deceased) {
    throw new RoomTransitionError("exitRoom: life has ended — no further transitions");
  }

  // 1. Compress. All room events collapse into a single summary object.
  const compressed = await compress(room, context);

  // 2. Persist the exited room — atomic linked-list append.
  const exitedRoom: Room = {
    ...room,
    summary: compressed.narrative,
    exitedAt: Date.now(),
  };
  await insertRoom(exitedRoom, dbInstance);

  // 3. Advance the world clock and tick survival stats deterministically.
  const updatedContext = advanceContext(context, room, compressed);

  // 4. Persist context — the crash-recovery heartbeat.
  await saveLifeContext(updatedContext, dbInstance);

  return { exitedRoom, compressed, updatedContext };
}

/** Pure context advance — exported for direct unit testing. */
export function advanceContext(
  context: LifeContext,
  room: Room,
  compressed: CompressedRoomSummary,
): LifeContext {
  const days = ROOM_DURATION_DAYS[room.duration];
  const { life } = GAME_CONFIG;

  const drained = Math.max(
    life.minHungerAfterRoom,
    context.hunger - life.hungerDrainPerDay * Math.min(days, life.hungerDrainMaxDays),
  );
  // Week+ rooms include routine off-screen meals; only day-resolution rooms
  // (crisis zooms, where the player can actually eat) drain below the floor.
  const hunger = days >= life.offScreenMealDays ? Math.max(drained, life.offScreenMealFloor) : drained;

  let healthDecay = life.healthDecayPerYear * (days / 365);
  if (hunger <= life.starvationThreshold) {
    healthDecay += life.starvationHealthDecay;
  }
  const health = Math.max(0, Math.min(1, context.health - healthDecay));

  const worldDate = addDays(context.worldDate, days);

  return {
    ...context,
    playerAgeYears: round2(context.playerAgeYears + days / 365),
    worldDate,
    hunger,
    health,
    lifeEvents: compressed.isLifeEvent
      ? [...context.lifeEvents, compressed]
      : context.lifeEvents,
    compressedHistory: [...context.compressedHistory, compressed],
    emotionalTrajectory: [...context.emotionalTrajectory, compressed.emotionalValence],
  };
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  const iso = date.toISOString().split("T")[0];
  if (iso === undefined) {
    throw new RoomTransitionError(`addDays: invalid date "${isoDate}"`);
  }
  return iso;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
