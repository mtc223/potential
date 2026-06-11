import type { z } from "zod";

/**
 * LLM output validation — the boundary contract.
 * No raw LLM response string ever touches game state. Everything passes
 * through extractJson + a Zod schema first.
 */

export class LLMValidationError extends Error {
  constructor(
    message: string,
    public readonly raw: string,
  ) {
    super(message);
    this.name = "LLMValidationError";
  }
}

/**
 * Extracts the first JSON object from an LLM response, tolerating markdown
 * fences and prose preambles.
 */
export function extractJson(text: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const body = fenced?.[1] ?? text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new LLMValidationError("No JSON object found in LLM response", text);
  }
  return body.slice(start, end + 1);
}

/**
 * Parse and validate an LLM response against a schema.
 * Throws LLMValidationError with the Zod issue list on failure.
 */
export function validateLLMOutput<Out>(
  schema: z.ZodType<Out>,
  rawResponse: string,
): Out {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(rawResponse));
  } catch (error) {
    if (error instanceof LLMValidationError) throw error;
    throw new LLMValidationError(
      `LLM response is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      rawResponse,
    );
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new LLMValidationError(`LLM output failed schema validation: ${issues}`, rawResponse);
  }
  return result.data;
}
