import {
  GAME_CONFIG,
  neutralAffection,
  type CharacterRecord,
  type LifeContext,
  type ObjectId,
  type ObjectInteraction,
  type Room,
  type RoomCandidate,
  type RoomId,
  type RoomLLMOutput,
  type RoomObjectLLMOutput,
  type WorldObject,
} from "@potential/shared";

/**
 * buildRoom — converts validated LLM output into a real Room + roster updates.
 *
 * The harness owns all ids (the LLM never writes UUIDs). Character identity is
 * resolved here: LLM character names are matched case-insensitively against
 * the roster; unmatched names create new CharacterRecords. This mirrors the
 * label+type location resolution rule from SoftwareDesign §4.4.
 */

export interface BuiltRoom {
  room: Room;
  /** Roster records to upsert — existing characters updated, new ones created. */
  characterUpserts: CharacterRecord[];
}

export function buildRoom(
  output: RoomLLMOutput,
  candidate: RoomCandidate,
  context: LifeContext,
  previousRoom: Room | null,
  roster: CharacterRecord[],
): BuiltRoom {
  const size = GAME_CONFIG.roomGeneration.sizeTemplates[output.sizeTemplate];
  const sequenceIndex = previousRoom === null ? 0 : previousRoom.sequenceIndex + 1;
  const objects = new Map<ObjectId, WorldObject>();

  for (const obj of output.objects) {
    const id = makeObjectId();
    const interaction = normalizeInteraction(obj.interaction);
    objects.set(id, {
      id,
      category: obj.category,
      label: obj.label,
      description: obj.description,
      tags: obj.tags,
      tombstoned: false,
      assetId: obj.assetId,
      position: obj.position,
      solid: obj.solid,
      ...(interaction !== null ? { interaction } : {}),
    });
  }

  const rosterByName = new Map(roster.map((c) => [c.name.toLowerCase(), c]));
  const characterUpserts: CharacterRecord[] = [];

  // The model sometimes casts the player as an NPC; the player sprite is
  // rendered by the engine, so a same-named cast member would appear twice.
  const playerName = context.playerName.toLowerCase();
  const castMembers = output.characters.filter(
    (c) => c.name.toLowerCase() !== playerName && !c.name.toLowerCase().startsWith(playerName + " "),
  );

  for (const cast of castMembers) {
    const existing = rosterByName.get(cast.name.toLowerCase());
    const record: CharacterRecord =
      existing !== undefined
        ? {
            ...existing,
            // Room casting refreshes the volatile fields; biography persists.
            age: Math.max(existing.age, cast.age),
            intent: cast.intent,
            emotionalState: cast.emotionalState,
            status: "active",
            lastSeenAtSequence: sequenceIndex,
          }
        : {
            id: makeCharacterId(),
            name: cast.name,
            role: cast.role,
            age: cast.age,
            personality: cast.personality,
            backstory: cast.backstory,
            intent: cast.intent,
            emotionalState: cast.emotionalState,
            affection: { ...neutralAffection(), awareness: 0.5 },
            memorySummary: "",
            behavioralPatterns: [],
            status: "active",
            firstMetAtSequence: sequenceIndex,
            lastSeenAtSequence: sequenceIndex,
          };
    characterUpserts.push(record);

    const id = makeObjectId();
    objects.set(id, {
      id,
      category: "npc",
      label: record.name,
      description: cast.personality,
      tags: [cast.role],
      tombstoned: false,
      assetId: cast.assetId,
      position: cast.position,
      solid: true,
      characterId: record.id,
      interaction: { type: "talk_to" },
      ...(cast.ambientLine !== undefined ? { ambientLine: cast.ambientLine } : {}),
    });
  }

  const room: Room = {
    id: makeRoomId(),
    sequenceIndex,
    previousRoomId: previousRoom?.id ?? null,
    nextRoomId: null,
    label: output.label,
    description: output.description,
    situation: output.situation,
    objects,
    layout: {
      widthTiles: size.width,
      heightTiles: size.height,
      sizeTemplate: output.sizeTemplate,
      floorAssetId: output.floorAssetId,
      wallAssetId: output.wallAssetId,
      entryTile: { col: 0, row: Math.floor(size.height / 2) },
      exitTile: { col: size.width - 1, row: Math.floor(size.height / 2) },
    },
    duration: candidate.duration,
    playerAgeYears: context.playerAgeYears,
    worldDate: context.worldDate,
    events: [],
    summary: null,
    era: output.era,
    createdAt: Date.now(),
    exitedAt: null,
  };

  return { room, characterUpserts };
}

/** Zod-optional fields infer as `T | undefined`; strip explicit undefineds for exactOptionalPropertyTypes. */
function normalizeInteraction(
  interaction: RoomObjectLLMOutput["interaction"],
): ObjectInteraction | null {
  if (interaction === undefined) return null;
  return {
    type: interaction.type,
    ...(interaction.text !== undefined ? { text: interaction.text } : {}),
    ...(interaction.hungerDelta !== undefined ? { hungerDelta: interaction.hungerDelta } : {}),
    ...(interaction.healthDelta !== undefined ? { healthDelta: interaction.healthDelta } : {}),
  };
}

function makeRoomId(): RoomId {
  return `room_${crypto.randomUUID()}`;
}

function makeObjectId(): ObjectId {
  return `obj_${crypto.randomUUID()}`;
}

function makeCharacterId(): CharacterRecord["id"] {
  return `chr_${crypto.randomUUID()}`;
}
