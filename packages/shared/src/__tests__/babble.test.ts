import { describe, it, expect } from "vitest";
import { GAME_CONFIG } from "../config/game-config.js";
import { babbleize, isPreverbal } from "../text/babble.js";

describe("isPreverbal", () => {
  it("gates on the configured speech age", () => {
    expect(isPreverbal(0)).toBe(true);
    expect(isPreverbal(GAME_CONFIG.speech.speechAgeYears - 0.1)).toBe(true);
    expect(isPreverbal(GAME_CONFIG.speech.speechAgeYears)).toBe(false);
    expect(isPreverbal(30)).toBe(false);
  });
});

describe("babbleize", () => {
  it("returns speech unchanged once the player can talk", () => {
    expect(babbleize("Hello there, fine sir.", 30)).toBe("Hello there, fine sir.");
  });

  it("replaces every input word with babble for a baby", () => {
    const out = babbleize("quantum computing fascinates me deeply", 0);
    expect(out.length).toBeGreaterThan(0);
    for (const word of ["quantum", "computing", "fascinates", "deeply"]) {
      expect(out.toLowerCase()).not.toContain(word);
    }
  });

  it("is deterministic for the same input", () => {
    expect(babbleize("I am hungry", 0)).toBe(babbleize("I am hungry", 0));
  });

  it("varies with the input text", () => {
    expect(babbleize("I am hungry right now please", 0)).not.toBe(
      babbleize("where did my mother go today", 0),
    );
  });

  it("preserves parenthetical actions — gestures are real", () => {
    const out = babbleize("(reaches up toward her face) pick me up please", 0);
    expect(out).toContain("(reaches up toward her face)");
    expect(out.toLowerCase()).not.toContain("please");
  });

  it("keeps question and exclamation endings", () => {
    expect(babbleize("where is my bottle?", 0).endsWith("?")).toBe(true);
    expect(babbleize("give it back!", 0).endsWith("!")).toBe(true);
  });

  it("never produces toddler proto-words for a newborn", () => {
    // Newborns only get syllables; proto-words like "mama" need age >= 1.
    const out = babbleize("a long sentence with many different words inside it", 0);
    expect(out).not.toMatch(/mine!|uh-oh|bye-bye|uppy/);
  });

  it("handles empty input", () => {
    expect(babbleize("", 0)).toBe("");
    expect(babbleize("   ", 0)).toBe("");
  });
});
