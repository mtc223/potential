// @potential/agent — LLM function layer
// Sonnet handles prompt_room() only. Haiku handles all other LLM functions.
// Every output is Zod-validated before it can touch game state.

export * from "./adapter.js";
export { AnthropicAdapter } from "./anthropic-adapter.js";
export { MockAdapter } from "./mock-adapter.js";
export { callValidated } from "./call.js";
export { buildSystemPrompt, serializeLifeHistory, type ContextView } from "./prompts/preamble.js";
export { saveApiKey, loadApiKey, clearApiKey, validateApiKey, type KeyValidationResult } from "./byok.js";
export * from "./functions/index.js";
export * from "./client.js";
