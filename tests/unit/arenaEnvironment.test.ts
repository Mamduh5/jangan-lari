import type Phaser from 'phaser';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ARENA_ENVIRONMENT_DEPTH,
  ARENA_PROP_MIN_SPACING,
  ARENA_PROP_WALL_MARGIN,
  ARENA_SPAWN_CLEAR_RADIUS,
  buildArenaEnvironmentLayout,
  type ArenaDecorationPlacement,
} from '../../src/game/config/arenaEnvironmentLayout';
import {
  VISUAL_ASSET_RUNTIME_CONFIG,
  getVisualAssetRuntimeCategoryForSlot,
  isReviewedRuntimeSprite,
} from '../../src/game/config/visualAssetRuntimeConfig';
import { MAP_PROP_ASSET_SLOTS, TILE_ASSET_SLOTS } from '../../src/game/data/assetSlots';
import { PRELOAD_VISUAL_ASSET_KEYS, RUNTIME_PRELOAD_VISUAL_ASSET_SLOTS } from '../../src/game/data/presentVisualAssets';
import { getVisualAssetSlotByKey, shouldUseVisualAsset } from '../../src/game/utils/assetResolver';
import { renderArenaEnvironment, type ArenaEnvironmentScene } from '../../src/game/utils/arenaEnvironmentRenderer';
import {
  CAMERA_OVERSCROLL_PADDING_X,
  CAMERA_OVERSCROLL_PADDING_Y,
  GAME_HEIGHT,
  GAME_WIDTH,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../../src/game/config/worldBalance';

const ENVIRONMENT_KEYS = [
  'tile-ground-blob',
  'tile-boundary-pebble',
  'prop-soft-bush',
  'prop-wobbly-rock',
  'prop-risk-altar',
  'prop-tiny-shrine',
];
const ROCK_OR_BUSH = new Set(['prop-soft-bush', 'prop-wobbly-rock']);

const layout = buildArenaEnvironmentLayout(WORLD_WIDTH, WORLD_HEIGHT);
const isInBounds = (x: number, y: number) => x >= 0 && x <= WORLD_WIDTH && y >= 0 && y <= WORLD_HEIGHT;
const inArenaProps = layout.filter((p) => ROCK_OR_BUSH.has(p.key) && isInBounds(p.x, p.y));

// Real camera setup: zoom 1, viewport GAME_WIDTH x GAME_HEIGHT, following a player
// spawned at the world center, clamped to the overscroll-padded camera bounds.
const spawn = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const startScrollX = clamp(spawn.x - GAME_WIDTH / 2, -CAMERA_OVERSCROLL_PADDING_X, WORLD_WIDTH + CAMERA_OVERSCROLL_PADDING_X - GAME_WIDTH);
const startScrollY = clamp(spawn.y - GAME_HEIGHT / 2, -CAMERA_OVERSCROLL_PADDING_Y, WORLD_HEIGHT + CAMERA_OVERSCROLL_PADDING_Y - GAME_HEIGHT);
const fullyInStartingView = (p: ArenaDecorationPlacement) =>
  p.x - p.displaySize / 2 >= startScrollX
  && p.x + p.displaySize / 2 <= startScrollX + GAME_WIDTH
  && p.y - p.displaySize / 2 >= startScrollY
  && p.y + p.displaySize / 2 <= startScrollY + GAME_HEIGHT;

function createMockScene(textureExists: (key: string) => boolean) {
  const images: Array<Record<string, unknown>> = [];
  const scene = {
    textures: { exists: textureExists },
    add: {
      image: (x: number, y: number, key: string) => {
        const image: Record<string, unknown> = { x, y, key };
        const chain = (field: string) => (...args: unknown[]) => {
          image[field] = args.length === 1 ? args[0] : args;
          return image;
        };
        Object.assign(image, {
          setDisplaySize: chain('displaySize'),
          setRotation: chain('rotation'),
          setFlipX: chain('flipX'),
          setAlpha: chain('alpha'),
          setDepth: chain('depth'),
          setTint: chain('tint'),
        });
        images.push(image);
        return image;
      },
    },
  } as unknown as ArenaEnvironmentScene;
  return { scene, images };
}

describe('arena environment assets (R3F)', () => {
  test('all six environment keys resolve to committed PNG files', () => {
    for (const key of ENVIRONMENT_KEYS) {
      const slot = getVisualAssetSlotByKey(key);
      expect(slot).not.toBeNull();
      expect(slot!.path.endsWith('.png')).toBe(true);
      expect(existsSync(resolve(process.cwd(), 'public', slot!.path))).toBe(true);
    }
  });

  test('are individually approved and eligible for preloading while broad categories stay disabled', () => {
    expect(VISUAL_ASSET_RUNTIME_CONFIG.tiles).toBe(false);
    expect(VISUAL_ASSET_RUNTIME_CONFIG.mapProps).toBe(false);
    const preloadKeys = new Set(RUNTIME_PRELOAD_VISUAL_ASSET_SLOTS.map((slot) => slot.key));
    for (const slot of [...Object.values(TILE_ASSET_SLOTS), ...Object.values(MAP_PROP_ASSET_SLOTS)]) {
      expect(isReviewedRuntimeSprite(slot)).toBe(true);
      expect(PRELOAD_VISUAL_ASSET_KEYS.has(slot.key)).toBe(true);
      expect(preloadKeys.has(slot.key)).toBe(true);
    }
    expect(isReviewedRuntimeSprite({ key: 'tile-ground-blob', kind: 'map-prop' })).toBe(false);
  });
});

describe('arena environment rendering (R3F-B)', () => {
  test('creates an image per placement when textures are loaded', () => {
    const { scene, images } = createMockScene(() => true);
    const rendered = renderArenaEnvironment(scene, layout);
    expect(rendered).toHaveLength(layout.length);
    expect(images).toHaveLength(layout.length);
    for (const [index, image] of images.entries()) {
      expect(image.key).toBe(layout[index].key);
      expect(image.alpha).toBe(layout[index].alpha);
      expect(image.depth).toBe(layout[index].depth);
      expect(image.displaySize).toEqual([layout[index].displaySize, layout[index].displaySize]);
    }
    const visibleRendered = images.filter((image) => ROCK_OR_BUSH.has(image.key as string)
      && fullyInStartingView(layout.find((p) => p.x === image.x && p.y === image.y && p.key === image.key)!));
    expect(visibleRendered.length).toBeGreaterThanOrEqual(6);
  });

  test('falls back safely (renders nothing) when textures are missing or lookup throws', () => {
    expect(renderArenaEnvironment(createMockScene(() => false).scene, layout)).toHaveLength(0);
    const throwing = createMockScene(() => { throw new Error('texture manager unavailable'); });
    expect(renderArenaEnvironment(throwing.scene, layout)).toHaveLength(0);
    const partial = createMockScene((key) => key !== 'prop-soft-bush');
    const rendered = renderArenaEnvironment(partial.scene, layout);
    expect(partial.images.some((image) => image.key === 'prop-soft-bush')).toBe(false);
    expect(rendered.length).toBe(layout.filter((p) => p.key !== 'prop-soft-bush').length);
  });

  test('rejects category mismatches', () => {
    const loaded = { textures: { exists: () => true } } as unknown as Pick<Phaser.Scene, 'textures'>;
    for (const placement of layout) {
      expect(shouldUseVisualAsset(loaded, 'effectSprites', placement.key)).toBe(false);
    }
  });
});

describe('arena environment starting view (R3F-B)', () => {
  const visible = inArenaProps.filter(fullyInStartingView);

  test('shows at least six recognizable rocks/bushes in the initial camera viewport', () => {
    expect(startScrollX).toBe(800);
    expect(startScrollY).toBe(740);
    expect(visible.length).toBeGreaterThanOrEqual(6);
    expect(visible.some((p) => p.key === 'prop-soft-bush')).toBe(true);
    expect(visible.some((p) => p.key === 'prop-wobbly-rock')).toBe(true);
  });

  test('visible props meet readability thresholds for size and opacity', () => {
    for (const placement of visible) {
      expect(placement.displaySize).toBeGreaterThanOrEqual(64);
      expect(placement.displaySize).toBeLessThanOrEqual(90);
      expect(placement.alpha).toBeGreaterThanOrEqual(0.7);
      expect(placement.alpha).toBeLessThanOrEqual(0.9);
    }
  });

  test('keeps the spawn point clear of every decoration', () => {
    for (const placement of layout) {
      expect(Math.hypot(placement.x - spawn.x, placement.y - spawn.y)).toBeGreaterThanOrEqual(ARENA_SPAWN_CLEAR_RADIUS);
    }
  });
});

describe('arena environment layout (R3F-B)', () => {
  test('uses only reviewed environment keys with matching categories', () => {
    for (const placement of layout) {
      expect(ENVIRONMENT_KEYS).toContain(placement.key);
      expect(getVisualAssetRuntimeCategoryForSlot(getVisualAssetSlotByKey(placement.key)!)).toBe(placement.category);
    }
    expect(new Set(layout.map((p) => p.key))).toEqual(new Set(ENVIRONMENT_KEYS));
  });

  test('distributes rocks/bushes across most of the arena, not just its walls', () => {
    const cells = new Set(inArenaProps.map((p) => `${Math.floor((p.x / WORLD_WIDTH) * 3)}:${Math.floor((p.y / WORLD_HEIGHT) * 3)}`));
    expect(cells.size).toBe(9);
    const interior = inArenaProps.filter((p) => Math.min(p.x, p.y, WORLD_WIDTH - p.x, WORLD_HEIGHT - p.y) > 400);
    expect(interior.length).toBeGreaterThanOrEqual(8);
  });

  test('keeps rocks/bushes spaced for readability, off the walls, and not in straight lines', () => {
    for (const [i, a] of inArenaProps.entries()) {
      expect(Math.min(a.x, a.y, WORLD_WIDTH - a.x, WORLD_HEIGHT - a.y)).toBeGreaterThanOrEqual(ARENA_PROP_WALL_MARGIN);
      for (const b of inArenaProps.slice(i + 1)) {
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(ARENA_PROP_MIN_SPACING);
      }
    }
    // No more than two props share any row or column (within 10 units).
    for (const p of inArenaProps) {
      expect(inArenaProps.filter((q) => Math.abs(q.y - p.y) <= 10).length).toBeLessThanOrEqual(2);
      expect(inArenaProps.filter((q) => Math.abs(q.x - p.x) <= 10).length).toBeLessThanOrEqual(2);
    }
  });

  test('stays beneath gameplay with a restrained object count', () => {
    expect(layout.length).toBeLessThanOrEqual(100);
    expect(inArenaProps.length).toBeLessThanOrEqual(30);
    for (const placement of layout) {
      expect(placement.depth).toBeLessThan(0);
      expect(placement.alpha).toBeLessThanOrEqual(0.9);
    }
    expect(Object.values(ARENA_ENVIRONMENT_DEPTH).every((depth) => depth < 0)).toBe(true);
  });

  test('ground patches are noticeable but subdued', () => {
    const blobs = layout.filter((p) => p.key === 'tile-ground-blob');
    expect(blobs.length).toBeGreaterThanOrEqual(10);
    for (const blob of blobs) {
      expect(blob.alpha).toBeGreaterThan(0.12);
      expect(blob.alpha).toBeLessThanOrEqual(0.3);
    }
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

describe('arena environment is decorative only (R3F-B)', () => {
  test('placements and renderer never touch physics, and world size is unchanged', () => {
    expect(WORLD_WIDTH).toBe(3200);
    expect(WORLD_HEIGHT).toBe(2200);
    for (const placement of layout) {
      expect(Object.keys(placement).sort()).toEqual(
        ['alpha', 'category', 'depth', 'displaySize', 'flipX', 'key', 'rotation', 'x', 'y', ...(placement.tint !== undefined ? ['tint'] : [])].sort(),
      );
    }
    const sources = [
      'src/game/utils/arenaEnvironmentRenderer.ts',
      'src/game/config/arenaEnvironmentLayout.ts',
    ].map((file) => readFileSync(resolve(process.cwd(), file), 'utf8'));
    const physicsApi = /\.physics\.|setImmovable|staticGroup|\.body\b|addCollider|\.collider\(|\.overlap\(/;
    for (const source of sources) {
      expect(source).not.toMatch(physicsApi);
    }
    const runScene = readFileSync(resolve(process.cwd(), 'src/game/scenes/RunScene.ts'), 'utf8');
    const method = runScene.slice(runScene.indexOf('private drawArenaEnvironment(): void {'));
    const body = method.slice(0, method.indexOf('\n  }') + 4);
    expect(body).toContain('renderArenaEnvironment(this, buildArenaEnvironmentLayout(WORLD_WIDTH, WORLD_HEIGHT))');
    expect(body).not.toMatch(physicsApi);
  });
});
