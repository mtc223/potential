**Life Simulator**

Master Configuration Reference

*v1.0 · Companion to System Design Document*

**1. Overview**

This document defines every tunable value in Life Simulator as a single
master configuration file. All gameplay parameters --- movement speeds,
interaction radii, NPC behavior timing, room generation limits, Demon
lethality curves, pacing intervals, UI layout proportions, and content
safety thresholds --- are centralized here. No magic numbers exist in
source code. Every numeric constant traces back to this config.

The config file lives in packages/shared/config/game-config.ts. It is
typed, readonly (as const), and importable by every package in the
monorepo. The harness reads interaction radii and safety values. The
renderer reads UI layout and overlay dimensions. The agent reads cost
limits and pacing values. All from one file.

> **✅ Decision:** *All tunable gameplay values centralized in a single
> typed configuration file. No magic numbers in source code.*

Player settings override specific config values at runtime. The config
provides defaults; player settings provide adjustments. Settings are a
strict subset of the config --- players can modify text speed and pacing
preference but not interaction radii or safety thresholds.

**2. Movement**

Movement uses sub-tile precision. Each 32px tile contains a 32x32
internal grid of discrete movement points, giving smooth joystick-driven
movement within a tile-based world. Movement speed is defined per life
stage and modified by health, terrain, and temporary states.

**2.1 Sub-Tile Resolution**

  ---------------------- ------------------ -----------------------------
  **Parameter**          **Value**          **Notes**

  sub_tile_resolution    32                 Points per tile axis. 32x32
                                            grid within each tile.

  Effective grid (16x12  512 x 384          Sub-tile coordinates for a
  room)                                     medium room.

  Coordinate system      Global sub-tile    Position (0,0) is top-left of
                                            room.
  ---------------------- ------------------ -----------------------------

**2.2 Base Speed by Life Stage**

Speed is measured in sub-tile units per frame at 60fps. A value of 3.0
means the character traverses approximately one tile every 10-11 frames,
or about 6 tiles per second.

  ---------------------- ------------------ -----------------------------
  **Life Stage**         **Base Speed**     **Animation Style**

  Toddler                1.5                Wobbly walk cycle

  Child                  2.5                Energetic, slightly bouncy

  Teen                   3.0                Standard walk

  Young Adult            3.0                Standard walk

  Adult                  3.0                Standard walk

  Middle Aged            2.8                Slightly slower

  Senior                 2.2                Slower, optional cane
                                            animation
  ---------------------- ------------------ -----------------------------

**2.3 Speed Modifiers**

Speed modifiers stack multiplicatively on the base speed. Current speed
= base_speed \* product(all modifier multipliers). A floor of 0.3x
prevents characters from being completely immobilized.

  ---------------------- ------------------ -----------------------------
  **Modifier Source**    **Range**          **Duration**

  Age                    0.5 -- 1.0         Permanent per life stage

  Health                 0.3 -- 1.0         Continuous, derived from
                                            health stat

  Terrain                0.5 -- 1.0         While on terrain tile (sand,
                                            mud, snow)

  Furniture              0.5                Permanent while equipped
  (cane/walker)                             

  Injury                 0.4 -- 0.8         Duration set by injury event

  Urgency (NPC only)     1.0 -- 1.3         While NPC has urgent intent
  ---------------------- ------------------ -----------------------------

> min_speed_multiplier: 0.3
>
> speed_modifier_health_curve: \'linear\'

**3. Interaction Radii**

Two primary radii govern entity-to-entity awareness. Interaction radius
determines when the player can engage. Earshot radius determines when
characters can hear speech. Collision checking only activates within
interaction radius to save computation.

> **✅ Decision:** *Collision checking only triggers within interaction
> radius. No sprite overlap computation for distant entities.*

  ---------------------------------- --------------- -------------- ---------------------
  **Parameter**                      **Value         **Equivalent   **Purpose**
                                     (sub-tile       (tiles)**      
                                     units)**                       

  object_interact_radius             48              \~1.5          Distance at which
                                                                    player can interact
                                                                    with objects

  character_interact_radius          64              \~2.0          Distance at which
                                                                    player can interact
                                                                    with characters

  earshot_radius                     160             \~5.0          Distance at which
                                                                    characters can hear
                                                                    speech

  collision_check_radius             48              \~1.5          Only check sprite
                                                                    collision within this
                                                                    range

  proximity_trigger_default_radius   80              \~2.5          Default NPC
                                                                    conversation trigger
                                                                    distance

  speech_propagation_radius          192             \~6.0          How far player speech
                                                                    carries for reaction
                                                                    evaluation
  ---------------------------------- --------------- -------------- ---------------------

> proximity_trigger_facing_required: true

**4. NPC Behavior**

NPC behavior timing controls how alive the room feels. These values
balance realism against computational cost (each ambient tick may
produce a batched Haiku call).

  ----------------------------- ------------------ -------------------------
  **Parameter**                 **Value**          **Notes**

  path_deviation_max            4 sub-tile units   Random wander from
                                                   calculated path for
                                                   natural walking

  idle_fidget_interval_ms       3000               How often idle NPCs shift
                                                   weight, look around,
                                                   blink

  behavior_tick_rate_ms         16                 \~60fps behavior queue
                                                   execution

  random_action_interval_ms     15000              How often NPCs do
                                                   something unprompted
                                                   (ambient tick)

  approach_speed_multiplier     0.8                NPCs walk slightly slower
                                                   than player by default

  batched_eval_max_characters   8                  Max NPCs evaluated in
                                                   single ambient Haiku call

  npc_response_delay_ms         500                Natural pause before NPC
                                                   responds to player
  ----------------------------- ------------------ -------------------------

**5. Room Generation**

**5.1 Size Templates**

Rooms select from a constrained set of size templates rather than
arbitrary dimensions. The LLM picks the template that fits the narrative
context.

  --------------- --------------- --------------- -------------------------
  **Template**    **Width         **Height        **Typical Use**
                  (tiles)**       (tiles)**       

  tiny            10              8               Bathroom, closet, car
                                                  interior

  small           12              10              Bedroom, small office,
                                                  doctor exam room

  medium          16              12              Living room, classroom,
                                                  restaurant

  large           20              15              Warehouse, gym, large
                                                  office floor

  wide            24              12              School hallway, street,
                                                  highway

  tall            12              18              Stairwell, elevator
                                                  shaft, narrow alley
  --------------- --------------- --------------- -------------------------

**5.2 Generation Limits**

  ----------------------------- ------------------ -------------------------
  **Parameter**                 **Value**          **Notes**

  max_objects                   40                 Maximum WorldObjects per
                                                   room

  max_characters                8                  Maximum NPCs per room

  layout_render_resolution      256 x 192 px       Low-res preview for
                                                   vision layout pass

  fabrication_timeout_ms        60000              Total room fabrication
                                                   budget (1 minute)

  max_haiku_calls_per_room      12                 Cost ceiling for
                                                   supporting LLM calls

  max_sonnet_calls_per_room     2                  Generation + optional
                                                   layout refinement

  prompt_cache_prefix_advance   true               Ratcheting cache on room
                                                   exit
  ----------------------------- ------------------ -------------------------

**6. Demon**

The Demon\'s influence scales with age, health, and behavioral patterns.
These values tune how aggressively the Demon steers toward danger.

**6.1 Base Lethality by Life Stage**

  ------------------ ------------------ ---------------------------------
  **Life Stage**     **Base Lethality** **Rationale**

  Child              0.01               Rooms available to children are
                                        inherently low-risk

  Teen               0.03               Driving, risk-taking behaviors
                                        begin

  Young Adult        0.05               Full world access, moderate
                                        baseline

  Adult              0.08               Accumulated risks, workplace
                                        hazards

  Middle Aged        0.12               Health events begin, higher
                                        stakes

  Senior             0.25               Exponential increase, world
                                        closing in
  ------------------ ------------------ ---------------------------------

**6.2 Lethality Modifiers**

  ----------------------------- --------------- -----------------------------
  **Parameter**                 **Value**       **Effect**

  health_lethality_multiplier   2.0             At critical health, Demon
                                                influence doubles

  reckless_behavior_bonus       0.1             Added when
                                                behavioral_patterns include
                                                reckless tags

  luck_seed_variance            0.15            +/- random variance from
                                                nature stat luck seed

  near_miss_probability         0.3             Chance of near-miss narrative
                                                vs actual danger on
                                                interaction
  ----------------------------- --------------- -----------------------------

**7. Pacing**

**7.1 Beat Intervals by Life Stage**

The beat system checks for narrative stagnation after N low-variance
rooms. These intervals control how quickly the system nudges toward
disruption.

  ------------------ --------------------- ------------------------------
  **Life Stage**     **Beat Interval       **Rationale**
                     (rooms)**             

  Childhood          3                     Life is naturally eventful for
                                           children

  Teens              5                     Volatility is expected

  Twenties           5                     Rapid change is normal

  Thirties/Forties   8                     Stability is realistic, longer
                                           tolerance

  Fifties            6                     Mortality awareness, family
                                           milestones

  Sixties+           5                     Health events create natural
                                           beats
  ------------------ --------------------- ------------------------------

**7.2 Idle Nudge Timing**

  --------------------------- ------------------ -------------------------
  **Parameter**               **Value**          **Notes**

  idle_nudge_first_seconds    120                First inner monologue
                                                 nudge to exit room

  idle_nudge_repeat_seconds   60                 Subsequent nudges after
                                                 first

  wait_fast_forward_rate      6                  NPC behavior speed
                                                 multiplier during wait
                                                 action
  --------------------------- ------------------ -------------------------

**8. Conversation**

  ---------------------------- ------------------ -------------------------
  **Parameter**                **Value**          **Notes**

  streaming_chars_per_second   30                 Dialogue box text
                                                  appearance speed

  tap_to_complete              true               Player can tap to skip to
                                                  end of current message

  choice_timeout_seconds       null               No timeout --- player
                                                  decides at their own pace

  max_dialogue_length          300                Characters per single
                                                  dialogue bubble

  npc_response_delay_ms        500                Natural pause before NPC
                                                  responds
  ---------------------------- ------------------ -------------------------

**9. Screen Overlays**

Computer, phone, and TV screens render as modal overlays within the game
viewport. The game world remains visible around the overlay borders,
dimmed to maintain spatial context.

  ------------- ----------- ----------- ------------- --------------------
  **Screen      **Width     **Height    **Border      **Style**
  Type**        (%)**       (%)**       Radius (px)** 

  Computer      80%         75%         16            Large rounded
                                                      rectangle

  Phone         40%         70%         24            Narrow tall
                                                      rectangle, centered

  TV            70%         50%         8             Wide rectangle,
                                                      upper portion
  ------------- ----------- ----------- ------------- --------------------

> backdrop_dim: 0.4

**10. Content Safety**

  -------------------------------- ------------------ -------------------------
  **Parameter**                    **Value**          **Notes**

  max_dialogue_input_chars         500                Player dialogue input cap

  max_name_chars                   50                 Character name cap

  max_search_query_chars           200                In-game browser search
                                                      cap

  content_classifier_retry_limit   3                  Max regeneration attempts
                                                      on flagged content

  minor_age_threshold              18                 Age below which minor
                                                      protections apply

  peer_romance_max_age_gap         2                  Max year gap for
                                                      minor-minor romance
  -------------------------------- ------------------ -------------------------

**11. UI Layout**

The screen is divided into three horizontal bands: top
(stats/monologue), middle (game viewport), and bottom
(controls/dialogue).

  ------------------------ ------------ ------------- ---------------------------
  **Parameter**            **Mobile**   **Desktop**   **Notes**

  top_band_height_pct      10%          10%           Inner monologue ticker +
                                                      health/hunger bars

  bottom_band_height_pct   22%          12%           Touch controls need more
                                                      space than keyboard hints

  game_viewport            \~68%        \~78%         Fills remaining space
                                                      between bands
  ------------------------ ------------ ------------- ---------------------------

> game_viewport_fill: true

**12. Player Settings Override**

Players can modify a strict subset of the configuration. Settings
override config values at runtime. Settings are stored in localStorage
alongside the API key.

  ------------------- ---------------------- -----------------------------------------
  **Setting**         **Options**            **Config Value Affected**

  text_speed          slow \| normal \| fast conversation.streaming_chars_per_second

  pacing_preference   slow \| normal \| fast pacing.compression_level + LLM signal

  controls            touch \| keyboard \|   UI layout mode, bottom band content
                      controller             

  high_contrast       boolean                Renderer palette + text contrast

  screen_reader       boolean                Accessibility overlay

  reduced_motion      boolean                Animation speed + transition effects
  ------------------- ---------------------- -----------------------------------------

*See System Design Document for architecture. See Room Design Document
for fabrication pipeline. See NPC Design Document for behavior system.*
