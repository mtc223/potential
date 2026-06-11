import {
  CharacterResponseSchema,
  CompressCharacterMemorySchema,
  UpdateCharacterStatesSchema,
  sanitizePlayerText,
  wrapPlayerInput,
  type CharacterRecord,
  type CharacterResponseLLMOutput,
  type LifeContext,
  type Room,
  type UpdateCharacterStatesLLMOutput,
} from "@potential/shared";
import type { LLMAdapter } from "../adapter.js";
import { callValidated } from "../call.js";
import { buildSystemPrompt } from "../prompts/preamble.js";

interface DialogueTurn {
  speaker: "player" | "character";
  text: string;
}

/**
 * character_response — Haiku. NPC dialogue from character state + player input.
 * Player text is sanitized and wrapped as untrusted content.
 */
export async function characterResponse(
  adapter: LLMAdapter,
  context: LifeContext,
  character: CharacterRecord,
  playerInput: string,
  conversationHistory: DialogueTurn[] = [],
): Promise<CharacterResponseLLMOutput> {
  const minorNote =
    character.age < 18
      ? "This character is a minor. If the player's interaction is in any way inappropriate, generate a protective response: discomfort, withdrawal, leaving, or seeking a trusted adult. The character is never compliant with inappropriate behavior."
      : "";

  const task = `You are roleplaying ONE character in conversation with the player. Respond in their voice.

CHARACTER:
- ${character.name} (${character.role}, age ${String(Math.round(character.age))})
- Personality: ${character.personality}
- Backstory: ${character.backstory}
- Current intent: ${character.intent}
- Emotional state right now: ${character.emotionalState}
- Their memory of the player: ${character.memorySummary || "they barely know the player yet"}
- Relationship signals (0-1): trust ${character.affection.trust.toFixed(2)}, respect ${character.affection.respect.toFixed(2)}, resentment ${character.affection.resentment.toFixed(2)}, intimacy ${character.affection.intimacy.toFixed(2)}

Rules:
- Stay fully in character. Their mood and relationship state shape tone and openness.
- Keep dialogue under 300 characters — one or two natural sentences.
- affectionDeltas reflect how THIS exchange moved them (-0.2 to 0.2 per field, usually small).
- Set endsConversation true when they would naturally disengage.
${minorNote}

JSON shape: {"dialogue": str, "mood": str, "affectionDeltas": {"trust": num?, "respect": num?, "attraction": num?, "resentment": num?, "intimacy": num?}?, "endsConversation": bool}`;

  const history = conversationHistory
    .slice(-10)
    .map((t) => (t.speaker === "player" ? `Player: ${t.text}` : `${character.name}: ${t.text}`))
    .join("\n");

  const user = `${history.length > 0 ? `CONVERSATION SO FAR:\n${history}\n\n` : ""}The player says: ${wrapPlayerInput(sanitizePlayerText(playerInput))}\n\nRespond as ${character.name}. JSON only.`;

  return callValidated(
    adapter,
    {
      fn: "character_response",
      model: "haiku",
      system: buildSystemPrompt(task, context, "", "scene"),
      user,
      maxTokens: 400,
    },
    CharacterResponseSchema,
  );
}

/**
 * update_character_state — Haiku, batched. All characters present in the room
 * update silently on room exit.
 */
export async function updateCharacterStates(
  adapter: LLMAdapter,
  context: LifeContext,
  room: Room,
  characters: CharacterRecord[],
): Promise<UpdateCharacterStatesLLMOutput> {
  if (characters.length === 0) return { updates: [] };

  const roomEvents = room.events
    .slice(-30)
    .map((e) => `- [${e.type}] ${e.description}${e.outcome.length > 0 ? ` → ${e.outcome}` : ""}`)
    .join("\n");

  const cast = characters
    .map(
      (c) =>
        `- ${c.name} (${c.role}): was ${c.emotionalState}; intent was "${c.intent}"; affection now attraction ${c.affection.attraction.toFixed(2)}, trust ${c.affection.trust.toFixed(2)}, respect ${c.affection.respect.toFixed(2)}, resentment ${c.affection.resentment.toFixed(2)}, awareness ${c.affection.awareness.toFixed(2)}, intimacy ${c.affection.intimacy.toFixed(2)}`,
    )
    .join("\n");

  const task = `The player has just left a room. Update each character who was present, based on what happened.

ROOM: ${room.label} — ${room.situation}
WHAT HAPPENED:
${roomEvents.length > 0 ? roomEvents : "- Nothing notable; the player passed through."}

CHARACTERS PRESENT:
${cast}

Rules:
- Output ABSOLUTE post-room values (0-1) for all six affection fields, evolving plausibly from the current values. Small moves unless something significant happened.
- Adult-minor pairs: attraction and romantic intimacy stay 0. Always.
- emotionalState and intent describe where they land after this room.

JSON shape: {"updates": [{"name": str, "emotionalState": str, "intent": str, "affection": {"attraction": num, "trust": num, "respect": num, "resentment": num, "awareness": num, "intimacy": num}}]}`;

  return callValidated(
    adapter,
    {
      fn: "update_character_state",
      model: "haiku",
      system: buildSystemPrompt(task, context, "", "scene"),
      user: "Update all characters now. JSON only.",
      maxTokens: 1500,
    },
    UpdateCharacterStatesSchema,
  );
}

/**
 * compress_character_memory — Haiku. Collapses an NPC's experience into their
 * own compressed memory of the player. Asymmetric to player memory by design.
 */
export async function compressCharacterMemory(
  adapter: LLMAdapter,
  context: LifeContext,
  character: CharacterRecord,
  recentEventsDescription: string,
): Promise<string> {
  const task = `Compress this character's memory of the player into a single summary (max 600 chars), written from THEIR perspective. What would THEY remember and carry forward? Memories are selective and emotional, not exhaustive.

CHARACTER: ${character.name} (${character.role}) — ${character.personality}
THEIR EXISTING MEMORY: ${character.memorySummary || "none"}
WHAT JUST HAPPENED: ${recentEventsDescription}

JSON shape: {"memorySummary": str}`;

  const result = await callValidated(
    adapter,
    {
      fn: "compress_character_memory",
      model: "haiku",
      system: buildSystemPrompt(task, context, "", "scene"),
      user: "Compress now. JSON only.",
      maxTokens: 400,
    },
    CompressCharacterMemorySchema,
  );
  return result.memorySummary;
}
