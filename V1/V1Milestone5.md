## 1. Milestone 5 goal
Milestone 5 must prove that the compact version-1 package can sustain repeat runs without collapsing into one obvious route per hero. In playable form, that means the current three-hero, three-lane, support-slot, evolution-enabled run can now produce at least two credible late-run end states per hero, with enough support/trait/encounter variety that replaying the same hero does not feel pre-solved.

This is not a new system milestone. It is the completion-and-pressure milestone for the current runtime spine: finish the missing compact content, make the boss/ecosystem test more than one late-run answer, and tune reward direction so build identity stays readable without becoming scripted.

## 2. Current stable foundation
From the current repo and the saved planning docs, these foundations are already live and should be treated as stable:

- `RunScene` remains the single live match orchestrator.
- `Player`, `Enemy`, `AbilityLoadout`, `AbilityResolver`, `CombatStateRuntime`, `TraitRuntime`, `LevelUpDirector`, and `SpawnDirector` are the runtime spine.
- Three heroes are playable through the normal menu flow:
  - Iron Warden
  - Raptor Frame
  - Ash Weaver
- Three primary state lanes are live:
  - `Guard`
  - `Mark`
  - `Ailment`
- `Disrupted` is live as an auxiliary setup state through supports.
- Three support abilities are already live:
  - `Shock Lattice`
  - `Spotter Drone`
  - `Contagion Node`
- Directed `1-of-3` rewards, support-slot acquisition, late-run evolution offers, and the `Behemoth` boss on the normal run path are already implemented.
- The ecosystem already includes more than the original minimum enemy trio:
  - `swarmer`, `shooter`, `anchor`, `skimmer`, `crusher`, plus additional authored archetypes already present in data.
- Real-scene unit/e2e coverage already exists for hero start flow, support branching, state application, evolution-to-boss path, and gameplay snapshots.

## 3. What Milestone 5 should add
Milestone 5 should add the smallest meaningful completion layer for version 1:

- The second evolution for each hero:
  - `Reckoner Drive`
  - `Siege Lock Array`
  - `Cinder Crown`
- The remaining compact support options needed to make support branching feel broader than “one obvious support per hero”.
- The remaining compact trait pieces needed to support the second evolution paths and cross-lane late-run branches.
- Fuller encounter pressure around the normal run path:
  - more authored mixed-wave templates
  - one mid-run pressure beat
  - one stronger pre-boss or boss-adjacent pressure beat
  - both implemented through the existing run/spawn path, not a new event framework
- Reward-weight/pacing tuning aimed at dominance control:
  - no single shared support becomes the universal answer
  - no single shared trait package outperforms hero-aligned routes too consistently
  - second evolutions are actually reachable and worth taking

Roadmap/repo tension to preserve explicitly:
- The saved roadmap expected Milestone 4 to bring `2 evolutions per hero`, but the current implemented repo only has `1 evolution per hero`.
- Smallest correction that preserves the roadmap: Milestone 5 should explicitly close that gap by adding the second evolution per hero rather than reopening Milestone 4.
- The saved roadmap also mentioned “remaining supports” and “both events”, but the current live repo has no general event framework and uses `Shock Lattice` instead of the older `Bulwark Halo` support concept from earlier docs.
- Smallest correction: keep the current live support canon and deliver the remaining pressure beats as authored run/spawn injections on the existing path, not a new event system.

## 4. What should stay unchanged
These parts should remain stable and should not be reopened carelessly:

- Keep `RunScene` as the main orchestrator.
- Keep `AbilityResolver` switch-based.
- Keep `CombatStateRuntime` as the thin state owner.
- Keep `LevelUpDirector` as the directed reward generator instead of replacing it with a generic weighting framework.
- Keep `Enemy` as the concrete holder of state presentation and boss protection state.
- Keep authoring in `src/game/data/*`.
- Keep the current lane identities intact:
  - Warden = Guard convert/spend
  - Raptor = Mark focus/priority burst
  - Ash = Ailment pressure/consume
- Keep `Disrupted` auxiliary. Milestone 5 should not promote it into a fourth primary lane.
- Keep the normal run path singular:
  - hero select
  - run
  - level-up choices
  - late evolution
  - boss
- Do not add a new hero, a new status family, a generalized event framework, or a generalized encounter/boss architecture layer.

## 5. Recommended Milestone 5 content scope
The smallest strong Milestone 5 scope is:

- `3 new evolutions`
  - Iron Warden: `Reckoner Drive`
  - Raptor Frame: `Siege Lock Array`
  - Ash Weaver: `Cinder Crown`

- `2 new support abilities`
  - `Echo Turret`
    - flexible bridge support that prefers enemies already carrying a live state
    - purpose: broaden off-bias and hybrid routes without replacing hero signatures
  - `Recovery Field`
    - stabilizer support that helps close-range or attrition builds survive pressure
    - purpose: create a real defensive branch that is not identical to `Shock Lattice`

- `4 compact finishing traits`
  - `Pressure Lenses`
    - keep it narrowed so it boosts state-aligned primary pressure, not all damage
  - `Predator Relay`
    - simplified cross-lane converter for Guard-to-Mark or Guard-to-payoff timing
  - `Catalytic Exposure`
    - Ailment-consume bridge into focused execution
  - `Iron Reserve`
    - late Guard commitment trait
  Smallest repo-aware correction:
  - keep them inside the existing `trait` reward/category model
  - do not add a separate keystone system just because the older docs used that term

- `Encounter completion slice`
  - expand `SpawnDirector` templates so late-run waves more consistently layer:
    - anti-turtle pressure
    - anti-ramp pressure
    - protected priority targets
    - mixed-threat layering before the boss
  - make use of already-authored enemy archetypes that are currently underused or not live enough in the normal run path
  - add two authored pressure beats through existing run timing:
    - one mid-run pressure beat
    - one pre-boss or boss-lead-in pressure beat
  Smallest correction to roadmap wording:
  - treat the roadmap’s “both events” as authored pressure encounters on the current run path, not a standalone event framework

- `Reward/pacing tuning slice`
  - support offers:
    - all five compact supports are eligible when the slot is empty
    - hero bias remains, but off-bias choices stay real
  - late-run trait weighting:
    - second-evolution enablers must appear often enough to be testable
    - generic shared traits must not crowd out hero-aligned end states
  - evolution competition:
    - each hero should be able to reach either of its two evolutions on real runs, depending on prior picks

## 6. Main design and implementation risks
The biggest risks in Milestone 5 are:

- The second evolution per hero becoming fake choice.
  - If one evolution is reachable and the other is mostly theoretical, the milestone fails.
- New supports becoming tax picks.
  - `Echo Turret` is especially at risk of becoming generically best.
  - `Recovery Field` is at risk of becoming boring but mandatory.
- Shared traits flattening hero identity.
  - `Pressure Lenses` and `Predator Relay` can easily become too universal.
- The late-run reward pool becoming cluttered.
  - More supports, more traits, and more evolutions can make level-ups less directional if weighting is not tightened.
- Encounter pressure becoming noisy instead of honest.
  - Adding more enemy templates without clear pressure purpose will reduce readability.
- Boss/build differentiation still being too shallow.
  - If `Behemoth` plus adds does not expose different weaknesses for Guard, Mark, and Ailment branches, repeat-run diversity will still feel cosmetic.
- Architecture drift.
  - This milestone is vulnerable to accidental “system cleanup” work because it touches supports, traits, evolutions, and encounters at once.

## 7. Recommended implementation order
1. Lock the continuity correction in content scope.
- Treat Milestone 5 as “finish second evolutions per hero plus compact content completion”.
- Do not reopen any Milestone 4 plumbing beyond what the missing evolutions require.

2. Add the three missing evolution definitions and wire their runtime payoffs.
- Author them in `src/game/data/evolutions.ts`.
- Extend `AbilityResolver` and only the minimal runtime seams needed for their effects.
- Validate that each hero now has two natural late-run endpoints.

3. Add the two remaining supports on the existing support-slot path.
- Author them in `src/game/data/abilities.ts` and `src/game/data/rewards.ts`.
- Extend `AbilityResolver` with thin explicit behaviors.
- Keep support acquisition and auto-fire on the current live path.

4. Add the finishing trait set needed for those branches.
- Author them in `src/game/data/traits.ts` and `src/game/data/rewards.ts`.
- Extend `TraitRuntime` only where a new trait has real runtime effect.
- Avoid introducing a new trait category system.

5. Tune `LevelUpDirector` for completion-phase weighting.
- Make second-evolution paths realistically reachable.
- Preserve deepen / branch / stabilize logic.
- Reduce domination by generic shared traits/supports.

6. Expand encounter pressure using the current `SpawnDirector` and `RunScene`.
- Add or revise mixed-wave templates.
- Add two authored pressure beats through existing run timing hooks.
- Reuse existing enemy data before inventing new enemy content.

7. Tighten boss/ecosystem interaction on the normal run path.
- Ensure pre-boss and boss-adjacent pressure meaningfully tests the new late-run branches.
- Keep `Behemoth` as the only boss.

8. Extend debug/test coverage last.
- Snapshot support/evolution/pressure-beat state.
- Add deterministic unit tests for new evolution eligibility.
- Add real-scene e2e for alternate-evolution runs and support diversity.

This order is safest because the second evolutions are the main continuity gap, supports/traits exist to support those branches, and encounter tuning only matters once the new endpoints are genuinely live.

## 8. Validation criteria
Milestone 5 is working only if these are true in play:

- Each hero has two distinct believable late-run branches on the normal run path.
- Repeated runs on the same hero do not collapse into one obvious support + trait + evolution package.
- The new supports feel like real branches, not taxes:
  - they are useful when offered
  - they are not secretly mandatory
  - they do not erase hero identity
- The final compact trait pool increases branch diversity without turning level-ups into clutter.
- Second evolutions feel like alternate completions, not weaker duplicates of the first evolution.
- The ecosystem and boss path expose real build differences:
  - Guard branches are pressured but not invalidated
  - Mark branches still care about priority windows
  - Ailment branches still need setup and payoff timing
- Off-bias branches are possible but not more reliable than aligned branches.
- Manual playtesting can produce different successful builds on the same hero across multiple runs.
- The repo remains on the current spine:
  - no new architecture layer
  - no new status family
  - no new hero
  - no generalized event framework

If repeat runs still mostly end as “same hero, same support, same traits, same evolution, same boss answer,” then Milestone 5 has not yet completed the compact version-1 slice.