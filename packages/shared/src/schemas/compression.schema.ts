import { z } from "zod";
import { ValenceFloat } from "./common.schema.js";

/**
 * compress_player_memory (Haiku) — all room events collapse into a single
 * summary. Fires on room transition, before N+1 candidate generation.
 *
 * The harness fills roomId/sequenceIndex/playerAgeYears/worldDate itself —
 * the LLM never writes ids or clock values.
 */
export const CompressPlayerMemorySchema = z.object({
  /** 1–2 sentence human-readable summary. Journal-facing. */
  narrative: z.string().min(1).max(400),
  /** How the player behaved — choices, tone, patterns. */
  behavioralSignal: z.string().min(1).max(300),
  tags: z.array(z.string().max(40)).max(10),
  emotionalValence: ValenceFloat,
  /** True only for genuinely formative rooms — births, deaths, firsts. */
  isLifeEvent: z.boolean(),
  /** e.g. 'first_day_of_school', 'married'. Null when not a milestone. */
  milestone: z.string().max(60).nullable(),
});

export type CompressPlayerMemoryLLMOutput = z.infer<typeof CompressPlayerMemorySchema>;
