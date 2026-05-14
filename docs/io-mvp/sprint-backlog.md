# IO MVP Sprint Backlog

This backlog is intentionally small-scope and sequential. Finish one sprint, verify it, then stop before starting the next.

## Sprint 0: Planning And Safety Rails

Goal: Establish the `.io` MVP direction without gameplay code changes.

Deliverables:
- Planning docs under `docs/io-mvp`.
- Branch decision recorded: `main` is the base and `io/mvp-foundation` is the working branch.
- Clear constraints against `newsystem`, multiplayer, backend, broad rename, and bot-repo work.

Acceptance checks:
- Docs explain product direction, sprint order, agent loop, and architecture direction.
- No gameplay code changed.
- Existing tests are not modified.

## Sprint 1: Tank Identity And Mobile Movement

Goal: Make the controllable avatar read as a tank and move well on mobile.

Status note:
- Implemented a first-pass Phaser-shape tank presentation for the player with a directional hull, turret, and barrel.
- Added a reusable movement input controller that normalizes keyboard and pointer-drag movement while preserving the last facing direction.
- Added basic drag-anywhere pointer movement for mobile browsers; keyboard remains the preferred input while movement keys are actively pressed.
- Deferred separate move/aim joysticks, neutral shapes, stat allocation, class branching, multiplayer, and backend work to later sprints.

Deliverables:
- Tank-shaped player presentation.
- Mobile-first movement input plan or implementation.
- Desktop fallback controls preserved.
- Restart and menu return behavior preserved.

Acceptance checks:
- Player can move reliably in a mobile browser viewport.
- Movement does not create second-run or pause/menu leaks.
- Existing relevant unit/build checks pass.
- Browser smoke check covers at least one mobile-sized viewport.

## Sprint 2: Neutral Shapes And XP Economy

Goal: Shift the core loop toward farming neutral geometric shapes.

Status note:
- Added a first-pass neutral shape foundation with destructible square, triangle, and pentagon targets.
- Shapes spawn at run start, refill under a cap, can be targeted by player projectiles, and drop XP gems through the existing XP/level-up flow.
- Debug snapshots expose neutral shape count and nearby shape state for e2e coverage.
- Deferred stat allocation, tank class branching, real PvP players, leaderboard pressure, multiplayer, and backend work.

Deliverables:
- Neutral shape entities with health, XP value, and simple respawn behavior.
- Player projectiles can destroy shapes.
- XP pickup or direct XP award is readable and reliable.

Acceptance checks:
- Shapes are primary XP sources.
- XP gain and level progression work after restart.
- Object counts remain reasonable for mobile browser performance.
- Focused tests cover XP math or shape lifecycle where practical.

## Sprint 3: Stat Allocation

Goal: Let level gains create clear stat decisions.

Deliverables:
- Available stat point tracking.
- Mobile-readable stat allocation UI.
- Initial stat set such as health, movement speed, bullet damage, bullet speed, reload, and body durability.
- Pure stat calculation helpers where possible.

Acceptance checks:
- Leveling grants spendable stat points.
- Allocated stats affect gameplay visibly.
- UI remains usable on mobile viewport.
- Tests cover stat math and at least one allocation flow.

## Sprint 4: Tank Class Branching

Goal: Add class identity without overbuilding content.

Deliverables:
- First class-branch decision point.
- Small data model for tank class definitions.
- At least two branches with distinct stat or projectile behavior.
- Debug snapshot exposes current class.

Acceptance checks:
- Branch choice persists for the current run.
- Branches feel mechanically distinct in a small smoke test.
- Restart clears run-only class state.
- Tests cover class eligibility and branch application.

## Sprint 5: HUD And Mobile Readability

Goal: Make the run state readable on a phone-sized screen.

Deliverables:
- Simplified HUD for HP, XP, level, score, stat points, and class.
- Touch-friendly level/stat prompts.
- Reduced legacy survival HUD clutter.

Acceptance checks:
- HUD text does not overlap at common mobile viewport sizes.
- Critical run state is visible during combat.
- Level/stat UI is usable without keyboard.
- Playwright coverage checks the main HUD flow where practical.

## Sprint 6: Bot/Regression Hooks

Goal: Prepare stable runtime inspection hooks for future automation.

Deliverables:
- Expanded gameplay snapshot fields for tank stats, class, shape counts, projectiles, score, and restart state.
- Stable selectors or public debug handles for browser tests.
- No dependency on `Mamduh5/brower-game-bots`.

Acceptance checks:
- Tests can inspect core run state without fragile visual assumptions.
- Snapshot remains lightweight and browser-safe.
- Existing e2e tests still pass or are updated only for real product-contract changes.

## Sprint 7: Async Leaderboard / Local Score Pressure

Goal: Add leaderboard pressure without backend or multiplayer.

Deliverables:
- Local run score model.
- Local or mocked async leaderboard display.
- Fast restart flow that shows score pressure clearly.
- Storage kept browser-local unless a later backend task exists.

Acceptance checks:
- Completed or failed runs produce a visible score.
- Restart loop is fast and does not require account or network.
- Leaderboard implementation can later be swapped for server data.
- Tests cover score recording and restart visibility.

## Sprint 8: Multiplayer Preparation Seams

Goal: Prepare for future authoritative WebSocket multiplayer without adding it.

Deliverables:
- Documented local simulation boundaries.
- Input intent, player state, tank stats, projectile state, and shape state identified for future serialization.
- Small refactors only where they directly reduce future multiplayer coupling.

Acceptance checks:
- No WebSocket client, server, backend, matchmaking, or account system is added.
- Core state needed for future snapshots is easy to locate.
- Local gameplay behavior remains unchanged except for intentional seam cleanup.
- Build and relevant tests pass.
