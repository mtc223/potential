import Anthropic from "@anthropic-ai/sdk";
import { LLMRequestError, type LLMAdapter, type LLMRequest, type ModelTier } from "./adapter.js";
import { HAIKU_MODEL, SONNET_MODEL } from "./client.js";

/**
 * AnthropicAdapter — real API access via the player's own key (BYOK).
 *
 * Model routing is enforced HERE, by tier: prompt_room is the only function
 * that requests 'sonnet'; everything else runs on Haiku. Do not add Sonnet
 * routes without explicit approval.
 */
export class AnthropicAdapter implements LLMAdapter {
  private readonly client: Anthropic;

  constructor(apiKey: string) {
    // SDK defaults are 10min timeout / 2 retries — a single overloaded retry
    // reads as a frozen game. Fail fast instead; the engine's transitions are
    // resumable, so the player just walks right again.
    this.client = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true,
      timeout: 60_000,
      maxRetries: 1,
    });
  }

  async complete(request: LLMRequest): Promise<string> {
    if (request.model === "sonnet" && request.fn !== "prompt_room") {
      throw new LLMRequestError(
        `Sonnet is reserved for prompt_room — "${request.fn}" must run on Haiku`,
        request.fn,
      );
    }

    // Stability-ordered system blocks with cache breakpoints: core (changes
    // ~4x/life) and history (changes once per room) are cached; the in-room
    // burst of calls — dialogue, interactions, the exit pipeline — rereads
    // them at ~10% input cost. Task/now-state stays uncached.
    const system: Anthropic.TextBlockParam[] = [
      { type: "text", text: request.system.core, cache_control: { type: "ephemeral" } },
    ];
    if (request.system.history.length > 0) {
      system.push({ type: "text", text: request.system.history, cache_control: { type: "ephemeral" } });
    }
    system.push({ type: "text", text: request.system.task });

    const response = await this.client.messages.create({
      model: resolveModel(request.model),
      max_tokens: request.maxTokens,
      temperature: request.temperature ?? 1,
      system,
      messages: [{ role: "user", content: request.user }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    if (text.length === 0) {
      throw new LLMRequestError(`Empty response from model for "${request.fn}"`, request.fn);
    }
    return text;
  }
}

function resolveModel(tier: ModelTier): string {
  return tier === "sonnet" ? SONNET_MODEL : HAIKU_MODEL;
}
