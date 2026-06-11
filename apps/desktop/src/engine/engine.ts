import {
  GAME_CONFIG,
  babbleize,
  isPreverbal,
  type CharacterRecord,
  type CharacterResponseLLMOutput,
  type Era,
  type HiddenStatBlock,
  type InteractionResultLLMOutput,
  type LifeContext,
  type PlayerIntentLLMOutput,
  type Room,
  type RoomEvent,
  type WorldObject,
} from "@potential/shared";
import {
  clearLife,
  endLife,
  exitRoom,
  getActiveCharacters,
  getCharacter,
  getTailRoom,
  loadLifeContext,
  startLife,
  upsertCharacter,
  type LifeSimDb,
  db as defaultDb,
} from "@potential/harness";
import {
  characterResponse,
  compressPlayerMemory,
  generateCandidates,
  playerIntent,
  promptRoom,
  interactionResult,
  selectCandidate,
  updateCharacterStates,
  type LLMAdapter,
} from "@potential/agent";
import { buildRoom } from "./build-room.js";

/**
 * GameEngine — the orchestration layer. Owns the core causal loop:
 *
 *   Exit Room → Compress → Select N+1 Candidates → Generate N+1 → Enter
 *
 * Lives in the desktop app because it is the only package allowed to import
 * agent + harness together. UI components talk to this, never to the agent.
 */

export interface EngineEvents {
  onMonologue?: (text: string) => void;
  onGenerationPhase?: (phase: string) => void;
}

export class GameEngine {
  currentRoom: Room | null = null;
  context: LifeContext | null = null;
  private roomEntryAt = Date.now();

  constructor(
    readonly adapter: LLMAdapter,
    private readonly db: LifeSimDb = defaultDb,
    private readonly events: EngineEvents = {},
  ) {}

  /** Start a fresh life: wipe, seed, fabricate the birth room. */
  async startNewLife(params: {
    playerName: string;
    birthDate: string;
    era: Era;
    natureStats: HiddenStatBlock;
  }): Promise<Room> {
    this.context = await startLife(params, this.db);
    this.events.onGenerationPhase?.("A life begins…");

    const birthCandidate = {
      concept: "Birth",
      premise: `${params.playerName} is born. A hospital room, bright lights, the first cry. BOTH parents are present as named cast characters — give them names and a warmth or tension that seeds this family's dynamic.`,
      duration: "day" as const,
      weight: 1,
    };
    const output = await promptRoom(this.adapter, this.context, birthCandidate, []);
    const built = buildRoom(output, birthCandidate, this.context, null, []);
    await this.persistUpserts(built.characterUpserts);

    this.currentRoom = built.room;
    this.roomEntryAt = Date.now();
    this.events.onMonologue?.(output.openingMonologue);
    return built.room;
  }

  /**
   * Resume a crashed/closed session. The current room is never persisted
   * (only exited rooms are), so resuming fabricates a fresh current room
   * from the saved LifeContext — consistent with the epistemology: the room
   * you were in no longer exists; only compressed memory does.
   */
  async resumeLife(): Promise<Room> {
    const context = await loadLifeContext(this.db);
    if (context === null || context.deceased) {
      throw new Error("resumeLife: no resumable life");
    }
    this.context = context;
    const tail = await getTailRoom(this.db);

    this.events.onGenerationPhase?.("The world re-forms around you…");
    const { candidates } = await generateCandidates(this.adapter, context);
    const chosen = await selectCandidate(this.adapter, context, candidates);
    const roster = await getActiveCharacters(this.db);
    const output = await promptRoom(this.adapter, context, chosen, roster);
    const built = buildRoom(output, chosen, context, tail, roster);
    await this.persistUpserts(built.characterUpserts);

    this.currentRoom = built.room;
    this.roomEntryAt = Date.now();
    this.events.onMonologue?.(output.openingMonologue);
    return built.room;
  }

  /**
   * The room transition — the heart of the game.
   *
   * Call graph (latency-shaped): compression MUST finish before candidate
   * generation (its output is the freshest selection signal — hard
   * constraint), and candidates → select → prompt_room is an inherent chain.
   * But the silent character updates depend only on the exited room, so they
   * run CONCURRENTLY with the candidate chain instead of in front of it.
   */
  async transition(intentSignal?: string): Promise<Room> {
    const room = this.mustRoom();
    let characterWork: Promise<void> | null = null;

    // 1. Compress and persist the exited room (harness enforces ordering).
    //    Skipped when re-entering after a mid-flight failure: the exit is
    //    already persisted, so the retry resumes at candidate generation.
    if (room.summary === null && room.exitedAt === null) {
      this.events.onGenerationPhase?.("The moment settles into memory…");
      // Character updates describe the room being exited, so they take the
      // PRE-exit context and launch immediately — overlapping compression
      // AND the candidate chain. They are awaited before the roster read.
      const preExitContext = this.mustContext();
      characterWork = this.applyCharacterUpdates(room, preExitContext);
      const { exitedRoom, updatedContext } = await exitRoom(
        room,
        preExitContext,
        (r, c) => compressPlayerMemory(this.adapter, r, c),
        this.db,
      );
      this.currentRoom = exitedRoom;
      this.context = updatedContext;
    }
    const context = this.mustContext();

    // 2. Death check — the world decides, the engine enforces.
    if (context.health <= 0) {
      this.context = await endLife("their body gave out", this.db);
      throw new LifeEndedError("Health reached zero", this.context);
    }

    // 3. Candidates → selection, with character updates riding alongside.
    this.events.onGenerationPhase?.("Possible futures take shape…");
    const selectionWork = generateCandidates(this.adapter, context, intentSignal).then(
      ({ candidates }) => selectCandidate(this.adapter, context, candidates),
    );
    const [chosen] = await Promise.all([selectionWork, characterWork ?? Promise.resolve()]);

    // 4. Fabrication — roster read AFTER character updates persist.
    this.events.onGenerationPhase?.("The next room assembles itself…");
    const roster = await getActiveCharacters(this.db);
    const output = await promptRoom(this.adapter, context, chosen, roster);
    const built = buildRoom(output, chosen, context, this.mustRoom(), roster);
    await this.persistUpserts(built.characterUpserts);

    this.currentRoom = built.room;
    this.roomEntryAt = Date.now();
    this.events.onMonologue?.(output.openingMonologue);
    return built.room;
  }

  /**
   * Silent post-room character updates. Non-fatal by design: a failure here
   * means stale emotional states that self-correct next room, never an
   * aborted transition (also keeps Promise.all from leaking a rejection
   * when the selection chain throws first).
   */
  private async applyCharacterUpdates(room: Room, context: LifeContext): Promise<void> {
    try {
      const present = await this.presentCharacters(room);
      if (present.length === 0) return;
      const { updates } = await updateCharacterStates(this.adapter, context, room, present);
      for (const update of updates) {
        const match = present.find((c) => c.name.toLowerCase() === update.name.toLowerCase());
        if (match === undefined) continue;
        await upsertCharacter(
          {
            ...match,
            emotionalState: update.emotionalState,
            intent: update.intent,
            affection: this.guardAffection(match, update.affection, context),
          },
          this.db,
        );
      }
    } catch {
      // Degrade gracefully — see doc comment.
    }
  }

  /** Free-text player input → structured intent. */
  async classifyInput(text: string): Promise<PlayerIntentLLMOutput> {
    return playerIntent(this.adapter, this.mustContext(), this.mustRoom(), text);
  }

  /**
   * Talk to an NPC in the current room. Below the speech age, the model
   * receives the INTENDED words, renders them as babble that phonetically
   * echoes the intent ("mama" comes out nearly right), and the character
   * responds to what they hear — never the meaning. The local babbleize is
   * the fallback when the model omits the field (e.g. MockAdapter).
   * `spokenText` is what got said; callers display it, not the input.
   */
  async talkTo(
    object: WorldObject,
    playerText: string,
    history: { speaker: "player" | "character"; text: string }[] = [],
  ): Promise<{ response: CharacterResponseLLMOutput; character: CharacterRecord; spokenText: string }> {
    const context = this.mustContext();
    if (object.characterId === undefined) {
      throw new Error(`talkTo: "${object.label}" is not a character`);
    }
    const character = await getCharacter(object.characterId, this.db);
    if (character === null) {
      throw new Error(`talkTo: character "${object.label}" missing from roster`);
    }

    const response = await characterResponse(this.adapter, context, character, playerText, history);
    const spokenText = isPreverbal(context.playerAgeYears)
      ? (response.spokenBabble ?? babbleize(playerText, context.playerAgeYears))
      : playerText;

    if (response.affectionDeltas !== undefined) {
      const next = { ...character.affection };
      for (const [key, delta] of Object.entries(response.affectionDeltas)) {
        const field = key as keyof typeof next;
        next[field] = clamp01(next[field] + (delta ?? 0));
      }
      await upsertCharacter(
        {
          ...character,
          affection: this.guardAffection(character, next, context),
          emotionalState: response.mood,
        },
        this.db,
      );
    }

    this.recordEvent({
      type: "dialogue",
      description: `Spoke with ${character.name}`,
      playerChoice: spokenText.slice(0, 200),
      outcome: response.dialogue,
      characterIds: [character.id],
    });
    return { response, character, spokenText };
  }

  /** Interact with an object in the current room. */
  async interactWith(object: WorldObject, action: string): Promise<InteractionResultLLMOutput> {
    const context = this.mustContext();
    const room = this.mustRoom();
    const result = await interactionResult(this.adapter, context, room, object, action);

    if (result.statDeltas !== undefined) {
      this.context = {
        ...context,
        hunger: clamp01(context.hunger + (result.statDeltas.hunger ?? 0)),
        health: clamp01(context.health + (result.statDeltas.health ?? 0)),
        money: Math.max(
          GAME_CONFIG.economy.debtFloor,
          context.money + (result.statDeltas.money ?? 0),
        ),
      };
    }
    if (result.behavioralTags !== undefined && result.behavioralTags.length > 0) {
      const merged = new Set([...this.mustContext().behavioralPatterns, ...result.behavioralTags]);
      this.context = { ...this.mustContext(), behavioralPatterns: [...merged] };
    }

    this.recordEvent({
      type: "interaction",
      description: `${action} ${object.label}`,
      playerChoice: action,
      outcome: result.outcome,
      characterIds: [],
    });
    if (result.monologue !== undefined) this.events.onMonologue?.(result.monologue);
    return result;
  }

  /** Append an event to the current room's log. */
  recordEvent(event: Omit<RoomEvent, "id" | "atMs">): void {
    const room = this.mustRoom();
    room.events.push({
      ...event,
      id: crypto.randomUUID(),
      atMs: Date.now() - this.roomEntryAt,
    });
  }

  /** Abandon the current life entirely (new game). */
  async reset(): Promise<void> {
    await clearLife(this.db);
    this.currentRoom = null;
    this.context = null;
  }

  private async presentCharacters(room: Room): Promise<CharacterRecord[]> {
    const records: CharacterRecord[] = [];
    for (const object of room.objects.values()) {
      if (object.characterId === undefined) continue;
      const record = await getCharacter(object.characterId, this.db);
      if (record !== null) records.push(record);
    }
    return records;
  }

  /**
   * Harness-level state guard (security Layer 4): romantic affection between
   * an adult and a minor is locked at 0 regardless of what the LLM proposed.
   */
  private guardAffection(
    character: CharacterRecord,
    proposed: CharacterRecord["affection"],
    context: LifeContext,
  ): CharacterRecord["affection"] {
    const minorThreshold = GAME_CONFIG.contentSafety.minorAgeThreshold;
    const adultMinorPair =
      (character.age < minorThreshold && context.playerAgeYears >= minorThreshold) ||
      (character.age >= minorThreshold && context.playerAgeYears < minorThreshold);
    if (!adultMinorPair) return proposed;
    return { ...proposed, attraction: 0, intimacy: Math.min(proposed.intimacy, 0.3) };
  }

  private async persistUpserts(records: CharacterRecord[]): Promise<void> {
    for (const record of records) {
      await upsertCharacter(record, this.db);
    }
  }

  private mustRoom(): Room {
    if (this.currentRoom === null) throw new Error("No current room — start a life first");
    return this.currentRoom;
  }

  private mustContext(): LifeContext {
    if (this.context === null) throw new Error("No life context — start a life first");
    return this.context;
  }
}

export class LifeEndedError extends Error {
  constructor(
    message: string,
    public readonly finalContext: LifeContext,
  ) {
    super(message);
    this.name = "LifeEndedError";
  }
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
