import { z } from "zod";
import {
  EraSchema,
  GridPosSchema,
  LongText,
  MediumText,
  RoomDurationSchema,
  ShortText,
  SizeTemplateSchema,
} from "./common.schema.js";

/**
 * prompt_room (Sonnet) — full room fabrication output.
 *
 * The LLM proposes labels and asset ids — NEVER UUIDs. The harness assigns
 * all ids and resolves character names against the existing roster.
 */

export const RoomObjectLLMSchema = z.object({
  label: z.string().min(1).max(60),
  description: MediumText,
  category: z.enum(["item", "fixture", "ambient"]),
  /** Must exist in the asset catalog — validated against it by the agent. */
  assetId: z.string().min(1).max(60),
  position: GridPosSchema,
  solid: z.boolean(),
  interaction: z
    .object({
      type: z.enum(["examine", "use", "pick_up", "eat", "drink", "sit"]),
      text: MediumText.optional(),
      hungerDelta: z.number().min(-1).max(1).optional(),
      healthDelta: z.number().min(-1).max(1).optional(),
    })
    .optional(),
  tags: z.array(z.string().max(40)).max(8),
});

export const RoomCharacterLLMSchema = z.object({
  /** Harness matches case-insensitively against the roster; no match creates a new character. */
  name: z.string().min(1).max(50),
  role: z.string().min(1).max(40),
  age: z.number().min(0).max(120),
  personality: MediumText,
  backstory: MediumText,
  /** What they are trying to accomplish in this room. Drives ambient behavior. */
  intent: MediumText,
  emotionalState: ShortText,
  /** A line they may say ambiently, unprompted. */
  ambientLine: MediumText.optional(),
  position: GridPosSchema,
  /** Sprite selector from the character asset set. */
  assetId: z.string().min(1).max(60),
});

export const RoomSchema = z.object({
  label: z.string().min(1).max(80),
  /** Recurring-place slug ("home_nursery"). Absent/none = one-off location. */
  placeId: z
    .string()
    .max(40)
    .regex(/^[a-z0-9_]+$/)
    .optional(),
  description: LongText,
  /** What is happening here. Presents, never prescribes. */
  situation: MediumText,
  era: EraSchema,
  duration: RoomDurationSchema,
  sizeTemplate: SizeTemplateSchema,
  floorAssetId: z.string().min(1).max(60),
  wallAssetId: z.string().min(1).max(60),
  objects: z.array(RoomObjectLLMSchema).max(40),
  characters: z.array(RoomCharacterLLMSchema).max(8),
  /** The player's opening internal thought on entering. Hidden stats surface here. */
  openingMonologue: MediumText,
});

export type RoomLLMOutput = z.infer<typeof RoomSchema>;
export type RoomObjectLLMOutput = z.infer<typeof RoomObjectLLMSchema>;
export type RoomCharacterLLMOutput = z.infer<typeof RoomCharacterLLMSchema>;

/**
 * generate_candidates (Haiku) — weighted next-room concepts from LifeContext.
 */
export const RoomCandidateSchema = z.object({
  /** Short concept label, e.g. 'First day of kindergarten'. */
  concept: z.string().min(1).max(100),
  premise: MediumText,
  duration: RoomDurationSchema,
  /** Relative narrative weight 0–1 — how strongly life is pulling here. */
  weight: z.number().min(0).max(1),
});

export const CandidatesSchema = z.object({
  candidates: z.array(RoomCandidateSchema).min(3).max(8),
});

export type RoomCandidate = z.infer<typeof RoomCandidateSchema>;
export type CandidatesLLMOutput = z.infer<typeof CandidatesSchema>;

/**
 * select_candidate (Haiku) — picks the next room from the candidate list.
 */
export const SelectCandidateSchema = z.object({
  selectedIndex: z.number().int().min(0).max(7),
  reason: MediumText,
});

export type SelectCandidateLLMOutput = z.infer<typeof SelectCandidateSchema>;
