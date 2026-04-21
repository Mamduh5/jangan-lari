## 1. Milestone 1 implementation goal

Milestone 1 must prove, in a short playable run, that two heroes using the same core loop can already feel mechanically different because of `Guard` versus `Mark`, not because of raw stats or extra weapons.

In playable terms, this milestone succeeds if:
- `Iron Warden` feels like a close-range survive-and-convert hero from minute one.
- `Raptor Frame` feels like a priority-target and tempo hero from minute one.
- early level-up choices already push runs toward an engine, not just flat power.
- `Guard` and `Mark` are visually and tactically readable during live combat.
- a short run already feels more like “build a loop” than “stack damage.”

## 2. Required runtime systems

- `Hero chassis runtime`
  Owns selected hero, chassis rule, starting stats, starting abilities, and any passive hero-level modifiers.
- `Ability slot runtime`
  Owns the three slots structurally: `Primary`, `Signature`, `Support`.
  Milestone 1 only needs active content in `Primary` and `Signature`, but the slot model should exist now.
- `Ability executor`
  Runs auto-fire / auto-aim, cooldowns, targeting, and effect application for Primaries and Signatures.
- `Combat state runtime`
  Owns `Guard` on the player and `Mark` on enemies.
  Handles apply, refresh, consume, cap, decay, and UI/debug exposure.
- `Trigger runtime`
  Supports only Milestone 1 trigger shapes:
  - `On Hit`
  - `On Kill`
  - `While Condition`
  It does not need the full later vocabulary yet.
- `Trait runtime`
  Applies a small trait set to hero, abilities, and state hooks.
  Should be data-driven at the selection layer, but implementation can stay thin.
- `XP and level runtime`
  Owns XP gain, level thresholds, pending rewards, and selection resolution.
- `Offer generator`
  Builds the 1-of-3 reward set using simple directed rules:
  - one deepen
  - one branch or utility
  - one stabilize
- `Enemy trio runtime`
  Supports exactly three role behaviors for Milestone 1:
  - Swarmer
  - Shooter
  - Anchor
- `Run flow runtime`
  Owns start, survive loop, short timer, defeat, and simple victory condition.
  Milestone 1 does not need a full event or boss layer.

## 3. Suggested code/data structure

Use the current repo shape, but keep this milestone intentionally narrow.

- Keep `RunScene` as the main match orchestrator.
  Do not split the whole game into many new managers yet.
- Keep `Player` and `Enemy` as the live combat entities.
  Extend them with only the state and hook points Milestone 1 needs.
- Add `src/game/data/abilities.ts`
  This should contain all Milestone 1 Primary and Signature definitions.
  Do not keep separate weapon-versus-skill systems.
- Add `src/game/data/traits.ts`
  Small trait pool only for Milestone 1.
- Update `src/game/data/heroes.ts`
  Heroes should reference:
  - base profile
  - chassis rule id
  - starting primary id
  - starting signature id
- Add `src/game/systems/CombatStateRuntime.ts`
  Central home for `Guard` and `Mark`.
  Keep this concrete, not generic for every future state family.
- Add `src/game/systems/AbilityLoadout.ts`
  Owns slot assignment, cooldown bookkeeping, and live ability references for the player.
- Add `src/game/systems/AbilityResolver.ts`
  Executes ability behavior by `behaviorId` or a small typed definition set.
  For Milestone 1, a small switch-based resolver is acceptable and preferable to a full scripting model.
- Add `src/game/systems/LevelUpDirector.ts`
  Owns XP thresholds, pending choices, and offer construction.
- Add `src/game/data/rewards.ts`
  Holds reward definitions for Milestone 1:
  - trait rewards
  - stat stabilizers
  - ability mods
- Extend existing debug snapshot code rather than inventing a second debug path.
  Expose live `Guard`, nearby `Mark`, cooldowns, chosen traits, and reward offers.

The key rule for this milestone:
- use data definitions for selection and authoring
- use thin typed runtime code for execution
- do not build a general-purpose effect DSL yet

## 4. Content scope for Milestone 1

Implement now:

- `2 heroes`
  - Iron Warden
  - Raptor Frame

- `4 abilities`
  - Iron Warden Primary: `Brace Shot`
  - Iron Warden Signature: `Bulwark Slam`
  - Raptor Frame Primary: `Seeker Burst`
  - Raptor Frame Signature: `Hunter Sweep`

- `0 active support abilities`
  The `Support` slot exists in runtime, but no support content is offered yet.
  This keeps Milestone 1 focused on chassis, state identity, and directional traits.

- `5 to 6 traits`
  Recommended:
  - `Close Guard`
  - `Steadfast Posture`
  - `Target Painter`
  - `Focused Breach`
  - `Scavenger Shield`
  - one simple stabilizer-style trait or ability mod if needed for offer variety

- `3 reward categories`
  Enough for basic directional choices:
  - aligned trait
  - off-path utility / bridge trait
  - stabilizer
  Milestone 1 does not need supports, keystones, or evolutions in live content.

- `3 enemies`
  - Swarmer
  - Shooter
  - Anchor

- `No boss`
- `No event`
- `One short timed run`
  Recommended length: `6–8 minutes`

What must be true about this content:
- Iron Warden can build toward Guard uptime and payoff.
- Raptor Frame can build toward Mark reliability and burst payoff.
- at least one cross-state bridge exists through `Scavenger Shield` so engine-building starts to show up.

## 5. Order of implementation

1. `Hero selection to run bootstrap`
   Wire hero choice into run start, spawn stats, and starting ability loadout.
   Reason: establishes the end-to-end loop fast.

2. `Ability slot runtime with Primary and Signature only`
   Implement slot ownership, cooldowns, auto-fire cadence, and targeting.
   Reason: both heroes need to feel different before progression matters.

3. `Guard and Mark runtime`
   Add player Guard and enemy Mark, including visual feedback and consumption hooks.
   Reason: this is the core system distinction Milestone 1 is trying to prove.

4. `Iron Warden full combat loop`
   Implement Brace Shot, Bulwark Slam, Guard generation, and Guard spend.
   Reason: Warden is the easier baseline and will reveal if Guard is over-safe too early.

5. `Raptor Frame full combat loop`
   Implement Seeker Burst, Hunter Sweep, Mark application, and Mark payoff.
   Reason: once Warden is stable, Raptor exposes whether Mark is readable and satisfying.

6. `Enemy trio`
   Add Swarmer, Shooter, and Anchor with simple wave composition.
   Reason: hero feel is meaningless without pressure patterns that distinguish priorities.

7. `XP and basic level-up flow`
   Add XP gain, thresholds, pause/select flow, and reward resolution.
   Reason: once combat works, progression can be judged against real play.

8. `Small trait pool`
   Add the 5 to 6 prototype traits and hook them into the ability/state runtime.
   Reason: this is the first real proof of engine-building.

9. `Directed offer logic`
   Build simple offer rules so level-ups already feel directional.
   Reason: this is what turns “upgrades” into “build shape.”

10. `Short run win/lose flow`
   Add timer, defeat, and simple survive-to-win logic.
   Reason: completes the milestone as a repeatable playable slice.

This order reduces risk because it validates:
- hero identity before progression
- states before content scale
- progression against real combat
- trait value against a stable encounter loop

## 6. Early test and debug needs

- `Live combat debug overlay`
  Show:
  - current hero
  - active Guard value
  - nearby enemies with Mark state
  - Primary cooldown
  - Signature cooldown
  - chosen traits
  - current offer set
- `Force reward command`
  Let designers grant a specific trait during a run.
- `Force XP / level command`
  Essential for testing level-up flow quickly.
- `Force hero start`
  Start directly as Iron Warden or Raptor Frame without menu friction.
- `Spawn enemy role command`
  Spawn Swarmers, Shooters, or Anchors on demand.
- `Wave composition debug label`
  Show current counts of each enemy type in the live wave.
- `State event logging`
  For debug mode only:
  - Guard gained
  - Guard spent
  - Mark applied
  - Mark consumed
- `Basic unit tests`
  Cover:
  - Guard apply/spend rules
  - Mark apply/consume rules
  - offer generation never producing three flat stabilizers
- `Basic gameplay smoke test`
  Verify:
  - both heroes can complete or meaningfully progress in a short run
  - reward selection does not break runtime state
- `Snapshot export`
  Extend current gameplay snapshot so playtests can inspect:
  - current hero
  - state values
  - chosen traits
  - offer history if practical

## 7. Milestone 1 success criteria

Milestone 1 is ready to move to Milestone 2 when all of the following are true:

- `Hero difference is immediate`
  A fresh run as Iron Warden and a fresh run as Raptor Frame feel mechanically different before level 3.

- `Guard and Mark are readable in motion`
  Playtesters can correctly describe:
  - how Warden gains and spends Guard
  - how Raptor applies and cashes out Mark

- `Level-up choices are already directional`
  Most offer sets feel like:
  - deepen current lane
  - take a bridge / utility option
  - stabilize

- `At least one engine emerges per hero by mid-run`
  Example:
  - Warden: close-range Guard generation into stronger Slam windows
  - Raptor: Mark reliability into stronger priority burst

- `Neither hero is broken by baseline design`
  - Warden is not obviously the safest and strongest choice
  - Raptor is not only fun when high-rolling early traits

- `No trait feels secretly mandatory`
  Especially:
  - Warden must function without `Close Guard`
  - Raptor must function without `Target Painter`

- `Enemy trio creates real contrast`
  - Swarmers reward space control
  - Shooters reward priority handling
  - Anchors test sustained pressure
  If these roles do not change build value, the milestone is not ready.

- `The short run is already more about interaction than accumulation`
  Players should describe the run in terms of loops and setup/payoff, not just raw damage increases.

If those criteria are met, Milestone 2 can safely add supports, broader trait structure, and a third state family without building on a false foundation.