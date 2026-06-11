import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ASSET_CATALOG,
  GAME_CONFIG,
  babbleize,
  isPreverbal,
  sanitizeName,
  type Era,
  type LifeContext,
  type Room,
  type SocialFeedLLMOutput,
  type WorldObject,
} from "@potential/shared";
import { hasResumableLife } from "@potential/harness";
import {
  AnthropicAdapter,
  MockAdapter,
  clearApiKey,
  generateSocialFeed,
  loadApiKey,
  saveApiKey,
  validateApiKey,
  type LLMAdapter,
} from "@potential/agent";
import {
  DialogueBox,
  MonologueTicker,
  PromptInput,
  RoomCanvas,
  StatBar,
  buttonStyle,
  loadAtlas,
  objectFootprints,
  playBark,
  playObjectCue,
  type SpriteAtlas,
} from "@potential/renderer";
import { GameEngine, LifeEndedError } from "./engine/engine.js";

// Renderer stays decoupled from the catalog; the app feeds it footprints.
for (const asset of ASSET_CATALOG) {
  if (asset.kind === "object") objectFootprints.set(asset.id, { w: asset.w, h: asset.h });
}

type Screen =
  | { kind: "boot" }
  | { kind: "byok"; error?: string; busy?: boolean }
  | { kind: "menu"; resumable: boolean }
  | { kind: "newlife" }
  | { kind: "playing" }
  | { kind: "dead"; context: LifeContext };

type BottomMode =
  | { kind: "explore" }
  | { kind: "dialogue"; speaker: string | null; text: string; then: BottomMode; voice: string }
  | { kind: "converse"; npc: WorldObject; history: { speaker: "player" | "character"; text: string }[] }
  | { kind: "input"; purpose: "speak" | "think" };

export default function App(): JSX.Element {
  const [screen, setScreen] = useState<Screen>({ kind: "boot" });
  const [atlas, setAtlas] = useState<SpriteAtlas | null>(null);
  const [adapterKind, setAdapterKind] = useState<"real" | "mock" | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [context, setContext] = useState<LifeContext | null>(null);
  const [monologue, setMonologue] = useState<string[]>([]);
  const [bottom, setBottom] = useState<BottomMode>({ kind: "explore" });
  const [target, setTarget] = useState<WorldObject | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [phone, setPhone] = useState<SocialFeedLLMOutput | null | "loading">(null);
  const engineRef = useRef<GameEngine | null>(null);

  const pushMonologue = useCallback((text: string) => {
    setMonologue((m) => [...m.slice(-30), text]);
  }, []);

  // Boot: load atlas, check for key.
  useEffect(() => {
    void (async () => {
      const loaded = await loadAtlas("/sprites/atlas.png", "/sprites/atlas.json");
      setAtlas(loaded);
      if (loadApiKey() !== null) {
        setAdapterKind("real");
        setScreen({ kind: "menu", resumable: await hasResumableLife() });
      } else {
        setScreen({ kind: "byok" });
      }
    })();
  }, []);

  const makeEngine = useCallback(
    (kind: "real" | "mock"): GameEngine => {
      const adapter: LLMAdapter =
        kind === "real" ? new AnthropicAdapter(loadApiKey() ?? "") : new MockAdapter();
      const engine = new GameEngine(adapter, undefined, {
        onMonologue: pushMonologue,
        onGenerationPhase: (phase) => { setGenerating(phase); },
      });
      engineRef.current = engine;
      if (import.meta.env.DEV) {
        // Dev/test hook: lets browser automation drive the engine directly.
        (window as unknown as Record<string, unknown>)["__potential"] = { engine };
      }
      return engine;
    },
    [pushMonologue],
  );

  const syncFromEngine = useCallback(() => {
    const engine = engineRef.current;
    if (engine === null) return;
    setRoom(engine.currentRoom);
    setContext(engine.context);
  }, []);

  const runGenerating = useCallback(
    async (work: () => Promise<unknown>) => {
      setGenerating("…");
      try {
        await work();
        syncFromEngine();
        // Open each room on its story beat — the situation is the plot.
        const situation = engineRef.current?.currentRoom?.situation;
        setBottom(
          situation !== undefined && situation.length > 0
            ? { kind: "dialogue", speaker: null, text: situation, then: { kind: "explore" }, voice: "" }
            : { kind: "explore" },
        );
      } catch (error) {
        if (error instanceof LifeEndedError) {
          setScreen({ kind: "dead", context: error.finalContext });
        } else {
          pushMonologue(`Something went wrong: ${error instanceof Error ? error.message : "unknown"}. Walk right to try again.`);
          // Remount the canvas with a fresh room reference so exit detection
          // rearms — engine.transition resumes from where it failed.
          const current = engineRef.current?.currentRoom;
          if (current !== null && current !== undefined) setRoom({ ...current });
          setContext(engineRef.current?.context ?? null);
        }
      } finally {
        setGenerating(null);
      }
    },
    [pushMonologue, syncFromEngine],
  );

  // ── screens ──────────────────────────────────────────────────────────

  if (screen.kind === "boot" || atlas === null) {
    return <Shell><Center>Loading…</Center></Shell>;
  }

  if (screen.kind === "byok") {
    return (
      <Shell>
        <ByokScreen
          error={screen.error}
          busy={screen.busy === true}
          onSubmit={(key) => {
            void (async () => {
              setScreen({ kind: "byok", busy: true });
              const result = await validateApiKey(key);
              if (!result.ok) {
                setScreen({ kind: "byok", error: result.error ?? "Validation failed" });
                return;
              }
              saveApiKey(key);
              setAdapterKind("real");
              setScreen({ kind: "menu", resumable: await hasResumableLife() });
            })();
          }}
          onDemo={() => {
            void (async () => {
              setAdapterKind("mock");
              setScreen({ kind: "menu", resumable: await hasResumableLife() });
            })();
          }}
        />
      </Shell>
    );
  }

  if (screen.kind === "menu") {
    return (
      <Shell>
        <Center>
          <h1 style={{ fontFamily: "'Courier New', monospace", letterSpacing: 2 }}>LIFE SIMULATOR</h1>
          <p style={{ color: "#8d889f", maxWidth: 420, textAlign: "center" }}>
            Live many short lives. Only the current room exists.
            {adapterKind === "mock" ? " (demo mode — canned world, no API key)" : ""}
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <button style={bigButton} onClick={() => { setScreen({ kind: "newlife" }); }}>
              New Life
            </button>
            {screen.resumable && (
              <button
                style={bigButton}
                onClick={() => {
                  setScreen({ kind: "playing" });
                  const engine = makeEngine(adapterKind ?? "mock");
                  void runGenerating(() => engine.resumeLife());
                }}
              >
                Resume
              </button>
            )}
            <button
              style={{ ...bigButton, opacity: 0.7 }}
              onClick={() => {
                clearApiKey();
                setAdapterKind(null);
                setScreen({ kind: "byok" });
              }}
            >
              API Key
            </button>
          </div>
        </Center>
      </Shell>
    );
  }

  if (screen.kind === "newlife") {
    return (
      <Shell>
        <NewLifeScreen
          onStart={(name, era, birthYear) => {
            setScreen({ kind: "playing" });
            setMonologue([]);
            const engine = makeEngine(adapterKind ?? "mock");
            void runGenerating(() =>
              engine.startNewLife({
                playerName: name,
                birthDate: `${String(birthYear)}-06-15`,
                era,
                natureStats: randomNature(),
              }),
            );
          }}
        />
      </Shell>
    );
  }

  if (screen.kind === "dead") {
    const ended = screen.context;
    return (
      <Shell>
        <Center>
          <h2 style={{ fontFamily: "'Courier New', monospace" }}>
            {ended.playerName} — {ended.birthDate.slice(0, 4)}–{ended.worldDate.slice(0, 4)}
          </h2>
          <p style={{ color: "#8d889f" }}>
            Died at {Math.floor(ended.playerAgeYears)}, {ended.causeOfDeath ?? "of unknown causes"}.
          </p>
          <div style={{ maxWidth: 520, maxHeight: "40vh", overflowY: "auto", margin: "12px 0" }}>
            {ended.lifeEvents.map((e) => (
              <p key={e.roomId} style={{ color: "#bdb8d0", fontFamily: "'Courier New', monospace", fontSize: 14 }}>
                [{Math.floor(e.playerAgeYears)}] {e.narrative}
              </p>
            ))}
          </div>
          <button
            style={bigButton}
            onClick={() => {
              void (async () => {
                await engineRef.current?.reset();
                setRoom(null);
                setContext(null);
                setScreen({ kind: "menu", resumable: false });
              })();
            }}
          >
            Live Again
          </button>
        </Center>
      </Shell>
    );
  }

  // ── playing ──────────────────────────────────────────────────────────

  const engine = engineRef.current;
  const paused = bottom.kind !== "explore" || generating !== null || phone !== null;

  const handleInteract = (object: WorldObject): void => {
    if (engine === null || paused) return;
    if (object.characterId !== undefined) {
      setBottom({ kind: "converse", npc: object, history: [] });
      return;
    }
    playObjectCue(object.audio, object.label);
    const interaction = object.interaction;
    if (interaction?.text !== undefined && interaction.type === "examine") {
      // Examine with canned text: free, instant, no LLM call.
      engine.recordEvent({
        type: "interaction",
        description: `Examined ${object.label}`,
        playerChoice: "examine",
        outcome: interaction.text,
        characterIds: [],
      });
      setBottom({ kind: "dialogue", speaker: null, text: interaction.text, then: { kind: "explore" }, voice: "" });
      return;
    }
    void (async () => {
      setGenerating("…");
      try {
        const result = await engine.interactWith(object, interaction?.type ?? "use");
        syncFromEngine();
        setBottom({ kind: "dialogue", speaker: null, text: result.outcome, then: { kind: "explore" }, voice: "" });
      } catch (error) {
        pushMonologue(`(${error instanceof Error ? error.message : "the world hiccuped"})`);
      } finally {
        setGenerating(null);
      }
    })();
  };

  const handleConversationLine = (npc: WorldObject, history: { speaker: "player" | "character"; text: string }[], line: string): void => {
    if (engine === null) return;
    void (async () => {
      setGenerating("…");
      try {
        const { response, character, spokenText } = await engine.talkTo(npc, line, history);
        if (spokenText !== line) pushMonologue(`What you meant: "${line}". What came out: "${spokenText}"`);
        syncFromEngine();
        const newHistory = [
          ...history,
          { speaker: "player" as const, text: spokenText },
          { speaker: "character" as const, text: response.dialogue },
        ];
        playBark(response.dialogue, character.name);
        setBottom({
          kind: "dialogue",
          speaker: character.name,
          text: response.dialogue,
          voice: character.name,
          then: response.endsConversation
            ? { kind: "explore" }
            : { kind: "converse", npc, history: newHistory },
        });
      } catch (error) {
        pushMonologue(`(${error instanceof Error ? error.message : "they didn't hear you"})`);
        setBottom({ kind: "explore" });
      } finally {
        setGenerating(null);
      }
    })();
  };

  const handleFreeText = (purpose: "speak" | "think", text: string): void => {
    if (engine === null) return;
    if (purpose === "think") {
      engine.recordEvent({
        type: "thought",
        description: "A private thought",
        playerChoice: text.slice(0, 200),
        outcome: "",
        characterIds: [],
      });
      pushMonologue(text);
      setBottom({ kind: "explore" });
      return;
    }
    // Pre-verbal: the words don't exist yet. No intent to classify — the
    // babble just hangs in the air (talking AT someone goes through [E]).
    const age = engine.context?.playerAgeYears ?? Infinity;
    if (isPreverbal(age)) {
      const babble = babbleize(text, age);
      engine.recordEvent({
        type: "speech",
        description: "Babbled aloud",
        playerChoice: babble.slice(0, 200),
        outcome: "",
        characterIds: [],
      });
      pushMonologue(`You try to say it. What comes out: "${babble}"`);
      setBottom({ kind: "explore" });
      return;
    }
    void (async () => {
      setGenerating("…");
      try {
        const intent = await engine.classifyInput(text);
        syncFromEngine();
        if (intent.intent === "talk" && room !== null) {
          const npc =
            [...room.objects.values()].find(
              (o) => o.characterId !== undefined && o.label.toLowerCase() === intent.targetLabel?.toLowerCase(),
            ) ?? [...room.objects.values()].find((o) => o.characterId !== undefined);
          if (npc !== undefined) {
            handleConversationLine(npc, [], intent.utterance ?? text);
            return;
          }
        }
        if (intent.intent === "leave") {
          pushMonologue("Time to go.");
          setBottom({ kind: "explore" });
          void runGenerating(() => engine.transition(text));
          return;
        }
        engine.recordEvent({
          type: "speech",
          description: "Said aloud",
          playerChoice: text.slice(0, 200),
          outcome: "The words hang in the air.",
          characterIds: [],
        });
        pushMonologue(`You say it out loud: "${text}"`);
        setBottom({ kind: "explore" });
      } catch (error) {
        pushMonologue(`(${error instanceof Error ? error.message : "the thought slipped away"})`);
        setBottom({ kind: "explore" });
      } finally {
        setGenerating(null);
      }
    })();
  };

  const openPhone = (): void => {
    if (engine === null || engine.context === null) return;
    setPhone("loading");
    void (async () => {
      try {
        const roster = [...(room?.objects.values() ?? [])]
          .filter((o) => o.characterId !== undefined)
          .map((o) => o.label);
        const feed = await generateSocialFeed(engine.adapter, engine.context as LifeContext, roster);
        setPhone(feed);
      } catch {
        setPhone({ posts: [{ authorName: "System", text: "No signal.", likes: 0, postedAgo: "now" }] });
      }
    })();
  };

  return (
    <Shell>
      {/* top band */}
      <div style={{ display: "flex", alignItems: "center", height: "8%", minHeight: 40, background: "#16141f", borderBottom: "2px solid #23213a" }}>
        <MonologueTicker entries={monologue} />
        {context !== null && (
          <div style={{ display: "flex", gap: 12, padding: "0 12px" }}>
            <span style={{ color: "#8d889f", fontFamily: "monospace", fontSize: 12 }}>
              {context.playerName} · {Math.floor(context.playerAgeYears)}y · ${Math.round(context.money)} · {context.worldDate}
            </span>
            <StatBar value={context.health} color="#c54e44" label="HP" />
            <StatBar value={context.hunger} color="#5d9e4c" label="F" />
          </div>
        )}
      </div>

      {/* viewport */}
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        {room !== null && (
          <RoomCanvas
            room={room}
            atlas={atlas}
            playerAssetId={playerAsset(context?.playerAgeYears ?? 30)}
            paused={paused}
            onInteract={handleInteract}
            onExit={() => {
              if (engine !== null && generating === null) void runGenerating(() => engine.transition());
            }}
            onTargetChange={setTarget}
          />
        )}
        {room !== null && (
          <div style={{ position: "absolute", top: 8, left: 10, color: "#f2f2ee", fontFamily: "'Courier New', monospace", fontSize: 13, textShadow: "1px 1px 0 #16141f" }}>
            {room.label}
          </div>
        )}
        {generating !== null && (
          <div style={overlayStyle}>
            <div style={{ textAlign: "center" }}>
              <div className="spin" style={{ fontSize: 26 }}>◐</div>
              <p style={{ fontFamily: "'Courier New', monospace", fontStyle: "italic" }}>{generating}</p>
            </div>
          </div>
        )}
        {phone !== null && (
          <PhoneOverlay feed={phone} onClose={() => { setPhone(null); }} />
        )}
      </div>

      {/* bottom band */}
      <div style={{ minHeight: 84, padding: 10, background: "#16141f", borderTop: "2px solid #23213a" }}>
        {bottom.kind === "dialogue" && (
          <DialogueBox
            speaker={bottom.speaker}
            text={bottom.text}
            onAdvance={() => { setBottom(bottom.then); }}
          />
        )}
        {bottom.kind === "converse" && (
          <PromptInput
            placeholder={
              isPreverbal(context?.playerAgeYears ?? Infinity)
                ? `Try to talk to ${bottom.npc.label}… it will come out as baby talk (Esc to walk away)`
                : `Say something to ${bottom.npc.label}… (Esc to walk away)`
            }
            onSubmit={(text) => { handleConversationLine(bottom.npc, bottom.history, text); }}
            onCancel={() => { setBottom({ kind: "explore" }); }}
          />
        )}
        {bottom.kind === "input" && (
          <PromptInput
            placeholder={
              bottom.purpose === "think"
                ? "What's on your mind…"
                : isPreverbal(context?.playerAgeYears ?? Infinity)
                  ? "Try to say it… (you can't talk yet)"
                  : "Say it out loud…"
            }
            onSubmit={(text) => { handleFreeText(bottom.purpose, text); }}
            onCancel={() => { setBottom({ kind: "explore" }); }}
          />
        )}
        {bottom.kind === "explore" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "'Courier New', monospace", fontSize: 13, color: "#8d889f" }}>
            <span style={{ flex: 1 }}>
              {target !== null
                ? `[E] ${target.characterId !== undefined ? "Talk to" : target.interaction?.type === "examine" ? "Examine" : "Use"} ${target.label}`
                : "WASD/arrows to move · walk right to move on with life"}
            </span>
            <button style={buttonStyle} onClick={() => { setBottom({ kind: "input", purpose: "think" }); }}>
              Think [T]
            </button>
            <button style={buttonStyle} onClick={() => { setBottom({ kind: "input", purpose: "speak" }); }}>
              Speak [Y]
            </button>
            <button style={buttonStyle} onClick={openPhone}>
              Phone [P]
            </button>
          </div>
        )}
      </div>
      <ExploreHotkeys
        active={bottom.kind === "explore" && generating === null && phone === null}
        onThink={() => { setBottom({ kind: "input", purpose: "think" }); }}
        onSpeak={() => { setBottom({ kind: "input", purpose: "speak" }); }}
        onPhone={openPhone}
      />
    </Shell>
  );
}

// ── helper components ───────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        background: "#0e0d14",
        color: "#f2f2ee",
      }}
    >
      {children}
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
      {children}
    </div>
  );
}

function ByokScreen({
  error,
  busy,
  onSubmit,
  onDemo,
}: {
  error?: string | undefined;
  busy: boolean;
  onSubmit: (key: string) => void;
  onDemo: () => void;
}): JSX.Element {
  const [key, setKey] = useState("");
  return (
    <Center>
      <h1 style={{ fontFamily: "'Courier New', monospace", letterSpacing: 2 }}>LIFE SIMULATOR</h1>
      <p style={{ color: "#8d889f", maxWidth: 460, textAlign: "center" }}>
        This game runs on your own Anthropic API key. It never leaves this device. Get one at
        console.anthropic.com — a full life costs roughly $1.50–6 in API usage.
      </p>
      <input
        type="password"
        value={key}
        placeholder="sk-ant-…"
        onChange={(e) => { setKey(e.target.value); }}
        style={{
          width: 380,
          background: "#16141f",
          color: "#f2f2ee",
          border: "3px solid #f2f2ee",
          borderRadius: 6,
          padding: "10px 12px",
          fontFamily: "monospace",
        }}
      />
      {error !== undefined && <p style={{ color: "#c54e44", maxWidth: 420, textAlign: "center" }}>{error}</p>}
      <div style={{ display: "flex", gap: 12 }}>
        <button style={bigButton} disabled={busy} onClick={() => { onSubmit(key); }}>
          {busy ? "Checking…" : "Save Key"}
        </button>
        <button style={{ ...bigButton, opacity: 0.7 }} onClick={onDemo}>
          Demo Mode (no key)
        </button>
      </div>
    </Center>
  );
}

function NewLifeScreen({ onStart }: { onStart: (name: string, era: Era, birthYear: number) => void }): JSX.Element {
  const [name, setName] = useState("");
  const [eraChoice, setEraChoice] = useState<"industrial" | "modern" | "near-future">("modern");
  const years = useMemo(() => ({ industrial: 1885, modern: 1985, "near-future": 2042 }), []);
  return (
    <Center>
      <h2 style={{ fontFamily: "'Courier New', monospace" }}>A new life</h2>
      <input
        value={name}
        placeholder="Name"
        maxLength={GAME_CONFIG.contentSafety.maxNameChars}
        onChange={(e) => { setName(e.target.value); }}
        style={{
          width: 280,
          background: "#16141f",
          color: "#f2f2ee",
          border: "3px solid #f2f2ee",
          borderRadius: 6,
          padding: "10px 12px",
          fontFamily: "'Courier New', monospace",
        }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        {(["industrial", "modern", "near-future"] as const).map((era) => (
          <button
            key={era}
            style={{ ...buttonStyle, background: era === eraChoice ? "#4f74b3" : "#2b2940" }}
            onClick={() => { setEraChoice(era); }}
          >
            {era} ({years[era]})
          </button>
        ))}
      </div>
      <button
        style={bigButton}
        onClick={() => {
          const clean = sanitizeName(name);
          if (clean.length > 0) onStart(clean, eraChoice, years[eraChoice]);
        }}
      >
        Be Born
      </button>
    </Center>
  );
}

function PhoneOverlay({
  feed,
  onClose,
}: {
  feed: SocialFeedLLMOutput | "loading";
  onClose: () => void;
}): JSX.Element {
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div
        onClick={(e) => { e.stopPropagation(); }}
        style={{
          width: "min(40%, 360px)",
          height: "76%",
          background: "#1b1926",
          border: "3px solid #f2f2ee",
          outline: "3px solid #23213a",
          borderRadius: 18,
          padding: 14,
          overflowY: "auto",
          fontFamily: "'Courier New', monospace",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <strong>Feed</strong>
          <button style={buttonStyle} onClick={onClose}>✕</button>
        </div>
        {feed === "loading" ? (
          <p style={{ color: "#8d889f" }}>Loading…</p>
        ) : (
          feed.posts.map((post, i) => (
            <div key={i} style={{ borderBottom: "1px solid #2b2940", padding: "8px 0" }}>
              <strong style={{ fontSize: 13 }}>{post.authorName}</strong>
              <span style={{ color: "#8d889f", fontSize: 11 }}> · {post.postedAgo}</span>
              <p style={{ margin: "4px 0", fontSize: 13 }}>{post.text}</p>
              <span style={{ color: "#8d889f", fontSize: 11 }}>♥ {post.likes}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ExploreHotkeys({
  active,
  onThink,
  onSpeak,
  onPhone,
}: {
  active: boolean;
  onThink: () => void;
  onSpeak: () => void;
  onPhone: () => void;
}): JSX.Element | null {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "t") onThink();
      if (e.key === "y") onSpeak();
      if (e.key === "p") onPhone();
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); };
  }, [active, onThink, onSpeak, onPhone]);
  return null;
}

// ── helpers ─────────────────────────────────────────────────────────────

function playerAsset(age: number): string {
  if (age < 1) return "chr_baby";
  if (age < 4) return "chr_toddler";
  if (age < 13) return "chr_child";
  if (age < 18) return "chr_teen";
  if (age < 45) return "chr_adult_casual";
  if (age < 62) return "chr_middle_aged";
  return "chr_senior";
}

function randomNature(): { curiosity: number; resilience: number; empathy: number; ambition: number; creativity: number } {
  const roll = (): number => 20 + Math.floor(Math.random() * 61);
  return { curiosity: roll(), resilience: roll(), empathy: roll(), ambition: roll(), creativity: roll() };
}

const bigButton: React.CSSProperties = {
  ...buttonStyle,
  fontSize: 16,
  padding: "10px 22px",
};

const overlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "rgba(14, 13, 20, 0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10,
};
