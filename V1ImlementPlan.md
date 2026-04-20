## 1. Hero chassis rules

A version-1 hero chassis must contain exactly five things:

- `Base profile`
  Movement, durability bias, and combat range bias.
- `State affinity`
  One primary affinity: `Ailment`, `Mark`, or `Guard`.
- `Primary ability`
  The hero’s default always-on attack pattern.
- `Signature ability`
  The hero’s defining payoff or engine piece.
- `Chassis rule`
  One always-true rule that nudges build decisions.

A good chassis should vary in:
- preferred distance from enemies
- how safely it applies pressure
- whether it ramps, spikes, or stabilizes
- whether it prefers crowd pressure, priority targeting, or defensive cycling
- which state family it naturally produces or rewards

A good chassis should keep standardized:
- same control scheme and core loop
- same 3-slot structure: `Primary`, `Signature`, `Support`
- same state families
- same trait categories
- same trigger grammar
- same evolution format
- same 1-of-3 reward logic

A chassis rule should be:
- always relevant
- simple enough to explain in one line
- strong enough to influence picks
- not strong enough to complete a build by itself

Target strength for a chassis rule:
- it should noticeably change which rewards are attractive
- it should not grant full engine production and full payoff alone
- it should create bias, not inevitability

Good chassis rule examples:
- “Marked enemies take extra signature damage.”
- “Gaining Guard briefly widens your primary.”
- “Ailment application slightly accelerates signature cooldown.”

Bad chassis rule examples:
- “Deal 25% more damage.”
- “Gain random bonuses every few seconds.”
- “Has a unique subsystem no other content uses.”

Rule of thumb:
- chassis defines identity
- abilities express it
- traits complete it

## 2. Ability design rules

### Primary abilities

Role:
- the build’s baseline damage pattern
- the most reliable state producer
- the thing that defines the hero’s moment-to-moment feel

They should differ by:
- firing geometry
- hit rate
- effective range
- coverage vs focus
- how they apply the hero’s preferred state

They are allowed to:
- deal steady damage
- apply one state family consistently
- set up the signature ability
- establish the hero’s safe or risky play style

They should avoid:
- being the strongest payoff tool
- solving offense and defense at once
- applying multiple state families equally well
- having more than one major conditional rule

Primary design rule:
- every primary should answer, “How does this hero start its engine?”

### Signature abilities

Role:
- the hero’s defining payoff piece
- the main expression of chassis identity
- the strongest interaction point between state and damage or defense

They should differ by:
- consume vs convert vs capitalize
- burst vs pulse vs zone vs directed strike
- whether they punish packs, priority enemies, or pressure moments

They are allowed to:
- consume `Ailment`
- capitalize on `Mark`
- convert `Guard` into offense or control
- create brief power windows
- strongly reinforce the chassis rule

They should avoid:
- being just a bigger primary
- doing all setup internally with no help from the build
- depending on too many conditions at once
- replacing the need for traits or evolution

Signature design rule:
- every signature should answer, “What does this hero do once the engine is online?”

### Support abilities

Role:
- the optional third lane in a run
- a bridge, stabilizer, or secondary engine piece
- a way to deepen or branch without bloating the build

They should differ by:
- whether they support offense, survival, or consistency
- whether they are passive, periodic, or reactive
- whether they reinforce the main state or add a narrow auxiliary function

They are allowed to:
- lightly produce a state
- lightly consume a state
- improve survivability or uptime
- improve consistency of the primary-signature loop
- open one controlled secondary direction

They should avoid:
- becoming a second signature
- introducing a new subsystem
- being mandatory for the hero to function
- applying all three state families
- overshadowing the chassis identity

Support design rule:
- support abilities should improve the build’s shape, not redefine the build

## 3. Combat-state rules

### Ailment

What it is for:
- persistent offensive pressure
- setup for delayed or burst payoff
- rewarding repeated contact with enemies

What it should not do:
- replace `Mark` as a priority system
- replace `Guard` as a defense system
- become hard crowd control
- become universal “just more damage” with no identity

Typical producers:
- fast or repeated-hit primaries
- spread shots
- lingering support effects
- pulse-based signatures that emphasize coverage

Typical consumers/payoffs:
- detonation
- burst amplification
- spread-on-kill
- extra effect against already-pressured enemies

Identity rule:
- `Ailment` is about pressure and conversion, not precision

### Mark

What it is for:
- selecting important targets
- creating precision burst windows
- rewarding target focus and execution

What it should not do:
- become a damage-over-time family
- become a passive global multiplier on everything
- replace `Guard` as survival support
- become “all enemies are always Marked” by default

Typical producers:
- accurate primaries
- target-lock signatures
- support effects that tag elites or nearest enemies
- kill-chain or retarget behaviors

Typical consumers/payoffs:
- signature burst
- target-priority strikes
- bonus on kill of marked enemies
- cooldown refunds or tempo resets

Identity rule:
- `Mark` is about focus and payoff, not attrition

### Guard

What it is for:
- active survivability
- retaliation engines
- converting defensive uptime into offensive value

What it should not do:
- become a silent armor stat
- act like a second full health bar
- replace `Ailment` as pressure
- replace `Mark` as precision

Typical producers:
- close-range hits
- kills
- defensive supports
- signatures tied to presence or risk
- traits that reward contact, timing, or survival

Typical consumers/payoffs:
- retaliation pulse
- empowered signature while Guard is active
- Guard break payoff
- temporary offensive widening or resistance while protected

Identity rule:
- `Guard` is survivability that does work, not passive mitigation bookkeeping

### Interaction rules without overlap

Allowed cross-family relationships:
- `Ailment -> burst payoff`
- `Mark -> execution payoff`
- `Guard -> retaliation or uptime payoff`
- `Marked kill -> gain Guard`
- `Ailmented enemy hit by signature -> stronger consume effect`

Not allowed:
- one effect that applies and consumes multiple families at once
- one family stealing another family’s job
- all good builds using all three families equally

Design rule:
- each build can touch more than one family
- but one family must still be clearly primary

## 4. Trait rules

### Enabler traits

What they are for:
- turning on a build engine
- making state production or use reliable
- converting a chassis bias into actual gameplay

How often they should appear:
- common in early run
- slightly less common later once direction is established

How strong they should be:
- immediately useful
- not run-winning
- should create a lane, not complete it

Design mistakes to avoid:
- enablers that are so weak they do not change behavior
- enablers that also act as full payoff tools
- enablers that support multiple unrelated states

Rule:
- enablers should create possibility, not conclusion

### Amplifier traits

What they are for:
- deepening an existing lane
- rewarding commitment
- making one state or ability relationship more efficient or more dramatic

How often they should appear:
- common to uncommon after early game
- more likely when the player already shows direction

How strong they should be:
- strong when aligned
- mediocre when off-plan
- should improve the chosen engine, not every engine

Design mistakes to avoid:
- generic always-good amplifiers
- pure stat bumps with no systemic behavior
- amplifiers that remove the need for proper setup

Rule:
- amplifiers should make a build sharper, not broader

### Converter traits

What they are for:
- linking systems together
- turning state output into another useful effect
- creating the “engine” feeling

How often they should appear:
- uncommon
- should appear once the run has enough structure to use them well

How strong they should be:
- high impact
- behavior-changing rather than just numerically strong

Design mistakes to avoid:
- converters that generate self-feeding loops with no pressure
- converters with multiple nested conditions
- converters that connect too many systems at once

Rule:
- a converter should create one clean bridge

### Keystone traits

What they are for:
- locking the run into a strong identity
- forcing meaningful commitment
- preparing the player for evolution or acting as a pre-evolution identity anchor

How often they should appear:
- rare
- never front-loaded
- ideally after one engine is already visible

How strong they should be:
- run-defining
- should strengthen one lane while narrowing flexibility

Design mistakes to avoid:
- pure upside keystones
- keystones that solve both offense and defense fully
- keystones that obsolete abilities or evolution
- keystones that are auto-picks in every build

Rule:
- keystones should increase identity, not total coverage

## 5. Trigger grammar rules

Allowed version-1 trigger patterns:
- `On Hit -> gain/apply/boost`
- `On Kill -> gain/apply/reset`
- `On State Apply -> bonus effect`
- `On State Consume -> payoff effect`
- `While Condition -> modifier remains active`

Allowed structure:
- one trigger
- optional one condition
- one outcome

Readable examples:
- “On hit, apply Ailment.”
- “On kill of a Marked enemy, gain Guard.”
- “On Ailment consume, signature deals bonus burst.”
- “While Guard is active, primary fires wider.”

Upper bound of complexity:
- one trigger + one filter + one result
- never more than one state check in a single trait or effect

Too complex for version 1:
- nested if-then rules
- random chance layered on top of state conditions
- multi-trigger content on one card
- recursive proc chains
- delayed sub-rules that themselves trigger more rules

Healthy loops:
- producer -> state -> payoff
- kill -> reset -> re-engage
- Guard gain -> retaliation -> regain space
- Mark -> execution -> momentum

Unhealthy loops:
- one trait both produces and cashes out its own state with no help
- infinite-feeling on-kill loops
- one hit spawning many secondary hits that re-trigger the same rule
- engines that require no enemy pressure, target choice, or build commitment

Readability test:
- if a player cannot explain why their engine triggered, the rule is too complex
- if the payoff is invisible, the trigger is too weak
- if the trigger floods the screen constantly, it is too permissive

## 6. Evolution rules

An evolution should be earned by demonstrated commitment, not luck.

Minimum evolution requirement:
- one aligned chassis affinity
- one aligned ability pattern
- one aligned trait commitment

That means evolution should show up only when the run already has a clear engine.

An evolution should transform:
- the primary-signature relationship
- or the main state-payoff loop
- or the hero’s combat stance inside the same framework

It should not transform:
- the whole game into a different genre
- the hero into a separate ruleset
- a flat statline only

How dramatic it should be:
- strong enough that the player feels a genuine spike
- not so strong that earlier choices stop mattering
- should intensify the existing engine, not replace it

Good evolution outcomes:
- Ailment pressure becomes explosive chain detonation
- Mark execution becomes elite-hunting tempo snowball
- Guard survival becomes retaliation fortress play

Bad evolution outcomes:
- flat double damage
- all enemies get all states for free
- all setup disappears and only payoff remains
- evolution is better than the whole rest of the build combined

Design rules for evolution:
- it must preserve the hero’s original identity
- it must reward correct prior drafting
- it must keep primary, signature, and traits relevant
- it should create a new feeling of completeness, not a new subsystem

Excitement rule:
- evolution should feel like “my build just locked in”
- not “the game handed me a cheat code”

## 7. Content validation checklist

### New hero checklist
- Does the hero have one clear state affinity?
- Does the hero have one clear chassis rule?
- Do primary and signature serve different roles?
- Would the hero still make sense using only the shared framework?
- Does the hero create different draft incentives than existing heroes?
- Can the hero support at least two valid run directions without needing new rules?
- Can the hero be explained clearly in under three sentences?

### New primary ability checklist
- Is it reliable and ever-present?
- Does it produce one main state family well?
- Does it define moment-to-moment combat feel?
- Does it avoid being its own payoff engine?
- Is its shape distinct from existing primaries by behavior, not just damage?

### New signature ability checklist
- Does it capitalize on the hero’s chassis identity?
- Does it convert or consume in a readable way?
- Does it feel different from a primary?
- Does it require setup to reach full value?
- Does it avoid doing everything by itself?

### New support ability checklist
- Does it act as a bridge, stabilizer, or narrow branch?
- Does it help a build without replacing the build?
- Does it avoid introducing a new subsystem?
- Is it optional rather than mandatory?
- Can it fit multiple heroes without losing identity?

### New combat-state content checklist
- Is it clearly Ailment, Mark, or Guard?
- Does it preserve that family’s job?
- Does it have obvious producers?
- Does it have obvious consumers or payoffs?
- Does it avoid overlapping another family’s identity?

### New trait checklist
- Is it clearly Enabler, Amplifier, Converter, or Keystone?
- Does it do one job only?
- Is its trigger readable?
- Does it become better with the right build rather than always?
- Does it avoid recursive or hidden complexity?
- Would a player notice its effect in actual play?

### New trigger checklist
- Is it one trigger, one optional condition, one outcome?
- Can the player tell what caused it?
- Does it create a healthy loop rather than self-running automation?
- Does it avoid referencing too many systems at once?
- Does it support the build’s engine instead of replacing it?

### New evolution checklist
- Does it require visible commitment from earlier picks?
- Does it transform an existing engine rather than replace it?
- Does it keep the hero recognizable?
- Does it keep prior traits and abilities relevant?
- Does it create a real “build complete” moment?
- Does it avoid invalidating balance for the rest of the run?

### Final fit test
A new content piece fits version 1 if:
- it has one clear role
- it strengthens one readable engine
- it uses existing vocabulary only
- it does not require exceptions
- it creates interaction, not just accumulation

If it needs a new state family, a new trigger type, a new slot type, a new resource model, or many bespoke rules to be interesting, it does not fit version 1.