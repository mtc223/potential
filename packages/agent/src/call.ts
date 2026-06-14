import { LLMValidationError, validateLLMOutput } from "@potential/shared";
import type { z } from "zod";
import type { LLMAdapter, LLMRequest } from "./adapter.js";

/**
 * callValidated — one LLM call with schema validation and bounded retry.
 * On validation failure the model is re-asked with the error appended
 * (up to `retries` additional attempts). The raw string never escapes.
 */
export async function callValidated<Out>(
  adapter: LLMAdapter,
  request: LLMRequest,
  schema: z.ZodType<Out>,
  retries = 1,
): Promise<Out> {
  let lastError: LLMValidationError | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const user =
      lastError === null
        ? request.user
        : `${request.user}\n\nYour previous response was invalid: ${lastError.message}\nRespond again with ONLY a valid JSON object.`;
    const raw = await adapter.complete({ ...request, user });
    try {
      return validateLLMOutput(schema, raw);
    } catch (error) {
      if (error instanceof LLMValidationError) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }
  if (lastError !== null) throw lastError;
  throw new Error("callValidated: unreachable");
}
