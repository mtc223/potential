// LLM function registry — 13 functions, 1:1 with the registry in CLAUDE.md.
// prompt_room is the ONLY Sonnet function. Everything else is Haiku.

export { promptRoom } from "./prompt-room.js";
export { generateCandidates, selectCandidate } from "./candidates.js";
export { characterResponse, updateCharacterStates, compressCharacterMemory } from "./character.js";
export { compressPlayerMemory } from "./compress-player-memory.js";
export {
  generateRoomMessages,
  generateSocialFeed,
  generateWebpage,
  generateMinigame,
} from "./surfaces.js";
export { playerIntent, interactionResult } from "./intent.js";
