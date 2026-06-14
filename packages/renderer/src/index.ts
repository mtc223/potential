// @potential/renderer — React pixel art rendering layer
// 32px sprites, 3/4 top-down orthographic, Pokémon Gen 1/2 aesthetic

export * from "./components/index.js";
export { loadAtlas, characterFrame, type SpriteAtlas, type SpriteRect } from "./atlas.js";
export {
  buildSolids,
  movePlayer,
  interactTarget,
  atExit,
  spawnPosition,
  objectFootprints,
  type PlayerSprite,
} from "./room-state.js";
export { playBark, playObjectCue } from "./audio/barks.js";
