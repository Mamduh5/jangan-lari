## 1. Minimum playable framework

The smallest version that still proves the concept is:

- `Hero chassis`
- `Unified ability system`
- `3 shared combat-state families`
- `Trait system with a small trigger grammar`
- `1 evolution layer`
- `Directed 1-of-3 reward pool`

That is enough to prove the difference between:
- additive survivors progression: “I got more damage and more weapons”
- systemic progression: “my hero rule, weapon behavior, state application, and payoff loop now reinforce each other”

Day-one layers that must exist:
- Hero chassis
- Abilities
- Combat states
- Traits
- Triggers
- Evolutions
- Reward logic

Layers that can be delayed:
- large hero roster
- deep meta progression
- many enemy counters
- map-specific systems
- event systems beyond one or two simple run beats
- large elemental matrix
- many status types
- complicated summon ecosystems
- separate gear/inventory systems

If version 1 cannot produce a run where the player clearly feels “this build works because these systems interact,” then it does not prove the framework.

## 2. Required system pieces

### Hero chassis
For version 1, a hero chassis should define exactly:
- base stat profile
- one signature rule
- one starting primary ability
- one starting signature ability
- one affinity toward a combat-state family
- one evolution route bias

That is enough to make heroes feel structurally different without turning each into a separate game.

### Ability categories
Version 1 only needs `3` ability categories:
- `Primary`
  The always-on main attack source.
- `Signature`
  A hero-defining auto/semi-passive ability with stronger interaction potential.
- `Support`
  An optional third ability gained during the run.

This is enough. More categories add noise too early.

### Weapons and skills
They should stay unified.

Version 1 should treat weapons and skills as one shared `ability` framework with different roles:
- some abilities are attack-first
- some are utility-first
- some are payoff-first

That keeps interactions clean and scalable.

### Combat states / status families
Version 1 only needs `3` core families:

- `Ailment`
  Offensive enemy state.
  Example use: damage-over-time, detonation fuel, amplification target.

- `Mark`
  Precision/debuff enemy state.
  Example use: vulnerability, focus-fire target, consume-for-burst target.

- `Guard`
  Defensive self state.
  Example use: absorb damage, trigger retaliation, convert defense into offense.

This is enough to support offense, setup, and defense loops.
Do not add shield, armor break, lifesteal, burn, poison, shock, freeze, bleed, curse, barrier, taunt, overheat as separate first-version systems. Those can later become variants or extensions of these three families.

### Traits
Version 1 needs only `4` kinds of traits:

- `Enabler traits`
  They let a build start applying or gaining a state.
- `Amplifier traits`
  They deepen one existing state or ability pattern.
- `Converter traits`
  They connect one system to another.
  Example: ailment application feeds guard, mark consumption boosts signature ability.
- `Keystone traits`
  Rare run-shaping picks that lock the build into a stronger identity.

That is enough to create builds with direction.

### Trigger vocabulary
Version 1 should support only this trigger set:

- `On hit`
- `On kill`
- `On state apply`
- `On state consume`
- `While condition is true`

That is enough.
Do not add nested triggers, proc chains, timed combo windows, resource-spend trees, ally triggers, terrain triggers, or multi-step scripting in version 1.

### Evolution system
Version 1 only needs:
- `1 major evolution per run`
- each hero has `2 possible evolution outcomes`
- an evolution requires:
  - one chassis affinity
  - one ability commitment
  - one state/trait commitment

That is enough to create real transformation without bloat.

## 3. Hard limits

To keep version 1 coherent, use these limits:

- Max abilities per hero in a run: `3`
  One primary, one signature, one support.

- Max simultaneous major systems in one build: `3`
  One preferred combat-state family, one secondary interaction family, one evolution engine.

- Max trigger complexity: `one trigger + one condition/filter + one outcome`
  Example: “On hit against Marked enemies, gain Guard.”
  Not: “On hit, if target is Marked and Burning and below 30% HP, spawn orbitals that apply stun.”

- Max number of core status families: `3`
  Ailment, Mark, Guard.

- Max reward categories in the pool: `5`
  Ability mod, trait, support ability, stabilizer, evolution.

- Max number of evolution choices shown in a run: `2`
  One offered, one fallback or branch.
  The player should end with only one.

What should be forbidden in version 1:
- more than one new support ability per run
- more than one major summon ecosystem
- separate elemental trees
- separate physical/magic defense models
- stack explosion math across many different status types
- multiple resource bars per hero
- highly bespoke hero-only subsystems that ignore shared rules
- full item/inventory systems
- upgrade cards that only add small generic stats unless they are stabilizers

## 4. First proof-of-concept build diversity

These three should already work in version 1.

### 1. Bastion
- Chassis bias: `Guard`
- Primary: short-range spread or pulse weapon
- Signature: defensive pulse that scales with Guard
- Build direction: gain Guard, convert Guard into retaliation, survive inside danger
- Typical loop: get hit less effectively, maintain Guard, pulse damage when Guard is gained or broken
- Identity: defensive control build

### 2. Hexfire
- Chassis bias: `Ailment`
- Primary: mid-range continuous or burst projectile that applies Ailment
- Signature: detonation nova that consumes or amplifies Ailment
- Build direction: spread Ailment, deepen its stack/value, cash it out through signature bursts
- Typical loop: apply, amplify, detonate
- Identity: spell-engine / damage conversion build

### 3. Hunter Drone Frame
- Chassis bias: `Mark`
- Primary: accurate seeker shots
- Signature: autonomous strike or drone burst that prioritizes Marked targets
- Build direction: mark priority targets, get focused follow-up, gain tempo on kills
- Typical loop: tag enemy, signature punishes tag, kill resets pressure or grants Guard
- Identity: precision snowball build

These are meaningfully different, but all use the same model:
- same ability framework
- same 3 state families
- same trait types
- same trigger grammar
- same reward structure

## 5. First-version reward philosophy

The 1-of-3 pool should contain only `5` categories.

### Common categories
These should appear most often:

- `Ability mod`
  Example: primary fires wider, signature pulses faster, support hits more targets.

- `Trait`
  Example: apply Ailment on hit, gain Guard on kill, Marked enemies take extra signature damage.

- `Stabilizer`
  Example: HP, movement, Guard gain, healing on pickup, simple survivability support.

These are the backbone of most level-up screens.

### Uncommon category
- `Support ability`
  A single additional ability that adds a new interaction lane.
  This should be controlled and rare enough that players do not just stack toolkits.

### Rare category
- `Evolution`
  Only appears when the build is already showing clear commitment.

### How the three reward slots should function
Each 1-of-3 should usually present:
- one `deepen` option
- one `branch or utility` option
- one `stabilize or rare spike` option

That means the player is almost always deciding between:
- doubling down
- adding a second lane
- fixing weakness

### How players deepen
They deepen through:
- stronger application of their preferred state
- stronger payoff for consuming that state
- tighter synergy between primary and signature
- progression toward evolution

### How players branch
They branch through:
- taking one support ability
- taking one converter trait
- adding one secondary state interaction

### How players stabilize
They stabilize through:
- health
- movement
- guard reliability
- simple sustain
- defensive trait support

What should not dominate the reward pool:
- flat damage cards
- flat attack speed cards
- generic stat inflation
- multiple unrelated side-mechanics in one run

## 6. What is intentionally delayed

Delay all of this until version 1 proves the system:

- large elemental system
- separate burn/bleed/poison/shock/freeze trees
- armor vs magic armor split
- lifesteal as its own major engine
- crowd-control ecosystem with slow/stun/root/silence variants
- many hero categories at once
- complex summon classes
- map-specific build interactions
- reactive world events beyond simple tests
- enemy resistance matrices
- boss mechanics that inspect many build variables
- multi-stage evolutions
- multiple resource bars
- gear, relic, equipment, inventory loadout systems
- hero mastery trees
- large meta-progression webs
- natural-disaster-style outlier archetypes

Version 1 should prove:
- a run can form an engine
- that engine is readable
- that engine feels better than additive stacking
- multiple hero fantasies can still share one framework

## 7. Final recommendation

The recommended version 1 system model is:

**A 3-ability survivors-like built on hero chassis + 3 combat-state families + 4 trait types + 5 trigger hooks + 1 evolution per run.**

More concretely:
- Each hero starts with `1 primary ability` and `1 signature ability`.
- Each run can gain at most `1 support ability`.
- The whole game uses only `Ailment`, `Mark`, and `Guard` as core state families.
- Traits are only `enabler`, `amplifier`, `converter`, or `keystone`.
- Triggers are only `on hit`, `on kill`, `on state apply`, `on state consume`, or `while condition`.
- The reward pool only has `ability mod`, `trait`, `support ability`, `stabilizer`, and `evolution`.
- Each run is pushed toward `one main engine`, `one optional secondary lane`, and `one evolution payoff`.

That is the smallest strong version.
It is small enough to build, but already rich enough to prove the deeper-system direction.