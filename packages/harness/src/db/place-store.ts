import type { PlaceRecord } from "@potential/shared";
import { db as defaultDb, type LifeSimDb } from "./life-sim-db.js";

/**
 * Place store — remembered recurring locations. Upserted whenever a room
 * declares a placeId; read before fabrication so prompt_room can reproduce
 * the layout. Places are wiped with the life (clearLife handles tables).
 */

export async function upsertPlace(place: PlaceRecord, dbInstance: LifeSimDb = defaultDb): Promise<void> {
  await dbInstance.places.put(place);
}

export async function getPlace(id: string, dbInstance: LifeSimDb = defaultDb): Promise<PlaceRecord | null> {
  return (await dbInstance.places.get(id)) ?? null;
}

/** Most recently seen places first, capped — prompt budget, not archive. */
export async function getRecentPlaces(limit = 8, dbInstance: LifeSimDb = defaultDb): Promise<PlaceRecord[]> {
  return dbInstance.places.orderBy("lastSeenSequence").reverse().limit(limit).toArray();
}
