# Life Simulator — Design Document Index

_Section-level reference for all 11 design documents._
_Claude: you don't need to read this file. Use it as a lookup when you need a specific section from a specific doc._

---

## Reading Order

| Priority | File | When |
|---|---|---|
| Always first | `LifeSimulator_SystemDesign_v7.md` | Every implementation session |
| Always second | `LifeSimulator_SoftwareDesign_v1.md` | Every implementation session |
| Always third | `LifeSimulator_ProductionDoc_v1.md` | Every implementation session |
| On demand | Everything else | Only when working in that domain |

---

## 1 · System Design v7
`LifeSimulator_SystemDesign_v7.md`

The root document. Everything else is downstream of this.

| Section | Contents |
|---|---|
| Overview & Pitch | Core concept, Lifeward principle, epistemological premise |
| Room Architecture | Singly-linked list, append-only invariant, observer collapse |
| Room Generation Pipeline | Exit → compress → candidates → prompt_room sequence |
| WorldObject System | Object types, ObjectRefs, tombstoning, audio as property |
| Player & Character State | Nature/nurture stats, hidden surfacing via inner monologue |
| LLM Function Registry | All 13 functions, model assignments, input/output contracts |
| Compression System | Trigger conditions, summary string spec, player vs character memory |
| Session Lifecycle | Birth room, life arc, death condition, new life reset |
| Tech Stack Overview | Tauri, React, Dexie, Zustand, Zod — high-level rationale |

---

## 2 · Software Design v1
`LifeSimulator_SoftwareDesign_v1.md`

Package structure, type contracts, Zod schemas, boundary rules.

| Section | Contents |
|---|---|
| Monorepo Architecture | Turborepo + pnpm, package graph, build order |
| Package: shared | Types, Zod schemas, constants — the single import source |
| Package: harness | Dexie schema, room append logic, Zustand session store |
| Package: agent | LLM client, function implementations, prompt builders |
| Package: renderer | React components, sprite system, animation loop |
| Package: desktop | Tauri shell, app entry, IPC bridge |
| Boundary Contracts | ESLint enforcement, what each package may import |
| Zod Schema Reference | LLM output schemas, validation pipeline |
| TypeScript Standards | strict mode config, no-any policy, type locations |

---

## 3 · Production Document v1
`LifeSimulator_ProductionDoc_v1.md`

How work gets done — environment, workflow, standards.

| Section | Contents |
|---|---|
| Dev Environment | WSL2 setup, nvm, PATH conflict fix, GitHub token location |
| Git Workflow | Branch naming, PR format, no direct pushes to main |
| Agent Protocol | Six-stage lifecycle: Pick Up → Branch → Implement → Self-Check → PR → Await |
| AC Gate | ac_status label system, needs-ac hard gate, ready conditions |
| Coding Standards | TypeScript rules, file naming, import conventions |
| Testing Expectations | What self-check means before opening a PR |
| Issue Lifecycle | How issues move from needs-ac → ready → in-progress → review |

---

## 4 · Room Design v2
`LifeSimulator_RoomDesign_v2.md`

Everything about rooms as data structures and generated content.

| Section | Contents |
|---|---|
| Room Object Schema | Full field reference — id, sequenceIndex, previousRoomId, summary, era |
| Room Context Types | Indoor, outdoor, transitional, vehicle — and era modifiers |
| Fabrication Pipeline | How prompt_room constructs a room from life context |
| Layout Composition | How objects populate a room, placement rules, density |
| Exit Logic | How and when a player exits, what triggers compression |
| Room Candidates | How generate_candidates + select_candidate work together |
| Era System | How era affects available assets, NPC archetypes, vocabulary |

---

## 5 · NPC Design v1
`LifeSimulator_NPCDesign_v1.md`

Character model, memory, behavior, relationships.

| Section | Contents |
|---|---|
| Unified Character Model | Single schema for all NPCs — player family, strangers, institutions |
| Character State | Mood, memory, relationship score, persistent traits |
| Behavior System | How NPCs respond to player intent, ambient intelligence |
| Memory Architecture | compress_character_memory, what persists, what fades |
| Relationship Tracking | Score model, relationship types, decay over time |
| NPC Archetypes | Core recurring types (parents, teachers, partners, bosses) |
| Dialogue Contract | character_response inputs/outputs, tone constraints |

---

## 6 · Interaction Systems v1
`LifeSimulator_InteractionSystems_v1.md`

How the player acts in the world.

| Section | Contents |
|---|---|
| Movement & Controls | How the player navigates a room |
| Screen Layout | HUD structure, dialogue box placement, Pokémon-style UI |
| Player Intent Pipeline | Free-text input → player_intent → structured action |
| Interaction Resolution | interaction_result, outcome types, state mutations |
| MinigameKit | Procedural minigame spec, generate_minigame contract |
| Code Execution Context | When and how minigames run, sandboxing |
| Ambient Systems | generate_room_messages, notifications, background events |

---

## 7 · Economy Design v1
`LifeSimulator_EconomyDesign_v1.md`

Money, debt, housing, jobs, and the soft floor principle.

| Section | Contents |
|---|---|
| Financial System | Income, expenses, balance tracking, time scale |
| Debt Design | "Pressure yes, death spiral no" — interest caps, soft floor |
| Bankruptcy | Escape valve mechanics, what happens when triggered |
| Housing | Rent, ownership, eviction, homelessness arc |
| Education | Tuition, student debt, credential payoff curves |
| Employment | Job types, income tiers, career progression, firing |
| Obligations | Child support, healthcare, loan repayments |
| Trading & Transactions | Player-to-NPC economic interactions |

---

## 8 · Game Config v1
`LifeSimulator_GameConfig_v1.md`

All tunable constants in one place. Touch this doc any time you change a number.

| Section | Contents |
|---|---|
| Economy Constants | Starting balance, income ranges, interest rate caps |
| Life Arc Constants | Life length bounds, aging speed, health decay |
| Compression Config | Summary string max length, compression trigger threshold |
| Room Generation Config | Candidate count, context window budget, era weights |
| NPC Config | Relationship decay rate, memory compression threshold |
| Audio Config | Volume defaults, phoneme bark timing |
| Difficulty / Pacing | Soft difficulty sliders, pressure curve config |

---

## 9 · Asset Taxonomy v1
`LifeSimulator_AssetTaxonomy_v1.md`

Every sprite and prop in the game, organized by room context.

| Section | Contents |
|---|---|
| Asset Sources | LPC (primary, CC-BY), LoRA pipeline (gap-fill), review process |
| Characters | Player ages (baby → senior), NPC archetypes, walk cycles |
| Indoor — Early Life | Nursery, living room, kitchen, bathroom, bedrooms, basement, attic |
| Indoor — School | Classroom, hallway, cafeteria, gym, library |
| Indoor — Work | Office, warehouse†, construction†, auto repair†, factory†, restaurant, trucking†, retail, janitorial |
| Indoor — Medical | Hospital room, doctor's office |
| Indoor — Late Life | Nursing home / senior living† |
| Outdoor | Residential, playground, city park, sports fields, urban street, beach†, nature |
| Special / Transitional | Cemetery†, airport, rooftops |
| Vehicles | All vehicle interiors† |
| UI / Overlay | Dialogue box, phone screen, TV, computer, notification popup |
| Generation Gaps Summary | Full list of † categories requiring LoRA image generation |

_† = not in LPC, requires image generation pipeline_

---

## 10 · Content Guardrails v1
`LifeSimulator_ContentGuardrails_v1.md`

LLM output filtering, age-gating, content safety rules.

| Section | Contents |
|---|---|
| Content Policy | What the LLM may and may not generate |
| Age-Gating | How player age affects available content (childhood vs adult arcs) |
| Tone Controls | Guardrails on violence, sexuality, substance use |
| Output Filtering Pipeline | Where filtering runs in the LLM call chain |
| Edge Case Handling | Death, abuse, mental health — how these arcs are handled |
| Player Consent Model | How sensitive content is surfaced and opted into |

---

## 11 · Security Design v1
`LifeSimulator_SecurityDesign_v1.md`

BYOK key handling, sandboxing, Tauri IPC security.

| Section | Contents |
|---|---|
| BYOK Model | How the API key is collected, stored, and used |
| Key Storage | Where the key lives (never in code, never bundled) |
| Tauri IPC Security | What the frontend can and cannot call through the bridge |
| Sandboxing | How minigame code execution is isolated |
| Data Privacy | What stays local, what never leaves the device |
| Threat Model | Known attack surfaces and mitigations |
