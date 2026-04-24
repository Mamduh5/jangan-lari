# V2 Closure

## Status

V2 is closed.

V2 proved the current Phaser survivors-like spine can support a hero-chassis action roguelike built from shared systems rather than one-off hero mechanics. The implementation now has a typed trigger seam, transactional combat states, directed rewards, authored pressure beats, and a live State Break pressure target that asks Guard, Mark, and Ailment builds to answer with their existing payoff actions.

## What V2 Proved

- Heroes can keep distinct Guard, Mark, and Ailment identities while sharing the same runtime structure.
- Ability execution can remain explicit and readable without needing a generic proc engine.
- Combat states can act as build resources, not only labels.
- Rewards can guide deepen / bridge / stabilize choices through the existing 1-of-3 flow.
- Encounters can test build style directly, as shown by the State Break Pressure Beat.
- Debug snapshots and tests can validate real run behavior without a separate debug-only gameplay path.

## Major Completed Systems

- `TriggerSeam` / trigger grammar: current on-hit, on-kill, consume, and signature payoff routes have a typed seam for shared interactions.
- Transactional state economy: Guard, Mark, Disrupted, and Ailment use structured apply, refresh, consume, gain, spend, and absorb outcomes.
- Directed reward coherence: `LevelUpDirector` supports hero-biased deepen / bridge / stabilize offers, support-slot branching, and evolution eligibility.
- Authored pressure beats: `SpawnDirector` owns staged mixed waves and highlighted pressure beats on the normal run path.
- State Break Pressure Beat: the `execution-window` target can be broken by Iron Warden Guard/signature payoff, Raptor Frame Mark consume/execution payoff, or Ash Weaver Ailment consume/detonation payoff.
- Debug/test coverage: unit and e2e coverage validate state transactions, trigger behavior, reward routes, pressure beats, evolutions, boss flow, and gameplay snapshots.

## Debt Carried Into V3

These are V3 concerns, not blockers for V2 closure:

- Payoff feel is functional but not forceful enough.
- There is only one true build-test event.
- The boss does not yet test build identity enough.
- Run pacing still has low-drama spans.
- Rewards can become scripted once a player understands the current route logic.

## Handoff

The next phase is V3: Encounter Identity and Build Expression.

V3 should build on the current Guard / Mark / Ailment foundation. It should not reopen V2 architecture, revive unused weapon systems, add a new hero roster, or create a generic proc engine. The main V3 job is to make combat problems and payoff answers feel memorable in live play.
