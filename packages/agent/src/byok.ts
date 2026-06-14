import Anthropic from "@anthropic-ai/sdk";

/**
 * BYOK — Bring Your Own Key.
 *
 * The player's Anthropic API key never leaves the device, is never logged,
 * and is never bundled. Stored in localStorage per SystemDesign §25
 * (localStorage holds session metadata + API key; game state is IndexedDB
 * only). The Tauri build will move this to the OS keychain (issue #20).
 */

const STORAGE_KEY = "potential.byok.anthropic";

export function saveApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEY, key.trim());
}

export function loadApiKey(): string | null {
  const key = localStorage.getItem(STORAGE_KEY);
  return key === null || key.length === 0 ? null : key;
}

export function clearApiKey(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export interface KeyValidationResult {
  ok: boolean;
  error?: string;
}

/**
 * Validate a key with a zero-token API call (models list).
 * Returns a user-displayable error on failure; never throws.
 */
export async function validateApiKey(key: string): Promise<KeyValidationResult> {
  const trimmed = key.trim();
  if (!trimmed.startsWith("sk-ant-")) {
    return { ok: false, error: "That doesn't look like an Anthropic API key (should start with sk-ant-)." };
  }
  try {
    const client = new Anthropic({ apiKey: trimmed, dangerouslyAllowBrowser: true });
    await client.models.list();
    return { ok: true };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: "Anthropic rejected this key. Check it and try again." };
    }
    return {
      ok: false,
      error: `Could not reach the Anthropic API: ${error instanceof Error ? error.message : "unknown error"}`,
    };
  }
}
