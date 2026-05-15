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
- Controlled checkpoint validation is limited to unit tests, build, whitespace diff check, and the focused neutral-shapes e2e.
- Full-suite Playwright recalibration is deferred because neutral shape farming can change long-run survival, XP pacing, and deterministic loadout timing.
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

Known follow-up:
- Revisit legacy full-suite gameplay-bot expectations during a milestone or test-maintenance pass. Do not solve those by broad timeout increases during Sprint 2 feature work.

## Sprint 3: Stat Allocation

Goal: Let level gains create clear stat decisions.

Status note:
- Added a run-only stat allocation foundation that grants stat points from XP-driven level progression.
- Current stats are bullet damage, reload, move speed, and max health, each capped at a small fixed level.
- Allocation is available through a compact pointer/touch UI and exposed through the gameplay debug snapshot.
- Deferred full stat balancing, tank class branching, PvP leaderboard pressure, multiplayer, and server authority.

Deliverables:
- Available stat point tracking.
- Mobile-readable stat allocation UI.
- Initial stat set covering max health, movement speed, bullet damage, and reload.
- Pure stat calculation helpers where possible.

Acceptance checks:
- Leveling grants spendable stat points.
- Allocated stats affect gameplay visibly.
- UI remains usable on mobile viewport.
- Tests cover stat math and at least one allocation flow.

## Sprint 4: Tank Class Branching

Goal: Add class identity without overbuilding content.

Status note:
- Added a run-only tank class branching foundation with Basic as the default class and Twin/Sniper as the first evolution choices.
- Evolution is available at level 4, with a focused debug path for browser validation.
- Twin adds a readable two-shot spread, while Sniper adds longer, faster, harder precision shots.
- Class choice is exposed in the gameplay debug snapshot and shown through a compact pointer/touch overlay.
- Deferred full class tree, additional branch tiers, class balance, PvP leaderboard pressure, multiplayer, and server authority.

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

Status note:
- Added a compact always-visible run HUD pass for HP, level, XP, stat levels, available stat points, current class, weapon/class summary, kills, and gold.
- Stat allocation and class-choice overlays remain pointer/touch driven, with clearer tap affordances and actual HUD text exposed through a focused UI snapshot for browser checks.
- Milestone full-e2e diagnostics after Sprint 4 identified `tests/e2e/gameplay-bot.spec.ts` as the long-running suite; `menu-flow.spec.ts` and `special-attacks.spec.ts` pass individually.
- Full gameplay-bot recalibration is deferred to dedicated test-maintenance, while normal feature sprints continue with unit, build, diff check, and focused e2e validation only.

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

Status note:
- Added focused e2e package scripts for menu flow, special attacks, mobile HUD, neutral shapes, stat allocation, and class branching.
- Added a bounded `test:e2e:smoke` command that runs only the stable focused smoke files and does not include the full `gameplay-bot.spec.ts` suite.
- Current runtime observability already exposes the MVP debug fields future bots need: HP/max HP, level/XP, neutral shapes, stat points/stat levels, current class, class-choice state, and the Sprint 5 HUD snapshot.
- Full gameplay-bot recalibration remains deferred to dedicated test-maintenance; future `Mamduh5/brower-game-bots` integration also remains deferred.

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

Status note:
- Added a transparent local score model for neutral shapes destroyed, enemy kills, level reached, time survived, and run gold.
- Added browser-local best score and top-five run history through the existing save layer.
- Surfaced current score in the HUD, final score/new-best state on the end screen, and a compact local top-five panel.
- Deferred backend persistence, online leaderboard, accounts/auth, real multiplayer, and server authority.

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

Status note:
- Added `docs/io-mvp/multiplayer-prep.md` to document current client authority, future server authority, extraction targets, client-only responsibilities, and debug hooks that must be gated before competitive builds.
- Added pure future-facing simulation/input/snapshot contracts without Phaser, WebSocket, backend, account, or online leaderboard code.
- Added a read-only mapper from the current gameplay debug snapshot to the future-facing simulation snapshot shape.
- Deferred actual networking, room server work, snapshot replication runtime, anti-cheat, accounts/auth, online leaderboard, and multiplayer UI.

Deliverables:
- Documented local simulation boundaries.
- Input intent, player state, tank stats, projectile state, and shape state identified for future serialization.
- Small refactors only where they directly reduce future multiplayer coupling.

Acceptance checks:
- No WebSocket client, server, backend, matchmaking, or account system is added.
- Core state needed for future snapshots is easy to locate.
- Local gameplay behavior remains unchanged except for intentional seam cleanup.
- Build and relevant tests pass.

## Sprint 9: Mobile Viewport And UI Clarity

Goal: Make the current game readable and playable in mobile browser landscape before adding more features.

Status note:
- Added a mobile viewport/layout pass so the Phaser canvas uses dynamic viewport height and does not require manual browser zoom-out.
- Improved in-run HUD readability with larger grouped run panels and softer contrast.
- Corrected in-run gold display to show run-earned gold, while debug state keeps run gold and total gold distinct.
- Reduced progression confusion by treating old reward cards as legacy bonus picks and keeping stat/class progression from visually stacking with them.
- Deferred dual-stick manual aim to Sprint 10.
- Deferred APK/PWA wrapper work until the mobile browser experience is acceptable.

Deliverables:
- Mobile landscape viewport behavior.
- Clearer in-run HUD for HP, XP, level, score, run gold, stat points, and class.
- Simple portrait or narrow viewport landscape recommendation.
- Focused mobile layout e2e coverage.

Acceptance checks:
- Mobile landscape viewport uses the screen better without manual zoom-out.
- In-run gold shows run-earned gold, not total account/session gold.
- Stat/class progression remains clear.
- Existing focused smoke and HUD checks pass.

## Sprint 10: Dual-Stick Manual Aim And Auto-Fire-Forward

Goal: Replace player weapon auto-aim with mobile-friendly manual aim while keeping weapons auto-firing.

Status note:
- Added dual-zone pointer input: left side controls movement and right side controls aim.
- Player facing now follows explicit aim, while movement can initialize facing before any aim input exists.
- Player weapons auto-fire toward the current aim/facing direction instead of rotating shots toward the nearest enemy or shape.
- Releasing aim preserves the last aim direction for forward auto-fire.
- Visible joystick art and control settings remain deferred to Sprint 11.
- APK/PWA wrapper work remains deferred.

Deliverables:
- Independent movement and aim input vectors.
- Auto-fire using player-facing direction.
- Debug snapshot fields for aim state and latest projectile direction.
- Focused dual-stick/mobile aim e2e coverage.

Acceptance checks:
- Left-side drag moves the player.
- Right-side drag aims the turret/barrel.
- Weapon fire follows aim/facing direction.
- Keyboard movement still works without overriding explicit aim.
- Existing mobile layout and focused smoke checks pass.

## Sprint 11: Mobile Control Guide And Settings

Goal: Make the invisible dual-zone mobile controls understandable and configurable without changing the control model.

Status note:
- Added a browser-local control guide visibility setting with `hidden`, `subtle`, and `visible` modes.
- Added optional in-run movement and aim guide visuals for the fixed 1280x720 FIT layout.
- Added an early-run control hint for left-move, right-aim, and automatic weapon fire; it dismisses after early use or a short timeout.
- Hidden mode preserves the current invisible-control feel while keeping the underlying left/right dual-zone input unchanged.
- Browser Chrome and FIT side letterboxing remain accepted for now.
- APK/WebView fullscreen, aspect-ratio work, and full gameplay-bot recalibration remain deferred.

Deliverables:
- Persisted local guide visibility setting.
- Mobile-readable left movement and right aim guide visuals.
- Lightweight first-run control hint.
- Focused controls e2e coverage.

Acceptance checks:
- New players can infer left-side movement and right-side aim.
- Owner can switch guides off.
- Dual-stick movement and aim continue to work.
- Phaser scale remains FIT with the fixed 1280x720 virtual coordinate system.

## Sprint 12: Android APK/WebView Wrapper Spike

Goal: Add the smallest safe Android wrapper path so the existing Vite/Phaser game can be tested as an Android app without Chrome browser UI.

Status note:
- Added a minimal Capacitor Android wrapper path around the existing Vite build output.
- Pinned Capacitor to v7.6.5 because the current local Node runtime is 20.19.6 and Capacitor v8 CLI requires Node 22.
- Generated the Android project and configured the Activity for sensor landscape plus immersive sticky system UI.
- Verified a local debug APK build with explicit Android Studio JBR/SDK environment variables.
- Added `docs/io-mvp/android-wrapper.md` with setup, sync, Android Studio, debug APK, fullscreen, and limitation notes.
- Kept Phaser scale at FIT + CENTER_BOTH and did not change gameplay systems.
- Browser Chrome UI, Android transient system bars, and FIT side letterboxing remain known limitations for later device testing/aspect-ratio work.

Deliverables:
- Capacitor config targeting `dist`.
- Android platform project for local device testing.
- Package scripts for add/sync/open/build/debug APK flow.
- Wrapper runbook.

Acceptance checks:
- Existing web build and tests still pass.
- Android project can be synced from the web build.
- If local Android build tools are unavailable, the exact user commands are documented.
- No full Playwright or gameplay-bot suite is required for this spike.

## Sprint 13: APK/Mobile UX Polish And Upgrade Exhaustion Cleanup

Goal: Reduce APK/mobile annoyance while preventing exhausted progression UI from blocking play.

Status note:
- Removed mobile-facing desktop keyboard hints from normal run UI, including the in-run `ESC: Return to Menu` hint and end-screen keyboard helper copy.
- Kept desktop keyboard shortcuts and desktop helper text available where useful.
- Hid the stat allocation panel when stat points remain but every stat is already maxed.
- Added defensive empty-upgrade handling so a level-up with no selectable bonus choices resumes gameplay instead of showing a blocking overlay.
- Added debug/HUD snapshot fields for level-up choice count, upgrade-pool exhaustion, reward toast text, and maxed-stat spendability.
- Added focused upgrade-exhaustion coverage for mobile landscape.
- Deferred endless/infinite upgrades, multiplayer/bot-mode rules, aspect-ratio/letterboxing work, and full gameplay-bot recalibration.

Deliverables:
- Mobile/APK copy no longer presents browser keyboard hints during normal play.
- Exhausted stat allocation does not block movement/aim/gameplay.
- Empty legacy bonus-pick state does not create a blocking level-up overlay.
- Focused e2e script for upgrade exhaustion.

Acceptance checks:
- HP, XP, level, class, score, run gold, and guide controls remain visible.
- Stat allocation still appears when points are spendable.
- Class choice still appears when available.
- Phaser scale remains FIT with the fixed 1280x720 virtual coordinate contract.
- Focused validation stays limited to unit, build, smoke/mobile-layout/hud/controls/upgrade-exhaustion e2e, and diff check.
