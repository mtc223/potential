#!/usr/bin/env node
/**
 * github_setup.js — Life Simulator GitHub repository bootstrapper
 *
 * Run this locally (not in sandbox) after cloning the repo.
 * It creates: repo, labels, milestones, issues, GitHub Projects v2 board.
 *
 * Usage:
 *   GITHUB_TOKEN=<your_pat> GITHUB_USERNAME=<your_username> node scripts/github_setup.js
 *
 * PAT scopes needed: repo, project
 */

import { Octokit } from "@octokit/rest";
import { graphql } from "@octokit/graphql";

const TOKEN = process.env.GITHUB_TOKEN;
const USERNAME = process.env.GITHUB_USERNAME;
const REPO_NAME = "potential";

if (!TOKEN || !USERNAME) {
  console.error("❌  Set GITHUB_TOKEN and GITHUB_USERNAME environment variables.");
  process.exit(1);
}

const octokit = new Octokit({ auth: TOKEN });
const gql = graphql.defaults({ headers: { authorization: `token ${TOKEN}` } });

// ─── Labels ──────────────────────────────────────────────────────────────────

const LABELS = [
  // Status
  { name: "ac_status: needs-ac",    color: "d93f0b", description: "Awaiting acceptance criteria from PM — hard gate, do not start" },
  { name: "ac_status: ready",       color: "0075ca", description: "AC written, agent may pick up" },
  { name: "ac_status: in-progress", color: "e4e669", description: "Agent actively implementing" },
  // Type
  { name: "type: feature",          color: "1d76db", description: "New functionality" },
  { name: "type: bug",              color: "ee0701", description: "Something is broken" },
  { name: "type: refactor",         color: "5319e7", description: "Code cleanup, no behavior change" },
  { name: "type: docs",             color: "0075ca", description: "Documentation only" },
  { name: "type: test",             color: "bfd4f2", description: "Test coverage" },
  { name: "type: infra",            color: "fef2c0", description: "Build, CI, tooling" },
  // Package
  { name: "pkg: shared",            color: "c5def5", description: "packages/shared" },
  { name: "pkg: harness",           color: "c5def5", description: "packages/harness" },
  { name: "pkg: agent",             color: "c5def5", description: "packages/agent" },
  { name: "pkg: renderer",          color: "c5def5", description: "packages/renderer" },
  { name: "pkg: desktop",           color: "c5def5", description: "apps/desktop" },
  // Phase
  { name: "phase: 1-harness",       color: "0e8a16", description: "Phase 1 — Build the harness" },
  { name: "phase: 2-agent",         color: "0e8a16", description: "Phase 2 — Wire the agent" },
  { name: "phase: 3-stress",        color: "0e8a16", description: "Phase 3 — Stress test depth" },
  { name: "phase: 4-polish",        color: "0e8a16", description: "Phase 4 — Polish the surface" },
  // Priority
  { name: "priority: critical",     color: "b60205", description: "Blocking — must resolve immediately" },
  { name: "priority: high",         color: "e4e669", description: "High priority" },
  { name: "priority: normal",       color: "ededed", description: "Normal priority" },
];

// ─── Milestones ───────────────────────────────────────────────────────────────

const MILESTONES = [
  { title: "M1 — DB Schema & Room Append",      description: "Dexie schema, append-only room insert, read current room" },
  { title: "M2 — Session State",                description: "Zustand store: currentRoom, player, isGenerating" },
  { title: "M3 — Compression Pipeline",         description: "compress_player_memory fires on room exit, summary stored" },
  { title: "M4 — BYOK API Key Flow",            description: "Player enters Anthropic key, stored securely, validated" },
  { title: "M5 — prompt_room (Sonnet)",         description: "First working room generation from life context" },
  { title: "M6 — Zod Validation Layer",         description: "All LLM outputs validated through Zod schemas" },
  { title: "M7 — Haiku LLM Functions",          description: "character_response, interaction_result, generate_candidates" },
  { title: "M8 — 10-Room Playthrough",          description: "First end-to-end playthrough, 10 rooms, manual test" },
  { title: "M9 — 100-Room Stress Test",         description: "Automated 100-room run, memory compression quality audit" },
  { title: "M10 — Pixel Art Renderer v1",       description: "RoomView renders room + objects at 32px, 3/4 top-down" },
  { title: "M11 — Audio Integration",           description: "Web Audio API phoneme bark, ambient loops per WorldObject" },
  { title: "M12 — Steam Build",                 description: "Tauri build passes, Steamworks SDK integrated, store page" },
];

// ─── Parent Issues ────────────────────────────────────────────────────────────

const ISSUES = [
  // Phase 1 — Harness
  {
    title: "[EPIC] Phase 1 — Build the Harness",
    body: "Parent epic for all Phase 1 work: IndexedDB schema, room append, session state, compression.\n\nSee `docs/LifeSimulator_SystemDesign_v7.md` and `docs/LifeSimulator_SoftwareDesign_v1.md`.",
    labels: ["phase: 1-harness", "type: feature", "ac_status: needs-ac"],
  },
  {
    title: "Define Dexie IndexedDB schema for rooms and player identity",
    body: "## Context\nSee `packages/harness/src/db/life-sim-db.ts` for the placeholder stub.\n\n## Acceptance Criteria\n_PM to fill in_\n\n```yaml\nac_status: needs-ac\n```",
    labels: ["phase: 1-harness", "type: feature", "pkg: harness", "ac_status: needs-ac", "priority: critical"],
  },
  {
    title: "Implement append-only room insert with singly-linked list invariant",
    body: "## Context\nRooms are never updated after creation except for `summary` and `exitedAt`. See SystemDesign v7.\n\n## Acceptance Criteria\n_PM to fill in_\n\n```yaml\nac_status: needs-ac\n```",
    labels: ["phase: 1-harness", "type: feature", "pkg: harness", "ac_status: needs-ac", "priority: critical"],
  },
  {
    title: "Implement Zustand session store (currentRoom, player, isGenerating)",
    body: "## Context\nSee `packages/harness/src/store/session-store.ts` stub.\n\n## Acceptance Criteria\n_PM to fill in_\n\n```yaml\nac_status: needs-ac\n```",
    labels: ["phase: 1-harness", "type: feature", "pkg: harness", "ac_status: needs-ac"],
  },
  {
    title: "Implement compression trigger on room exit",
    body: "## Context\nCompression fires on room transition and collapses all events into a single summary string. Must fire BEFORE N+1 room selection.\n\n## Acceptance Criteria\n_PM to fill in_\n\n```yaml\nac_status: needs-ac\n```",
    labels: ["phase: 1-harness", "type: feature", "pkg: harness", "ac_status: needs-ac", "priority: high"],
  },

  // Phase 2 — Agent
  {
    title: "[EPIC] Phase 2 — Wire the Agent",
    body: "Parent epic for all Phase 2 work: LLM functions, Zod validation, BYOK flow.\n\nSee `docs/LifeSimulator_SystemDesign_v7.md`.",
    labels: ["phase: 2-agent", "type: feature", "ac_status: needs-ac"],
  },
  {
    title: "Implement BYOK API key entry, storage, and validation",
    body: "## Context\nPlayer supplies their own Anthropic API key. Must never be bundled or logged.\nSee `docs/LifeSimulator_SecurityDesign_v1.md`.\n\n## Acceptance Criteria\n_PM to fill in_\n\n```yaml\nac_status: needs-ac\n```",
    labels: ["phase: 2-agent", "type: feature", "pkg: desktop", "ac_status: needs-ac", "priority: critical"],
  },
  {
    title: "Implement prompt_room() with Sonnet",
    body: "## Context\nSee `packages/agent/src/functions/prompt-room.ts` stub. Sonnet only — do not use Haiku.\n\n## Acceptance Criteria\n_PM to fill in_\n\n```yaml\nac_status: needs-ac\n```",
    labels: ["phase: 2-agent", "type: feature", "pkg: agent", "ac_status: needs-ac", "priority: critical"],
  },
  {
    title: "Implement Zod validation layer for all LLM outputs",
    body: "## Context\nSee `packages/shared/src/schemas/`. All LLM function outputs must pass Zod validation before entering the game engine.\n\n## Acceptance Criteria\n_PM to fill in_\n\n```yaml\nac_status: needs-ac\n```",
    labels: ["phase: 2-agent", "type: feature", "pkg: shared", "ac_status: needs-ac", "priority: high"],
  },
  {
    title: "Implement compress_player_memory() with Haiku",
    body: "## Context\nSee `packages/agent/src/functions/compress-player-memory.ts` stub.\n\n## Acceptance Criteria\n_PM to fill in_\n\n```yaml\nac_status: needs-ac\n```",
    labels: ["phase: 2-agent", "type: feature", "pkg: agent", "ac_status: needs-ac", "priority: high"],
  },
  {
    title: "Implement character_response() with Haiku",
    body: "## Context\nSee `packages/agent/src/functions/character-response.ts` stub.\n\n## Acceptance Criteria\n_PM to fill in_\n\n```yaml\nac_status: needs-ac\n```",
    labels: ["phase: 2-agent", "type: feature", "pkg: agent", "ac_status: needs-ac"],
  },
  {
    title: "Implement remaining Haiku LLM functions (interaction_result, update_character_state, generate_candidates, select_candidate, player_intent)",
    body: "## Context\nAll in `packages/agent/src/functions/`. See SystemDesign v7 for full function registry.\n\n## Acceptance Criteria\n_PM to fill in_\n\n```yaml\nac_status: needs-ac\n```",
    labels: ["phase: 2-agent", "type: feature", "pkg: agent", "ac_status: needs-ac"],
  },
  {
    title: "Implement generate_room_messages, generate_social_feed, generate_webpage, generate_minigame with Haiku",
    body: "## Context\nAmbient content generation functions. See SystemDesign v7.\n\n## Acceptance Criteria\n_PM to fill in_\n\n```yaml\nac_status: needs-ac\n```",
    labels: ["phase: 2-agent", "type: feature", "pkg: agent", "ac_status: needs-ac"],
  },

  // Phase 3 — Stress
  {
    title: "[EPIC] Phase 3 — Stress Test Depth",
    body: "Parent epic for stress testing: 100-room playthroughs, compression quality, edge cases.",
    labels: ["phase: 3-stress", "type: test", "ac_status: needs-ac"],
  },
  {
    title: "10-room end-to-end playthrough smoke test",
    body: "## Acceptance Criteria\n_PM to fill in_\n\n```yaml\nac_status: needs-ac\n```",
    labels: ["phase: 3-stress", "type: test", "ac_status: needs-ac", "priority: high"],
  },
  {
    title: "100-room automated stress test with memory compression quality audit",
    body: "## Acceptance Criteria\n_PM to fill in_\n\n```yaml\nac_status: needs-ac\n```",
    labels: ["phase: 3-stress", "type: test", "ac_status: needs-ac"],
  },

  // Phase 4 — Polish
  {
    title: "[EPIC] Phase 4 — Polish the Surface",
    body: "Parent epic for renderer, audio, and Steam integration.",
    labels: ["phase: 4-polish", "type: feature", "ac_status: needs-ac"],
  },
  {
    title: "Implement RoomView pixel art renderer (32px, 3/4 top-down)",
    body: "## Context\nSee `packages/renderer/src/components/RoomView.tsx`. Pokémon Gen 1/2 aesthetic.\nAsset source: LPC (`github.com/ElizaWy/LPC`).\n\n## Acceptance Criteria\n_PM to fill in_\n\n```yaml\nac_status: needs-ac\n```",
    labels: ["phase: 4-polish", "type: feature", "pkg: renderer", "ac_status: needs-ac", "priority: high"],
  },
  {
    title: "Implement Web Audio API phoneme bark synthesis",
    body: "## Context\nAnimal Crossing-style phoneme barks. Zero cost, no runtime AI audio.\nSee `docs/LifeSimulator_InteractionSystems_v1.md`.\n\n## Acceptance Criteria\n_PM to fill in_\n\n```yaml\nac_status: needs-ac\n```",
    labels: ["phase: 4-polish", "type: feature", "pkg: renderer", "ac_status: needs-ac"],
  },
  {
    title: "Tauri production build + Steam integration",
    body: "## Acceptance Criteria\n_PM to fill in_\n\n```yaml\nac_status: needs-ac\n```",
    labels: ["phase: 4-polish", "type: infra", "pkg: desktop", "ac_status: needs-ac"],
  },

  // Infra / cross-cutting
  {
    title: "Set up ESLint with package boundary enforcement",
    body: "## Context\nSee `.eslintrc.base.json`. Enforce: renderer/agent/harness can only import from shared.\n\n## Acceptance Criteria\n_PM to fill in_\n\n```yaml\nac_status: needs-ac\n```",
    labels: ["type: infra", "ac_status: needs-ac", "priority: high"],
  },
  {
    title: "Set up GitHub Actions CI (type-check + lint on PR)",
    body: "## Acceptance Criteria\n_PM to fill in_\n\n```yaml\nac_status: needs-ac\n```",
    labels: ["type: infra", "ac_status: needs-ac"],
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 Life Simulator — GitHub setup starting…\n");

  // 1. Create repo (idempotent — skip if exists)
  let repoData;
  try {
    const { data } = await octokit.repos.get({ owner: USERNAME, repo: REPO_NAME });
    repoData = data;
    console.log(`✅  Repo already exists: ${repoData.html_url}`);
  } catch {
    const { data } = await octokit.repos.createForAuthenticatedUser({
      name: REPO_NAME,
      description: "Life Simulator — LLM-driven pixel art life simulation game",
      private: false,
      has_issues: true,
      has_projects: true,
    });
    repoData = data;
    console.log(`✅  Created repo: ${repoData.html_url}`);
  }

  const owner = USERNAME;
  const repo = REPO_NAME;

  // 2. Delete GitHub default labels
  console.log("\n🏷️   Cleaning default labels…");
  const { data: existingLabels } = await octokit.issues.listLabelsForRepo({ owner, repo, per_page: 100 });
  for (const label of existingLabels) {
    try {
      await octokit.issues.deleteLabel({ owner, repo, name: label.name });
    } catch { /* ignore */ }
  }

  // 3. Create labels
  console.log("🏷️   Creating labels…");
  for (const label of LABELS) {
    try {
      await octokit.issues.createLabel({ owner, repo, ...label });
      process.stdout.write(".");
    } catch (e) {
      if (e.status !== 422) throw e; // 422 = already exists
    }
  }
  console.log(" done.");

  // 4. Create milestones
  console.log("\n🎯  Creating milestones…");
  for (const ms of MILESTONES) {
    try {
      await octokit.issues.createMilestone({ owner, repo, ...ms });
      process.stdout.write(".");
    } catch (e) {
      if (e.status !== 422) throw e;
    }
  }
  console.log(" done.");

  // 5. Create issues
  console.log("\n📋  Creating issues…");
  for (const issue of ISSUES) {
    try {
      const { data: created } = await octokit.issues.create({ owner, repo, ...issue });
      process.stdout.write(".");
      // Stagger to avoid secondary rate limit
      await new Promise((r) => setTimeout(r, 200));
      void created;
    } catch (e) {
      console.error(`\n❌  Failed to create issue "${issue.title}": ${e.message}`);
    }
  }
  console.log(" done.");

  // 6. Create GitHub Projects v2 board
  console.log("\n📊  Creating GitHub Projects v2 board…");
  try {
    const { data: user } = await octokit.users.getAuthenticated();
    const { createProjectV2 } = await gql(`
      mutation($ownerId: ID!) {
        createProjectV2(input: {
          ownerId: $ownerId,
          title: "Life Simulator — Development Board"
        }) {
          projectV2 { id url }
        }
      }
    `, { ownerId: user.node_id });
    console.log(`✅  Project board: ${createProjectV2.projectV2.url}`);
  } catch (e) {
    console.warn(`⚠️   Could not create Projects v2 board: ${e.message}`);
    console.warn("    You can create it manually at github.com/${USERNAME}/potential/projects");
  }

  console.log("\n✨  Setup complete!");
  console.log(`\n   Repo:   https://github.com/${USERNAME}/${REPO_NAME}`);
  console.log(`   Issues: https://github.com/${USERNAME}/${REPO_NAME}/issues`);
  console.log("\n   Next steps:");
  console.log("   1. git remote add origin https://github.com/" + USERNAME + "/" + REPO_NAME + ".git");
  console.log("   2. git push -u origin main");
  console.log("   3. Write AC for the first issues you want agents to pick up");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
