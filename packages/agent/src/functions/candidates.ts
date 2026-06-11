import {
  CandidatesSchema,
  SelectCandidateSchema,
  type CandidatesLLMOutput,
  type LifeContext,
  type RoomCandidate,
} from "@potential/shared";
import type { LLMAdapter } from "../adapter.js";
import { callValidated } from "../call.js";
import { buildSystemPrompt } from "../prompts/preamble.js";

/**
 * generate_candidates — Haiku. Produces weighted next-room concepts from
 * LifeContext. Runs AFTER compression (the freshest summary is already in
 * context.compressedHistory).
 */
export async function generateCandidates(
  adapter: LLMAdapter,
  context: LifeContext,
  intentSignal?: string,
): Promise<CandidatesLLMOutput> {
  const task = `Propose 4-8 candidate concepts for the NEXT room of this life.

Rules:
- Candidates must follow causally from the recent history and the player's age/stage. The most recent compressed room is the freshest signal.
- Mix mundane continuity with at least one possibility of change or disruption.
- Weight (0-1) = how strongly life is currently pulling toward this concept.
- Duration reflects narrative density: crises slow to days, routine compresses to months/years.
- KEEP LIFE MOVING. If the last 2+ rooms covered the same life-period (same routine, same stakes), at least half the candidates must jump forward — months or a year — to the next distinct chapter (first steps, first words, daycare, a sibling, a move). A life is a handful of vivid scenes, not an exhaustive diary.
- Respect pacing preference: 'slow' favors shorter durations, 'fast' favors longer.
${intentSignal !== undefined ? `- The player has signaled intent: "${intentSignal}". Weight at least one matching candidate strongly.` : ""}

JSON shape: {"candidates": [{"concept": str, "premise": str, "duration": "day|week|month|year", "weight": num}]}`;

  return callValidated(
    adapter,
    {
      fn: "generate_candidates",
      model: "haiku",
      system: buildSystemPrompt(task, context),
      user: "Generate candidates now. JSON only.",
      maxTokens: 1500,
    },
    CandidatesSchema,
  );
}

/**
 * select_candidate — Haiku. Picks the next room from the candidate list.
 */
export async function selectCandidate(
  adapter: LLMAdapter,
  context: LifeContext,
  candidates: RoomCandidate[],
): Promise<RoomCandidate> {
  const listing = candidates
    .map((c, i) => `${String(i)}. [weight ${c.weight.toFixed(2)}] ${c.concept} — ${c.premise} (${c.duration})`)
    .join("\n");

  const task = `Select the single best next room from these candidates. Honor the weights but prioritize narrative momentum — what would this specific life do next?

CANDIDATES:
${listing}

JSON shape: {"selectedIndex": int, "reason": str}`;

  const result = await callValidated(
    adapter,
    {
      fn: "select_candidate",
      model: "haiku",
      system: buildSystemPrompt(task, context),
      user: "Select now. JSON only.",
      maxTokens: 300,
    },
    SelectCandidateSchema,
  );

  const selected = candidates[Math.min(result.selectedIndex, candidates.length - 1)];
  if (selected === undefined) {
    throw new Error("selectCandidate: empty candidate list");
  }
  return selected;
}
