# Asset Slots

Sprint A18 prepares stable asset keys and file paths for future visual assets without requiring real art. Current Phaser shape visuals remain the runtime fallback and should continue to work when no files exist.

## Recommended Formats

- PNG: preferred for transparent sprites, hero icons, weapon icons, enemy icons, UI icons, and badges.
- JPG: only for large non-transparent backgrounds if a later sprint needs them.
- SVG: acceptable for docs and mockups, but not required for Phaser runtime assets.

Use transparent PNG backgrounds for gameplay sprites, icons, badges, and effects so the game can keep the current dark UI and arena backgrounds.

## Recommended Folders

Future files should live under `public/assets/` so Vite serves them as static assets:

- `public/assets/heroes/`
- `public/assets/weapons/`
- `public/assets/enemies/`
- `public/assets/ui/`
- `public/assets/effects/`

The code registry uses runtime paths such as `assets/heroes/hero-runner.png`. Do not call `load.image` for those paths until the files are actually committed or a later asset manifest confirms they exist.

## Naming Conventions

Use lowercase, hyphenated names that match data IDs where possible:

- `hero-runner.png`
- `hero-vanguard.png`
- `hero-bruiser.png`
- `weapon-arc-bolt.png`
- `weapon-twin-cannon.png`
- `weapon-twin-fangs.png`
- `enemy-scuttler.png`
- `enemy-miniboss-dreadnought.png`
- `enemy-boss-behemoth.png`
- `ui-gold.png`
- `ui-pause.png`

Keep the Phaser texture key aligned with the filename without extension where practical. For example, `hero-runner` should point to `assets/heroes/hero-runner.png`.

## Size Guidance

- Hero menu icon: 128x128 or 256x256 PNG.
- Hero/player skin preview: 256x256 PNG if it needs more detail than the menu icon.
- Weapon icon: 64x64 or 128x128 PNG.
- Enemy icon or sprite: 128x128 or 256x256 PNG.
- UI icon: 64x64 PNG.
- Effects: start at 128x128 PNG unless the effect clearly needs a larger texture.

Prefer square source art with the subject centered. Leave transparent padding only when it is intentional for alignment.

## Runtime Fallback Rule

Every asset slot is optional. Missing files must not create console load errors or black boxes.

Current rule:

- If a texture key already exists in Phaser, UI code may render it.
- If the texture key does not exist, UI code keeps the existing shape or text fallback.
- `BootScene` preloads only runtime-supported slots listed in `RUNTIME_PRELOAD_VISUAL_ASSET_KEYS` in `src/game/data/presentVisualAssets.ts`; committed disabled assets remain future-only.
- Player and enemy core objects remain `Phaser.GameObjects.Rectangle` with their existing Arcade physics bodies.
- Any future decorative sprite or image must not affect hitboxes, collision, movement, damage, XP, rewards, spawn timing, boss behavior, or balance.

## Current Slot Registry

The typed registry lives in `src/game/data/assetSlots.ts`.

Slot groups:

- Hero icon slots for menu cards and selected-loadout previews.
- Hero skin slots for future decorative player overlays.
- Weapon icon slots for HUD, codex, reward badges, or weapon cards.
- Projectile sprite slots for future projectile presentation.
- Enemy icon/sprite slots for codex, encounter docs, and optional decorative overlays.
- Pickup icon slots for future collectible presentation.
- Effect sprite slots for future combat and reward presentation.
- Map prop and tile slots for future arena decoration.
- Core, weapon-unlock, signature, and branch upgrade icon slots.
- Tank class icon slots for class-choice presentation.
- UI icon slots for gold, pause, score, XP, HP, stat, class, reward, and codex badges.
- UI button slots for play, retry, and close affordances.

The resolver helpers live in `src/game/utils/assetResolver.ts` and are intentionally no-throw. Use `shouldUseVisualAsset(scene, category, slot)` before adding a Phaser image for any optional slot.

## First-Pass Asset Integration

Branch `asset-integration-alpha` adds first-pass owner-provided PNGs under existing A18 slot paths. These files prove the static asset and preload pipeline; they are not treated as final-quality art.

Filled slot groups:

- Hero icons: `hero-runner`, `hero-vanguard`, `hero-shade`, `hero-verdant`.
- Hero skins: `skin-runner`, `skin-vanguard`, `skin-shade`, `skin-verdant`.
- Weapon icons: `weapon-arc-bolt`, `weapon-twin-fangs`, `weapon-ember-lance`, `weapon-bloom-cannon`, `weapon-phase-disc`, `weapon-sunwheel`, `weapon-shatterbell`.
- Enemy icons: scuttler, skimmer, harrier, mauler, crusher, bulwark, hexcaster, overlord, riftblade, miniboss dreadnought, and boss behemoth.
- Enemy sprites: matching `sprite-enemy-*` files for the same enemy set. These are future-only and are not used as gameplay hitboxes.
- UI icons: `ui-gold`, `ui-pause`, `ui-xp`, `ui-hp`.

Still missing:

- Tank class icons: `class-basic`, `class-twin`, `class-sniper`.
- UI icons: `ui-score`, `ui-stat`, `ui-class`, `ui-reward`, `ui-codex`.
- Runtime decorative player skin overlays and runtime decorative enemy sprite overlays are not enabled in this pass.

Source ZIP files left unused:

- Effects, projectiles, props, tiles, upgrade icons, signature icons, branch icons, and play/retry/close buttons did not have matching A18 slots or runtime integration points in the first-pass branch.
- Projectile art was not mapped to weapon icons because weapon HUD slots already received matching `ui-weapon-*` assets.
- Ambiguous UI art was not renamed into unrelated slots unless the meaning was direct, such as pause, HP, XP, and gold.

Replacement process:

1. Replace the PNG at the existing `public/assets/...` path.
2. Keep the filename and slot key stable unless `assetSlots.ts` is intentionally updated.
3. Add a key to `PRESENT_VISUAL_ASSET_KEYS` only after the file exists.
4. Enable the matching runtime category only when an active runtime surface is ready to render that texture.
5. Leave unready slots absent from `presentVisualAssets.ts`; the resolver fallback will keep shape or text visuals.

## Second-Pass Full Pack Expansion

The full `jangan-lari-asset-pack-fidelity-v1.zip` was inspected before slot expansion. See `docs/io-mvp/asset-pack-integration.md` for the full audit.

Second-pass changes add optional slots and copied future-only files for:

- Projectile sprites.
- Pickup icons, including magnet and XP gem variants.
- Effect sprites.
- Map props.
- Tile details.
- Core and weapon-unlock upgrade icons.
- Signature and branch upgrade icons.
- Play, retry, and close UI button icons.

These second-pass files are present in `public/assets/...` and tracked by `PRESENT_VISUAL_ASSET_KEYS`. Pickup icons are runtime-enabled for XP gem overlays. Low-risk effect sprites are runtime-enabled as decorative overlays for hit pop, enemy death puff, XP collect, and level-up burst. Boss shockwave and miniboss line-strike mechanics intentionally keep their fallback visuals. Projectile sprites have been moved back to future-only readiness because art normalization is not ready. Shape/text fallbacks remain the default for UI, map, player, enemy, boss, miniboss, projectile, and upgrade surfaces unless the matching runtime category is explicitly enabled.

## Asset Readiness Switch Layer

The category-level switchboard is documented in `docs/io-mvp/asset-readiness.md`. Current runtime preload is derived from committed files plus enabled categories, not from every present file.
