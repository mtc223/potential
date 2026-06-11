// Dexie.js IndexedDB layer
// All persistence lives here. No server. No Redis. Pure IndexedDB.

export { db, LifeSimDb, type StoredCurrentLife, type StoredLifeContext } from "./life-sim-db.js";
export { insertRoom, getTailRoom } from "./room-store.js";
export { LinkedListError } from "./errors.js";
export {
  getCharacter,
  getActiveCharacters,
  getAllCharacters,
  upsertCharacter,
  setCharacterStatus,
} from "./character-store.js";
export { saveLifeContext, loadLifeContext } from "./life-context-store.js";
