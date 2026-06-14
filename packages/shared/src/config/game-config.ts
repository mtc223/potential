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
      toddler: 1.1,
      child: 1.8,
      teen: 2.2,
      youngAdult: 2.2,
      adult: 2.2,
      middleAged: 2.0,
      senior: 1.5,
    },
    minSpeedMultiplier: 0.3,
  },
  speech: {
    /** Below this age, anything the player says comes out as babble. */
    speechAgeYears: 4,
  },
  phone: {
    /** Minimum age to carry a phone. The industrial era never has one. */
    phoneAgeYears: 13,
  },
  milestones: {
    /** WASD/interact unlock here — the learning-to-crawl scene. */
    crawlAgeYears: 0.7,
    /** Speak unlocks here — still babble until speechAgeYears. */
    firstWordsAgeYears: 1.1,
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
    // Wide-rectangular, sized to fill a 16:9-ish viewport without acres of
    // empty floor. Heights stay <= 9 so a room never letterboxes vertically.
    sizeTemplates: {
      tiny: { width: 8, height: 6 },
      small: { width: 11, height: 7 },
      medium: { width: 13, height: 8 },
      large: { width: 16, height: 9 },
      wide: { width: 18, height: 9 },
      tall: { width: 10, height: 9 },
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
