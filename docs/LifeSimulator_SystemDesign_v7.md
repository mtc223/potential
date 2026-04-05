**Life Simulator**

System Design Document

*v7.0*

**Companion Documents**

Asset Taxonomy & Room Generation Reference

Production Document

Content Guardrails Document

Security Design Document

NPC Design Document

Interaction Systems Document

Room Design Document

Game Configuration Reference

Economy & Life Progression Design

1\. Concept

A Pokemon-aesthetic life simulator where the player inhabits a
procedurally generated world from birth to death. The world is built
room by room, each representing a moment or era of life. An LLM
generates each room based on accumulated life context, creating a
narrative uniquely shaped by every choice the player makes.

The game opens with a cinematic sequence: two characters meet. The
player watches their parents' first interaction unfold --- their
chemistry, their tension, their affection. This origin scene seeds the
player's nature stats and establishes the emotional foundation of the
life to come. Then the screen opens to a hospital room. The player's
first and only action is to cry.

The game is best understood as a world harness. The harness maintains
state, enforces consequences, and presents the agent with a coherent
world to act in. The LLM is the agent actively constructing that world
moment to moment --- but always within the harness. The harness is what
gives the construction meaning. Consequences and depth are not
individually designed features --- they are emergent properties of the
harness being internally consistent.

1.1 Design Philosophy: Lifeward

The guiding philosophy of Life Simulator is **Lifeward** --- forward
motion, inevitability, momentum toward something. Every design decision
is filtered through this principle.

The philosophical foundation: the player's current room is the boundary
of observable reality. Other rooms do not exist until the player enters
them. Characters do not have lives when the player is not looking ---
they have compressed memories that imply lives, which is exactly how we
reconstruct other people's existence from signals in reality. The linked
list is not a history of traversed locations --- it is the only proof
anything happened. The compression system is not just an optimization
--- it is the epistemology of the game.

When in doubt on any ambiguous design decision, ask: does this respect
the principle that only the current room exists? Does this move
lifeward?

1.2 Many Lives

The value of this game is not putting everything into one life --- it is
living as many lives as you can. Each playthrough is a complete human
existence, designed to be experienced in 1-3 hours. You play, you die,
you watch the ghost mode memorial, you start again as someone entirely
different. The depth comes from breadth --- ten different lives reveal
more about the human condition than one optimized life ever could.

The game is designed for replayability at every level: random parent
generation seeds different nature stats, different eras produce
different worlds, different choices cascade into different lives.
Milestones persist across playthroughs, rewarding exploration of the
full possibility space.

1.3 The Identity Contract

Within a single playthrough, the player is one person. They live one
life. This constraint is non-negotiable and is the source of each life's
emotional weight. There is no consciousness switching, no character
hopping, no second chances except through checkpoint saves. Death is
final within a playthrough. Relationships matter because you cannot
become someone else. Time matters because you cannot go back.

2\. Visual Style

> **✅ Decision:** *Pokemon Gen 1/2 aesthetic --- 32px, 3/4 top-down \>
> orthographic*
>
> *Rooms are tile-based, top-down perspective, consistent with classic
> Pokemon room layouts.*
>
> **✅ Decision:** *Left door is entry, right door is exit --- always*
>
> *Every room has the same spatial grammar. Entry left, exit right. The
> player cannot move left. Time moves forward. Ghost mode is the only
> context in which past rooms are revisited.*
>
> **✅ Decision:** *Screens and digital interfaces rendered as modal \>
> overlays*
>
> *Smartphones, TVs, computers, and airport departure boards appear as
> rectangular UI overlays in a Pokemon dialogue-box style. Keeps the
> pixel world pure and aesthetically consistent.*

3\. Core Architecture Philosophy

Every entity in the game --- rooms, characters, items, conversations,
jobs, relationships --- is a first-class WorldObject with a unique ID,
state, and relationships to other objects. The world is a graph of
linked objects. The narrative linked list is one traversal of that
graph, not the graph itself.

> **✅ Decision:** *Compressible interface --- all objects share a \>
> unified lifecycle*
>
> *Every object implements the Compressible interface: active →
> compressed → archived. The compression scheduler works down a unified
> queue. Compression prompts remain object-specific but the lifecycle
> pattern is consistent across rooms, conversations, relationships, and
> events.*
>
> **✅ Decision:** *The harness must be airtight before the agent \>
> matters*
>
> *If world state is incomplete or inconsistent, the agent constructs
> incoherent worlds. If state is rich and honest, the agent constructs a
> life that feels lived in. Engineering priority follows from this:
> build the harness first, wire the agent second.*

4\. Engineering Phases

Development is structured in four broad phases. Design discussions
continue to refine each phase before engineering begins.

  ----------------------- ----------------------- -----------------------
  **\*\*Phase\*\***       **\*\*Name\*\***        **\*\*Scope\*\***

  1                       Build the Harness       WorldObject model,

  LocationRegistry,       linked list,            compression pipeline,

  2                       Wire the Agent          Connect LLM calls to

  the harness. Room       generation,             compression, candidate

  3                       Stress Test Depth       Run edge case life arcs

  --- crime, presidency,  divorce, bankruptcy,    multiple relationships,

  4                       Polish the Surface      Controls, phone UI,

  pixel art rendering,    audio, onboarding,      milestones, prompt
  ----------------------- ----------------------- -----------------------

5\. Room System

5.1 Room as Atomic Unit

A room represents a discrete moment or location in the player's life.
Rooms are the fundamental unit of gameplay, narrative, and data. Each
room has a situation --- a brief description of what is happening ---
but never a script. The player finds their own story inside the
situation.

> **✅ Decision:** *Room Situation field --- rooms present, never \>
> prescribe*
>
> *Every generated room includes a situation string. NPCs, objects, and
> ambient dialogue are populated from this situation. The player chooses
> how to engage. Consequences emerge from those choices, not from a
> scripted path.*

5.2 Adaptive Duration & Compression

> **✅ Decision:** *The LLM dynamically selects room duration (day, \>
> week, month, year) based on narrative density. The harness converts \>
> this to duration_days for deterministic financial and health \>
> processing. The player sets a pacing preference, not a hard override.*

Room duration is determined by the LLM at generation time based on what
is happening in the player's life. A messy divorce slows to day-by-day
rooms. A stable stretch of routine employment compresses to year-long
rooms. A first week at a new job might be week-duration. The LLM reads
the full LifeContext --- emotional trajectory, relationship states,
career changes, health, behavioral patterns --- and selects the duration
that serves the narrative.

**Time model formalization:** On room exit, the harness advances
world_date by duration_days, then processes: income accrual, obligation
payments, health ticks, age advancement, and loan interest. All
financial math uses duration_days as input. See Economy Design Document
for the full processing pipeline.

The player can set a **pacing preference** on their phone:

-   **Live slowly** --- weights the LLM toward shorter durations. More
    rooms, more detail, more cost. For players who want to savor a
    particular period.

-   **Normal** --- LLM uses full judgment. Default setting.

-   **Live fast** --- weights the LLM toward longer durations. Fewer
    rooms, broader strokes, lower cost. For players who want to
    experience many lives quickly.

The pacing preference is a signal, not a command. The LLM respects it
but retains authority. Even on 'live fast,' if the player's life erupts
into crisis, the LLM slows down. Even on 'live slowly,' if nothing is
happening, the LLM may compress.

Duration values: **day** (rare --- reserved for the most critical
moments), **week**, **month**, **year**. The LLM can also assign
duration dynamically within a range, so 'a few months' is valid.

Target playthrough length: **80-150 rooms** at mixed resolution,
designed for **1-3 hours** of play. A life is an evening. The aggressive
default compression makes this possible while preserving narrative
density at the moments that matter.

5.3 Off-Screen Event Simulation

> **✅ Decision:** *Time gaps between rooms generate compressed \>
> off-screen events that populate the journal*

When a room covers a month or year, the system generates a batch of
compressed events for the intervening time. These are not rooms --- they
are life happening between rooms. The player walks into a new room and
the journal shows entries like: 'March --- got in a fight at school.
April --- made a new friend named Marcus. July --- family vacation to
the lake.' Off-screen events feed into LifeContext and influence the
next room's situation and NPC states.

5.4 Room Object Schema

  ----------------------------------- -----------------------------------
  **\*\*Field\*\***                   **\*\*Description\*\***

  \*\*id\*\*                          UUID --- unique identifier

  \*\*type\*\*                        RoomType enum --- home \\\| school
                                      \\\| work \\\|
  ----------------------------------- -----------------------------------

hospital \\\| car \\\| blank \\\| \\\...

**sequence_index** Position in the linked list (0 = birth room)

**timestamp_generated** ISO8601 --- when the room was created

**player_age** Fractional years at time of room generation (e.g.

4.5)

**world_date** ISO8601 calendar date --- anchors era, payroll,

event timestamps

**duration** RoomDuration enum --- day \\\| week \\\| month \\\|

year. Selected by LLM based on narrative density.

**duration_days** Integer --- exact numeric days this room spans.

Derived from duration enum (day=1, week=7, month=30, year=365) or set
explicitly by LLM. Used by harness for salary accrual, obligation
processing, age advancement, and health ticks. See Economy Design
Document for financial math.

**prev_room_id** UUID \\\| null --- null only for birth room

**next_room_id** UUID --- always set; defaults to BlankRoom until

generated

**layout** RoomLayout --- tile grid, object placements,

character positions

**situation** String --- what is happening in this room.

Populates NPC behavior and ambient dialogue.

**generated_code** String --- one-shot TypeScript/JSX for this

room's interactions

**background_description** String --- what the LLM was instructed to
render

**ambient_audio_cue** String --- e.g. 'suburban kitchen morning'

**characters** Character\\\[\\\] --- full character objects present

in room

**events** RoomEvent\\\[\\\] --- actions and choices that

occurred

**conversations** Conversation\\\[\\\] --- conversation objects

initiated in this room

**stat_snapshot** StatSnapshot --- player stats at time of room

EXIT

**life_event_flag** Boolean --- true if this room produced a

LifeEvent on compression

**compressed** CompressedRoom \\\| null --- null while player is

in room, written on exit

**demon_target** DemonTarget \\\| null --- the object tagged by the

Demon for this room, if any

5.5 Room Layout Schema

  ----------------------------------- -----------------------------------
  **\*\*Field\*\***                   **\*\*Description\*\***

  \*\*dimensions\*\*                  { width, height } in tiles --- e.g.
                                      20x15

  \*\*floor_tiles\*\*                 TileGrid --- 2D array of tile_ids
                                      for floor layer

  \*\*wall_tiles\*\*                  TileGrid --- 2D array of tile_ids
                                      for wall layer

  \*\*objects\*\*                     ObjectPlacement\\\[\\\] ---
                                      furniture and props
  ----------------------------------- -----------------------------------

placed on tile coordinates

**character_positions** CharacterPlacement\\\[\\\] --- NPC tile
positions

**walkable_map** boolean\\\[\\\]\\\[\\\] --- collision grid, same

dimensions as room

**entry_tile** { col, row } --- left wall. Where player spawns

on room entry.

**exit_tiles** ExitTile\\\[\\\] --- right wall only. Trigger tiles

that move to next room.

5.6 RoomEvent Schema

  ----------------------------------- -----------------------------------
  **\*\*Field\*\***                   **\*\*Description\*\***

  \*\*event_id\*\*                    UUID

  \*\*type\*\*                        EventType --- dialogue \\\| choice
                                      \\\| item \\\|
  ----------------------------------- -----------------------------------

minigame \\\| cutscene \\\| work_activity \\\| death

**description** String --- what happened

**player_choice** String \\\| null --- what the player chose, if

applicable

**outcome** String --- result of the event

**score** Number \\\| null --- numeric output for measurable

activities

**timestamp** Number --- seconds into room session

6\. Linked List Architecture & Open World

> **✅ Decision:** *Room history is a singly-linked append-only \>
> narrative list*
>
> *The linked list is the canonical record of the player's life ---
> every room visited, in order. It is append-only. The player never
> traverses backwards in life. Ghost mode is the sole exception and is a
> read-only memorial mode, not navigation.*
>
> **✅ Decision:** *Open world is achieved through the LocationRegistry
> \> and fast travel splice*
>
> *The world feels open because the player can choose where to go. The
> linked list records where they went. These are not in conflict.*

6.1 Fast Travel --- Linked List Splice

When the player fast travels to a known location, the room is spliced
into the linked list between the current room N and the
already-generated room N+1. Once the player enters the fast travel room
it becomes the new N. N+1 was already generated and remains valid. N+2
candidates are selected fresh from the context of the new current room.

6.2 Room Entry Types

  ----------------------------------- -----------------------------------
  **\*\*Type\*\***                    **\*\*Description\*\***

  \*\*Player-initiated\*\*            Fast travel splice. Player chose
                                      where to go.

  \*\*Pipeline-generated\*\*          Normal N+1 candidate selection.
                                      Life takes the
  ----------------------------------- -----------------------------------

player somewhere.

**World-forced** The world overrides candidate selection and

inserts a room. Arrest, emergency, someone showing up at the door. Same
linked list splice mechanic, triggered by world state rather than
player.

**Demon-forced** The Demon's candidate selection influence

6.3 BlankRoom

BlankRoom is a subtype of RoomObject and a first-class game state. It is
the failsafe the world gives the player when something has gone wrong
--- connectivity loss, API error, generation failure. BlankRoom chains
to another BlankRoom until the issue resolves. On recovery, the last
real room's next_room_id updates to the newly generated room.

BlankRoom is not a philosophical state. It is the world gracefully
handling an error. It should feel liminal and eerie --- the world
acknowledging its own seams.

7\. LocationRegistry

The LocationRegistry is a lookup table of places the player has
persistent access to. It is the data layer behind the phone's Map app
and the fast travel system.

7.1 LocationEntry Schema

  ----------------------------------- -----------------------------------
  **\*\*Field\*\***                   **\*\*Description\*\***

  \*\*id\*\*                          UUID

  \*\*name\*\*                        String --- display name, e.g.
                                      'Home',
  ----------------------------------- -----------------------------------

'Riverside Logistics (Warehouse)'

**room_type** RoomType --- the type of room this location

generates

**returnable** Boolean --- false for one-time rooms (hospital

visit, prison, childhood home after moving out)

**cached_room_id** UUID \\\| null --- the last generated room object

for this location. Loaded on revisit.

**regenerate_on_next_visit** Boolean --- true after a major context
change.

Flushes cached room.

**unlock_condition** String --- e.g. 'has_job', 'owns_car', 'age

\\\>= 16'

**context** Object --- location-specific metadata. For work:

employer, role, salary. For home: address, owned/rented.

> **✅ Decision:** *Locations are versioned, not replaced*
>
> *When a major context change occurs (changing jobs, moving home),
> regenerate_on_next_visit is flagged and context is updated. The next
> visit generates a fresh room. The old cached room is preserved in the
> linked list history. You left that job. That workplace still exists in
> your past.*

7.3 Always-Available Locations

> **✅ Decision:** *The library is a persistent, always-accessible \>
> location from birth. No unlock condition.*

Some locations exist in the LocationRegistry from game start with
returnable: true and unlock_condition: null. The library is the primary
example. It provides free computer access (for job applications and
housing searches), study space, social interaction, and a safe room for
players in crisis. See Economy Design Document section 11 for full
library design.

7.4 World Topology as Narrative Choice

> **✅ Decision:** *The world has no spatial map. Location is a \>
> narrative choice expressed through the room transition system.*

The player does not navigate a 2D overworld between locations. The
current room is the world. Leaving a room presents LLM-generated next
room candidates. Fast travel via the Map app selects a specific
LocationRegistry entry. Walking left or right generates contextual
candidates based on neighborhood context.

\"Where you are\" is a narrative property, not a coordinate.
Neighborhood, proximity, and commute time are encoded in LifeContext,
not computed from a spatial model. The LLM generates commute and transit
rooms when appropriate. See Economy Design Document section 13 for
topology design.

8\. Compression & LifeContext

8.1 The Compression Loop

When the player exits a room, compression fires before N+1 selection
begins. This is the core causal loop of the game:

**Exit Room → Compress → Select N+1 Candidates → Generate N+1**

> **✅ Decision:** *Compression fires on room exit, before N+1 \>
> selection*
>
> *The CompressedRoom object is written immediately and used as the
> freshest context signal for candidate selection. Compression output is
> causality, not just memory. If you just had a fight with your dad,
> that compressed event shapes what rooms the LLM considers next.*

8.2 CompressedRoom Schema

  ----------------------------------- -----------------------------------
  **\*\*Field\*\***                   **\*\*Description\*\***

  \*\*narrative\*\*                   String --- 1-2 sentence
                                      human-readable summary.
  ----------------------------------- -----------------------------------

Used in Journal.

**behavioral_signal** String --- how the player responded and what

choices they made

**stat_deltas** StatDelta\\\[\\\] --- what stats moved and by how

much

**tags** String\\\[\\\] --- e.g. \\\['conflict', 'family',

'defiance', 'school'\\\]

**emotional_valence** Float -1.0 to 1.0 --- overall emotional tone of

the room

**characters_affected** UUID\\\[\\\] --- characters whose

memory_of_player\\\[\\\] should be updated

**is_life_event** Boolean --- if true, this CompressedRoom is never

further compressed

**milestone_type** String \\\| null --- e.g. 'married',

'first_job', 'child_born', 'parent_died'

8.3 LifeEvent Log

A LifeEvent is a CompressedRoom with is_life_event: true. LifeEvents are
permanent anchors in the timeline --- never further compressed
regardless of how large LifeContext grows. They form the skeleton of the
Journal and are the fixed reference points the LLM always has access to.

8.4 LifeContext Schema

  ----------------------------------- -----------------------------------
  **\*\*Field\*\***                   **\*\*Description\*\***

  \*\*player_name\*\*                 String

  \*\*birth_year\*\*                  Number --- anchors era-appropriate
                                      room
  ----------------------------------- -----------------------------------

generation

**player_age** Current age in fractional years

**world_date** Current ISO8601 calendar date

**nature_stats** StatBlock --- innate traits, seeded from parent

interaction, immutable

**nurture_stats** StatBlock --- environmentally shaped, internal

LLM signal only. Never surfaced as numbers.

**behavioral_patterns** String\\\[\\\] --- recurring player behavior
tags

**life_events** CompressedRoom\\\[\\\] --- permanent LifeEvent

anchors, never compressed further

**compressed_history** CompressedRoom\\\[\\\] --- rolling compressed
room

history, may be meta-compressed

**off_screen_events** OffScreenEvent\\\[\\\] --- compressed events from

time gaps between rooms

**emotional_trajectory** Float\\\[\\\] --- rolling valence history

**active_relationships** Character\\\[\\\] --- people currently in
player's

life

**location_registry** LocationEntry\\\[\\\] --- player's known
returnable

locations

**public_reputation** PublicReputation --- scalar signals for how

broader society perceives the player

**world_events** WorldEvent\\\[\\\] --- active background world events

coloring room generation

**lethality** Float 0.0 to 1.0 --- current Demon intensity,

derived from age + health + context

**compression_level** PacingPreference enum --- slow \\\| normal \\\|
fast

--- player's pacing preference signal to the LLM

9\. Death Mechanics & The Demon

9.1 Philosophy

Death is not a special system. It is an emergent consequence of
interacting with a world that contains lethal objects. Alive is a state.
Any WorldObject the player interacts with can, in principle, end the
game. Not every object will --- but a street crossing, a jungle, a
failing organ, a violent encounter all carry probability. Death is part
of life. The game respects that.

9.2 The Demon

> **✅ Decision:** *A Demon subprocess runs alongside room generation,
> \> steering the player toward mortal danger --- but never striking \>
> directly*

The Demon operates exclusively at two levels: candidate selection and
room population. It never activates interactions, never knows where the
player is within a room, and never triggers death directly.

**Level 1 --- Candidate Selection Steering:** The Demon weights
dangerous rooms higher in N+1 candidate selection. A high lethality
float means the candidate pool includes more rooms with lethal potential
--- a highway drive, a construction site walk, a late-night shortcut
through a bad neighborhood. The Demon steers toward danger; it does not
place the player in it.

**Level 2 --- Room Population:** Once a room is generated, the Demon can
influence which objects are placed and their lethality_modifier values.
The crosswalk has fast traffic. The electrical panel has a frayed wire.
The ice on the path is thicker than usual. These objects exist in the
room with their danger --- but whether the player encounters them is a
function of room layout and player movement, not Demon intervention.

**Exception --- Character-Driven Violence:** Interpersonal violence is
not the Demon's domain. If a character's resentment is maxed and they
have violent behavioral patterns, the character system generates them
with intent to confront. A character brings a weapon because the
relationship state demands it --- this is the character system working
as designed, not the Demon. The Demon's only role is ensuring that
character ends up in the same room as the player through candidate
selection.

9.3 Lethality Float

The lethality float (0.0 to 1.0) determines how aggressively the Demon
operates. It is derived from:

-   **Age** --- near-zero in childhood (the rooms available to children
    are inherently low-risk), rises gradually through adulthood,
    increases exponentially after 60.

-   **Health stat** --- low health compounds lethality. Critical health
    dramatically increases the Demon's influence.

-   **Behavioral patterns** --- reckless, criminal_act, substance_abuse
    tags elevate lethality.

-   **Room context** --- inherently dangerous rooms (highway,
    construction site, combat zone) have baseline lethality modifiers.

-   **Luck seed** --- nature stat that introduces genuine random
    variance.

The world naturally protects young players because the rooms available
to them are low-risk. A toddler is not driving a car or walking through
a jungle. By the time high-risk rooms are accessible (teen driving,
adult choices), enough life has happened to make death meaningful.

9.4 Health-Driven Room Forcing

When the player's health stat is critical, the context signals this to
candidate selection: 'your lungs are failing', 'you feel chest pain',
'you can barely stand.' This weights medical rooms (doctor's office,
hospital, emergency room) into the candidate pool. If the player ignores
medical rooms or cannot access care, the lethality compounds. The Demon
does not need to act --- the world is already closing in.

9.5 DemonTarget Schema

  ----------------------------------- -----------------------------------
  **\*\*Field\*\***                   **\*\*Description\*\***

  \*\*object_id\*\*                   UUID --- the WorldObject with
                                      elevated lethality
  ----------------------------------- -----------------------------------

in this room

**lethality_modifier** Float 0.0 to 1.0 --- how dangerous this object is

in context

**hazard_description** String --- the nature of the danger ('fast

oncoming traffic', 'exposed wiring', 'thin ice')

**near_miss_narrative** String --- compressed event if the player

interacts but survives

9.6 Checkpoints

> **✅ Decision:** *Players can save checkpoint snapshots and fork their
> \> life from any checkpoint*

A checkpoint is a full snapshot of the IndexedDB state at a given room.
The linked list forks from that point forward. Checkpoint slots are
limited to 5, requiring the player to be intentional about when they
save. Checkpoints enable 'what if I had made a different choice'
exploration without violating the identity contract --- the player is
still the same person, just living a different branch.

10\. Dramatic Pacing

10.1 The Beat System

> **✅ Decision:** *Every N rooms, the system checks whether a turning
> \> point has occurred and increases narrative entropy if life has gone
> \> flat*

The beat system tracks narrative momentum. After N low-variance rooms
(stable emotions, no conflict, routine), the candidate selection weights
shift to favor rooms with higher potential for conflict, change, or
novelty. The system does not generate scripted events --- it opens the
door wider for disruption. The LLM decides what specifically happens.

N scales with life stage:

-   **Childhood** --- shorter intervals (every 3-4 rooms). Life is
    naturally eventful for children.

-   **Young adulthood** --- medium intervals (every 5-6 rooms).
    Volatility is expected.

-   **Middle age** --- longer intervals (every 8-10 rooms). Stability is
    realistic, but prolonged flatness still triggers a beat.

-   **Senior years** --- medium intervals (every 5-6 rooms). Health
    events, family milestones, and mortality awareness create natural
    beats.

The player's own choices reset the beat counter. Actively pursuing drama
(applying to jobs, dating, committing crimes) generates narrative
momentum organically, and the beat system stays quiet.

10.2 Life Stage Pacing Curves

Each life stage has an ambient pacing profile that shapes candidate
selection independent of the beat system:

-   **Childhood** --- exploratory. Many new characters, frequent
    location changes, discovery-oriented rooms.

-   **Teens** --- volatile. Emotional highs and lows, social drama,
    identity formation.

-   **Twenties** --- chaotic. Rapid career and relationship changes,
    financial instability, freedom.

-   **Thirties/Forties** --- stabilizing. Career consolidation, family
    building, routine emerging.

-   **Fifties** --- reflective. Mortality awareness begins, children
    leaving, career plateau or pivot.

-   **Sixties+** --- elegiac. Health events, loss, legacy, the world
    narrowing.

11\. Opening Experience

11.1 Parent Generation & Origin Scene

> **✅ Decision:** *Every new game begins with a randomly generated \>
> parent interaction scene that seeds the player's nature stats*

The first room is not the player's room --- it is the parents' room. Two
characters are generated with full personality profiles, backgrounds,
and short histories. The player watches them meet and interact. The
quality of their connection --- love, tension, indifference, passion ---
is observable and seeds the player's nature stats.

Loving parents with high emotional sensitivity may seed higher empathy
and emotional sensitivity in the child. Ambitious, driven parents may
seed higher intellect or risk tolerance. The inheritance is
probabilistic, not deterministic --- the child is influenced by but not
a copy of their parents.

The era is set by the world timeline. The world time is canonical and
mostly consistent --- the player lives in a specific historical context.

11.2 Early Life Skip

> **✅ Decision:** *After completing one full life and ghost mode, the
> \> player can skip the origin scene on subsequent playthroughs*

The skip advances to approximately age 1 (crawl controls unlocked). The
first year is the parents' story, not the player's. Earning the skip
requires witnessing the full life in ghost mode --- it is a reward for
complete engagement, not impatience.

Even when skipping, the parent generation and nature stat seeding still
occur --- the player simply does not watch it unfold.

12\. Character System

12.1 Character Schema

  ----------------------------------- -----------------------------------
  **\*\*Field\*\***                   **\*\*Description\*\***

  \*\*id\*\*                          UUID

  \*\*name\*\*                        String

  \*\*connection_types\*\*            ConnectionType\\\[\\\] --- parent
                                      \\\| sibling \\\| child

  \\\| friend \\\| coworker \\\| boss \\\| ex \\\| acquaintance \\\|
  \\\| romantic_partner               grandparent \\\|

  \*\*relationship_status\*\*         RelationshipStatus --- acquaintance
                                      \\\| friend \\\|

  best_friend \\\| situationship \\\| girlfriend \\\| fiancee \\\| wife
  dating \\\|                         \\\| ex

  \*\*personality\*\*                 Attachment style, openness, humor,
                                      values,
  ----------------------------------- -----------------------------------

communication style

**backstory** String --- short generated history. Life events,

background, formative experiences.

**intent** String --- what this character is trying to

accomplish in the current room

**affection_state** AffectionState --- see 12.2

**memory_of_player** CompressedRoom\\\[\\\] --- their compressed
memories.

Asymmetric to player memory.

**current_emotional_state** Affects receptiveness right now. Updated
each

room.

**social_connections** UUID\\\[\\\] --- who they know. Used for
reputation

propagation and emergent meetings.

**age** Number --- ages with world clock

**life_stage** LifeStage --- infant \\\| child \\\| teen \\\|

young_adult \\\| adult \\\| senior

**persistence** ephemeral \\\| recurring --- emerges from

compression encoding depth

**availability_for_romance** Boolean --- enforced by LLM context, never
by UI

**parent_child_flag** Boolean --- true for player's children. Ages

independently.

12.2 Character Backstory & Intent

> **✅ Decision:** *Every character is generated with a short history \>
> and a current intent*

When the LLM creates an NPC --- a teacher, a coworker, a stranger at a
bar --- it generates a compressed backstory: age, key life events,
personality traits, current emotional state. This backstory feeds
character_response() and makes NPCs feel like people with lives outside
the player's awareness.

The **intent** field describes what this character is trying to
accomplish in the current room. The teacher's intent is to teach. The
boss's intent is to manage productivity. The stranger's intent might be
to make conversation, to be left alone, or to pick a fight. Intent
drives autonomous NPC behavior --- the room is alive whether or not the
player engages. Characters act on their intent independently, creating a
world with its own momentum.

Script interactions --- a teacher asking the class a question, a boss
calling a meeting, a parent calling everyone to dinner --- are
structured sequences driven by character intent. The content is emergent
(the LLM generates the lesson, the meeting agenda, the dinner
conversation) but the structure provides scaffolding for room flow.

12.3 AffectionState Schema

  ----------------------------------- -----------------------------------
  **\*\*Field\*\***                   **\*\*Description\*\***

  \*\*attraction\*\*                  Prerequisite for romance. Builds
                                      through
  ----------------------------------- -----------------------------------

interactions, chemistry.

**trust** Slow to build, fast to break. Damaged by lies,

neglect, broken promises.

**respect** Influenced by player's career, behavior,

reliability, follow-through.

**resentment** Accumulates from neglect, betrayal, unresolved

conflict. Slow to fade.

**awareness** Do they know the player exists yet. Starts at 0

for strangers.

**intimacy** Depth of emotional connection. Builds through

meaningful conversation.

12.4 LLM vs Threshold Decisions

  ----------------------- ----------------------- -----------------------
  **\*\*Decision          **\*\*Mechanism\*\***   **\*\*Example\*\***
  Type\*\***                                      

  Availability            Threshold               Character won't pick

  up phone if resentment  \\\> 0.8. Character     won't respond

  Response content        LLM                     What they actually say,

  given they are          available and engaging. 

  Initiation              Threshold + LLM         Threshold checks if

  state warrants          initiation. LLM         generates what they

  Silence                 Threshold               Not picking up is

  itself expressive. No   LLM call needed for     silence.
  ----------------------- ----------------------- -----------------------

12.5 Relationship Progression

> **✅ Decision:** *Relationship milestones are never menu options ---
> \> they emerge from state*
>
> *No button says 'ask to be girlfriend.' Attraction builds, time is
> spent together, a conversation happens when it is earned. The LLM
> handles the moment when relationship state genuinely supports it.*

12.6 Asymmetric Memory

The player and each character carry separate compressed memories of the
same events. You might remember a moment they have forgotten. They might
carry something from room 12 that you never thought was significant.
This asymmetry feeds character_response() authenticity and creates the
texture of real relationships.

12.7 Children

Children are characters born into the roster with parent_child_flag:
true. They age with the world clock. Context accumulates independently
of the player. Being present or absent as a parent encodes into their
memory_of_player\\\[\\\] asymmetrically.

12.8 PublicReputation

  ----------------------------------- -----------------------------------
  **\*\*Field\*\***                   **\*\*Description\*\***

  \*\*professional_standing\*\*       Float --- career credibility and
                                      industry respect

  \*\*public_image\*\*                Float --- how the general public
                                      perceives the
  ----------------------------------- -----------------------------------

player

**political_capital** Float --- influence with institutions and power

structures

**criminal_record** Boolean + String\\\[\\\] --- permanent flag. Affects

job applications, relationships, civic access.

**media_profile** Float --- level of public attention. High values

weight journalist and press room candidates.

13\. Conversation System

A Conversation is a first-class object. The underlying mechanic ---
character_response() --- is identical whether a character is standing
next to you or on the phone. Medium is context flavor passed to the
prompt.

> **✅ Decision:** *All dialogue uses streaming output, displayed \>
> character-by-character in a Pokemon dialogue box aesthetic*
>
> *Watching text appear token-by-token in a dialogue box is a
> fundamentally different emotional experience than seeing a block of
> text appear instantly. It makes every conversation feel like a moment.
> The player can tap to complete (skip to end of current message) like
> in actual Pokemon games.*

13.1 Conversation Schema

  ----------------------------------- -----------------------------------
  **\*\*Field\*\***                   **\*\*Description\*\***

  \*\*id\*\*                          UUID

  \*\*participants\*\*                UUID\\\[\\\] --- character IDs
                                      involved

  \*\*medium\*\*                      in_person \\\| phone_call \\\| text
                                      \\\| video_call

  \*\*location_context\*\*            UUID --- room ID where the player
                                      initiated the
  ----------------------------------- -----------------------------------

conversation

**thread** ConversationMessage\\\[\\\] --- the full exchange

**started_at** world_date timestamp

**compressed** CompressedConversation \\\| null --- written when

conversation ends or ages out

**spans_rooms** Boolean --- true for text threads that continue

across room visits

13.2 Availability & Silence

When medium is phone_call or text, an availability check runs first via
threshold logic. A character may not pick up. Not picking up is itself
an expressive signal. Silence is data. No LLM call is needed for
silence.

14\. Job System

14.1 Application

Job applications are available on the computer only. The job board
auto-generates a full list of available positions via a single Haiku
call, weighted by the player's current stats, age, location, and
behavioral patterns. Submitting an application weights an interview room
into N+1 candidate selection.

14.2 Work Room

  ----------------------------------- -----------------------------------
  **\*\*Trigger\*\***                 **\*\*Registry Action\*\***

  \*\*New job obtained\*\*            New LocationEntry created. Fresh
                                      room generated
  ----------------------------------- -----------------------------------

on first visit.

**Promotion** Context updated with new role/salary.

regenerate_on_next_visit flagged.

**Years pass** Room regenerates periodically with aged context.

**Fired** returnable set to false. Firing is a relationship

event.

14.3 Work Activities

> **✅ Decision:** *All work activities must produce a measurable score*
>
> *Every work activity outputs a scalar --- score, completion
> percentage, time, accuracy. This scalar feeds net_worth delta and
> career progression probability.*
>
> **✅ Decision:** *Work rooms present a situation, not a task queue*
>
> *The room has a situation --- boxes need sorting, a deadline is
> approaching, a client is waiting. The player chooses how to engage.
> Ignoring the work, socializing instead, or leaving early are all valid
> choices with accumulating consequences.*

14.4 Compensation

  ----------------------------------- -----------------------------------
  **\*\*Type\*\***                    **\*\*Mechanic\*\***

  \*\*Salary\*\*                      Accrues based on world_date
                                      progression. Deposits
  ----------------------------------- -----------------------------------

appear in Banking with timestamps.

**Hourly** Calculated per work room visit. Activity score

determines pay.

**Performance bonus** Triggered by exceptional score output or boss
relationship milestone.

**Unemployment** No income. Job board weighted higher in candidate

selection.

14.5 Trucking as Minigame

> **✅ Decision:** *Trucking is a MinigameKit sequence, not a standard
> \> work room.*

Trucking jobs use the MinigameKit route_delivery template. The player
drives via joystick/arrow input through highway rooms with scoring on
delivery time, fuel efficiency, and cargo condition. Rest stop rooms
appear between legs. The work activity score feeds hourly wage. See
Economy Design Document section 12 and Interaction Systems document for
MinigameKit templates.

14.6 Financial Integration

All compensation mechanics (salary accrual, hourly wage calculation,
income streams, obligations) are defined in the Economy Design Document.
The job system creates and modifies IncomeStream objects in
PlayerFinances. See Economy Design section 4.

15\. Crime & Legal System

Crime is not a separate system. It is a choice available in rooms, with
consequences that propagate through the harness like any other choice.

  ----------------------------------- -----------------------------------
  **\*\*Stage\*\***                   **\*\*Mechanic\*\***

  \*\*Crime committed\*\*             Choice in a room. Tags
                                      behavioral_patterns with

  criminal_act. Witnesses update      Reputation propagates.
  AffectionState.                     

  \*\*Investigation\*\*               Emerges in candidate selection
                                      based on crime

  severity, witness count, elapsed    uncertainty is the tension.
  time. The                           

  \*\*Arrest\*\*                      World-forced fast travel splice.
                                      The player did
  ----------------------------------- -----------------------------------

not choose to go there.

**Courthouse** Multi-conversation room. Prosecutor has access to

the player's full behavioral history.

**Jail** LocationRegistry entry, returnable: false once

released. Room types narrow dramatically.

**Release** Criminal record is permanent. Affects jobs,

relationships, PublicReputation indefinitely.

**Fleeing** LocationRegistry shrinks. The world constricts

around the choice.

16\. World Events

World events are background context signals that color room generation
during a period without generating rooms themselves. A recession, a
pandemic, an election, a war.

  ----------------------------------- -----------------------------------
  **\*\*Field\*\***                   **\*\*Description\*\***

  \*\*id\*\*                          UUID

  \*\*name\*\*                        String --- e.g. 'Financial Crisis',
                                      'Global
  ----------------------------------- -----------------------------------

Pandemic'

**type** background \\\| foreground

**started_at** world_date

**ended_at** world_date \\\| null --- null if ongoing

**affected_domains** String\\\[\\\] --- e.g. \\\['economy',

'employment', 'health'\\\]

**context_signal** String --- brief description injected into

LifeContext

17\. Stats System

> **✅ Decision:** *Two-axis stat system: Nature (hidden) vs Nurture \>
> (ambient)*
>
> *Nature stats are seeded from the parent interaction scene and never
> change. Nurture stats evolve based on choices and experiences. Neither
> is surfaced as a number. Stats are felt, not read.*

17.1 Nature Stats (hidden, seeded from parent interaction, immutable)

-   Intellect

-   Emotional sensitivity

-   Physical constitution

-   Risk tolerance

-   Agreeableness

-   Luck seed --- genuine random variance injected into candidate
    selection and Demon probability

-   Happiness set point --- life events create drift but pull back
    toward this

-   Predispositions --- addiction, anxiety, depression tendencies.
    Probabilistic, not deterministic.

17.2 Nurture Stats (internal LLM signals --- never shown as numbers)

-   Confidence --- evident in available dialogue choices and how NPCs
    respond

-   Social skill --- felt through quality of relationship building

-   Education level --- set by school progression (mandatory ages 5--18,
    optional college), tracked as context. See Economy Design Document
    section 10 for full education system including truancy enforcement,
    college decision at age 17, and academic performance.

-   Resilience --- evident in how quickly the player recovers from
    adverse sequences

-   Creativity --- surfaces in available choices and quality of creative
    work activities

-   Financial literacy --- grows through banking, job experience,
    financial decisions

17.3 Visible HUD Stats

  ----------------------- ----------------------- -----------------------
  **\*\*Stat\*\***        **\*\*Display\*\***     **\*\*Mechanic\*\***

  Physical health         Red bar                 Depletes through

  illness, injury,        neglect. Restored       through medical rooms,

  Hunger / hydration      Green bar               Depletes over room

  durations. Restored by  eating and drinking.    Affects energy and
  ----------------------- ----------------------- -----------------------

> **✅ Decision:** *Health depletes and recovers on a per-room basis. \>
> Illness manifests as room-level debuffs and narrative events.*

On each room exit, the harness evaluates health based on: base decay
(age-accelerated), hunger/hydration state, activity in the room, illness
status, and injury recovery. Illness is probabilistic, influenced by
season, age, health bar level, nature stats, and behavioral patterns.
When illness triggers, movement speed decreases, performance suffers,
and medical room candidates are weighted higher. See Economy Design
Document section 14 for the full health tick system.

> **✅ Decision:** *Behavioral patterns tracked as tags, not numbers*
>
> *Recurring player choices are tracked as string tags (e.g. 'defiance',
> 'generosity', 'avoidance', 'workaholic', 'criminal_act') rather than
> additional numeric stats. Tags are LLM-readable and capture the
> texture of choices.*

18\. WorldObject Model

18.1 WorldObject Base Interface

  ----------------------------------- -----------------------------------
  **\*\*Field\*\***                   **\*\*Description\*\***

  \*\*id\*\*                          UUID --- globally unique

  \*\*object_type\*\*                 ObjectType enum --- room \\\|
                                      character \\\| item \\\|
  ----------------------------------- -----------------------------------

location \\\| conversation \\\| life_event

**created_at** world_date timestamp

**owner_id** UUID \\\| null --- for items: who owns this

**location_id** UUID \\\| null --- which room this object is

currently in

**state** Object --- type-specific state bag

**relationships** Relationship\\\[\\\] --- links to other WorldObjects

**compressible** Boolean --- whether this object participates in

the compression lifecycle

**compressed_at** world_date \\\| null

**archived** Boolean --- fully archived, no longer in active

memory

**audio_cue** String \\\| null --- sound associated with this

object on interaction

**lethality_modifier** Float \\\| null --- baseline danger level of this

object. Fed to the Demon.

18.2 Item Object

  ----------------------------------- -----------------------------------
  **\*\*Field\*\***                   **\*\*Description\*\***

  \*\*name\*\*                        String --- display name

  \*\*category\*\*                    ItemCategory --- jewelry \\\|
                                      clothing \\\| vehicle

  \\\| property \\\| consumable \\\|  \\\| food
  collectible \\\| tool               

  \*\*interaction_trigger\*\*         touch \\\| examine \\\| pick_up
                                      \\\| use \\\| give \\\| eat
  ----------------------------------- -----------------------------------

\\\| drink

**reaction** Generated text result of interaction

**context_delta** How interaction updates LifeContext. Can be

empty.

**owned_by_player** Boolean --- owned items persist across rooms

**monetary_value** Number \\\| null

**consumable** Boolean --- food/drink items that restore

hunger/hydration on use

19\. N+1 Room Generation

19.1 Generation Pipeline

  ------------------------------ ----------------------- -------------------------
  **\*\*Function\*\***           **\*\*Model\*\***       **\*\*Description\*\***

  prompt_room()                  Sonnet                  Full room generation.

  One-shot TypeScript            output. Fires once per  room transition.

  select_candidates()            Haiku                   8 candidate room types

  from taxonomy, weighted        by life stage, stats,   behavioral patterns,

  demon_evaluate()               Haiku                   Two-pass Demon: weights

  dangerous candidates in        selection, then tags    one object in the

  compress_room()                Haiku                   CompressedRoom from

  completed                      RoomEvent\\\[\\\].      LifeEvents.
                                 Flags                   

  generate_off_screen_events()   Haiku                   Batch of compressed

  events for time gaps           between rooms. Density  scales with compression

  generate_room_messages()       Haiku                   NPC dialogue lines for

  room. Flavored by              situation string and    character intent.

  character_response()           Haiku                   NPC response to player

  input. Medium-aware.           Streamed.               

  availability_check()           Haiku                   Threshold-based.

  Whether character picks        up phone / responds.    

  update_character_states()      Haiku                   Batched. All present

  characters update              silently on room exit.  

  generate_job_board()           Haiku                   Auto-generates job

  listings weighted by           player context.         

  curate_ghost_playlist()        Haiku                   Selects ordered room ID

  list for ghost mode            traversal.              

  check_milestones()             Haiku                   Evaluates room events

  against milestone              criteria. Flags         achievements.
  ------------------------------ ----------------------- -------------------------

> **✅ Decision:** *Sonnet for room generation, Haiku for everything \>
> else --- all dialogue streamed*
>
> *Room generation is the only task requiring Sonnet-level capability.
> All supporting tasks including all dialogue run on Haiku with
> streaming output.*

19.2 Intent Signals

  ----------------------------------- -----------------------------------
  **\*\*Action\*\***                  **\*\*Effect on Candidate
                                      Selection\*\***

  \*\*Job application                 Interview room weighted high in N+1
                                      candidates
  ----------------------------------- -----------------------------------

submitted\*\*

**Dating app match** Conversation/meeting room with that character

weighted

**Browser search** Query feeds LifeContext as mild

interest/curiosity signal

\*\*Phone call / text Character response room or phone call room may

sent\*\* surface

\*\*Fast travel Bypasses candidate selection --- direct splice

selected\*\*

\*\*World event Affected domain rooms weighted during event

activated\*\* duration

\*\*Player says 'I Political/civic rooms begin appearing in

want to be candidate pool over time

president'\*\*

20\. Controls & Player Agency

> **✅ Decision:** *Controls unlock progressively as the player ages*

  ----------------------------------- -----------------------------------
  **\*\*Life Stage\*\***              **\*\*Controls\*\***

  \*\*Infant\*\*                      Single button --- cry

  \*\*Toddler\*\*                     Crawl joystick + cry

  \*\*Child\*\*                       Walk joystick + interact

  \*\*Older Child\*\*                 \\+ dialogue choices

  \*\*Teen\*\*                        \\+ inventory, phone (modal),
                                      pacing preference

  \*\*Adult\*\*                       Full agency --- all controls

  \*\*Senior\*\*                      Possible control reduction
                                      (fatigue, illness)
  ----------------------------------- -----------------------------------

> **✅ Decision:** *Cry button regression --- adults can cry in extreme
> \> circumstances*
>
> *The cry button never disappears entirely. Under sufficient emotional
> stress it re-emerges. It signals a life moment without saying a word.*

21\. Phone & Computer

The phone is personal and social. The computer is transactional and
informational. Both are meta-interfaces with the world. All screens
rendered as modal overlays.

21.1 Phone Apps

  ----------------------- ----------------------- -------------------------
  **\*\*App\*\***         **\*\*Unlocks\*\***     **\*\*Description\*\***

  Contacts / Calls        Age 8                   Roster-based. Calls
                                                  create

  Conversation objects.   Character may not pick  
                          up.                     

  Messages                Age 12                  Async Conversation
                                                  objects.
  ----------------------- ----------------------- -------------------------

spans_rooms: true.

Photos Age 14 Room screenshot history.

Camera roll of your life.

Journal Age 14 Renders

CompressedRoom.narrative, off-screen events, and LifeEvents as chapter
markers. The journal is a scrapbook that fills in as you live.

Map Age 16 LocationRegistry UI. Fast

travel surface.

Social Feed Age 16 Era-appropriate generated

posts from roster characters.

Dating App Age 18 Surfaces roster

characters + generated strangers.

Banking Age 18 Reads net_worth. Shows

21.2 Computer

  ----------------------- ----------------------- -------------------------
  **\*\*App\*\***         **\*\*Unlocks\*\***     **\*\*Description\*\***

  Games                   Age 8                   Era-appropriate

  emulated classics via   EmulatorJS.             

  Browser                 Age 12                  Era-appropriate

  generated pages. Search queries feed            LifeContext.

  Chat / IM               Age 12                  AIM-style.

  character_response()    per thread.             

  Social                  Age 16                  Era-appropriate social
  ----------------------- ----------------------- -------------------------

platforms.

Job Board Age 16 Auto-generated listings

via Haiku. Computer only.

Work Tools Adult Career-specific scored

activity surface.

Email Adult Formal async

Conversation objects.

Dating Age 18 Era-appropriate online

dating.

22\. Audio System

> **✅ Decision:** *Audio is a property of WorldObjects, not a \>
> room-level ambient layer*

Every WorldObject can carry an audio_cue field --- the kitchen sink has
a sound, the TV has a sound, the playground has a sound. The soundscape
of a room is the emergent composition of its objects. Background
ambience (wind, rain, traffic) is a property of the room type or outdoor
tile set. Audio scales with the asset library rather than requiring a
separate music system.

Full audio design (adaptive soundtrack, era-appropriate music, ambient
sound design) is a separate workstream documented outside this system
design. The architecture supports it through the audio_cue field on
WorldObject and the ambient_audio_cue field on Room.

23\. Milestones

> **✅ Decision:** *Milestones are aspirational accomplishments tracked
> \> across the player's life and across all playthroughs*

Milestones are the great moments and achievements of a life. They are
partially visible to the player --- milestone names are discoverable but
how to achieve them is not explicitly stated. This gives completionists
something to chase across many lives without scripting any individual
one.

23.1 Milestone Categories

-   **Life milestones** --- Became a parent, Got married, Graduated
    college, Got a driver's license, First kiss, Bought a house

-   **Career milestones** --- Made a billion dollars, Became CEO, Got
    elected president, Published a novel, Started a business

-   **Physical milestones** --- Ran a marathon, Climbed a mountain,
    Lived to 90, Lived to 100

-   **Social milestones** --- Made a best friend, Threw a party, Gave a
    speech, Helped a stranger

-   **Dark milestones** --- Went to prison, Filed for bankruptcy, Got
    divorced, Lost a parent

-   **Rare milestones** --- Went to space, Won a Nobel Prize, Became
    famous, Witnessed a historic event

23.2 Milestone Linking

Milestones link to each other forming achievement chains. 'Became a
Parent' links to 'Watched Your Child Graduate' links to 'Became a
Grandparent.' 'Got a Driver's License' links to 'Bought a Car' links to
'Road Trip.' These chains create implicit goal paths that reward
sustained engagement across a life and across multiple playthroughs.

23.3 Milestone Browser UI

The player can view their milestones via the phone journal. The UI
shows:

-   **Current life achievements** --- milestones unlocked in this
    playthrough with timestamps and room links

-   **Total achievements** --- all milestones ever unlocked across all
    playthroughs

-   **Achievement chains** --- linked milestones showing progress
    through related accomplishment paths

-   **Locked milestones** --- visible by name, category shown,
    requirements hidden. Fog-of-war discovery.

Milestones are checked by the check_milestones() Haiku call after room
compression. They appear in the journal, feed into the legacy summary at
death, and persist in a cross-playthrough save file.

> *The full milestone list (100+ entries) with categories, descriptions,
> chains, and unlock criteria is maintained in a separate Milestone
> Reference Document.*

23.4 Milestone Schema

  ----------------------------------- -----------------------------------
  **\*\*Field\*\***                   **\*\*Description\*\***

  \*\*id\*\*                          String --- unique milestone
                                      identifier

  \*\*name\*\*                        String --- display name, e.g. 'Made
                                      a Billion
  ----------------------------------- -----------------------------------

Dollars'

**category** MilestoneCategory --- life \\\| career \\\| physical

\\\| social \\\| dark \\\| rare

**description** String --- flavor text shown on unlock

**linked_milestones** String\\\[\\\] --- IDs of related milestones
forming

achievement chains

**achieved** Boolean --- whether this milestone has been

reached in the current life

**achieved_at** world_date \\\| null --- when it was reached

**room_id** UUID \\\| null --- the room where it was achieved

**cross_playthrough** Boolean --- whether this milestone has ever been

reached across all lives

**times_achieved** Number --- how many playthroughs have reached

this milestone

24\. Ghost Mode

> **✅ Decision:** *Ghost mode is a curated playback, not a full replay*

After the player dies, the game enters Ghost Mode --- a read-only
memorial traversal of the player's life. A single Haiku call to
curate_ghost_playlist() selects an ordered list of room IDs from the
full linked list.

24.1 Room Selection Logic

  ----------------------------------- -----------------------------------
  **\*\*Category\*\***                **\*\*Inclusion Rule\*\***

  \*\*LifeEvent rooms\*\*             Always included --- mandatory.
                                      These are the
  ----------------------------------- -----------------------------------

spine of the memorial.

**Milestone rooms** Rooms where milestones were achieved are

included.

\*\*LocationRegistry One representative visit per location.

rooms\*\*

\*\*High emotional Rooms with absolute emotional_valence \\\> 0.8 that

valence outliers\*\* did not reach LifeEvent threshold.

**Repeated rooms** Only shown once, or if a LifeEvent occurred

there.

24.2 Playback

The player's sprite is visible in ghost mode --- you watch yourself
live. You are not playing. You are witnessing. Ghost mode renders with a
subtle visual treatment --- slightly desaturated, different ambient
light. Same room objects, different atmosphere. There is no interaction.
There is no end state. It runs until the player closes the game.

24.3 Legacy Summary

On completion of ghost mode, a legacy summary is generated --- not a
score, but a narrative paragraph that captures the shape of the life
lived. The legacy is shareable. It references achieved milestones, key
relationships, career trajectory, and the emotional arc of the life.
Replayability comes from wanting a different legacy.

25\. Persistence & Storage

> **✅ Decision:** *IndexedDB as primary storage --- localStorage for \>
> session metadata only*

  ----------------------------------- -----------------------------------
  **\*\*Store\*\***                   **\*\*Contents\*\***

  \*\*IndexedDB\*\*                   Full linked list of room objects,
                                      character

  roster, LocationRegistry,           conversation threads, milestone
  LifeContext,                        progress

  \*\*localStorage\*\*                Current room pointer, API key,
                                      player name,
  ----------------------------------- -----------------------------------

current stats snapshot, compression level setting

**JSON export** Full save serialized to downloadable file.

Player-owned backup and portability.

**Checkpoints** Up to 5 full IndexedDB snapshots at player-chosen

room positions. Enables life forking.

> **✅ Decision:** *API key stored client-side --- never touches a game
> \> server\* \> \> ✅ Decision: \*BYOK (Bring Your Own Key) --- link to
> Anthropic \> provided in-game*
>
> *The player provides their own Anthropic API key. All LLM calls are
> made client-side. The player owns their cost and their privacy. The
> pacing preference gives indirect control over API usage --- 'live
> fast' costs less per life, 'live slowly' costs more.*

26\. Content Guardrails

Content safety is enforced at four layers: system prompt constraints,
harness-level gates, output validation, and rendering restrictions. The
full specification is maintained in the companion Content Guardrails
Document. Key principles summarized here.

> **✅ Decision:** *Three-tier content model: Prohibited, Gated, \>
> Unrestricted*

-   **Prohibited** --- never generated: sexual content involving minors,
    non-consensual sexual interaction, violence against children, animal
    cruelty, graphic torture, explicit hate speech/slurs

-   **Gated** --- requires harness state checks before LLM is called:
    sexual interaction (ConsentGate with dual path for new encounters vs
    established relationships), violence (relationship state gated with
    criminal justice consequences), substance use (age-gated with
    health/addiction consequences)

-   **Unrestricted** --- simulated with consequences: death, conflict,
    poverty, addiction, crime, political content, controversial choices

> **✅ Decision:** *Age-tiered interaction model*

-   **Under 13** --- no romantic content, no substance use, no graphic
    violence in any room

-   **13-17** --- physical affection (kissing) permitted between
    age-appropriate peers (max 2-year gap). Sexual interaction
    hard-locked until 18. Substance use available with consequences.

-   **18+** --- full content palette minus prohibited content.
    ConsentGate enforced for all sexual interaction.

> **✅ Decision:** *Adult-minor protection: no romantic/sexual \>
> AffectionState values tracked between adults and minors\* \> \> ✅
> Decision: \*Demon self-harm exclusion: self-harm options \> silently
> never appear. Help rooms weighted when crisis patterns \> detected.\*
> \> \> ✅ Decision: \*Harassment blocking: persistent unwanted contact
> \> triggers character blocking --- permanent relationship severance\*
> \> \> ✅ Decision: \*Power dynamic flags: boss-employee,
> teacher-student, \> guard-prisoner, doctor-patient relationships gated
> during active power \> imbalance\* \> \> ✅ Decision: \*Fade to black
> for all sensitive life events --- \> restraint is the aesthetic*
>
> *Full content guardrails specification including ConsentGate schemas,
> age-tier matrices, enforcement layer details, and edge case handling:
> see Content Guardrails Document.*
>
> *Prompt injection defense, input sanitization, and LLM security
> architecture: see Security Design Document.*

27\. Cost & Caching

  ----------------------- ----------------- ----------------- -------------------
  **\*\*Component\*\***   **\*\*Per Room**  **\*\*Per Room**  **\*\*Notes\*\***

  (uncached)\*\*          (cached)\*\*                        

  Room generation         \\\~\\\$0.055     \\\~\\\$0.015     LifeContext

  (Sonnet)                prefix cached                       

  All Haiku calls         \\\~\\\$0.009     \\\~\\\$0.004     Character

  contexts cached         per room                            

  Per room total          \\\~\\\$0.064     \\\~\\\$0.019     

  80 rooms (fast          ---               \\\~\\\$1.50-3    1-2 hour
                                            total             

  life)                   playthrough                         

  150 rooms (full         ---               \\\~\\\$3-6 total 2-3 hour

  life)                   playthrough                         
  ----------------------- ----------------- ----------------- -------------------

> **✅ Decision:** *LifeContext uses prompt caching with ratcheting \>
> prefix*
>
> *The cached prefix advances forward on every room exit as new
> CompressedRoom entries are appended. Character contexts are
> lazy-loaded per room. The LLM's adaptive pacing naturally optimizes
> cost --- boring stretches compress to year-rooms (cheap), dramatic
> periods expand to week/day-rooms (expensive but narratively
> justified). The pacing preference setting gives players indirect cost
> control.*

28\. Prompt Modding

> **✅ Decision:** *Single prompt registry, moddable by players in Phase
> \> 4*

The prompt registry uses versioned .md files with YAML frontmatter.
Players can drop custom prompt files into a designated directory. The
prompt loader picks them up at build time. All modded LLM output must
pass Zod schema validation before touching the harness --- mods can add
flavor but cannot corrupt game state.

Moddable surfaces: room generation prompts, job types, world event
definitions, character archetypes, milestone definitions. The
architecture supports this from day one since the prompt registry is
already file-based and versioned.

29\. Multiplayer (Future)

> **✅ Decision:** *Fully isolated single-player for launch. Data model
> \> designed to support future character import.*

The Character schema and CompressedRoom format are serializable and
importable. This architectural decision preserves the option for
asynchronous life sharing --- importing a friend's character as an NPC
in your world --- without building multiplayer infrastructure now. No
multiplayer code ships in Phase 1-4.

30\. Open Questions

-   Meta-compression --- how is LifeContext summarized when
    compressed_history grows too large?

-   Session persistence --- autosave frequency, crash recovery strategy

-   EmulatorJS ROM licensing for era-appropriate game-within-game
    minigames

-   Minigame scope ceiling --- what is realistically generatable
    one-shot in TypeScript?

-   Child Nature stat seeding --- does the child inherit from player and
    partner Nature stats?

-   World event seeding --- historical events from birth year,
    LLM-generated fictional events, or both?

-   Room aging module --- time warp mechanic for revisited locations
    showing passage of time

-   Ghost mode visual treatment --- exact rendering approach for
    memorial atmosphere

-   Character visual aging --- how does the player sprite change over
    decades?

-   Demon tuning --- exact lethality curves, probability distributions,
    near-miss frequency

-   Beat system calibration --- optimal N values per life stage,
    staleness counter decay rates

-   Off-screen event generation --- optimal density per compression
    level, journal formatting

-   Milestone list curation --- full list of 100+ milestones across all
    categories

-   Audio asset pipeline --- sound effect sourcing, ambient loop
    creation, object-audio mapping

-   Financial tuning --- exact interest rates, late fee percentages,
    bankruptcy recovery timeline, salary scales by career tier

-   Investment depth --- stocks, savings accounts, or just lump-sum
    assets?

-   Insurance granularity --- health, car, home separately or
    abstracted?

-   Tax simulation --- calculated per-room or invisible income modifier?

-   Inheritance mechanics --- asset transfer when wealthy relatives die

-   Gambling/lottery --- income path? Ties to addiction predisposition

-   Scholarship system --- merit-based, need-based, or both?

-   Inflation modeling --- does the era\'s economy affect prices over a
    lifetime?

-   Localization --- multi-language scope, LLM output language handling

-   Performance budgets --- frame budget, IndexedDB ceiling over an
    80-year playthrough, LLM token cost per session

-   Steam Workshop integration for prompt mods

> *Asset vocabulary, room generation prompts, and full object taxonomy:
> see Asset Taxonomy & Room Generation Reference document.*
>
> *Tech stack, dev environment, coding methodology, and git workflow:
> see Production Document.*
>
> *Financial system, housing, education, time model, health, and
> accessibility: see Economy & Life Progression Design document.*
>
> *Security, content guardrails, NPC behavior, interaction systems, room
> fabrication, and game config: see companion documents.*
