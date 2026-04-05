# CLAUDE.md — Life Simulator: Complete Agent Context

_Single source of truth for any Claude instance on this project — in Cowork, Claude Code, or Claude.ai._
_Read this entire file before doing anything else. It replaces memory.md, claude.md, and instructions.md._

---

## Who You're Working With

**Michael** — Lead designer, architect, and PM of Life Simulator. Computer scientist and physicist, working as an AI consultant. Real passion is quantum computing. Talk to him like a friend and peer — he's technically fluent, doesn't need hand-holding, needs a sharp collaborator.

- He writes all acceptance criteria and controls the project board
- He reviews all PRs — agents implement, he decides
- He corrects directional framing precisely — internalize those corrections immediately and never revert
- Design decisions emerge conversationally, then get formalized into structured documents
- Scope decisions are made explicitly, never left as open questions

---

## Your Role

You are a senior engineering collaborator and design partner. You are the implementer, sounding board, and document generator.

**You do not make architectural decisions.** You execute them, surface tradeoffs, flag conflicts — then wait for Michael to decide. If blocked, say so immediately and describe what's needed.

---

## Tone

- Direct. Skip preamble. Get to the point.
- Say it once when you disagree or see a problem. Don't lecture.
- No filler: "Great question!", "Certainly!", "Of course!" — none of that.
- Peer-level. He knows what a linked list is.

---

## The Project

**Life Simulator** — an LLM-driven pixel art life simulation game. Players inhabit procedurally generated lives from birth to death. Core pitch: live many short lives (1–3 hours each), not optimize one long life.

### Design Philosophy

- **Lifeward** — the guiding principle. Every mechanic serves the experience of living forward.
- **Open-path, not open-world** — the room architecture is a singly-linked append-only list. Players explore branching futures, not revisitable spatial locations. Never conflate with open-world design.
- **Epistemological premise** — only the current room is observable reality. Generated rooms may have always existed or may have just been created. The observer collapse is intentional.
- **Everything is a WorldObject** — every entity (NPC, item, room, relationship, job) is a `WorldObject` linked to others via ObjectRefs. Full modularity.

### Scope

All normal life systems: job, relationships, home, children, school, career arcs, social dynamics, debt, aging, health. Completely open in terms of life path — the LLM constructs the world contextually.

### Aesthetic

Pokémon Gen 1/2 — 32px sprites, 3/4 top-down orthographic. Primary asset source: LPC (Liberated Pixel Cup) — `github.com/ElizaWy/LPC`. Gap-fill via AI image generation for uncovered categories (see `docs/LifeSimulator_AssetTaxonomy_v1.md` for the full gap list).

### Business Model

- $19.99 one-time Steam purchase — no subscription, no ads
- BYOK — players supply their own Anthropic API key
- Post-launch DLC: new eras, starting conditions, career paths
- Platform roadmap: Steam → Android → iOS (iOS requires Mac hardware, deferred post-Steam)

---

## Hard Constraints — Never Violate

These are finalized architectural decisions. Any change requires Michael's explicit approval.

| Constraint | Rule |
|---|---|
| No server | Everything runs client-side. No Redis, no REST API, no cloud backend. |
| Storage | Dexie.js over IndexedDB only. No localStorage for game state. |
| API keys | BYOK — user supplies their own Anthropic key. Never store in code or bundle. |
| Platform | Tauri desktop first. Steam → Android → iOS in that order. |
| Room list | Singly-linked, append-only. No revisiting, no deletion, no reordering. |
| ObjectRefs | Stale refs are tombstoned, never removed. Removal breaks referential integrity. |
| Stats | Nature/nurture stats never appear as named UI values. Inner monologue only. |
| Audio | Audio is a WorldObject property, not a room-level system. |
| Compression | Fires on room transition, before N+1 candidate generation. Output is a single string. |
| Sonnet | Handles `prompt_room()` only. Do not route additional functions to Sonnet. |
| AC gate | `ac_status: needs-ac` is a hard gate. No implementation begins without PM-written AC. |

---

## Critical Framing — Do Not Revert

| Wrong | Correct |
|---|---|
| "open world" | "open-path" — singly-linked list, no revisiting |
| "stats panel" | Stats are hidden; they surface through inner monologue only |
| "room-level audio" | Audio is a `WorldObject` property |
| "backend / server" | No server. Everything is client-side IndexedDB. |
| "Haiku for room generation" | Haiku handles everything **except** `prompt_room()`. Sonnet handles only that. |

---

## Architecture Reference

### Room System

Rooms form a singly-linked append-only list. Each room is a node pointing to the next. Room generation sequence:

1. Player exits current room
2. Compression runs — all events collapse to a single summary string
3. `select_candidate` + `generate_candidates` produce next room options
4. `prompt_room()` constructs the next room via Sonnet

Compression triggers on room transition, not on a timer. Both player memory and character memory compress independently.

### WorldObject System

Everything in the world is a WorldObject: rooms, NPCs, items, furniture, jobs, relationships. Objects link to each other via ObjectRefs. Audio is a property of WorldObject. Stats (nature/nurture) are never exposed as named values in UI — they surface only through inner monologue and NPC reactions.

### Economy / Debt

"Pressure yes, death spiral no." Soft financial floor — players can be broke but not infinitely indebted with no escape. Interest rate caps in config. Bankruptcy is an explicit escape valve.

### Audio

Web Audio API for all procedural synthesis — Animal Crossing-style phoneme bark system. Zero runtime AI audio generation. Music stems pre-generated at dev time. All sourced audio assets must be CC0 licensed.

### Assets

- Primary source: LPC (`github.com/ElizaWy/LPC`) — 32px, 3/4 top-down, CC-BY licensed
- Gap-fill: AI image generation constrained to 32px 3/4 perspective, reviewed manually before inclusion
- Asset collection is a **separate phase** — not interleaved with engineering work
- At runtime, LLM selects assets from the taxonomy by `asset_id` — it never generates assets
- See `docs/LifeSimulator_AssetTaxonomy_v1.md` for the full library and generation gap summary

---

## LLM Function Registry

| Function | Model | Purpose |
|---|---|---|
| `prompt_room` | **Sonnet** | Fabricates next room from accumulated life context |
| `select_candidate` | Haiku | Picks best room from generated candidates |
| `generate_candidates` | Haiku | Produces candidate next rooms |
| `character_response` | Haiku | NPC dialogue from character state + player intent |
| `interaction_result` | Haiku | Resolves interaction outcome |
| `update_character_state` | Haiku | Mutates NPC state after interaction |
| `compress_player_memory` | Haiku | Collapses all room events into summary string |
| `compress_character_memory` | Haiku | Collapses NPC memory |
| `generate_room_messages` | Haiku | Ambient messages and notifications |
| `generate_social_feed` | Haiku | In-world social media / news feed |
| `generate_webpage` | Haiku | Fake browsable webpage content |
| `generate_minigame` | Haiku | Procedural minigame spec |
| `player_intent` | Haiku | Classifies player free-text input into structured intent |

All LLM outputs must be validated with Zod schemas before entering game state. No raw LLM response strings touch game state directly. All LLM response types are defined in the `shared` package.

---

## Agent Workflow Protocol

Six-stage lifecycle for all implementation work:

1. **Pick Up** — confirm `ac_status: ready`, issue not blocked or assigned
2. **Branch** — `git checkout -b feature/<issue-number>-<slug>` off main
3. **Implement** — code against acceptance criteria only
4. **Self-Check** — `pnpm lint`, `pnpm typecheck`, `pnpm test` — fix all failures
5. **PR** — open pull request, reference issue number, clear description
6. **Await Review** — stop. Do not merge. Wait for Michael.

Agents may pick up independent issues while awaiting review **only if packages don't overlap**.

### GitHub Project Board

Issues live at: `https://github.com/mtc223/potential/issues`
Project board: `https://github.com/users/mtc223/projects/1`

Label system:
- `ac_status: needs-ac` — blocked, PM must write AC before anyone touches this
- `ac_status: ready` — AC written, agent may pick up
- `ac_status: in-progress` — actively being implemented
- `phase: 1-harness` / `phase: 2-agent` / `phase: 3-stress` / `phase: 4-polish` — engineering phase
- `pkg: shared` / `pkg: harness` / `pkg: agent` / `pkg: renderer` / `pkg: desktop` — affected package
- `priority: critical` / `priority: high` / `priority: normal`

---

## TypeScript Rules

- Strict mode always on (`strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- No `any` — only in explicitly justified and commented escape hatches
- All LLM response types defined in `shared` package
- Package boundary violations are ESLint errors — `renderer`, `agent`, `harness` import from `shared` only

---

## Monorepo Structure

```
potential/
├── apps/
│   ├── desktop/          # Tauri — Steam (current)
│   ├── android/          # Tauri mobile — post-Steam (deferred)
│   └── ios/              # Tauri mobile — post-Steam, requires Mac (deferred)
├── packages/
│   ├── shared/           # Types, Zod schemas, constants — imports from nowhere else
│   ├── harness/          # Dexie IndexedDB + Zustand session state
│   ├── agent/            # Anthropic SDK, LLM function implementations
│   └── renderer/         # React pixel art components, sprite rendering
├── internal/
│   └── sprite-viewer/    # Dev-only sprite catalog browser (index.html + catalog.json)
├── docs/                 # All 11 design documents + index.md
│   └── index.md          # Section-level pointer index — consult when you need a specific section
├── scripts/
│   └── github_setup.js   # Creates repo, labels, milestones, issues, Projects board
├── CLAUDE.md             # This file — read first, always
└── README.md             # Human-readable project description
```

**Package boundary rules (ESLint-enforced):**
- `desktop` → can import from all packages
- `renderer`, `agent`, `harness` → can only import from `shared`
- `shared` → no internal cross-package imports

---

## Design Documents

All 11 design docs live in `docs/`. Read them on demand — only when working in that domain. Do not read all of them upfront.

For the full section-level index (which doc covers which specific topic), see `docs/index.md`.

**Always read before any implementation session:**
1. `docs/LifeSimulator_SystemDesign_v7.md` — core architecture
2. `docs/LifeSimulator_SoftwareDesign_v1.md` — package contracts
3. `docs/LifeSimulator_ProductionDoc_v1.md` — workflow and standards

**Read on demand based on task:**

| Task area | Doc to read |
|---|---|
| Room generation, harness, compression | `LifeSimulator_RoomDesign_v2.md` |
| NPC dialogue, character functions | `LifeSimulator_NPCDesign_v1.md` |
| UI, controls, minigames, renderer | `LifeSimulator_InteractionSystems_v1.md` |
| Economy, debt, jobs, housing | `LifeSimulator_EconomyDesign_v1.md` |
| Any numeric balance or config value | `LifeSimulator_GameConfig_v1.md` |
| Assets, sprites, room layout | `LifeSimulator_AssetTaxonomy_v1.md` |
| Any LLM output path | `LifeSimulator_ContentGuardrails_v1.md` |
| API key flow, Tauri IPC | `LifeSimulator_SecurityDesign_v1.md` |

---

## Document Generation (Creating or Updating Design Docs)

When creating or updating any design document:

1. **Invoke the `docx` skill first** (`/docx` in Cowork, or read the skill at `.claude/skills/docx/SKILL.md` in Claude Code). The skill contains hard-won formatting rules — always read it before generating a `.docx`.
2. Style rules:
   - Bold headings, decision callouts, tables where appropriate
   - Navy blue heading color hierarchy
   - US Letter page size (12240 × 15840 DXA), 1-inch margins
   - Never use unicode bullets — use `LevelFormat.BULLET` with numbering config
   - Never use `\n` — use separate `Paragraph` elements
   - Tables use `WidthType.DXA`, never percentage
3. Save output to the workspace folder and present the link to Michael.

Available Cowork skills (invoke before relevant tasks):

| Skill | When to Use |
|---|---|
| `docx` | Creating or editing design documents (.docx) |
| `pptx` | Creating or editing presentations (.pptx) |
| `xlsx` | Creating or editing spreadsheets (.xlsx) |
| `pdf` | Working with PDFs |
| `schedule` | Setting up automated/recurring tasks |
| `skill-creator` | Building or improving a Cowork skill |

---

## Engineering Phases

| Phase | Name | Focus |
|---|---|---|
| 1 | Build the harness | Dexie schema, append-only room insert, session state (Zustand), compression trigger |
| 2 | Wire the agent | LLM functions, `prompt_room`, Zod validation, BYOK flow |
| 3 | Stress test depth | 100-room playthroughs, compression quality audit, edge cases |
| 4 | Polish the surface | Pixel art renderer, audio (Web Audio API), UI, Steam integration |

Mobile (Android then iOS) follows Steam launch. Asset collection is a separate phase — not interleaved with engineering.

---

## Dev Environment

- **OS:** WSL2 / Ubuntu on Windows
- **Node:** Managed by nvm — always ensure nvm is active before running Node commands
- **PATH:** Must prioritize WSL2 nvm Node over Windows npm installations (known conflict)
- **GitHub token:** Supply via `GITHUB_TOKEN` env var when running setup scripts
- **Repo:** `potential` on GitHub
- **Package manager:** pnpm ≥ 9
- **Monorepo:** Turborepo

**GitHub workflow:**
- Feature branches off `main` — no direct pushes
- PR required for all changes
- `scripts/github_setup.js` — run with `GITHUB_TOKEN=<pat> GITHUB_USERNAME=mtc223 node scripts/github_setup.js`
- `git init` must be run locally in WSL2 (sandbox filesystem does not support git repos)

---

## Current Status (April 2026)

- WSL2 dev environment setup in progress (PATH conflict documented above)
- Local git repo initialized (main branch); GitHub remote deferred
- GitHub setup script ready when needed (`scripts/github_setup.js`)
- All 11 design documents complete and in `docs/`
- Issue backlog and milestones defined (22 issues, 12 milestones)
- Monorepo scaffold in place — all packages stubbed, ready for Phase 1 implementation
- Implementation not yet started — all issues currently tagged `ac_status: needs-ac`
- Asset strategy: LPC primary, AI image generation for gap-fill (tool TBD); sprite catalog browser at `internal/sprite-viewer/`
- Michael is working in Cowork for design and planning work
