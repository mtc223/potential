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

/**
 * System prompt as stability-ordered blocks. AnthropicAdapter places a cache
 * breakpoint after `core` and after `history`; `task` is never cached.
 * Caches are per-model, so every Haiku call in a session shares the same
 * `core` prefix, and the in-room call burst reuses `history` for free.
 */
export interface SystemSpec {
  /** Safety preamble + age tier + immutable identity. Changes ~4x per life. */
  core: string;
  /** Life events + recent rooms. Append-only; changes once per transition. Empty for scene-view calls. */
  history: string;
  /** Now-state + task instructions + per-call context. Always fresh. */
  task: string;
}

export interface LLMRequest {
  fn: LLMFunctionName;
  model: ModelTier;
  system: SystemSpec;
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
