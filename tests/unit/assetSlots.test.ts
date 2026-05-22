import type Phaser from 'phaser';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ALL_VISUAL_ASSET_SLOTS,
  ENEMY_ICON_ASSET_SLOTS,
  HERO_ICON_ASSET_SLOTS,
  UI_ICON_ASSET_SLOTS,
  WEAPON_ICON_ASSET_SLOTS,
} from '../../src/game/data/assetSlots';
import {
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
  });

  test('keeps slot keys unique', () => {
    const keys = ALL_VISUAL_ASSET_SLOTS.map((slot) => slot.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('preloads only committed optional asset files', () => {
    const allKeys = new Set(ALL_VISUAL_ASSET_SLOTS.map((slot) => slot.key));

    for (const key of PRESENT_VISUAL_ASSET_KEYS) {
      expect(allKeys.has(key)).toBe(true);
    }

    for (const key of PRELOAD_VISUAL_ASSET_KEYS) {
      expect(PRESENT_VISUAL_ASSET_KEYS.has(key)).toBe(true);
    }

    for (const slot of PRESENT_VISUAL_ASSET_SLOTS) {
      expect(existsSync(resolve(process.cwd(), 'public', slot.path))).toBe(true);
    }

    for (const slot of PRELOAD_VISUAL_ASSET_SLOTS) {
      expect(existsSync(resolve(process.cwd(), 'public', slot.path))).toBe(true);
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
