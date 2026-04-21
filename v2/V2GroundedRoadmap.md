## 1. Executive recommendation
V2 should focus on strengthening the **existing** V1 spine into a clearer engine-builder: unify trigger entry points, make state interactions transactional, sharpen trait roles, improve reward coherence, and make encounters actively validate build quality. It should explicitly avoid architecture replacement, proc-engine expansion, hero-count expansion, and content flood as a substitute for system clarity. The repo already has the right base (`RunScene` + `AbilityResolver` + `CombatStateRuntime` + `TraitRuntime` + `LevelUpDirector` + `SpawnDirector`), so V2 should be additive and disciplined, not structural churn. The first implementation pass should remain exactly the small foundation step: **trigger seam consolidation only**, with behavior parity and test parity as hard constraints.

## 2. Proposed V2 milestone map

### V2-M1
- Name: Trigger Seam Consolidation
- Objective: Route all current live trigger entry points through one typed seam (on-hit, on-kill, on-consume/signature payoff, while-condition checks) without gameplay changes.
- Why it comes at this stage: Current trigger logic is split across runtime locations; adding V2 interactions before consolidation will multiply brittle coupling.
- In-scope systems/files:
  - [RunScene.ts](D:/Mamduh/Personal/jangan-lari/src/game/scenes/RunScene.ts)
  - [AbilityResolver.ts](D:/Mamduh/Personal/jangan-lari/src/game/systems/AbilityResolver.ts)
  - [TraitRuntime.ts](D:/Mamduh/Personal/jangan-lari/src/game/systems/TraitRuntime.ts)
  - [milestone1Runtime.test.ts](D:/Mamduh/Personal/jangan-lari/tests/unit/milestone1Runtime.test.ts)
  - [special-attacks.spec.ts](D:/Mamduh/Personal/jangan-lari/tests/e2e/special-attacks.spec.ts)
- Explicitly out of scope:
  - New traits, new supports, new state family, reward logic redesign, encounter redesign.
- Success condition: Existing behavior and existing test results remain equivalent; new trigger additions have one clear hook surface.
- Failure mode / warning sign: Any gameplay drift in current signatures/supports while “refactor only” is underway.

### V2-M2
- Name: State Transaction Layer
- Objective: Upgrade state operations from loose booleans to structured state transactions (apply/refresh/consume outcomes with value payloads).
- Why it comes at this stage: V2 engine roles need reliable state outcomes to avoid bespoke per-ability branching.
- In-scope systems/files:
  - [CombatStateRuntime.ts](D:/Mamduh/Personal/jangan-lari/src/game/systems/CombatStateRuntime.ts)
  - [Enemy.ts](D:/Mamduh/Personal/jangan-lari/src/game/entities/Enemy.ts)
  - [AbilityResolver.ts](D:/Mamduh/Personal/jangan-lari/src/game/systems/AbilityResolver.ts)
  - [RunScene.ts](D:/Mamduh/Personal/jangan-lari/src/game/scenes/RunScene.ts)
- Explicitly out of scope:
  - Adding new status families; introducing stacked proc chains; generic scripting runtime.
- Success condition: Guard/Mark/Disrupted/Ailment interactions can be consumed as typed outcomes across resolver/traits.
- Failure mode / warning sign: State handling becomes more opaque or duplicated than before.

### V2-M3
- Name: Engine-Role Trait Pass
- Objective: Make trait/support/evolution interactions clearly express producer, amplifier, converter, consumer, stabilizer, keystone roles.
- Why it comes at this stage: After M1+M2, role identity can be authored cleanly instead of patching ad-hoc conditionals.
- In-scope systems/files:
  - [traits.ts](D:/Mamduh/Personal/jangan-lari/src/game/data/traits.ts)
  - [rewards.ts](D:/Mamduh/Personal/jangan-lari/src/game/data/rewards.ts)
  - [TraitRuntime.ts](D:/Mamduh/Personal/jangan-lari/src/game/systems/TraitRuntime.ts)
  - [abilities.ts](D:/Mamduh/Personal/jangan-lari/src/game/data/abilities.ts)
  - [evolutions.ts](D:/Mamduh/Personal/jangan-lari/src/game/data/evolutions.ts)
- Explicitly out of scope:
  - Large content count increase; new hero; subsystem-specific one-off mechanics.
- Success condition: Same hero can reach visibly different engine identities (not only stronger lane baseline).
- Failure mode / warning sign: “Role labels” exist in docs but runtime behavior still reads as generic damage scaling.

### V2-M4
- Name: Reward Coherence Pass
- Objective: Evolve reward selection from lane-flavored bias to engine-coherent direction (deepen/bridge/stabilize informed by current machine state).
- Why it comes at this stage: Role-authored parts from M3 need director logic that assembles coherent machines.
- In-scope systems/files:
  - [LevelUpDirector.ts](D:/Mamduh/Personal/jangan-lari/src/game/systems/LevelUpDirector.ts)
  - [rewards.ts](D:/Mamduh/Personal/jangan-lari/src/game/data/rewards.ts)
  - [RunScene.ts](D:/Mamduh/Personal/jangan-lari/src/game/scenes/RunScene.ts) (context signal plumbing only)
  - [milestone1Runtime.test.ts](D:/Mamduh/Personal/jangan-lari/tests/unit/milestone1Runtime.test.ts)
- Explicitly out of scope:
  - Replacing 1-of-3 structure; probabilistic black-box reward framework rewrite.
- Success condition: Repeat runs show coherent branch progression and fewer noisy/misaligned offers.
- Failure mode / warning sign: Reward logic becomes unpredictable or hard to reason about in tests/playtests.

### V2-M5
- Name: Chassis Law Expression Pass
- Objective: Sharpen each existing hero’s chassis law expression through the shared framework (not bespoke subsystems).
- Why it comes at this stage: Chassis should be tuned after core engine grammar and reward coherence are stable.
- In-scope systems/files:
  - [heroes.ts](D:/Mamduh/Personal/jangan-lari/src/game/data/heroes.ts)
  - [AbilityResolver.ts](D:/Mamduh/Personal/jangan-lari/src/game/systems/AbilityResolver.ts)
  - [TraitRuntime.ts](D:/Mamduh/Personal/jangan-lari/src/game/systems/TraitRuntime.ts)
  - [LevelUpDirector.ts](D:/Mamduh/Personal/jangan-lari/src/game/systems/LevelUpDirector.ts)
  - [MenuScene.ts](D:/Mamduh/Personal/jangan-lari/src/game/scenes/MenuScene.ts) (description clarity only)
- Explicitly out of scope:
  - New hero; exclusive hero-only subsystem outside shared grammar.
- Success condition: Hero identity is clearer in early-mid run and remains distinct under off-bias builds.
- Failure mode / warning sign: Hero differentiation comes from hidden exceptions, not shared-system law expression.

### V2-M6
- Name: Encounter Response Pass
- Objective: Make encounters test engine quality (anti-ramp, anti-turtle, consumer windows, stabilize pressure) on the existing run path.
- Why it comes at this stage: V2 claims are unproven unless world response validates the engine.
- In-scope systems/files:
  - [SpawnDirector.ts](D:/Mamduh/Personal/jangan-lari/src/game/systems/SpawnDirector.ts)
  - [RunScene.ts](D:/Mamduh/Personal/jangan-lari/src/game/scenes/RunScene.ts)
  - [Enemy.ts](D:/Mamduh/Personal/jangan-lari/src/game/entities/Enemy.ts)
  - [enemies.ts](D:/Mamduh/Personal/jangan-lari/src/game/data/enemies.ts)
  - [gameplay-bot.spec.ts](D:/Mamduh/Personal/jangan-lari/tests/e2e/gameplay-bot.spec.ts)
- Explicitly out of scope:
  - New encounter architecture/event framework rewrite; additional bosses beyond current Behemoth path.
- Success condition: Different build engines fail/succeed for structural reasons, not just DPS totals.
- Failure mode / warning sign: Encounter additions create noise but do not change decision pressure.

### V2-M7
- Name: Full V2 Slice Validation
- Objective: Close V2 with repeatable proof that each hero has at least one clear “built machine” route and meaningful alternates.
- Why it comes at this stage: Integrates all prior milestones into stability and validation, not new design churn.
- In-scope systems/files:
  - [tests/e2e/special-attacks.spec.ts](D:/Mamduh/Personal/jangan-lari/tests/e2e/special-attacks.spec.ts)
  - [tests/e2e/gameplay-bot.spec.ts](D:/Mamduh/Personal/jangan-lari/tests/e2e/gameplay-bot.spec.ts)
  - [tests/unit/milestone1Runtime.test.ts](D:/Mamduh/Personal/jangan-lari/tests/unit/milestone1Runtime.test.ts)
  - [gameplaySnapshot.ts](D:/Mamduh/Personal/jangan-lari/src/game/debug/gameplaySnapshot.ts)
- Explicitly out of scope:
  - New feature line; major content expansion; architecture reopening.
- Success condition: V2 outcomes are test-backed, playtest-backed, and stable across repeated runs.
- Failure mode / warning sign: V2 ends as partial behavior changes without measurable repeat-run improvement.

## 3. Recommended execution order
Recommended order: **V2-M1 → V2-M2 → V2-M3 → V2-M4 → V2-M6 → V2-M5 → V2-M7**.

Why:
- M1+M2 are mandatory technical preconditions.
- M3+M4 create actual engine identity and directed assembly.
- I am explicitly reordering from the nominal sequence by executing **M6 before M5**: encounter proof should come before chassis polish, otherwise chassis tuning can mask system weakness.
- M7 is closure only after design and runtime proof exist.

## 4. Completion tracking model

### V2-M1
- design complete: typed trigger surface and ownership map agreed.
- implementation complete: all current trigger points route through seam, no behavior intent changes.
- playtest complete: baseline hero loops feel unchanged.
- validated/stable: unit + e2e parity holds; no regression drift after merge.

### V2-M2
- design complete: state transaction contract finalized.
- implementation complete: Guard/Mark/Disrupted/Ailment operations emit structured outcomes.
- playtest complete: state behavior readability unchanged or improved.
- validated/stable: no increase in state bugs, and resolver/trait code complexity decreases.

### V2-M3
- design complete: role map for traits/support/evolutions is explicit and non-overlapping.
- implementation complete: role behaviors wired in data + runtime with limited additions.
- playtest complete: each hero can build at least two distinct machine patterns.
- validated/stable: repeat-run logs show role diversity, not generic amplifier dominance.

### V2-M4
- design complete: reward coherence rules defined (deepen/bridge/stabilize + engine context).
- implementation complete: director uses engine context signals deterministically.
- playtest complete: offer sets feel coherent and branch-supportive over multi-run samples.
- validated/stable: tests prove evolution/support/trait path reachability remains healthy.

### V2-M5
- design complete: chassis law statements per hero are concrete and testable.
- implementation complete: hero law expression adjustments integrated without bespoke subsystem creation.
- playtest complete: hero identity difference is obvious by early-mid run.
- validated/stable: off-bias play still valid; no single hero law dominates all scenarios.

### V2-M6
- design complete: encounter response matrix (anti-ramp/anti-turtle/consumer/stabilize checks) defined.
- implementation complete: pressure cases live on existing spawn/run path.
- playtest complete: encounter pressure clearly exposes engine weaknesses.
- validated/stable: e2e snapshots consistently show meaningful pressure-beat behavior.

### V2-M7
- design complete: closure checklist and acceptance metrics frozen.
- implementation complete: final tuning/test updates completed, no open structural tasks.
- playtest complete: repeated-run campaign across all heroes confirms V2 goals.
- validated/stable: release-ready with regression suite green and no critical balance blockers.

## 5. Cross-milestone guardrails
- Architecture: keep the runtime spine (`RunScene` orchestrator, switch-based `AbilityResolver`, thin `CombatStateRuntime`, directed `LevelUpDirector`) intact.
- Trigger complexity: max “one trigger + optional one condition + one outcome” per unit of content; no nested proc chains.
- State scope: no new state family until current state economy proves insufficient under V2 tests.
- Content scope: no new hero in V2; add only content needed to validate role coverage/coherence.
- Reward coherence: always preserve 1-of-3 directional structure with a stabilizer path; avoid fully flat/random pool behavior.
- Encounter scope: evolve current spawn/boss path; do not introduce a generalized event framework rewrite.
- Hero/system reuse: chassis differences must emerge through shared systems, not hero-exclusive micro-engines.
- Regression discipline: every milestone must land with unit/e2e updates in existing suites before next milestone starts.
- Legacy isolation: keep non-live legacy weapon-upgrade path ([upgrades.ts](D:/Mamduh/Personal/jangan-lari/src/game/data/upgrades.ts)) out of V2 critical path unless explicitly promoted.

## 6. Immediate next step
Run exactly one implementation pass: **V2-M1 Trigger Seam Consolidation (behavior-preserving refactor only)** across [RunScene.ts](D:/Mamduh/Personal/jangan-lari/src/game/scenes/RunScene.ts), [AbilityResolver.ts](D:/Mamduh/Personal/jangan-lari/src/game/systems/AbilityResolver.ts), and [TraitRuntime.ts](D:/Mamduh/Personal/jangan-lari/src/game/systems/TraitRuntime.ts), with mandatory parity validation via existing unit and e2e tests.