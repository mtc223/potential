import { GAME_CONFIG } from "../config/game-config.js";

/**
 * Input sanitization — security Layer 1.
 * All player-generated text passes through here before inclusion in any
 * LLM prompt. See LifeSimulator_SecurityDesign_v1.md §2.1.
 */

const INJECTION_PATTERNS: readonly RegExp[] = [
  /ignore\s+(all\s+)?previous\s+instructions/gi,
  /disregard\s+(all|previous|prior)/gi,
  /system\s*prompt\s*:/gi,
  /new\s+instructions\s*:/gi,
  /you\s+are\s+now\s+/gi,
  /act\s+as\s+(if\s+you\s+are\s+)?an?\s+/gi,
  /<\/?\s*(system|assistant|human|player_input|mod_content|instructions)\b[^>]*>/gi,
];

/**
 * Sanitize free-text player input (dialogue, thoughts, search queries).
 * Truncates, strips injection patterns, escapes prompt-structural characters,
 * and normalizes unicode against homoglyph tricks.
 */
export function sanitizePlayerText(
  input: string,
  maxLength: number = GAME_CONFIG.contentSafety.maxDialogueInputChars,
): string {
  let text = input.normalize("NFKC").slice(0, maxLength);
  for (const pattern of INJECTION_PATTERNS) {
    text = text.replace(pattern, "");
  }
  text = text.replace(/[<>`]/g, "");
  return text.trim();
}

/**
 * Sanitize a character/player name: alphanumeric, spaces, hyphens,
 * apostrophes only. Max 50 chars.
 */
export function sanitizeName(input: string): string {
  return input
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N} '-]/gu, "")
    .slice(0, GAME_CONFIG.contentSafety.maxNameChars)
    .trim();
}

/**
 * Wrap player text in the untrusted-content delimiter used by every prompt.
 * The system prompt instructs the model to treat this as dialogue/action,
 * never as instructions.
 */
export function wrapPlayerInput(sanitized: string): string {
  return `<player_input>${sanitized}</player_input>`;
}
