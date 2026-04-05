**Life Simulator**

Production Document

*Tech Stack · Dev Environment · Coding Methodology · Git Workflow ·
Claude Code Integration*

*v1.0 · Companion to System Design Document*

1\. Overview

This document defines the complete production environment for Life
Simulator --- every technology decision, development convention, coding
pattern, and workflow standard that governs how the project is built,
tested, and shipped. It is the authoritative reference for
implementation decisions and the context document provided to Claude
Code on every task.

All architectural decisions are made here. Claude Code executes against
those decisions. It never makes them.

2\. Repository Structure

Life Simulator uses a monorepo managed by Turborepo with pnpm
workspaces. The harness, agent, and renderer are separate packages with
enforced boundaries. This separation means the harness is fully testable
with zero UI and zero LLM --- which is the engineering foundation of
Phase 1.

> life-simulator/
>
> packages/
>
> harness/ ← Pure TypeScript. World model, state, compression, linked
> list.
>
> agent/ ← LLM integration. Reads harness, writes harness.
>
> renderer/ ← React + pixel rendering. Reads harness only.
>
> shared/ ← Types, Zod schemas, constants shared across all packages.
>
> apps/
>
> desktop/ ← Tauri wrapper. Steam distribution target.
>
> mobile/ ← Capacitor (Phase 3+). iOS and Android.
>
> prompts/ ← Prompt registry. Versioned .md files with frontmatter.
>
> tools/
>
> asset-pipeline/ ← Sprite processing, atlas generation, asset_id
> registry.
>
> .github/
>
> workflows/ ← CI/CD pipeline definitions.
>
> ISSUE_TEMPLATE/ ← Standardised issue templates.

Package boundary rule: packages may only import from packages/shared and
their declared dependencies. Cross-package imports are enforced by
ESLint. The renderer never imports from the agent. The harness never
imports from anywhere except shared.

3\. Tech Stack

3.1 Core

  ---------------- ---------------- ---------------------------------------
  **Layer**        **Technology**   **Rationale**

  Language         TypeScript 5,    Non-negotiable given schema complexity.
                   strict mode      Strict catches errors Claude Code would
                                    otherwise miss.

  Build tool       Vite             Fast, TS-native, excellent plugin
                                    ecosystem. Dev server and production
                                    builds unified.

  UI framework     React 18         Implied by architecture. Concurrent
                                    features useful for room transition
                                    rendering.

  Package manager  pnpm             Fastest, best monorepo workspace
                                    support, deterministic lockfile.

  Monorepo         Turborepo        Task pipeline caching, parallel
                                    execution, clean dependency graph
                                    enforcement.

  Desktop wrapper  Tauri            \~10MB binary vs Electron \~150MB. OS
                                    webview, Rust backend for Steamworks
                                    SDK and file I/O.
  ---------------- ---------------- ---------------------------------------

3.2 State & Persistence

  ---------------- ---------------- ---------------------------------------
  **Layer**        **Technology**   **Rationale**

  Persistent       IndexedDB via    Typed ORM wrapper. Native migration
  storage          Dexie.js         support solves save versioning. No
                                    practical size limit --- handles 500+
                                    room linked lists easily.

  Session state    Zustand          Lightweight, TypeScript-first, no
                                    boilerplate. In-memory game state
                                    during a session.

  Lightweight      localStorage     Current room pointer, API key, player
  session                           name only --- as specified in System
                                    Design Document.

  Runtime          Zod              Every LLM output validated against Zod
  validation                        schemas before touching the harness.
                                    LLM safety net.
  ---------------- ---------------- ---------------------------------------

3.3 Testing

  ---------------- ---------------- ---------------------------------------
  **Layer**        **Technology**   **Rationale**

  Test runner      Vitest           Vite-native. Same config, same
                                    transforms. Fast watch mode.

  React testing    Testing Library  Component testing without
                                    implementation details.

  Mock LLM         Custom mock      Deterministic fake LLM responses for
                   layer in agent/  CI. No API credits burned in tests.

  Schema           Zod + Vitest     LLM output shape tests run against real
  validation                        prompt templates with mock responses.
  ---------------- ---------------- ---------------------------------------

3.4 Code Quality & Enforcement

  ------------------ -------------------------- --------------------------
  **Tool**           **Purpose**                **When It Runs**

  ESLint             Catches no-any, import     Pre-commit + CI
                     boundaries, naming rules,  
                     no default exports in      
                     non-component files        

  Prettier           Formatting. Claude Code    Pre-commit
                     never produces style       
                     inconsistencies.           

  TypeScript tsc     Type checking across all   Pre-commit + CI
                     packages                   

  Husky +            Runs ESLint + Prettier +   Every git commit
  lint-staged        tsc on staged files.       
                     Nothing dirty commits.     

  Vitest             Full test suite            Every PR --- merge blocked
                                                on failure

  Turborepo cache    Skips unchanged package    CI --- speeds up pipelines
                     tasks                      
  ------------------ -------------------------- --------------------------

3.5 LLM & Prompt Infrastructure

  ------------------ -------------------- ---------------------------------
  **Component**      **Technology**       **Notes**

  Anthropic SDK      \@anthropic-ai/sdk   Client-side only. Player\'s API
                     (official TypeScript key. Never touches a dev server.
                     client)              

  Prompt storage     prompts/ directory,  Version-controlled alongside
                     .md files with YAML  code. Diff-able in PRs.
                     frontmatter          

  Prompt loader      Vite plugin at build Compiles .md prompts to typed
                     time                 TypeScript constants. No runtime
                                          file reads.

  Output validation  Zod schemas in       Every LLM response shape
                     packages/shared      validated before harness write.

  Prompt metadata    version,             Tracked per prompt file. Changes
                     model_target,        visible in git blame.
                     token_estimate in    
                     frontmatter          
  ------------------ -------------------- ---------------------------------

4\. Development Environment

4.1 Local Setup

Development runs inside WSL2 (Ubuntu 22.04 LTS) on Windows. All tooling
is installed and run from within WSL2. The Windows filesystem is not
used for source files --- everything lives in the WSL2 filesystem for
correct file-watching and performance.

  ------------------ ---------------- ------------------------------------
  **Tool**           **Version**      **Install Method**

  WSL2               Ubuntu 22.04 LTS Windows features --- already
                                      standard on Win 11

  Node.js            LTS (via nvm)    nvm install \--lts inside WSL2

  pnpm               Latest stable    npm install -g pnpm after Node
                                      install

  Rust toolchain     Stable (via      Required for Tauri. curl rustup.rs
                     rustup)          inside WSL2

  Tauri CLI          Latest           cargo install tauri-cli after Rust

  VS Code            Latest           Windows install + WSL Remote
                                      extension

  Git                System package   apt install git --- configure inside
                                      WSL2
  ------------------ ---------------- ------------------------------------

4.2 VS Code Extensions (Required)

-   ESLint --- real-time lint feedback in editor

-   Prettier --- format on save

-   TypeScript (built-in, keep updated)

-   WSL Remote --- development inside WSL2 from Windows VS Code

-   Vitest --- run and debug tests inline

-   GitLens --- authorship and history inline

-   Tauri --- build and dev server integration

4.3 Environment Variables

A .env.local file at repo root (gitignored) holds development-only
config. Production builds have zero environment variables --- the
player\'s API key is stored in localStorage/Keychain at runtime, never
in a build artifact.

> VITE_DEV_MOCK_LLM=true \# Use mock LLM layer in development
>
> VITE_DEV_SHOW_STATE=true \# Render harness state overlay in dev builds
>
> VITE_DEV_FAST_COMPRESS=true \# Skip compression delay for testing

4.4 WSL2 + Tauri Display

Tauri opens a native window during development. On Windows 11, WSLg
handles this automatically with no additional configuration. On Windows
10, install VcXsrv and set DISPLAY=:0 in your WSL2 shell profile.

5\. Coding Methodology

These conventions are the rails that Claude Code runs on. As many as
possible are enforced by tooling rather than documentation alone. Where
a rule is not tool-enforceable it is documented here so it appears in
Claude Code\'s context on every task.

5.1 File & Folder Naming

  ------------------ --------------------- -------------------------------
  **Pattern**        **Convention**        **Example**

  Source files       kebab-case            world-object.ts,
                                           compression-pipeline.ts

  React components   PascalCase file, .tsx RoomRenderer.tsx,
                     extension             DialogueBox.tsx

  Test files         Colocated, .test.ts   world-object.test.ts next to
                     suffix                world-object.ts

  Prompt files       kebab-case, .md       room-generation.md,
                     extension             character-response.md

  Index files        Only for public       packages/harness/index.ts
                     package API           exports public surface only

  Directories        kebab-case            compression-pipeline/,
                                           llm-calls/
  ------------------ --------------------- -------------------------------

5.2 TypeScript Conventions

-   interface for all data shapes --- WorldObject, RoomLayout,
    Character, etc. Interfaces match the schemas in the System Design
    Document exactly.

-   type for unions, computed types, and utility types only.

-   No any. Ever. Use unknown when the shape is genuinely unknown, then
    narrow with Zod or type guards.

-   Explicit return types on every function. No inferred returns on
    public API functions.

-   readonly arrays and objects on all harness inputs --- enforces
    immutability at the type level.

-   noUncheckedIndexedAccess and exactOptionalPropertyTypes enabled ---
    forces handling of undefined on array access and optional fields.

-   Zod schema mirrors every interface in packages/shared. The Zod
    schema is the source of truth for runtime shapes. The TypeScript
    interface is inferred from the Zod schema using z.infer\<\>.

*Pattern: define Zod schema first, infer the TypeScript type from it.
Never write a type and a schema separately --- they will drift.*

> // packages/shared/schemas/room.ts
>
> export const RoomSchema = z.object({
>
> id: z.string().uuid(),
>
> type: RoomTypeSchema,
>
> player_age: z.number().min(0).max(120),
>
> // \...
>
> });
>
> export type Room = z.infer\<typeof RoomSchema\>;

5.3 Module & Import Conventions

-   Named exports only. No default exports except React components
    (required by React conventions).

-   Each package exposes its public API exclusively through its
    index.ts. Internal modules are never imported across package
    boundaries.

-   ESLint import/no-internal-modules enforces package boundaries ---
    Claude Code cannot violate the architecture even accidentally.

-   Absolute imports within a package using the package name as alias.
    No ../../../ chains.

-   Import order enforced by ESLint: Node built-ins → external packages
    → internal packages → relative imports.

5.4 Function Conventions

-   Pure functions everywhere in the harness package. Same input, same
    output, no side effects. Side effects (IndexedDB writes, LLM calls)
    live in the agent package only.

-   Result type pattern for all fallible operations --- never throw
    across module boundaries.

-   Functions stay under 40 lines. If longer, decompose.

-   One responsibility per function. The name should fully describe what
    it does.

-   JSDoc on every exported function: \@param, \@returns, and \@throws.
    This is what Claude Code reads to understand the API --- it must be
    accurate.

> // Result type --- defined once in packages/shared
>
> export type Result\<T, E = Error\> =
>
> \| { ok: true; data: T }
>
> \| { ok: false; error: E };
>
> // Usage in harness
>
> export function compressRoom(room: Room): Result\<CompressedRoom\> {
>
> // \...
>
> }

5.5 React Conventions

-   Custom hooks for all logic. Components contain only JSX and hook
    calls --- no inline logic, no conditionals beyond rendering
    branches.

-   No logic in JSX expressions. Extract to a variable or hook before
    the return statement.

-   Props interface defined in the same file as the component, named
    \[ComponentName\]Props.

-   One component per file. The file name matches the component name.

-   React.memo only where profiling shows a real performance problem ---
    not as a default.

5.6 LLM Call Pattern

Every LLM call in the agent package follows this exact pipeline. No
ad-hoc calls. Claude Code implements new LLM features by following this
pattern.

> buildPrompt(context) // Assembles prompt from registry template +
> LifeContext
>
> → validateInput(prompt) // Checks token budget, required fields
> present
>
> → callLLM(prompt) // Anthropic SDK call, model specified per call type
>
> → validateOutput(schema) // Zod parse of raw LLM response
>
> → applyToHarness(result) // Writes validated result to harness state

If validateOutput fails, the call returns a Result error. The caller
decides whether to retry, degrade gracefully, or surface a BlankRoom.
LLM output is never trusted and never touches the harness unvalidated.

5.7 Error Handling

-   Never swallow errors silently. Every catch either recovers
    meaningfully or re-throws with added context.

-   Errors that cross module boundaries use the Result type --- never
    thrown exceptions.

-   Errors within a module may throw --- catch them at the module
    boundary and convert to Result.

-   BlankRoom is the game-level error state for LLM/network failures. It
    is handled by the harness, not scattered through the agent.

-   No empty catch blocks. Ever. ESLint no-empty enforces this.

5.8 Comment Convention

-   No comments explaining what code does. The code must be readable
    enough to explain itself.

-   Comments explain why --- a non-obvious decision, a workaround, a
    known limitation.

-   JSDoc on every exported function. Kept accurate --- stale JSDoc is
    worse than no JSDoc.

-   TODO comments must include a GitHub issue number: // TODO(#142):
    handle meta-compression edge case

5.9 Testing Conventions

-   Test files are colocated with source files. world-object.test.ts
    lives next to world-object.ts.

-   Harness package has the highest coverage requirement --- every
    public function has tests. This is Phase 1.

-   Tests are named descriptively: describe(\'compressRoom\') /
    it(\'returns error when room has no events\').

-   No test depends on another test. Each test sets up its own state.

-   Mock LLM responses are defined in agent/mocks/ as typed fixtures
    matching the Zod schemas.

-   Snapshot tests for prompt templates --- catch accidental prompt
    regressions on merge.

6\. Git Workflow

6.1 Branch Strategy --- GitHub Flow

GitHub Flow keeps things simple for a project of this size. Two
permanent branches, feature branches off dev.

  ------------- ------------------------------ ----------------------------------
  **Branch**    **Purpose**                    **Rules**

  main          Always deployable. Represents  Protected. Merge from dev only.
                the last shipped build.        Requires passing CI.

  dev           Integration branch. Active     Protected. PRs required. CI must
                development lands here.        pass before merge.

  feature/\*    New features:                  Branch from dev. PR back to dev
                feature/harness-worldobject    when complete.

  fix/\*        Bug fixes:                     Branch from dev. PR back to dev
                fix/compression-null-pointer   when complete.

  prompt/\*     Prompt changes:                Branch from dev. Treated
                prompt/room-generation-v3      identically to feature branches.

  release/\*    Release preparation            Branch from dev to main when
                                               shipping a Steam build.
  ------------- ------------------------------ ----------------------------------

6.2 Commit Convention --- Conventional Commits

All commits follow the Conventional Commits specification. This enables
automatic changelog generation and makes the git history readable as a
project diary. Commitlint enforces this on every commit via Husky.

> feat(harness): add WorldObject compression lifecycle
>
> fix(agent): handle null next_room_id on BlankRoom generation
>
> prompt(room-gen): tighten situation field output instructions
>
> test(harness): add linked list splice edge cases
>
> docs(system-design): update compression schema fields
>
> refactor(renderer): extract room transition to custom hook
>
> chore(deps): update Anthropic SDK to latest

  ------------ ------------------------ ----------------------------------
  **Prefix**   **Scope Examples**       **When to Use**

  feat         harness, agent,          New functionality
               renderer, prompt, asset  

  fix          harness, agent,          Bug fix
               renderer, prompt         

  test         harness, agent, renderer Adding or fixing tests

  prompt       room-gen, char-response, Prompt file changes
               compress                 

  refactor     any package              Code change with no behaviour
                                        change

  docs         system-design,           Documentation only
               production, readme       

  chore        deps, ci, config         Tooling, dependencies, config
  ------------ ------------------------ ----------------------------------

6.3 Pull Request Convention

-   Every PR links to a GitHub issue. No unlinked PRs.

-   PR title follows Conventional Commits format.

-   PR description uses the standard template: What, Why, How, Testing
    notes, Screenshots (for renderer changes).

-   CI must pass before merge --- lint, type-check, full test suite.

-   Self-review required even for solo work --- forces a final read
    before merge.

-   Squash merge into dev --- keeps history linear and readable.

6.4 Versioning --- Semantic Versioning

  --------------- ------------------------------ -------------------------
  **Version       **When**                       **Example**
  Bump**                                         

  Major (1.0.0 →  Breaking save format change.   New IndexedDB schema
  2.0.0)          Players cannot load old saves  version
                  without migration.             

  Minor (1.0.0 →  New feature,                   New room type, new NPC
  1.1.0)          backward-compatible. Old saves type
                  load fine.                     

  Patch (1.0.0 →  Bug fix, no new features, no   Fix BlankRoom recovery
  1.0.1)          save format change.            logic
  --------------- ------------------------------ -------------------------

Save data versioning tracks independently via Dexie.js migration
versions. A version tag on main triggers the Steam build pipeline.

7\. GitHub Project Board

7.1 Board Structure

The project board is the single source of truth for what is being built
and in what order. The project owner (PM) manages the board. Automation
handles status transitions based on PR and issue activity.

  ------------- --------------------- ------------------------------------
  **Column**    **Contents**          **How Items Move In/Out**

  Backlog       Everything that       PM creates issues here. Never
                exists but is not     auto-populated.
                scheduled.            

  This Sprint   Committed work for    PM manually promotes from Backlog.
                the current 2-week    WIP limit: 10.
                window.               

  In Progress   Actively being built. Auto: issue assigned or linked PR
                                      opened. WIP limit: 3.

  In Review     PR open, awaiting     Auto: PR opened and linked to issue.
                review and CI.        

  Done          Merged to dev.        Auto: linked PR merged.
  ------------- --------------------- ------------------------------------

7.2 Issue Labels

  ------------------ ----------------------------------------------------
  **Label**          **Purpose**

  phase-1 / phase-2  Maps issue to engineering phase. Enables
  / phase-3 /        phase-filtered board views.
  phase-4            

  harness / agent /  Package or domain scope of the work.
  renderer / prompt  
  / asset            

  feat / fix / test  Issue type --- mirrors Conventional Commits
  / docs / chore     prefixes.

  claude-code        Flagged for Claude Code implementation. PM sets this
                     when writing acceptance criteria.

  claude-cowork      Flagged for Claude Cowork automation (cross-file,
                     asset pipeline, batch tasks).

  blocked            Waiting on a dependency. Must reference the blocking
                     issue in the description.

  needs-ac           Issue exists but acceptance criteria not yet
                     written. Not ready for implementation.
  ------------------ ----------------------------------------------------

7.3 Issue Template

Every issue follows this structure before it receives the claude-code
label. No acceptance criteria means it is not ready to implement.

> \## Summary
>
> One sentence. What needs to exist that does not exist now.
>
> \## Context
>
> Why this is needed. Reference to system design doc section if
> applicable.
>
> \## Acceptance Criteria
>
> \- \[ \] Specific, testable condition 1
>
> \- \[ \] Specific, testable condition 2
>
> \- \[ \] Tests written and passing
>
> \## Out of Scope
>
> Explicit list of related things this issue does NOT cover.
>
> \## Notes for Claude Code
>
> Relevant schema docs, patterns to follow, files to read first.

8\. Claude Code Integration

8.1 What Claude Code Does

Claude Code is the implementation engine. It executes against decisions
already made. It never makes architectural decisions, never changes
package boundaries, and never modifies ESLint or TypeScript config
without an explicit issue authorising the change.

  ---------------- ------------------- ----------------------------------
  **Task Type**    **Claude Code       **Examples**
                   Role**              

  Schema           Given a schema from WorldObject, Room, Character,
  implementation   the design doc,     AffectionState schemas
                   produce the Zod     
                   schema + inferred   
                   type + Dexie table  
                   definition.         

  Function         Given a JSDoc spec  compressRoom(),
  implementation   and types,          selectCandidates(),
                   implement the       applyStatDelta()
                   function with       
                   tests.              

  Boilerplate      Package setup,      New package init, save version
  generation       Dexie migration     migration
                   files, Zustand      
                   store scaffolding.  

  Test writing     Given an            Harness package test suite
                   implemented         
                   function and its    
                   types, write        
                   exhaustive unit     
                   tests.              

  Prompt iteration Given a prompt file Room generation situation field
                   and a failure case, tightening
                   revise the prompt.  

  Refactoring      Given a clear       Extract hook, split large function
                   before/after spec,  
                   refactor without    
                   behaviour change.   
  ---------------- ------------------- ----------------------------------

8.2 What Claude Code Does Not Do

-   Make architectural decisions --- package structure, data model
    design, which technology to use.

-   Modify ESLint, TypeScript config, or Prettier config without an
    explicit authorising issue.

-   Create new packages or restructure the monorepo.

-   Merge its own PRs --- PRs opened by Claude Code are reviewed by the
    PM before merge.

-   Write acceptance criteria --- that is the PM\'s role before
    assigning the issue.

8.3 Claude Code Context Protocol

Every Claude Code session for this project begins by reading the
following documents in order. This is documented here so it can be
provided as a standard preamble.

1.  System Design Document (current version) --- architecture, schemas,
    engineering phases

2.  This Production Document --- tech stack, conventions, patterns

3.  Asset Taxonomy Document --- room types, asset vocabulary

4.  The specific issue being implemented --- summary, context,
    acceptance criteria, notes

5.  Relevant source files for the task --- read before writing any code

Claude Code opens PRs with the conventional commit title format, links
the originating issue, and includes a brief implementation summary. The
PR description notes any decisions made during implementation that
deviate from or extend the issue spec --- these are flagged for PM
review.

8.4 Claude Cowork Integration

Claude Cowork handles tasks that require coordinating multiple tools or
files in sequence --- work that is too broad for a single focused coding
session.

  --------------------- -------------------------------------------------
  **Task**              **Claude Cowork Role**

  Asset pipeline runs   Process raw sprites through atlas generation,
                        register asset_ids, update asset taxonomy

  Cross-package         Generate API docs from JSDoc across all packages
  documentation         into a unified reference

  Test suite reports    Run full Vitest suite, surface failures, group by
                        package, produce summary

  Save migration        Given a new schema version, generate the Dexie
  scaffolding           migration file and update all affected type
                        references across packages

  Prompt registry audit Scan all prompt files, check version metadata,
                        flag prompts with stale model targets
  --------------------- -------------------------------------------------

8.5 PM Responsibilities

The project owner manages the board and owns every decision that Claude
Code executes against. This is not a technical role limitation --- it is
the intentional division of labour that keeps the architecture coherent
over time.

-   Write acceptance criteria on every issue before it receives the
    claude-code label.

-   Promote issues from Backlog to This Sprint each sprint.

-   Review every PR opened by Claude Code --- does it satisfy the
    acceptance criteria?

-   Own prompt quality --- evaluate LLM output and author prompt
    iteration issues.

-   Make all architectural decisions --- Claude Code proposes, PM
    decides.

-   Update design documents when decisions change --- Claude Code reads
    these as source of truth.

9\. CI/CD Pipeline

9.1 Pipeline Stages

  ------------- --------------- --------------------------- ---------------
  **Stage**     **Trigger**     **Steps**                   **Blocks
                                                            Merge?**

  PR Validation Every PR to dev Lint (ESLint), Format check Yes --- all
                or main         (Prettier), Type check      must pass
                                (tsc), Unit tests (Vitest), 
                                Build check (Vite)          

  Dev           Merge to dev    Full test suite, build all  No ---
  Integration                   packages, Turborepo cache   informational
                                update                      

  Release Build Tag push        Full validation + Tauri     Yes --- gates
                (v\*.\*.\*) to  production build + Steam    Steam publish
                main            upload via Steamworks CLI   
  ------------- --------------- --------------------------- ---------------

9.2 GitHub Actions

All pipeline definitions live in .github/workflows/. Three workflow
files:

-   pr-validation.yml --- runs on every PR. Lint, type-check, test,
    build. Required status check.

-   dev-integration.yml --- runs on merge to dev. Full suite + package
    builds.

-   release.yml --- runs on version tag. Production Tauri build + Steam
    deployment.

Turborepo remote caching (via Vercel or self-hosted) skips unchanged
package tasks in CI. A change to the renderer package does not re-run
harness tests.

10\. Save Data Versioning

Save data is the player\'s life. Breaking a save is unacceptable.
Dexie.js handles IndexedDB migrations. Every schema change that affects
persisted data requires a new Dexie version with an explicit upgrade
function.

> // packages/harness/db/migrations.ts
>
> const db = new Dexie(\'LifeSimulator\');
>
> db.version(1).stores({ rooms: \'++id, sequence_index\', characters:
> \'++id\' });
>
> db.version(2).stores({ rooms: \'++id, sequence_index, type\',
> characters: \'++id\' })
>
> .upgrade(tx =\> tx.rooms.toCollection().modify(r =\> { r.type ??=
> \'blank\'; }));

-   Save format version is stored in localStorage alongside the current
    room pointer.

-   On load, version is checked. If behind current, migration runs
    automatically before game starts.

-   JSON export includes the save format version in the root object.

-   Major semver bumps (1.x → 2.x) indicate a migration that cannot be
    automated --- these are rare and require explicit player
    communication.

11\. Legal & Attribution

  ------------------ ----------------------------------------------------
  **Item**           **Requirement**

  LPC Assets         CC-BY licensed. Attribution required in game credits
                     and Steam store page. Credit: Liberated Pixel Cup
                     contributors via OpenGameArt and ElizaWy\'s curated
                     collection.

  AI-generated gap   Verify commercial license for image generation model
  assets             used. Document model and license in
                     asset-pipeline/LICENSES.md.

  Anthropic SDK      MIT licensed. No attribution required but note in
                     THIRD_PARTY_LICENSES.

  Legal entity       Establish sole trader or LLC before accepting Steam
                     revenue. Consult accountant for
                     jurisdiction-appropriate structure.

  Steam developer    Required before release pipeline. Steamworks Partner
  account            Program enrollment needed for CI/CD Steam upload.
  ------------------ ----------------------------------------------------

*See System Design Document v5.0 for architecture, harness design, and
engineering phases. See Asset Taxonomy v1.0 for room generation
reference. See Business Model v1.0 for platform roadmap and revenue
model.*
