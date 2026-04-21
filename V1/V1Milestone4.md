## 1. Milestone 4 goal
Milestone 4 must prove that the current state-driven build system can reach a real late-run lock-in without collapsing into generic scaling. In playable form, that means a run can:
- build a clear engine through hero lane + support + traits,
- earn a gated late-run evolution that completes that engine rather than replacing it,
- and then be tested by a real boss encounter with adds, protected-priority pressure, and anti-turtle behavior.

The core proof is not “we added flashy capstones.” It is: pre-evolution choices still matter, the evolution feels earned, and the boss meaningfully distinguishes build quality.

## 2. Current stable foundation
From Milestones 1 to 3, the repo now has a stable combat spine:
- `RunScene` is the single match orchestrator.
- `Player`, `Enemy`, `AbilityLoadout`, `AbilityResolver`, `CombatStateRuntime`, `TraitRuntime`, and `LevelUpDirector` are the live runtime path.
- Three playable heroes are live through the normal menu/save flow:
  - Iron Warden
  - Raptor Frame
  - Ash Weaver
- Three primary state lanes are live:
  - `Guard`
  - `Mark`
  - `Ailment`
- `Disrupted` is live as an auxiliary support/setup condition.
- Directed `1-of-3` rewards are live with deepen / bridge / stabilize behavior.
- The support slot is live and shared across heroes.
- Mixed-wave pressure already extends through `SpawnDirector`.
- Debug snapshot and real-scene e2e coverage already validate hero selection, state application, support branching, and live run behavior.

## 3. What Milestone 4 should add
Milestone 4 should add the smallest meaningful late-run completion layer:

- `Evolution` as a new late-run reward type.
- `Evolution eligibility logic` tied to demonstrated build commitment, not pure luck.
- `Late-run offer rules` so evolutions only appear once the build is already coherent.
- `2 evolutions per hero` in authored content, with only `1` choosable per run.
- `One live boss encounter` on the normal run path.
- Boss pressure that explicitly includes:
  - add waves
  - protected-priority targets or windows
  - anti-turtle pressure
- Enough boss/build interaction to make the two evolutions per hero feel meaningfully different.

Repo-aware tension:
- The roadmap says Milestone 4 adds boss tuning, and the repo already contains boss/miniboss enemy definitions plus boss/miniboss signal types in [src/game/entities/Enemy.ts](/abs/path/src/game/entities/Enemy.ts), but `RunScene` currently only handles `ranged-shot` signals and `SpawnDirector` never spawns miniboss/boss content.
- Smallest correction that preserves the roadmap: keep Milestone 4 as the evolution+boss milestone, but implement exactly one boss prototype on the current run path instead of a broad boss framework.

Secondary tension:
- Saved planning docs discussed keystones earlier, but the current repo only has live trait categories equivalent to enabler / amplifier / converter.
- Smallest correction: do not reopen keystones first. Add evolutions as their own late-run reward lane on top of the current trait/runtime system.

## 4. What should stay unchanged
These foundations should remain stable:

- Keep `RunScene` as the match orchestrator.
- Keep `AbilityResolver` switch-based.
- Keep `CombatStateRuntime` as the thin owner for live state access.
- Keep `Enemy` as the concrete holder of timed state and combat presentation.
- Keep authoring in `src/game/data/*`.
- Keep the directed reward model; do not replace `LevelUpDirector` with a generic reward framework.
- Keep the current hero identities intact:
  - Warden = Guard convert/spend
  - Raptor = Mark focus/burst
  - Ash = Ailment apply/consume
- Keep `Disrupted` auxiliary; Milestone 4 should not turn it into a fourth primary lane.
- Do not reopen support-slot architecture, menu/meta flow, or permanent upgrade structure unless forced by a narrow implementation need.

## 5. Recommended Milestone 4 content scope
Smallest strong scope:

- `6 evolutions total`
  - Iron Warden:
    - `Citadel Core`
    - `Reckoner Drive`
  - Raptor Frame:
    - `Kill Chain Protocol`
    - `Siege Lock Array`
  - Ash Weaver:
    - `Pyre Constellation`
    - `Cinder Crown`
- `1 evolution per run max`
- `1 new reward category`
  - `evolution`
- `1 eligibility model`
  - hero match
  - required trait/support/build-state commitments
  - late-run timing gate
- `1 boss prototype`
  - preferably built from the existing boss-capable path already represented in `data/enemies.ts` / `Enemy.ts`
- `1 boss phase structure`
  - baseline chase/pressure
  - add-wave window
  - protected-priority or vulnerable-window pattern
  - anti-turtle moment
- `No new hero`
- `No event framework`
- `No broad encounter rewrite`
- `No generalized trigger/effect language`

Practical recommendation:
- Extend `RewardCategory` / `RewardDefinition` with `evolution`.
- Add authored evolution data in `src/game/data/*` rather than encoding evolution logic directly into `LevelUpDirector`.
- Keep evolution payoff execution in `AbilityResolver` / `TraitRuntime` / `RunScene` using thin explicit hero-specific checks.

## 6. Main design and implementation risks
The biggest risks are:

- Evolution overshadowing the whole run.
  - If base traits/supports feel like filler before evolution, the milestone fails.
- One evolution per hero becoming the obvious default.
  - This is especially risky for `Pyre Constellation`, `Citadel Core`, and `Kill Chain Protocol` based on the saved docs.
- Evolution gating being too random or too loose.
  - Too random: runs miss their late payoff.
  - Too loose: every run gets the same spike regardless of prior choices.
- Boss implementation drifting into architecture work.
  - The repo has latent boss/miniboss definitions, but the live run path does not yet use them.
- Boss pressure not actually testing the system.
  - If the boss is mostly “large HP + hazard spam,” it will not validate Guard/Mark/Ailment differences.
- Anti-turtle pressure over-punishing Warden.
  - It must check passive bunker play without invalidating close-range Guard play entirely.
- Protected-priority pressure not mattering enough.
  - If adds are trivial or windows are always open, Mark-focused and execution branches lose meaning.
- Late-run reward clutter.
  - Evolution offers must not bury the existing deepen / bridge / stabilize logic.

## 7. Recommended implementation order
1. Add evolution data definitions.
- Create explicit authored evolution records for the 6 planned evolutions.
- Keep requirements and payoff descriptions in data first, before wiring runtime behavior.

2. Extend reward/runtime plumbing for late-run evolution offers.
- Add an `evolution` reward category.
- Track whether a run already owns an evolution.
- Add a late-run gate in `LevelUpDirector` rather than replacing the current reward system.

3. Add minimal eligibility evaluation.
- Use current run state:
  - selected hero
  - owned traits
  - equipped support
  - possibly simple counters already tracked in `RunScene`
- Avoid deep new telemetry unless a specific evolution truly needs it.

4. Implement the first-pass runtime payoff hooks for evolutions.
- Add the smallest hero-specific runtime modifiers needed.
- Prefer explicit checks in `TraitRuntime`, `AbilityResolver`, and `RunScene` over a generic evolution engine.

5. Wire one boss prototype into the live run.
- Add boss spawn timing/triggering to the existing run flow.
- Reuse existing enemy/boss data and `EnemyAttackSignal` support where possible.

6. Finish boss telegraph/attack handling in `RunScene`.
- The repo already models boss/miniboss signals in `Enemy.ts`; Milestone 4 should make those signals live instead of inventing a second boss path.

7. Add add-wave and protected-priority behavior around the boss.
- Keep this narrow: one boss encounter structure, not a general event system.

8. Add debug/test coverage.
- Force evolution offers
- Force boss spawn
- Snapshot chosen evolution
- Real-scene validation that a run can:
  - form a build
  - earn one evolution
  - fight the boss
  - preserve hero/build distinction

This order is safest because it validates the late-run progression seam before spending time on boss tuning, and it keeps boss work attached to the same live reward/build path the player already uses.

## 8. Validation criteria
Milestone 4 is working only if all of these are true in play:

- A run can naturally reach a late-game evolution offer without bypass/debug forcing.
- Evolution offers appear because the build earned them, not because they were randomly injected too early.
- Taking an evolution feels like build completion, not total replacement.
- Pre-evolution traits/support still clearly matter after the evolution is chosen.
- Each hero has two visibly different late-run directions.
- In repeated runs, one hero does not collapse to a single always-correct evolution.
- The boss encounter meaningfully tests build style:
  - Guard builds handle pressure differently from Mark builds.
  - Ailment builds are pressured during setup but rewarded on payoff windows.
  - priority-target play matters.
  - anti-turtle pressure exists but does not hard-delete Warden.
- The boss encounter works on the normal run path, not only through debug hooks.
- The reward flow stays readable:
  - normal deepen / bridge / stabilize choices early and mid-run
  - evolution only enters as a late lock-in layer
- The implementation remains on the current repo spine:
  - no parallel combat system
  - no replacement reward framework
  - no architecture reset

If manual playtesting still describes late runs as “mostly the same until a giant capstone makes everything happen,” Milestone 4 has not actually proven the roadmap.