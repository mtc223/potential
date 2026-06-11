import {
  MinigameSchema,
  RoomMessagesSchema,
  SocialFeedSchema,
  WebpageSchema,
  sanitizePlayerText,
  wrapPlayerInput,
  type LifeContext,
  type MinigameLLMOutput,
  type Room,
  type RoomMessagesLLMOutput,
  type SocialFeedLLMOutput,
  type WebpageLLMOutput,
} from "@potential/shared";
import type { LLMAdapter } from "../adapter.js";
import { callValidated } from "../call.js";
import { buildSystemPrompt } from "../prompts/preamble.js";

/**
 * generate_room_messages — Haiku. Ambient NPC lines, monologue entries, and
 * background events that fire on a timeline while the player is in the room.
 */
export async function generateRoomMessages(
  adapter: LLMAdapter,
  context: LifeContext,
  room: Room,
): Promise<RoomMessagesLLMOutput> {
  const characterNames = [...room.objects.values()]
    .filter((o) => o.category === "npc")
    .map((o) => o.label);

  const task = `Generate ambient messages for this room session — the room breathing while the player is in it.

ROOM: ${room.label} — ${room.situation}
CHARACTERS PRESENT: ${characterNames.length > 0 ? characterNames.join(", ") : "nobody"}

Rules:
- 3-8 messages spread across the first ~5 minutes (atSeconds).
- npc_line: something a present character says aloud, unprompted. characterName must match exactly.
- monologue: the player's inner voice — observations, feelings. Hidden stats surface here as texture, never as numbers.
- ambient: background events ("somewhere, a phone rings").

JSON shape: {"messages": [{"kind": "npc_line|monologue|ambient", "characterName": str?, "text": str, "atSeconds": num}]}`;

  return callValidated(
    adapter,
    {
      fn: "generate_room_messages",
      model: "haiku",
      system: buildSystemPrompt(task, context, "", "scene"),
      user: "Generate messages now. JSON only.",
      maxTokens: 800,
    },
    RoomMessagesSchema,
  );
}

/**
 * generate_social_feed — Haiku. Era-appropriate posts from people in the
 * player's life, for the phone's social app.
 */
export async function generateSocialFeed(
  adapter: LLMAdapter,
  context: LifeContext,
  knownPeople: string[],
): Promise<SocialFeedLLMOutput> {
  const task = `Generate a social media feed for the player's phone. Era: ${context.era}, year ${context.worldDate.slice(0, 4)}.

Rules:
- 3-8 posts, mostly from people the player knows: ${knownPeople.length > 0 ? knownPeople.join(", ") : "(roster is empty — use plausible acquaintances)"}.
- Posts reflect the world and the player's recent history where natural.
- Match the era's voice (no smartphones before they exist; period-appropriate idioms).

JSON shape: {"posts": [{"authorName": str, "text": str, "likes": int, "postedAgo": str}]}`;

  return callValidated(
    adapter,
    {
      fn: "generate_social_feed",
      model: "haiku",
      system: buildSystemPrompt(task, context, "", "scene"),
      user: "Generate the feed now. JSON only.",
      maxTokens: 800,
    },
    SocialFeedSchema,
  );
}

/**
 * generate_webpage — Haiku. A fake browsable page for the in-game computer.
 * The player's search query is untrusted input.
 */
export async function generateWebpage(
  adapter: LLMAdapter,
  context: LifeContext,
  searchQuery: string,
): Promise<WebpageLLMOutput> {
  const task = `The player typed a search into the in-game computer's browser. Generate the single most plausible era-appropriate webpage result. Era: ${context.era}, year ${context.worldDate.slice(0, 4)}.

JSON shape: {"title": str, "url": str, "paragraphs": [str], "links": [str]}`;

  return callValidated(
    adapter,
    {
      fn: "generate_webpage",
      model: "haiku",
      system: buildSystemPrompt(task, context, "", "scene"),
      user: `Search query: ${wrapPlayerInput(sanitizePlayerText(searchQuery, 200))}\n\nGenerate the page. JSON only.`,
      maxTokens: 1000,
    },
    WebpageSchema,
  );
}

/**
 * generate_minigame — Haiku. Template-first MinigameKit config for a work
 * activity or interactive sequence. The LLM fills content, never logic.
 */
export async function generateMinigame(
  adapter: LLMAdapter,
  context: LifeContext,
  activityDescription: string,
): Promise<MinigameLLMOutput> {
  const task = `Generate a minigame CONFIG for this activity: "${activityDescription}".

Pick the best-fitting template and fill ONLY content data:
- multiple_choice: knowledge/training quizzes. 3-6 questions.
- sorting: categorization work (mail, stock, filing). 4-10 items, 2-4 categories.
- timed_typing: data entry / transcription. 2-5 lines.

Content must fit the activity, the era, and the player's age/job.

JSON shape: {"title": str, "instructions": str, "config": {"template": "multiple_choice", "questions": [{"prompt": str, "options": [str], "correctIndex": int}]} | {"template": "sorting", "items": [{"label": str, "category": str}], "categories": [str]} | {"template": "timed_typing", "lines": [str], "timeLimitSeconds": int}}`;

  return callValidated(
    adapter,
    {
      fn: "generate_minigame",
      model: "haiku",
      system: buildSystemPrompt(task, context, "", "scene"),
      user: "Generate the minigame config now. JSON only.",
      maxTokens: 1200,
    },
    MinigameSchema,
  );
}
