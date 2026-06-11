import { z } from "zod";

/**
 * player_intent (Haiku) — classifies free-text player input into a
 * structured action the harness can resolve.
 */
export const PlayerIntentSchema = z.object({
  intent: z.enum([
    "talk",
    "examine",
    "use",
    "pick_up",
    "consume",
    "move",
    "leave",
    "emote",
    "think",
    "other",
  ]),
  /** The object/character label being targeted, when identifiable. */
  targetLabel: z.string().max(60).optional(),
  /** Cleaned-up version of what the player is saying, for talk intents. */
  utterance: z.string().max(500).optional(),
  /** Emotional register of the input, e.g. 'angry', 'playful'. */
  tone: z.string().max(40).optional(),
});

export type PlayerIntentLLMOutput = z.infer<typeof PlayerIntentSchema>;

/**
 * interaction_result (Haiku) — resolves a player interaction into outcome
 * text and bounded state deltas. The harness applies deltas; the LLM proposes.
 */
export const InteractionResultSchema = z.object({
  /** What happens — shown in the dialogue box. */
  outcome: z.string().min(1).max(500),
  /** Player's internal reaction. Hidden stats surface here, never as numbers. */
  monologue: z.string().max(300).optional(),
  statDeltas: z
    .object({
      hunger: z.number().min(-1).max(1).optional(),
      health: z.number().min(-0.5).max(0.5).optional(),
      money: z.number().min(-10000).max(10000).optional(),
    })
    .optional(),
  /** Behavioral pattern tags this interaction evidences, e.g. 'generosity'. */
  behavioralTags: z.array(z.string().max(40)).max(3).optional(),
});

export type InteractionResultLLMOutput = z.infer<typeof InteractionResultSchema>;
