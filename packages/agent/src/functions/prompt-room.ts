import {
  ASSET_CATALOG,
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
- "situation" is shown to the player as opening narration — write it as 1–3 vivid sentences of present-tense scene-setting with stakes or tension. It is the story beat of this room.
- Entry is on the left wall, exit on the right, both at mid-height. Do not place objects on column 0 or the last column, and keep the middle rows next to both doors clear of solid objects.
- Choose asset ids ONLY from the vocabulary below. Never invent ids.
- FURNISH THE ROOM FULLY. A lived-in room needs 10–20 objects (tiny/small rooms: 8–14). Push furniture against the top wall and side walls, cluster related objects (chair at table, lamp by couch, plant in corner), and leave a walkable path from the left door to the right door. Empty floor reads as unfinished — fill it.
- Pick the SMALLEST size template that fits the scene. Intimate scenes (bedroom, office, kitchen) are tiny/small; only public spaces (school, street, party) justify large/wide.
- Give story-relevant objects interactions with evocative "examine" text that rewards curiosity; set dressing can omit them.
- Cast 0–4 characters. REUSE roster characters by exact name when the situation involves people the player knows. New names create new people. NEVER cast the player — their sprite is rendered by the engine.
- Every character gets a DIFFERENT assetId — never two characters with the same sprite. Match sprite to role and age (variants _b/_c/_d are different outfits/looks of the same archetype).
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
      maxTokens: 6000,
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
    const cap = kind === "object" ? 60 : 40;
    // Context-matched assets first; pad from the full catalog so the
    // vocabulary never collapses when the concept wording matches nothing.
    const pool = getAssetsForContext(context, kind);
    const seen = new Set(pool.map((a) => a.id));
    for (const asset of ASSET_CATALOG) {
      if (pool.length >= cap) break;
      if (asset.kind !== kind || seen.has(asset.id)) continue;
      pool.push(asset);
    }
    return pool
      .slice(0, cap)
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
  // Doors sit at mid-height on the left/right walls (buildRoom contract).
  // Nothing solid may camp there or the player is sealed in at spawn.
  const midRow = Math.floor(size.height / 2);
  const nearDoor = (pos: { col: number; row: number }): boolean =>
    Math.abs(pos.row - midRow) <= 1 && (pos.col <= 1 || pos.col >= size.width - 2);

  return {
    ...room,
    floorAssetId: isValidAssetId(room.floorAssetId) ? room.floorAssetId : "floor_wood",
    wallAssetId: isValidAssetId(room.wallAssetId) ? room.wallAssetId : "wall_plaster",
    objects: room.objects
      .filter((o) => isValidAssetId(o.assetId))
      .map((o) => ({ ...o, position: clampPos(o.position) }))
      .filter((o) => !(o.solid && nearDoor(o.position))),
    characters: dedupeSprites(room.characters).map((c) => {
      const position = clampPos(c.position);
      if (nearDoor(position)) position.col = position.col <= 1 ? 2 : size.width - 3;
      return { ...c, position };
    }),
  };
}

/** Adult sprite variants used for fallback + dedupe (distinct look per person). */
const ADULT_VARIANTS = [
  "chr_adult_casual",
  "chr_adult_casual_b",
  "chr_adult_casual_c",
  "chr_adult_formal",
  "chr_adult_formal_b",
  "chr_adult_worker",
  "chr_adult_worker_b",
  "chr_middle_aged",
  "chr_middle_aged_b",
];

function nameHash(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * No two characters in a room share a sprite. Invalid ids fall back to a
 * name-hashed adult variant; collisions walk the variant list. Variant ids
 * that predate the expanded atlas degrade to their base id via isValidAssetId.
 */
function dedupeSprites<C extends { name: string; assetId: string }>(characters: C[]): C[] {
  const used = new Set<string>();
  return characters.map((c) => {
    let id = isValidAssetId(c.assetId) ? c.assetId : pickVariant(c.name, used);
    if (used.has(id)) id = pickVariant(c.name, used);
    used.add(id);
    return { ...c, assetId: id };
  });
}

function pickVariant(name: string, used: Set<string>): string {
  const start = nameHash(name) % ADULT_VARIANTS.length;
  for (let i = 0; i < ADULT_VARIANTS.length; i++) {
    const candidate = ADULT_VARIANTS[(start + i) % ADULT_VARIANTS.length];
    if (candidate !== undefined && isValidAssetId(candidate) && !used.has(candidate)) return candidate;
  }
  return "chr_adult_casual";
}
