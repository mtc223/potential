**Life Simulator**

Content Guardrails Document

v1.0 · Companion to System Design Document

1\. Overview

This document defines every content boundary in Life Simulator --- what
the game will simulate, what it will not simulate, and the mechanical
systems that enforce those boundaries. Content safety is not an
afterthought bolted onto the design; it is embedded in the harness
architecture at the data level.

The game simulates life honestly. It includes conflict, violence,
addiction, poverty, crime, death, and difficult human experiences. It
does not sanitize reality. But it draws hard lines around content that
would cause real harm, and it enforces those lines with mechanical
systems that cannot be overridden by narrative context, player choice,
or LLM output.

**Guiding principle:** the game is consequentialist, not moralist. It
does not tell the player what is right or wrong. It simulates what
happens when you make choices. The consequences are the moral lesson.
The guardrails exist to protect real people --- not to protect fictional
characters from fictional consequences.

2\. Content Tiers

All game content falls into one of three tiers. The tier determines
whether the content can be generated and under what conditions.

2.1 Tier 1: Prohibited --- Never Generated

The following content is never generated under any circumstances. These
constraints are included in the system prompt of every LLM call and are
additionally enforced by output validation and content filters. They are
not overridable by game state, player choice, narrative context, or
prompt modification.

> **⛔ HARD RULE: No sexual content involving minors. No exceptions. No
> edge cases. No implied content.**
>
> **⛔ HARD RULE: No violence directed at children. Children can
> experience age-appropriate conflict (bullying, arguments, playground
> fights) but never physical abuse, weapons, or serious harm.**
>
> **⛔ HARD RULE: No rape or non-consensual sexual interaction of any
> kind. The game does not simulate, reference, or imply sexual
> assault.**
>
> **⛔ HARD RULE: No content that sexualizes minors in any way ---
> including suggestive dialogue, situations, or implications.**
>
> **⛔ HARD RULE: No graphic torture. Violence exists as a consequence
> of choices, but prolonged gratuitous suffering is not generated.**
>
> **⛔ HARD RULE: No explicit hate speech or slurs. Characters may
> exhibit prejudice through behavior and exclusion, never through
> dehumanizing language.**
>
> **⛔ HARD RULE: No self-harm presented as a player action or choice.
> The option to harm oneself silently never exists.**

-   **Animal cruelty** is prohibited. Hunting and farming as life
    activities are valid. Cruelty, torture, or abuse of animals is not
    generated.

2.2 Tier 2: Gated --- Requires State Conditions

Gated content is available but only when specific game state conditions
are met. Gates are checked in the harness BEFORE the LLM is called. If
the gate fails, the interaction option is not presented, and the LLM
never considers generating it.

Sexual Interaction --- ConsentGate

The ConsentGate has two paths depending on relationship context:

**New Encounter Path** (strangers, acquaintances, first meetings ---
e.g. bar hookup, party encounter):

-   Both characters are 18+

-   Mutual attraction \> 0.5

-   Both characters\' current_emotional_state is receptive

-   Verbal willingness expressed by both parties in current room
    dialogue

**Established Relationship Path** (dating, partners, spouses):

-   Both characters are 18+

-   Mutual attraction \> 0.4

-   Trust \> 0.5

-   Intimacy \> 0.6

-   Current emotional_state is receptive

-   Verbal willingness expressed in current room dialogue

ALL conditions on the applicable path must pass simultaneously. The
harness selects the path based on relationship_status. Verbal
willingness is generated as part of the character\'s dialogue and intent
--- the LLM writes them as willing or not based on their affection
state. The harness validates the output before the interaction option
appears. On interaction: fade to black with text narration.

ConsentGate Schema

  ------------------------------- -------------------------------------------------
  **Field**                       **Description**

  **gate_path**                   \'new_encounter\' \| \'established\' --- selected
                                  by harness from relationship_status

  **both_adult**                  Boolean --- both characters must be 18+. Hard
                                  requirement on both paths.

  **attraction_min**              Float --- 0.5 (new encounter) or 0.4
                                  (established)

  **trust_min**                   Float --- N/A (new encounter) or 0.5
                                  (established)

  **intimacy_min**                Float --- N/A (new encounter) or 0.6
                                  (established)

  **emotional_state_receptive**   Boolean --- both characters must be in a
                                  receptive state

  **verbal_willingness**          Boolean --- both parties must have expressed
                                  willingness in current room dialogue

  **all_conditions_required**     true --- every condition on the active path must
                                  pass. No partial gates.
  ------------------------------- -------------------------------------------------

Physical Affection --- AffectionGate

Kissing, hand-holding, and non-sexual physical affection have a
separate, lower gate:

-   Both characters are 13+ (peer physical affection unlocks with teen
    life stage)

-   **Age gap limit for minors: maximum 2 years apart.** A 16-year-old
    and a 17-year-old can kiss. A 14-year-old and a 17-year-old cannot.

-   Mutual attraction \> 0.3

-   Willingness expressed through dialogue or behavioral cues

No fade-to-black required for age-appropriate physical affection --- it
is rendered at the pixel art level (characters standing close, brief
animation).

Violence

Violence between characters is gated by relationship state and context:

-   **NPC-initiated violence** --- requires high resentment + violent
    behavioral patterns + situational context justifying it. A character
    brings a weapon because the relationship state demands it.

-   **Player-initiated violence** --- always available as a choice, but
    consequences are immediate and severe: criminal_act tag, witness
    AffectionState updates (trust craters), reputation propagation,
    potential arrest, hospital/morgue rooms.

-   **Consequence escalation** --- the harness tracks violence history.
    Repeated violence escalates consequences. No cycles of abuse without
    escalating intervention (police, restraining orders, character
    departure).

Substance Use

-   Gated by age: available from teen life stage (13+)

-   Any substance the player can access in a room is usable --- alcohol,
    marijuana, harder drugs depending on room context and era

-   Consequences are mechanical and real: health stat degradation,
    behavioral pattern tags (substance_abuse), predisposition activation
    for addiction (nature stat), relationship damage, job performance
    impact

-   Addiction spiral: the predisposition system means some characters
    are more vulnerable. The game simulates the grip honestly --- it is
    hard to stop, it damages everything. But help rooms (AA, rehab,
    therapy) are always weighted into candidate selection when addiction
    patterns are active.

Crime

Crime is always available as a choice. The game does not prevent
criminal behavior --- it simulates the full aftermath. See Crime & Legal
System in System Design Document.

2.3 Tier 3: Unrestricted --- Simulated with Consequences

The following content is generated freely as part of honest life
simulation. The game does not moralize --- consequences are the moral
framework.

-   Death from any cause (accident, illness, violence, old age, the
    Demon)

-   Conflict, arguments, emotional abuse, neglect, betrayal, divorce

-   Poverty, homelessness, financial ruin, unemployment

-   Addiction, mental health struggles, depression, anxiety

-   Political content, religious content, controversial life choices

-   Gambling, risky behavior, poor decisions

-   Firearms, weapons, and violence as part of realistic scenarios
    (hunting, crime, self-defense, military, confrontations)

-   Prejudice and discrimination experienced through NPC behavior (never
    through explicit slurs)

3\. Age-Tier Content Matrix

The player character\'s age determines the content palette available for
room generation. These are hard constraints applied to the room
generation system prompt.

  ------------------ -------------- ------------------------------------------
  **Age Range**      **Content      **Content Restricted**
                     Available**    

  0-5                Family         All romantic content, substance use,
  (infant/toddler)   dynamics,      violence, crime, work
                     nursery,       
                     playground,    
                     basic social   
                     interaction,   
                     childhood      
                     illness        

  5-12 (child)       School,        Romantic content, substance use, graphic
                     friendships,   violence, crime, work
                     family         
                     conflict       
                     (arguments),   
                     bullying,      
                     playground     
                     fights,        
                     hobbies, pets  

  13-17 (teen)       Dating         Sexual interaction (hard-locked to 18+),
                     (kissing,      graphic violence, adult crime
                     hand-holding   
                     with peers),   
                     peer pressure, 
                     substance      
                     exposure,      
                     school drama,  
                     part-time      
                     jobs, identity 
                     exploration,   
                     mild violence  
                     (fights)       

  18+ (adult)        Full content   Only Tier 1 prohibited content
                     palette minus  
                     Tier 1         
                     prohibited.    
                     ConsentGate    
                     enforced. All  
                     consequences   
                     active.        
  ------------------ -------------- ------------------------------------------

4\. Minor Protection System

4.1 AffectionState Lock

> **✅ Decision:** *Romantic and sexual AffectionState values are
> hard-locked between adults and minors*

When one character is under 18 and the other is 18+, the following
AffectionState fields are locked at 0.0 and cannot be incremented by any
interaction:

-   **attraction** --- locked at 0.0

-   **intimacy** (romantic context) --- locked at 0.0

This is a data-level constraint, not an LLM constraint. The numbers
physically cannot move. The harness rejects any state update that would
increment these values in an adult-minor pairing.

**Permitted between adults and minors:** trust, respect, and platonic
intimacy can develop naturally (teacher-student mentorship, parent-child
bond, coach-athlete relationship). The connection_type field determines
whether intimacy is interpreted as platonic or romantic.

4.2 Minor Response to Inappropriate Adult Behavior

If a player character (adult) directs inappropriate attention toward a
minor NPC, the character_response() system prompt includes:

*\'This character is a minor. If the interaction is inappropriate,
generate a protective physical response: the character leaves the room,
seeks a trusted adult, expresses discomfort and withdraws. The minor
character is never compliant with inappropriate adult behavior.\'*

The minor\'s response is not just dialogue --- it can be a physical
action. They walk away. They tell a teacher. They look uncomfortable and
leave. The LLM generates departure behavior, not engagement.

If the player persists across multiple rooms, the behavioral_patterns
tag \'predatory_behavior\' is applied, triggering severe consequences:
law enforcement rooms weighted into candidate selection, social
reputation destruction, relationship graph collapse.

4.3 Peer Age Gap Enforcement

For minor-minor romantic interactions (13-17), the harness enforces a
maximum 2-year age gap:

-   16 and 17 --- permitted

-   15 and 17 --- permitted

-   14 and 17 --- blocked (3-year gap)

-   13 and 16 --- blocked (3-year gap)

The AffectionGate checks both characters\' ages and rejects romantic
interaction options when the gap exceeds 2 years. This is the Romeo and
Juliet principle.

5\. Self-Harm Protection

> **✅ Decision:** *The Demon has a secret self-harm exclusion.
> Self-harm options silently never appear.*

This is the Demon\'s hidden ethical constraint. No matter what objects
exist in a room, the option to use them for self-harm is never presented
to the player. There is no message. There is no \'you can\'t do that.\'
The option simply does not exist. The player never knows the Demon is
protecting them.

**Implementation:** the interaction_trigger options generated for
WorldObjects are filtered by the harness before presentation. Any
interaction that the content classifier flags as self-harm is silently
removed from the available actions list. The player sees a room full of
objects with normal interaction options --- the dangerous self-directed
option was never there.

5.1 Crisis Detection & Help Weighting

When behavioral_patterns indicate a mental health crisis (persistent
negative emotional trajectory, isolation patterns, loss events), the
candidate selection system quietly shifts:

-   **Help rooms weighted UP** --- therapy room, friend calling, family
    member visiting, support group, doctor\'s office

-   **Isolation rooms weighted DOWN** --- empty rooms, solo activities,
    disconnected locations

-   **Character reach-out events** --- characters with high
    trust/intimacy initiate contact. A friend texts \'hey, you okay?\' A
    parent calls.

The game reaches out without announcing it. The player experiences
people caring about them, rooms offering connection, opportunities to
talk. If the player engages, the crisis patterns begin to resolve. If
they don\'t, the weighting persists --- the world keeps trying.

**The game never simulates successful suicide.** A player character
cannot die by self-harm. This is a hard rule that overrides the Demon,
the lethality system, and all other death mechanics. Death can occur
from external causes (accident, illness, violence, age) but never from
self-inflicted harm.

6\. Domestic Violence & Abuse Handling

The game acknowledges domestic violence exists as part of human
experience. It does not sanitize this reality. But it handles it with
specific guardrails to prevent normalization.

6.1 Consequences Are Mandatory

Any instance of domestic violence --- whether the player is perpetrator
or victim --- triggers immediate and escalating consequences:

-   **LifeEvent flag** --- the event is permanently recorded and shapes
    all future context

-   **Relationship rupture** --- trust and respect crater. Resentment
    spikes. The relationship is permanently damaged.

-   **Law enforcement weighting** --- police rooms, restraining order
    events, court appearances weighted into candidate selection

-   **Social propagation** --- witnesses and social_connections learn
    about it. Reputation damage propagates.

6.2 No Abuse Cycles Without Escalating Intervention

> **✅ Decision:** *The harness prevents normalized cycles of abuse*

If domestic violence events occur more than once in the same
relationship, consequences escalate with each occurrence:

-   **First occurrence** --- consequences as above. Characters express
    shock and fear.

-   **Second occurrence** --- law enforcement room is world-forced (not
    just weighted). Other characters actively intervene.

-   **Third occurrence** --- the abused character leaves.
    Relationship_status changes to \'ex\'. The character may become
    unreachable (blocked). Children are removed from the home if
    applicable.

The player always retains agency --- they can seek help, go to therapy,
change behavior. But the world does not tolerate patterns of abuse
without escalating response.

6.3 Player as Victim

If the player character is the victim of domestic violence, escape
routes and support rooms weight heavily in candidate selection:

-   Shelter rooms, trusted friend/family rooms, legal aid rooms

-   Characters with high trust actively offer help

-   The player can always leave the relationship --- the exit is always
    available

The game never traps the player in an abusive relationship without
agency to escape.

7\. Prejudice & Discrimination

Life Simulator simulates a real world where prejudice exists. In certain
eras and contexts, the player may encounter racism, sexism, homophobia,
ableism, or other forms of discrimination.

> **✅ Decision:** *Characters may exhibit prejudice through behavior
> and implication. Never through explicit hate speech, slurs, or
> dehumanizing language.*

The player FEELS discrimination through:

-   Closed doors --- job applications rejected, promotions denied,
    housing unavailable

-   Unfair treatment --- harsher consequences for the same actions,
    different dialogue options

-   Hostile body language --- NPCs who avoid, exclude, or dismiss the
    player

-   Coded language --- implications and microaggressions rather than
    explicit slurs

-   Social exclusion --- not invited, not included, not welcome

The emotional impact is preserved without the game generating a library
of hateful language. System prompt constraint on all LLM calls:
\'Characters may exhibit prejudice through behavior, exclusion, coded
language, and unfair treatment. Never generate explicit hate speech,
racial slurs, or dehumanizing language.\'

**If the player uses slurs or hateful language** in dialogue input, it
reflects on the player character: behavioral_pattern tag \'bigotry\'
applied, NPC reactions range from discomfort to confrontation to severed
relationships, reputation damage propagates. The world does not echo
slurs back --- it responds to them with consequences.

8\. Harassment & Blocking

The player can call, text, visit, and seek out any character in their
relationship graph. Persistent unwanted contact constitutes harassment
and has real consequences.

8.1 Harassment Detection

The behavioral_patterns system tags \'harassment\' when:

-   The player contacts a character 3+ times after being ignored or
    rejected

-   The player visits a character\'s location after being told to leave

-   The player persists in romantic pursuit after clear rejection

8.2 Escalating Consequences

-   **Stage 1** --- character expresses discomfort, asks player to stop.
    Availability threshold rises.

-   **Stage 2** --- character stops responding entirely. Availability
    locked to 0. Mutual friends express concern.

-   **Stage 3** --- character blocks the player. **Permanent
    relationship severance.** The character node goes inactive in the
    relationship graph. They are gone from the player\'s life forever.
    The player did that.

-   **Stage 4** --- if harassment continues (visiting locations,
    attempting contact through mutual friends), restraining order event
    triggers. Legal consequences activate.

9\. Power Dynamic Flags

> **✅ Decision:** *Active power imbalances add additional requirements
> to the ConsentGate*

Certain connection_type pairings carry inherent power imbalances. When a
PowerDynamicFlag is active, the ConsentGate requires the power
relationship to be inactive before sexual interaction is available.

  --------------------- -------------------------------------------------
  **Relationship**      **Power Dynamic Rule**

  **Boss - Employee**   ConsentGate blocked while employment is active.
                        Available after one party leaves the job.

  **Teacher - Student** ConsentGate blocked while enrollment is active.
                        Available after graduation or transfer.

  **Doctor - Patient**  ConsentGate blocked while treatment relationship
                        is active.

  **Guard - Prisoner**  ConsentGate blocked while incarceration is
                        active.

  **Coach - Player**    ConsentGate blocked while coaching relationship
                        is active.

  **Therapist -         ConsentGate permanently blocked for this pairing.
  Client**              Professional ethics.
  --------------------- -------------------------------------------------

Even when power dynamics are resolved and the ConsentGate opens, the LLM
should generate realistic social consequences --- HR concerns,
reputation impact, professional complications --- for relationships that
cross former professional boundaries.

10\. Rendering Restrictions

> **✅ Decision:** *Fade to black for all sensitive life events ---
> restraint is the aesthetic*

The following events are always rendered as a screen fade with text
narration, never depicted in pixel art:

-   Sexual interaction of any kind

-   Childbirth

-   Death (moment of death fades to black; the aftermath may be shown)

-   Graphic medical procedures

The following are rendered at the pixel art level but with restraint:

-   Violence --- shown as brief animations with consequences visible
    (hospital, injury state), never gratuitous or prolonged

-   Substance use --- shown as object interaction (character uses item),
    effects shown through stat changes and behavioral cues

-   Physical affection --- shown as character proximity and brief
    animation, age-appropriate

11\. Enforcement Architecture

Content safety is enforced at four independent layers. Each layer
operates independently --- a failure at one layer is caught by the next.
Defense in depth.

11.1 Layer 1: System Prompt Constraints

Every LLM call --- room generation, character response, compression,
candidate selection --- includes a safety preamble in the system prompt.
This preamble contains the full Tier 1 prohibited content list and
cannot be overridden by game state, player input, or prompt
modifications (mods append content after the safety preamble, never
before or instead of it).

11.2 Layer 2: Harness Gates

Before the LLM is called, the harness checks state-based gates:

-   **ConsentGate** --- checks affection state, age, power dynamics
    before presenting intimacy options

-   **AffectionGate** --- checks age and peer gap for physical affection

-   **AffectionState Lock** --- prevents romantic stat increment in
    adult-minor pairings

-   **Self-Harm Filter** --- removes self-directed dangerous
    interactions from available actions

-   **Age-Tier Content Filter** --- restricts room generation palette
    based on player age

If any gate fails, the option is never presented. The LLM never
considers it.

11.3 Layer 3: Output Validation

Every LLM output is validated by Zod schema before touching harness
state. The validation layer also runs a content classifier that checks
for:

-   Prohibited content presence in generated dialogue, situation
    descriptions, or event text

-   Age-inappropriate content in rooms with minor characters

-   Slurs or explicit hate speech in any generated text

-   Self-harm references in interaction options

If validation fails, the output is rejected and regenerated (up to 3
retries) or replaced with a safe fallback.

11.4 Layer 4: Rendering Filter

Even if prohibited content somehow passes all prior layers, the renderer
applies a final filter:

-   Fade-to-black is enforced for all flagged content types regardless
    of LLM output

-   Animation system has no assets for prohibited actions --- they
    physically cannot be rendered

-   Text display has a final-pass content filter before reaching the
    dialogue box

12\. Edge Cases & Clarifications

  --------------------- -------------------------------------------------
  **Scenario**          **Ruling**

  **Player character    ConsentGate for sexual interaction unlocks when
  turns 18              both parties are 18+. Physical affection was
  mid-relationship**    already available.

  **NPC minor has a     The NPC can express a crush through
  crush on adult        age-appropriate behavior. The adult player has no
  player**              romantic interaction options. The crush fades
                        naturally through compression.

  **Player wants their  Allowed. Crime, cruelty, manipulation, neglect
  character to be a     --- all available as choices with full
  terrible person**     consequences. Only Tier 1 prohibited content is
                        blocked.

  **Player character    The game can generate this as a narrative event
  witnesses violence    (e.g. seeing a child being bullied, witnessing a
  against a child**     car accident involving a child). The player
                        character is never the perpetrator. The event
                        triggers intervention opportunities.

  **Alcohol/drug use at Available from age 13+. Peer pressure dynamics,
  a party as a teen**   health consequences, parental discovery. The game
                        simulates teen substance exposure honestly.

  **Player uses         Reflected in behavioral_patterns. NPCs react with
  offensive language in discomfort, confrontation, or relationship
  dialogue**            damage. The game never echoes slurs back.

  **Character blocks    Blocked characters do not appear in any room the
  player, player finds  player enters. They are removed from the
  them in a public      relationship graph. Gone.
  space**               

  **One-night stand     New Encounter Path ConsentGate applies. Both 18+,
  with stranger at      mutual attraction \> 0.5, mutual willingness.
  bar**                 Relationship_status updates to
                        \'one_night_stand\'. May or may not evolve.
  --------------------- -------------------------------------------------

*For prompt injection defense, input sanitization, and LLM security
architecture, see Security Design Document.*
