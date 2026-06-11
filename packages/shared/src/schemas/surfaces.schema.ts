import { z } from "zod";
import { MediumText } from "./common.schema.js";

/**
 * generate_room_messages (Haiku) — ambient NPC lines, notifications, and
 * inner monologue entries that fire while the player is in the room.
 */
export const RoomMessageSchema = z.object({
  kind: z.enum(["npc_line", "monologue", "ambient"]),
  /** Required for npc_line — must match a character present in the room. */
  characterName: z.string().max(50).optional(),
  text: z.string().min(1).max(300),
  /** Seconds into the room session when this should surface. */
  atSeconds: z.number().min(0).max(600),
});

export const RoomMessagesSchema = z.object({
  messages: z.array(RoomMessageSchema).max(12),
});

export type RoomMessagesLLMOutput = z.infer<typeof RoomMessagesSchema>;

/**
 * generate_social_feed (Haiku) — era-appropriate posts from roster characters.
 */
export const SocialPostSchema = z.object({
  authorName: z.string().min(1).max(50),
  text: z.string().min(1).max(280),
  likes: z.number().int().min(0).max(100000),
  /** e.g. '2h', '3d' */
  postedAgo: z.string().min(1).max(10),
});

export const SocialFeedSchema = z.object({
  posts: z.array(SocialPostSchema).min(1).max(10),
});

export type SocialFeedLLMOutput = z.infer<typeof SocialFeedSchema>;

/**
 * generate_webpage (Haiku) — fake browsable page for the in-game computer.
 */
export const WebpageSchema = z.object({
  title: z.string().min(1).max(120),
  url: z.string().min(1).max(120),
  paragraphs: z.array(MediumText).min(1).max(8),
  links: z.array(z.string().max(80)).max(6),
});

export type WebpageLLMOutput = z.infer<typeof WebpageSchema>;

/**
 * generate_minigame (Haiku) — template-first MinigameKit configuration.
 * The LLM fills content data, never game logic.
 */
export const MultipleChoiceConfigSchema = z.object({
  template: z.literal("multiple_choice"),
  questions: z
    .array(
      z.object({
        prompt: z.string().min(1).max(300),
        options: z.array(z.string().min(1).max(120)).min(2).max(4),
        correctIndex: z.number().int().min(0).max(3),
      }),
    )
    .min(1)
    .max(8),
});

export const SortingConfigSchema = z.object({
  template: z.literal("sorting"),
  items: z
    .array(z.object({ label: z.string().min(1).max(80), category: z.string().min(1).max(40) }))
    .min(2)
    .max(12),
  categories: z.array(z.string().min(1).max(40)).min(2).max(4),
});

export const TimedTypingConfigSchema = z.object({
  template: z.literal("timed_typing"),
  lines: z.array(z.string().min(1).max(120)).min(1).max(6),
  timeLimitSeconds: z.number().int().min(10).max(300),
});

export const MinigameSchema = z.object({
  title: z.string().min(1).max(80),
  instructions: MediumText,
  config: z.discriminatedUnion("template", [
    MultipleChoiceConfigSchema,
    SortingConfigSchema,
    TimedTypingConfigSchema,
  ]),
});

export type MinigameLLMOutput = z.infer<typeof MinigameSchema>;
