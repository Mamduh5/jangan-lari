# R3E special enemy integration

Four existing PNGs are approved individually in `src/game/config/visualAssetRuntimeConfig.ts`. Broad `enemySprites`, `minibossSprites` and `bossSprites` switches remain false. PNG files are unchanged; BootScene uses the existing optional-image load/fallback path.

| Enemy | Sprite key | Display size (game units) | Horizontal flip |
| --- | --- | ---: | --- |
| Overlord | sprite-enemy-overlord | 62 | No: near-frontal artwork |
| Riftblade | sprite-enemy-riftblade | 56 | Yes: face points right |
| Dreadnought | sprite-enemy-miniboss-dreadnought | 84 | Yes: face points right |
| Behemoth | sprite-enemy-boss-behemoth | 112 | Yes: face points right |

Sizes and facing are independently adjustable in `src/game/data/enemySpritePresentation.ts`. Common sprites remain 36-46 units. All four special sprites stay upright; existing hit/charge/death response scaling and alpha still apply. Display sizes are not collision sizes.

R3E-C removes the rejected `preserveRoleCues` behavior. While a special sprite is active, the legacy Rectangle fill/border and all decorative role triangles, rectangles and circles are hidden. Style setters and role updates cannot re-enable them. The Arcade Rectangle, body geometry and attack logic are unchanged. The sprite renders at body depth plus 0.35, still below projectiles (7+), attack warnings (8), shockwave halo (7), independent event indicators and the UI scene.

Stroke-only charge/status information uses a small separate text label (`CHARGE`, `VOLLEY`, `SHOCKWAVE`, `EVENT`, `SUMMON`) driven by existing state and timing. No replacement outlines, circles, triangles or halos are added. Independent line/volley/shockwave warnings, projectiles, target indicators, health bars and phase feedback are untouched. Missing/disabled textures restore the complete original body and role decorations; the text label hides in fallback and during death, and is destroyed with the enemy. Existing sprite position, scale, alpha, facing, hit/death tint and cleanup remain intact.

Phase B changes no combat stats, body size, movement, collision regions, timers, rewards, or schedules. Dreadnought line strike/volley and Behemoth phase/shockwave contracts and renderer code remain untouched. Dangerous-attack PNG replacements remain unused; no calls activating them were added (the existing general effect category is unchanged).

Original R3E validation: unit coverage exercises approval/category isolation, sizes, orientation, fallback, cue visibility, layering, alpha, hit/death scaling/tint and cleanup using rendering collaborators. `npm test` passed 157 tests across 23 files; `npm run build` passed with the existing >500 kB chunk warning; `git diff --check` passed. Phase A separately passed 145 tests across 22 files and the same build/whitespace gates. No gameplay E2E were run, added or edited. No browser/manual acceptance is claimed.

R3E-C validation: `npm test` passed 172 tests across 23 files; `npm run build` passed with the existing large-chunk warning; `git diff --check` passed. Tests cover geometry suppression across updates/style resets, disabled/missing fallback, charge-window boundaries, attack-signal/contract preservation, physics isolation and label cleanup. Protected PNGs, gameplay configuration, RunScene attack renderers, UI and gameplay E2E files have no diff from `3474948`. Manual visual acceptance remains pending.

## Owner visual acceptance

- R3E-C owner acceptance: confirm the four special PNG characters have no legacy body decorations during movement, hit flashes, windup and death. Assess the small status text on a phone.
- Check Dreadnought line/volley warnings and Behemoth shockwave/phase cues amid projectiles; confirm HP bars and other indicators remain readable in actual play.
- The supplied Dreadnought artwork is wide and reaches the right image edge; existing padding/centering and outlines are preserved. Inspect facing and perceived body alignment. No normalization or PNG repair was performed.
- The supplied PNG colors and silhouettes now carry body identity. Independent encounter/target indicators remain; verify status text does not interfere with those indicators. No new art or size changes are included.
