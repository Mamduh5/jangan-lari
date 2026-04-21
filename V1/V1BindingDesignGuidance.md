## 1. First hero roster

I recommend `3` starting heroes for the first slice. That is the smallest roster that still proves the framework cleanly: one hero centered on `Guard`, one on `Ailment`, one on `Mark`.

| Hero | Chassis identity | State affinity | Chassis rule | Primary ability | Signature ability | 2 build directions | 2 evolutions |
|---|---|---|---|---|---|---|---|
| **Iron Warden** | Close-range sentinel who converts survival into area control | Guard | `While Guard is active, primary width increases slightly.` | **Brace Shot**: short cone burst, strongest at close range; point-blank hits generate light Guard | **Bulwark Slam**: radial pulse that consumes some Guard for burst damage and knockback space | `Fortress`: stack Guard, survive inside pressure, pulse repeatedly. `Breaker`: add Mark or Ailment secondary tools and turn Guard into offensive windows | `Citadel Core`, `Reckoner Drive` |
| **Ash Weaver** | Mid-range spellcaster built around pressure then detonation | Ailment | `Consuming Ailment shortens signature cooldown slightly.` | **Cinder Needles**: rapid piercing bolts that apply light Ailment reliably | **Hex Detonation**: targeted blast on nearest dense pack; consumes Ailment for burst and small splash | `Plague Bloom`: widen Ailment coverage and chain clears. `Execution Pyre`: use Mark support to focus elites and bosses | `Pyre Constellation`, `Cinder Crown` |
| **Raptor Frame** | Mobile precision hunter that snowballs through focused kills | Mark | `Killing a Marked enemy briefly increases movement speed and signature recovery.` | **Seeker Burst**: accurate burst that prefers isolated or healthiest targets and applies Mark on repeat contact | **Hunter Sweep**: drone strike that prioritizes Marked enemies and consumes Mark for heavy burst | `Kill Chain`: chain priority kills and keep tempo high. `Siege Lock`: add Guard support and become a safer sustained boss-hunter | `Kill Chain Protocol`, `Siege Lock Array` |

**Hero notes**
- `Iron Warden` proves defensive engines can still be active and offensive.
- `Ash Weaver` proves pressure-to-payoff engines.
- `Raptor Frame` proves precision and target-priority engines.
- All three use the same loop, slot rules, state families, and trait vocabulary.

## 2. Shared support ability pool

| Support ability | Role | State family support | Why it is support instead of signature |
|---|---|---|---|
| **Bulwark Halo** | Periodic close pulse that grants light Guard when enemies are nearby | Guard | It stabilizes uptime and spacing, but it is not a hero-defining payoff |
| **Contagion Node** | Slow drifting orb that lightly applies Ailment to clustered enemies | Ailment | It is setup and coverage, not a major burst identity |
| **Spotter Drone** | Periodically Marks the healthiest or elite nearby target | Mark | It creates priority setup, but does not execute on its own |
| **Echo Turret** | Low-rate autonomous shot that prefers enemies already affected by any state | Flexible bridge | It rewards an existing engine; it does not create a standalone one |
| **Recovery Field** | Periodic short-radius pulse around the hero that deals low damage and grants a small stabilizing heal or Guard tick when multiple enemies are close | Guard / stabilizer | It improves survivability and close-range consistency, but should never be the main combat payoff |

**Pool rule**
- A hero can add only `1` support ability in a run.
- Supports are there to `bridge`, `stabilize`, or `slightly branch`, not to carry a second full engine.

## 3. Initial trait pool

This pool is intentionally compact. It is enough to support the three heroes and their two build directions each.

### Enablers

| Trait | Category | Effect | Wants this |
|---|---|---|---|
| **Infectious Volley** | Enabler | Primary hits apply light Ailment more reliably | Ash Weaver, Warden branching into Ailment, any coverage build |
| **Target Painter** | Enabler | Repeated hits from Primary or Support apply Mark faster | Raptor Frame, Ash Weaver execution branch, Warden breaker branch |
| **Close Guard** | Enabler | Close-range hits and close-range kills generate extra Guard | Iron Warden, Raptor defensive branch |

### Amplifiers

| Trait | Category | Effect | Wants this |
|---|---|---|---|
| **Lingering Fever** | Amplifier | Ailment lasts longer and spreads to one nearby enemy on kill | Ash Weaver plague builds |
| **Focused Breach** | Amplifier | Marked enemies take higher Signature damage | Raptor Frame, Ash Weaver execution branch |
| **Steadfast Posture** | Amplifier | While Guard is active, Primary width and contact safety improve slightly | Iron Warden, any close-range Guard build |
| **Pressure Lenses** | Amplifier | Primary deals bonus damage to enemies already carrying your main state | All three heroes once their engine is running |

### Converters

| Trait | Category | Effect | Wants this |
|---|---|---|---|
| **Scavenger Shield** | Converter | On kill of a Marked enemy, gain Guard | Raptor siege branch, Warden breaker branch |
| **Catalytic Exposure** | Converter | On Ailment consume, apply Mark to the healthiest nearby enemy | Ash Weaver execution branch |
| **Fortress Rot** | Converter | While Guard is active, Primary hits also apply light Ailment | Warden fortress-to-pressure branch |
| **Predator Relay** | Converter | On Guard gain, Signature deals bonus damage to Marked enemies for a short window | Warden breaker branch, Raptor siege branch |

### Keystones

| Trait | Category | Effect | Wants this |
|---|---|---|---|
| **Volatile Bloom** | Keystone | Ailment consume effects become much larger, but passive Ailment spread is reduced | Ash Weaver detonation-focused builds |
| **Hunter’s Rhythm** | Keystone | Only one enemy can hold full Mark at a time, but Mark payoff damage and kill tempo become much stronger | Raptor kill-chain builds |
| **Iron Reserve** | Keystone | Guard cap rises sharply; Signature consumes more Guard but gains a much stronger payoff | Iron Warden fortress and breaker builds |

## 4. Evolution set

Each hero gets `2` evolutions. A run may end with only `1`.

| Evolution | Hero | Requires | Transforms | Why it is exciting | Why it does not break the framework |
|---|---|---|---|---|---|
| **Citadel Core** | Iron Warden | Guard affinity + `Close Guard` or `Bulwark Halo` + one Guard amplifier | `Bulwark Slam` becomes a repeating fortress pulse while above a Guard threshold; Guard is spent in chunks instead of all at once | It makes the Warden feel like a moving bunker that must maintain Guard uptime | It still relies on Guard generation, close range, and the same Primary-Signature loop |
| **Reckoner Drive** | Iron Warden | Guard affinity + one Mark or Ailment converter + `Iron Reserve` or `Focused Breach` | `Bulwark Slam` becomes a forward shock line that punishes state-affected enemies harder | It turns defense into aggressive breach play | It still spends Guard and still depends on prior state setup |
| **Pyre Constellation** | Ash Weaver | Ailment affinity + `Infectious Volley` + `Lingering Fever` or `Volatile Bloom` | `Hex Detonation` chains between nearby Ailmented enemies | It creates the first true “screen-wipe engine” moment | It still needs Ailment application first and does not remove setup |
| **Cinder Crown** | Ash Weaver | Ailment affinity + `Catalytic Exposure` or `Spotter Drone` + `Focused Breach` | Marked enemies consume all Ailment for a massive focused burst | It gives the mage a boss-killer branch instead of only pack clear | It narrows the build into elite execution rather than universal power |
| **Kill Chain Protocol** | Raptor Frame | Mark affinity + `Target Painter` + `Hunter’s Rhythm` or `Focused Breach` | Marked kills immediately redirect and empower `Hunter Sweep` to the next priority target | It makes the hunter feel like a real chaining assassin | It still needs Marks, target access, and kill sequencing |
| **Siege Lock Array** | Raptor Frame | Mark affinity + `Scavenger Shield` or `Bulwark Halo` + one Mark amplifier | `Hunter Sweep` lingers on Marked targets and grants Guard on repeated strikes | It creates a safer sustained execution style for bosses and elites | It adds stability, not a second subsystem; the engine is still Mark -> payoff |

## 5. Reward pool rules

### Early run: levels 2–4
- Prioritize `Enablers`, `basic ability mods`, and `stabilizers`.
- If the hero has no support ability yet, allow a low chance for one support offer.
- Do not show `Keystones` or `Evolutions`.
- Offer pattern target:
  - `1 deepen` slot: hero-affinity enabler or aligned primary/signature mod
  - `1 branch` slot: off-family enabler or support ability
  - `1 stabilize` slot: HP, movement, pickup comfort, Guard reliability, or low-complexity utility

### Mid run: levels 5–8
- Prioritize `Amplifiers` and `Converters`.
- If the player still has no support ability, increase support chance slightly.
- `Keystones` can begin appearing, but only if the player already has a visible engine.
- Offer pattern target:
  - `1 deepen` slot: aligned amplifier
  - `1 branch` slot: support or converter
  - `1 stabilize / spike` slot: stabilizer or early keystone

### Late run: level 9+
- Prioritize `aligned Amplifiers`, `Converters`, and `Evolution` offers.
- Strongly bias against unrelated branch clutter.
- `Evolution` may appear only if requirements are met.
- Offer pattern target:
  - `1 deepen` slot: strongest aligned amplifier or signature mod
  - `1 spike` slot: keystone or evolution
  - `1 stabilize / fallback` slot: survivability, cooldown consistency, or safer engine support

### Directed progression rules
- Every offer set must preserve `deepen / branch / stabilize`.
- Only one support ability may be owned, so support offers should stop after one is chosen.
- Once a hero clearly commits to one state family, at least one offer each level-up should reinforce that family.
- Off-plan generic damage cards should be rare and weak; state-aligned content should carry the run identity.

## 6. First combat ecosystem needs

The first slice does not need a giant bestiary. It does need enough pressure types to make Ailment, Mark, and Guard matter.

### Enemy role requirements
- **Swarmers**
  Fast low-HP packs that reward Ailment spread and Guard-based area control.
- **Bruisers**
  Slow high-HP enemies that punish pure screen-clear and reward sustained damage.
- **Priority shooters**
  Ranged or support enemies that must be singled out, making Mark matter.
- **Divers**
  Enemies that jump or rush the player, making Guard timing and close-range defense matter.
- **Anchors**
  Tanky enemies that hold space and test whether the player can maintain an engine under pressure.

### Boss requirements
The first boss must:
- summon or coexist with smaller enemies so Ailment coverage still matters
- expose clear priority windows so Mark builds have a real payoff target
- pressure close-range positioning so Guard builds are tested
- avoid gimmicks that ignore the core system

### Event requirements
The first version only needs `2` event types:
- **Target Hunt**
  A marked high-value target that tests precision and tempo.
- **Pressure Wave**
  A short survival surge that tests area control, Guard uptime, and setup under stress.

These are enough to prove the system without expanding scope.

## 7. Final recommendation

The recommended `version-1 playable package` is:

- `3 heroes`
  - Iron Warden: Guard fortress / breaker
  - Ash Weaver: Ailment spread / execution pyre
  - Raptor Frame: Mark kill-chain / siege lock
- `5 shared support abilities`
  - Bulwark Halo
  - Contagion Node
  - Spotter Drone
  - Echo Turret
  - Recovery Field
- `13 initial traits`
  - 3 Enablers
  - 4 Amplifiers
  - 4 Converters
  - 3 Keystones
- `6 evolutions`
  - 2 per hero, 1 chosen per run
- `Directed reward phasing`
  - early: enable
  - mid: specialize
  - late: transform
- `Minimum combat ecosystem`
  - 5 enemy roles
  - 1 boss with adds and priority windows
  - 2 event types

That package is small enough to build, but already strong enough to prove the framework:
- different heroes use the same system language
- builds evolve through interaction instead of accumulation
- support abilities and converters create branching without chaos
- evolutions complete builds instead of replacing them