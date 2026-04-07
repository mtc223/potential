// Dexie.js IndexedDB layer
// All persistence lives here. No server. No Redis. Pure IndexedDB.

export { db, LifeSimDb, type StoredCurrentLife } from "./life-sim-db.js";
export { insertRoom, getTailRoom } from "./room-store.js";
export { LinkedListError } from "./errors.js";
