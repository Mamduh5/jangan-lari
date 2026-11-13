import type Phaser from 'phaser';
import {
  ARENA_CENTER_CLEAR_RADIUS,
  ARENA_ENVIRONMENT_DEPTH,
  ARENA_PROP_EDGE_BAND,
  buildArenaEnvironmentLayout,
} from '../../src/game/config/arenaEnvironmentLayout';
import {
  VISUAL_ASSET_RUNTIME_CONFIG,
  getVisualAssetRuntimeCategoryForSlot,
  isReviewedRuntimeSprite,
} from '../../src/game/config/visualAssetRuntimeConfig';
import { MAP_PROP_ASSET_SLOTS, TILE_ASSET_SLOTS } from '../../src/game/data/assetSlots';
import { PRELOAD_VISUAL_ASSET_KEYS } from '../../src/game/data/presentVisualAssets';
import { shouldUseVisualAsset } from '../../src/game/utils/assetResolver';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../../src/game/config/worldBalance';

const ENVIRONMENT_KEYS = [
  'tile-ground-blob',
  'tile-boundary-pebble',
  'prop-soft-bush',
  'prop-wobbly-rock',
  'prop-risk-altar',
  'prop-tiny-shrine',
];

const layout = buildArenaEnvironmentLayout(WORLD_WIDTH, WORLD_HEIGHT);
const isInBounds = (x: number, y: number) => x >= 0 && x <= WORLD_WIDTH && y >= 0 && y <= WORLD_HEIGHT;

describe('arena environment gating (R3F)', () => {
  test('approves environment assets individually while broad categories stay disabled', () => {
    expect(VISUAL_ASSET_RUNTIME_CONFIG.tiles).toBe(false);
    expect(VISUAL_ASSET_RUNTIME_CONFIG.mapProps).toBe(false);
    for (const slot of [...Object.values(TILE_ASSET_SLOTS), ...Object.values(MAP_PROP_ASSET_SLOTS)]) {
      expect(isReviewedRuntimeSprite(slot)).toBe(true);
      expect(PRELOAD_VISUAL_ASSET_KEYS.has(slot.key)).toBe(true);
    }
    expect(isReviewedRuntimeSprite({ key: 'tile-ground-blob', kind: 'map-prop' })).toBe(false);
  });

  test('falls back (skips decoration) when textures are missing or the category mismatches', () => {
    const missing = { textures: { exists: () => false } } as unknown as Pick<Phaser.Scene, 'textures'>;
    const loaded = { textures: { exists: () => true } } as unknown as Pick<Phaser.Scene, 'textures'>;
    for (const placement of layout) {
      expect(shouldUseVisualAsset(missing, placement.category, placement.key)).toBe(false);
      expect(shouldUseVisualAsset(loaded, placement.category, placement.key)).toBe(true);
      expect(shouldUseVisualAsset(loaded, 'effectSprites', placement.key)).toBe(false);
    }
  });
});

describe('arena environment layout (R3F)', () => {
  test('uses only reviewed environment keys with matching categories', () => {
    for (const placement of layout) {
      expect(ENVIRONMENT_KEYS).toContain(placement.key);
      const slot = [...Object.values(TILE_ASSET_SLOTS), ...Object.values(MAP_PROP_ASSET_SLOTS)].find((s) => s.key === placement.key)!;
      expect(getVisualAssetRuntimeCategoryForSlot(slot)).toBe(placement.category);
    }
    expect(new Set(layout.map((p) => p.key))).toEqual(new Set(ENVIRONMENT_KEYS));
  });

  test('stays beneath gameplay and keeps a restrained object count', () => {
    expect(layout.length).toBeLessThanOrEqual(80);
    for (const placement of layout) {
      expect(placement.depth).toBeLessThan(0);
      expect(placement.alpha).toBeLessThanOrEqual(0.85);
    }
    expect(Object.values(ARENA_ENVIRONMENT_DEPTH).every((depth) => depth < 0)).toBe(true);
  });

  test('keeps the central combat space clear and in-bounds props near the walls', () => {
    const cx = WORLD_WIDTH / 2;
    const cy = WORLD_HEIGHT / 2;
    for (const placement of layout.filter((p) => isInBounds(p.x, p.y))) {
      expect(Math.hypot(placement.x - cx, placement.y - cy)).toBeGreaterThanOrEqual(ARENA_CENTER_CLEAR_RADIUS);
      if (placement.category === 'mapProps') {
        const wallDistance = Math.min(placement.x, placement.y, WORLD_WIDTH - placement.x, WORLD_HEIGHT - placement.y);
        expect(wallDistance).toBeGreaterThanOrEqual(ARENA_PROP_EDGE_BAND.min);
        expect(wallDistance).toBeLessThanOrEqual(ARENA_PROP_EDGE_BAND.max);
      }
    }
    expect(layout.filter((p) => isInBounds(p.x, p.y) && p.category === 'mapProps').length).toBeLessThanOrEqual(12);
  });

  test('places landmark props and boundary pebbles outside the playable border only', () => {
    for (const placement of layout.filter((p) => p.key === 'prop-risk-altar' || p.key === 'prop-tiny-shrine' || p.key === 'tile-boundary-pebble')) {
      expect(isInBounds(placement.x, placement.y)).toBe(false);
    }
  });

  test('is deterministic across runs', () => {
    expect(buildArenaEnvironmentLayout(WORLD_WIDTH, WORLD_HEIGHT)).toEqual(layout);
  });
});
