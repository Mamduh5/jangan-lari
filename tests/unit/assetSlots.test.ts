import type Phaser from 'phaser';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ALL_VISUAL_ASSET_SLOTS,
  BRANCH_UPGRADE_ICON_ASSET_SLOTS,
  EFFECT_SPRITE_ASSET_SLOTS,
  ENEMY_ICON_ASSET_SLOTS,
  HERO_ICON_ASSET_SLOTS,
  PICKUP_ICON_ASSET_SLOTS,
  PROJECTILE_SPRITE_ASSET_SLOTS,
  SIGNATURE_UPGRADE_ICON_ASSET_SLOTS,
  TANK_CLASS_ICON_ASSET_SLOTS,
  UPGRADE_ICON_ASSET_SLOTS,
  UI_BUTTON_ASSET_SLOTS,
  UI_ICON_ASSET_SLOTS,
  WEAPON_ICON_ASSET_SLOTS,
} from '../../src/game/data/assetSlots';
import {
  FUTURE_ONLY_VISUAL_ASSET_SLOTS,
  PRELOAD_VISUAL_ASSET_KEYS,
  PRELOAD_VISUAL_ASSET_SLOTS,
  PRESENT_VISUAL_ASSET_KEYS,
  PRESENT_VISUAL_ASSET_SLOTS,
} from '../../src/game/data/presentVisualAssets';
import { hasTexture, shouldUseTexture } from '../../src/game/utils/assetResolver';

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

    for (const slot of FUTURE_ONLY_VISUAL_ASSET_SLOTS) {
      expect(PRESENT_VISUAL_ASSET_KEYS.has(slot.key)).toBe(true);
      expect(PRELOAD_VISUAL_ASSET_KEYS.has(slot.key)).toBe(false);
      expect(existsSync(resolve(process.cwd(), 'public', slot.path))).toBe(true);
    }
  });

  test('keeps unfilled slots optional and out of the present manifest', () => {
    expect(TANK_CLASS_ICON_ASSET_SLOTS.basic).toMatchObject({
      key: 'class-basic',
      optional: true,
    });
    expect(PRESENT_VISUAL_ASSET_KEYS.has(TANK_CLASS_ICON_ASSET_SLOTS.basic.key)).toBe(false);
  });

  test('keeps every registered slot optional', () => {
    for (const slot of ALL_VISUAL_ASSET_SLOTS) {
      expect(slot.optional).toBe(true);
    }
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
    expect(hasTexture(scene, 'hero-vanguard')).toBe(false);
    expect(shouldUseTexture(scene, HERO_ICON_ASSET_SLOTS.runner)).toBe(true);
    expect(shouldUseTexture(scene, HERO_ICON_ASSET_SLOTS.vanguard)).toBe(false);
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
