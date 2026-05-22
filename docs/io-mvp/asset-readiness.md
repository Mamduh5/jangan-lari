# Asset Readiness

This project is asset-ready, not fully asset-driven. Stable slots, manifests, category switches, and no-throw resolver helpers exist so each visual category can be enabled later without changing gameplay code or requiring missing files.

## Runtime Switches

Runtime category defaults live in `src/game/config/visualAssetRuntimeConfig.ts`.

Enabled now:

- `heroMenuIcons`
- `weaponHudIcons`

Future-ready but disabled:

- `heroSkins`
- `projectileSprites`
- `enemySprites`
- `enemyIcons`
- `bossSprites`
- `minibossSprites`
- `pickupIcons`
- `effectSprites`
- `mapProps`
- `tiles`
- `upgradeIcons`
- `signatureUpgradeIcons`
- `branchUpgradeIcons`
- `skillIcons`
- `buffStatusIcons`
- `powerCoreMapEventIcons`
- `tankClassIcons`
- `uiButtons`
- `uiIcons`

To enable a category later, set that category to `true`, confirm the desired slot keys are in `PRESENT_VISUAL_ASSET_KEYS`, and add or finish the matching scene/entity render path only for that category. Do not enable runtime player, enemy, boss, miniboss, or projectile sprites until the art is normalized and reviewed.

## Preload Policy

`BootScene` preloads only `RUNTIME_PRELOAD_VISUAL_ASSET_SLOTS`, which is derived from committed assets plus enabled runtime categories. Committed-but-disabled assets stay in `FUTURE_ONLY_VISUAL_ASSET_KEYS` and are not loaded. Missing optional slots are tracked by `MISSING_OPTIONAL_VISUAL_ASSET_KEYS` and must never produce loader requests.

## Fallback Behavior

All slots are optional. Resolver helpers return `false` or `null` when a slot is missing, a texture is missing, or a category is disabled. Existing Phaser shape and text fallbacks remain the default behavior for disabled categories. Player and Enemy remain Rectangle-based physics objects; any future images are decorative overlays only.

## Category Checklist

| Category | Slot group | Assets present? | Runtime enabled? | Fallback | Risk level | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Hero menu portrait/icon | `HERO_ICON_ASSET_SLOTS` | Yes | Yes | Hero shape preview | Low | Used only in menu/loadout surfaces. |
| Hero skin preview/runtime overlay | `HERO_SKIN_ASSET_SLOTS` | Yes | No | Player rectangle and tank decorations | High | Overlay hook exists in `Player`; body and hitbox stay unchanged. |
| Weapon menu/HUD icon | `WEAPON_ICON_ASSET_SLOTS` | Yes | Yes | Weapon short label and frame | Low | HUD icon path is category-gated. |
| Tank class icon | `TANK_CLASS_ICON_ASSET_SLOTS` | No | No | Class text cards | Low | Class-choice cards have readiness metadata only. |
| HUD HP/XP/gold/kills/pause icons | `UI_ICON_ASSET_SLOTS` | Partial | No | Current HUD text/bars/buttons | Low | HP, XP, gold, and pause files exist; score/stat/class/reward/codex are missing. |
| Active skill/Pulse icon | `SKILL_ICON_ASSET_SLOTS` | No | No | `P` active ability label | Low | Hook is ready for Breakout Pulse. |
| Buff/status icons | `BUFF_STATUS_ICON_ASSET_SLOTS` | No | No | Current text/timer state | Low | Intended for Power Core shield/refund and regen status. |
| Player projectile sprites | `PROJECTILE_SPRITE_ASSET_SLOTS` | Yes | No | Current projectile circles/trails | High | Overlay code remains gated; no hitbox changes. |
| Enemy projectile sprites | `PROJECTILE_SPRITE_ASSET_SLOTS.enemy-shot` | Yes | No | Current enemy bolt circle/halo | High | Boss/miniboss shots use the same disabled projectile category. |
| Enemy codex/icons | `ENEMY_ICON_ASSET_SLOTS` | Yes | No | Existing threat text and shape language | Medium | For non-runtime UI surfaces first. |
| Runtime enemy sprites | `ENEMY_SPRITE_ASSET_SLOTS` | Yes | No | Enemy rectangles and role markers | High | Overlay hook exists; rectangles and Arcade bodies remain authoritative. |
| Boss sprite overlay | `BOSS_SPRITE_ASSET_SLOTS` | Yes | No | Boss rectangle and boss effects | High | Separate runtime category from normal enemies. |
| Miniboss sprite overlay | `MINIBOSS_SPRITE_ASSET_SLOTS` | Yes | No | Miniboss rectangle and telegraphs | High | Separate runtime category from normal enemies. |
| Elite visual layer | `ENEMY_SPRITE_ASSET_SLOTS` plus role markers | Yes | No | Current stroke/marker treatment | Medium | Keep elite readability before art replacement. |
| XP/gold/magnet/health pickups | `PICKUP_ICON_ASSET_SLOTS` | Yes | No | XP gem circles and current pickup shapes | Medium | XP gem overlay hook exists and is disabled. |
| Power Core pickup/shrine | `POWER_CORE_MAP_EVENT_ICON_ASSET_SLOTS`, `MAP_PROP_ASSET_SLOTS` | Partial | No | Current shrine rings and CORE label | Medium | Power Core icon slot is missing; prop slots are future-only. |
| Hit spark and impact effects | `EFFECT_SPRITE_ASSET_SLOTS` | Yes | No | Current circles/flashes | Medium | Covers hit pop, impact, death puff, XP collect, level-up burst. |
| Pulse ring effect | `EFFECT_SPRITE_ASSET_SLOTS` | Partial | No | Current pulse ring | Medium | Use effect slots only after readability review. |
| Boss shockwave visual | `EFFECT_SPRITE_ASSET_SLOTS.boss-shockwave` | Yes | No | Current shockwave ring/halo | High | Must not change damage radius or active frames. |
| Miniboss line/volley visual | `EFFECT_SPRITE_ASSET_SLOTS.miniboss-line-strike` | Yes | No | Current telegraph and line shapes | High | Must not change contracts or collision. |
| Danger zone warning/active visual | `EFFECT_SPRITE_ASSET_SLOTS` | Partial | No | Current warning/active circles | High | No slot-specific file yet for danger zones. |
| Map props | `MAP_PROP_ASSET_SLOTS` | Yes | No | Current sparse arena | Medium | Future decorative only; no pathing/collision changes. |
| Ground tiles/details | `TILE_ASSET_SLOTS` | Yes | No | Current background | Medium | Decorative only. |
| Map event markers | `POWER_CORE_MAP_EVENT_ICON_ASSET_SLOTS` | No | No | Current alert/banner/marker text | Low | Stable slots exist for Power Core, challenge wave, and reward target. |
| Reward cards | `UPGRADE_ICON_ASSET_SLOTS`, `SIGNATURE_UPGRADE_ICON_ASSET_SLOTS`, `BRANCH_UPGRADE_ICON_ASSET_SLOTS` | Yes | No | Current badge/text/card styling | Low | Cards have readiness metadata; no layout change. |
| Permanent/meta upgrade icons | `UPGRADE_ICON_ASSET_SLOTS` | Yes | No | Current meta text UI | Low | Reuse core upgrade icon slots. |
| Signature upgrade icons | `SIGNATURE_UPGRADE_ICON_ASSET_SLOTS` | Yes | No | Signature badge text | Low | Disabled until card layout explicitly adopts icons. |
| Branch/tree icons | `BRANCH_UPGRADE_ICON_ASSET_SLOTS` | Yes | No | Branch badge text | Low | Disabled until tree UI exists. |
| Codex/menu buttons | `UI_BUTTON_ASSET_SLOTS`, `UI_ICON_ASSET_SLOTS` | Partial | No | Current text buttons | Low | Play/retry/close files exist; other UI icons remain optional. |

## Naming Rules

- Keep files under `public/assets/...`.
- Keep runtime paths relative to `public`, such as `assets/weapons/weapon-arc-bolt.png`.
- Use lowercase hyphenated filenames.
- Keep slot keys stable and aligned with filenames without extensions when practical.
- Add new files to `PRESENT_VISUAL_ASSET_KEYS` only after they exist.
- Never add missing optional files to a preload manifest.

## Adding A New Slot Safely

1. Add an optional slot to `src/game/data/assetSlots.ts`.
2. Include it in `ALL_VISUAL_ASSET_SLOTS`.
3. Add the key to `PRESENT_VISUAL_ASSET_KEYS` only if the file is committed.
4. Pick or add a runtime category in `visualAssetRuntimeConfig.ts`, defaulting risky categories to `false`.
5. Use `shouldUseVisualAsset(scene, category, slot)` before rendering.
6. Keep the existing shape/text fallback.
7. Add or update unit tests for registry, preload, resolver, and config behavior.

## Risk Notes

Runtime player skins, enemy sprites, boss/miniboss sprites, and projectile sprites are high-risk because rough or unnormalized art can reduce readability. They must remain overlays, must not replace Rectangle bodies, and must not alter Arcade body sizes, collision, hitboxes, damage, movement, waves, boss logic, weapon logic, upgrade logic, or balance.

Replacing rough art is a file replacement task first: keep the existing key and path, replace the PNG, review alignment and transparency, then enable the category only after a focused runtime pass.
