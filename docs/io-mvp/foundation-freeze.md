# Foundation Freeze

Sprint 14 freezes `io/mvp-foundation` as the reusable mobile `.io` game foundation branch.

Product work should branch from this checkpoint instead of continuing directly on `io/mvp-foundation`. The recommended next branch for playable product iteration is:

```bash
git switch io/mvp-foundation
git switch -c io/mobile-alpha
```

## What This Foundation Contains

- Phaser 3, Vite, and TypeScript game runtime.
- Fixed 1280x720 virtual coordinate contract with `Phaser.Scale.FIT` and `Phaser.Scale.CENTER_BOTH`.
- Mobile tank movement with dual-zone touch input: left side moves, right side aims.
- Auto-fire toward the current aim or facing direction.
- Neutral shape farming, XP gems, level progression, and run score pressure.
- Run-only stat allocation with capped stats and exhausted-stat cleanup.
- Basic tank class branching.
- Mobile-readable HUD, guide toggle, optional MOVE/AIM control guides, and first-run mobile control hint.
- Browser-local save data, local score, and local top-five leaderboard.
- Debug snapshot and focused e2e hooks for core mobile/runtime behavior.
- Capacitor Android WebView wrapper for APK/device testing.
- Multiplayer-prep contracts and documentation without adding networking, backend, accounts, or online leaderboard behavior.

## Intentionally Deferred

- Real multiplayer, WebSocket transport, authoritative room server, matchmaking, accounts, anti-cheat, and backend persistence.
- Bot tanks or player-like AI tanks.
- Endless mode, infinite upgrades, late-run boss scaling, and broad rebalance.
- Aspect-ratio refactor, dynamic `RESIZE` layout, and side-letterboxing cleanup.
- PWA work, app-store publishing, ads, push notifications, and online services.
- Full gameplay-bot recalibration.

## Known Limitations

- FIT preserves the whole 16:9 game and can create side or top/bottom letterboxing on non-16:9 screens.
- Normal Chrome tabs still show browser UI; the APK/WebView wrapper is the path for testing without Chrome address/header UI.
- Android status and navigation bars can temporarily reappear after system gestures.
- Mobile HUD and overlays are intentionally compact, but they are still fixed-layout Phaser UI.
- The full `tests/e2e/gameplay-bot.spec.ts` suite remains test-maintenance debt and is not a normal sprint gate.
- Debug hooks are useful for local tests but must be gated before any competitive production build.

## Standard Verification

Normal foundation/product-branch check:

```bash
npm test
npm run build
npm run test:e2e:smoke
npm run test:e2e:mobile-layout
npm run test:e2e:aim
npm run test:e2e:controls
npm run test:e2e:upgrade-exhaustion
git diff --check
```

Do not use the full Playwright suite as the routine gate for this branch. Run `npm run test:e2e` only for explicit milestone validation or dedicated test-maintenance work.

Android device/APK check:

```bash
npm run android:sync
npm run apk:dev
```

If Android Studio paths are not already configured on this machine, use the environment variables documented in `docs/io-mvp/android-wrapper.md`.

## Recommended Next Branches

- `io/mobile-alpha`: product iteration from the frozen foundation; recommended next branch.
- `io/android-polish`: Android fullscreen, device screenshots, cutout/safe-area notes, and packaging polish.
- `io/endless-mode`: deliberate endless scaling, late-run pacing, and upgrade extension design.
- `io/bot-tanks-spike`: local bot tank prototypes with player-like movement/aim/ability rules.
- `io/multiplayer-spike`: authoritative room-server and WebSocket prototype work.

## Reusable Vs Product-Specific

Keep reusable in this foundation:

- Scene boot/runtime structure.
- Fixed virtual coordinate and FIT scaling contract.
- Dual-zone input model and mobile control guide setting.
- Core tank movement/aim/fire flow.
- Data-driven stat, class, weapon, and neutral-shape definitions.
- Local save, score, leaderboard, debug snapshot, and focused test patterns.
- Capacitor wrapper path and Android runbook.
- Multiplayer-prep contracts as planning seams only.

Move product-specific work to later branches:

- New content, balance, boss/enemy pacing, and endless progression.
- Product branding, final UI polish, monetization, online services, and publishing.
- Multiplayer room rules, bot tank behavior, server authority, accounts, and online leaderboard.
- Aspect-ratio-specific layout changes that could break fixed-coordinate scenes.
