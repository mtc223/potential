import type { CharacterId, CharacterRecord, CharacterStatus } from "@potential/shared";
import { db as defaultDb, type LifeSimDb } from "./life-sim-db.js";

/**
 * Character roster persistence.
 *
 * Invariants:
 *   - Characters are never deleted. Status transitions only.
 *   - upsert preserves firstMetAtSequence on existing records.
 */

export async function getCharacter(
  id: CharacterId,
  dbInstance: LifeSimDb = defaultDb,
): Promise<CharacterRecord | null> {
  const record = await dbInstance.characters.get(id);
  return record ?? null;
}

export async function getActiveCharacters(
  dbInstance: LifeSimDb = defaultDb,
): Promise<CharacterRecord[]> {
  return dbInstance.characters.where("status").equals("active").toArray();
}

export async function getAllCharacters(
  dbInstance: LifeSimDb = defaultDb,
): Promise<CharacterRecord[]> {
  return dbInstance.characters.toArray();
}

/**
 * Insert or update a character. On update, firstMetAtSequence is preserved
 * from the existing record — first meetings are biographical facts.
 */
export async function upsertCharacter(
  record: CharacterRecord,
  dbInstance: LifeSimDb = defaultDb,
): Promise<void> {
  await dbInstance.transaction("rw", dbInstance.characters, async () => {
    const existing = await dbInstance.characters.get(record.id);
    if (existing === undefined) {
      await dbInstance.characters.add(record);
      return;
    }
    await dbInstance.characters.put({
      ...record,
      firstMetAtSequence: existing.firstMetAtSequence,
    });
  });
}

/**
 * Status transition — the only sanctioned way a character leaves the world.
 * Never deletes the record (referential integrity for rooms that reference it).
 */
export async function setCharacterStatus(
  id: CharacterId,
  status: CharacterStatus,
  dbInstance: LifeSimDb = defaultDb,
): Promise<void> {
  const updated = await dbInstance.characters.update(id, { status });
  if (updated === 0) {
    throw new Error(`setCharacterStatus: character "${id}" not found`);
  }
}
