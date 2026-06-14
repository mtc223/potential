import {
  InteractionResultSchema,
  PlayerIntentSchema,
  sanitizePlayerText,
  wrapPlayerInput,
  type InteractionResultLLMOutput,
  type LifeContext,
  type PlayerIntentLLMOutput,
  type Room,
  type WorldObject,
} from "@potential/shared";
import type { LLMAdapter } from "../adapter.js";
import { callValidated } from "../call.js";
import { buildSystemPrompt } from "../prompts/preamble.js";

/**
 * player_intent — Haiku. Classifies free-text player input into a structured
 * action the harness can resolve.
 */
export async function playerIntent(
  adapter: LLMAdapter,
  context: LifeContext,
  room: Room,
  input: string,
): Promise<PlayerIntentLLMOutput> {
  const targets = [...room.objects.values()].map((o) => o.label).join(", ");

  const task = `Classify the player's free-text input into a structured intent.

AVAILABLE TARGETS IN THIS ROOM: ${targets.length > 0 ? targets : "none"}

Rules:
- intent: talk (to a person), examine, use, pick_up, consume (eat/drink), move, leave (exit the room), emote, think (internal), other.
- targetLabel: copy the closest matching target label EXACTLY when one applies.
- utterance: for talk intents, the cleaned-up thing they're saying.
- tone: the emotional register of the input.

JSON shape: {"intent": str, "targetLabel": str?, "utterance": str?, "tone": str?}`;

  return callValidated(
    adapter,
    {
      fn: "player_intent",
      model: "haiku",
      system: buildSystemPrompt(task, context, "", "scene"),
      user: `Player input: ${wrapPlayerInput(sanitizePlayerText(input))}\n\nClassify. JSON only.`,
      maxTokens: 200,
    },
    PlayerIntentSchema,
  );
}

/**
 * interaction_result — Haiku. Resolves a player-object interaction into
 * outcome text and bounded state deltas. The harness applies the deltas.
 */
export async function interactionResult(
  adapter: LLMAdapter,
  context: LifeContext,
  room: Room,
  target: WorldObject,
  action: string,
): Promise<InteractionResultLLMOutput> {
  const task = `Resolve a player interaction in the world. Outcome text is shown in the dialogue box; the optional monologue is the player's inner voice.

ROOM: ${room.label} — ${room.situation}
TARGET: ${target.label} — ${target.description}
ACTION: ${action}

Rules:
- outcome: 1–3 sentences, under 400 characters. monologue: one sentence.
- Outcomes are grounded and proportionate: examining a couch finds coins, not treasure.
- Perception matches the player's developmental stage: infants experience color, texture, warmth — not symbols, self-recognition, or reading.
- statDeltas only when the interaction genuinely affects hunger/health/money. Most interactions move nothing.
- behavioralTags only when this evidences a recurring pattern (e.g. 'generosity', 'defiance').
- The player's nature colors the monologue — never name stats or numbers.

JSON shape: {"outcome": str, "monologue": str?, "statDeltas": {"hunger": num?, "health": num?, "money": num?}?, "behavioralTags": [str]?}`;

  return callValidated(
    adapter,
    {
      fn: "interaction_result",
      model: "haiku",
      system: buildSystemPrompt(task, context, "", "scene"),
      user: "Resolve the interaction now. JSON only.",
      maxTokens: 400,
    },
    InteractionResultSchema,
  );
}
