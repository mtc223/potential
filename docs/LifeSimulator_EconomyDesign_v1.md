**Life Simulator**

Economy & Life Progression Design

Financial System · Housing · Education · Obligations · Trading · Time
Model

*v1.0 · Companion to System Design Document*

1\. Overview

This document defines the economic simulation layer of Life Simulator
--- how money enters and leaves the player's life, how housing and
education progress, how obligations accumulate and compound, and how the
passage of time maps to financial events. The economy is not a
spreadsheet game. It is a pressure system that shapes what choices are
available, what rooms are generated, and how the inner monologue
narrates the player's relationship with survival, ambition, and
security.

Every financial value in the game traces to a single object:
PlayerFinances. This object lives in the harness alongside LifeContext
and is persisted to IndexedDB. The agent reads it when building prompts.
The renderer reads it when displaying the Banking app. No financial
logic lives in the agent --- all calculations are deterministic harness
functions.

> **✅ Decision:** *All financial math is deterministic and lives in the
> harness. The LLM never calculates money. It reads financial state and
> generates narrative and choices that reflect it.*

2\. Time Model

The economy requires a formal time model. Every room has a narrative
duration that determines how much time passes for salary accrual, bill
due dates, and aging.

2.1 Room Duration

> **✅ Decision:** *Each room has a duration_days field set during
> generation. The default is 7 days (one week). Duration varies by room
> type and life stage.*

  ------------------ --------------- -------------------------------------
  **Room Context**   **Default       **Rationale**
                     Duration        
                     (days)**        

  Standard room      7               One week. The base unit of life
                                     progression.

  Work room          1--5            A workday or work week depending on
                                     narrative.

  School room        5               A school week.

  Hospital room      1--14           Varies by severity.

  Travel room        1--3            Transit time.

  Special event      7               Milestone rooms get a full week of
                                     narrative weight.

  Childhood rooms    14--30          Early life compresses. Fewer rooms
  (ages 0--5)                        cover more time.
  ------------------ --------------- -------------------------------------

Duration is set by prompt_room() as part of the room object. The harness
advances world_date by duration_days on room exit, before compression
fires. This means: salary accrues for duration_days worth of pay;
obligations tick forward by duration_days; age advances by duration_days
/ 365.25; the Demon's lethality check covers duration_days of exposure.

2.2 World Clock

  --------------------- -------------------------------------------------
  **Field**             **Description**

  world_date            ISO8601 date. The canonical current date in the
                        game world. Advanced on room exit.

  player_age            Float. Fractional years. Computed from birth_date
                        and world_date.

  room_duration_days    Integer. Set per room. How many days this room
                        represents.
  --------------------- -------------------------------------------------

> **✅ Decision:** *Time advances discretely on room exit, not
> continuously. There is no real-time clock. A room is a frozen moment
> that resolves when you leave it.*

2.3 Temporal Compression by Life Stage

Childhood and old age compress time more aggressively than young
adulthood. This is handled by the candidate selection system weighting
longer-duration rooms in those life stages.

  ------------------- --------------- ------------------------------------
  **Life Stage**      **Avg           **Notes**
                      Rooms/Year**    

  Infant (0--1)       6--8            Long durations. Parent's story, not
                                      the player's.

  Toddler (1--4)      8--12           Monthly-ish snapshots.

  Child (5--12)       18--26          Biweekly. School weeks interleaved
                                      with home.

  Teen (13--17)       26--40          Weekly. Social density increases.

  Young adult         40--52          Weekly. Peak room density. Most
  (18--30)                            active life period.

  Adult (30--60)      30--45          Weekly to biweekly. Routine
                                      compresses.

  Senior (60+)        20--35          Biweekly to monthly. World narrows.
  ------------------- --------------- ------------------------------------

These are soft targets. The beat system and player choices override
defaults. An active, chaotic young adult life will generate more rooms
per year than a settled, routine one.

3\. PlayerFinances Schema

> **✅ Decision:** *PlayerFinances is a single top-level harness object,
> persisted alongside LifeContext and the room linked list. It is the
> source of truth for all money in the game.*

3.1 Core Schema

  ------------------- ------------------ ---------------------------------
  **Field**           **Type**           **Description**

  cash                Number             Liquid money. Can go negative
                                         (overdraft).

  income_streams      IncomeStream\[\]   All active and inactive income
                                         sources.

  obligations         Obligation\[\]     Recurring expenses. Autopay
                                         items.

  loans               Loan\[\]           All active loans.

  assets              Asset\[\]          Owned property, vehicle value,
                                         investments.

  transactions        Transaction\[\]    Rolling history. Displayed in
                                         Banking app.

  housing_state       HousingState       Current living situation.

  credit_score        Number (300--850)  Affects loan approval and
                                         interest rates.

  tax_bracket         String             Computed from income. Cosmetic
                                         context for LLM prompts.
  ------------------- ------------------ ---------------------------------

3.2 IncomeStream

  ------------------- ------------------ ---------------------------------
  **Field**           **Type**           **Description**

  id                  UUID               Unique identifier.

  type                Enum               salary \| hourly \| allowance \|
                                         welfare \| retirement \| gift \|
                                         business_income

  source_name         String             Employer name, "Parents", "Social
                                         Security", etc.

  amount              Number             Per pay period for salary. Per
                                         hour for hourly.

  pay_period          Enum               weekly \| biweekly \| monthly

  active              Boolean            False when job ends. Preserved
                                         for history.

  start_room_id       UUID               When this income began.

  end_room_id         UUID \| null       When this income ended.
  ------------------- ------------------ ---------------------------------

3.3 Obligation

  ------------------- ------------------ ---------------------------------
  **Field**           **Type**           **Description**

  id                  UUID               Unique identifier.

  type                Enum               rent \| mortgage \| loan_payment
                                         \| utilities \| food \| insurance
                                         \| tuition \| child_support \|
                                         subscription

  name                String             Display name for Banking app.

  amount              Number             Per billing cycle.

  frequency           Enum               weekly \| monthly

  autopay             Boolean            If true, deducted automatically
                                         on schedule.

  linked_loan_id      UUID \| null       If this obligation is a loan
                                         payment.

  next_due_date       ISO8601            Next payment date. Advances after
                                         each payment.

  missed_count        Number             Consecutive missed payments.
                                         Resets on payment.

  active              Boolean            False when lease/loan ends.
  ------------------- ------------------ ---------------------------------

3.4 Loan

  --------------------- ------------------ ---------------------------------
  **Field**             **Type**           **Description**

  id                    UUID               Unique identifier.

  type                  Enum               mortgage \| car \| student \|
                                           personal

  lender_name           String             Bank name for display.

  principal             Number             Original loan amount.

  remaining_balance     Number             Current balance including accrued
                                           interest.

  interest_rate         Number             Annual rate. Affected by
                                           credit_score at origination.

  monthly_payment       Number             Fixed payment amount.

  months_remaining      Number             Decrements per payment.

  late_count            Number             Lifetime late payments on this
                                           loan.

  status                Enum               current \| late \| delinquent \|
                                           defaulted \| paid_off

  origination_room_id   UUID               When loan was taken.
  --------------------- ------------------ ---------------------------------

3.5 Asset

  ------------------- ------------------ ---------------------------------
  **Field**           **Type**           **Description**

  id                  UUID               Unique identifier.

  type                Enum               home \| vehicle \| savings \|
                                         investment

  name                String             Display name.

  value               Number             Current estimated value.
                                         Appreciates or depreciates over
                                         time.

  linked_loan_id      UUID \| null       Mortgage or car loan.
  ------------------- ------------------ ---------------------------------

3.6 Transaction

  ------------------- ------------------ ---------------------------------
  **Field**           **Type**           **Description**

  id                  UUID               Unique identifier.

  type                Enum               income \| expense \| gift \|
                                         trade \| loan_disbursement \|
                                         loan_payment \| late_fee \| tax

  amount              Number             Positive = money in. Negative =
                                         money out.

  description         String             Human-readable. Displayed in
                                         Banking.

  world_date          ISO8601            When this occurred.

  room_id             UUID               Room context.

  balance_after       Number             Cash balance after this
                                         transaction.
  ------------------- ------------------ ---------------------------------

3.7 HousingState

  ------------------- ------------------ ---------------------------------
  **Field**           **Type**           **Description**

  type                Enum               parents_home \| renting \| owning
                                         \| homeless \| roommate \| dorm

  location_id         UUID               LocationRegistry entry.

  monthly_cost        Number             0 for parents_home.

  lease_end_date      ISO8601 \| null    For rentals.

  roommate_ids        UUID\[\]           Character IDs sharing the space.
  ------------------- ------------------ ---------------------------------

3.8 Computed Properties (not persisted)

  --------------------- -------------------------------------------------
  **Property**          **Computation**

  net_worth             cash + sum(assets.value) -
                        sum(loans.remaining_balance)

  monthly_income        sum(active income streams, normalized to monthly)

  monthly_expenses      sum(active obligations, normalized to monthly)

  disposable_income     monthly_income - monthly_expenses

  debt_to_income        sum(loan monthly payments) / monthly_income
  --------------------- -------------------------------------------------

4\. Income System

4.1 Salary (Autopay In)

When the player has a salaried job, an IncomeStream with type 'salary'
is created. On each room exit, the harness calculates:

*income_this_room = (annual_salary / 365.25) × room_duration_days*

This amount is added to cash as a Transaction. The Banking app shows it
as a deposit with the employer name and pay period.

> **✅ Decision:** *Salary accrues proportionally to room duration. No
> pay stubs or payday timing. The money appears in your account as life
> moves forward.*

4.2 Hourly Wages

Hourly jobs only pay for time spent in work rooms. The harness tracks:

*income_this_room = hourly_rate × hours_worked*

hours_worked is derived from the work room's duration and the player's
activity score in that room. Leaving work early or doing poorly reduces
pay. This creates a direct link between showing up and getting paid.

4.3 Allowance

Children receive a small weekly allowance from parents. Amount is
context-dependent --- wealthier parent households give more. The
IncomeStream is created at the parent generation stage and scaled to the
family's economic class.

4.4 Birthday Gifts

> **✅ Decision:** *Relatives give cash gifts on the player's birthday.
> The amount varies by relationship closeness and their own financial
> state.*

On the room closest to the player's birthday (detected by world_date
proximity), the harness generates gift transactions from active family
members. Grandparents give more than aunts. Parents give based on
household income. The inner monologue narrates the gifts poetically.
Gifts are Transaction entries, not IncomeStreams.

4.5 Welfare / Unemployment

If the player has no active income and cash drops below a threshold,
welfare becomes available. It is not automatic --- the player must apply
through the computer. This creates a low but non-zero income floor. See
section 7 for the suffocation design analysis.

4.6 Retirement Income

After retirement age (configurable, default 65), if the player had
steady employment history, Social Security or pension income activates
as a new IncomeStream. Amount is based on career earnings history.

5\. Obligation System (Autopay Out)

5.1 Autopay Processing

On room exit, after income accrual, the harness processes obligations:

-   Advance world_date by room_duration_days.

-   For each active obligation: if next_due_date \<= new world_date and
    autopay is on, deduct amount from cash, log Transaction, advance
    next_due_date by frequency.

-   If autopay is off and due date passes, increment missed_count.

-   If next_due_date was passed multiple times (long room duration),
    process each occurrence.

-   After all obligations processed, check for late payment
    consequences.

> **✅ Decision:** *Autopay is the default for all obligations. The
> player can toggle it off in the Banking app. This makes the financial
> system low-friction by default --- money flows in and out without
> micromanagement.*

5.2 Standard Obligations

  ------------------ --------------- -------------------------------------
  **Obligation**     **Frequency**   **When Created**

  Rent               Monthly         On signing a lease.

  Mortgage           Monthly         On closing a home purchase.

  Utilities          Monthly         On moving into any non-parental
                                     housing.

  Food               Weekly          Always active. Amount scales with
                                     household size.

  Insurance          Monthly         On obtaining a job with benefits, or
                                     purchasing independently.

  Tuition            Monthly         On college enrollment.

  Car payment        Monthly         On purchasing a car with financing.

  Child support      Monthly         If court-ordered after separation.

  Phone bill         Monthly         On receiving phone (age 12 at
                                     parents' home, or independently).
  ------------------ --------------- -------------------------------------

5.3 Missed Payments

When an obligation is missed (autopay off and due date passes, or
autopay on but cash is insufficient):

  ------------------ ---------------------------------------------------------
  **missed_count**   **Consequence**

  1                  Late notice in phone notifications. Late fee added (% of
                     amount, defined in game config). credit_score decreases
                     slightly.

  2                  Second notice. Higher late fee. credit_score drops more.
                     Inner monologue reflects financial stress.

  3                  Final notice. For rent: eviction warning as room event.
                     For loans: status changes to 'delinquent'. credit_score
                     drops significantly.

  4+                 For rent: eviction. housing_state changes to 'homeless'.
                     For loans: status changes to 'defaulted'. Severe
                     credit_score impact. Collections calls as phone events.
  ------------------ ---------------------------------------------------------

> **✅ Decision:** *Cash can go negative. Overdraft is real. The game
> does not prevent spending when you have no money --- it generates
> consequences.*

6\. Loan System

6.1 Loan Application

Loans are applied for through the computer's Banking app. The harness
runs a deterministic approval check: credit_score \> threshold for loan
type, debt_to_income \< ceiling for loan type, and employment history
length \>= minimum for loan type.

If approved, interest_rate is computed from credit_score (better score =
lower rate). The loan amount is disbursed to cash. A corresponding
Obligation is created for monthly payments.

6.2 Loan Types

  ---------------- ---------------- ------------------ -------------------
  **Type**         **Typical        **Credit           **Term**
                   Range**          Threshold**        

  Mortgage         50k--500k        620+               15 or 30 years

  Car loan         5k--50k          550+               3--7 years

  Student loan     10k--100k        None (govt backed) 10--25 years

  Personal loan    1k--25k          600+               1--5 years
  ---------------- ---------------- ------------------ -------------------

Student loans are unique: no credit check required, but they cannot be
discharged through bankruptcy. Interest accrues during school (deferred
payment). Payments begin 6 months after leaving school.

6.3 Interest Accrual

For each room exit, outstanding loan balances accrue interest:

*daily_rate = annual_rate / 365.25*

*interest_this_room = remaining_balance × daily_rate ×
room_duration_days*

When a monthly payment is made, it applies first to accrued interest,
then to principal. This is standard amortization.

6.4 Late Loan Payments

Late payments on loans follow the missed payment escalation in section
5.3. Additionally: late fees compound (the fee itself accrues interest);
after 3 consecutive missed payments, the interest rate increases by a
penalty margin (defined in game config); after default (4+ missed), the
loan is sent to collections with persistent phone call events and
collector NPC room events.

6.5 Bankruptcy

> **✅ Decision:** *Bankruptcy exists as a last-resort escape valve. It
> discharges most debt but has severe, lasting consequences.*

The player can file for bankruptcy through the computer. Effects:

-   Most loans discharged (remaining_balance set to 0, status
    'defaulted').

-   Student loans NOT discharged.

-   credit_score drops to minimum (300).

-   credit_score recovery is slow (years of on-time payments).

-   Bankruptcy flag persists in LifeContext for 7--10 years.

-   Job applications in finance/government are affected.

-   Inner monologue narrates the weight and relief.

7\. Debt Suffocation --- Design Analysis

*\"Do we want people to feel suffocated by debt?\"*

This is the central design tension of the financial system. The game
simulates real consequences, but it must remain playable and emotionally
engaging rather than mechanically punishing. The answer is: **pressure
yes, death spiral no.**

7.1 The Problem

In real life, debt compounds. Late fees generate more late fees.
Interest on interest creates exponential growth. A player who falls
behind can theoretically never recover, making the rest of their
simulated life a joyless grind of collection notices. That is realistic
but not fun, and not what this game is about.

7.2 The Solution: Pressure Without Despair

The game uses three mechanisms to create financial pressure without
creating unrecoverable death spirals:

**Mechanism 1 --- Soft Floor.** Cash can go negative, but the game never
generates rooms that are impossible to navigate due to finances. Even a
homeless, broke player gets candidate rooms that offer paths forward: a
shelter, a job opportunity, a kind stranger. The beat system treats
prolonged financial distress as narrative flatness and generates turning
points. Poverty is a state you pass through, not a state that locks you
in.

**Mechanism 2 --- Interest Rate Caps.** Late fee compounding and penalty
interest rates have ceilings defined in game config. Real predatory
lending has no ceiling. The game's ceiling prevents the exponential
blowup that makes debt unrecoverable. The player still feels the
pressure of mounting debt, but the math cannot outrun realistic
recovery.

**Mechanism 3 --- Escape Valves.** Bankruptcy exists (section 6.5).
Welfare exists (section 4.5). Family members may offer financial help if
relationship state supports it. The game generates room candidates that
offer financial recovery proportional to the depth of the crisis. The
deeper the hole, the more the candidate system weights opportunity
rooms.

7.3 What the Player Should Feel

  ---------------- ------------------------------------------------------
  **Financial      **Intended Experience**
  State**          

  Comfortable      Money is background noise. Inner monologue rarely
                   mentions it. Choices feel open.

  Tight            Inner monologue mentions money. Some choices feel
                   constrained. "Can I afford this?" appears in decision
                   moments.

  Struggling       Phone notifications about bills. Inner monologue
                   carries anxiety. Job rooms and money-related
                   candidates weighted higher. Some luxury choices
                   unavailable.

  Crisis           Eviction warnings. Collection calls. Inner monologue
                   dominated by survival. But: escape valve rooms appear.
                   Turning points weighted heavily by beat system.
  ---------------- ------------------------------------------------------

> **✅ Decision:** *Financial pressure shapes narrative and available
> choices. It never creates a mechanically unwinnable state. The inner
> monologue carries the emotional weight --- the spreadsheet stays in
> the background.*

8\. Housing Progression

8.1 Parents' Home (Age 0--18+)

The player starts life in their parents' home. This is a
LocationRegistry entry with housing_state.type = 'parents_home' and
monthly_cost = 0. The player can stay as long as they want, but after
18, the inner monologue and parent NPCs begin generating pressure to
move out. Parent relationship state affects how long this is tolerated.
Some room candidates will depict tension about still living at home.

There is no hard eviction from parents' home. Staying too long is a
social consequence, not a financial one.

8.2 Finding an Apartment (Computer)

The player searches for apartments through the computer's Housing app
(unlocked at age 18). The Haiku call generates a list of available
apartments weighted by: player's current income (affordable range),
location context (city, neighborhood), and credit score (some landlords
check).

Selecting an apartment triggers: credit/income check (deterministic
harness function); if approved, security deposit deducted from cash,
rent Obligation created, HousingState updated to 'renting', new
LocationRegistry entry for the apartment; if rejected, notification
explaining why, with lower-tier apartments still available.

8.3 Buying a Home (Computer)

Home purchase is available through the computer's Housing app. Requires:
down payment (percentage of home price, typically 10--20%), mortgage
pre-approval (credit_score threshold + income verification). The home is
added as an Asset. A Loan (mortgage) and corresponding Obligation are
created. Home value appreciates or depreciates over time based on a rate
defined in game config.

8.4 Roommates

> **✅ Decision:** *Roommates are characters who share housing cost. The
> rent obligation is split by occupant count.*

When moving into shared housing, roommate characters are generated as
recurring NPCs. They appear in home rooms. Rent is divided. Roommate
relationships add social texture --- they can become friends, create
conflict, or move out (increasing the player's share).

8.5 Homelessness

If the player is evicted and has no alternative housing:
housing_state.type = 'homeless'; home room candidates are replaced with
shelter, street, and public space rooms; the LocationRegistry entry for
the lost housing has returnable set to false. Recovery paths: shelter →
job → apartment application.

8.6 Dorm Housing

College enrollment includes a dorm option. HousingState type 'dorm'.
Room and board bundled into tuition obligation. The dorm is a
LocationRegistry entry that generates college-appropriate room types.

9\. Trading & Gift Economy

9.1 NPC Trading

> **✅ Decision:** *Trading is a conversation mechanic, not a menu
> system. The player uses dialogue to negotiate.*

The player can attempt to trade items or negotiate money from NPCs
during conversation. This works through the existing
character_response() pipeline: player says something like "Can I borrow
some money?"; character_response() evaluates the request against the
NPC's relationship state (trust, respect, resentment), their own
financial context, and personality; if the NPC agrees, the harness
creates a Transaction. The NPC's memory_of_player records the exchange.

Success depends on relationship quality. A close friend with high trust
will lend money. A stranger won't. A parent with high resentment from
neglect won't either. The LLM handles the social dynamics; the harness
handles the accounting.

9.2 Persuasion Checks

Persuasion is not a dice roll. The NPC's response is determined by the
LLM reading the full relationship context. However, the harness applies
guardrails: maximum gift/trade value scales with relationship depth;
NPCs cannot be convinced to give more than their own financial context
supports; repeated requests degrade trust naturally through the
relationship system.

9.3 Birthday and Holiday Gifts

Family members generate cash gifts on birthdays (section 4.4). The
amount is: base amount from game config (scaled by era for inflation);
multiplied by relationship quality (affection_state.trust and
affection_state.intimacy); modified by the giver's own financial state
(if tracked). Gift transactions appear in Banking with the giver's name.

10\. Education System

10.1 School Progression

> **✅ Decision:** *School is mandatory from age 5 to 18. The player
> cannot permanently leave school before 18 without consequences.*

  ---------------- ---------- ---------------------------------------------
  **Level**        **Ages**   **Room Type Context**

  Elementary       5--10      Single classroom, one teacher, playground.
  school                      Simple interactions. Learning basic skills.

  Middle school    11--13     Multiple classrooms, lockers, cafeteria.
                              Social dynamics intensify. Cliques form.

  High school      14--17     Larger campus. Subject-specific rooms.
                              Extracurriculars. Dating. Identity formation.
  ---------------- ---------- ---------------------------------------------

School rooms evolve as the player ages. The room type stays 'school' but
the context, characters, and interactions change with each level. The
LLM reads the player's age and generates age-appropriate school content.

10.2 Truancy Enforcement

> **✅ Decision:** *Skipping school generates escalating consequences
> through room candidates, not through a punishment menu.*

If the player consistently avoids school rooms (detected by the harness
tracking rooms_since_last_school), the candidate selection system
responds:

  ---------------- ------------------------------------------------------
  **Skipped        **System Response**
  Rooms**          

  2--3 in a row    Parent NPC mentions school in home room. Teacher
                   character calls.

  4--5             Principal office room candidate weighted highly.
                   Truancy warning as phone notification.

  6+               Police encounter room generated. Truancy officer NPC.
                   Parents face consequences. Forced school room
                   insertion. Behavioral tag 'truancy' added.
  ---------------- ------------------------------------------------------

The player CAN skip school, but the world pushes back. This is not a
hard lock --- it is emergent consequences. A player who persistently
skips school will have lower education stats, fewer job options, and a
behavioral history that the LLM reads in every future prompt.

10.3 The College Decision (Age 17)

> **✅ Decision:** *At age 17, the game generates a decision-point room
> where the player must confront their post-high-school path.*

This is a scripted room event, not a menu. The guidance counselor NPC
(or parent, or teacher) initiates a conversation about the future. The
player's choices during this conversation feed into LifeContext:

-   **Apply to college** --- college application rooms are weighted into
    candidates. Acceptance is probabilistic based on education nurture
    stats.

-   **Trade school** --- vocational training rooms appear. Shorter
    duration, direct career path.

-   **Enter workforce directly** --- job board immediately accessible.
    No tuition, but career ceiling is lower.

-   **Don't decide yet** --- valid. The decision defers. The system
    generates gentle nudges but does not force a path.

10.4 College

If the player enrolls in college: tuition obligation created (amount
varies by institution type); student loan application available through
computer; dorm housing option; school room type continues with college
context (lectures, dorm life, study groups, campus social scenes);
duration \~4 years (16--20 college-context rooms); dropping out is
possible at any time (student loans remain); graduation is a milestone
event room.

10.5 Academic Performance

> **✅ Decision:** *Academic performance is a nurture stat signal, not a
> visible GPA. The player feels their academic trajectory through room
> content and NPC feedback.*

Good academic performance (engaging with school room activities, paying
attention during script events, completing work-activity minigames):
increases education nurture stat; teacher NPCs respond positively;
college acceptance probability increases; scholarship opportunities
appear (reducing tuition).

Poor performance: decreases education nurture stat; parent and teacher
NPCs express concern; college acceptance probability decreases; remedial
room candidates appear.

The player never sees a GPA number. They feel their academic standing
through the world's response to them.

11\. The Library

> **✅ Decision:** *The library is a persistent, always-accessible
> location in the LocationRegistry from birth. It requires no unlock
> condition.*

The library serves multiple gameplay functions:

-   **Free computer access** --- for players who don't have a computer
    at home. Job applications, housing searches, and browser access are
    available here.

-   **Study rooms** --- school-age players can study, improving
    education nurture stats.

-   **Social space** --- quiet NPC interactions. Study groups. Book
    clubs.

-   **Safe space** --- for homeless or struggling players, the library
    is a room that is always available, always warm, always free.

The library appears in the LocationRegistry at game start with
returnable: true and unlock_condition: null. It is always accessible
through the Map app and through candidate selection.

12\. Trucking as Minigame

> **✅ Decision:** *Trucking is a MinigameKit sequence, not a standard
> work room.*

Trucking jobs use the MinigameKit system (defined in Interaction Systems
doc). The minigame template:

-   **Type:** route_delivery (sequence compositor)

-   **Input:** Steering via joystick/arrow keys. Speed management.

-   **Scoring:** Delivery time, fuel efficiency, cargo condition.

-   **Duration:** Multiple legs with rest stop rooms between them.

-   **Room context:** Big rig cab interior room type. Highway rooms for
    the driving segments. Truck stop rooms for breaks.

The work activity score from the trucking minigame feeds hourly wage
calculation (section 4.2). Better performance = better tips or bonus
pay. The trucking career path is first-class --- blue collar jobs are
not afterthoughts.

13\. World Topology as Narrative Choice

> **✅ Decision:** *The world has no spatial map. Location is a
> narrative choice expressed through the left/right room transition
> system.*

The player does not navigate a 2D overworld between locations. Instead:
the current room is the world; leaving a room presents the LLM-generated
next room (N+1 pipeline); fast travel via the Map app (phone) selects a
specific LocationRegistry entry as the next destination; walking left or
right out of a room generates contextual next-room candidates based on
the current location's neighborhood context.

"Where you are" is a narrative property of the room, not a coordinate.
The player experiences topology through choices: "go home", "go to
work", "walk to the park", "take the bus downtown." The candidate
selection system handles the spatial illusion. The LocationRegistry
provides the persistent anchor points.

This means neighborhood, proximity, and commute time are narrative
properties encoded in LifeContext, not computed from a spatial model.
The LLM knows the player lives in a suburb and works downtown --- it
generates commute rooms and transit rooms when appropriate.

14\. Health as Day-to-Day System

> **✅ Decision:** *Health depletes and recovers on a per-room basis.
> Illness manifests as room-level debuffs and narrative events, not
> instant death.*

14.1 Health Tick

On each room exit, the harness evaluates health:

-   **Base decay:** small constant per room (aging accelerates this).

-   **Hunger/hydration:** if neglected, health decays faster.

-   **Activity:** exercise rooms restore health. Sedentary rooms are
    neutral.

-   **Illness:** if ill, health decays at an elevated rate until
    treatment or recovery.

-   **Injury:** acute health drop, then slow recovery.

14.2 Illness Manifestation

Illness is probabilistic, influenced by: season (world_date); player age
(children and seniors more susceptible); health bar level (low health =
higher susceptibility); nature stats (physical constitution); behavioral
patterns (sleep deprivation, substance use).

When illness triggers:

-   A 'sick' tag is added to player state.

-   Movement speed decreases (GameConfig modifier).

-   Inner monologue reflects symptoms.

-   Work and school performance suffers.

-   Medical room candidates are weighted higher.

-   If untreated for multiple rooms, health continues to decline.

14.3 Chronic Conditions

Long-term health conditions (developing in middle age or from lifestyle
patterns) create persistent modifiers: ongoing medication obligation
(pharmacy visits, cost); periodic medical room candidates; activity
limitations in room interactions; inner monologue reflects ongoing
management.

The Demon reads health state. Low health elevates lethality. This is the
primary bridge between the day-to-day health system and the death
mechanic.

15\. Accessibility

> **✅ Decision:** *Accessibility features are built in from Phase 1.
> Configuration lives in the GameConfig document alongside other player
> settings.*

The following accessibility features should be added to the GameConfig
document's Player Settings Override section:

15.1 Visual Accessibility

  ------------------ ------------- -------------------------------------------
  **Setting**        **Default**   **Description**

  colorblind_mode    off           Options: protanopia, deuteranopia,
                                   tritanopia. Applies palette swap to all
                                   sprites and UI elements.

  high_contrast_ui   false         Increases contrast on all UI overlays,
                                   dialogue boxes, and HUD elements.

  text_size          1.0           Multiplier. Affects all dialogue, inner
                                   monologue, and UI text.

  screen_shake       true          Can be disabled for motion sensitivity.

  flash_effects      true          Can be disabled for photosensitivity.
  ------------------ ------------- -------------------------------------------

15.2 Input Accessibility

  ----------------------- ------------- -------------------------------------------
  **Setting**             **Default**   **Description**

  key_remapping           default_map   Full key remapping support. Stored in
                                        player settings.

  one_handed_mode         false         Remaps all controls to one side of keyboard
                                        or single joystick.

  hold_vs_toggle          hold          For interactions requiring sustained input.

  auto_advance_dialogue   false         Dialogue advances automatically after a
                                        configurable delay.
  ----------------------- ------------- -------------------------------------------

15.3 Cognitive Accessibility

  ---------------------- ------------- -------------------------------------------
  **Setting**            **Default**   **Description**

  text_speed             1.0           Already in GameConfig. Streaming text speed
                                       multiplier.

  pacing_preference      normal        Options: relaxed, normal, intense. Modifies
                                       beat system intervals.

  financial_summary      false         When enabled, a plain-language financial
                                       summary appears after each room transition
                                       showing income, expenses, and balance
                                       changes.

  notification_density   normal        Options: minimal, normal, all. Controls how
                                       many phone notifications appear.
  ---------------------- ------------- -------------------------------------------

15.4 Audio Accessibility

  ----------------------- ------------- -------------------------------------------
  **Setting**             **Default**   **Description**

  subtitles               true          Always on by default.

  visual_audio_cues       false         Replaces audio cues with visual indicators
                                        (screen flash or icon).

  screen_reader_support   false         Exposes UI tree to OS screen reader.
                                        Tauri's webview supports ARIA.
  ----------------------- ------------- -------------------------------------------

These settings live in the Player Settings Override section of the
GameConfig, meaning players can adjust them but the base values are
defined in the master config file.

16\. Open Questions

-   Exact interest rates and late fee percentages for game config
    calibration.

-   Investment system depth --- stocks, savings accounts, or just
    lump-sum "investments" as assets?

-   Insurance granularity --- health, car, home, or abstracted into a
    single obligation?

-   Tax simulation depth --- do we calculate taxes, or is it an
    invisible modifier on income?

-   Inheritance --- when a wealthy relative dies, does the player
    receive assets?

-   Gambling / lottery --- is this an income path? Connects to addiction
    predisposition.

-   Scholarship system for college --- merit-based, need-based, or both?

-   Inflation modeling --- does the era's economy affect prices over a
    lifetime?

-   Roommate conflict resolution --- eviction of a bad roommate as a
    room event.

*See System Design Document for architecture, LifeContext schema, and
engineering phases. See GameConfig for financial tuning values. See
Interaction Systems for MinigameKit templates used by work activities.
See NPC Design for character_response() pipeline used by trading.*
