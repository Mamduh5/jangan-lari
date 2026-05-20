# Manual Release Checklist - IO Mobile Alpha

Practical checklist for a manual release-candidate pass on `io/mobile-alpha`. This document does not add features; it records the steps to verify that web and Android builds are playable enough for alpha.

## Branch And Context

- Branch: `io/mobile-alpha`
- Current state: A22 completed (formation pressure, danger zones, Breakout Pulse, and boss tuning)
- Frozen foundation: `io/mvp-foundation`

## Package Scripts Verified

These commands exist in `package.json` and should be used exactly as written:

- `npm test` -> `vitest run`
- `npm run build` -> `tsc --noEmit && vite build`
- `npm run preview` -> `vite preview`
- `npm run test:e2e:mobile-alpha-ui` -> `playwright test tests/e2e/mobile-alpha-ui.spec.ts`
- `npm run android:sync` -> `npm run build && cap sync android`
- `npm run android:open` -> `cap open android`
- `npm run android:build` -> `npm run android:sync && cap build android`
- `npm run apk:dev` -> `npm run android:sync && cd android && gradlew.bat assembleDebug`

There is no package script dedicated to `pause-menu.spec.ts`; run it manually when needed:

```bash
npx playwright test tests/e2e/pause-menu.spec.ts
```

There are no package scripts dedicated to the new A19-A21 focused specs; run them manually when needed:

```bash
npx playwright test tests/e2e/formation-pressure.spec.ts
npx playwright test tests/e2e/danger-zone.spec.ts
npx playwright test tests/e2e/active-survival-tool.spec.ts
```

`npm install` and `adb install -r android/app/build/outputs/apk/debug/app-debug.apk` are direct tool commands, not package scripts.

## A. Web Build / Browser Playtest

Run these in order from the repo root.

### A1. Install Dependencies

```bash
npm install
```

Expected: completes without unresolvable peer conflicts.

### A2. Run Unit Tests

```bash
npm test
```

Expected: all unit tests pass.

### A3. Run Build

```bash
npm run build
```

Expected: TypeScript compilation succeeds, Vite emits to `dist/` with no errors.

### A4. Preview Built App

```bash
npm run preview
```

Expected: app serves locally; open the printed URL in a desktop browser.

### A5. Manual Browser Smoke Test

With the preview running, verify in a desktop browser:

- [ ] Game canvas loads and Phaser boot completes.
- [ ] Main menu appears with hero roster, loadout panel, and action buttons.
- [ ] No console error on first load (check DevTools console).

### A6. Verify Landscape Layout

- [ ] Resize the browser to a mobile landscape viewport (e.g., 896 x 414).
- [ ] Canvas remains fully visible; no mandatory zoom-out needed.
- [ ] UI elements are readable without overlap.

### A7. Verify Run Start/End Flow

- [ ] Start a run.
- [ ] Confirm run begins with player visible, controls responsive.
- [ ] Play through until boss victory or player defeat.
- [ ] Confirm end screen appears with score and return-to-menu option.

### A8. Verify Pause/Restart/Menu Flow

- [ ] During a run, open the pause menu (pause button or `ESC`).
- [ ] Resume returns to the same run state.
- [ ] Restart Run begins a fresh run.
- [ ] Return to Main Menu exits cleanly to the menu.
- [ ] No reward/gold/leaderboard write occurs for an abandoned run.

### A9. Verify No Console/Runtime Errors

- [ ] During the entire smoke run, DevTools console shows no unhandled exceptions.
- [ ] No Phaser texture, audio, or physics warnings that indicate missing assets.

---

## B. Android APK / Mobile Wrapper Playtest

These steps assume Capacitor Android wrapper is already present (Sprint 12). See `docs/io-mvp/android-wrapper.md` for environment setup.

### B1. Build Web Assets

```bash
npm run build
```

Expected: `dist/` is fresh and complete.

### B2. Sync To Android Wrapper

```bash
npm run android:sync
```

Expected: Capacitor copies `dist/` into `android/app/src/main/assets/public`.

### B3. Build Debug APK

From PowerShell with Android Studio paths (adjust if your machine differs):

```powershell
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME='C:\Users\THIRTH~1\AppData\Local\Android\Sdk'
npm run apk:dev
```

Expected: Gradle `assembleDebug` completes and produces:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

### B4. Install On Device Or Emulator

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Or use Android Studio: open the project, select the `app` run configuration, and run on a connected device.

### B5. Verify Landscape Orientation

- [ ] App launches in landscape.
- [ ] Device rotation does not force portrait.

### B6. Verify Touch Movement/Aim

- [ ] Left-side drag moves the player.
- [ ] Right-side drag aims the turret/barrel.
- [ ] Weapon auto-fires toward aim direction.

### B7. Verify Pause Menu

- [ ] Pause button is visible during normal gameplay.
- [ ] Tap opens pause overlay.
- [ ] Resume, Restart Run, and Return to Main Menu are tappable.
- [ ] Pause is hidden behind level-up, class choice, and end-screen overlays.

### B8. Verify Reward Choice

- [ ] Level-up triggers a reward overlay.
- [ ] Reward cards are tappable.
- [ ] Selection closes the overlay and gameplay resumes.

### B9. Verify Class/Stat Overlays

- [ ] Class choice overlay (when available) is tappable.
- [ ] Stat allocation panel appears when stat points are spendable.
- [ ] Stat plus buttons are tappable and apply immediately.

### B10. Verify Run From Start To End

- [ ] Start run.
- [ ] Collect XP.
- [ ] Spend stat points.
- [ ] Pick a class branch if offered.
- [ ] Survive until boss phase.
- [ ] Defeat boss or reach defeat condition.
- [ ] End screen appears.
- [ ] Return to menu.

### B11. Verify Back Button Behavior

- [ ] Android hardware back button does not crash the app.
- [ ] Back behavior during a run is acceptable for alpha (may open pause menu or do nothing; must not crash).

### B12. Verify App Background/Foreground

- [ ] Send app to background (home button).
- [ ] Return to foreground.
- [ ] App resumes without crash or black screen.
- [ ] Audio may pause; resuming gameplay should be playable.

### B13. Verify Audio/Visual Performance (Alpha Bar)

- [ ] Frame rate feels stable on the test device.
- [ ] No persistent audio stutter during combat.
- [ ] APK size and load time are acceptable for a local debug alpha build.

---

## C. Manual Gameplay Checklist

Use this during either web or APK testing to confirm the core loop is intact.

- [ ] Start run: player spawns, controls respond.
- [ ] Collect XP: neutral shapes and enemies drop XP gems; XP bar fills.
- [ ] Pick reward: level-up shows choices; selection applies.
- [ ] Spend stat points: stat allocation opens and increments are visible.
- [ ] Survive miniboss: miniboss spawns safely and its attacks are readable.
- [ ] Survive a formation wave: pressure is clear, with no unavoidable hard cage.
- [ ] Read a danger zone: warning appears before damage and moving out feels possible.
- [ ] Use Breakout Pulse: the active button/`E` opens space when surrounded and enters cooldown.
- [ ] Pause during pressure: formation/danger/pulse state resumes cleanly after pause.
- [ ] Survive boss phase: boss spawns at expected time, normal spawns suppressed.
- [ ] Confirm boss tuning: summons and shockwaves feel fair with collision and Breakout Pulse.
- [ ] Defeat boss or reach end condition: victory or defeat screen appears.
- [ ] Return to menu: clean transition.
- [ ] Restart run: new run starts without leftover state.
- [ ] Check permanent upgrade screen: MetaScene opens, upgrades show level/cost, affordability visible.
- [ ] Check Codex/menu navigation if applicable: buttons respond.

---

## D. Known Non-Goals / Skipped

These are explicitly out of scope for this alpha release checklist:

- No backend or server.
- No multiplayer.
- No accounts or authentication.
- No monetization, ads, or IAP.
- No online leaderboard (local-only scores).
- No gameplay-bot recalibration.
- No Play Store submission or app signing.
- No PWA packaging.
- No aspect-ratio refactor or letterbox elimination.
- No new content (weapons, heroes, classes, enemies, maps).

---

## E. Release Blocker Checklist

If any of these are true, the build is **not** a valid alpha release candidate:

- [ ] **Build fails:** `npm run build` or `npm run apk:dev` does not complete.
- [ ] **App cannot launch:** web preview or APK shows a black screen or error on open.
- [ ] **Touch controls broken:** left/right drag does not move or aim.
- [ ] **Run cannot start:** Start Run does not enter the run scene.
- [ ] **Run cannot end:** boss defeat or player death does not trigger an end screen.
- [ ] **Pause/restart/menu broken:** pause overlay missing, resume dead, or return-to-menu crashes.
- [ ] **Reward/class/stat overlays untappable:** level-up, class choice, or stat buttons do not respond.
- [ ] **Serious runtime errors:** unhandled exceptions during normal play.
- [ ] **Save data corrupted:** local save fails to load or wipes unexpectedly.
- [ ] **Android build/install fails:** APK does not install or crashes immediately on launch.

---

## Related Docs

- `docs/io-mvp/android-wrapper.md` - Android wrapper setup, environment variables, and build scripts.
- `docs/io-mvp/foundation-freeze.md` - verification commands and known limitations.
- `docs/io-mvp/sprint-backlog.md` - sprint history and acceptance checks.
