# IO MVP Planning Foundation

This folder defines the planning rails for turning the current Phaser top-down arena prototype into a mobile-browser Diep.io-like `.io` MVP.

## Branch Decision

- Base branch: `main`.
- Working branch: `io/mvp-foundation`.
- Sprint 14 freezes `io/mvp-foundation` as the reusable mobile `.io` foundation branch.
- Product work should branch from this checkpoint, with `io/mobile-alpha` as the recommended next branch.
- Do not use `newsystem/v1`, `newsystem/v2`, or `newsystem/v3` as a base.
- Do not import the `newsystem` architecture unless a later task explicitly asks for it.

## Product Direction

The MVP target is a fast mobile-browser arena loop:

- top-down tank movement in Phaser;
- player projectiles as the primary interaction;
- neutral geometric shapes as XP sources;
- XP, levels, and visible progression pressure;
- manual stat allocation after level gains;
- tank class branching over time;
- lightweight local or async leaderboard pressure;
- fast restart after failure or completion;
- browser-first performance on mobile;
- clean seams for future authoritative WebSocket multiplayer, without adding multiplayer yet.

This repo is the game runtime. `Mamduh5/brower-game-bots` is future QA and automation tooling only, not a runtime dependency for the game.

## Current Systems To Reuse

- Phaser/Vite runtime and scene boot flow in `src/main.ts`, `src/bootstrap.ts`, and `src/game/config/gameConfig.ts`.
- Scene split: `BootScene`, `MenuScene`, `MetaScene`, `RunScene`, and `UIScene`.
- Arcade physics setup, world bounds, camera, collision groups, and projectile lifetime patterns.
- `Player`, `Projectile`, and `XPGem` as starting implementation references.
- `runSession` helpers for restart safety, level-up state, and run bookkeeping.
- Existing debug snapshot pattern in `src/game/debug/gameplaySnapshot.ts` for future bot and regression hooks.
- Current Vitest and Playwright setup for unit and browser-level regression coverage.

## Systems To Replace Or Simplify

- Hero fantasy identity becomes tank identity. Keep useful data-driven patterns, but do not expand hero content.
- Enemy wave survival pressure gives way to neutral shape farming plus simple arena pressure.
- Auto-fire survivor weapon logic should become tank projectile firing and stat-driven projectile behavior.
- Gold, quests, permanent upgrades, and meta progression are deferred unless needed for restart or local score pressure.
- Large event systems, boss drama, and complex upgrade card behavior should be simplified for the `.io` MVP.

## Do Not Build Yet

- No real multiplayer.
- No backend.
- No authoritative server simulation.
- No account system.
- No integration with `brower-game-bots`.
- No full rename of the game.
- No deletion of existing gameplay systems during planning.
- No broad rewrite or `newsystem` architecture migration.

## Working Rule

Future implementation prompts should change one small game slice at a time. Each task should inspect the existing code first, make the smallest coherent change, run the relevant tests, summarize exactly what changed, and stop.

For the frozen foundation contents, deferred work, normal verification commands, Android check, and suggested next branches, see `docs/io-mvp/foundation-freeze.md`.
