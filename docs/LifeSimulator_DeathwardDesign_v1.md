**Life Simulator**

Deathward — Hardship, Decay & Emotion Systems Design

Vitality Field · The Demon · Bids · Behavioral Telemetry · Stubbornness
· Locks & Tests · Promises · Emotion Recipes · Toys & Tools · Obituary

*v1.0 · Companion to System Design Document*

1\. Overview

Lifeward states that every mechanic serves the experience of living
forward. Deathward is its counterweight: **everything not held is being
taken.** Living forward costs, and the cost is paid in the only truly
finite resource the player has — attention.

Without Deathward the game is an improv machine: infinitely agreeable,
therefore tension-free. Deathward is the single principle from which
danger, grief, embarrassment, shame, dread, and meaningful choice are
all derived. It is not an event system, a difficulty slider, or an
antagonist AI. It is a deterministic decay field over every object in
the world, and the player's measured attention is the only force that
opposes it.

> **✅ Decision:** *Deathward stands beside Lifeward as the second
> guiding principle. Every hardship in the game must trace back to the
> decay field — nothing bad happens arbitrarily.*

The design goal expressed as a sentence the player will never read but
will always feel: **you cannot keep everything alive, so every room is
a choice about what to keep.**

2\. The Vitality System

2.1 The Vitality Scalar

Every WorldObject — NPC, item, skill, job, home, relationship — carries
a `vitality` scalar in [0, 1]. Vitality decays deterministically on
every room transition and is restored only by measured player
attention.

> **✅ Decision:** *Vitality decay is pure harness math. The LLM never
> decides what decays, when, or by how much. It only articulates the
> consequences after the fact.*

Decay is applied at the same pipeline stage as compression: player
exits room → telemetry finalized → attention credited → decay applied →
compression runs → candidates generated. The low-vitality list is part
of the context handed to `generate_candidates` and `prompt_room`.

2.2 Decay Constants

Each object type has a base decay rate. Values below are starting
placeholders; real values live in `LifeSimulator_GameConfig_v1.md` and
will be tuned through automated playthrough testing (Section 13).

  ------------------- ------------------ -----------------------------
  **Object Type**     **Decay Rate**     **Rationale**

  Relationship        Fast               People need feeding. The
                                         core Deathward pressure.

  Job / role          Fast               Neglect a job and it ends.

  Skill               Medium             Rusts, doesn't vanish.

  Possession          Slow               Objects wait — but not
                                         forever (theft, loss, decay).

  Home / place        Very slow          Persistent rooms erode last.

  Grudge / shame /    Medium             Burdens decay by the same
  debt-of-honor                          rule. This is the mercy in
                                         the system (see 2.4).
  ------------------- ------------------ -----------------------------

2.3 Attention Credit

Attention is credited from deterministic telemetry only (Section 5):
proximity-time from the heat map, direct interaction, conversation
time, and textual mention (naming an off-screen person in typed input
counts as thinking of them — a small credit). Off-screen entities decay
per room transition; when the generator reintroduces one, its state
must reflect accumulated decay — warmer or colder, closer or moved on.

2.4 Decay Cuts Both Ways

The same scalar governs burdens. An unfed feud dies like an unfed
friendship. NPC memory of the player's failures fades unless refreshed
by new failures. Shame tags in the player's own compressed memory
decay. This is not a separate forgiveness system — it is the identical
rule with the other valence, and it is what keeps Deathward from being
pure misery.

> **✅ Decision:** *One decay rule, both valences. The demon takes what
> you don't hold — including your burdens.*

3\. The Demon

3.1 The Demon Is the Field

The demon is invisible because there is nothing to see. It is not an
agent, has no context window, makes no choices, and costs no tokens.
**The demon is the decay field itself.** A number going down is the
demon. The LLM is only its voice: when vitality crosses a threshold,
room generation receives the fact and articulates it contextually —
the friend who moved away, the guitar that got sold, the skill gone
from your hands, the toy missing from the shelf.

> **✅ Decision:** *The demon is implemented as deterministic decay +
> LLM articulation. No adversary agent, no second context. Whether loss
> comes is arithmetic; how it arrives is generative.*

3.2 Comparative Attention Removal (Persistent Rooms)

Persistent places — the home above all — are where the demon's work is
most visible. Within a persistent room, sibling objects compete: if the
player consistently attends one toy over another, the neglected toy's
vitality falls on comparative attention share, and on crossing the
removal threshold the demon removes it from the room's object registry.
Next time the room renders, the toy is gone. Articulation is
contextual (lost, given away, taken, broken) and age-appropriate.

> **✅ Decision:** *Persistent-room object removal is driven by
> comparative attention share among sibling objects, not absolute
> time. Loving one thing is measurably neglecting its neighbor.*

3.3 Fairness Constraints

The demon must always feel like entropy, never like malice. Hard
rules:

- **Never generic.** The demon does not attack abstract resources
  (money, health bars) when it can take a specific attended thing. It
  targets meaning, and meaning is defined by the attention ledger.
- **Always telegraphed.** Every removal is preceded by at least one
  foreshadowing tell (Section 9) and, for bid-capable objects, at
  least one bid (Section 4). No gotchas.
- **Always traceable.** The player must be able to reconstruct, in
  retrospect, the neglect that caused the loss. Legible in retrospect,
  preventable in prospect.
- **Budgeted.** Total removals per life stage are capped by the
  cruelty curve (Section 13). "Pressure yes, death spiral no" applies
  to Deathward exactly as it applies to the economy.

4\. Bids

4.1 Dying Things Fight Back

A low-vitality entity does not slip away silently — it makes a **bid**
for attention: the friend calls, the parent poses a question, the dog
scratches at the door, the neglected instrument appears in the room
layout one more time. Bids are the game's primary choice generator:
the dramatic content of a room is, in large part, its dying parts
asking to live. (Grounding: Gottman's bids-for-connection research —
relationships die by ignored bids, not by fights.)

Bid mechanics:

- Vitality crossing the bid threshold flags the entity; the generator
  is instructed to stage a bid in an upcoming room.
- A bid has a response window (the room it occurs in).
- Answering the bid restores vitality.
- Ignoring or rejecting the bid applies a decay multiplier — rejection
  cuts deeper than absence.

> **✅ Decision:** *A failed bid triggers automatic removal by the
> demon. The bid is the entity's last chance, and the player was
> shown it. One bid, one window, then the field takes it.*

4.2 The Phone Is the Bid Inbox

Off-screen entities bid asynchronously through the phone: voicemails
and texts waiting when the player next opens it. This makes the phone
the visible surface of the invisible field — missed calls stacking up
*are* the vitality ledger, rendered diegetically. Voicemail handling is
itself telemetry (played, skipped, deleted — all measured, Section 5).

5\. Behavioral Telemetry

All measurement is deterministic — zero LLM cost. Telemetry produces
per-room summaries that feed compression, the attention ledger, the
demon's removal logic, and (open decision, Section 15) nurture stat
drift.

5.1 The Heat Map

> **✅ Decision:** *One position ping per second on the room's 2D grid.
> The integrated map is chunked per room, reduced to a ranked
> proximity summary, and included in compression input.*

Derived spatial measures, all from the same ping stream:

- **Proximity-time per object** — pings within radius r of each
  object's bounds. The attention ledger itself.
- **Stillness runs** — consecutive same-cell pings, and where they
  occur (idle at the window ≠ idle mid-room).
- **Path directness** — displacement ÷ path length. Beeline = intent;
  wandering = browsing or restlessness.
- **First-move latency** — room entry to first input. Hesitation.
- **Exit-hover** — time near the door before leaving. Reluctance vs.
  flight.
- **Coverage** — fraction of walkable cells visited. Explorer vs.
  transient.

5.2 Social Measures

- **Talk-time distribution** across NPCs, and its Gini coefficient —
  concentrated devotion vs. scattered attention as one number.
- **Initiation ratio** — does the player approach people, or only
  respond to bids?
- **Bid response rate and latency** — the core Deathward statistic.
- **Conversation depth** — exchanges before walking away; mid-thread
  abandonment; walking away while an NPC is mid-line.
- **Mid-conversation phone check** — measured, NPC-visible, and a
  relationship decay multiplier.

5.3 Input Measures

- Message length and typing speed.
- Edit/backspace count — hesitation.
- Response latency after an NPC line.
- **Deleted drafts** — text typed, erased, never sent. Only the fact
  and length are recorded, never content. The inner monologue may
  reference that the player almost said something.
- Retry patterns on failed intents (also the confusion signal for the
  diegetic tutorial layer).

5.4 Temporal & Choice Measures

- Room duration vs. the room's generated expected duration.
- **Time-dial usage** — what gets fast-forwarded is revealed avoidance.
- AFK vs. deliberate stillness (distinguishable by context: idle
  mid-conversation vs. idle at the window).
- **Candidate avoidance list** — room options shown repeatedly and
  never taken.
- **Promise ledger** — made, kept, broken, latency (Section 8).
- **Toy/tool preference** — pickup counts and hold time among sibling
  objects; input to comparative removal (3.2).
- **Phone telemetry** — opens per room, scroll depth, dwell per feed
  item, voicemail played/skipped/deleted.

5.5 The Behavioral Fingerprint

Per-room, the measures composite into a handful of indices —
restlessness, hesitation, responsiveness, attention-Gini, avoidance —
serialized as a compact string that rides with the heat map summary
into compression. The fingerprint is how the world "knows" the player
without the LLM ever observing raw telemetry.

6\. NPC Stubbornness — The Disagreeability Dial

Every NPC carries a numeric `disagreeability` parameter, set at
generation and adjustable by relationship state. It is passed to
`character_response`, and Haiku is instructed to refuse, push back,
deflect, or hold its position in proportion to the dial. High
disagreeability means the NPC can simply say no — and mean it.

> **✅ Decision:** *NPC refusal is driven by a per-NPC numeric dial
> passed into character_response. The LLM articulates the refusal; the
> dial determines that refusal happens.*

Stubbornness composes with intent–execution divergence (Section 10.2):
the world can refuse the player from the outside (NPC says no) and
from the inside (their own character can't get the words out).

7\. Walls, Locks & Tests

Some futures require passing a gate, and gates can be failed. The
mechanism is `generate_minigame`: interviews, exams, auditions,
confessions, difficult conversations — staged as procedural minigames
whose difficulty is handicapped by the player's hidden stats.

Rules:

- **No retries.** Open-path means a failed test is not lost progress —
  it is permanent biography. It compresses into the life summary, NPCs
  remember it, and it can appear in the obituary.
- **Failure generates content.** A failed gate must branch the life
  (the story where you didn't get in), never produce a retry screen.
- Locks may be physical (a door, a distance, a cost) or metaphorical
  (a credential, a courage threshold, another person's trust).

8\. Promises

The life-sim replacement for quests. RPG quest furniture (logs,
markers, objectives) is tonally banned.

An NPC poses an ask — a parent's question, a friend's request.
Accepting creates a **Promise WorldObject** with a witness, a subject,
and a deadline. The world tracks it: candidate generation weights it,
foreshadowing references it, its vitality decays like everything
else's, and the demon can stage its collision with other commitments.

- Kept promise: vitality boost to the relationship, entry in the
  ledger.
- Broken promise with witness: embarrassment machinery (Section 10.3).
- Broken promise unwitnessed: shame machinery (Section 10.4).

A promise is a lock the player installs on their own future — the
mechanism by which NPC-posed choices become binding rather than
decorative.

9\. Procedural Foreshadowing — Tells

Because `generate_candidates` produces next-room options before the
player exits, the current room's ambient surfaces
(`generate_room_messages`, `generate_social_feed`,
`generate_webpage`) can carry **tells seeded from the live candidate
set**: the flyer on the wall, the overheard argument, the news item.
Interacting with a tell reweights `select_candidate`.

Tells serve double duty for Deathward: low-vitality entities leak
warnings before loss — missed calls, the friend's feed showing a party
you weren't at, dust rendering on a neglected object. The observant
player reads the vitality field through fiction and feels dread; the
oblivious player gets grief plus retrospective shame, because the
warnings were all there.

> **✅ Decision:** *Ambient surfaces are not decoration. They are the
> candidate set and the vitality field leaking backward into the
> present. Tell legibility is a tuning axis (Section 13).*

10\. Emotion Recipes

Negative emotion is never produced by asking the LLM to write sad or
scary prose — that yields melodrama. Each emotion has structural
preconditions built mechanically; the LLM only articulates situations
that are already genuinely bad.

10.1 Grief = attachment + irreversible loss + persistent absence

Attachment is proven by the attention ledger. Loss is real because
rooms don't revisit and the field removes things permanently. The
third ingredient is the one usually missed: **absence must have
presence.** Lost entities echo through ambient surfaces at decaying
frequency — the name in the feed, the mug on the counter, "she used to
sit there." Tombstoned ObjectRefs are the mechanism: the referential
integrity rule *is* the grief system. The refs we refuse to delete are
the things the world can't stop mentioning.

10.2 Intent–Execution Divergence

The player types the smooth, confident line; the character — whose
hidden confidence stat is low — delivers a mangled version; the NPC
responds to what was said, not what was meant. The player authored
the intended version and watched it fail: that is real, felt
embarrassment. This is the hidden-stat system doing emotional work
while remaining invisible (stats surface through monologue and
outcomes only — never named UI values).

10.3 Embarrassment = failure + audience + propagation

Witnessed failures travel: the social feed is a gossip engine, and the
player meets their own bad moment in other people's mouths. NPCs
reference witnessed failures per their own compressed memories.

10.4 Shame = the private version

No audience required. Compression tags moral failures; the inner
monologue resurfaces them at quiet moments, rooms later, unprompted.
Combined with asymmetric memory — NPC memory compresses independently,
so others remember what the player has forgotten — shame becomes a
pincer: your own head won't drop it, and neither will theirs. Both
sides decay by the field (2.4), so shame too can finally die.

10.5 Dread = telegraphed threat to revealed attachment

Fully covered by tells (9) + bids (4): the player who reads the world
sees loss coming and must choose whether to fight for the thing. Dread
is the anticipation of the field's arithmetic.

11\. Toys & Tools

A new artifact class alongside minigames: **the toy/tool interactable.**

> **✅ Decision:** *Toys teach tools. Childhood toys are the tutorial
> layer for the adult tool interaction grammar — same verbs, same
> input patterns, zero instruction text.*

The blocks teach placement; the toy piano teaches the rhythm verb the
real piano uses; the tricycle teaches the vehicle verb the car uses.
Progression: rattle → blocks → bike → instrument → vehicle → work
tools. Because toys are WorldObjects, they participate fully in
Deathward — comparative attention among toys drives the demon's first
removals, which is also the player's first, gentlest lesson in what
this world does to unattended things.

Tutorial surfacing: when a new capability developmentally unlocks, its
keyboard key is shown on screen with a one-word label. Maximum one new
key per room — acquisition must feel like growth, not a settings
screen.

12\. The Obituary

At death, the obituary is generated from the lifetime vitality ledger
and the compressed chain: what was held longest, what was let go, what
was taken while the player looked away — plus the promise ledger and
the lifetime attention summary. It is the game's score, and it is
different every life.

"He kept his marriage alive for forty-one years and let the piano go
silent."

The obituary is the artifact players will screenshot and share, and
the reason to play another life in the same evening.

13\. Balance & Testing

13.1 The Coverage Ratio and Cruelty Curve

The master balance value is the **coverage ratio**: the fraction of
what the player comes to care about that their total attention budget
can sustain. Target at peak adulthood: roughly 0.6 — enough to keep
what you fight for, never enough to keep everything.

Life-stage shape (initial hypothesis, to be tuned):

- **Childhood** — near 1.0, because parents' attention props the
  child's objects. Corollary: losing a parent means everything they
  were holding begins to decay at once. This emergent mechanic is
  intentional.
- **Adulthood** — peak triage (~0.6).
- **Old age** — below any achievable strategy. The endgame of every
  life is learning to lose well: choosing the last few held things
  deliberately. Death is the field taking the rest.

> **✅ Decision:** *The cruelty curve and all decay constants are
> determined empirically through automated playthrough testing, not
> set by fiat. Placeholders live in GameConfig; the stress harness
> (Phase 3 infrastructure) gains a Deathward audit mode.*

13.2 Deathward Audits

Extend the existing 10-room smoke / 100-room stress infrastructure
with scripted attention policies (devoted, scattered, neglectful,
phone-addicted) and assert on outcomes: loss counts per life stage
within budget, every removal preceded by a tell and (where applicable)
a bid, no death spirals, burdens decaying on schedule, obituary
correctly reflecting the ledger.

13.3 Tell Legibility

The open tuning axis from the foreshadowing system: too obvious reads
as a quest marker, too subtle reads as slot-machine luck. Tune via
playtest alongside the cruelty curve.

14\. Engineering Notes

- **Object & Room Registry.** Deathward requires a canonical registry
  of all live WorldObjects per room (and per persistent place) with
  vitality state, keyed for O(1) attention crediting from the ping
  stream. This overlaps with the pending caching work on persistent
  rooms — the registry is the shared substrate for both. Registry
  lives in the harness (Dexie-persisted, Zustand-projected).
- **Pipeline placement.** Telemetry finalization → attention credit →
  decay application → compression → candidates. Decay math must be
  complete before the low-vitality list enters generation context.
- **Determinism boundary.** All vitality math, telemetry, thresholds,
  removals: harness. All articulation: agent. Same boundary as the
  economy ("the LLM never calculates money") — the LLM never
  calculates decay.
- **Persistent rooms.** Comparative-attention removal (3.2) mutates
  the persistent room's registry between visits; renderer reads the
  registry, so removals appear without special-casing.
- **Package boundaries.** Vitality types, telemetry summary types,
  fingerprint schema, Promise schema: `shared`. No new boundary
  exceptions.

15\. Open Decisions (Michael)

1. **Nurture stat drift.** Should nurture stats drift deterministically
   from the behavioral fingerprint — the character becoming the person
   the player has been playing? Closes the loop between telemetry and
   intent–execution divergence, but changes the meaning of the stat
   system. Proposed, not ratified.
2. **Coverage ratio targets** per life stage (13.1 values are
   hypotheses).
3. **Per-type decay constants** (2.2 table is placeholder ranking
   only).
4. **Bid frequency ceiling** — effectively the game's dramatic pacing.
5. **Promise UI** — do promises surface anywhere (phone note, subtle
   HUD), or live purely in narrative and monologue?
6. **Tell legibility default** — starting point on the
   obvious-to-subtle axis before playtest data exists.
