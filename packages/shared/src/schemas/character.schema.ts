import { z } from "zod";
import { MediumText, ShortText, UnitFloat } from "./common.schema.js";

/**
 * character_response (Haiku) — NPC dialogue from character state + player input.
 */
export const CharacterResponseSchema = z.object({
  dialogue: z.string().min(1).max(300),
  /** Updated surface mood after this exchange, e.g. 'amused', 'guarded'. */
  mood: ShortText,
  /** Small relationship movements from this exchange. Deltas, -0.2 to 0.2. */
  affectionDeltas: z
    .object({
      attraction: z.number().min(-0.2).max(0.2).optional(),
      trust: z.number().min(-0.2).max(0.2).optional(),
      respect: z.number().min(-0.2).max(0.2).optional(),
      resentment: z.number().min(-0.2).max(0.2).optional(),
      intimacy: z.number().min(-0.2).max(0.2).optional(),
    })
    .optional(),
  endsConversation: z.boolean(),
});

export type CharacterResponseLLMOutput = z.infer<typeof CharacterResponseSchema>;

/**
 * update_character_state (Haiku) — batched silent state update on room exit.
 * Absolute values (post-room), not deltas. Names matched against roster by harness.
 */
export const CharacterStateUpdateSchema = z.object({
  name: z.string().min(1).max(50),
  emotionalState: ShortText,
  intent: MediumText,
  affection: z.object({
    attraction: UnitFloat,
    trust: UnitFloat,
    respect: UnitFloat,
    resentment: UnitFloat,
    awareness: UnitFloat,
    intimacy: UnitFloat,
  }),
});

export const UpdateCharacterStatesSchema = z.object({
  updates: z.array(CharacterStateUpdateSchema).max(8),
});

export type CharacterStateUpdate = z.infer<typeof CharacterStateUpdateSchema>;
export type UpdateCharacterStatesLLMOutput = z.infer<typeof UpdateCharacterStatesSchema>;

/**
 * compress_character_memory (Haiku) — the NPC's compressed memory of the player.
 * Asymmetric to player memory by design.
 */
export const CompressCharacterMemorySchema = z.object({
  memorySummary: z.string().min(1).max(600),
});

export type CompressCharacterMemoryLLMOutput = z.infer<typeof CompressCharacterMemorySchema>;
