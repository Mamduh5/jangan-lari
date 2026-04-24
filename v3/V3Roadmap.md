# V3: Encounter Identity and Build Expression

## Theme

V3 focuses on making the existing Guard, Mark, and Ailment engine feel memorable in actual play. V2 proved that the systems can connect. V3 should make the world ask clearer combat questions and make each hero's answer feel satisfying.

V3 should not be a rewrite, content flood, art pass, or meta-progression pass. It should use the existing runtime spine: heroes, ability loadout/resolver, combat states, traits, `TriggerSeam`, `LevelUpDirector`, `SpawnDirector`, State Break, boss flow, HUD, debug snapshots, and tests.

## V3-M1: Hero Payoff Feel Pass

### Objective

Make the existing hero payoff actions feel unmistakably satisfying:

- Iron Warden: Guard / Disrupted / signature slam payoff.
- Raptor Frame: Mark consume / execution payoff.
- Ash Weaver: Ailment consume / detonation payoff.

### Why It Comes First

Future encounter tests only work if the correct answer feels good. If the payoff is readable in debug but quiet in play, more encounter logic will feel like chores instead of skillful build expression.

### Likely Systems / Files

- `src/game/systems/AbilityResolver.ts`
- `src/game/scenes/RunScene.ts`
- `src/game/entities/Enemy.ts`
- `src/game/entities/AbilityProjectile.ts`
- `src/game/scenes/UIScene.ts`
- `src/game/combat/combatResponse.ts`
- `tests/e2e/special-attacks.spec.ts`
- `tests/e2e/gameplay-bot.spec.ts`

### Success Feel

The player can tell, without reading debug counters, that their Guard slam, Mark execution, or Ailment detonation solved the combat problem.

### What Not To Include

- No new heroes.
- No new enemies.
- No new reward cards.
- No asset work.
- No generic VFX framework.
- No architecture rewrite.

## V3-M2: Pressure Beat Set

### Objective

Add a small set of authored pressure beats that use the existing State Break lesson:

- one anti-turtle or close-pressure check,
- one anti-ramp or setup-pressure check,
- one priority or stabilization check.

### Why It Comes Second

After payoff feel is stronger, the run needs more moments where those payoffs are the correct answer. This turns State Break from a single proof into a small encounter language.

### Likely Systems / Files

- `src/game/systems/SpawnDirector.ts`
- `src/game/scenes/RunScene.ts`
- `src/game/entities/Enemy.ts`
- `src/game/data/enemies.ts`
- `src/game/debug/gameplaySnapshot.ts`
- `tests/unit/spawnDirector.test.ts`
- `tests/e2e/gameplay-bot.spec.ts`

### Success Feel

The player recognizes that different waves ask different questions: hold space, break a target, detonate a setup, execute a priority enemy, or stabilize under pressure.

### What Not To Include

- No general event framework.
- No large enemy pool.
- No new boss.
- No new state family.
- No random event scheduler.

## V3-M3: Behemoth Build-Question Pass

### Objective

Turn the current Behemoth boss into a clearer test of build identity:

- Guard builds should have pressure windows where holding space matters.
- Mark builds should have priority/execution windows.
- Ailment builds should have add/setup/detonation windows.

### Why It Comes Third

The boss should synthesize the run after payoff feel and pressure beats are clearer. Doing boss work earlier risks tuning around weak feedback or unclear encounter asks.

### Likely Systems / Files

- `src/game/scenes/RunScene.ts`
- `src/game/entities/Enemy.ts`
- `src/game/data/enemies.ts`
- `src/game/systems/SpawnDirector.ts`
- `src/game/debug/gameplaySnapshot.ts`
- `tests/e2e/special-attacks.spec.ts`
- `tests/e2e/gameplay-bot.spec.ts`

### Success Feel

The boss feels like a final exam for the build the player made, not just a large enemy with adds and a shockwave.

### What Not To Include

- No second boss.
- No phase framework rewrite.
- No cinematic system.
- No map change.
- No hard counter that invalidates a hero.

## V3-M4: Reward Excitement and Anti-Tax Tuning

### Objective

Tune rewards after the encounter questions are sharper so choices feel expressive rather than scripted. Reduce hidden tax picks and keep support / trait / evolution routes from collapsing into one obvious package per hero.

### Why It Comes Fourth

Reward tuning needs encounter context. If the world is not asking clear questions yet, reward changes will be speculative and may only reshuffle the same solved paths.

### Likely Systems / Files

- `src/game/systems/LevelUpDirector.ts`
- `src/game/data/rewards.ts`
- `src/game/data/traits.ts`
- `src/game/systems/TraitRuntime.ts`
- `src/game/data/evolutions.ts`
- `tests/unit/milestone1Runtime.test.ts`
- `tests/unit/v2Closure.test.ts`
- `tests/unit/triggerSeam.test.ts`

### Success Feel

The player picks a reward because it answers the current run's needs, not because it is always the mandatory route for that hero.

### What Not To Include

- No broad reward pool expansion.
- No replacement reward framework.
- No flat random upgrade pool.
- No old weapon-upgrade revival.
- No new rarity system.

## V3-M5: Run Pacing and Memorable Arc

### Objective

Make the current run arc feel denser and more memorable without increasing run length. The run should have clearer chapters: early identity, mid-run pressure, evolution lock-in, pre-boss tension, boss exam.

### Why It Comes Fifth

Pacing should be tuned after payoff feel, pressure beats, boss questions, and rewards are improved. Otherwise timing changes may move weak moments around instead of making the run better.

### Likely Systems / Files

- `src/game/config/constants.ts`
- `src/game/systems/SpawnDirector.ts`
- `src/game/systems/LevelUpDirector.ts`
- `src/game/scenes/RunScene.ts`
- `tests/e2e/gameplay-bot.spec.ts`
- `tests/unit/runSession.test.ts`

### Success Feel

The run has fewer low-drama spans and more memorable steps toward a final identity.

### What Not To Include

- Do not increase run length.
- Do not add maps.
- Do not add meta progression.
- Do not compensate for pacing with raw enemy spam.
- Do not make every minute a high-pressure event.

## V3-M6: Replay Validation Pass

### Objective

Prove each current hero can produce at least two memorable and viable run identities using the existing Guard, Mark, and Ailment foundation.

### Why It Comes Sixth

This is the closure pass. It should validate the combined results of payoff feel, encounter questions, boss identity, reward tuning, and pacing.

### Likely Systems / Files

- `src/game/debug/gameplaySnapshot.ts`
- `tests/e2e/gameplay-bot.spec.ts`
- `tests/e2e/special-attacks.spec.ts`
- `tests/unit/v2Closure.test.ts`
- `tests/unit/milestone1Runtime.test.ts`
- `README.md`
- `v3/V3Roadmap.md`

### Success Feel

Replaying the same hero can create different stories, not just the same support, same traits, same evolution, and same boss answer.

### What Not To Include

- No new feature line.
- No new hero.
- No new major system.
- No art pass.
- No sweeping balance rewrite unless a specific route is proven broken.

## V3 Closure Criteria

V3 is ready to close when:

- Each hero's main payoff is readable and satisfying.
- The run has more than one build-test encounter, not only State Break.
- Behemoth tests Guard, Mark, and Ailment build identity more clearly.
- Reward choices feel less scripted and less tax-like.
- The run arc has fewer low-drama spans without becoming noisy.
- Tests and debug snapshots can prove representative run identities for all three heroes.
