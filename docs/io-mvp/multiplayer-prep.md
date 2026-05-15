# Multiplayer Preparation

Sprint 8 prepares seams for a later multiplayer architecture without adding multiplayer, networking, backend code, accounts, or online leaderboard behavior.

## Current State

- The game remains a single-player Phaser runtime.
- `RunScene` is still client-authoritative for the active run.
- `UIScene` renders HUD, overlays, and end-state surfaces from registry state.
- `gameplaySnapshot.ts` exposes local debug state for tests and automation.
- Sprint 7 score pressure remains local-only: score math is client-side and best/top-five history is stored in browser localStorage.

## Future Target

The later target is an authoritative WebSocket room server. The client should eventually send input commands and requested choices, while the server owns simulation truth and broadcasts snapshots.

The server should eventually own:

- movement validity;
- projectile spawning, travel, collision, and damage;
- neutral shape and enemy lifecycle;
- XP gain and level progression;
- stat allocation validity;
- tank class choice validity;
- score calculation;
- leaderboard submission eligibility.

The client should not be trusted later for:

- final position or velocity;
- kills, damage, XP, score, or run completion;
- stat points, allocated stat levels, or class unlock eligibility;
- leaderboard entries or best-score claims;
- debug-only forced progress hooks.

## Current Client-Owned Systems

- Movement input is resolved directly into `Player.move(...)` inside `RunScene`.
- `AutoFireWeapon` spawns projectiles from local target selection.
- Projectile collision, neutral shape destruction, enemy damage, XP gems, and pickups are resolved in `RunScene`.
- Run-only tank stats are allocated locally through `TankStatRuntime`.
- Tank class selection is validated and applied locally from `tankClasses.ts`.
- Score is calculated locally through `runScore.ts`.
- Local leaderboard history is persisted through `saveData.ts`.

## Future Extraction Targets

Extract these in small steps only when a later sprint explicitly starts simulation work:

- input command normalization from touch/keyboard state;
- pure movement integration and bounds checks;
- projectile spawn and collision rules;
- XP, level, stat point, and class-choice validation;
- score calculation and run-end summary validation;
- serializable entity snapshots for player, enemies, neutral shapes, projectiles, and XP gems.

## Client-Only Responsibilities

These should stay client-only even after server authority exists:

- Phaser rendering and camera behavior;
- HUD and overlay presentation;
- touch controls and local input affordances;
- audio and visual effects;
- local accessibility/readability choices;
- non-competitive menu presentation.

## Debug Hooks To Gate Later

Current browser-test hooks are useful for focused local validation, but must be gated or removed before production competitive builds:

- `window.__JANGAN_LARI_GAME__`;
- `window.__JANGAN_LARI_DEBUG__`;
- `RunScene.debugGrantStatPoints(...)`;
- `RunScene.debugUnlockTankClassChoice()`;
- `RunScene.debugForceRunEvent(...)`;
- `RunScene.debugAddScoreProgress(...)`;
- `RunScene.debugEndRun(...)`.

## Sprint 8 Seam Files

- `src/game/simulation/simulationTypes.ts` defines future-facing pure TypeScript snapshot and input command shapes without Phaser or networking.
- `src/game/debug/gameplaySnapshotMapper.ts` maps the current debug run snapshot into the future-facing snapshot shape for tests and planning.

These files are observational contracts. They do not send data, open sockets, create rooms, add accounts, or change runtime gameplay.
