import { create } from "zustand";
import type { Room, PlayerIdentity } from "@potential/shared";

interface SessionState {
  currentRoom: Room | null;
  player: PlayerIdentity | null;
  isGenerating: boolean;
  setCurrentRoom: (room: Room) => void;
  setPlayer: (player: PlayerIdentity) => void;
  setGenerating: (v: boolean) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  currentRoom: null,
  player: null,
  isGenerating: false,
  setCurrentRoom: (room) => { set({ currentRoom: room }); },
  setPlayer: (player) => { set({ player }); },
  setGenerating: (isGenerating) => { set({ isGenerating }); },
}));
