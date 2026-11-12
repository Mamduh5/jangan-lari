# R3A accepted under updated visual-only policy

The owner explicitly removed gameplay E2E/survival requirements. No gameplay E2E was run or repaired during this resumed acceptance. The original failed test and its diagnosis remain unchanged below as historical evidence, superseded only as a release gate.

Required validation passed: npm test (137 tests,22 files), npm run build (bundle-size warning only), git diff --check. Real Phaser inspection at844x390 confirmed loaded Runner and Scuttler images at exactly their entity positions, visible with alpha1. Collision bodies remain23x23 and16x16 respectively. Injected404 responses for both target PNGs produced visible original shape fallbacks with the same bodies, no sprite overlays, and no JavaScript errors. Scenes were paused to inspect rendered frames; no combat survival requirement or game-constant adjustment was used.

Evidence: [actual sprites](evidence/r3a/accepted-sprites.png), [missing-PNG fallback](evidence/r3a/accepted-fallback.png), [captured values](evidence/r3a/visual-inspection.json).

Visual limits: Scuttler is small at the mobile viewport; tiny face details are subtle. Existing projectile effects can partially obscure Runner. No resizing, combat-effect changes, or next asset batch was introduced to address these out-of-scope issues. Hit/death/restart gameplay E2E remains unaccepted historical coverage and is not represented as passing.

Changed files: two target PNGs; visualAssetRuntimeConfig.ts, presentVisualAssets.ts, assetResolver.ts and BootScene.ts for selective loading/fallback; Player.ts and Enemy.ts for decorative presentation; assetSlots.test.ts for slot gating; the previously created runner-scuttler-visuals.spec.ts retained unchanged; this report and evidence directory. Temporary .codex-input files are excluded. File hashes are recorded in evidence/r3a/file-hashes.json.

---

# Historical stopped-run report (retained)

# Sprint R3A — local implementation, validation blocked

Branch: io/mobile-assets-recovery. Starting and current committed HEAD: 18a73de4d92ac9b6e5393edb7d674cf55e2b4b65. No R3A commit or push was made. Temporary .codex-input instructions remain untracked and excluded from deliverables.

## Artwork and integration

Two original drawings were generated with the built-in image_gen tool and normalized to 256x256 RGBA. Runner uses its menu portrait's periwinkle palette; Scuttler uses its enemy icon's purple palette. Source portraits were inspected, not attached, copied, cropped, or recolored. Runner received one generated revision removing detached marks and reducing the face. No procedural substitute or contact-sheet extraction was used.

- Runner: visible bounds 204x220, alpha-weighted centroid (127.59,127.18), SHA256 31bfdb6bed881e1676057a29195bac1e2970dc82a22f35d17102f4f8802588cc.
- Scuttler: visible bounds 226x141, centroid (127.15,127.38), SHA256 af5fbd42f47dc71294a2a367f70fcb7b987564a159239c8a710d5453d1cd311b.

Both have transparent outer edges. Drawing/normalization review passed; full in-game visual acceptance has NOT passed. See [contact sheet](evidence/r3a/art-contact-sheet.png), [metrics](evidence/r3a/art-metrics.json), and [generation prompts](evidence/r3a/art-prompts.md).

A key-and-category allowlist admits only skin-runner and sprite-enemy-scuttler. Broad hero/enemy/boss/miniboss flags remain disabled. Optional target image loading has a five-second timeout and nonfatal fallback. Existing image overlays follow final position, angle, alpha, scale, hit/death presentation and cleanup; Scuttler uses body angle minus90 degrees. Fallback shapes and contextual enemy strokes are retained. Gameplay, physics geometry, damage/timing, progression and balance definitions were not edited.

## Validation

| Command | Result |
| --- | --- |
| npm test | PASS: 137 tests across22 files |
| npm run build | PASS; existing bundle-size warning |
| git diff --check | PASS |
| npm run test:e2e -- tests/e2e/runner-scuttler-visuals.spec.ts --max-failures=1 | FAIL: first case;2 cases not run |
| npm run test:e2e:special | NOT RUN after focused failure |

No full Playwright suite was run. No implementation/test repair or validation retry followed the failure.

## Failure diagnosis from saved trace

The first focused test failed at runner-scuttler-visuals.spec.ts:63: image angle versus sampled velocity direction differed by98.327698 degrees (expected below0.01).

CONFIRMED: the final chase snapshot had Runner health0. The earlier spawned snapshot already had health12. Scuttler remained alive at health34. Its image angle99.0567746 degrees matched the body's -170.9432254 minus90 degrees modulo360. Position, alpha and visual-scale checks also passed. The sampled velocity (25.4553758,0.3239317) pointed about0.7290766 degrees, so this was no longer a clean live chase sample. The trace does not establish a sprite orientation regression.

CONFIRMED harness issue: resumeRun's page.evaluate implicitly returns the Phaser SceneManager. Trace call@63 serialized the game object graph rather than void. The helper call took about14.18 seconds (56092.759 to70272.17 ms), while gameplay was resumed. Screenshots and the held movement pointer also allow live simulation time to advance. The test never required Runner to remain alive before the chase-direction assertion.

LIKELY cause: the harness allowed normal combat to kill Runner and then compared stale presentation orientation with a later collision/post-combat velocity. Exact collision causality is not independently proven. A future scoped repair should return void from the resume helper and capture a bounded live chase state while asserting Runner and Scuttler are alive. Preserve actual movement/combat constants and meaningful orientation assertions.

Compact evidence: [trace snapshots](evidence/r3a/failure-snapshots.json). Full trace remains locally at test-results/runner-scuttler-visuals-Ru-66715-death-keep-overlays-aligned/trace.zip.

Captured mobile evidence: [Runner alive](evidence/r3a/runner-alive.png), [Runner moving](evidence/r3a/runner-moving.png), [Scuttler spawn](evidence/r3a/scuttler-spawn.png). These screenshots prove sprites appear but do not complete visual acceptance. Hit/death, dense-wave, repeated restart, missing-texture fallback and special-attack regression remain unverified. At844x390 the canvas also scales these sprites below the standalone25–40px previews; readability needs explicit final review.

## Preservation and next boundary

Original remote refs reverified unchanged: io/mobile-alpha=23ba0579b57e76b4f89f0c09c3c299c6446ec37c; asset-integration-alpha=83badac4669a9f5daa390a42783a4fc0f417a626; recovery origin=18a73de4d92ac9b6e5393edb7d674cf55e2b4b65. The excluded prototype was not used. Work remains local and uncommitted. No next asset wave was started.

Changed-path SHA256 inventory is in [file hashes](evidence/r3a/file-hashes.json). It excludes temporary instructions and the inventory itself.