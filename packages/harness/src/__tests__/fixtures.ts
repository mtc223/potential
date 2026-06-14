import type {
  CharacterId,
  CharacterRecord,
  CompressedRoomSummary,
  LifeContext,
  Room,
  RoomId,
} from "@potential/shared";
import { neutralAffection } from "@potential/shared";

export function makeRoomId(): RoomId {
  return `room_${crypto.randomUUID()}` as RoomId;
}

export function makeCharacterId(): CharacterId {
  return `chr_${crypto.randomUUID()}` as CharacterId;
}

export function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: makeRoomId(),
    sequenceIndex: 0,
    previousRoomId: null,
    nextRoomId: null,
    label: "Test Room",
    description: "A room for testing.",
    situation: "Nothing in particular is happening.",
    objects: new Map(),
    layout: {
      widthTiles: 12,
      heightTiles: 10,
      sizeTemplate: "small",
      floorAssetId: "floor_wood",
      wallAssetId: "wall_plaster",
      entryTile: { col: 0, row: 5 },
      exitTile: { col: 11, row: 5 },
    },
    duration: "day",
    playerAgeYears: 5,
    worldDate: "1990-06-15",
    events: [],
    summary: "A quiet beginning.",
    era: "modern",
    createdAt: Date.now(),
    exitedAt: Date.now() + 1000,
    ...overrides,
  };
}

export function makeCharacter(overrides: Partial<CharacterRecord> = {}): CharacterRecord {
  return {
    id: makeCharacterId(),
    name: "Test Person",
    role: "friend",
    age: 30,
    personality: "even-keeled",
    backstory: "Grew up nearby.",
    intent: "passing through",
    emotionalState: "neutral",
    affection: neutralAffection(),
    memorySummary: "",
    behavioralPatterns: [],
    status: "active",
    firstMetAtSequence: 0,
    lastSeenAtSequence: 0,
    ...overrides,
  };
}

export function makeLifeContext(overrides: Partial<LifeContext> = {}): LifeContext {
  return {
    playerName: "Testy",
    birthDate: "1985-06-15",
    playerAgeYears: 5,
    worldDate: "1990-06-15",
    era: "modern",
    natureStats: { curiosity: 60, resilience: 50, empathy: 55, ambition: 40, creativity: 65 },
    nurtureStats: { curiosity: 50, resilience: 50, empathy: 50, ambition: 50, creativity: 50 },
    behavioralPatterns: [],
    lifeEvents: [],
    compressedHistory: [],
    emotionalTrajectory: [],
    health: 1,
    hunger: 1,
    money: 0,
    jobTitle: null,
    pacing: "normal",
    deceased: false,
    causeOfDeath: null,
    ...overrides,
  };
}

export function makeCompressed(
  room: Room,
  overrides: Partial<CompressedRoomSummary> = {},
): CompressedRoomSummary {
  return {
    roomId: room.id,
    sequenceIndex: room.sequenceIndex,
    narrative: "A quiet day passed.",
    behavioralSignal: "The player explored calmly.",
    tags: ["calm"],
    emotionalValence: 0.1,
    isLifeEvent: false,
    milestone: null,
    playerAgeYears: room.playerAgeYears,
    worldDate: room.worldDate,
    ...overrides,
  };
}
