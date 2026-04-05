import { z } from "zod";

export const RoomSchema = z.object({
  label: z.string().min(1).max(80),
  description: z.string().min(1).max(2000),
  era: z.enum([
    "prehistoric",
    "ancient",
    "medieval",
    "renaissance",
    "industrial",
    "modern",
    "near-future",
    "far-future",
  ]),
  objects: z.array(
    z.object({
      label: z.string().min(1).max(60),
      description: z.string().min(1).max(400),
      category: z.enum(["npc", "item", "fixture", "exit", "ambient"]),
      tags: z.array(z.string()),
    })
  ),
});

export type RoomLLMOutput = z.infer<typeof RoomSchema>;
