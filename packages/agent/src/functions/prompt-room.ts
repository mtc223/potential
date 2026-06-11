import {
  GAME_CONFIG,
  RoomSchema,
  getAssetsForContext,
  isValidAssetId,
  type CharacterRecord,
  type LifeContext,
  type RoomCandidate,
  type RoomLLMOutput,
} from "@potential/shared";
import type { LLMAdapter } from "../adapter.js";
import { callValidated } from "../call.js";
import { buildSystemPrompt } from "../prompts/preamble.js";

/**
 * prompt_room — Sonnet. The ONLY function routed to Sonnet.
 * Fabricates the next room from accumulated life context + the selected
 * candidate concept. Output is post-validated against the asset catalog:
 * unknown object assets are dropped, unknown floor/wall assets fall back.
 */
export async function promptRoom(
  adapter: LLMAdapter,
  context: LifeContext,
  candidate: RoomCandidate,
  rosterCharacters: CharacterRecord[],
): Promise<RoomLLMOutput> {
  const vocabulary = buildVocabulary(candidate.concept + " " + candidate.premise);
  const roster = rosterCharacters
    .filter((c) => c.status === "active")
    .slice(0, 12)
    .map(
      (c) =>
        `- ${c.name} (${c.role}, age ${String(Math.round(c.age))}): ${c.personality}. Their memory of the player: ${c.memorySummary || "none yet"}`,
    )
    .join("\n");

  const task = `Fabricate the next room of this life as a JSON object.

THE SELECTED ROOM CONCEPT: "${candidate.concept}" — ${candidate.premise} (suggested duration: ${candidate.duration})

Rules:
- The room presents a situation; it never prescribes what the player must do.
- Entry is on the left wall, exit on the right. Do not place objects on column 0 or the last column.
- Choose asset ids ONLY from the vocabulary below. Never invent ids.
- Place 4–12 objects with meaningful positions inside the room bounds for the size template you choose. Give story-relevant objects interactions; set dressing can omit them.
- Cast 0–4 characters. REUSE roster characters by exact name when the situation involves people the player knows. New names create new people.
- The opening monologue is the player's inner voice: let their nature stats color it without ever naming numbers or stats.
- Respect the player's age tier strictly.

Size templates (width x height in tiles): ${Object.entries(GAME_CONFIG.roomGeneration.sizeTemplates)
    .map(([k, v]) => `${k}=${String(v.width)}x${String(v.height)}`)
    .join(", ")}

JSON shape:
{"label": str, "description": str, "situation": str, "era": "modern", "duration": "day|week|month|year", "sizeTemplate": "tiny|small|medium|large|wide|tall", "floorAssetId": str, "wallAssetId": str,
 "objects": [{"label": str, "description": str, "category": "item|fixture|ambient", "assetId": str, "position": {"col": int, "row": int}, "solid": bool, "interaction": {"type": "examine|use|pick_up|eat|drink|sit", "text": str}?, "tags": [str]}],
 "characters": [{"name": str, "role": str, "age": num, "personality": str, "backstory": str, "intent": str, "emotionalState": str, "ambientLine": str?, "position": {"col": int, "row": int}, "assetId": str}],
 "openingMonologue": str}`;

  const extra = [
    `ASSET VOCABULARY:\nFloors: ${vocabulary.floors}\nWalls: ${vocabulary.walls}\nObjects: ${vocabulary.objects}\nCharacter sprites: ${vocabulary.characters}`,
    roster.length > 0 ? `KNOWN CHARACTERS (roster):\n${roster}` : "",
  ]
    .filter((s) => s.length > 0)
    .join("\n\n");

  const room = await callValidated(
    adapter,
    {
      fn: "prompt_room",
      model: "sonnet",
      system: buildSystemPrompt(task, context, extra),
      user: "Generate the room now. JSON only.",
      maxTokens: 4000,
    },
    RoomSchema,
  );

  return postValidate(room);
}

function buildVocabulary(conceptText: string): {
  floors: string;
  walls: string;
  objects: string;
  characters: string;
} {
  const context = conceptText.toLowerCase();
  const list = (kind: "floor" | "wall" | "object" | "character"): string => {
    const matched = getAssetsForContext(context, kind);
    const pool = matched.length > 0 ? matched : getAssetsForContext("any", kind);
    return pool
      .slice(0, kind === "object" ? 60 : 16)
      .map((a) => a.id)
      .join(", ");
  };
  return {
    floors: list("floor"),
    walls: list("wall"),
    objects: list("object"),
    characters: list("character"),
  };
}

/** Asset validation per RoomDesign §5.7: drop unknown objects, fall back floor/wall, clamp positions. */
function postValidate(room: RoomLLMOutput): RoomLLMOutput {
  const size = GAME_CONFIG.roomGeneration.sizeTemplates[room.sizeTemplate];
  const clampPos = (pos: { col: number; row: number }) => ({
    col: Math.max(1, Math.min(size.width - 2, pos.col)),
    row: Math.max(1, Math.min(size.height - 2, pos.row)),
  });

  return {
    ...room,
    floorAssetId: isValidAssetId(room.floorAssetId) ? room.floorAssetId : "floor_wood",
    wallAssetId: isValidAssetId(room.wallAssetId) ? room.wallAssetId : "wall_plaster",
    objects: room.objects
      .filter((o) => isValidAssetId(o.assetId))
      .map((o) => ({ ...o, position: clampPos(o.position) })),
    characters: room.characters.map((c) => ({
      ...c,
      assetId: isValidAssetId(c.assetId) ? c.assetId : "chr_adult_casual",
      position: clampPos(c.position),
    })),
  };
}
