import {
  GAME_CONFIG,
  type Era,
  type HiddenStatBlock,
  type LifeContext,
  type PlayerIdentity,
} from "@potential/shared";
import { saveLifeContext, loadLifeContext } from "../db/life-context-store.js";
import { db as defaultDb, type LifeSimDb } from "../db/life-sim-db.js";

/**
 * Life lifecycle — birth, death, and the new-life reset.
 *
 * One life at a time. IndexedDB is a crash-recovery buffer for the active
 * life, not a multi-life archive. A new life clears everything.
 */

export interface StartLifeParams {
  playerName: string;
  /** ISO8601 birth date — anchors the era and the world clock. */
  birthDate: string;
  era: Era;
  /** Seeded from the parent origin scene. Immutable for the life. */
  natureStats: HiddenStatBlock;
}

/**
 * startLife — wipes any previous life and persists a fresh identity + context.
 * Does NOT create the birth room: room generation needs the agent, which the
 * harness cannot import. The engine generates the birth room after this.
 */
export async function startLife(
  params: StartLifeParams,
  dbInstance: LifeSimDb = defaultDb,
): Promise<LifeContext> {
  await clearLife(dbInstance);

  const identity: PlayerIdentity = {
    name: params.playerName,
    age: 0,
    birthEra: params.era,
    stats: {
      nature: params.natureStats,
      nurture: { curiosity: 50, resilience: 50, empathy: 50, ambition: 50, creativity: 50 },
    },
  };
  await dbInstance.currentLife.put({ ...identity, id: 1 });

  const context: LifeContext = {
    playerName: params.playerName,
    birthDate: params.birthDate,
    playerAgeYears: 0,
    worldDate: params.birthDate,
    era: params.era,
    natureStats: params.natureStats,
    nurtureStats: { curiosity: 50, resilience: 50, empathy: 50, ambition: 50, creativity: 50 },
    behavioralPatterns: [],
    lifeEvents: [],
    compressedHistory: [],
    emotionalTrajectory: [],
    health: 1,
    hunger: 1,
    money: GAME_CONFIG.economy.startingMoney,
    jobTitle: null,
    pacing: "normal",
    deceased: false,
    causeOfDeath: null,
  };
  await saveLifeContext(context, dbInstance);
  return context;
}

/**
 * endLife — marks the life over. Data is retained for the death/legacy screen;
 * the next startLife performs the actual wipe.
 */
export async function endLife(
  cause: string,
  dbInstance: LifeSimDb = defaultDb,
): Promise<LifeContext> {
  const context = await loadLifeContext(dbInstance);
  if (context === null) {
    throw new Error("endLife: no active life");
  }
  const ended: LifeContext = { ...context, deceased: true, causeOfDeath: cause };
  await saveLifeContext(ended, dbInstance);
  return ended;
}

/** Wipe all life data. Rooms are never deleted mid-life — only here, at reset. */
export async function clearLife(dbInstance: LifeSimDb = defaultDb): Promise<void> {
  await dbInstance.transaction(
    "rw",
    [dbInstance.rooms, dbInstance.currentLife, dbInstance.characters, dbInstance.lifeContext, dbInstance.places],
    async () => {
      await dbInstance.rooms.clear();
      await dbInstance.currentLife.clear();
      await dbInstance.characters.clear();
      await dbInstance.lifeContext.clear();
      await dbInstance.places.clear();
    },
  );
}

/** A resumable life exists when both identity and context records are present. */
export async function hasResumableLife(dbInstance: LifeSimDb = defaultDb): Promise<boolean> {
  const [identity, context] = await Promise.all([
    dbInstance.currentLife.get(1),
    dbInstance.lifeContext.get(1),
  ]);
  return identity !== undefined && context !== undefined && !context.deceased;
}
