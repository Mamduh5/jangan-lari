# R3E special enemy integration

Four existing PNGs are approved individually in `src/game/config/visualAssetRuntimeConfig.ts`. Broad `enemySprites`, `minibossSprites` and `bossSprites` switches remain false. PNG files are unchanged; BootScene uses the existing optional-image load/fallback path.

| Enemy | Sprite key | Display size (game units) | Horizontal flip |
| --- | --- | ---: | --- |
| Overlord | sprite-enemy-overlord | 62 | No: near-frontal artwork |
| Riftblade | sprite-enemy-riftblade | 56 | Yes: face points right |
| Dreadnought | sprite-enemy-miniboss-dreadnought | 84 | Yes: face points right |
| Behemoth | sprite-enemy-boss-behemoth | 112 | Yes: face points right |

Sizes and facing are independently adjustable in `src/game/data/enemySpritePresentation.ts`. Common sprites remain 36-46 units. All four special sprites stay upright; existing hit/charge/death response scaling and alpha still apply. Display sizes are not collision sizes.

`preserveRoleCues` keeps each special's original Rectangle stroke and role decorations visible. Its sprite renders at body depth minus 0.1, below the original body/warning stroke and role markers, and below projectiles (7+), attack warnings (8), shockwave halo (7), event indicators and the UI scene. No warning shape or attack geometry has moved. Missing/failed textures retain the Rectangle and original cues; losing a texture after loading restores fallback drawing. Existing post-update synchronization and destroy cleanup are retained.

Phase B changes no combat stats, body size, movement, collision regions, timers, rewards, or schedules. Dreadnought line strike/volley and Behemoth phase/shockwave contracts and renderer code remain untouched. Dangerous-attack PNG replacements remain unused; no calls activating them were added (the existing general effect category is unchanged).

Validation: unit coverage exercises approval/category isolation, sizes, orientation, fallback, cue visibility, layering, alpha, hit/death scaling/tint and cleanup using rendering collaborators. `npm test` passed 157 tests across 23 files; `npm run build` passed with the existing >500 kB chunk warning; `git diff --check` passed. Phase A separately passed 145 tests across 22 files and the same build/whitespace gates. No gameplay E2E were run, added or edited. No browser/manual acceptance is claimed.

## Owner visual acceptance

- Assess special-enemy hierarchy and silhouette readability on a phone, especially when their original directional markers/strokes cross the artwork.
- Check Dreadnought line/volley warnings and Behemoth shockwave/phase cues amid projectiles; confirm HP bars and other indicators remain readable in actual play.
- The supplied Dreadnought artwork is wide and reaches the right image edge; existing padding/centering and outlines are preserved. Inspect facing and perceived body alignment. No normalization or PNG repair was performed.
- The orange/green supplied artwork differs from the existing purple/cyan/red body colors; retained strokes and threat markers carry the original identity cues. Assess their contrast and readability before any further visual batch.
