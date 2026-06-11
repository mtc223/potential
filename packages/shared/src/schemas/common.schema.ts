import { z } from "zod";

/** Shared building blocks for LLM output schemas. */

export const GridPosSchema = z.object({
  col: z.number().int().min(0).max(40),
  row: z.number().int().min(0).max(40),
});

export const EraSchema = z.enum([
  "prehistoric",
  "ancient",
  "medieval",
  "renaissance",
  "industrial",
  "modern",
  "near-future",
  "far-future",
]);

export const RoomDurationSchema = z.enum(["day", "week", "month", "year"]);

export const SizeTemplateSchema = z.enum(["tiny", "small", "medium", "large", "wide", "tall"]);

/** 0–1 float, clamped semantics enforced at parse time. */
export const UnitFloat = z.number().min(0).max(1);

/** -1–1 float for emotional valence. */
export const ValenceFloat = z.number().min(-1).max(1);

export const ShortText = z.string().min(1).max(120);
export const MediumText = z.string().min(1).max(400);
export const LongText = z.string().min(1).max(2000);
