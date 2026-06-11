/**
 * GAME_CONFIG — every tunable value in one typed, readonly object.
 * No magic numbers in source code. Values trace to LifeSimulator_GameConfig_v1.md.
 */

export const GAME_CONFIG = {
  movement: {
    /** Sub-tile points per tile axis. */
    subTileResolution: 32,
    /** Sub-tile units per frame at 60fps, by life stage. */
    baseSpeed: {
      toddler: 1.8,
      child: 2.5,
      teen: 3.0,
      youngAdult: 3.0,
      adult: 3.0,
      middleAged: 2.8,
      senior: 2.2,
    },
    minSpeedMultiplier: 0.3,
  },
  interaction: {
    /** Sub-tile units. */
    objectInteractRadius: 48,
    characterInteractRadius: 64,
    earshotRadius: 160,
  },
  npc: {
    idleFidgetIntervalMs: 3000,
    randomActionIntervalMs: 15000,
    approachSpeedMultiplier: 0.8,
    npcResponseDelayMs: 500,
    maxBatchedEvalCharacters: 8,
  },
  roomGeneration: {
    sizeTemplates: {
      tiny: { width: 10, height: 8 },
      small: { width: 12, height: 10 },
      medium: { width: 16, height: 12 },
      large: { width: 20, height: 15 },
      wide: { width: 24, height: 12 },
      tall: { width: 12, height: 18 },
    },
    maxObjects: 40,
    maxCharacters: 8,
    candidateCount: 8,
    fabricationTimeoutMs: 60000,
  },
  life: {
    /** Health decay per room-year of elapsed time (scaled by duration). */
    healthDecayPerYear: 0.02,
    /** Extra decay when hunger is at/below the starvation threshold on room exit. */
    starvationThreshold: 0.15,
    starvationHealthDecay: 0.05,
    /** Hunger drain per day of room duration (capped at hungerDrainMaxDays). */
    hungerDrainPerDay: 0.15,
    /** Long rooms imply off-screen meals — drain at most this many days' worth. */
    hungerDrainMaxDays: 3,
    /**
     * Rooms spanning at least this many days include routine off-screen meals:
     * hunger floors at offScreenMealFloor. Starvation pressure comes from
     * consecutive day-resolution rooms (crises) and LLM-driven events, not the
     * baseline clock — "pressure yes, death spiral no".
     */
    offScreenMealDays: 7,
    offScreenMealFloor: 0.6,
    /** Hunger floor per room — a room never drains below this on its own. */
    minHungerAfterRoom: 0.05,
    /** Age in years past which natural-death weighting begins. */
    elderlyAge: 70,
  },
  economy: {
    startingMoney: 0,
    /** Soft floor — debt cannot exceed this. Bankruptcy is the escape valve. */
    debtFloor: -25000,
  },
  conversation: {
    streamingCharsPerSecond: 30,
    maxDialogueLength: 300,
    npcResponseDelayMs: 500,
  },
  contentSafety: {
    maxDialogueInputChars: 500,
    maxNameChars: 50,
    contentClassifierRetryLimit: 3,
    minorAgeThreshold: 18,
    peerRomanceMaxAgeGap: 2,
  },
  compression: {
    /** Max chars for a CompressedRoomSummary narrative. */
    maxNarrativeChars: 400,
    maxBehavioralSignalChars: 300,
    /** compressedHistory entries beyond this get meta-compressed (oldest first). */
    historySoftCap: 60,
  },
  ui: {
    topBandHeightPct: 10,
    bottomBandHeightPctDesktop: 12,
    backdropDim: 0.4,
    idleNudgeFirstSeconds: 120,
    idleNudgeRepeatSeconds: 60,
  },
} as const;

export type GameConfig = typeof GAME_CONFIG;
