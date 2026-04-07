// compress_player_memory — Haiku. Collapses all room events into a single summary string.
// Triggered on room transition, before N+1 room selection.
// Placeholder stub. Full implementation requires AC from PM.

import type Anthropic from "@anthropic-ai/sdk";
import { HAIKU_MODEL } from "../client.js";

export function compressPlayerMemory(
  client: Anthropic,
  _roomDescription: string,
  _events: string[]
): Promise<string> {
  void client;
  void HAIKU_MODEL;
  // TODO: implement — awaiting AC
  throw new Error("compress_player_memory not yet implemented");
}
