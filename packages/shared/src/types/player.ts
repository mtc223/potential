/**
 * Player — the persistent identity across a single life.
 *
 * Hidden stats (nature/nurture) never appear as named dashboard values.
 * They surface only through inner monologue (poetic manifestation).
 */

export interface PlayerStats {
  /** 0–100. Never shown directly to the player. */
  readonly nature: HiddenStatBlock;
  readonly nurture: HiddenStatBlock;
}

export interface HiddenStatBlock {
  curiosity: number;
  resilience: number;
  empathy: number;
  ambition: number;
  creativity: number;
}

export interface PlayerIdentity {
  name: string;
  age: number;
  birthEra: string;
  stats: PlayerStats;
}
