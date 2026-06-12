import { getAsset, type Era } from "@potential/shared";

/**
 * Room script — a compact line language for room fabrication.
 *
 * The JSON room spec spent most of its output tokens on ceremony: field
 * names, quotes, and values the asset catalog already knows (labels,
 * solidity, footprints). Sonnet's latency is output-bound (~40 tok/s), so
 * the format IS the loading time. The script makes the model emit only what
 * only it knows — which asset, where, and the strings a player will read:
 *
 *   ROOM <label> | <size> | <floor> | <wall> | <duration>
 *   SIT  <situation narration>
 *   MONO <opening inner monologue>
 *   SET  <assetId>@<col>,<row> <assetId>@<col>,<row> ...
 *   OBJ  <assetId>@<col>,<row> | <label> | <interaction type> | <text>
 *   CHR  <name> | <role> | <age> | <sprite>@<col>,<row> | <personality> | <intent> | <mood> | <ambient line>
 *
 * SET items inherit name and solidity from the catalog. The parser is
 * deliberately tolerant — malformed lines and bad tokens are skipped, and
 * postValidate already drops unknown assets — but the parsed result still
 * passes through RoomSchema (Zod) before it can touch game state.
 *
 * A whole furnished room lands around 350–500 output tokens instead of
 * 2000–3500 as JSON.
 */

export class RoomScriptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RoomScriptError";
  }
}

/** The grammar block included in the prompt_room task instructions. */
export const ROOM_SCRIPT_FORMAT = `OUTPUT FORMAT — room script, one declaration per line. NOT JSON. No prose outside the script.
ROOM <label> | <tiny|small|medium|large|wide|tall> | <floor assetId> | <wall assetId> | <day|week|month|year>
PLACE <slug or none>   (recurring locations get a stable snake_case slug like home_nursery; one-off scenes: none)
SIT <the situation — 1-3 vivid present-tense sentences with stakes; shown to the player as opening narration>
MONO <the player's first inner thought here; their nature colors it, never named stats>
SET <assetId>@<col>,<row> <assetId>@<col>,<row> ...   (set dressing — names/solidity come from the catalog; repeat the line as needed)
OBJ <assetId>@<col>,<row> | <display label> | <examine|use|pick_up|eat|drink|sit> | <evocative text, max 25 words>
CHR <name> | <role> | <age> | <sprite assetId>@<col>,<row> | <personality phrase> | <intent> | <mood> | <a line they might say unprompted>

Example:
ROOM First Morning Home | small | floor_wood | wall_wallpaper | day
PLACE home_nursery
SIT The nursery is finally quiet. Sunlight crosses the crib where you ended up at dawn, and the whole house seems to be holding its breath.
MONO The warm ones are nearby. The light through the window is the best thing that has ever happened.
SET crib@5,1 rocking_chair@2,2 bookshelf@8,1 houseplant@10,1 floor_lamp@1,1 rug@5,4
OBJ family_photo@7,1 | A new family photo | examine | Three faces, one of them yours, all of them exhausted and glowing.
CHR Margaret | mother | 31 | chr_adult_casual@3,3 | fierce, exhausted, soft-spoken | settle the baby | tender exhaustion | Hi. Hi, little one.
CHR David | father | 33 | chr_adult_casual_b@8,4 | earnest, hovering, useless with swaddles | be helpful somehow | overjoyed nerves | She has your stubborn chin.`;

const POS = /^([a-z0-9_]+)@(\d+),(\d+)$/i;
const INTERACTION_TYPES = new Set(["examine", "use", "pick_up", "eat", "drink", "sit"]);

export function looksLikeRoomScript(raw: string): boolean {
  return /^\s*ROOM /m.test(raw);
}

/**
 * Parse a room script into the RoomLLMOutput shape (unvalidated — the caller
 * runs RoomSchema over the result). Era comes from the harness, not the
 * model: the world already knows what year it is.
 */
export function parseRoomScript(raw: string, era: Era): unknown {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let header: { label: string; sizeTemplate: string; floorAssetId: string; wallAssetId: string; duration: string } | null = null;
  let situation = "";
  let monologue = "";
  let placeId: string | null = null;
  const objects: unknown[] = [];
  const characters: unknown[] = [];

  for (const line of lines) {
    const space = line.indexOf(" ");
    if (space < 0) continue;
    const tag = line.slice(0, space);
    const rest = line.slice(space + 1).trim();
    if (tag === "ROOM") {
      const f = fields(rest);
      header = {
        label: clamp(f[0] ?? "Somewhere", 80),
        sizeTemplate: f[1] ?? "small",
        floorAssetId: f[2] ?? "floor_wood",
        wallAssetId: f[3] ?? "wall_plaster",
        duration: f[4] ?? "day",
      };
    } else if (tag === "PLACE") {
      const slug = rest.toLowerCase().trim();
      if (slug !== "none" && /^[a-z0-9_]+$/.test(slug)) placeId = slug.slice(0, 40);
    } else if (tag === "SIT") {
      situation = clamp(situation.length > 0 ? `${situation} ${rest}` : rest, 400);
    } else if (tag === "MONO") {
      monologue = clamp(monologue.length > 0 ? `${monologue} ${rest}` : rest, 400);
    } else if (tag === "SET") {
      for (const token of rest.split(/\s+/)) {
        const placed = parsePosToken(token);
        if (placed === null) continue;
        const def = getAsset(placed.assetId);
        objects.push({
          label: clamp(def?.name ?? placed.assetId, 60),
          description: clamp(def?.name ?? placed.assetId, 400),
          category: "ambient",
          assetId: placed.assetId,
          position: placed.position,
          solid: def?.solid ?? false,
          tags: [],
        });
      }
    } else if (tag === "OBJ") {
      const parsed = parseObjLine(rest);
      if (parsed !== null) objects.push(parsed);
    } else if (tag === "CHR") {
      const parsed = parseChrLine(rest);
      if (parsed !== null) characters.push(parsed);
    }
    // Any other line is noise; skip it.
  }

  if (header === null) {
    throw new RoomScriptError("missing ROOM header line — start with: ROOM <label> | <size> | <floor> | <wall> | <duration>");
  }
  if (situation.length === 0) {
    throw new RoomScriptError("missing SIT line — the situation narration is required");
  }

  return {
    label: header.label,
    ...(placeId !== null ? { placeId } : {}),
    description: situation,
    situation,
    era,
    duration: header.duration,
    sizeTemplate: header.sizeTemplate,
    floorAssetId: header.floorAssetId,
    wallAssetId: header.wallAssetId,
    objects,
    characters,
    openingMonologue: monologue.length > 0 ? monologue : situation,
  };
}

function parseObjLine(rest: string): unknown {
  const f = fields(rest);
  const placed = parsePosToken(f[0] ?? "");
  if (placed === null) return null;
  const def = getAsset(placed.assetId);
  const label = clamp(orDefault(f[1], def?.name ?? placed.assetId), 60);
  const type = f[2] !== undefined && INTERACTION_TYPES.has(f[2]) ? f[2] : "examine";
  const text = f[3] ?? "";
  return {
    label,
    description: clamp(label, 400),
    category: "fixture",
    assetId: placed.assetId,
    position: placed.position,
    solid: def?.solid ?? true,
    interaction: { type, ...(text.length > 0 ? { text: clamp(text, 400) } : {}) },
    tags: [],
  };
}

function parseChrLine(rest: string): unknown {
  const f = fields(rest);
  const placed = parsePosToken(f[3] ?? "");
  if (placed === null || f[0] === undefined || f[0].length === 0) return null;
  const age = Number(f[2]);
  const personality = clamp(orDefault(f[4], "unremarkable"), 400);
  return {
    name: clamp(f[0], 50),
    role: clamp(orDefault(f[1], "bystander"), 40),
    age: Number.isFinite(age) ? Math.max(0, Math.min(120, age)) : 30,
    personality,
    backstory: personality,
    intent: clamp(orDefault(f[5], "be present"), 400),
    emotionalState: clamp(orDefault(f[6], "neutral"), 120),
    ...(f[7] !== undefined && f[7].length > 0 ? { ambientLine: clamp(f[7], 400) } : {}),
    position: placed.position,
    assetId: placed.assetId,
  };
}

function parsePosToken(token: string): { assetId: string; position: { col: number; row: number } } | null {
  const m = POS.exec(token);
  if (m === null || m[1] === undefined || m[2] === undefined || m[3] === undefined) return null;
  const col = Math.min(40, Number(m[2]));
  const row = Math.min(40, Number(m[3]));
  return { assetId: m[1].toLowerCase(), position: { col, row } };
}

function fields(s: string): string[] {
  return s.split("|").map((part) => part.trim());
}

function clamp(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) : s;
}

function orDefault(value: string | undefined, fallback: string): string {
  return value !== undefined && value.length > 0 ? value : fallback;
}
