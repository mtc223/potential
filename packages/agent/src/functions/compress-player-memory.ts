import {
  CompressPlayerMemorySchema,
  type CompressedRoomSummary,
  type LifeContext,
  type Room,
} from "@potential/shared";
import type { LLMAdapter } from "../adapter.js";
import { callValidated } from "../call.js";
import { buildSystemPrompt } from "../prompts/preamble.js";

/**
 * compress_player_memory — Haiku. Collapses all room events into a single
 * summary. Fires on room transition, BEFORE N+1 candidate generation.
 * The harness owns ids and clock values — the LLM never writes them.
 */
export async function compressPlayerMemory(
  adapter: LLMAdapter,
  room: Room,
  context: LifeContext,
): Promise<CompressedRoomSummary> {
  const events = room.events
    .map((e) => `- [${e.type}] ${e.description}${e.playerChoice !== null ? ` (player: ${e.playerChoice})` : ""}${e.outcome.length > 0 ? ` → ${e.outcome}` : ""}`)
    .join("\n");

  const task = `The player is leaving a room. Compress everything that happened into one summary object. This becomes permanent memory AND the freshest causal signal for what happens next in their life.

ROOM: ${room.label} (${room.duration} of life, player age ${room.playerAgeYears.toFixed(1)})
SITUATION: ${room.situation}
EVENTS:
${events.length > 0 ? events : "- Nothing notable. The player passed through."}

Rules:
- narrative: 1-2 sentences, journal voice, past tense. What this moment WAS.
- behavioralSignal: how the player acted — choices, tone, patterns. This feeds future generation.
- emotionalValence: the room's overall tone for the player, -1.0 to 1.0.
- isLifeEvent: true ONLY for genuinely formative rooms — births, deaths, firsts, ruptures. Most rooms are false.
- milestone: a short snake_case id when a recognizable life milestone occurred, else null.

JSON shape: {"narrative": str, "behavioralSignal": str, "tags": [str], "emotionalValence": num, "isLifeEvent": bool, "milestone": str|null}`;

  const result = await callValidated(
    adapter,
    {
      fn: "compress_player_memory",
      model: "haiku",
      system: buildSystemPrompt(task, context),
      user: "Compress now. JSON only.",
      maxTokens: 500,
    },
    CompressPlayerMemorySchema,
  );

  return {
    ...result,
    roomId: room.id,
    sequenceIndex: room.sequenceIndex,
    playerAgeYears: room.playerAgeYears,
    worldDate: room.worldDate,
  };
}
