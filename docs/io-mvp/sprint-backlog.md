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

## Sprint 14: Foundation Freeze

Goal: Freeze `io/mvp-foundation` as the reusable mobile `.io` game foundation branch.

Status note:
- Added `docs/io-mvp/foundation-freeze.md` as the checkpoint document for foundation contents, deferrals, limitations, branch strategy, and verification commands.
- Marked `io/mvp-foundation` as the reusable base after this checkpoint.
- Recommended `io/mobile-alpha` as the next product branch.
- Kept side letterboxing accepted under Phaser FIT and deferred aspect-ratio polish.
- Kept full gameplay-bot recalibration as dedicated test-maintenance debt.
- Deferred endless scaling, bot tanks, and multiplayer spikes to later branches.

Deliverables:
- Foundation freeze document.
- Existing planning docs point future product work at `io/mobile-alpha`.
- Standard focused verification commands are documented.
- No gameplay/runtime behavior changes.

Acceptance checks:
- `npm test`, `npm run build`, focused e2e smoke/mobile-layout/aim/controls/upgrade-exhaustion, and `git diff --check` pass.
- Full `npm run test:e2e`, `npm run test:all`, and whole `gameplay-bot.spec.ts` are not part of the freeze checkpoint.

## Sprint A1: APK Screen Usage And Mobile Controls UX Polish

Goal: Start product work on `io/mobile-alpha` without changing the frozen `io/mvp-foundation` branch.

Status note:
- Kept Phaser `FIT` scaling and avoided the previous mixed-coordinate `RESIZE` failure mode.
- Widened the product branch fixed virtual layout to 1600x720 so APK/mobile landscape uses more horizontal screen space while scenes still share one fixed coordinate system.
- Moved control guide visibility from the normal in-run HUD to the main menu guide button.
- Replaced hint-like MOVE/AIM guides with joystick-style bases and movable knobs driven by the active movement/aim pointers.
- Reduced boss, elite, event, and objective notices into shorter mobile-friendly alerts/banners.
- Deferred true aspect-ratio refactor, side-letterbox elimination on every device, endless/boss scaling, bot tanks, multiplayer, product identity, and art/audio polish.

Deliverables:
- Product-branch screen-usage improvement.
- Menu-owned control guide setting.
- Joystick-style guide visuals for hidden/subtle/visible modes.
- Focused mobile-alpha UI e2e coverage.

Acceptance checks:
- Menu and Start Run remain playable.
- In-run guide toggle is no longer permanently visible in the HUD.
- Hidden mode preserves invisible controls, while subtle/visible modes show joystick guides.
- Focused validation remains limited to unit, build, smoke/mobile-layout/aim/controls/upgrade-exhaustion/mobile-alpha-ui e2e, and diff check.

## Sprint A2: Mobile Overlay Input Resume

Goal: Fix mobile controls after blocking progression overlays on `io/mobile-alpha`.

Status note:
- Fixed mobile overlay input resume after level-up bonus picks and class choices.
- Overlay choices intentionally pause gameplay, but active left/right touches are reconciled when the overlay closes so movement and aim can resume cleanly.
- Stat allocation taps no longer clear unrelated held controls or become unintended gameplay input.
- Added focused controller coverage for held-touch resume and overlay selection pointer filtering.
- Added focused `test:e2e:overlay-input` coverage for fresh movement/aim immediately after level-up, stat, and class UI interactions.
- Aspect-ratio polish remains skipped for now because the 1600x720 APK screen usage is acceptable enough for this branch.
- Future manual APK retest is still required for true held-thumb behavior on device hardware.

Acceptance checks:
- Overlay selection does not leave controls dead.
- Held left/right touches are reconciled from Phaser pointers when available.
- Fresh touch after overlay close works immediately.
- Joystick visuals reset or resume from the reconciled pointer state.
- Phaser scale remains FIT and virtual size remains 1600x720.
- Focused validation remains limited to unit, build, smoke/mobile-layout/aim/controls/upgrade-exhaustion/mobile-alpha-ui/overlay-input e2e, and diff check.

## Sprint A3: Camera Centering And Enemy Spawn Safety

Goal: Improve APK/mobile play feel by keeping edge play readable and preventing unfair enemy pop-ins.

Status note:
- Expanded camera bounds with virtual-view overscroll padding so the player can remain visually centered at world edges while physics movement stays clamped to the arena.
- Filled the overscroll margin with a simple dark arena surround so camera padding does not reveal transparent or broken space.
- Added bounded enemy spawn safety retries plus safe-radius constants for normal, elite/miniboss, and boss spawns.
- Applied spawn safety to normal waves, elite/miniboss/boss arrivals, challenge wave enemies, and reward target events without changing enemy identities, projectile colors, XP colors, scaling, regen, aspect ratio, backend, or multiplayer.
- Added debug snapshot fields for camera/player screen position and nearest enemy spawn distance for focused validation.
- Deferred enemy readability, projectile color, XP color, count/scaling, HP regen, aspect-ratio, multiplayer, backend, and full gameplay-bot recalibration to later sprints.

Acceptance checks:
- Player remains visually centered when clamped at map edges.
- Player cannot move outside the world/map bounds.
- Enemy spawns respect a minimum player safe radius where the world has valid space.
- Phaser scale remains FIT and virtual size remains 1600x720.
- Focused validation remains limited to unit, build, smoke/mobile-layout/aim/controls/camera-spawn e2e, and diff check.

## Sprint A4: Enemy, Projectile, And XP Readability

Goal: Address mobile/APK readability feedback without changing count scaling, regen, aspect ratio, multiplayer, or backend scope.

Status note:
- Enemy ranged projectiles now use a shared enemy-danger visual contract that includes clear red fill, red trail/halo, and red debug metadata while player projectiles keep their own weapon colors.
- Enemy silhouettes now add lightweight Phaser-shape role markers: ranged enemies carry a visible red barrel/muzzle, strafers get side fins, dash enemies get a forward wedge, and major enemies keep a heavier aura marker.
- Enemy XP rewards remain archetype data, with conservative tier refinement for ranged/elite/boss rewards.
- XP gems now use value tiers with distinct non-red colors, sizes, glow, and debug metadata so higher-value drops read differently on mobile.
- Added debug snapshot fields for enemy behavior/ranged identity, enemy projectile danger metadata, and XP gem tier/color.
- Deferred enemy count reduction/time scaling to Sprint A5, HP regen/max-HP replacement to Sprint A6, and multiplayer/backend to later work.

Acceptance checks:
- Enemy projectiles visibly include red.
- Player projectiles remain visually distinct.
- Ranged enemies are identifiable by barrel/launcher silhouette before they fire.
- Different enemy XP rewards produce different XP gem tiers/colors.
- Phaser scale remains FIT and virtual size remains 1600x720.
- Focused validation remains limited to unit, build, smoke/mobile-layout/aim/controls/camera-spawn/readability e2e, and diff check.

## Sprint A5: Enemy Population And Time Scaling

Goal: Reduce screen clutter while preserving threat through more meaningful enemy stats and capped normal-mode scaling.

Status note:
- Reduced normal enemy density with a slower spawn interval, lower wave counts, and a normal active enemy cap.
- Kept boss, miniboss, elite, reward-target, and challenge systems intact while trimming challenge-wave clutter.
- Tuned common enemy archetypes slightly upward so fewer enemies still carry clearer role pressure.
- Added deterministic time-based enemy scaling stacks with a normal-mode max stack and partial scaling for major encounters.
- New enemy spawns receive the current scaling stack; already-spawned enemies are not retroactively scaled.
- Debug snapshots expose scaling stack, max stack, multipliers, active enemy count, cap, spawn slots, and scaled enemy stats.
- Deferred endless mode, HP regen/max-HP replacement, bot tanks, multiplayer, backend, and full gameplay-bot recalibration.

Acceptance checks:
- Enemy count/density is reduced without emptying the arena.
- Scaling is capped in normal/timed mode.
- Spawn safety and A4 readability remain intact.
- Phaser scale remains FIT and virtual size remains 1600x720.
- Focused validation remains limited to unit, build, smoke/mobile-layout/aim/controls/camera-spawn/readability/enemy-scaling e2e, and diff check.

## Sprint A6: HP Regen Stat And Meta Upgrade

Goal: Add conservative survivability through HP regeneration while replacing the run max-health allocation slot.

Status note:
- Added HP regen as a real player stat that heals active, living players over time without exceeding max HP.
- Replaced the run allocation `maxHealth` stat with `hpRegen`/`Regen` while preserving existing base HP, hero max-HP bonuses, and old permanent max-HP save data.
- Added a permanent `hp-regen`/Recovery meta upgrade that persists in local save and applies as baseline regen to future runs.
- Exposed effective/meta/run regen and regen activity in debug/HUD state for focused validation.
- Deferred endless mode, bot tanks, multiplayer, backend, broad rebalance, and full gameplay-bot recalibration.

Acceptance checks:
- Player can gain HP regen from run stat allocation and meta progression.
- Regen heals gradually during active gameplay, does not heal dead/end-state players, and caps at max HP.
- Run stat allocation shows Regen/REG instead of maxHealth/HP.
- Old saves without `hp-regen` remain compatible.
- Phaser scale remains FIT and virtual size remains 1600x720.
- Focused validation remains limited to unit, build, smoke/mobile-layout/aim/controls/upgrade-exhaustion/enemy-scaling/hp-regen e2e, and diff check.

## Sprint A7: Collision Fairness, Hit/Effect Truth, And Config Cleanup

Goal: Tighten foundation quality so mobile combat reads honestly and tuning constants stay easy to find.

Status note:
- Enemy/enemy physical collision remains disabled: enemies are only overlapped against player/projectiles, so swarms can flow through each other without blocking or pushing.
- Miniboss line-strike damage and active visual now share a small contract for range, width, and active duration.
- Debug snapshots expose active enemy attack geometry/window and enemy collision mode for focused validation.
- Moved the HP regen max delta cap into `config/constants.ts` so regen timing remains tuneable from the central config surface.
- Added a guardrail that damaging enemy effects must share visual/damage geometry or be explicitly tested.
- Deferred boss redesign, reward tags, scaling changes, endless mode, bot tanks, multiplayer, backend, and broad balance changes.

Acceptance checks:
- Enemy pressure remains readable without enemy/enemy physical blocking.
- Miniboss damage-active lane visual matches its damage range, width, and active window.
- HP regen behavior remains intact with the same max delta cap.
- Phaser scale remains FIT and virtual size remains 1600x720.
- Focused validation remains limited to unit, build, smoke/mobile-layout/aim/controls/camera-spawn/readability/enemy-scaling/hp-regen/hitbox-truth e2e, and diff check.

## Sprint A8: Reward Visibility And Weapon Tagging

Goal: Make weapon rewards visibly distinct from stat/passive choices without redesigning the whole upgrade system.

Status note:
- Added reward classification for upgrade choices so weapon, stat, passive, and utility choices are visible to UI/debug code.
- Weapon unlocks, signature rewards, and branch weapon rewards now receive compact shared weapon tag metadata.
- Level-up reward cards draw a small Phaser-shape weapon icon for weapon rewards only; stat/passive/support rewards remain untagged.
- Debug snapshots expose each upgrade choice reward type and weapon-tag state for focused validation.
- Deferred boss redesign, boss timing, reward-system redesign, new weapons, endless mode, bot tanks, multiplayer, backend, and broad rebalance.

Acceptance checks:
- Weapon rewards are tagged with a compact icon/marker and not only plain text.
- Stat/passive rewards do not show the weapon tag.
- Reward selection and upgrade exhaustion continue to work.
- Phaser scale remains FIT and virtual size remains 1600x720.
- Focused validation remains limited to unit, build, smoke/mobile-layout/controls/upgrade-exhaustion/reward-visibility e2e, and diff check.

## Sprint A9: Stage Boss Win Condition Foundation

Goal: Change normal runs from timer-survival victory to a boss-focused stage finish.

Status note:
- Added explicit stage phases: `preBoss`, `boss`, `victory`, and `defeat`.
- The stage boss now spawns at 15:00; reaching 15:00 starts the boss phase instead of ending the run.
- Boss phase clears existing normal enemies and neutral shapes, clears unrelated enemy attacks/projectiles, suppresses normal wave/event spawns, and leaves XP gems/player projectiles active.
- HUD timer copy now shows boss arrival before 15:00 and boss HP/objective copy during the boss phase instead of a countdown-to-win.
- Killing the boss triggers victory and local score/gold/leaderboard recording; player death still records defeat.
- Behemoth HP received a narrow first-pass durability increase to make instant kills unlikely while leaving full phase/skill/balance redesign for A10.
- Deferred boss phase 2, new boss skills, miniboss skill changes, event/miniboss/boss full rebalance, endless mode, bot tanks, multiplayer, and backend work.

Acceptance checks:
- Boss spawns at 15:00.
- Timer reaching 15:00 does not auto-win.
- Victory requires boss defeat.
- Normal enemies/events are suppressed during boss phase and existing normal enemies are cleared.
- Boss durability is data-driven and significantly higher than the previous instant-kill-prone value.
- Phaser scale remains FIT and virtual size remains 1600x720.
- Focused validation remains limited to unit, build, smoke/mobile-layout/controls/camera-spawn/enemy-scaling/readability/boss-stage e2e, and diff check.

## Sprint A10: Boss/Miniboss Phase And Skill Pass

Goal: Make the stage boss and miniboss read as authored encounters instead of only stat blocks.

Status note:
- Added a two-phase Behemoth model. Phase 1 starts on boss spawn; phase 2 triggers once at the configured HP threshold.
- Upgraded Behemoth shockwave into a shared contract-backed boss skill with phase 2 tuning for radius, damage, and cooldown.
- Added a Dreadnought volley skill with a telegraphed spread and projectile radius contract, distinct from the existing line charge.
- Added tunable event enemy stat/speed multipliers and applied them only to reward-target and challenge-wave enemies.
- Debug snapshots expose boss phase, phase-2 trigger state, active boss/miniboss skill state, boss skill telegraph/damage activity, and event multiplier.
- Boss kill remains the stage win condition; normal spawns/events remain suppressed during boss phase.
- Deferred final boss balance, boss summons/minions, endless mode, multiplayer/backend, and bot tank work.

Acceptance checks:
- Behemoth has exactly phase 1 and phase 2 for now.
- Phase 2 triggers once at the configured HP threshold.
- Boss and miniboss dangerous effects share visual/damage contract helpers.
- Event enemies are stronger through explicit constants, without globally multiplying normal enemies.
- Phaser scale remains FIT and virtual size remains 1600x720.
- Focused validation remains limited to unit, build, smoke/mobile-layout/controls/camera-spawn/enemy-scaling/readability/boss-stage/boss-phase e2e, and diff check.

## Sprint A11: Boss Balance And Boss-Owned Summons Pass

Goal: Move the Behemoth fight closer to a focused boss encounter without re-enabling normal waves.

Status note:
- Added explicit boss balance hooks for the target fastest-kill window and phase-2 summon pressure.
- Kept Behemoth durability centralized in enemy data/constants, with the current first-pass boss HP tuned for manual validation toward a roughly one-minute fastest realistic kill.
- Added one small boss-owned summon pattern in phase 2 using capped Scuttler-derived adds with reduced XP to avoid normal-wave clutter or farming loops.
- Boss-owned summons spawn through the existing safe-spawn path, are tagged in runtime/debug snapshots, count against a dedicated summon cap, and clear when the boss dies.
- Normal enemies, neutral shapes, events, and normal wave spawns remain suppressed during boss phase; only the boss and boss-owned summons are allowed.
- Deferred manual APK balance tuning, more summon patterns, endless mode, multiplayer/backend, and bot tank work.

Acceptance checks:
- Boss tuning remains centralized in constants/data.
- Phase 2 pressure comes from one capped boss-owned summon pattern plus the existing shockwave.
- Boss death still triggers victory and clears boss-owned summons.
- Player death still triggers defeat.
- Phaser scale remains FIT and virtual size remains 1600x720.
- Focused validation remains limited to unit, build, smoke/mobile-layout/controls/camera-spawn/enemy-scaling/readability/boss-stage/boss-phase/boss-balance e2e, and diff check.

## Sprint A12: Main Menu And Gameplay UI/UX Polish

Goal: Improve player-facing UI/UX for mobile alpha now that the core run is stable. Make the main menu, gameplay HUD, permanent upgrade UI, and general presentation feel cleaner, less noisy, and more intentional. Visual target is the v2 mockup (mobile-alpha-ui-v2-*.png) for layout/hierarchy direction, not pixel-perfect art.

Status note:
- Restructured MenuScene to a left selected-loadout panel, right hero-grid panel, slim top bar (GOLD/BEST/GUIDE), and a bottom action bar (START RUN prominent, UPGRADES, CODEX). Removed the bulky title block from the main content area.
- Added hero preview shape in the left loadout panel alongside large hero name, weapon, passive, and description.
- Rewrote the right-panel hero roster as a denser two-column grid with status badges and "tap to focus" affordance.
- Added last-run summary line below hero grid.
- Polished UIScene HUD: combined hero + class into a single top-left line, compacted the stat summary, added a small objective hint below the stage timer, and suppressed the redundant instruction text from the normal player path.
- Polished MetaScene permanent upgrade cards: bolder level/cost display and improved affordability signalling.
- Updated mobile-hud.spec.ts to derive start-button coordinates from MenuScene snapshot instead of hard-coding the old header position; all other coordinate contracts (stat panel, class choice) are unchanged.

Intentionally skipped:
- No miniboss behavior changes.
- No boss behavior changes.
- No gameplay content additions (weapons, heroes, classes, maps, modes, enemies, objectives).
- No multiplayer, backend, accounts, monetization, or online leaderboard work.
- Full gameplay-bot suite not run or recalibrated.

Acceptance checks:
- Main menu prioritizes player actions over branding noise.
- Gameplay HUD shows HP/XP/level/score/gold/class with reduced visual noise.
- Permanent upgrade UI clearly shows level, cost, and affordability state.
- Hint/objective helper UI no longer distracts during normal play.
- Stable full-run gameplay flow preserved end-to-end.
- Phaser scale remains FIT and virtual size remains 1600x720.
- Focused validation: unit, build, smoke/mobile-layout/controls/mobile-alpha-ui/mobile-hud e2e, and diff check.

## Sprint A15: Pause Menu And Run Options

Goal: Add a small in-run pause/settings menu so active gameplay stays clean while resume, restart, and return-to-menu controls live behind an intentional overlay.

Status note:
- Add a compact in-run pause button that is visible during normal gameplay and hidden during level-up, class choice, end screen, and orientation-warning overlays.
- Add a centered pause overlay with Resume, Restart Run, and Return to Main Menu actions.
- Manual pause stops gameplay progression while UIScene remains interactive: player movement, physics, weapons/projectiles, spawn timers, run elapsed time, event timers, boss timers, and contact damage do not advance.
- ESC opens/closes the pause menu during an active run instead of immediately exiting.
- Restart and return-to-menu abandon the current run without victory/defeat rewards, gold payout, save scoring, or leaderboard writes.

Intentionally skipped:
- No gameplay balance changes.
- No gameplay content additions.
- No collision changes.
- No boss or miniboss behavior changes.
- No enemy stat, reward, XP, gold, spawn timing, event timing, or economy changes.
- No multiplayer, backend, accounts, ads, IAP, online leaderboard, monetization, or gameplay-bot work.

Acceptance checks:
- Pause button appears during normal gameplay without reintroducing active-HUD tutorial/objective clutter.
- Pause overlay is tappable on mobile and includes Resume, Restart Run, and Return to Main Menu.
- Paused gameplay genuinely stops while the UI remains usable.
- Resume returns to the same run.
- Restart starts a fresh run without abandoned-run rewards.
- Return to Main Menu exits cleanly without abandoned-run rewards.
- Focused validation remains limited to unit, build, diff check, pause-menu e2e, mobile HUD, and mobile-alpha UI e2e.

## Sprint A16: Final HUD Minimal Pass

Goal: Make the in-run HUD minimal, readable, and non-distracting so the arena remains the focus during active combat.

Status note:
- Reduced the top-left player state to a smaller hero/class line, clear HP bar/value, and hidden duplicate level/XP text while keeping snapshot fields alive.
- Kept class/status and stat-summary text available in snapshots, but only shows them during relevant active UI moments such as class choice or spendable stat points.
- Compacted score, run gold, and kills in the top-right without a background panel.
- Simplified the bottom-left run state to a small weapon summary plus the XP bar/level label, with weapon icon boxes hidden instead of deleted.
- Kept timer/boss HP as the only persistent center text; event, reward, and alert text remains temporary and lightweight without active-gameplay panels.

Intentionally skipped:
- No gameplay logic changes.
- No boss or miniboss behavior changes.
- No collision changes.
- No enemy stat, reward, XP, gold, spawn timing, event timing, economy, or balance changes.
- No gameplay content additions.
- No gameplay-bot work.

Acceptance checks:
- Active gameplay HUD is visibly cleaner and less noisy than A15.
- HP, XP/level, boss timer/boss HP, score, run gold, kills, and pause remain available.
- Pause button remains visible and tappable during normal gameplay and hidden behind modal overlays.
- Level-up reward choice, class choice, stat allocation, pause menu, end screen, and orientation warning remain intact.
- Focused validation remains limited to unit, build, diff check, HUD e2e, pause-menu e2e, mobile-alpha UI e2e, and optional mobile-layout/controls e2e.

## Sprint A17: Mobile APK/Web Manual Release Checklist

Goal: Create a practical manual release checklist for web build/browser playtest and Android APK/mobile wrapper playtest without adding features or changing gameplay.

Status note:
- Added `docs/io-mvp/release-checklist.md` with web build checklist, Android APK checklist, manual gameplay checklist, known non-goals, and release blocker checklist.
- Updated `android/README.md` to fix broken PowerShell path comments.
- Verified package scripts exist and match documented commands; no script names invented.
- Ran `npm test`, `npm run build`, and `git diff --check` as the standard validation gate.
- Optional focused e2e commands documented but not required as a blocker.

Intentionally skipped:
- No gameplay logic changes.
- No UI behavior changes.
- No boss or miniboss behavior changes.
- No collision changes.
- No enemy stat, reward, XP, gold, spawn timing, event timing, economy, or balance changes.
- No gameplay content additions.
- No gameplay-bot recalibration.
- No Play Store submission, monetization, ads, accounts, analytics, backend, multiplayer, or online leaderboard.

Acceptance checks:
- Release checklist doc exists and is practical.
- Checklist covers web build/manual playtest.
- Checklist covers Android APK/manual device playtest.
- Sprint backlog contains A17.
- No gameplay or UI behavior changed.
- No boss/miniboss/collision/content/balance/gameplay-bot changes.

Validation run:
- `npm test`
- `npm run build`
- `git diff --check`
- Optional quick checks: `npm run test:e2e:mobile-alpha-ui`, `npx playwright test tests/e2e/pause-menu.spec.ts`

## Sprint A18: Asset-Ready Skin/Icon Slots

Goal: Prepare stable slots and safe runtime hooks for future hero icons, weapon icons, enemy icons/sprites, UI badges, and decorative skins without requiring real assets now.

Status note:
- Added `docs/io-mvp/asset-slots.md` with recommended formats, folders, naming conventions, size guidance, transparency guidance, and fallback rules.
- Added typed optional asset slot mappings in `src/game/data/assetSlots.ts` for heroes, hero skins, weapons, enemies, enemy sprites, tank classes, and UI icons.
- Added no-throw resolver helpers in `src/game/utils/assetResolver.ts` so code can check existing Phaser textures without loading missing files.
- Prepared MenuScene hero previews to use an already-loaded hero texture when present and otherwise keep the current shape preview.
- Prepared UIScene weapon icon slots to recognize already-loaded weapon textures while keeping the A16 minimal hidden-icon behavior.
- Added unit coverage for slot stability and safe texture fallback behavior.

Intentionally skipped:
- No real art assets added.
- No player or enemy conversion from Rectangle to Sprite.
- No collision/body changes.
- No gameplay logic changes.
- No UI layout redesign.
- No boss or miniboss behavior changes.
- No enemy stat, reward, XP, gold, spawn timing, event timing, economy, or balance changes.
- No gameplay content additions.
- No gameplay-bot work.
- No APK release, Play Store, publishing, monetization, ads, accounts, analytics, backend, multiplayer, or online leaderboard work.

Acceptance checks:
- Asset slot documentation exists and is practical.
- Stable asset key/path mappings exist.
- Missing future assets do not cause runtime errors.
- Current shape-based visuals continue to work as fallback.
- Menu and HUD code are prepared for future assets without requiring assets now.
- No gameplay or UI layout behavior changed.
- No collision/boss/miniboss/balance/content/gameplay-bot changes.

Validation commands:
- `npm test`
- `npm run build`
- `git diff --check`
- `npm run test:e2e:mobile-alpha-ui`
- `npm run test:e2e:hud`
- `npx playwright test tests/e2e/pause-menu.spec.ts`
- Optional quick checks: `npm run test:e2e:mobile-layout`, `npm run test:e2e:controls`

## Sprint A19: Enemy Formation Pressure Pass

Goal: Make the middle of the run less sleepy by adding positional enemy formations that use existing enemy archetypes and A14 solid collision.

Status note:
- Added Ring Breakout, Pincer, and Sweep Wall formation waves after the opening build-up window.
- Formations are scheduled with cooldowns and are suppressed during boss phase, run events, modal overlays, pause, and active major encounters.
- Ring formations leave a breakout gap, pincer waves spawn from opposite sides, and sweep walls create a loose line without increasing the global enemy cap.
- Debug snapshots expose formation type, cooldown, count, and spawn point distances for focused validation.

Intentionally skipped:
- No new enemies, weapons, heroes, upgrades, art assets, boss tuning, danger zones, active ability upgrades, backend, multiplayer, monetization, or gameplay-bot work.

Acceptance checks:
- At least two formation types exist; current pass includes three.
- Formation spawn points keep safe distance from the player and respect the active enemy cap.
- Ring formation leaves a gap and does not hard-cage the player.
- Normal run start and existing solid collision behavior remain intact.

Validation notes:
- Added `tests/e2e/formation-pressure.spec.ts` to validate fair formation spawn geometry, ring gap, enemy cap, and runtime stability.

## Sprint A20: Danger Zone / Movement Pressure Pass

Goal: Add one readable movement-pressure hazard so the player must reposition instead of only circling and farming.

Status note:
- Added temporary warning-zone to active-damage-zone hazards using Phaser shape visuals.
- Danger zones begin only after formation pressure has entered the run, use a long cooldown, and avoid boss phase, run events, pause, modal overlays, and active major encounters.
- Warning and active states use distinct in-world styling; damage is meaningful but limited and uses existing player invulnerability behavior.
- Danger-zone progression is update-loop driven, so warning/active timers do not advance during manual or system pause.

Intentionally skipped:
- No new art assets, hazard variants, tutorial panels, HUD clutter, active survival tool, boss tuning, backend, multiplayer, or gameplay-bot work.

Acceptance checks:
- Warning appears before damage.
- Active zone can damage the player after the warning delay.
- Pause/modal states stop danger-zone progression.
- Danger-zone visuals and state are cleaned up on boss phase, end, restart, and scene shutdown.

Validation notes:
- Added `tests/e2e/danger-zone.spec.ts` to validate warning-before-damage, active damage, pause freeze, and runtime stability.

## Sprint A21: Active Survival Tool Prototype

Goal: Add one intentional emergency survival tool that answers formation and danger pressure without becoming a weapon system.

Status note:
- Added Breakout Pulse as a single cooldown-based active ability.
- Pulse is available through a compact mobile HUD button and keyboard `E`.
- Activation briefly extends player invulnerability and knocks nearby normal enemies and boss-owned summons away; elites/minibosses receive reduced knockback and the boss is immune.
- Registry/debug snapshots expose ability readiness, cooldown, total cooldown, activation count, and radius.

Intentionally skipped:
- No skill tree, multiple active abilities, ability upgrades, mana/resource system, new weapons, new heroes, new assets, upgrade-pool redesign, backend, multiplayer, or gameplay-bot work.

Acceptance checks:
- Active ability button is visible during normal gameplay and hidden behind pause, level-up, class-choice, end, and orientation overlays.
- Activation starts cooldown and cannot be repeated during cooldown.
- Nearby enemies are pushed far enough to open space without damaging or trivializing the boss.
- Cooldown does not progress while gameplay is paused.

Validation notes:
- Added `tests/e2e/active-survival-tool.spec.ts` to validate button visibility, cooldown, repeat prevention, enemy knockback, overlay hiding, and runtime stability.

## Sprint A22: Boss Tuning / Branch Close

Goal: Tune the Behemoth fight against the new formation, danger-zone, and active-pulse pressure curve without rewriting the boss.

Status note:
- Kept normal formations and danger zones suppressed during boss phase; boss summons remain the boss-owned pressure source.
- Reduced Behemoth HP slightly so the final fight does not drag after a more awake mid-run.
- Increased shockwave warning time, slightly shortened active damage time, and softened phase-two damage/cadence so collision plus summons stay fair.
- Reduced summon batch/cap and slightly softened summon durability/damage so Breakout Pulse can open a path without erasing the fight.
- Boss is immune to Breakout Pulse knockback; boss-owned summons can be knocked back.

Intentionally skipped:
- No new boss, boss art, boss phase, player upgrades, enemy types, weapons, heroes, backend, multiplayer, monetization, or gameplay-bot work.

Acceptance checks:
- Boss still spawns at stage time, phase two still triggers, summons remain capped, and boss defeat still wins the run.
- Active Pulse does not damage or trivialize the boss.
- Boss-owned summons interact fairly with pulse.
- Branch is ready for release-checklist/manual-playtest pass.

Validation notes:
- Updated boss-focused coverage to include Breakout Pulse interaction with boss-owned summons and boss HP stability.
