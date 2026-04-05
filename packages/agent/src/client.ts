import Anthropic from "@anthropic-ai/sdk";

/**
 * Two-model architecture:
 * - Sonnet: prompt_room() only (world fabrication — high reasoning load)
 * - Haiku: all other LLM functions (character responses, compression, etc.)
 *
 * BYOK — the API key is supplied by the player, never bundled.
 */
export function createAnthropicClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

export const SONNET_MODEL = "claude-sonnet-4-6" as const;
export const HAIKU_MODEL = "claude-haiku-4-5-20251001" as const;
