import { describe, it, expect } from "vitest";
import { CONTROLS, GAME_CONFIG, isControlUnlocked, type LifeContext } from "../index.js";

function contextAt(ageYears: number, era: LifeContext["era"] = "modern"): LifeContext {
  return {
    playerName: "T",
    birthDate: "1985-06-15",
    playerAgeYears: ageYears,
    worldDate: "1985-06-15",
    era,
    natureStats: { curiosity: 50, resilience: 50, empathy: 50, ambition: 50, creativity: 50 },
    nurtureStats: { curiosity: 50, resilience: 50, empathy: 50, ambition: 50, creativity: 50 },
    behavioralPatterns: [],
    lifeEvents: [],
    compressedHistory: [],
    emotionalTrajectory: [],
    health: 1,
    hunger: 1,
    money: 0,
    jobTitle: null,
    pacing: "normal",
    deceased: false,
    causeOfDeath: null,
  };
}

describe("CONTROLS registry — unlocked over a life", () => {
  it("a newborn can only cry and think (and touch the time dial)", () => {
    const newborn = contextAt(0);
    const unlocked = CONTROLS.filter((c) => c.isUnlocked(newborn)).map((c) => c.id);
    expect(unlocked.sort()).toEqual(["cry", "think", "timeDial"].sort());
  });

  it("crawling unlocks the body", () => {
    const before = contextAt(GAME_CONFIG.milestones.crawlAgeYears - 0.1);
    const after = contextAt(GAME_CONFIG.milestones.crawlAgeYears);
    expect(isControlUnlocked("move", before)).toBe(false);
    expect(isControlUnlocked("interact", before)).toBe(false);
    expect(isControlUnlocked("move", after)).toBe(true);
    expect(isControlUnlocked("interact", after)).toBe(true);
  });

  it("first words unlock the voice; crying retires at speech age", () => {
    expect(isControlUnlocked("speak", contextAt(GAME_CONFIG.milestones.firstWordsAgeYears - 0.1))).toBe(false);
    expect(isControlUnlocked("speak", contextAt(GAME_CONFIG.milestones.firstWordsAgeYears))).toBe(true);
    expect(isControlUnlocked("cry", contextAt(GAME_CONFIG.speech.speechAgeYears - 0.1))).toBe(true);
    expect(isControlUnlocked("cry", contextAt(GAME_CONFIG.speech.speechAgeYears))).toBe(false);
  });

  it("phones need adolescence and an era that has them", () => {
    expect(isControlUnlocked("phone", contextAt(12))).toBe(false);
    expect(isControlUnlocked("phone", contextAt(13))).toBe(true);
    expect(isControlUnlocked("phone", contextAt(30, "industrial"))).toBe(false);
  });

  it("thinking is never locked — the self is always there", () => {
    expect(isControlUnlocked("think", contextAt(0))).toBe(true);
    expect(isControlUnlocked("think", contextAt(90))).toBe(true);
  });
});
