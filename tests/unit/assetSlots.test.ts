import type Phaser from 'phaser';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ENEMY_PROJECTILE_VISUAL_SCALE_MULTIPLIER,
  PLAYER_PROJECTILE_VISUAL_SCALE_MULTIPLIER,
  PROJECTILE_VISUAL_MAX_DIAMETER,
  PROJECTILE_VISUAL_MIN_DIAMETER,
  resolveEnemyProjectileVisualDiameter,
  resolvePlayerProjectileVisualDiameter,
} from '../../src/game/config/projectileVisualBalance';
import { XP_GEM_ICON_DIAMETER_BY_TIER, resolveXpGemIconDiameter } from '../../src/game/config/pickupVisualBalance';
import {
  ALL_VISUAL_ASSET_SLOTS,
  BUFF_STATUS_ICON_ASSET_SLOTS,
  BRANCH_UPGRADE_ICON_ASSET_SLOTS,
  EFFECT_SPRITE_ASSET_SLOTS,
  ENEMY_ICON_ASSET_SLOTS,
  HERO_ICON_ASSET_SLOTS,
  POWER_CORE_MAP_EVENT_ICON_ASSET_SLOTS,
  PICKUP_ICON_ASSET_SLOTS,
  PROJECTILE_SPRITE_ASSET_SLOTS,
  SKILL_ICON_ASSET_SLOTS,
  SIGNATURE_UPGRADE_ICON_ASSET_SLOTS,
  TANK_CLASS_ICON_ASSET_SLOTS,
  UPGRADE_ICON_ASSET_SLOTS,
  UI_BUTTON_ASSET_SLOTS,
  UI_ICON_ASSET_SLOTS,
  WEAPON_ICON_ASSET_SLOTS,
} from '../../src/game/data/assetSlots';
import {
  FUTURE_ONLY_VISUAL_ASSET_SLOTS,
  MISSING_OPTIONAL_VISUAL_ASSET_KEYS,
  PRELOAD_VISUAL_ASSET_KEYS,
  PRELOAD_VISUAL_ASSET_SLOTS,
  PRESENT_VISUAL_ASSET_KEYS,
  PRESENT_VISUAL_ASSET_SLOTS,
  RUNTIME_PRELOAD_VISUAL_ASSET_KEYS,
  RUNTIME_PRELOAD_VISUAL_ASSET_SLOTS,
} from '../../src/game/data/presentVisualAssets';
import {
  getProjectileSpriteSlot,
  getVisualAssetSlotByKey,
  hasTexture,
  hasVisualAsset,
  shouldUseTexture,
  shouldUseVisualAsset,
} from '../../src/game/utils/assetResolver';
import { VISUAL_ASSET_RUNTIME_CONFIG } from '../../src/game/config/visualAssetRuntimeConfig';

describe('asset slot registry', () => {
  test('defines optional slots with stable public asset paths', () => {
    expect(HERO_ICON_ASSET_SLOTS.runner).toMatchObject({
      key: 'hero-runner',
      path: 'assets/heroes/hero-runner.png',
      optional: true,
    });
    expect(WEAPON_ICON_ASSET_SLOTS['arc-bolt'].path).toBe('assets/weapons/weapon-arc-bolt.png');
    expect(ENEMY_ICON_ASSET_SLOTS.behemoth.key).toBe('enemy-boss-behemoth');
    expect(UI_ICON_ASSET_SLOTS.pause.path).toBe('assets/ui/ui-pause.png');
    expect(PROJECTILE_SPRITE_ASSET_SLOTS['enemy-shot'].path).toBe('assets/projectiles/projectile-enemy-shot.png');
    expect(PICKUP_ICON_ASSET_SLOTS['xp-huge'].key).toBe('pickup-xp-huge');
    expect(EFFECT_SPRITE_ASSET_SLOTS['boss-shockwave'].path).toBe('assets/effects/effect-boss-shockwave.png');
    expect(UPGRADE_ICON_ASSET_SLOTS['unlock-shatterbell'].key).toBe('upgrade-unlock-shatterbell');
    expect(SIGNATURE_UPGRADE_ICON_ASSET_SLOTS['signature-arc-bolt-volt-volley'].path).toBe(
      'assets/upgrades/signature-arc-bolt-volt-volley.png',
    );
    expect(BRANCH_UPGRADE_ICON_ASSET_SLOTS['branch-sunwheel-outer-ring'].key).toBe('branch-sunwheel-outer-ring');
    expect(SKILL_ICON_ASSET_SLOTS['breakout-pulse'].path).toBe('assets/ui/skill-breakout-pulse.png');
    expect(BUFF_STATUS_ICON_ASSET_SLOTS['shield-pulse'].key).toBe('buff-shield-pulse');
    expect(POWER_CORE_MAP_EVENT_ICON_ASSET_SLOTS['power-core'].key).toBe('map-event-power-core');
    expect(UI_BUTTON_ASSET_SLOTS.play.path).toBe('assets/ui/ui-button-play.png');
  });

  test('keeps slot keys unique', () => {
    const keys = ALL_VISUAL_ASSET_SLOTS.map((slot) => slot.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('preloads only committed optional asset files', () => {
    const allKeys = new Set(ALL_VISUAL_ASSET_SLOTS.map((slot) => slot.key));
    const futureOnlyKeys = new Set(FUTURE_ONLY_VISUAL_ASSET_SLOTS.map((slot) => slot.key));

    for (const key of PRESENT_VISUAL_ASSET_KEYS) {
      expect(allKeys.has(key)).toBe(true);
    }

    for (const key of PRELOAD_VISUAL_ASSET_KEYS) {
      expect(PRESENT_VISUAL_ASSET_KEYS.has(key)).toBe(true);
      expect(futureOnlyKeys.has(key)).toBe(false);
    }

    for (const slot of PRESENT_VISUAL_ASSET_SLOTS) {
      expect(existsSync(resolve(process.cwd(), 'public', slot.path))).toBe(true);
    }

    for (const slot of PRELOAD_VISUAL_ASSET_SLOTS) {
      expect(existsSync(resolve(process.cwd(), 'public', slot.path))).toBe(true);
    }

    expect(PRELOAD_VISUAL_ASSET_KEYS).toBe(RUNTIME_PRELOAD_VISUAL_ASSET_KEYS);
    expect(PRELOAD_VISUAL_ASSET_SLOTS).toBe(RUNTIME_PRELOAD_VISUAL_ASSET_SLOTS);

    for (const slot of FUTURE_ONLY_VISUAL_ASSET_SLOTS) {
      expect(PRESENT_VISUAL_ASSET_KEYS.has(slot.key)).toBe(true);
      expect(PRELOAD_VISUAL_ASSET_KEYS.has(slot.key)).toBe(false);
      expect(existsSync(resolve(process.cwd(), 'public', slot.path))).toBe(true);
    }

    for (const slot of Object.values(PICKUP_ICON_ASSET_SLOTS)) {
      expect(PRESENT_VISUAL_ASSET_KEYS.has(slot.key)).toBe(true);
      expect(PRELOAD_VISUAL_ASSET_KEYS.has(slot.key)).toBe(true);
      expect(futureOnlyKeys.has(slot.key)).toBe(false);
    }

    for (const slot of Object.values(EFFECT_SPRITE_ASSET_SLOTS)) {
      expect(PRESENT_VISUAL_ASSET_KEYS.has(slot.key)).toBe(true);
      expect(PRELOAD_VISUAL_ASSET_KEYS.has(slot.key)).toBe(true);
      expect(futureOnlyKeys.has(slot.key)).toBe(false);
    }

    for (const slot of [UI_ICON_ASSET_SLOTS.gold, UI_ICON_ASSET_SLOTS.pause, UI_ICON_ASSET_SLOTS.xp, UI_ICON_ASSET_SLOTS.hp]) {
      expect(PRESENT_VISUAL_ASSET_KEYS.has(slot.key)).toBe(true);
      expect(PRELOAD_VISUAL_ASSET_KEYS.has(slot.key)).toBe(true);
      expect(futureOnlyKeys.has(slot.key)).toBe(false);
    }

    for (const slot of Object.values(UI_BUTTON_ASSET_SLOTS)) {
      expect(PRESENT_VISUAL_ASSET_KEYS.has(slot.key)).toBe(true);
      expect(PRELOAD_VISUAL_ASSET_KEYS.has(slot.key)).toBe(true);
      expect(futureOnlyKeys.has(slot.key)).toBe(false);
    }

    for (const slot of Object.values(PROJECTILE_SPRITE_ASSET_SLOTS)) {
      expect(PRESENT_VISUAL_ASSET_KEYS.has(slot.key)).toBe(true);
      expect(PRELOAD_VISUAL_ASSET_KEYS.has(slot.key)).toBe(true);
      expect(futureOnlyKeys.has(slot.key)).toBe(false);
    }
  });

  test('keeps unfilled slots optional and out of the present manifest', () => {
    expect(TANK_CLASS_ICON_ASSET_SLOTS.basic).toMatchObject({
      key: 'class-basic',
      optional: true,
    });
    expect(PRESENT_VISUAL_ASSET_KEYS.has(TANK_CLASS_ICON_ASSET_SLOTS.basic.key)).toBe(false);
    expect(MISSING_OPTIONAL_VISUAL_ASSET_KEYS.has(TANK_CLASS_ICON_ASSET_SLOTS.basic.key)).toBe(true);
    expect(MISSING_OPTIONAL_VISUAL_ASSET_KEYS.has(SKILL_ICON_ASSET_SLOTS['breakout-pulse'].key)).toBe(true);
    expect(MISSING_OPTIONAL_VISUAL_ASSET_KEYS.has(UI_ICON_ASSET_SLOTS.score.key)).toBe(true);
    expect(MISSING_OPTIONAL_VISUAL_ASSET_KEYS.has(UI_ICON_ASSET_SLOTS.stat.key)).toBe(true);
    expect(MISSING_OPTIONAL_VISUAL_ASSET_KEYS.has(UI_ICON_ASSET_SLOTS.class.key)).toBe(true);
    expect(MISSING_OPTIONAL_VISUAL_ASSET_KEYS.has(UI_ICON_ASSET_SLOTS.reward.key)).toBe(true);
    expect(MISSING_OPTIONAL_VISUAL_ASSET_KEYS.has(UI_ICON_ASSET_SLOTS.codex.key)).toBe(true);
  });

  test('keeps every registered slot optional', () => {
    for (const slot of ALL_VISUAL_ASSET_SLOTS) {
      expect(slot.optional).toBe(true);
    }
  });
});

describe('visual asset runtime config', () => {
  test('enables stable menu, weapon HUD, projectile, pickup, effect, and UI categories by default', () => {
    expect(VISUAL_ASSET_RUNTIME_CONFIG.heroMenuIcons).toBe(true);
    expect(VISUAL_ASSET_RUNTIME_CONFIG.weaponHudIcons).toBe(true);
    expect(VISUAL_ASSET_RUNTIME_CONFIG.pickupIcons).toBe(true);
    expect(VISUAL_ASSET_RUNTIME_CONFIG.effectSprites).toBe(true);
    expect(VISUAL_ASSET_RUNTIME_CONFIG.projectileSprites).toBe(true);
    expect(VISUAL_ASSET_RUNTIME_CONFIG.enemySprites).toBe(false);
    expect(VISUAL_ASSET_RUNTIME_CONFIG.enemyIcons).toBe(false);
    expect(VISUAL_ASSET_RUNTIME_CONFIG.bossSprites).toBe(false);
    expect(VISUAL_ASSET_RUNTIME_CONFIG.minibossSprites).toBe(false);
    expect(VISUAL_ASSET_RUNTIME_CONFIG.heroSkins).toBe(false);
    expect(VISUAL_ASSET_RUNTIME_CONFIG.mapProps).toBe(false);
    expect(VISUAL_ASSET_RUNTIME_CONFIG.tiles).toBe(false);
    expect(VISUAL_ASSET_RUNTIME_CONFIG.upgradeIcons).toBe(false);
    expect(VISUAL_ASSET_RUNTIME_CONFIG.signatureUpgradeIcons).toBe(false);
    expect(VISUAL_ASSET_RUNTIME_CONFIG.branchUpgradeIcons).toBe(false);
    expect(VISUAL_ASSET_RUNTIME_CONFIG.skillIcons).toBe(false);
    expect(VISUAL_ASSET_RUNTIME_CONFIG.buffStatusIcons).toBe(false);
    expect(VISUAL_ASSET_RUNTIME_CONFIG.powerCoreMapEventIcons).toBe(false);
    expect(VISUAL_ASSET_RUNTIME_CONFIG.tankClassIcons).toBe(false);
    expect(VISUAL_ASSET_RUNTIME_CONFIG.uiButtons).toBe(true);
    expect(VISUAL_ASSET_RUNTIME_CONFIG.uiIcons).toBe(true);
  });
});

describe('asset resolver', () => {
  test('checks existing textures without loading files', () => {
    const scene = {
      textures: {
        exists: (key: string) => key === 'hero-runner',
      },
    } as unknown as Pick<Phaser.Scene, 'textures'>;

    expect(hasTexture(scene, 'hero-runner')).toBe(true);
    expect(hasVisualAsset(scene, 'hero-runner')).toBe(true);
    expect(getVisualAssetSlotByKey('hero-runner')).toBe(HERO_ICON_ASSET_SLOTS.runner);
    expect(getVisualAssetSlotByKey('missing-slot')).toBeNull();
    expect(hasTexture(scene, 'hero-vanguard')).toBe(false);
    expect(shouldUseTexture(scene, HERO_ICON_ASSET_SLOTS.runner)).toBe(true);
    expect(shouldUseTexture(scene, HERO_ICON_ASSET_SLOTS.vanguard)).toBe(false);
  });

  test('uses enabled runtime categories and rejects wrong-category slots', () => {
    const scene = {
      textures: {
        exists: () => true,
      },
    } as unknown as Pick<Phaser.Scene, 'textures'>;

    const projectileSlot = getProjectileSpriteSlot('arc-bolt');

    expect(hasVisualAsset(scene, projectileSlot.key)).toBe(true);
    expect(shouldUseVisualAsset(scene, 'projectileSprites', projectileSlot)).toBe(true);
    expect(shouldUseTexture(scene, projectileSlot)).toBe(true);
    expect(shouldUseVisualAsset(scene, 'pickupIcons', PICKUP_ICON_ASSET_SLOTS['xp-small'])).toBe(true);
    expect(shouldUseTexture(scene, PICKUP_ICON_ASSET_SLOTS['xp-small'])).toBe(true);
    expect(shouldUseVisualAsset(scene, 'effectSprites', EFFECT_SPRITE_ASSET_SLOTS['hit-pop'])).toBe(true);
    expect(shouldUseTexture(scene, EFFECT_SPRITE_ASSET_SLOTS['hit-pop'])).toBe(true);
    expect(shouldUseVisualAsset(scene, 'uiIcons', UI_ICON_ASSET_SLOTS.gold)).toBe(true);
    expect(shouldUseVisualAsset(scene, 'uiButtons', UI_BUTTON_ASSET_SLOTS.play)).toBe(true);
    expect(shouldUseVisualAsset(scene, 'heroMenuIcons', HERO_ICON_ASSET_SLOTS.runner)).toBe(true);
    expect(shouldUseVisualAsset(scene, 'heroMenuIcons', projectileSlot)).toBe(false);
  });

  test('returns false for missing slot keys and missing textures', () => {
    const scene = {
      textures: {
        exists: () => false,
      },
    } as unknown as Pick<Phaser.Scene, 'textures'>;

    expect(hasVisualAsset(scene, 'unknown-slot')).toBe(false);
    expect(shouldUseVisualAsset(scene, 'heroMenuIcons', 'unknown-slot')).toBe(false);
    expect(shouldUseVisualAsset(scene, 'heroMenuIcons', HERO_ICON_ASSET_SLOTS.runner)).toBe(false);
  });

  test('fails closed when texture lookup is unavailable or throws', () => {
    const throwingScene = {
      textures: {
        exists: () => {
          throw new Error('texture manager unavailable');
        },
      },
    } as unknown as Pick<Phaser.Scene, 'textures'>;

    expect(hasTexture(undefined, 'hero-runner')).toBe(false);
    expect(hasTexture(throwingScene, 'hero-runner')).toBe(false);
    expect(shouldUseTexture(throwingScene, HERO_ICON_ASSET_SLOTS.runner)).toBe(false);
  });
});

describe('projectile visual balance', () => {
  test('keeps overlay sizing config-driven and larger than gameplay radius without changing hitboxes', () => {
    expect(PLAYER_PROJECTILE_VISUAL_SCALE_MULTIPLIER).toBe(3.6);
    expect(ENEMY_PROJECTILE_VISUAL_SCALE_MULTIPLIER).toBe(3.2);
    expect(PROJECTILE_VISUAL_MIN_DIAMETER).toBe(42);
    expect(PROJECTILE_VISUAL_MAX_DIAMETER).toBe(94);

    expect(resolvePlayerProjectileVisualDiameter('arc-bolt', 5)).toBe(42);
    expect(resolvePlayerProjectileVisualDiameter('phase-disc', 9)).toBe(63);
    expect(resolveEnemyProjectileVisualDiameter(8)).toBe(51);
    expect(resolveEnemyProjectileVisualDiameter(40)).toBe(94);
  });
});

describe('pickup visual balance', () => {
  test('keeps XP icon overlays compact without changing pickup values or bodies', () => {
    expect(XP_GEM_ICON_DIAMETER_BY_TIER).toEqual({
      small: 20,
      medium: 24,
      large: 30,
      huge: 36,
    });

    expect(resolveXpGemIconDiameter('small')).toBe(20);
    expect(resolveXpGemIconDiameter('medium')).toBe(24);
    expect(resolveXpGemIconDiameter('large')).toBe(30);
    expect(resolveXpGemIconDiameter('huge')).toBe(36);
  });
});
