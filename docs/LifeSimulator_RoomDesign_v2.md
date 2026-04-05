**Life Simulator**

Room Design Document

Room Object Schema · Fabrication Pipeline · Layout Composition ·
Interaction Model · Character Scripting

*v2.0 · Companion to System Design Document*

**1. Overview**

This document is the definitive reference for what a room IS and how a
room is BUILT. It contains the complete Room object schema (the data
structure that represents a room), the fabrication pipeline (how that
data structure is assembled), the layout composition system, the
interaction model, and the character scripting system that brings rooms
to life.

A room is the atomic unit of gameplay. Every moment the player
experiences exists inside a Room object. The Room contains everything
needed to render, interact with, and compress that moment: the physical
space, the objects in it, the characters present, their scripted
behaviors, the ambient progression, and the generated code for
interactive surfaces.

**2. Room Object Schema**

The Room object is the complete data structure that defines a playable
space. It is written to IndexedDB on generation and updated as the
player interacts with the room. On room exit, the compressed field is
populated and the room becomes part of the linked list history.

This schema supersedes Section 5.4 of the System Design Document with
additional fields for the fabrication pipeline, ambient progression,
character scripting, generated code execution, and room mutations.

**2.1 Core Identity**

  --------------------- ---------------- ---------------------------------
  **Field**             **Type**         **Description**

  id                    UUID             Globally unique identifier

  type                  RoomType enum    home \| school \| work \|
                                         hospital \| car \| park \| street
                                         \| blank \| \... Full enum in
                                         Asset Taxonomy

  sequence_index        Number           Position in the linked list (0 =
                                         birth room)

  timestamp_generated   ISO8601          When the room was created
                                         (real-world time)

  player_age            Number           Fractional years at time of room
                                         generation (e.g. 4.5)

  world_date            ISO8601          Calendar date in the game world.
                                         Anchors era, payroll, event
                                         timestamps.

  duration              RoomDuration     day \| week \| month \| year.
                        enum             Selected by LLM based on
                                         narrative density.
  --------------------- ---------------- ---------------------------------

**2.2 Linked List Pointers**

  --------------------- ---------------- ---------------------------------
  **Field**             **Type**         **Description**

  prev_room_id          UUID \| null     Previous room in linked list.
                                         null only for birth room.

  next_room_id          UUID             Next room. Always set; defaults
                                         to BlankRoom UUID until
                                         generated.

  entry_type            RoomEntryType    player_initiated \|
                                         pipeline_generated \|
                                         world_forced \| demon_forced
  --------------------- ---------------- ---------------------------------

**2.3 Narrative & Context**

  ------------------------ ---------------- ---------------------------------
  **Field**                **Type**         **Description**

  situation                String           What is happening in this room.
                                            Populates NPC behavior and
                                            ambient dialogue. Rooms present,
                                            never prescribe.

  predicted_player_arc     String           Spatial narrative prediction:
                                            what would a reasonable person do
                                            here? Informs layout, not
                                            gameplay.

  background_description   String           What the LLM was instructed to
                                            render. Debug/audit field.

  ambient_mood             AmbientMood      Lighting, time of day, weather
                                            (if outdoor). Drives visual
                                            rendering.

  ambient_audio_cue        String           Audio environment description,
                                            e.g. \'suburban kitchen
                                            morning\', \'busy warehouse
                                            afternoon\'.
  ------------------------ ---------------- ---------------------------------

**2.4 Physical Space --- RoomLayout**

The layout defines the physical room: dimensions, tiles, objects,
collision, and entry/exit points.

  ------------------ --------------------- ---------------------------------
  **Field**          **Type**              **Description**

  dimensions         { width, height }     Room size in tiles. Selected from
                                           size_templates in Game Config.

  size_template      SizeTemplate enum     tiny \| small \| medium \| large
                                           \| wide \| tall

  floor_tiles        TileGrid (2D array)   Tile IDs for floor layer.
                                           Dynamically composed from tile
                                           vocabulary.

  wall_tiles         TileGrid (2D array)   Tile IDs for wall layer. Includes
                                           doors, windows.

  ceiling_tiles      TileGrid \| null      Tile IDs for ceiling layer. null
                                           for outdoor rooms.

  objects            ObjectPlacement\[\]   All furniture and props placed on
                                           tile coordinates. See Section 3.

  walkable_map       boolean\[\]\[\]       Collision grid at tile
                                           resolution. Complement of all
                                           object footprints + walls.

  entry_tile         { col, row }          Left wall. Where the player
                                           spawns on room entry.

  exit_tiles         ExitTile\[\]          Right wall only. Trigger tiles
                                           that transition to next room.
  ------------------ --------------------- ---------------------------------

**2.5 Characters**

  ----------------------- ------------------------- ---------------------------------
  **Field**               **Type**                  **Description**

  characters              Character\[\]             Full Character objects for every
                                                    entity present in room. Uses
                                                    unified Character type (see NPC
                                                    Design Document).

  character_placements    CharacterPlacement\[\]    Starting positions, facing
                                                    directions, and movement patterns
                                                    for each character.

  conversation_triggers   ConversationTrigger\[\]   Proximity and event triggers for
                                                    NPC conversations. See NPC Design
                                                    Document.

  character_scripts       CharacterScript\[\]       2-minute directed behavior
                                                    scripts per character. See
                                                    Section 4.
  ----------------------- ------------------------- ---------------------------------

**2.6 Interactions & Generated Code**

  ------------------------- -------------------- ---------------------------------
  **Field**                 **Type**             **Description**

  generated_code            String \| null       One-shot TypeScript/JSX for
                                                 room-specific interactions. Runs
                                                 in sandboxed iframe. See
                                                 Interaction Systems Document.

  context_apps              GeneratedApp\[\]     MinigameKit configs or React
                                                 components for computer/phone
                                                 context apps.

  interaction_definitions   InteractionDef\[\]   Per-object interaction specs:
                                                 type, content, SDK calls.
                                                 Generated alongside objects.
  ------------------------- -------------------- ---------------------------------

**2.7 Ambient Progression**

  -------------------------- ------------------ ---------------------------------
  **Field**                  **Type**           **Description**

  ambient_events             AmbientEvent\[\]   Timed events that fire during the
                                                room session. NPC dialogue,
                                                sounds, state changes, arrivals,
                                                departures.

  story_complete_condition   String \| null     Condition expression for when the
                                                room\'s scripted content is
                                                exhausted. Triggers idle nudges.
  -------------------------- ------------------ ---------------------------------

**2.8 State Tracking (populated during gameplay)**

  ------------------ ------------------ ---------------------------------
  **Field**          **Type**           **Description**

  events             RoomEvent\[\]      Actions and choices that occurred
                                        during player\'s visit.
                                        Append-only during session.

  conversations      Conversation\[\]   Conversation objects initiated in
                                        this room.

  mutations          RoomMutation\[\]   Live room changes triggered by
                                        player actions or dialogue.

  stat_snapshot      StatSnapshot       Player stats at time of room
                                        EXIT. Written on exit.
  ------------------ ------------------ ---------------------------------

**2.9 Compression & Demon**

  ------------------ ------------------ ---------------------------------
  **Field**          **Type**           **Description**

  life_event_flag    Boolean            True if this room produced a
                                        LifeEvent on compression. Set
                                        after exit.

  compressed         CompressedRoom \|  Null while player is in room.
                     null               Written on exit before N+1
                                        selection.

  demon_target       DemonTarget \|     The object tagged by the Demon
                     null               for this room. null if Demon did
                                        not act.
  ------------------ ------------------ ---------------------------------

**2.10 RoomEvent Schema**

  --------------------- ---------------- -----------------------------------
  **Field**             **Type**         **Description**

  event_id              UUID             Unique identifier

  type                  EventType enum   dialogue \| choice \| item \|
                                         minigame \| cutscene \|
                                         work_activity \| death \| mutation
                                         \| crime

  description           String           What happened

  player_choice         String \| null   What the player chose, if
                                         applicable

  outcome               String           Result of the event

  score                 Number \| null   Numeric output for measurable
                                         activities (work, minigames)

  timestamp             Number           Seconds into room session when this
                                         event occurred

  characters_involved   UUID\[\]         Character IDs affected by this
                                         event
  --------------------- ---------------- -----------------------------------

**3. ObjectPlacement Schema**

Every object placed in a room is an ObjectPlacement. This extends the
WorldObject model from the System Design Document with spatial data,
interaction definitions, and collision shapes specific to room
placement.

  --------------------- -------------------- ---------------------------------
  **Field**             **Type**             **Description**

  object_id             UUID                 Unique identifier for this placed
                                             instance

  asset_id              String               Reference to asset taxonomy
                                             entry. The LLM selects from the
                                             vocabulary, never generates new
                                             assets.

  position              { col, row }         Tile coordinates for object
                                             anchor point

  sub_tile_offset       { x, y } \| null     Optional sub-tile precision
                                             offset from tile center

  facing                Direction            Which direction the object faces
                                             (relevant for desks, chairs,
                                             screens)

  collision_shape       CollisionShape       Physical body at sub-tile
                                             resolution: rect, circle, or
                                             polygon

  interaction_radius    Number               Sub-tile units. How close the
                                             player must be to interact.

  narrative_role        NarrativeRole        story (part of the situation) \|
                                             dressing (ambient set piece)

  interactable          Boolean              Whether this object has player
                                             interaction options

  interaction_type      InteractionType \|   examine \| use \| talk_to \|
                        null                 pick_up \| give \| eat \| drink
                                             \| sit \| lie_down

  interaction_content   InteractionContent   What happens on interaction:
                        \| null              text, SDK call, MinigameKit
                                             config, conversation ID

  npc_interaction       NPCInteraction \|    How NPCs interact: animation
                        null                 name, state change on object,
                                             duration

  state                 Record\<string,      Object-specific mutable state:
                        any\>                door open/closed, TV channel,
                                             whiteboard content

  audio_cue             String \| null       Sound associated with this object
                                             on interaction or ambient

  lethality_modifier    Float \| null        Baseline danger level. Fed to the
                                             Demon. null for safe objects.

  variant               String \| null       Visual variant of the asset:
                                             color, wear level, era-specific
                                             model
  --------------------- -------------------- ---------------------------------

**3.1 InteractionContent**

The interaction_content field defines what happens when the player (or
an NPC) interacts with the object. It varies by interaction_type:

  --------------- -------------------------- -----------------------------
  **Interaction   **Content Structure**      **Example**
  Type**                                     

  examine         { text: String }           \"A dusty family photo from
                                             the 90s. Mom looks young.\"

  use             { sdk_call: String,        sdk.triggerEvent({ type:
                  params: Object }           \'work_activity\', \... })

  use (computer)  { app_id: String,          Opens computer screen overlay
                  context_app: GeneratedApp  with work app
                  }                          

  talk_to         { character_id: UUID }     Initiates conversation with
                                             character_response()

  pick_up         { item: ItemObject }       Item added to inventory,
                                             object removed from room

  eat / drink     { hunger_delta: Number,    Restores hunger/hydration,
                  hydration_delta: Number }  consumable removed

  sit / lie_down  { anchor_position:         Player anchors to furniture,
                  SubTileCoord,              wait action enabled
                  wait_available: Boolean }  
  --------------- -------------------------- -----------------------------

**3.2 CollisionShape**

Collision shapes are defined in sub-tile coordinates (0--31) anchored to
the object's tile origin. They determine physical overlap detection when
entities move within interaction radius.

  --------------- -------------------------- -----------------------------
  **Shape Type**  **Parameters**             **Typical Use**

  rect            { x, y, w, h }             Desks, tables, cabinets, beds
                                             --- most furniture

  circle          { cx, cy, radius }         Round tables, barrels,
                                             planters, fountains

  polygon         { points: \[x,y\]\[\] }    L-shaped counters, irregular
                                             furniture, partial walls
  --------------- -------------------------- -----------------------------

**4. Character Scripts --- Directed Behavior**

Every character placed in a room receives a directed behavior script at
generation time. The script is a 2-minute choreographed sequence that
brings the character's intent to life spatially. It includes movement,
object interactions, dialogue, and pauses. The script is what makes the
room feel alive on entry --- the teacher is giving a lesson, the barista
is making coffee, the coworker is on the phone.

> **✅ Decision:** *Each character receives a \~2-minute directed script
> at room generation. Scripts include idle pauses (sleep periods) that
> create natural rhythm. If the player interrupts, the queue is popped
> and regenerated after the conversation ends.*

**4.1 Script Structure**

A CharacterScript is a behavior queue with timing. It is generated by a
Haiku call during the character casting stage of the fabrication
pipeline. The LLM receives the character's intent, the room situation,
and the object manifest, and produces a sequence of behavior primitives
with durations that total approximately 2 minutes.

  ------------------------ -------------------- ---------------------------------
  **Field**                **Type**             **Description**

  character_id             UUID                 Which character this script
                                                belongs to

  total_duration_seconds   Number               Target script duration. \~120
                                                seconds for primary characters,
                                                \~60 for secondary.

  behavior_queue           NPCBehavior\[\]      Sequenced behavior primitives
                                                with idle pauses

  idle_actions             WeightedAction\[\]   Random ambient behaviors for
                                                after the script completes

  loop                     Boolean              Whether the script repeats after
                                                completing (e.g. security guard
                                                patrol)

  interrupt_regenerate     Boolean              If true, regenerate remaining
                                                script after player conversation.
                                                Default true.
  ------------------------ -------------------- ---------------------------------

**4.2 Script Example --- Teacher Giving a Lesson**

> character: \'Ms. Patterson\', intent: \'Teach history class\'
>
> total_duration: \~120 seconds
>
> behavior_queue: \[
>
> { type: \'go_to_object\', target: \'teacher_desk\', then: \'idle\' },
>
> { type: \'speak\', dialogue: \'Good morning class. Open your books to
> chapter 7.\', target: null },
>
> { type: \'idle\', duration_seconds: 5, facing: \'down\' },
>
> { type: \'go_to_object\', target: \'chalkboard\', then: \'interact\'
> },
>
> { type: \'speak\', dialogue: \'The Civil War began in 1861\...\',
> target: null },
>
> { type: \'idle\', duration_seconds: 8, facing: \'down\' },
>
> { type: \'speak\', dialogue: \'Can anyone tell me what caused the
> first shots?\', target: null },
>
> { type: \'idle\', duration_seconds: 12, facing: \'down\' }, // pause
> for class response
>
> { type: \'go_to_character\', target: \'student_npc_1\', then:
> \'face_player\' },
>
> { type: \'speak\', dialogue: \'Good answer, Marcus.\', target:
> \'student_npc_1\' },
>
> { type: \'go_to_object\', target: \'chalkboard\', then: \'interact\'
> }, // writes more
>
> { type: \'idle\', duration_seconds: 15, facing: \'down\' }, //
> extended teaching
>
> { type: \'speak\', dialogue: \'Read the next two pages quietly.\',
> target: null },
>
> { type: \'go_to_object\', target: \'teacher_desk\', then: \'sit\' },
>
> { type: \'idle\', duration_seconds: 30, facing: \'down\' }, // quiet
> reading period
>
> { type: \'speak\', dialogue: \'Alright, who has questions?\', target:
> null },
>
> { type: \'idle\', duration_seconds: 10, facing: \'down\' },
>
> \]
>
> idle_actions: \[
>
> { weight: 3, action: { type: \'idle\', duration: 8, facing: \'down\' }
> }, // sit at desk
>
> { weight: 2, action: { type: \'interact_with_object\', object_id:
> \'book\' } }, // flip pages
>
> { weight: 1, action: { type: \'go_to_object\', target: \'chalkboard\'
> } }, // check board
>
> \]

The idle pauses (5s, 8s, 12s, 15s, 30s, 10s) are critical. They create
natural rhythm --- the teacher isn't a machine gun of dialogue, she
pauses, she waits for responses, she gives the class quiet time. The
pauses are also when the player is most likely to act: walk up to talk
to the teacher, talk to a classmate, examine something on their desk, or
just sit and listen.

**4.3 Script Interruption & Regeneration**

When the player initiates conversation with a scripted character, the
script is interrupted:

1\. The current behavior in the queue is abandoned (if mid-movement, the
NPC stops).

2\. The NPC faces the player.

3\. The conversation runs via character_response() as normal.

4\. On conversation end, the remaining script is evaluated:

--- If interrupt_regenerate is true (default): a lightweight Haiku call
regenerates the remaining script based on what just happened in the
conversation. The teacher adjusts her lesson based on the player's
question. The coworker changes their plans after the chat.

--- If interrupt_regenerate is false: the script resumes from the next
queued behavior, ignoring the interruption. Used for characters whose
script is independent of player interaction (background NPCs, characters
on the phone).

The regeneration call is fast (\~3 seconds) because it only generates
the remaining portion of the script, not the full 2 minutes. The Haiku
prompt includes: character intent, what happened in the conversation,
remaining time budget, and the current room state.

**4.4 Script Duration by Character Role**

  ---------------------- --------------- ---------------------------------
  **Role**               **Script        **Rationale**
                         Duration**      

  Primary NPC (teacher,  \~120 seconds   Central to room situation. Full
  boss, parent at                        choreography with dialogue.
  dinner)                                

  Secondary NPC          \~60 seconds    Supporting role. Shorter
  (coworker, classmate,                  sequence, more idle after.
  sibling)                               

  Background NPC         \~30 seconds    Set dressing. Brief scripted
  (pedestrian, distant                   action, then idle or wander.
  student)                               

  Ambient NPC (crowd,    0 seconds       No script. Only weighted random
  traffic)               (idle_actions   behaviors.
                         only)           
  ---------------------- --------------- ---------------------------------

**4.5 Multi-Character Script Coordination**

When multiple characters are in a room, their scripts can reference each
other. The teacher speaks to a student. Two coworkers have a scripted
exchange by the water cooler. A parent calls the family to dinner. These
coordinated moments are generated as paired behavior entries across
character scripts.

The character casting Haiku call generates all character scripts
simultaneously, so it can coordinate timing: Student NPC's script
includes "answer teacher's question at timestamp \~40 seconds" to align
with the teacher's script pause at that point. This coordination creates
scripted ensemble scenes that feel organic.

**5. Fabrication Pipeline**

A room passes through ten stages from candidate seed to playable state.
The pipeline is designed for a one-minute total fabrication budget.
Stages are sequenced to maximize parallelism.

> **✅ Decision:** *Room fabrication uses a render-and-refine loop with
> vision feedback for layout quality. The extra Sonnet vision call is
> justified by the quality improvement to spatial composition.*

**5.0 Candidate Selection**

Already specced in System Design Document. select_candidates() produces
8 weighted room concepts from LifeContext. One is selected. Output:
RoomType, situation premise, duration. This is the seed.

**5.1 Story Expansion (Sonnet, \~8--12 seconds)**

The seed is handed to Sonnet with the full LifeContext. This is
typically combined with Stages 2 and 3 into a single Sonnet call. The
LLM produces: situation, predicted_player_arc, duration, ambient_mood,
object manifest, and size_template.

**5.2 Room Scaffolding (Deterministic, \<1 second)**

Walls, doors, floor tiles placed by template rules. Entry door on left
wall, exit door on right. Large anchor furniture placed by RoomType
templates.

**5.3 Object Manifest**

Produced as part of the Stage 1 Sonnet call. A list of ObjectPlacement
definitions: asset_ids from the taxonomy, narrative roles, interaction
types, and interaction content. Each object is fully specified before
layout begins.

**5.4 Layout Composition --- Render-and-Refine Loop**

**Pass 1 --- Structural Placement (\~5 seconds)**

Deterministic. Walls, doors, floor tiles, and anchor furniture placed by
template rules. These are high-confidence placements.

**Pass 2 --- Render Snapshot + LLM Object Placement (\~15--20 seconds)**

Structural skeleton rendered to a 256x192 pixel image. Sent to Sonnet
vision with the remaining object manifest and situation. The LLM outputs
(col, row) coordinates and facing direction for each remaining object.

**Pass 3 --- Collision Validation + Pathfinding (\~1 second)**

Deterministic. Compute walkable_map. Run A\* from entry to exit and
entry to all interactable objects. If any path fails, nudge blocking
objects.

**Pass 4 --- Optional Refinement (\~10--15 seconds if needed)**

If Pass 3 moved more than 3 objects, re-render and do one more vision
pass to verify spatial coherence.

**5.5 Parallel Stages**

The following stages run concurrently with layout composition:

  --------------------- --------------- -------------- -----------------------------
  **Stage**             **Model**       **Duration**   **Output**

  Character Casting +   Haiku           \~8--10        Characters, scripts (\~2 min
  Scripts                               seconds        each), idle_actions,
                                                       conversation triggers

  Demon Pass            Haiku           \~3 seconds    DemonTarget on one existing
                                                       object

  Generated Code /      Sonnet          \~10 seconds   MinigameKit configs, React
  Context Apps                                         components for screen
                                                       overlays

  Ambient Progression   Haiku           \~3 seconds    Timed ambient events for the
                                                       room session

  Ambient Audio         Deterministic   \<1 second     Audio cues from room type and
  Selection                                            object manifest
  --------------------- --------------- -------------- -----------------------------

**5.6 Character Placement (\~2 seconds)**

After layout and character casting both complete, characters are placed
on the tile grid near objects relevant to their intent. Lightweight
Haiku call reads finalized layout and character intents.

**5.7 Validation**

  ------------------ -------------------------- -------------------------
  **Check**          **Type**                   **Failure Response**

  Schema validation  Zod parse of complete Room Reject and regenerate
                     object                     

  Collision sanity   Player can path entry →    Nudge blocking objects
                     exit and to all            
                     interactables              

  Content            Situation, dialogue,       Strip or regenerate
  classification     interactions scanned       flagged content

  Asset validation   Every asset_id exists in   Replace with fallback
                     taxonomy                   generic asset

  Character          Age gates, AffectionState  Strip invalid
  validation         locks, power dynamics      interactions

  Budget check       Object count ≤ 40,         Trim by narrative_role
                     character count ≤ 8        priority

  Script coherence   Character scripts          Regenerate affected
                     reference valid objects    script
  ------------------ -------------------------- -------------------------

**5.8 Handoff to Renderer**

The complete, validated Room object is written to IndexedDB. The
renderer transitions from the previous room (fade to black) and the
player enters at the entry tile. Character scripts begin executing.
Ambient progression events start their timers.

**6. Object Interaction Model**

**6.1 Interaction Types**

  ------------- ---------------------- ----------------------------------
  **Type**      **Trigger**            **Resolution**

  examine       Player faces object,   Text description appears in
                presses interact       dialogue box

  use           Player faces object,   SDK call executes --- stat change,
                presses interact       event trigger, screen overlay

  talk_to       Player faces           Conversation system activates with
                character, presses     character_response()
                interact               

  pick_up       Player faces item,     Item added to inventory, object
                presses interact       removed from room

  give          Player selects item    Character evaluates item via
                from inventory near    character_response()
                character              

  eat / drink   Player faces           Hunger/hydration restored,
                consumable, presses    consumable removed
                interact               

  sit /         Player faces           Player anchors to furniture, wait
  lie_down      furniture, presses     action available
                interact               
  ------------- ---------------------- ----------------------------------

**6.2 Context Menu**

When multiple interaction types are available for a target (e.g. a desk
can be examined, used, or have items picked up), a small context menu
appears in the bottom band. Single-interaction objects skip the menu and
resolve directly.

When multiple interactable entities are in range, the Interact button
targets the nearest. Press-and-hold (mobile) or modifier key (desktop)
opens a target selector showing all nearby options.

**7. Room Mutation --- Live Context Rebuilding**

Player actions or dialogue can modify the current room. "I want purple
walls" triggers a cosmetic tile swap. "I bought a new couch" triggers an
object addition. Structural changes (knocking down a wall) flag a full
regeneration on next visit.

> **✅ Decision:** *Rooms support live mutation for cosmetic and object
> changes. Structural changes defer to regeneration on re-entry.*

  ------------- -------------------------- ------------------------------
  **Mutation    **Scope**                  **Resolution**
  Type**                                   

  Cosmetic      Tile swaps: wall color,    Live --- tile IDs updated,
                floor material, object     brief fade transition
                variants                   

  Object        Add, remove, or reposition Live --- walkable_map
                a single object            recomputed, brief transition

  Structural    Room layout change, wall   Deferred ---
                modification               regenerate_on_next_visit
                                           flagged
  ------------- -------------------------- ------------------------------

Trigger chain: player speaks or acts → character_response() includes
room_mutation signal → harness evaluates type → cosmetic/object changes
apply immediately → mutation logged as RoomEvent → compressed into room
history. On future visits, the LifeContext includes the change.

**8. Ambient Progression**

Rooms are not static. Events unfold on a timeline whether or not the
player engages. The ambient_events array is generated alongside the room
and creates a living environment.

> **✅ Decision:** *No room timer. Player exits when they walk to the
> exit tile. Ambient progression creates narrative momentum but never
> forces departure.*

  --------------------- ---------------------- -------------------------------
  **Event Type**        **Example**            **Implementation**

  npc_dialogue          Coworker mutters about Speech bubble above NPC, no
                        deadlines              player input

  npc_behavior          Teacher walks to       Behavior queue insertion
                        chalkboard             

  sound                 Coffee machine beeps   Audio cue from object

  inner_monologue       \"This place is        Scrolling ticker in top band
                        depressing.\"          

  object_state_change   TV switches channels   Object variant swap

  character_arrival     Coworker walks in from Character spawns with script
                        entry                  

  character_departure   Supervisor leaves      Character walks to exit,
                        through exit           despawns
  --------------------- ---------------------- -------------------------------

After scripted content is exhausted, idle nudges begin at 120-second
intervals (configurable). The nudges are inner monologue entries that
suggest moving on but never force it.

Wait action: the player can sit in a chair or lie in a bed to
fast-forward NPC scripts and ambient events at 6x speed. Wait breaks on
player input, NPC approach, or player-targeted event.

**9. Pipeline Timing Budget**

  ------------------------ --------------------- -------------------------
  **Stage**                **Duration (est.)**   **Parallelizable**

  Candidate Selection      \~3 seconds           No --- prerequisite

  Story + Manifest         \~8--12 seconds       No --- sequential
  (Sonnet)                                       

  Layout Pass 1            \~0.1 seconds         No
  (deterministic)                                

  Layout Pass 2 (Sonnet    \~15--20 seconds      Yes --- parallel with
  vision)                                        casting

  Layout Pass 3            \~1 second            No
  (collision)                                    

  Character Casting +      \~8--10 seconds       Yes --- parallel with
  Scripts (Haiku)                                layout

  Demon Pass (Haiku)       \~3 seconds           Yes

  Generated Code (Sonnet)  \~10 seconds          Yes

  Ambient Progression      \~3 seconds           Yes
  (Haiku)                                        

  Character Placement      \~2 seconds           No --- after layout +
                                                 casting

  Validation               \~1--2 seconds        No --- final gate

  Handoff                  \<0.1 seconds         No
  ------------------------ --------------------- -------------------------

Critical path: \~28--36 seconds. Well within the 60-second budget.
Parallel stages fill remaining time. The one-minute budget leaves room
for retry on validation failure.

*See System Design Document for linked list architecture, LifeContext,
and compression. See NPC Design Document for unified Character type and
behavior primitives. See Interaction Systems Document for MinigameKit,
code execution, and controls. See Game Config Document for all tunable
values. See Asset Taxonomy Document for object vocabulary.*
