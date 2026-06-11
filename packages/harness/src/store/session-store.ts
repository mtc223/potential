import { create } from "zustand";
import type { LifeContext, PlayerIdentity, Room } from "@potential/shared";

/**
 * Session state — ephemeral, in-memory. The current (un-exited) room lives
 * here; it is only persisted to IndexedDB on exit, after compression.
 *
 * Inner monologue: hidden stats surface ONLY through these entries.
 * Never expose nature/nurture numbers anywhere in UI.
 */

export interface MonologueEntry {
  readonly id: string;
  text: string;
  atMs: number;
}

interface SessionState {
  currentRoom: Room | null;
  player: PlayerIdentity | null;
  lifeContext: LifeContext | null;
  isGenerating: boolean;
  monologue: MonologueEntry[];
  setCurrentRoom: (room: Room | null) => void;
  setPlayer: (player: PlayerIdentity) => void;
  setLifeContext: (context: LifeContext) => void;
  setGenerating: (v: boolean) => void;
  pushMonologue: (text: string) => void;
  clearMonologue: () => void;
}

const MONOLOGUE_CAP = 50;

export const useSessionStore = create<SessionState>((set) => ({
  currentRoom: null,
  player: null,
  lifeContext: null,
  isGenerating: false,
  monologue: [],
  setCurrentRoom: (currentRoom) => { set({ currentRoom }); },
  setPlayer: (player) => { set({ player }); },
  setLifeContext: (lifeContext) => { set({ lifeContext }); },
  setGenerating: (isGenerating) => { set({ isGenerating }); },
  pushMonologue: (text) => {
    set((state) => ({
      monologue: [
        ...state.monologue.slice(-(MONOLOGUE_CAP - 1)),
        { id: crypto.randomUUID(), text, atMs: Date.now() },
      ],
    }));
  },
  clearMonologue: () => { set({ monologue: [] }); },
}));
