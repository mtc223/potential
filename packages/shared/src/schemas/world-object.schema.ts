import { z } from "zod";

export const WorldObjectSchema = z.object({
  label: z.string().min(1).max(60),
  description: z.string().min(1).max(400),
  category: z.enum(["npc", "item", "fixture", "exit", "ambient"]),
  tags: z.array(z.string()),
  audio: z
    .object({
      ambientLoop: z.string().optional(),
      interactSound: z.string().optional(),
      volume: z.number().min(0).max(1),
    })
    .optional(),
});

export type WorldObjectLLMOutput = z.infer<typeof WorldObjectSchema>;
