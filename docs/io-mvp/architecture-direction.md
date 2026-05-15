# Architecture Direction

This document records the intended direction for the `.io` MVP without importing a new architecture.

Sprint 14 freezes `io/mvp-foundation` as a reusable mobile `.io` foundation branch. Product-specific iteration should branch from it, with `io/mobile-alpha` as the recommended next branch.

## Keep And Reuse

- Phaser 3 with Vite and TypeScript remains the runtime.
- `gameConfig.ts` remains the scene registration and scale setup entry point.
- `RunScene` remains the primary arena scene for now.
- `UIScene` remains the HUD and overlay scene, but its content should be simplified for mobile readability.
- Arcade Physics remains the collision and movement layer for the MVP.
- `Player`, `Projectile`, and `XPGem` remain useful starting points for tank, bullet, and XP pickup behavior.
- Existing unit and Playwright test infrastructure stays in place.
- `gameplaySnapshot.ts` remains the model for automation-readable runtime state.

## Refactor Gradually

- Split tank-specific behavior out of survivor-style player logic only when implementation tasks require it.
- Keep `.io` stat math in small pure helpers or focused runtimes before wiring it deeply into Phaser scenes.
- Keep tank definitions, stat definitions, shape definitions, and class-branch data data-driven.
- Keep debug and bot-facing state explicit so future QA tooling can observe player stats, tank class, shapes, XP, score, and restart state.
- Keep score pressure local-only for the MVP: run score math stays in a pure helper, and best-score/top-five history stays in browser localStorage until a later backend task exists.
- Treat mobile-browser landscape readability as the runtime baseline before APK/PWA wrapper work.
- Preserve Phaser `FIT` scaling and the fixed 1280x720 virtual coordinate contract until a dedicated aspect-ratio or wrapper sprint proves a broader layout change.
- Keep mobile control guidance optional and browser-local: guide visibility belongs in local save data, while the dual-zone input model remains the gameplay contract.
- Treat the Android wrapper as a packaging shell around the web runtime. Native changes should stay limited to wrapper concerns such as orientation, system UI, signing, and device deployment until the web game contract changes deliberately.
- Keep APK/mobile run UI touch-first: browser keyboard hints can remain for desktop, but mobile-facing overlays should use tap/menu/resume copy and avoid blocking play when no action is available.
- Treat exhausted progression as non-blocking. If stat points cannot be spent because stats are maxed, or if the legacy bonus pool is empty, gameplay should continue with a small status toast at most.
- Preserve fast restart and scene cleanup as first-class architecture concerns.
- Keep `io/mvp-foundation` reusable: changes after the freeze should favor docs, verification, and reusable seams unless a later task explicitly reopens foundation work.

## Replace Or Simplify

- Replace hero selection with tank identity and class progression over time.
- Replace enemy-centered survival waves with neutral shape farming plus simple arena threats.
- Replace auto-targeting survivor weapons with tank projectile firing and stat-influenced bullet behavior.
- Use player aim/facing as the primary player weapon direction; enemy auto-targeting should not steer player shots in the `.io` branch.
- Simplify level-up card choices into stat allocation suitable for mobile.
- Do not implement endless or infinite upgrade scaling as a side effect of exhaustion cleanup; that belongs in a later balancing sprint.
- Simplify HUD density: prioritize health, level, XP, score, available stat points, class state, and leaderboard pressure.
- Treat gold, quests, permanent upgrades, mid-run events, elites, minibosses, and bosses as legacy systems unless a later sprint reintroduces them deliberately.

## Defer

- Real multiplayer.
- WebSocket transport.
- Authoritative server simulation.
- Backend persistence.
- Account identity.
- Bot repository integration.
- Anti-cheat.
- Matchmaking.
- Large content expansion.
- Full game rename.
- Aspect-ratio-specific layout work beyond the initial APK/WebView wrapper spike.
- Endless/infinite upgrade mode and late-run boss scaling changes.
- Multiplayer/bot-mode rules, including player-like bot tanks and multiplayer level caps.
- Full gameplay-bot recalibration outside focused feature validation.

## Frozen Foundation Boundary

Stay reusable in `io/mvp-foundation`:

- Phaser/Vite runtime structure.
- Fixed 1280x720 FIT scaling contract.
- Dual-zone mobile input and guide settings.
- Neutral shape, XP, stat, class, score, save, debug snapshot, and focused test patterns.
- Capacitor Android wrapper path.
- Multiplayer-prep contracts without networking.

Move product-specific work to later branches:

- `io/mobile-alpha` for player-facing product iteration.
- `io/android-polish` for wrapper/fullscreen/device polish.
- `io/endless-mode` for infinite progression and late-run scaling.
- `io/bot-tanks-spike` for local bot tank prototypes.
- `io/multiplayer-spike` for authoritative networking experiments.

## Future Multiplayer Seams

Do not build multiplayer yet, but keep these seams in mind:

- isolate local input intent from direct movement when practical;
- keep entity state serializable enough for future snapshots;
- avoid hidden scene-only state for core player stats;
- prefer deterministic pure helpers for stat and class calculations;
- keep leaderboard pressure abstract enough to swap local scores for server scores later.

## Sprint 8 Server Authority Boundary

Current state after Sprint 7:

- The runtime is still single-player and client-authoritative.
- Score pressure and the top-five leaderboard are local-only browser state.
- `gameplaySnapshot.ts` is a local debug and automation surface, not a network protocol.
- `simulationTypes.ts` and `gameplaySnapshotMapper.ts` are pure observational seams only.

Future server-authority boundary:

- Clients should eventually send input commands and requested stat/class choices.
- A room server should eventually own movement validity, projectile spawning, collisions, damage, XP, stat/class validation, score, run completion, and leaderboard eligibility.
- Clients must not be trusted for final position, damage, kills, XP, stat points, class unlocks, score, best score, or leaderboard entries.

Migration order:

1. Extract pure simulation helpers.
2. Create headless local simulation tests.
3. Add an authoritative room server prototype.
4. Add snapshot replication.
5. Gate debug hooks and add anti-cheat validation.
