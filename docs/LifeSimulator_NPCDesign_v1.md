**Life Simulator**

NPC Design Document

Unified Character Model · Behavior System · Ambient Intelligence ·
Conversation Triggers

*v1.0 · Companion to System Design Document*

**1. Design Philosophy**

NPCs are the other people in the player's world. They are not
quest-givers, not dialogue trees, not scripted sequences. They are
characters with intents, memories, and behavioral patterns who happen to
be controlled by an LLM instead of a joystick. The goal is for every NPC
to feel like they have a life outside the player's awareness --- because
within the game's epistemology, that's exactly what they have:
compressed memories that imply lives.

The core insight: the LLM is a tool-use controller. Just as the player
uses a joystick and buttons to control their character, the LLM uses
behavior primitives and the Room Interaction SDK to control NPCs. The
player character and every NPC share the same data type, the same
movement system, the same interaction capabilities. The only difference
is the input source.

> **✅ Decision:** *Player and NPCs share a unified Character type. The
> distinction is input_source ('player' \| 'ai' \| 'remote'), not data
> shape.*

**2. Unified Character Model**

Every entity that can move, speak, interact with objects, and have
relationships uses the Character type. This includes the player, all
NPCs, and future remote characters. The renderer, collision system,
interaction system, and content guardrails operate on Character objects
without knowing or caring which one the player controls.

**2.1 Character Schema**

  -------------------------- ---------------------- ---------------------------------
  **Field**                  **Type**               **Description**

  id                         UUID                   Globally unique identifier

  name                       String                 Display name

  age                        Number                 Current age, advances with world
                                                    clock

  life_stage                 LifeStage enum         infant \| child \| teen \|
                                                    young_adult \| adult \| senior

  input_source               InputSource enum       player \| ai \| remote --- THE
                                                    distinguishing field

  position                   SubTileCoord           Current position in sub-tile
                                                    coordinates

  facing                     Direction              up \| down \| left \| right

  collision_shape            CollisionShape         Physical body for sprite overlap
                                                    detection

  interaction_radius         Number                 Sub-tile units --- engagement
                                                    range

  earshot_radius             Number                 Sub-tile units --- hearing range

  base_speed                 Number                 Sub-tile units per frame

  current_speed              Number                 base_speed \*
                                                    product(speed_modifiers)

  speed_modifiers            SpeedModifier\[\]      Age, health, terrain, injury,
                                                    urgency multipliers

  animation_state            AnimationState         idle \| walking \| running \|
                                                    interacting \| sitting

  behavior_queue             NPCBehavior\[\]        Queued actions (empty for player)

  idle_actions               WeightedAction\[\]     Random ambient behaviors (empty
                                                    for player)

  intent                     String                 What this character is trying to
                                                    accomplish in current room

  nature_stats               NatureStatBlock        Immutable traits seeded at
                                                    creation

  nurture_stats              NurtureStatBlock       Environmentally shaped internal
                                                    signals

  behavioral_patterns        String\[\]             Recurring behavior tags

  health                     Number                 0.0 to 1.0

  hunger                     Number                 0.0 to 1.0

  connection_types           ConnectionType\[\]     Relationship roles with player

  relationship_status        RelationshipStatus     Current relationship label

  affection_state            AffectionState         Attraction, trust, respect,
                                                    resentment, awareness, intimacy

  memory_of                  Record\<UUID,          Asymmetric memories of other
                             CompressedRoom\[\]\>   characters

  social_connections         UUID\[\]               Who they know --- reputation
                                                    propagation graph

  personality                PersonalityProfile     Attachment style, openness,
                                                    humor, values, communication

  backstory                  String                 Generated life history

  current_emotional_state    EmotionalState         Current mood, affects
                                                    receptiveness

  sprite_sheet               SpriteSheetConfig      Layered: body + hair + clothing +
                                                    accessories

  persistence                PersistenceType        ephemeral \| recurring

  parent_child_flag          Boolean                True for player's children

  availability_for_romance   Boolean                Enforced by LLM context, never by
                                                    UI
  -------------------------- ---------------------- ---------------------------------

**2.2 Player Character vs NPC Character**

The player character is a Character where input_source is 'player'. Its
behavior_queue and idle_actions are empty because input comes from the
joystick and buttons. Its intent is derived from LifeContext and player
actions, not LLM-authored.

An NPC is a Character where input_source is 'ai'. Its behavior_queue is
populated at room generation time. Its intent is LLM-authored per room.
Its idle_actions provide ambient behavior between queued actions.

  --------------------- ------------------------ ------------------------
  **Field**             **Player Character**     **NPC Character**

  input_source          player                   ai

  behavior_queue        Empty --- input from     Populated at room
                        controls                 generation

  idle_actions          Empty --- player decides Weighted random actions
                        idle behavior            between queue items

  intent                Derived from             LLM-authored per room
                        LifeContext + actions    

  memory_of             Full compressed history  Selective asymmetric
                        via LifeContext          memory

  speed_modifiers       Health, age, terrain     Health, age, terrain,
                                                 urgency
  --------------------- ------------------------ ------------------------

**2.3 Player Metadata --- LifeContext**

The player has additional meta-state that does not fit on the Character
type: life events, compressed history, location registry, world events,
lethality, and pacing preference. This lives in LifeContext, which
references the player Character by ID.

LifeContext is the "life layer" on top of the "character layer." An NPC
does not have a LifeContext --- they have a Character with a backstory
and memories. The player has both.

> **✅ Decision:** *LifeContext references the player Character by ID
> but lives as a separate object. The Character type is not overloaded
> with player-specific meta-state.*

**3. NPC Behavior System**

NPC behavior is a queue of primitives executed in sequence. The LLM
populates this queue at room generation time based on the character's
intent and the room's situation. Between queued items, NPCs pick from
weighted idle actions. The queue can be interrupted by player
interaction, room events, or reactive triggers.

**3.1 Behavior Primitives**

  ---------------------- ---------------------- -----------------------------
  **Primitive**          **Parameters**         **Description**

  idle                   duration_seconds,      Stand in place, play idle
                         facing                 animation, face direction

  go_to_object           target_object_id,      Pathfind to object, execute
                         then: NPCAction        action on arrival

  go_to_tile             target: {col, row},    Pathfind to specific tile
                         then: NPCAction        coordinate

  go_to_character        target_character_id,   Pathfind to another character
                         then: NPCAction        

  interact_with_object   object_id, animation   Play interaction animation
                                                with specified object

  speak                  dialogue,              Display dialogue bubble. null
                         target_character_id \| target = speaking to room
                         null                   

  wander                 radius_tiles,          Random walk within radius of
                         duration_seconds       current position

  follow_player          min_distance           Maintain distance from
                                                player, follow movement

  leave_room             exit_direction         Walk to exit door and despawn

  sit                    furniture_id           Anchor to chair/bench, play
                                                sitting animation

  face_player            ---                    Turn to face player's current
                                                position

  emote                  emote_type             Play emotion animation:
                                                laugh, cry, sigh, shrug, nod
  ---------------------- ---------------------- -----------------------------

**3.2 NPCAction (on-arrival actions)**

When a movement primitive (go_to_object, go_to_tile, go_to_character)
completes, the then field specifies what the NPC does upon arrival:

  ------------------ ----------------------------------------------------
  **Action**         **Description**

  idle               Stand at destination

  interact           Interact with the target object

  speak              Speak a line of dialogue

  face_player        Turn toward the player

  sit                Sit in nearby furniture
  ------------------ ----------------------------------------------------

**3.3 Behavior Queue Example**

A supervisor in a warehouse break room:

> \[
>
> { type: \'go_to_object\', target: \'folding_table_1\', then: \'sit\'
> },
>
> { type: \'idle\', duration_seconds: 15, facing: \'down\' },
>
> { type: \'speak\', dialogue: \'Alright, schedule changes\...\',
> target: null },
>
> { type: \'go_to_object\', target: \'coffee_machine\', then:
> \'interact\' },
>
> { type: \'idle\', duration_seconds: 10, facing: \'left\' },
>
> { type: \'go_to_object\', target: \'time_clock\', then: \'interact\'
> },
>
> { type: \'leave_room\', exit_direction: \'right\' }
>
> \]

The supervisor enters, sits at the table, waits, announces schedule
changes, gets coffee, checks the time clock, and leaves. The player can
interact with them at any point in this sequence --- the queue pauses
during conversation and resumes after.

**3.4 Queue Interruption**

The behavior queue pauses when:

• The player initiates conversation with this NPC --- queue pauses,
conversation runs, queue resumes on completion.

• A reactive trigger fires (see Section 5) --- reactive behavior
sequence is inserted at the front of the queue.

• The NPC's emotional state changes dramatically (e.g. witnessing
violence) --- queue is flushed and replaced with a reactive sequence.

The queue does NOT pause for ambient events or other NPCs' actions
unless those events directly involve this character.

**4. Ambient Intelligence**

NPCs should not freeze after their scripted behavior queue empties.
Between queued actions and after the queue is exhausted, NPCs exhibit
ambient life through weighted random actions and periodic LLM
evaluation.

**4.1 Idle Actions**

Every NPC is generated with a weighted list of idle behaviors. These are
personality-driven: an anxious character fidgets more, a social
character wanders toward other NPCs, a focused character stays at their
object.

Between behavior queue items and after the queue empties, the NPC picks
from idle_actions by weight. Selection fires every
random_action_interval_ms (default 15 seconds from config).

  ---------------- -------------------------- ---------------------------
  **Example        **Idle Actions             **Personality Basis**
  Character**      (weighted)**               

  Anxious office   fidget (4), check_phone    High anxiety, low
  worker           (3), glance_at_door (2),   confidence
                   sigh (1)                   

  Social bartender wander_to_patron (3),      High extroversion, high
                   wipe_counter (3), hum (2), social skill
                   speak_ambient (2)          

  Focused teacher  write_on_board (4),        High conscientiousness,
                   read_book (3),             task-oriented
                   idle_at_desk (3)           

  Restless child   wander (4),                High energy, high curiosity
                   interact_random_object     
                   (3), speak_to_nearest (2), 
                   run (1)                    
  ---------------- -------------------------- ---------------------------

**4.2 Batched Ambient Evaluation**

The ambient tick fires on a regular interval
(random_action_interval_ms). Rather than making individual Haiku calls
per NPC, a single batched call evaluates all NPCs in the room
simultaneously.

> **✅ Decision:** *One Haiku call evaluates all NPCs per ambient tick.
> Not every NPC needs to act on every tick. The LLM decides who does
> something and who stays idle.*

The batched prompt includes: room situation, all character states, what
each character has been doing, and the player's current activity. The
LLM returns a list of (character_id, behavior_sequence) pairs for
characters who would naturally do something at this moment. Most ticks,
only 1--2 characters act. Many ticks, nobody acts. The room breathes.

Cost management: the batched call runs at most once per
random_action_interval_ms (15 seconds). With a typical room lasting 2--5
minutes of player time, that's 8--20 ambient calls per room. At Haiku
rates, this is negligible.

**4.3 NPC-to-NPC Interaction**

Characters should interact with each other, not just with the player.
Two coworkers chat by the water cooler. Kids play together on the
playground. A parent calls a sibling to dinner. These interactions make
the world feel inhabited.

NPC-to-NPC interaction is generated by the batched ambient evaluation.
The LLM identifies pairs of characters who would naturally interact
(within earshot_radius of each other, compatible intents or social
connections) and generates a brief exchange. Both characters execute the
interaction: one approaches, speaks, the other responds. The exchange is
2--4 lines of dialogue, displayed as speech bubbles above the
characters.

The player can observe NPC-to-NPC conversations from a distance. If the
player walks into earshot during an NPC conversation, they "overhear" it
--- the dialogue is displayed in the monologue ticker as "You overhear
Marcus telling Sarah about\..." This overheard content feeds into
LifeContext as social awareness.

**5. Conversation Triggers**

Conversations between the player and NPCs are triggered by three
mechanisms: proximity, player speech, and room events.

**5.1 Proximity Trigger**

The LLM defines a conversation_trigger_radius per character at room
generation time. When the player's position comes within this radius,
and the character's intent supports conversation, dialogue fires.

  ------------------ --------------- ------------------------------------
  **Field**          **Type**        **Description**

  character_id       UUID            Which NPC this trigger belongs to

  trigger_type       TriggerType     proximity \| event \| timed \|
                                     player_initiated

  radius_tiles       Number          Override of default
                                     proximity_trigger_default_radius

  trigger_once       Boolean         Fires once then disarms, or
                                     repeatable with cooldown

  cooldown_seconds   Number \| null  Minimum time between repeat triggers

  opening_line       String          First thing the NPC says when
                                     triggered

  requires_facing    Boolean         Player must be facing the NPC for
                                     trigger to fire

  interruptable      Boolean         Can the player walk away
                                     mid-conversation

  precondition       String \| null  Condition expression:
                                     'player_has_not_talked_to_boss'
  ------------------ --------------- ------------------------------------

Not every NPC has a proximity trigger. Background NPCs (pedestrians,
other students, distant coworkers) are set dressing with no trigger. The
LLM decides which characters are conversation-active based on the
situation and their intent.

**5.2 Speech Trigger**

When the player speaks (using the Speak button) or says something during
a conversation, NPCs within earshot_radius evaluate whether to react.
This is how conversations ripple through a room.

Implementation: when the player speaks, the existing
character_response() Haiku call for the current conversation partner
includes additional context: "The following characters can hear this
conversation: \[Character B, intent: waiting for apology, resentment:
0.7\]. Should any of them react?" The LLM evaluates relevance as part of
the response --- one call, multiple character evaluations.

If a nearby character reacts, their behavior queue is interrupted with a
reactive sequence: walk toward the conversation, interject with
dialogue, potentially join the conversation as a participant. A parent
overhears their child arguing with a sibling. A coworker catches wind of
gossip. A stranger takes offense at something said loudly.

**5.3 Event Triggers**

Room events (an object breaking, a loud sound, a character arriving or
leaving, violence) can trigger NPC reactions. Each character can have
event-specific reactive behaviors defined at room generation time.

> if_event: \'loud_noise\' → \[go_to_source, speak \'What was that?\'\]
>
> if_event: \'player_violence\' → \[emote: shock, flee_to_exit \|
> call_for_help\]
>
> if_event: \'character_crying\' → \[go_to_character, speak \'Are you
> okay?\'\]

Event triggers are personality-dependent. A brave character approaches
danger. A fearful character flees. A compassionate character comforts.
An indifferent character ignores. The LLM generates event-trigger
mappings at character casting time based on personality profiles.

**6. NPC Movement**

NPCs use the same sub-tile movement system as the player. They pathfind
using A\* on the walkable_map at tile granularity, then walk along the
path at sub-tile resolution with the same collision checking.

**6.1 Pathfinding**

A\* runs on the tile-level walkable_map. The path is a sequence of
tiles. The NPC walks between tile centers at sub-tile resolution, with
slight random deviation (path_deviation_max from config) to avoid
robotic straight-line walking.

If the path is blocked (another NPC is in the way), the NPC waits
briefly (1--2 seconds), then recalculates. If still blocked after 3
attempts, the NPC gives up on the current behavior and advances to the
next item in the queue.

**6.2 Movement Speed**

NPC speed uses the same base_speed + speed_modifiers system as the
player. Default NPC speed is slightly slower than the player
(approach_speed_multiplier: 0.8 from config) so the player always feels
faster than the crowd. NPCs with urgent intents get a 1.0--1.3 urgency
modifier.

**6.3 Movement Patterns**

  --------------- ------------------------------ -------------------------
  **Pattern**     **Description**                **Used For**

  Stationary      No movement. NPC stays at      Seated characters,
                  placed position.               cashiers, receptionists

  Scripted path   Follow behavior queue          Characters with
                  destinations in order          structured sequences

  Wander          Random walk within radius of   Background NPCs, children
                  origin point                   at play

  Patrol          Walk between fixed waypoints   Security guards,
                  in a loop                      janitors, teachers on
                                                 rounds

  Follow          Maintain distance from target  Clingy friend, child
                  character                      following parent, pet

  Flee            Move away from threat toward   Reactive to violence,
                  nearest exit                   danger, fear
  --------------- ------------------------------ -------------------------

**7. NPC Object Interaction**

NPCs can interact with objects in the room just as the player can. The
teacher writes on the chalkboard. The barista makes coffee. The mechanic
uses the hydraulic lift. These interactions make the world functional
--- objects are not just player-facing props.

> **✅ Decision:** *Every interactable object in the asset taxonomy
> defines NPC interaction animations alongside player interaction
> definitions. The same object serves both controllers.*

When an NPC executes an interact_with_object behavior, the NPC walks to
the object, faces it, and plays the NPC-specific interaction animation.
The object's state may change as a result: the chalkboard goes from
blank to written, the coffee machine goes from idle to brewing, the file
cabinet goes from closed to open.

NPC object interactions are visual and ambient --- they do not trigger
RoomEvents or stat changes unless the interaction is story-significant
(e.g. the boss reviewing your performance review on the computer).
Story-significant NPC interactions are flagged in the behavior queue.

**8. Conversation System Integration**

When a conversation begins (via proximity trigger, player-initiated, or
speech trigger), the control state shifts from explore to dialogue. The
conversation uses the existing character_response() Haiku call with
streaming output, displayed in the Pokemon dialogue box aesthetic.

**8.1 Conversation Flow**

1\. Trigger fires (proximity, speech, or player presses Talk).

2\. NPC behavior queue pauses.

3\. NPC faces player (or approaches if triggered by speech from
distance).

4\. Opening line displays in dialogue box (streaming,
character-by-character).

5\. Player can respond via Speak button (keyboard input) or select from
generated choices.

6\. character_response() Haiku call generates NPC reply based on player
input, character state, and conversation history.

7\. Loop continues until: player walks away (if interruptable),
conversation reaches natural end, or NPC ends it (resentment high,
availability drops, intent elsewhere).

8\. NPC behavior queue resumes. Conversation is logged as a Conversation
object linked to the room.

**8.2 Multi-Party Conversations**

When a speech trigger brings a second NPC into an ongoing conversation,
the conversation becomes multi-party. The character_response() call
receives all participants' states and the conversation history. Each NPC
takes turns responding based on relevance and personality --- a shy
character waits, an assertive character interjects, a hostile character
escalates.

The dialogue box shows the current speaker's name. The player can direct
responses to specific characters by selecting them when multiple
participants are present.

**9. NPC Lifecycle Across Rooms**

Characters persist across rooms through the relationship graph and
compression system. An NPC encountered in room 5 may reappear in room 30
with memories of everything that happened between them and the player.

**9.1 Persistence Types**

  --------------- ------------------------------ -------------------------
  **Type**        **Description**                **Examples**

  Ephemeral       Exists only in the room where  Strangers, pedestrians,
                  generated. No memory carried   one-time service workers
                  forward.                       

  Recurring       Persists in the relationship   Family, friends,
                  graph. Memories compressed     coworkers, romantic
                  across rooms.                  partners, rivals
  --------------- ------------------------------ -------------------------

Persistence is not explicitly flagged by the LLM at creation time. It
emerges from compression encoding depth. If a character is mentioned in
compressed history, they become recurring. If they fade from compressed
history, they become effectively ephemeral. The system does not need an
explicit persistence flag --- memory IS persistence.

**9.2 Character State Evolution**

On room exit, update_character_states() runs as a batched Haiku call.
Every character present in the room has their state updated based on
what happened: affection_state changes, memory_of entries appended,
emotional_state shifted, behavioral_patterns potentially updated. This
is the character compression step --- the NPC's experience of this room
distilled into state changes that persist.

*See System Design Document for Character schema, AffectionState, and
relationship mechanics. See Room Design Document for character casting
and placement. See Game Config Document for NPC behavior timing values.*
