## 1. Core design thesis

The best foundation is a survivors-like built on **interaction layers**, not additive accumulation. The player-facing loop stays simple: move, survive, auto-attack, gain XP, pick 1 of 3. But underneath that loop, power should come from **how systems connect**: a hero changes how a weapon behaves, a weapon applies a status, a skill reacts to that status, a trait converts that reaction into defense, resource gain, crowd control, or evolution. A run becomes “I built a machine” rather than “I got six weapons and +40% damage.”

That matters because simple survivors progression gets flat when choices mostly add parallel damage sources or generic stats. The answer is not just more content. It is a framework where every major choice can affect at least one other layer. The game should reward building **engines**, **loops**, and **specializations**: shield-tank retaliation, bleed execution, summon amplification, heat-overload robot play, aircraft strafe pressure, swarm multiplication, and so on.

So the design target is this: **a shared combat language with modular roles**. Heroes, weapons, skills, traits, statuses, enemies, and events all speak the same system language. That is what makes the game scalable across wildly different fantasies without turning each hero into a separate game.

## 2. The minimum system pillars

### 1. Hero Chassis
- What it is: The hero’s base gameplay identity. It defines core movement profile, survivability profile, innate rule twists, signature slot rules, and starting build direction.
- Why it exists: The hero must feel like more than a skin or a starting stat bundle. The chassis is where broad identity lives.
- What it can modify or interact with: Weapon access, skill behavior, trait pools, resource gain, status affinity, evolution routes, event weighting.
- Why it is essential: Without a strong chassis, all heroes collapse into “same unit, different opener.” If you want mage, tank, robot, aircraft, ship, or swarm archetypes to coexist, the chassis must be a first-class system.

### 2. Ability Layer
- What it is: A unified layer containing all combat actions that are not raw movement. This should include:
  - Primary weapon behavior
  - Signature hero ability
  - Secondary/passive combat skills
  - Summons, auras, orbitals, drones, pulses, turrets
- Why it exists: Weapons and skills should not be separate worlds. They should be different forms of “abilities” operating on shared rules.
- What it can modify or interact with: Damage type, delivery pattern, cooldown, charges, summon count, area control, status application, trigger hooks, resource use.
- Why it is essential: Deep synergy requires weapons and skills to cooperate. If weapons are one system and skills are another, the game fragments early.

### 3. Combat State Layer
- What it is: The shared language of temporary and persistent combat conditions on entities. This includes statuses, defenses, buffs, debuffs, protections, and stateful combat values.
- Why it exists: Synergy needs something to act on besides HP. This is where shield, lifesteal, burn, slow, stun, defense, magic defense, vulnerability, resistance reduction, mark, rage, overheat, corrosion, and similar states live.
- What it can modify or interact with: Hero survival, enemy behavior pressure, weapon scaling, skill payoffs, trigger conditions, trait conversions.
- Why it is essential: Without a state layer, “synergy” becomes fake and collapses into hidden damage multipliers. Real build interaction needs meaningful states that can be applied, consumed, amplified, resisted, or transformed.

### 4. Trait and Evolution Layer
- What it is: The long-form build-shaping layer. Traits are persistent build modifiers and rule changes chosen during a run. Evolutions are milestone transformations that emerge from meeting meaningful conditions.
- Why it exists: This is where runs stop being flat. Traits are the connective tissue between chassis, abilities, and combat state. Evolutions are the moments when a build truly changes identity.
- What it can modify or interact with: Ability tags, status output, trigger rules, defenses, resources, specialization thresholds, hero-specific branches.
- Why it is essential: If rewards mostly add stats or extra weapons, the run plateaus. Traits and evolutions are what create “this is a bleed execution build” instead of “this is a stronger run.”

### 5. Trigger and Synergy Layer
- What it is: The controlled rule system for “when X happens, do Y.” This includes event hooks, conditional interactions, converters, and payoff logic.
- Why it exists: This is the engine of interconnected builds. It turns separate pieces into loops.
- What it can modify or interact with: On-hit, on-kill, on-crit, on-dodge, on-shield-break, on-status-apply, on-status-consume, on-summon-spawn, on-resource-spend, on-low-HP, on-elite-death, and similar hooks.
- Why it is essential: Statuses and traits alone do not create synergy. They need a formal interaction grammar. Without this layer, the game cannot support meaningful builds at scale.

### 6. Reward and Progression Layer
- What it is: The in-run and long-term system that controls how players acquire power and direction.
- Why it exists: A deep system can still feel bad if rewards are noisy, unfocused, or too random. Progression must shape the build, not just feed it.
- What it can modify or interact with: Trait offers, ability unlocks, upgrade rarity, specialization branches, event rewards, hero mastery, meta unlock pacing.
- Why it is essential: Even the best synergy model fails if the reward layer delivers junk choices. This layer is what turns the system from theory into a playable run structure.

## 3. Relationship model

- The **hero** owns:
  - Chassis rules
  - Base movement and defense profile
  - Signature mechanic or passive law
  - Starting tags and affinities
  - Access bias to certain traits/evolutions
- The hero should not own every special interaction directly. It should define the starting grammar, not contain the whole build.

- A **weapon** owns:
  - Delivery pattern
  - Targeting behavior
  - hit cadence
  - range/area/formation
  - base status application tendencies
- A weapon is the main attack channel, not the entire identity of the build.

- A **skill/ability** owns:
  - Distinct combat function outside the base weapon pattern
  - cooldown, charge, summon, aura, burst, mobility, or utility behavior
  - specific interaction hooks
- A skill should complement or transform the weapon loop, not duplicate it.

- A **trait** owns:
  - Persistent build logic
  - specialization direction
  - conversions, amplifiers, and rule changes
  - evolution prerequisites
- Traits should not be “just another skill.” They shape systems rather than acting as another projectile source.

- A **status/effect** owns:
  - Temporary combat state on an entity
  - stack rules, duration, caps, interactions, counters
- Statuses are not upgrades. They are shared state objects that other systems can create or use.

- **Triggers/synergy rules** own:
  - Cross-system conditions and reactions
  - “if this state exists, this outcome can happen”
  - “consume X to gain Y”
  - “while in condition Z, modify ability family A”
- This layer should be explicit and constrained. It is the interaction grammar, not flavor text.

- **Progression** owns:
  - When choices appear
  - Which pool can appear
  - How a build is nudged toward coherence
  - When transformation moments happen
- Progression should never be the source of combat logic itself. It delivers parts into the framework above.

A good rule of thumb: **heroes define identity, abilities express it, states carry it, traits shape it, triggers connect it, progression delivers it.**

## 4. Upgrade philosophy

The 1-of-3 reward system should present **directional choices**, not just raw value. Most level-up choices should belong to one of four roles:
- Extend your current engine
- Open a new subsystem
- Stabilize a weakness
- Offer a meaningful branch

Common rewards should mostly be:
- foundational traits
- ability upgrades
- state enablers
- survivability tools
- low-complexity synergy seeds

Rare rewards should mostly be:
- converters
- trait keystones
- hero-specific pivots
- evolution unlocks
- status consumers
- rules that merge systems together

Specialization should happen through **layered commitment**, not lottery spikes. Early picks seed a direction. Mid-run picks deepen it through interaction. Later picks transform it through evolution or keystone traits. The player should feel “I chose this path and now it’s paying off,” not “the game randomly handed me the good thing.”

To avoid clutter:
- Do not let the reward pool be fully flat.
- Use build-aware offering rules.
- Bias offers toward existing tags, statuses, and hero affinities.
- Keep one slot in many choices as a stabilizer or escape hatch.
- Gate high-complexity rewards behind demonstrated build context.
- Make evolution rewards appear when the player has already built the ingredients.

The goal is for level-ups to answer:
- “Do I deepen?”
- “Do I branch?”
- “Do I stabilize?”
not:
- “Which of these three +8% cards is least boring?”

## 5. Scalability across hero fantasies

This framework scales because different fantasies can be expressed through the **same structural roles**, not bespoke minigames.

- A mage can be a chassis with low durability, elemental affinities, and signature spell-cycle traits.
- A tank can be a chassis with shield interaction, taunt-like pressure tools, retaliation triggers, and defense-to-damage conversions.
- An assassin can be a chassis built around burst windows, mark states, dodge or reposition triggers, and execution payoffs.
- A robot can be a chassis with heat, charge, drone, or overclock states using the same combat-state layer.
- An aircraft can be a chassis with higher mobility profile, strafe-based ability geometry, and altitude-flavored avoidance or bombing patterns, while still using auto-fire and level-up choices.
- A ship can be a heavy chassis with broadside patterns, turret modules, shield plating, and zone-control abilities.
- A monster can be a chassis with rage, self-heal, devour, mutation, or body-growth interactions.
- An insect swarm can be a chassis where “abilities” are distributed through spawned units, stack multiplication, and swarm-state scaling.

The trick is not to make each of these a separate ruleset. The trick is to let them all use:
- the same ability model
- the same combat-state model
- the same trait/evolution model
- the same trigger grammar
- the same reward structure

What changes is the **starting chassis, allowed tags, signature mechanics, and favored interactions**. That keeps the game broad without becoming unmaintainable.

## 6. What to avoid

- Do not build the system around “more weapons = more depth.” That creates accumulation, not synergy.
- Do not let every hero introduce custom one-off rules that bypass the shared framework. That destroys scalability.
- Do not create statuses that have no meaningful producers, consumers, counters, or conversions.
- Do not make traits, abilities, and statuses overlap so much that players cannot tell what system is doing what.
- Do not use rarity as a substitute for design. A rare upgrade that is just bigger numbers is still shallow.
- Do not let triggers become uncontrolled proc soup. The trigger layer needs a limited, readable vocabulary.
- Do not create too many tags. Tags should clarify interactions, not become taxonomy clutter.
- Do not let the reward pool stay fully random. Deep systems need directed coherence.
- Do not force every hero fantasy to have its own exclusive subsystem. Reuse shared layers wherever possible.
- Do not let enemies, bosses, maps, and events ignore build style. If the world never responds to the player’s engine, complexity feels fake.
- Do not front-load too much complexity. Players should discover depth through commitment, not through immediate overload.

## 7. Recommended final model

The recommended framework is:

**A hero-chassis action roguelike built on a unified ability system, a shared combat-state model, trait-driven specialization, and a constrained trigger grammar, with build-aware 1-of-3 rewards guiding the player toward evolutions.**

In practical design terms:
- Heroes are **chassis**, not skins.
- Weapons and skills are both **abilities**.
- Statuses and defenses form the shared **combat-state language**.
- Traits are the main **build-shaping layer**.
- Triggers are the formal **synergy engine**.
- Rewards are **directed progression**, not random stat feed.

That is the smallest durable foundation that can support deep synergy, meaningful run identity, hero-specific growth, and very broad future archetypes without breaking the core survivors-like loop.