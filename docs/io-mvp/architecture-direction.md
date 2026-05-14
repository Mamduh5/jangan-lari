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
- Move `.io` stat math into small pure helpers before wiring it deeply into Phaser scenes.
- Keep tank definitions, stat definitions, shape definitions, and class-branch data data-driven.
- Keep debug and bot-facing state explicit so future QA tooling can observe player stats, tank class, shapes, XP, score, and restart state.
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
