// prompt_room — Sonnet-only. Fabricates the next room from accumulated life context.
// Placeholder stub. Full implementation requires AC from PM.

import type Anthropic from "@anthropic-ai/sdk";
import { RoomSchema, type RoomLLMOutput } from "@potential/shared";
import { SONNET_MODEL } from "../client.js";

export async function promptRoom(
  client: Anthropic,
  _lifeContext: string
): Promise<RoomLLMOutput> {
  void client;
  void SONNET_MODEL;
  // TODO: implement — awaiting AC
  throw new Error("prompt_room not yet implemented");
}
