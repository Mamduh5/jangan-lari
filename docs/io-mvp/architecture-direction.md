# Architecture Direction

This document records the intended direction for the `.io` MVP without importing a new architecture.

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
- Preserve fast restart and scene cleanup as first-class architecture concerns.

## Replace Or Simplify

- Replace hero selection with tank identity and class progression over time.
- Replace enemy-centered survival waves with neutral shape farming plus simple arena threats.
- Replace auto-targeting survivor weapons with tank projectile firing and stat-influenced bullet behavior.
- Simplify level-up card choices into stat allocation suitable for mobile.
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
