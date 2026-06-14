import { describe, it, expect } from "vitest";
import {
  RoomSchema,
  CandidatesSchema,
  SelectCandidateSchema,
  CharacterResponseSchema,
  UpdateCharacterStatesSchema,
  CompressCharacterMemorySchema,
  CompressPlayerMemorySchema,
  RoomMessagesSchema,
  SocialFeedSchema,
  WebpageSchema,
  MinigameSchema,
  PlayerIntentSchema,
  InteractionResultSchema,
  validateLLMOutput,
  extractJson,
  LLMValidationError,
} from "../schemas/index.js";

const validRoom = {
  label: "Kindergarten Classroom",
  description: "Sunlight through tall windows. Crayon drawings taped to every wall.",
  situation: "It is your first day of school. The teacher is greeting children at the door.",
  era: "modern",
  duration: "day",
  sizeTemplate: "medium",
  floorAssetId: "floor_linoleum",
  wallAssetId: "wall_school",
  objects: [
    {
      label: "Teacher's desk",
      description: "A heavy oak desk with a name plate.",
      category: "fixture",
      assetId: "teacher_desk",
      position: { col: 8, row: 2 },
      solid: true,
      interaction: { type: "examine", text: "The name plate reads Ms. Patterson." },
      tags: ["school"],
    },
  ],
  characters: [
    {
      name: "Ms. Patterson",
      role: "teacher",
      age: 41,
      personality: "warm but firm, twenty years of five-year-olds",
      backstory: "Has taught kindergarten in this town her whole career.",
      intent: "Welcome the new children and settle them in",
      emotionalState: "cheerful",
      ambientLine: "Find a cubby for your coat, sweetheart.",
      position: { col: 7, row: 3 },
      assetId: "chr_teacher",
    },
  ],
  openingMonologue: "So many kids. My shoes feel too new.",
};

describe("RoomSchema (prompt_room)", () => {
  it("accepts a complete valid room", () => {
    expect(RoomSchema.safeParse(validRoom).success).toBe(true);
  });

  it("rejects an unknown era", () => {
    expect(RoomSchema.safeParse({ ...validRoom, era: "cyberpunk" }).success).toBe(false);
  });

  it("rejects more than 8 characters", () => {
    const character = validRoom.characters[0];
    const crowd = Array.from({ length: 9 }, () => character);
    expect(RoomSchema.safeParse({ ...validRoom, characters: crowd }).success).toBe(false);
  });

  it("rejects out-of-bounds object positions", () => {
    const bad = {
      ...validRoom,
      objects: [{ ...validRoom.objects[0], position: { col: 99, row: 0 } }],
    };
    expect(RoomSchema.safeParse(bad).success).toBe(false);
  });
});

describe("CandidatesSchema / SelectCandidateSchema", () => {
  it("accepts a weighted candidate list", () => {
    const result = CandidatesSchema.safeParse({
      candidates: [
        { concept: "Recess", premise: "Out to the playground.", duration: "day", weight: 0.7 },
        { concept: "Sick day", premise: "A fever keeps you home.", duration: "week", weight: 0.2 },
        { concept: "Family dinner", premise: "Dad is home early.", duration: "day", weight: 0.5 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects fewer than 3 candidates", () => {
    expect(
      CandidatesSchema.safeParse({
        candidates: [
          { concept: "A", premise: "a", duration: "day", weight: 0.5 },
        ],
      }).success,
    ).toBe(false);
  });

  it("validates candidate selection output", () => {
    expect(SelectCandidateSchema.safeParse({ selectedIndex: 2, reason: "Momentum." }).success).toBe(true);
    expect(SelectCandidateSchema.safeParse({ selectedIndex: 12, reason: "x" }).success).toBe(false);
  });
});

describe("character schemas", () => {
  it("accepts a character response with deltas", () => {
    const result = CharacterResponseSchema.safeParse({
      dialogue: "You came! I didn't think you would.",
      mood: "surprised",
      affectionDeltas: { trust: 0.05, resentment: -0.1 },
      endsConversation: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects oversized affection deltas", () => {
    const result = CharacterResponseSchema.safeParse({
      dialogue: "hi",
      mood: "flat",
      affectionDeltas: { trust: 0.9 },
      endsConversation: true,
    });
    expect(result.success).toBe(false);
  });

  it("accepts batched character state updates", () => {
    const result = UpdateCharacterStatesSchema.safeParse({
      updates: [
        {
          name: "Marcus",
          emotionalState: "wistful",
          intent: "finish his shift and go home",
          affection: { attraction: 0, trust: 0.6, respect: 0.5, resentment: 0.1, awareness: 1, intimacy: 0.3 },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts compressed character memory", () => {
    expect(
      CompressCharacterMemorySchema.safeParse({ memorySummary: "They were kind to me once." }).success,
    ).toBe(true);
  });
});

describe("CompressPlayerMemorySchema", () => {
  it("accepts a full compression result", () => {
    const result = CompressPlayerMemorySchema.safeParse({
      narrative: "First day of school: tears at the door, then a friend by lunch.",
      behavioralSignal: "Hesitant at first, warmed up quickly when approached.",
      tags: ["school", "friendship", "milestone"],
      emotionalValence: 0.6,
      isLifeEvent: true,
      milestone: "first_day_of_school",
    });
    expect(result.success).toBe(true);
  });

  it("rejects valence outside -1..1", () => {
    const result = CompressPlayerMemorySchema.safeParse({
      narrative: "x",
      behavioralSignal: "y",
      tags: [],
      emotionalValence: 1.5,
      isLifeEvent: false,
      milestone: null,
    });
    expect(result.success).toBe(false);
  });
});

describe("surface schemas", () => {
  it("accepts room messages", () => {
    expect(
      RoomMessagesSchema.safeParse({
        messages: [
          { kind: "npc_line", characterName: "Ms. Patterson", text: "Circle time!", atSeconds: 30 },
          { kind: "monologue", text: "The carpet smells like glue.", atSeconds: 60 },
        ],
      }).success,
    ).toBe(true);
  });

  it("accepts a social feed", () => {
    expect(
      SocialFeedSchema.safeParse({
        posts: [{ authorName: "Aunt Carol", text: "Look who started school!!", likes: 14, postedAgo: "2h" }],
      }).success,
    ).toBe(true);
  });

  it("accepts a webpage", () => {
    expect(
      WebpageSchema.safeParse({
        title: "Lakeside Gazette",
        url: "lakesidegazette.com",
        paragraphs: ["Local school welcomes its largest kindergarten class in a decade."],
        links: ["Sports", "Weather"],
      }).success,
    ).toBe(true);
  });

  it("accepts each minigame template and rejects unknown templates", () => {
    expect(
      MinigameSchema.safeParse({
        title: "Sorting mail",
        instructions: "Drag each letter to its zone.",
        config: {
          template: "sorting",
          items: [
            { label: "Letter to Maple St", category: "North" },
            { label: "Letter to Dock Rd", category: "South" },
          ],
          categories: ["North", "South"],
        },
      }).success,
    ).toBe(true);

    expect(
      MinigameSchema.safeParse({
        title: "x",
        instructions: "y",
        config: { template: "first_person_shooter" },
      }).success,
    ).toBe(false);
  });
});

describe("intent schemas", () => {
  it("classifies player intent", () => {
    expect(
      PlayerIntentSchema.safeParse({ intent: "talk", targetLabel: "Ms. Patterson", utterance: "hi", tone: "shy" }).success,
    ).toBe(true);
    expect(PlayerIntentSchema.safeParse({ intent: "teleport" }).success).toBe(false);
  });

  it("bounds interaction result deltas", () => {
    expect(
      InteractionResultSchema.safeParse({
        outcome: "You eat the apple. It's mealy but sweet.",
        statDeltas: { hunger: 0.2 },
      }).success,
    ).toBe(true);
    expect(
      InteractionResultSchema.safeParse({
        outcome: "jackpot",
        statDeltas: { money: 99999999 },
      }).success,
    ).toBe(false);
  });
});

describe("validateLLMOutput / extractJson", () => {
  it("extracts JSON from markdown fences", () => {
    const raw = "Here you go:\n```json\n{\"selectedIndex\": 1, \"reason\": \"It fits.\"}\n```";
    const result = validateLLMOutput(SelectCandidateSchema, raw);
    expect(result.selectedIndex).toBe(1);
  });

  it("extracts JSON embedded in prose", () => {
    const raw = "Sure. {\"selectedIndex\": 0, \"reason\": \"Only option.\"} Hope that helps!";
    expect(validateLLMOutput(SelectCandidateSchema, raw).selectedIndex).toBe(0);
  });

  it("throws LLMValidationError on schema mismatch with issue details", () => {
    expect(() => validateLLMOutput(SelectCandidateSchema, '{"selectedIndex": "two"}')).toThrow(
      LLMValidationError,
    );
  });

  it("throws when no JSON is present", () => {
    expect(() => extractJson("I'm sorry, I can't do that.")).toThrow(LLMValidationError);
  });
});
