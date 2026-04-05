**Life Simulator**

**Software Design Document**

WorldObject · Room Linked List · Boundary Contract

v1.0 · Companion to System Design Document

**1. Overview**

Life Simulator maintains two parallel data structures that together
represent the player\'s entire life: the Room linked list and the
WorldObject graph. These structures are stored in separate IndexedDB
tables and serve distinct purposes. Understanding their boundary is the
foundational invariant of the harness.

The Room linked list is the narrative spine. It is append-only,
chronological, and immutable. Each node represents a moment in the
player\'s biography --- a place visited, an event experienced. Rooms
never change once written.

The WorldObject graph is the world state. It is relational and mutable.
Every person, place, institution, asset, relationship, and contract the
player encounters is a WorldObject. Objects are created, updated, and
status-transitioned as life progresses. They are never deleted.

The boundary between them is the location_id foreign key: every Room
record points at exactly one Location WorldObject. This is the only
structural coupling between the two systems. The direction is strictly
one-way --- Rooms reference WorldObjects, WorldObjects have no knowledge
of Rooms.

**2. WorldObject**

**2.1 Purpose**

A WorldObject is the universal base type for every entity in the game
world. Every person, place, institution, asset, relationship, and
contract the player encounters is a WorldObject. The base interface
defines the fields that all subtypes share. Subtype-specific state lives
in the state_data discriminated union.

WorldObjects are never instantiated directly. Every record in
world_objects is a concrete subtype. The object_type field is the
discriminant.

**2.2 Base Interface**

  ------------------------ ------------------ -------------------------------------
  **Field**                **Type**           **Description**

  id                       UUID               Primary key. Assigned by harness at
                                              creation. Never set by LLM.

  object_type              ObjectType         Discriminant for the subtype union.
                                              Determines the shape of state_data.

  subtype                  string             Further classification within a type.
                                              E.g. object_type=\'location\',
                                              subtype=\'home\'.

  label                    string             Human-readable name. E.g. \'Maria\'s
                                              apartment\', \'Acme Corp\'. Used for
                                              harness matching.

  status                   ObjectStatus       active \| inactive \| destroyed \|
                                              pending. Never deleted.

  owner_id                 UUID \| null       The Character WorldObject that owns
                                              this object. Null for unowned public
                                              locations.

  linked_objects           ObjectRef\[\]      Typed references to related
                                              WorldObjects. See Section 2.4.

  location_id              UUID \| null       The Location WorldObject where this
                                              object is situated. Null for
                                              non-physical objects.

  era                      EraTag             The historical era this object
                                              belongs to. Inherited from the Room
                                              that created it.

  player_age_at_creation   number             The player\'s age when this object
                                              first entered the world. Biographical
                                              anchor.

  events                   ObjectEvent\[\]    Append-only log of interactions and
                                              state changes. Compressed on room
                                              transition.

  compressed_summary       string \| null     Narrative summary produced by
                                              compression. Null until first
                                              compression run.

  never_compress           boolean            When true, this object\'s events\[\]
                                              are never compressed. For emotionally
                                              critical objects.

  state_data               subtypeStateData   Subtype-specific payload. Shape
                                              determined by object_type
                                              discriminant.

  seeded                   boolean            Reserved for future use. Always false
                                              --- no seed initialization exists.
  ------------------------ ------------------ -------------------------------------

**2.3 ObjectStatus**

WorldObjects are never deleted from world_objects. They are
status-transitioned. This preserves referential integrity for all Room
records that have ever pointed at them.

  ---------------- ---------------- -------------------------------------
  **Field**        **Type**         **Description**

  active           ObjectStatus     The object exists and is currently
                                    relevant to the player\'s life.

  inactive         ObjectStatus     The object exists but is no longer
                                    active. E.g. a former job, a past
                                    relationship.

  destroyed        ObjectStatus     The object has been permanently
                                    removed from the world. E.g. a
                                    demolished home.

  pending          ObjectStatus     The object has been proposed but not
                                    yet confirmed. Used for LLM-proposed
                                    objects awaiting harness validation.
  ---------------- ---------------- -------------------------------------

**2.4 ObjectRef --- Linkage**

Every WorldObject holds a flat array of typed references to related
WorldObjects. These form the world graph. Refs are never pointer-chased
at write time --- consumers walk linked_objects\[\] and resolve each ref
against world_objects on demand.

  ---------------- ---------------- -------------------------------------
  **Field**        **Type**         **Description**

  id               UUID             The id of the referenced WorldObject.

  object_type      ObjectType       The type of the referenced
                                    WorldObject. Allows filtering without
                                    a db lookup.

  role             string           The semantic relationship. E.g.
                                    \'employs_at\', \'parent_of\',
                                    \'owns\', \'situated_at\'.

  status           RefStatus        active \| inactive. When the
                                    relationship ends, the ref is
                                    tombstoned to inactive in place.
                                    Never removed.
  ---------------- ---------------- -------------------------------------

  ------------ -------------------------------------------------------------
  **✅         Stale refs are tombstoned, not removed. When a WorldObject is
  Decision**   destroyed or a relationship ends, the harness marks the
               relevant ObjectRef status as \'inactive\'. The ref remains in
               linked_objects\[\] permanently. Consumers always filter by
               ref.status === \'active\' when walking the graph. This
               preserves the historical record of what was once connected.

  ------------ -------------------------------------------------------------

**2.5 ObjectEvent**

The events\[\] array is an append-only log of everything that has
happened to or through this WorldObject. It is the raw material for
compression.

  ---------------- ---------------------- -------------------------------------
  **Field**        **Type**               **Description**

  event_type       string                 Tagged category. E.g. \'promotion\',
                                          \'argument\', \'first_visit\',
                                          \'status_change\'.

  player_age       number                 The player\'s age when this event
                                          occurred. Biographical anchor.

  summary          string                 Brief narrative description of the
                                          event. Written by the agent,
                                          validated by harness.

  delta            Partial\<StateData\>   The state_data fields that changed as
                   \| null                a result of this event. Null for
                                          informational events.
  ---------------- ---------------------- -------------------------------------

**2.6 Compression**

WorldObject compression runs on the same heartbeat as Room compression:
every room transition. The harness checks all WorldObjects that were
active during the exited room and runs compression on any whose
events\[\] has grown beyond a threshold or whose last compression was
more than N player-years ago.

  ------------ -------------------------------------------------------------
  **✅         Full compression --- all events\[\] collapse into a single
  Decision**   compressed_summary string. The events\[\] array is cleared
               after compression. The summary is produced by a Haiku call
               and is written back to the WorldObject in a single db update.
               This mirrors the room compression lifecycle exactly.

  ------------ -------------------------------------------------------------

  ------------ -------------------------------------------------------------
  **✅         never_compress: true prevents compression entirely for
  Decision**   emotionally critical objects --- a deceased parent, a lost
               child, a defining relationship. These objects retain their
               full events\[\] forever. The flag is set by the harness,
               never by the LLM.

  ------------ -------------------------------------------------------------

**2.7 Subtype Hierarchy**

All concrete WorldObject subtypes extend the base interface with a typed
state_data payload. The full subtype tree is defined below.
Subtype-specific schemas follow in Section 2.8.

  ---------------- ---------------- -------------------------------------
  **Field**        **Type**         **Description**

  Character        object_type      A person in the world. Subtypes:
                                    Player (unique), NPC. Holds
                                    AffectionState, nature_stats,
                                    behavioral_patterns.

  Location         object_type      A place in the world. Subtypes: home,
                                    work, school, venue, transit. The
                                    bridge between the graph and the
                                    linked list.

  Relationship     object_type      A bond between two Characters.
                                    Subtypes: family, romantic, social.
                                    Holds AffectionState,
                                    connection_type, power_dynamic_flags.

  Institution      object_type      An organisation or civic body.
                                    Subtypes: employer, school,
                                    government, hospital. Has its own
                                    linked_objects graph.

  Asset            object_type      Something owned. Subtypes: property,
                                    vehicle, financial. Has an owner_id
                                    and a value trajectory in state_data.

  Contract         object_type      A binding agreement between parties.
                                    Subtypes: job, lease, loan. Has
                                    start/end conditions, obligations,
                                    and breach consequences.
  ---------------- ---------------- -------------------------------------

**2.8 Subtype State Data**

**Character**

  --------------------- ------------------ -------------------------------------
  **Field**             **Type**           **Description**

  nature_stats          NatureStats        Immutable stats set at birth.
                                           Includes luck_seed, base temperament,
                                           and constitutional traits.

  nurture_stats         NurtureStats       Ambient stats shaped by experience.
                                           Never surfaced as numbers to the
                                           player.

  behavioral_patterns   string\[\]         Tagged behavioral traits accumulated
                                           from play. E.g. \'risk_taker\',
                                           \'generous\', \'bigotry\'.

  affection_states      Map\<UUID,         Per-relationship affection values.
                        AffectionState\>   Keyed by the Relationship WorldObject
                                           id.

  age                   number             Current age. Updated on room
                                           transition.

  health                number             0.0--1.0. Visible HUD bar. Affected
                                           by events.

  hunger                number             0.0--1.0. Visible HUD bar. Affected
                                           by events.
  --------------------- ------------------ -------------------------------------

**Location**

  ---------------- ----------------- -------------------------------------
  **Field**        **Type**          **Description**

  subtype          LocationSubtype   home \| work \| school \| venue \|
                                     transit \| outdoor \| medical \|
                                     institutional

  asset_ids        string\[\]        The asset_ids from the asset taxonomy
                                     that populate this location\'s visual
                                     room.

  habitability     number            0.0--1.0. Degrades with neglect,
                                     improves with maintenance. Affects
                                     room generation weighting.

  ownership_type   string            owned \| rented \| public \|
                                     institutional
  ---------------- ----------------- -------------------------------------

**Relationship**

  --------------------- ---------------------- -------------------------------------
  **Field**             **Type**               **Description**

  character_a_id        UUID                   One party in the relationship. Order
                                               is not meaningful.

  character_b_id        UUID                   The other party.

  connection_type       string                 The nature of the bond. E.g.
                                               \'parent\', \'sibling\', \'partner\',
                                               \'friend\', \'colleague\', \'rival\'.

  affection_state       AffectionState         trust, respect, attraction, intimacy,
                                               resentment. Floats 0.0--1.0.

  power_dynamic_flags   PowerDynamicFlag\[\]   Active power imbalances that gate
                                               certain interactions via ConsentGate.

  relationship_status   string                 current \| ex \| estranged \|
                                               deceased_party \| blocked
  --------------------- ---------------------- -------------------------------------

**Contract (Job subtype example)**

  ------------------ ---------------- -------------------------------------
  **Field**          **Type**         **Description**

  employer_id        UUID             The Institution WorldObject this job
                                      belongs to.

  role_title         string           E.g. \'Software Engineer\',
                                      \'Warehouse Operative\'.

  salary             number           Annual gross. Tracked for economy
                                      system.

  start_age          number           Player age at hire.

  end_age            number \| null   Player age at termination. Null while
                                      active.

  termination_type   string \| null   resigned \| fired \| redundancy \|
                                      retired. Null while active.
  ------------------ ---------------- -------------------------------------

**3. Room Linked List**

**3.1 Purpose**

The Room linked list is the player\'s biography. Every room the player
visits is appended as a new node. The list is singly-linked in the
forward direction --- each node holds a next_room_id pointer. It is
append-only and immutable: rooms are never edited or deleted after
creation.

**3.2 Room Schema**

  ----------------------- ---------------- -------------------------------------
  **Field**               **Type**         **Description**

  id                      UUID             Primary key. Assigned by harness.

  sequence_index          number           Monotonically increasing integer.
                                           Used for list reconstruction and
                                           ordering.

  prev_room_id            UUID \| null     The preceding room in the list. Null
                                           for room 1.

  next_room_id            UUID \| null     The following room in the list. Null
                                           for the current (head) room.

  player_age              number           The player\'s age when this room was
                                           entered.

  location_id             UUID             FK → world_objects. The Location
                                           WorldObject this room is situated in.
                                           Always valid.

  present_character_ids   UUID\[\]         FKs → world_objects. Characters
                                           present in this room at time of
                                           visit.

  active_object_ids       UUID\[\]         FKs → world_objects. Other
                                           WorldObjects active and relevant
                                           during this room.

  events                  RoomEvent\[\]    Append-only log of what happened
                                           during this room visit.

  compressed_summary      string \| null   Narrative summary. Produced on room
                                           exit. Null until compressed.

  era                     EraTag           The historical era of this room.
                                           Propagated to new WorldObjects
                                           created during it.
  ----------------------- ---------------- -------------------------------------

**3.3 Linked List Invariants**

  ------------- -------------------------------------------------------------
  **Invariant   A Room record can never be written with a location_id that
  1**           does not exist in world_objects as an active Location
                WorldObject. The harness validates this at write time. This
                is enforced by write order, not a transaction.

  ------------- -------------------------------------------------------------

  ------------- -------------------------------------------------------------
  **Invariant   The prev_room_id → next_room_id pointer pair must always be
  2**           consistent. Room N\'s next_room_id and Room N+1\'s
                prev_room_id must point at each other. This consistency is
                guaranteed by the RoomCreationTransaction.

  ------------- -------------------------------------------------------------

  ------------- -------------------------------------------------------------
  **Invariant   sequence_index is monotonically increasing and has no gaps.
  3**           It is the fallback for list reconstruction if pointer
                integrity is ever questioned.

  ------------- -------------------------------------------------------------

**4. The Boundary Contract**

**4.1 The Enforced Seam**

The only structural coupling between the Room linked list and the
WorldObject graph is the location_id foreign key on every Room record.
This is the enforced seam. The direction is strictly one-way:

-   Room → Location WorldObject: a Room holds location_id, which it uses
    to resolve the Location at query time.

-   Location → Room: does not exist. A Location WorldObject has no
    knowledge of which Rooms have visited it, or how many.

This asymmetry is load-bearing. It means the WorldObject graph can be
queried, mutated, and reasoned about entirely independently of the
linked list. The linked list is the player\'s history. The graph is the
world\'s current state. They are causally linked but structurally
separate.

**4.2 Write Order Guarantee**

Because a Room cannot reference a non-existent Location, the Location
WorldObject must be written to world_objects before the Room record is
written to rooms. The harness enforces this through write order:

> 1\. resolveLocation(type, label) → locationId // write to
> world_objects if new
>
> 2\. resolveCharacters(proposed) → characterIds // write to
> world_objects if new
>
> 3\. db.rooms.add(newRoom) // location_id now guaranteed valid
>
> 4\. db.rooms.update(prevRoomId, { next_room_id: newRoom.id })

Steps 1 and 2 sit outside any transaction. An orphaned WorldObject ---
one written but never referenced by a Room --- is inert and harmless.
resolveLocation will find it on the next attempt and reuse it.

**4.3 The RoomCreationTransaction**

Steps 3 and 4 are wrapped in a single read-write transaction on the
rooms table. This is the only transaction in the room creation flow.

  ------------ -------------------------------------------------------------
  **✅         The transaction scope is exactly the two Room writes: the new
  Decision**   Room record and the previous Room\'s next_room_id pointer
               update. This guarantees that the linked list pointer always
               advances atomically --- Room N+1 is never reachable without
               Room N pointing at it, and Room N never points forward
               without Room N+1 existing. The player always loads into a
               valid, connected room. This is a guarantee to the player that
               their save is never in a broken state.

  ------------ -------------------------------------------------------------

The rationale for this exact scope: WorldObject creation sits outside
the transaction because an orphaned WorldObject is inert. But a broken
list pointer would strand the player at Room N with no forward path. The
transaction is the minimum necessary guarantee.

Example:

> await db.transaction(\'rw\', \[db.rooms\], async () =\> {
>
> await db.rooms.add(newRoom);
>
> await db.rooms.update(prevRoomId, { next_room_id: newRoom.id });
>
> });

**4.4 Location Resolution**

The harness owns all Location WorldObject identity. The LLM proposes a
location_type and label. The harness resolves whether that maps to an
existing WorldObject or requires creating a new one. The LLM never
writes a UUID.

  ------------ -------------------------------------------------------------
  **✅         Resolution is harness-side, using label + type matching
  Decision**   against active Location WorldObjects. The LLM does not see
               the list of existing Locations and does not choose between
               existing and new. The harness matches on label
               (case-insensitive) and subtype. An exact match returns the
               existing id. No match creates a new Location WorldObject.

  ------------ -------------------------------------------------------------

This means location reuse is the normal case after the first room. The
player\'s bedroom, workplace, and school are stable Location
WorldObjects that hundreds of Rooms will reference over a lifetime. New
Locations are only created when the player genuinely goes somewhere that
has never existed before in their world.

**4.5 Render Resolution Flow**

When the renderer and agent need to assemble context for a room, they
resolve the Room record into a full RenderContext through a sequence of
WorldObject lookups:

> Room record
>
> → Location WorldObject (subtype, asset_ids, habitability)
>
> → present Character WOs (name, affection_state, behavioral_patterns)
>
> → active Object WOs (contracts, assets, institutions in scope)
>
> → compressed_summaries (for inactive/old objects still relevant)
>
> → RenderContext (assembled for LLM prompt + renderer)

All lookups are synchronous Dexie queries against IndexedDB. There is no
in-memory WorldObject cache and no Zustand mirror of the graph. The
session layer (Zustand) holds only the current room id, the API key, and
the player name.

**5. IndexedDB Schema**

**5.1 Tables**

Two tables. One for each structure.

  ---------------- ---------------- -------------------------------------
  **Field**        **Type**         **Description**

  rooms            Dexie table      Primary key: id. Indexed:
                                    sequence_index, player_age,
                                    location_id.

  world_objects    Dexie table      Primary key: id. Indexed:
                                    object_type, status, label, owner_id.
  ---------------- ---------------- -------------------------------------

**5.2 Dexie Definition**

> const db = new Dexie(\'LifeSimulator\');
>
> db.version(1).stores({
>
> rooms: \'++id, sequence_index, player_age, location_id\',
>
> world_objects: \'++id, object_type, status, label, owner_id\',
>
> });

Compound queries (e.g. all active Location WorldObjects with a given
label) are handled by filtering after a primary index query. Dexie\'s
compound index support is used sparingly --- simple indexes and JS-level
filtering is preferred for maintainability.

**5.3 Initialization**

  ------------ -------------------------------------------------------------
  **✅         The world starts as a blank state. No seed data, no
  Decision**   initialization ceremony. The world_objects and rooms tables
               are empty at game start. The first call to
               createRoomWithLocation hits the \'no existing Location
               found\' path in resolveLocation, creates the first Location
               WorldObject, and writes Room 1. Every subsequent room
               creation follows the identical path. There is no special case
               for game start.

  ------------ -------------------------------------------------------------

**6. Key Invariants Summary**

The following invariants are enforced by the harness and must hold at
all times. Claude Code must not write code that violates them.

  -----------------------------------------------------------------------
  1\. A Room record never exists with a location_id that does not exist
  in world_objects.

  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
  2\. The Room linked list pointer is always consistent. Room
  N.next_room_id and Room N+1.prev_room_id are updated atomically in the
  RoomCreationTransaction.

  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
  3\. WorldObjects are never deleted. They are status-transitioned.
  Status values: active → inactive → destroyed.

  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
  4\. ObjectRefs are never removed from linked_objects\[\]. Stale refs
  are tombstoned to status: \'inactive\' in place.

  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
  5\. The LLM never writes a UUID. All id assignment is harness-owned.
  The LLM proposes types and labels; the harness resolves or creates.

  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
  6\. Location WorldObjects have no back-reference to Rooms. The graph
  direction is Room → WorldObject only.

  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
  7\. never_compress: true is set by the harness only. The LLM cannot
  flag an object as non-compressible.

  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
  8\. WorldObject compression runs on room transition, on the same
  heartbeat as Room compression. Full collapse: all events\[\] → single
  compressed_summary string. events\[\] is cleared after compression.

  -----------------------------------------------------------------------

**7. Relationship to Other Documents**

-   System Design Document v7 --- Room architecture, LLM pipeline,
    compression lifecycle, LifeContext assembly.

-   Production Document v1 --- Tech stack, Dexie.js migration patterns,
    Zustand session layer, coding conventions.

-   Content Guardrails Document v1 --- AffectionState locks,
    ConsentGate, age-tier content matrix. All enforced at the harness
    level against WorldObject state.

-   Security Design Document v1 --- Save file import validation,
    adversarial content in WorldObject string fields, Zod schema
    enforcement on all LLM-originated data.

-   NPC Design Document v1 --- Character WorldObject state_data detail,
    AffectionState schema, behavioral_patterns taxonomy.

-   Economy Design Document v1 --- Asset and Contract WorldObject
    state_data, salary tracking, financial account schema.
