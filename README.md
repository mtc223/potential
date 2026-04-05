> **If you're Claude:** Read `CLAUDE.md` first. Everything you need to orient yourself is in there. Design docs are in `docs/` — consult `docs/index.md` when you need to find a specific section, but don't read everything upfront.

---

# Life Simulator

You wake up in a crib. You don't know whose house this is. You don't know what year it is. You don't know how this life will go.

You figure it out — one room at a time.

**Life Simulator** is an LLM-driven pixel art life sim where you inhabit procedurally generated lives from birth to death. Each life runs 1–3 hours. You won't optimize it. You'll just live it. Then you'll die, and start another one — someone else, somewhere else, some other time.

---

## How it works

Every moment in your life is a **room** — not a place exactly, but a slice of experience. Your childhood bedroom. The school hallway where something happened once. The first apartment you couldn't really afford. A hospital waiting room at 3am. The cab of a big rig crossing Nevada at dusk.

You move through them forward only. No map. No fast travel. No revisiting. The list of rooms you've lived through is your life — a chain of moments that grows behind you until it doesn't.

The world is built by Claude as you go. It reads the shape of your life so far — who you've met, what you've done, what you've let slide — and constructs what comes next. It doesn't tell you your stats. It doesn't show you a progress bar. It just puts you somewhere and sees what you do.

NPCs remember things. Choices accumulate. Debt compounds. Relationships drift. The pixel art stays cheerful about all of it, in the way that Pokémon Red was cheerful about everything.

---

## The aesthetic

32px sprites. 3/4 top-down orthographic. Pokémon Gen 1/2 energy — the kind of game that fits in a Game Boy screen but somehow feels like a whole world. Assets sourced from the [Liberated Pixel Cup](https://github.com/ElizaWy/LPC), gap-filled via a curated pixel art generation pipeline.

NPC dialogue is a phoneme bark system in the style of Animal Crossing — procedural, characterful, zero AI audio at runtime.

---

## The tech

Built on Tauri + React + TypeScript. Runs entirely client-side — no server, no backend, no subscription. You bring your own Anthropic API key. The LLM runs locally through your key, and everything stays on your machine.

Two models do the heavy lifting: Sonnet fabricates the rooms; Haiku handles the moment-to-moment — NPC responses, memory compression, ambient events. Room history compresses as you go, so the context never collapses under the weight of everything you've done.

Targeting Steam first, then Android, then iOS.

---

## The repo

```
potential/
├── apps/desktop/     — Tauri shell + React entry point
├── packages/
│   ├── shared/       — types, Zod schemas, constants
│   ├── harness/      — IndexedDB persistence (Dexie) + session state (Zustand)
│   ├── agent/        — LLM function layer (Anthropic SDK)
│   └── renderer/     — pixel art React components
├── docs/             — 11 design documents + index
└── CLAUDE.md         — agent orientation (start here if you're Claude)
```

Design documents are in `docs/`. The full section-level index is at `docs/index.md`.

---

## Status

April 2026 — monorepo scaffolded, all 11 design documents written, issue backlog defined. Phase 1 (the harness) hasn't started yet. Everything is tagged `ac_status: needs-ac` — Michael writes the acceptance criteria before any implementation begins.
# verified
