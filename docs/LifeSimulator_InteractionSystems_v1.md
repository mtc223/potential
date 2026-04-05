**Life Simulator**

Interaction Systems Document

Movement · Controls · Screen Layout · MinigameKit · Code Execution ·
Computer & Phone

*v1.0 · Companion to System Design Document*

**1. Movement System**

Movement uses sub-tile precision within a tile-based world. Each 32px
game tile contains a 32x32 internal grid of discrete movement points.
The joystick provides 360-degree input; movement is smooth and
continuous rather than tile-snapping. This is closer to Stardew Valley
than strict Pokemon grid movement, while maintaining the tile-based
world structure for room layout and collision.

> **✅ Decision:** *32 sub-tile points per tile axis. Joystick-driven
> smooth movement with tile-based collision.*

**1.1 Coordinate System**

All positions are expressed in global sub-tile coordinates. Position
(0,0) is the top-left corner of the room. A 16x12 tile room has a
movement grid of 512x384 sub-tile points. The player and all NPCs share
this coordinate system.

Facing direction snaps to the nearest cardinal direction (up, down,
left, right) based on the movement vector. Facing determines which
direction the interact button targets and which walk cycle animation
plays.

**1.2 Collision System**

Every entity in the room has two radii and a collision shape. The radii
determine awareness; the collision shape determines physical overlap.

> **✅ Decision:** *Collision is only checked within interaction_radius.
> No sprite overlap computation for distant entities. This saves
> significant computation on rooms with many objects.*

  ------------- ------------------ ---------------------- ---------------
  **Layer**     **Distance**       **Purpose**            **Check
                                                          Frequency**

  Earshot       \~5 tiles (160     Can this entity hear   On player speak
                sub-tile)          player speech?         action only

  Interaction   \~1.5--2 tiles     Can the player engage  Every frame for
                (48--64 sub-tile)  this entity?           nearby entities

  Collision     Within interaction Are sprites physically Every frame,
                radius             overlapping?           only if moving
                                                          toward entity
  ------------- ------------------ ---------------------- ---------------

Collision shapes are defined per asset in the taxonomy. A desk has a
rectangular collision shape. A round table has a circular shape. A chair
you can walk behind has a partial shape. Objects use sub-tile
coordinates anchored to the object's tile origin.

**1.3 Spatial Bucketing**

For rooms with many entities, a spatial grid partitions the room into
chunks (e.g. 4x4 tile buckets). The frame loop only checks entities in
the same or adjacent buckets as the player. This keeps interaction
checks at O(nearby entities) rather than O(all entities).

**2. Screen Layout**

The screen is divided into three horizontal bands. The game viewport
dominates the center. Stats and inner monologue occupy a thin top band.
Controls and dialogue occupy the bottom band.

> **✅ Decision:** *Three-band layout: top (stats/monologue), middle
> (game viewport), bottom (controls/dialogue). Game viewport fills
> remaining space.*

**2.1 Top Band --- Inner Monologue & Stats**

Height: 10% of screen on both mobile and desktop. Contains two elements:

Scrolling inner monologue ticker --- a horizontal text feed of the
player's internal thoughts, observations, and ambient reactions. Driven
by the pub/sub message queue specified in the System Design Document.
Entries appear from the right and scroll left. The player can tap/click
the ticker to pause and read, then tap again to resume.

HUD stats --- health bar (red) and hunger/hydration bar (green) in the
top-right corner. Small, unobtrusive. These are the only numeric stats
visible to the player.

**2.2 Middle Band --- Game Viewport**

Height: fills remaining space (approximately 68% mobile, 78% desktop).
This is the pixel art room with characters, objects, and tile layers.
The camera follows the player character with slight lead in the movement
direction.

On smaller rooms (tiny, small), the entire room fits in the viewport. On
larger rooms, the camera pans to keep the player centered. The viewport
clips at room boundaries --- no void space visible beyond the room
edges.

Modal overlays (computer, phone, TV screens) render within the game
viewport. The pixel world stays visible but dimmed behind the overlay.
This preserves spatial context --- you're using a computer in a room,
not in an abstract UI.

**2.3 Bottom Band --- Controls & Dialogue**

Height: 22% on mobile (touch controls need space), 12% on desktop
(keyboard hints only). This band is context-sensitive --- it shows
different content based on what the player is doing.

  ------------- ---------------------------------- -----------------------
  **Mode**      **Content**                        **Trigger**

  Explore       Joystick (mobile) + contextual     Default state ---
                buttons: Think, Speak, Interact,   walking around the room
                Cry                                

  Dialogue      Speaker name, streaming text,      Conversation active
                advance button                     with NPC

  Choices       Vertical menu of dialogue options, NPC presents player
                arrow selection                    with options

  Input         Text field + keyboard (mobile) for Player presses Think or
                typing                             Speak button

  Minigame      MinigameKit controls replace       Player uses
                standard controls                  computer/work activity
  ------------- ---------------------------------- -----------------------

**3. Control Tree**

Controls are a shallow tree. The root state is exploration with the
joystick and a small set of contextual buttons. One tap enters a
sub-mode (dialogue, input, minigame). One action returns to exploration.
The player is never more than one interaction away from moving around.

**3.1 Persistent Buttons**

  ------------- ------------------ -------------------------- --------------
  **Button**    **Availability**   **Action**                 **Desktop
                                                              Key**

  Think         Always             Opens text input. Player   T
                                   types internal thought.    
                                   Feeds behavioral_patterns  
                                   and LifeContext as intent  
                                   signal.                    

  Speak         Always             Opens text input. Player   Y
                                   says something aloud.      
                                   Earshot characters         
                                   evaluate. Triggers         
                                   speech-based conversation. 

  Interact      Contextual ---     Label changes to match     E or Space
                near entity        target: 'Talk to Sarah',   
                                   'Use Computer', 'Examine   
                                   Painting'                  

  Cry           Conditional ---    Emotional signal. Inner    C
                extreme stress     monologue reacts. NPCs     
                                   with high trust/intimacy   
                                   may respond.               
  ------------- ------------------ -------------------------- --------------

**3.2 Desktop Controls**

On desktop, the bottom band is a slim panel showing button hints. No
on-screen joystick. Movement is WASD or arrow keys. The keyboard is
always available for text input --- no on-screen keyboard needed. The
bottom band shows: current interact target (if any), button hints, and
the dialogue box when conversation is active.

**3.3 Mobile Controls**

On mobile, the bottom band contains a virtual thumbstick on the left and
action buttons on the right. The thumbstick provides 360-degree analog
input for smooth sub-tile movement. Action buttons are large touch
targets. When text input is needed (Think, Speak), the system keyboard
slides up and the game viewport compresses.

**3.4 Target Selection**

When multiple interactable entities are within interaction_radius, the
Interact button shows the nearest target. If the player presses and
holds (mobile) or taps a modifier key (desktop), a small radial selector
appears showing all nearby targets with labels. The player selects one,
and the interaction resolves with that target.

**4. Computer & Phone as Meta-Objects**

The computer and phone are not simple props. They are portal objects
that open a secondary interaction layer --- a screen overlay within the
game viewport where pre-built apps and LLM-generated content coexist.

> **✅ Decision:** *Computer and phone have base apps (pre-built, always
> stable) and a context app slot (LLM-generated per room). Base apps are
> renderer components. Context apps are generated code running in a
> sandboxed iframe.*

**4.1 Computer Object Schema**

  ------------------ ------------------ ---------------------------------
  **Field**          **Type**           **Description**

  base_apps          BaseApp\[\]        Pre-built apps: browser, file
                                        explorer, games (era-appropriate)

  context_app        GeneratedApp \|    One-shot work app from room
                     null               generation. null if no work
                                        context.

  screen_state       ScreenState        off \| desktop \| app_open

  current_app_id     String \| null     Which app is currently active
  ------------------ ------------------ ---------------------------------

**4.2 Phone Object Schema**

Identical structure to computer. Base apps are the phone apps from the
System Design Document (Contacts, Messages, Photos, Journal, Map, Social
Feed, Dating, Banking). Context apps are room-specific content: social
feed posts from roster characters, dating app profiles, browser pages
relevant to the situation.

Phone apps are containers; content is generated. The Journal app shell
is pre-built. The journal entries are CompressedRoom.narrative strings
from the harness. The Social Feed app shell is pre-built. The posts are
LLM-generated per room.

**4.3 Screen Overlay Rendering**

When the player interacts with a computer or phone, the screen appears
as a rounded rectangle overlay within the game viewport. The game world
remains visible around the borders, dimmed to 40% opacity. The overlay
style varies by device type (see Game Config Document for exact
dimensions and border radii).

The computer screen is a large rounded rectangle covering roughly 80% of
the viewport. The phone screen is a narrow tall rectangle. The TV is a
wide rectangle in the upper portion. All use the Pokemon dialogue-box
aesthetic --- a bezel-like border that frames the screen content.

While a screen is open, the player cannot move. NPC behavior continues
in the background. If an NPC approaches the player during computer use,
a notification appears on the screen overlay: "Marcus is trying to talk
to you." The player can close the screen to engage or ignore the
notification.

**4.4 Work Computer Context Apps**

When the room situation involves work, the room generation pipeline
produces a context app --- a MinigameKit configuration or simple React
component that represents the job's computer activity. The warehouse
computer gets an inventory management app. The office computer gets a
spreadsheet. The school computer gets a research assignment.

The context app is the primary surface for work_activity RoomEvents. The
player opens the computer, selects the work app, completes the activity,
and the score is reported via sdk.reportScore(). The score feeds
compensation, career progression, and boss relationship.

**5. MinigameKit**

The MinigameKit is a class library that provides pre-built game
templates for work activities and interactive sequences. The LLM
generates MinigameKit configurations --- filling in content-specific
data --- rather than writing game logic from scratch. This
template-first approach makes one-shot generation highly reliable.

> **✅ Decision:** *Template-first, custom-last. 80--90% of work
> activities use pre-built templates. The LLM fills in content data, not
> game logic. A Custom escape hatch exists for genuinely novel
> activities.*

**5.1 Pre-Built Templates**

  ----------------------- -------------------------- ---------------------------
  **Template**            **Description**            **Example Work Context**

  TimedTyping             Type prompted text under   Data entry, secretary,
                          time pressure. Speed and   court reporter
                          accuracy scored.           

  SortingTask             Drag items into correct    Warehouse sorting, mail
                          categories. Accuracy and   room, filing
                          speed scored.              

  MemoryMatch             Find matching pairs on a   Quality control, pattern
                          grid. Memory and speed     recognition
                          scored.                    

  ConversationChallenge   Navigate a dialogue        Sales pitch, interview,
                          scenario. Response quality negotiation
                          scored by LLM.             

  ClickPrecision          Click targets in correct   Assembly line, surgical
                          order or quickly. Accuracy assist, lab work
                          scored.                    

  MultipleChoice          Answer questions           Training quiz, exam,
                          correctly. Knowledge       certification
                          scored.                    

  SequenceRepeat          Repeat increasing          Music, dance routine,
                          sequences (Simon-says      recipe following
                          style). Memory scored.     

  DragAndDrop             Place items in correct     Interior design, lab setup,
                          positions. Accuracy        inventory
                          scored.                    

  Slider                  Adjust a value to match a  Calibration, mixing, tuning
                          target. Precision scored.  

  TimedReaction           React to cues as quickly   Sports, driving, emergency
                          as possible. Reaction time response
                          scored.                    
  ----------------------- -------------------------- ---------------------------

**5.2 Template Configuration**

The LLM generates a configuration object, not a program. The template
handles input, rendering, scoring, timing, and the game loop. The LLM
provides content: what to sort, what to type, what questions to ask.

Example --- warehouse box sorting as a SortingTask config:

> MinigameKit.SortingTask({
>
> items: \[
>
> { id: \'pkg1\', label: \'Fragile - Electronics\', sprite:
> \'cardboard_box\' },
>
> { id: \'pkg2\', label: \'Perishable - Food\', sprite:
> \'cardboard_box\' },
>
> \],
>
> categories: \[\'Aisle A\', \'Cold Storage\', \'General\'\],
>
> correct_mapping: { pkg1: \'Aisle A\', pkg2: \'Cold Storage\' },
>
> time_limit_seconds: 60
>
> })

The same SortingTask template with different content becomes a law
office document filing activity, a library book shelving task, or a
kitchen prep organization game. Same tested infrastructure, completely
different narrative context.

**5.3 Sequence Compositor**

A workday can chain multiple templates into a sequence. Scores are
aggregated by average, sum, or minimum.

> MinigameKit.Sequence(\[
>
> MinigameKit.MultipleChoice({ /\* safety quiz \*/ }),
>
> MinigameKit.SortingTask({ /\* sort packages \*/ }),
>
> MinigameKit.TimedTyping({ /\* inventory data entry \*/ }),
>
> \], { break_between: true, aggregate_score: \'average\' })

**5.4 Custom Escape Hatch**

For activities where no template fits, the LLM can write a custom
minigame using a constrained API: setup, update, render, onInput,
isComplete, and getScore functions. These operate on an HTML canvas with
the shared Draw and Audio primitives from MinigameKit. The custom path
is more prone to bugs but is contained by the iframe sandbox --- if it
crashes, the computer screen flickers and goes dark.

**5.5 Shared Primitives**

All templates and custom minigames share a consistent input system,
rendering primitives, and audio hooks. This ensures every minigame feels
visually and aurally consistent with the game world.

  --------------- -------------------------------------------------------
  **System**      **Capabilities**

  Input           onKeyPress, onKeyRelease, onClick, onDrag, cursor
                  position

  Draw            sprite, text, rect, progressBar, timer, scoreDisplay,
                  button --- all using game palette

  Audio           playCorrect, playIncorrect, playComplete, playTick,
                  playClick --- consistent SFX
  --------------- -------------------------------------------------------

**6. Code Execution Environment**

Generated code from room fabrication (work apps, custom minigames,
interactive sequences) runs in a sandboxed iframe. The sandbox provides
stability containment --- if LLM-generated code is buggy, it cannot
crash the game.

> **✅ Decision:** *Generated code runs in an iframe sandbox with
> restricted policies. Communication with the harness is exclusively
> through a postMessage bridge. The generated code never has direct
> harness access.*

**6.1 Sandbox Configuration**

  ------------------ ---------------------- -----------------------------
  **Property**       **Value**              **Rationale**

  sandbox attribute  allow-scripts          Scripts can run, but no
                                            same-origin access, no forms,
                                            no popups

  Communication      MessagePort            All SDK calls proxied through
                     (postMessage)          message bridge

  Timeout            30,000ms hard kill     Prevents infinite loops from
                                            hanging the game

  Injected globals   RoomSDK proxy,         Only the tools needed to
                     MinigameKit, React,    build interactive content
                     Canvas                 
  ------------------ ---------------------- -----------------------------

**6.2 Blocked APIs**

The following browser APIs are not available inside the sandbox:

localStorage, sessionStorage --- no persistence outside harness. fetch,
XMLHttpRequest, WebSocket --- no arbitrary network (see API validation
below). document.cookie --- no cookie access. window.parent, window.top
--- no escape from sandbox. eval, Function constructor --- no dynamic
code generation within generated code.

**6.3 RoomSDK Proxy**

The generated code receives a proxied RoomSDK. Every method call is
serialized through postMessage to the parent frame, where the harness
validates it before executing. The proxy is transparent to the generated
code --- it calls sdk.reportScore(85) and the call routes through the
bridge automatically.

All SDK methods pass through harness validation: updateAffection hits
the AffectionState Lock, triggerEvent hits the content classifier,
presentChoices hits the self-harm filter. The generated code cannot
bypass guardrails because the SDK IS the guardrail.

**6.4 Room Interaction SDK**

  -------------------------------- ------------------------- -------------------------------
  **Method**                       **Returns**               **Description**

  presentChoices(choices)          Promise\<string\>         Show choices in dialogue box,
                                                             return selected ID

  showDialogue(speaker, text)      Promise\<void\>           Display streaming dialogue

  startConversation(characterId)   Promise\<Conversation\>   Initiate conversation with NPC

  triggerEvent(event)              Result\<RoomEvent\>       Log a room event (validated by
                                                             harness)

  updateStat(stat, delta)          Result\<void\>            Modify player stat (validated)

  addBehavioralTag(tag)            Result\<void\>            Add behavioral pattern tag

  updateAffection(charId, field,   Result\<void\>            Modify NPC affection
  delta)                                                     (validated, locked for minors)

  getObjectState(objectId)         WorldObject               Query object state

  getCharacterState(charId)        Character                 Query character state

  getPlayerStats()                 StatSnapshot              Query player stats

  commandNPC(charId, behavior)     void                      Issue NPC behavior command

  renderScreen(component)          void                      Render content in
                                                             computer/phone overlay

  reportScore(activity, score)     void                      Report work activity score

  flagExit()                       void                      Signal room story is complete
                                                             (exit always works regardless)

  validatedFetch(url)              Promise\<Response\>       Network request through URL
                                                             allowlist validation
  -------------------------------- ------------------------- -------------------------------

**7. Public API URL Validation**

Generated code may need to call public APIs for era-appropriate content
(weather, news, stock data). Network access is not blocked entirely but
is validated deterministically against a curated allowlist.

> **✅ Decision:** *Network requests from generated code are validated
> against a curated URL allowlist. The allowlist is versioned in the
> repo. HTTPS only. GET only by default. No private IPs. No localhost.*

**7.1 Validation Flow**

1\. Generated code calls sdk.validatedFetch(url).

2\. Call goes through postMessage bridge to parent frame.

3\. Parent frame parses URL and runs deterministic validation: protocol
check (HTTPS only), private IP check, localhost check, allowlist pattern
match.

4\. If valid, parent frame makes the actual fetch and returns the result
through postMessage.

5\. If invalid, parent frame returns an error. Generated code gets a
clean failure.

The generated code never has access to window.fetch directly. The only
network capability is through the SDK proxy.

**7.2 Allowlist Structure**

  ---------------------------------------- ------------- -----------------------------
  **Pattern**                              **Methods**   **Purpose**

  https://api.openweathermap.org/\*\*      GET           Weather data for ambient
                                                         world building

  https://newsapi.org/\*\*                 GET           Era-appropriate news content

  https://api.exchangerate.host/\*\*       GET           Currency data for banking app

  https://assets.lifesimulator.game/\*\*   GET           Game's own asset CDN
  ---------------------------------------- ------------- -----------------------------

The allowlist is a curated file in the repo, versioned alongside code.
Adding a new API is a one-line PR. Prompt mods cannot modify the
allowlist --- a mod's generated code fails on unlisted URLs. Mod authors
must surface API dependencies explicitly for review.

**7.3 Hard Blocks**

Regardless of allowlist: no HTTP (HTTPS only), no private IP ranges
(10.x, 172.16-31.x, 192.168.x), no localhost, no file:// URIs, no
POST/PUT/DELETE (read-only by default). These are checked before the
allowlist and cannot be overridden.

**8. Failure Modes & Recovery**

Generated code will sometimes fail. The iframe sandbox ensures failures
are contained and recoverable.

  ------------------ --------------------- ------------------------------
  **Failure**        **Detection**         **Recovery**

  Infinite loop      30-second hard        Iframe killed. Screen shows
                     timeout               "screen flickers and goes
                                           dark." Player can close and
                                           reopen.

  Unhandled          window.onerror in     Error caught. Screen shows
  exception          iframe                static or error message.
                                           Logged as RoomEvent.

  Render failure     Blank canvas detected Fallback to text-based
                     after 2 seconds       activity description

  SDK call rejected  Harness validation    Result error returned to
                     fails                 generated code. Generated code
                                           handles or ignores.

  Network timeout    Fetch timeout (10     SDK returns timeout error.
                     seconds)              Generated code should handle
                                           gracefully.

  Invalid            Template constructor  Error thrown at setup.
  MinigameKit config validation            Fallback to simple text
                                           activity.
  ------------------ --------------------- ------------------------------

The player-facing experience of any failure is naturalistic: the
computer screen glitches, goes dark, or shows an error. Within the game
world, technology sometimes breaks. This is a feature, not a bug.

*See System Design Document for WorldObject model and Room schemas. See
NPC Design Document for character behavior and conversation systems. See
Room Design Document for fabrication pipeline. See Game Config Document
for all tunable values. See Security Design Document for content safety
architecture.*
