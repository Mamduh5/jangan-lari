## 1. Implementation goal

Version 1 must prove one thing in playable form:

**A survivors-like run can stay simple on the surface while producing clearly different, readable builds through hero chassis, state interaction, and directed reward choices instead of mostly additive weapon/stat stacking.**

In practice, that means the first implementation must prove all of the following at once:
- the three heroes feel structurally different before full content scale
- runs form recognizable engines, not just stronger piles of upgrades
- the 1-of-3 reward flow reliably offers deepen / branch / stabilize decisions
- encounters create real reasons to value `Ailment`, `Mark`, and `Guard` differently

## 2. Pre-implementation content adjustments

These are the smallest worthwhile design adjustments before coding.

### Narrow `Pressure Lenses`
Current risk: too generic, too likely to become best-in-slot for every successful build.

Recommended adjustment:
- change it from “bonus damage to enemies already carrying your main state” to a narrower aligned amplifier
- good direction: make it care about `Signature` damage against state-affected enemies, not all damage

Why:
- keeps it useful
- stops it from being universal glue for every build
- preserves build identity instead of rewarding all engines equally

### Tighten `Bulwark Halo`
Current risk: hidden mandatory stabilizer, especially for Iron Warden.

Recommended adjustment:
- keep it as light Guard support only
- do not let it become sufficient Guard generation by itself
- make it proximity-dependent and low-output

Why:
- it should smooth Guard play, not solve Guard play

### Tighten `Spotter Drone`
Current risk: mandatory for Raptor Frame and too efficient at solving Mark setup.

Recommended adjustment:
- make it prioritize elite / healthiest / farthest threat intermittently, not constantly
- it should assist target definition, not replace core Mark production

Why:
- Raptor must still function from primary + chassis, not from one support solving the build

### Simplify `Predator Relay`
Current risk: too indirect and too many conditions for version 1.

Recommended adjustment:
- reduce it to a cleaner bridge
- example shape: “Gaining Guard empowers your next Signature against Marked enemies”
- avoid duration windows plus multi-state timing logic

Why:
- same fantasy, cleaner trigger readability

### Mark these as explicit balance watch-items rather than redesign targets
- `Kill Chain Protocol`
- `Pyre Constellation`
- `Iron Reserve`
- `Scavenger Shield`

Why:
- they are strong ideas and likely worth preserving
- they just need careful tuning and gating, not concept changes

### Encounter-spec clarification before coding
Lock these encounter requirements into implementation planning:
- one anti-turtle behavior
- one anti-ramp behavior
- one protected-priority formation pattern
- mixed-threat compositions from the first real combat slice onward

Why:
- otherwise the system may appear good in a vacuum and fake in actual play

## 3. System implementation order

This order is the safest because it validates the framework early and keeps tuning local before content scale expands.

### 1. Foundation systems
Build first:
- hero chassis model
- ability slot model: `Primary`, `Signature`, `Support`
- run state container
- enemy state tracking container
- shared stat/modifier pipeline
- trigger grammar backbone

Why first:
- everything depends on clean ownership
- if chassis, abilities, and triggers are unclear, all later content becomes brittle and hard to tune

### 2. Combat/state systems
Build second:
- `Ailment`, `Mark`, `Guard`
- state application rules
- state consumption/payoff rules
- state visuals/feedback
- basic enemy interactions with state families

Why second:
- this is the core proof of the design
- version 1 lives or dies on state families feeling meaningfully different

### 3. Ability execution layer
Build third:
- primary behavior execution
- signature behavior execution
- support behavior execution
- targeting and auto-fire/auto-aim integration
- ability-specific hooks into states/triggers

Why third:
- once states exist, abilities can be authored against a stable language
- this is where heroes begin to feel distinct

### 4. Reward/progression systems
Build fourth:
- level-up cadence
- 1-of-3 offer generation
- directed reward logic
- trait acquisition
- support acquisition rules
- evolution eligibility and offer logic

Why fourth:
- once heroes and states function, progression can be tuned around real gameplay loops
- reward logic is easier to test when the underlying engine already exists

### 5. Content/data authoring
Build fifth:
- hero roster content
- support pool
- trait pool
- evolution definitions
- reward category weights
- basic progression tables

Why fifth:
- authoring should happen after the runtime grammar is stable
- otherwise content gets rewritten repeatedly

### 6. Encounter layer
Build sixth, but start basic hooks earlier:
- enemy roles
- mixed-threat formations
- event scripting
- boss pressure patterns
- wave composition rules

Why this order:
- encounter tuning only matters once builds exist
- but encounter hooks should be anticipated early so state systems are not authored in a vacuum

## 4. Smallest playable milestone

This is the smallest internal milestone that can genuinely prove the framework early.

### Scope
- `2 heroes`
  - Iron Warden
  - Raptor Frame
- `4 abilities total`
  - 2 Primaries
  - 2 Signatures
- `2 shared supports`
  - Bulwark Halo
  - Spotter Drone
- `6 traits total`
  - 2 Enablers
  - 2 Amplifiers
  - 1 Converter
  - 1 Keystone
- `3 enemy roles`
  - Swarmer
  - Shooter
  - Anchor
- `1 short event`
  - Target Hunt or Pressure Wave, pick one
- `1 short boss prototype`
- `1 short run format`
  - 6 to 8 minutes is enough for internal validation

### What must already feel good
- both heroes feel different by minute one
- `Guard` and `Mark` feel different in real combat, not just in text
- level-up picks already feel directional
- at least one hero can form a readable engine by mid-run
- encounters create a reason to care about priority vs stability
- the game already feels more like “build a loop” than “add stats”

### Why this is the right smallest milestone
- it tests the highest-risk tensions first:
  - Guard over-safety
  - Mark roll dependence
  - support tax risk
- it avoids bringing Ailment online before the framework is stable
- it keeps the first tuning problem small enough to understand

## 5. Milestone roadmap

### Milestone 1: Core Combat Grammar
What gets added:
- hero chassis framework
- ability slot framework
- `Guard` and `Mark`
- Iron Warden and Raptor Frame
- primary + signature execution
- minimal enemy trio
- short run loop with XP and basic level-up flow

What is being validated:
- can two heroes feel different through the shared framework?
- do `Guard` and `Mark` read clearly in motion?
- does combat already hint at engine-building?

What risks are being checked:
- Guard over-safety
- Mark low-floor frustration
- baseline trigger readability

### Milestone 2: Directed Rewards and Trait Engines
What gets added:
- initial trait pool for Warden/Raptor
- 2 supports
- directed 1-of-3 reward logic
- deepen / branch / stabilize offer rules
- first keystone
- first event prototype

What is being validated:
- do rewards create direction rather than clutter?
- do supports feel like branches instead of taxes?
- can players explain their build in one sentence?

What risks are being checked:
- support mandatory-pick behavior
- generic trait dominance
- roll dependence on one key enabler

### Milestone 3: Ailment Lane and Third Hero
What gets added:
- `Ailment`
- Ash Weaver
- Ailment-aligned traits
- Contagion Node
- first Ailment-specific event or encounter pressure
- broader mixed-threat waves

What is being validated:
- does Ailment feel like pressure/setup rather than just another damage label?
- do the three state families now support three distinct hero fantasies?
- does the combat ecosystem test ramp builds honestly?

What risks are being checked:
- Ailment becoming too universally comfortable
- Ash Weaver over-reliance on one trait
- state-family overlap

### Milestone 4: Evolution Layer
What gets added:
- 2 evolutions per hero
- evolution eligibility logic
- late-run offer rules
- boss tuned with add waves, protected targets, and anti-turtle pressure

What is being validated:
- do evolutions complete builds instead of replacing them?
- do pre-evolution choices still matter?
- does each hero have at least two viable end states?

What risks are being checked:
- evolution overshadowing the rest of the run
- one evolution per hero becoming dominant
- late-run reward clutter

### Milestone 5: Full Version-1 Slice
What gets added:
- remaining supports
- final compact trait pool
- both events
- full 5-role encounter ecosystem
- tuning pass across reward weights and progression pacing

What is being validated:
- does the whole package sustain repeat runs?
- are heroes, supports, and traits all pulling their weight?
- do encounters actually expose different build strengths and weaknesses?

What risks are being checked:
- stagnant dominant routes
- trait/support tax picks
- encounter pressure failing to test the system honestly

## 6. Tuning watch list

These should be treated as high-risk during implementation and early playtest.

### State families
- `Guard`
  Main risk: safest and strongest by default
- `Mark`
  Main risk: weak when behind, fun only when ahead
- `Ailment`
  Main risk: broadest and most universally comfortable route

### Supports
- `Bulwark Halo`
  Watch for hidden mandatory stabilizer behavior
- `Spotter Drone`
  Watch for solving Mark too completely
- `Echo Turret`
  Watch for universal best-support syndrome
- `Recovery Field`
  Watch for boring but necessary-feeling behavior

### Traits
- `Pressure Lenses`
  Watch for generic dominance
- `Close Guard`
  Watch for Warden dependency
- `Target Painter`
  Watch for Raptor dependency
- `Predator Relay`
  Watch for readability and actual usage
- `Scavenger Shield`
  Watch for too-efficient offense/defense bridge
- `Iron Reserve`
  Watch for Guard runaway scaling

### Evolutions
- `Pyre Constellation`
  Watch for best default evolution on Ash Weaver
- `Kill Chain Protocol`
  Watch for snowball instability
- `Citadel Core`
  Watch for passive bunker dominance
- `Cinder Crown`
  Watch for being structurally correct but under-picked
- `Siege Lock Array`
  Watch for low excitement despite solid function
- `Reckoner Drive`
  Watch for hybrid-path roll dependence

### Reward system
- early enabler frequency
- support offer timing
- keystone timing
- evolution gating
- branch clutter in late run

### Encounter layer
- anti-turtle pressure being too weak
- anti-ramp pressure being absent or too harsh
- protected targets not mattering enough
- mixed-threat layering arriving too late in the run

## 7. Validation criteria

Version 1 is working only if the following gameplay outcomes are true.

### Readable build identity
Success looks like:
- by mid-run, a player can clearly describe their build
- examples:
  - “I build Guard and convert it into pulse pressure”
  - “I spread Ailment and detonate packs”
  - “I mark priority enemies and chain kills”

Failure signs:
- players mostly describe builds as “more damage” or “faster attacks”
- builds differ numerically but not behaviorally

### Meaningful differences between heroes
Success looks like:
- hero identity is visible before rare traits or evolutions
- the same support or trait does not erase hero differences
- heroes draft differently even from the first few levels

Failure signs:
- two heroes converge onto the same reward priorities too often
- one hero only feels different after high-roll synergy
- one hero feels like the default best starter for all players and all encounters

### Interactions over accumulation
Success looks like:
- the strongest builds depend on relationships between chassis, state, trait, and signature
- players can feel a loop turning on
- support and trait picks matter because they connect systems, not just inflate output

Failure signs:
- generic amplifiers outperform aligned synergies
- the best runs are just best-stat runs
- state families feel decorative rather than structural

### Reward choices feeling directional
Success looks like:
- most level-up screens present a real deepen / branch / stabilize decision
- off-plan picks are understandable but not usually optimal
- players can recover or pivot without feeling randomly doomed

Failure signs:
- one reward category dominates too often
- too many offers are obvious
- one missing enabler ruins the run
- support offers feel like taxes, not choices

### Encounters actually testing the system
Success looks like:
- Guard builds are pressured but not invalidated by anti-turtle content
- Ailment builds are pressured but not invalidated by anti-ramp content
- Mark builds have real priority problems to solve
- mixed-threat encounters create different answers for different builds

Failure signs:
- any one build style clears all encounter types too comfortably
- bosses do not differentiate build quality
- protected targets and mixed formations do not change player value perception

### Repeat-run outcome test
Version 1 is truly working if repeated runs produce:
- different-feeling build identities on the same hero
- different reasons to choose the same trait or support depending on context
- noticeable contrast between hero strengths under different encounter mixes

If repeated runs mostly produce:
- one best evolution path per hero
- one best support per hero
- one best generic trait package across the whole roster

then the framework is not yet proven, even if moment-to-moment combat is fun.