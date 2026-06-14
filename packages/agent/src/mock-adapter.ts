import { getAssetsForContext, GAME_CONFIG } from "@potential/shared";
import type { LLMAdapter, LLMRequest } from "./adapter.js";

/**
 * MockAdapter — deterministic LLM stand-in for unit tests, CI, and offline
 * play. Produces schema-valid JSON for every function, with enough rotation
 * across calls that long stress runs exercise varied rooms and characters.
 *
 * Determinism: same call sequence → same outputs. No randomness.
 */

const ROOM_CYCLE = [
  { context: "nursery", label: "The Nursery", duration: "month" },
  { context: "living_room", label: "The Living Room", duration: "week" },
  { context: "backyard", label: "The Backyard", duration: "day" },
  { context: "school", label: "A Classroom", duration: "month" },
  { context: "playground", label: "The Playground", duration: "day" },
  { context: "kitchen", label: "The Kitchen", duration: "day" },
  { context: "street", label: "Main Street", duration: "day" },
  { context: "office", label: "An Office", duration: "month" },
  { context: "park", label: "City Park", duration: "day" },
  { context: "hospital", label: "A Hospital Room", duration: "week" },
] as const;

const NAME_CYCLE = ["Marcus", "Sarah", "Mr. Webb", "Dana", "Lou", "Priya", "Old Joe", "Nessa"] as const;

export class MockAdapter implements LLMAdapter {
  private callCounts = new Map<string, number>();

  /** Number of calls made per function — handy for test assertions. */
  callsTo(fn: LLMRequest["fn"]): number {
    return this.callCounts.get(fn) ?? 0;
  }

  complete(request: LLMRequest): Promise<string> {
    const n = (this.callCounts.get(request.fn) ?? 0) + 1;
    this.callCounts.set(request.fn, n);
    return Promise.resolve(JSON.stringify(this.payload(request, n - 1)));
  }

  private payload(request: LLMRequest, seq: number): unknown {
    switch (request.fn) {
      case "prompt_room":
        return mockRoom(seq);
      case "generate_candidates":
        return {
          candidates: ROOM_CYCLE.slice(0, 4).map((r, i) => ({
            concept: r.label,
            premise: `Life drifts toward ${r.label.toLowerCase()}.`,
            duration: r.duration,
            weight: 0.9 - i * 0.2,
          })),
        };
      case "select_candidate":
        return { selectedIndex: seq % 4, reason: "The strongest narrative pull right now." };
      case "character_response":
        return {
          dialogue: pick(
            [
              "Hm. You always did ask good questions.",
              "Long day. But it's better now that you're here.",
              "Careful with that — it's older than you are.",
              "You remind me of myself at your age.",
            ],
            seq,
          ),
          mood: pick(["warm", "wry", "tired", "amused"], seq),
          affectionDeltas: { trust: 0.02 },
          endsConversation: seq % 5 === 4,
        };
      case "interaction_result":
        return {
          outcome: "It works, more or less. Nothing dramatic happens, but something small shifts.",
          monologue: pick(
            ["That felt right.", "Why did I do that?", "Mom would have laughed at this."],
            seq,
          ),
          statDeltas: {},
          behavioralTags: [],
        };
      case "update_character_state":
        return {
          updates: [
            {
              name: NAME_CYCLE[seq % NAME_CYCLE.length],
              emotionalState: "settled",
              intent: "go about their day",
              affection: {
                attraction: 0,
                trust: clamp01(0.3 + seq * 0.05),
                respect: 0.4,
                resentment: 0.05,
                awareness: 1,
                intimacy: clamp01(0.2 + seq * 0.03),
              },
            },
          ],
        };
      case "compress_player_memory":
        return {
          narrative: `Room ${String(seq + 1)}: a stretch of life passed — small choices, small changes.`,
          behavioralSignal: "The player explored, talked to whoever was present, and moved on.",
          tags: ["routine", pick(ROOM_CYCLE, seq).context],
          emotionalValence: [(0.3), (-0.1), (0.5), (0)][seq % 4] ?? 0,
          isLifeEvent: seq % 7 === 0,
          milestone: seq % 7 === 0 ? `milestone_${String(seq)}` : null,
        };
      case "compress_character_memory":
        return { memorySummary: "They've been around. Mostly kind, occasionally distracted." };
      case "generate_room_messages":
        return {
          messages: [
            { kind: "monologue", text: "The light in here is strange this time of day.", atSeconds: 20 },
            {
              kind: "npc_line",
              characterName: NAME_CYCLE[seq % NAME_CYCLE.length],
              text: "Don't mind me, just passing through.",
              atSeconds: 45,
            },
          ],
        };
      case "generate_social_feed":
        return {
          posts: [
            { authorName: "Aunt Carol", text: "Can't believe how time flies!!", likes: 12, postedAgo: "2h" },
            { authorName: "Marcus", text: "new week, same grind", likes: 4, postedAgo: "5h" },
          ],
        };
      case "generate_webpage":
        return {
          title: "The Lakeside Gazette",
          url: "lakesidegazette.com",
          paragraphs: ["Local news: the farmers market returns this weekend after a long winter."],
          links: ["Weather", "Classifieds"],
        };
      case "generate_minigame":
        return {
          title: "Sorting the Mail",
          instructions: "Put each letter in the right bin before the shift ends.",
          config: {
            template: "sorting",
            items: [
              { label: "Letter to Maple St", category: "North Route" },
              { label: "Letter to Dock Rd", category: "South Route" },
              { label: "Parcel for Main St", category: "North Route" },
            ],
            categories: ["North Route", "South Route"],
          },
        };
      case "player_intent": {
        const lower = request.user.toLowerCase();
        const intent = lower.includes("leave") || lower.includes("go")
          ? "leave"
          : lower.includes("eat")
            ? "consume"
            : lower.includes("look") || lower.includes("examine")
              ? "examine"
              : "talk";
        return { intent, utterance: "…", tone: "neutral" };
      }
      default:
        return {};
    }
  }
}

function mockRoom(seq: number): unknown {
  const spec = pick(ROOM_CYCLE, seq);
  const { width, height } = GAME_CONFIG.roomGeneration.sizeTemplates.medium;
  const objects = getAssetsForContext(spec.context, "object").slice(0, 6);
  const floors = getAssetsForContext(spec.context, "floor");
  const walls = getAssetsForContext(spec.context, "wall");
  const characterName = NAME_CYCLE[seq % NAME_CYCLE.length];

  return {
    label: spec.label,
    description: `A ${spec.context.replace("_", " ")} rendered in plain daylight. Mock world, real structure.`,
    situation: "An ordinary stretch of time. People drift through their routines.",
    era: "modern",
    duration: spec.duration,
    sizeTemplate: "medium",
    floorAssetId: floors[0]?.id ?? "floor_wood",
    wallAssetId: walls[0]?.id ?? "wall_plaster",
    objects: objects.map((asset, i) => ({
      label: asset.name,
      description: `A ${asset.name.toLowerCase()}.`,
      category: "fixture",
      assetId: asset.id,
      position: { col: 2 + ((i * 3) % (width - 4)), row: 2 + Math.floor((i * 3) / (width - 4)) * 3 % (height - 4) },
      solid: asset.solid,
      interaction: { type: "examine", text: `It's a ${asset.name.toLowerCase()}. Sturdy enough.` },
      tags: [spec.context],
    })),
    characters: [
      {
        name: characterName,
        role: seq === 0 ? "mother" : "acquaintance",
        age: 34,
        personality: "steady, observant, quick to smile",
        backstory: "Has lived in this town their whole life.",
        intent: "keep an eye on things",
        emotionalState: "calm",
        ambientLine: "Some days just feel longer than others.",
        position: { col: Math.floor(width / 2), row: Math.floor(height / 2) },
        assetId: "chr_adult_casual",
      },
    ],
    openingMonologue: pick(
      [
        "Something about this place feels familiar already.",
        "New room, same me. Mostly.",
        "I could stay here a while. Or not.",
      ],
      seq,
    ),
  };
}

function pick<T>(options: readonly T[], seq: number): T {
  const item = options[seq % options.length];
  if (item === undefined) throw new Error("pick: empty options");
  return item;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
