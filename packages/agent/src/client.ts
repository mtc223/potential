/**
 * Two-model architecture:
 * - Sonnet: prompt_room() only (world fabrication — high reasoning load)
 * - Haiku: all other LLM functions (character responses, compression, etc.)
 *
 * BYOK — the API key is supplied by the player, never bundled.
 * Model access goes through AnthropicAdapter; nothing else touches the SDK.
 */
export const SONNET_MODEL = "claude-sonnet-4-6";
export const HAIKU_MODEL = "claude-haiku-4-5-20251001";
