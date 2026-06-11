import { GAME_CONFIG } from "./game-config.js";
import type { LifeContext } from "../types/life-context.js";

/**
 * CONTROLS — the complete registry of player controls and the condition for
 * each to exist. Controls are unlocked over a life, not granted up front:
 * a newborn can cry and think; crawling unlocks the body; first words unlock
 * the voice; adolescence unlocks the phone.
 *
 * Every input surface (canvas keys, bottom-bar buttons, hotkeys) derives
 * from this list — nothing checks ages ad hoc.
 */

export type ControlId = "think" | "cry" | "move" | "interact" | "speak" | "phone" | "timeDial";

export interface ControlDef {
  readonly id: ControlId;
  readonly label: string;
  readonly keys: string;
  /** Human-readable unlock condition — shown in docs/UI, mirrored by isUnlocked. */
  readonly unlockedWhen: string;
  readonly isUnlocked: (context: LifeContext) => boolean;
}

export const CONTROLS: readonly ControlDef[] = [
  {
    id: "think",
    label: "Think",
    keys: "T",
    unlockedWhen: "always — the self is there from the first breath",
    isUnlocked: () => true,
  },
  {
    id: "cry",
    label: "Cry",
    keys: "C",
    unlockedWhen: "until real speech arrives (speechAgeYears)",
    isUnlocked: (c) => c.playerAgeYears < GAME_CONFIG.speech.speechAgeYears,
  },
  {
    id: "move",
    label: "Move",
    keys: "WASD / arrows",
    unlockedWhen: "after the learning-to-crawl moment (crawlAgeYears)",
    isUnlocked: (c) => c.playerAgeYears >= GAME_CONFIG.milestones.crawlAgeYears,
  },
  {
    id: "interact",
    label: "Interact",
    keys: "E / Space / Enter",
    unlockedWhen: "after the learning-to-crawl moment (crawlAgeYears)",
    isUnlocked: (c) => c.playerAgeYears >= GAME_CONFIG.milestones.crawlAgeYears,
  },
  {
    id: "speak",
    label: "Speak",
    keys: "Y",
    unlockedWhen: "after first words (firstWordsAgeYears); babble until speechAgeYears",
    isUnlocked: (c) => c.playerAgeYears >= GAME_CONFIG.milestones.firstWordsAgeYears,
  },
  {
    id: "phone",
    label: "Phone",
    keys: "P",
    unlockedWhen: "teenager and older, in eras that have phones",
    isUnlocked: (c) =>
      c.playerAgeYears >= GAME_CONFIG.phone.phoneAgeYears && c.era !== "industrial",
  },
  {
    id: "timeDial",
    label: "Time dial",
    keys: "drag the slider",
    unlockedWhen: "always — pacing belongs to the player",
    isUnlocked: () => true,
  },
];

export function isControlUnlocked(id: ControlId, context: LifeContext): boolean {
  const control = CONTROLS.find((c) => c.id === id);
  return control !== undefined && control.isUnlocked(context);
}
