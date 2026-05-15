# Android Wrapper Spike

Sprint 12 adds a minimal Android WebView wrapper path for real-device testing. The web runtime remains the source of truth.

## Chosen Approach

Use Capacitor Android.

Why this fits the current repo:

- The game is already a Vite static app.
- `npm run build` writes web assets to `dist`.
- Capacitor can package those built assets into an Android WebView app through `webDir: 'dist'`.
- The existing browser build and focused web tests remain unchanged.
- No native plugins are required for this spike.

Current package choice:

- `@capacitor/core`, `@capacitor/android`, and `@capacitor/cli` are pinned to the latest v7 line, `7.6.5`.
- Capacitor v8 is current upstream, but its CLI requires Node 22. This repo is currently validating on Node 20.19.6, so v7 keeps the wrapper path usable without changing the local Node runtime.

Reference docs:

- Capacitor introduction: https://capacitorjs.com/docs
- Capacitor configuration: https://capacitorjs.com/docs/config
- Capacitor Android workflow: https://capacitorjs.com/docs/basics/workflow

## Files Added By The Spike

- `capacitor.config.ts`
- `android/`

The Capacitor config uses:

```ts
webDir: 'dist'
```

That means Android sync/build commands should run after `npm run build`.

## Package Scripts

```bash
npm run android:add
npm run android:sync
npm run android:open
npm run android:build
npm run apk:dev
```

Script intent:

- `android:add`: creates the native Android project. This has already been run for this branch.
- `android:sync`: builds web assets, then syncs them into Android.
- `android:open`: opens the generated project in Android Studio.
- `android:build`: runs Capacitor's Android build flow after sync.
- `apk:dev`: syncs, then runs Gradle `assembleDebug` in the Android project.

## Real Device Flow

From the repo root:

```bash
npm install
npm run android:sync
npm run android:open
```

In Android Studio:

1. Let Gradle sync finish.
2. Connect an Android device with USB debugging enabled.
3. Select the `app` run configuration.
4. Run on the device.

For a local debug APK from PowerShell:

```bash
npm run apk:dev
```

If `JAVA_HOME` or `ANDROID_HOME` are not already configured, use the Android Studio defaults on this machine:

```powershell
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME='C:\Users\mamdu\AppData\Local\Android\Sdk'
npm run apk:dev
```

The expected APK path is:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

This spike verified that `npm run apk:dev` can produce that debug APK when `JAVA_HOME` and `ANDROID_HOME` are set as shown above.

## Landscape And Fullscreen Notes

Implemented native wrapper settings:

- `android:screenOrientation="sensorLandscape"` on `MainActivity`.
- `MainActivity` requests immersive sticky fullscreen and hidden navigation/status bars.
- App theme uses no action bar and dark status/navigation colors.

What this should improve:

- No Chrome address/header UI because the game runs inside the app WebView shell.
- Landscape is targeted at the Activity level.
- Android status/navigation bars are requested hidden while the Activity has focus.

Important limitations:

- Android system bars can temporarily reappear after edge gestures.
- Some devices, OEM skins, gesture navigation modes, cutouts, and Android versions may reserve safe areas or show transient bars.
- True edge-to-edge/cutout behavior may need a later native pass after physical-device screenshots.
- This spike does not change Phaser scaling, so FIT side letterboxing can still exist inside the APK.

## Web Runtime Contract

This spike deliberately does not change:

- `Phaser.Scale.FIT`
- `Phaser.Scale.CENTER_BOTH`
- `activePointers: 3`
- left movement / right aim
- guide settings and first-run control hint
- gameplay balance, scenes, stats, classes, backend, multiplayer, or accounts

## Why Normal Chrome Cannot Hide Its Header

A normal Chrome tab owns its browser UI. The web app can request viewport behavior and prevent page scrolling, but it cannot permanently remove Chrome's address/header UI. A native wrapper helps because the game runs in an app-owned WebView instead of a browser tab.

## Why Letterboxing May Remain

The game currently preserves a fixed 1280x720 virtual coordinate system with Phaser FIT scaling. FIT keeps the full 16:9 game visible and centered, which can create side or top/bottom letterboxing when the device aspect ratio differs. Removing that requires a later aspect-ratio/layout pass, not just an APK wrapper.
