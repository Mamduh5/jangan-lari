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
- This sprint does not preload missing files.
- Player and enemy core objects remain `Phaser.GameObjects.Rectangle` with their existing Arcade physics bodies.
- Any future decorative sprite or image must not affect hitboxes, collision, movement, damage, XP, rewards, spawn timing, boss behavior, or balance.

## Current Slot Registry

The typed registry lives in `src/game/data/assetSlots.ts`.

Slot groups:

- Hero icon slots for menu cards and selected-loadout previews.
- Hero skin slots for future decorative player overlays.
- Weapon icon slots for HUD, codex, reward badges, or weapon cards.
- Enemy icon/sprite slots for codex, encounter docs, and optional decorative overlays.
- Tank class icon slots for class-choice presentation.
- UI icon slots for gold, pause, score, XP, HP, stat, class, reward, and codex badges.

The resolver helpers live in `src/game/utils/assetResolver.ts` and are intentionally no-throw. Use `shouldUseTexture(scene, slot)` before adding a Phaser image for any optional slot.
