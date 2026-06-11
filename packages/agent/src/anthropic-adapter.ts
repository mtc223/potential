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
    this.client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  }

  async complete(request: LLMRequest): Promise<string> {
    if (request.model === "sonnet" && request.fn !== "prompt_room") {
      throw new LLMRequestError(
        `Sonnet is reserved for prompt_room — "${request.fn}" must run on Haiku`,
        request.fn,
      );
    }

    const response = await this.client.messages.create({
      model: resolveModel(request.model),
      max_tokens: request.maxTokens,
      temperature: request.temperature ?? 1,
      system: request.system,
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
