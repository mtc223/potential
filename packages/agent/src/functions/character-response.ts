// character_response — Haiku. Generates NPC dialogue from character state + player intent.
// Placeholder stub. Full implementation requires AC from PM.

import type Anthropic from "@anthropic-ai/sdk";
import { HAIKU_MODEL } from "../client.js";

export function characterResponse(
  client: Anthropic,
  _characterState: string,
  _playerIntent: string
): Promise<string> {
  void client;
  void HAIKU_MODEL;
  // TODO: implement — awaiting AC
  throw new Error("character_response not yet implemented");
}
