# Asset Pack Integration

This document records the `asset-integration-alpha` full-pack audit and second-pass slot expansion. The pack is a structure-complete first-pass/fidelity-pass asset set, not final-quality art.

## Metadata Inspected

- `asset-manifest.json`: 75 transparent PNG assets, runtime mapping hints, and category metadata.
- `asset-completeness-report.json`: passed, 75 expected and 75 generated assets, no missing slot paths, no omitted assets.
- `integration-notes.md`: confirms structure-complete placeholder art and preserved filenames/folders.
- `suggested-paths.md`: lists generated source paths under `public/assets/generated/`.
- `folder-structure.txt`: confirms generated category folders.
- `SHA256SUMS.txt`: lists checksums for metadata, contact sheets, and every generated asset.
- `style-fidelity-check.md`: confirms structural regression gate passed and art is not certified final same-artist output.
- `preview-contact-sheet.jpg` and `reference-comparison-sheet.jpg`: present in the ZIP; useful for visual review only.

## Categories Found

- Characters: hero icons and hero skins.
- Enemies: enemy art mapped to existing enemy archetype IDs.
- Projectiles: player weapon projectile art and `enemy-shot`.
- Pickups: gold, health, magnet, and XP gem variants.
- Effects: boss shockwave, enemy death puff, hit pop, level-up burst, miniboss line strike, and XP collect.
- Props: risk altar, soft bush, tiny shrine, and wobbly rock.
- Tiles: boundary pebble and ground blob.
- UI upgrade icons: core upgrades, weapon unlocks, signature upgrades, and branch upgrades.
- UI buttons: close, pause, play, and retry.
- UI weapon icons: already mapped in first-pass weapon HUD icon slots.

## Already Integrated

- Hero icons: `hero-runner`, `hero-vanguard`, `hero-shade`, `hero-verdant`.
- Hero skins: `skin-runner`, `skin-vanguard`, `skin-shade`, `skin-verdant`.
- Weapon icons: all seven weapon HUD slots.
- Enemy icons and matching enemy sprite files for all current enemy archetypes.
- UI icons: `ui-gold`, `ui-pause`, `ui-xp`, `ui-hp`.

## New Slot Groups Added

- `PROJECTILE_SPRITE_ASSET_SLOTS`
- `PICKUP_ICON_ASSET_SLOTS`
- `EFFECT_SPRITE_ASSET_SLOTS`
- `MAP_PROP_ASSET_SLOTS`
- `TILE_ASSET_SLOTS`
- `UPGRADE_ICON_ASSET_SLOTS`
- `SIGNATURE_UPGRADE_ICON_ASSET_SLOTS`
- `BRANCH_UPGRADE_ICON_ASSET_SLOTS`
- `UI_BUTTON_ASSET_SLOTS`

All new slots are optional and included in `ALL_VISUAL_ASSET_SLOTS`.

## Files Copied

- `public/assets/projectiles/`: eight projectile PNGs, including `projectile-enemy-shot.png`.
- `public/assets/pickups/`: gold, health, magnet, and four XP gem variants.
- `public/assets/effects/`: six effect PNGs.
- `public/assets/props/`: four prop PNGs.
- `public/assets/tiles/`: two tile detail PNGs.
- `public/assets/upgrades/`: seven core upgrade icons, six weapon-unlock icons, seven signature icons, and four branch icons.
- `public/assets/ui/`: `ui-button-play.png`, `ui-button-retry.png`, `ui-button-close.png`.

## Future-Only Assets

Second-pass copied assets are tracked by `PRESENT_VISUAL_ASSET_KEYS`. Projectile sprites graduated to runtime preload in the projectile runtime pass; the remaining second-pass categories stay future-only and excluded from `PRELOAD_VISUAL_ASSET_KEYS`.

Future-only includes copied assets that still have no runtime surface in this pass, such as hero skins, enemy icons/sprites, pickup icons, effects, props, tiles, upgrade icons, UI buttons, and basic UI icons not currently rendered by existing scenes.

## Runtime-Preloaded Assets

Only existing runtime surfaces are preloaded:

- Hero menu/loadout icons: `hero-runner`, `hero-vanguard`, `hero-shade`, `hero-verdant`.
- Weapon HUD icons: `weapon-arc-bolt`, `weapon-twin-fangs`, `weapon-ember-lance`, `weapon-bloom-cannon`, `weapon-phase-disc`, `weapon-sunwheel`, `weapon-shatterbell`.
- Projectile sprites: `projectile-arc-bolt`, `projectile-twin-fangs`, `projectile-ember-lance`, `projectile-bloom-cannon`, `projectile-phase-disc`, `projectile-sunwheel`, `projectile-shatterbell`, `projectile-enemy-shot`.

No pickup, effect, prop, tile, upgrade, signature, branch, player-skin, enemy-sprite, or new UI button assets are preloaded.

## Still Missing

- Tank class icons: `class-basic`, `class-twin`, `class-sniper`.
- UI icons: `ui-score`, `ui-stat`, `ui-class`, `ui-reward`, `ui-codex`.

These slots remain optional and are intentionally absent from `PRESENT_VISUAL_ASSET_KEYS`.

## Intentionally Not Enabled

- Runtime pickup sprites.
- Runtime effect sprites.
- Runtime prop or tile rendering.
- Runtime player skin overlays.
- Runtime enemy sprite overlays.
- Gameplay hitbox or collision changes.
- Upgrade/build synergy changes.

These categories need later gameplay or UI decisions before runtime use.

## Fallback Behavior

Missing or unpreloaded assets do not crash the game. Runtime code must continue to use `shouldUseTexture(scene, slot)` before rendering optional textures. Existing shape/text fallbacks remain the active behavior when a texture is absent.

## Replacement Process

1. Replace the PNG at the existing slot path under `public/assets/...`.
2. Keep slot keys and paths stable unless `assetSlots.ts` is intentionally changed.
3. Add a slot key to `PRESENT_VISUAL_ASSET_KEYS` only when the file exists.
4. Add a slot key to `PRELOAD_VISUAL_ASSET_KEYS` only when an existing runtime surface renders it.
5. Keep final art quality review separate from slot and preload wiring.
