import { create } from "zustand";
import type { Room, PlayerIdentity, LifeContext } from "@potential/shared";
import { db } from "../db/life-sim-db.js";

export type GamePhase = "character-creation" | "playing" | "dead";

interface SessionState {
  gamePhase: GamePhase;
  currentRoom: Room | null;
  player: PlayerIdentity | null;
  lifeContext: LifeContext | null;
  isGenerating: boolean;
  startLife: (player: PlayerIdentity) => void;
  setActiveRoom: (room: Room) => void;
  updateLifeContext: (ctx: LifeContext) => void;
  endLife: () => Promise<void>;
}

export const initialSessionState = {
  gamePhase: "character-creation" as GamePhase,
  currentRoom: null,
  player: null,
  lifeContext: null,
  isGenerating: false,
} as const;

export const useSessionStore = create<SessionState>((set, get) => ({
  ...initialSessionState,

  startLife: (player) => {
    set({
      player,
      lifeContext: { summary: "" },
      gamePhase: "playing",
    });
  },

  setActiveRoom: (room) => {
    const { gamePhase } = get();
    if (gamePhase !== "playing") {
      throw new Error(
        `setActiveRoom called in invalid phase: "${gamePhase}". Call startLife() first.`
      );
    }
    set({ currentRoom: room });
  },

  updateLifeContext: (ctx) => {
    set({ lifeContext: ctx });
  },

  endLife: async () => {
    set({
      gamePhase: "dead",
      currentRoom: null,
      player: null,
      lifeContext: null,
      isGenerating: false,
    });
    await Promise.all([db.rooms.clear(), db.currentLife.clear()]);
  },
}));
