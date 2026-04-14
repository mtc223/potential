import type { Room, LifeContext } from "@potential/shared";
import { insertRoom } from "./db/room-store.js";
import { useSessionStore } from "./store/session-store.js";

/**
 * CompressRoomFn — injected compression function.
 *
 * Phase 1 stub: returns "[compression stub]" synchronously (no LLM call).
 * Phase 2 (issue #10): replaced by compress_player_memory() via Haiku.
 *
 * The harness calls this; the agent package provides the real implementation.
 * Never import compress_player_memory from @potential/agent here.
 */
export type CompressRoomFn = (room: Room, lifeContext: LifeContext) => Promise<string>;

/**
 * onRoomExit — the single entry point for all room transitions.
 *
 * Executes the 6-step pipeline in strict sequential order:
 *   1. Stamp exitedAt on the room (in memory, before Dexie write)
 *   2. Call injected compressRoom(room, lifeContext) → summary string
 *   3. Attach summary to the room
 *   4. insertRoom(room) — persist the completed room to Dexie
 *   5. updateLifeContext({ summary }) — update Zustand session state
 *   6. Return — signals ready for N+1 candidate selection
 *
 * Error semantics:
 *   - Any step failure propagates immediately.
 *   - Dexie is never written if compression fails (step 2 throws → step 4 never runs).
 *   - lifeContext is never updated if insertRoom fails (step 4 throws → step 5 never runs).
 *
 * @param room - The active room being exited. Expected to have exitedAt: null.
 * @param compressRoom - Injected compression fn. Never import from @potential/agent.
 */
export async function onRoomExit(room: Room, compressRoom: CompressRoomFn): Promise<void> {
  // Step 1: Stamp exit time.
  const exitedRoom: Room = { ...room, exitedAt: Date.now() };

  // Step 2: Compress.
  const { lifeContext } = useSessionStore.getState();
  const summary = await compressRoom(exitedRoom, lifeContext ?? { summary: "" });

  // Step 3: Attach summary.
  const completedRoom: Room = { ...exitedRoom, summary };

  // Step 4: Persist to Dexie.
  await insertRoom(completedRoom);

  // Step 5: Update Zustand with latest compression output.
  useSessionStore.getState().updateLifeContext({ summary });

  // Step 6: Return — N+1 candidate selection may begin.
}
