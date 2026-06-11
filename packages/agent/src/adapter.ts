/**
 * LLMAdapter — the seam between game logic and model access.
 *
 * AnthropicAdapter talks to the real API (BYOK). MockAdapter produces
 * deterministic outputs for unit tests, CI, and offline iteration.
 * Every LLM function goes through this interface; nothing else calls the SDK.
 */

export type LLMFunctionName =
  | "prompt_room"
  | "select_candidate"
  | "generate_candidates"
  | "character_response"
  | "interaction_result"
  | "update_character_state"
  | "compress_player_memory"
  | "compress_character_memory"
  | "generate_room_messages"
  | "generate_social_feed"
  | "generate_webpage"
  | "generate_minigame"
  | "player_intent";

export type ModelTier = "sonnet" | "haiku";

export interface LLMRequest {
  fn: LLMFunctionName;
  model: ModelTier;
  system: string;
  user: string;
  maxTokens: number;
  temperature?: number;
}

export interface LLMAdapter {
  complete(request: LLMRequest): Promise<string>;
}

export class LLMRequestError extends Error {
  constructor(
    message: string,
    public readonly fn: LLMFunctionName,
  ) {
    super(message);
    this.name = "LLMRequestError";
  }
}
