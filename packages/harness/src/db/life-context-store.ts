import type { LifeContext } from "@potential/shared";
import { db as defaultDb, type LifeSimDb } from "./life-sim-db.js";

/**
 * Single-record LifeContext persistence (id=1, mirrors currentLife pattern).
 * Saved on every room exit — the compression heartbeat — so a crash never
 * loses more than the current room.
 */

export async function saveLifeContext(
  context: LifeContext,
  dbInstance: LifeSimDb = defaultDb,
): Promise<void> {
  await dbInstance.lifeContext.put({ ...context, id: 1 });
}

export async function loadLifeContext(
  dbInstance: LifeSimDb = defaultDb,
): Promise<LifeContext | null> {
  const stored = await dbInstance.lifeContext.get(1);
  if (stored === undefined) return null;
  const { id: _id, ...context } = stored;
  return context;
}
