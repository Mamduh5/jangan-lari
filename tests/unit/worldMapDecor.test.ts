import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  BUSHES,
  CLEARING_BLOB,
  DIRT_PATHS,
  EDGE_PEBBLES,
  FLOWERS,
  GROUND_PATCHES,
  LANDMARKS,
  TUFTS,
} from '../../src/game/world/worldMapDecor';
import {
  CENTRAL_CLEARING_RADIUS,
  PLAYER_START,
  ROCK_CLUSTERS,
  SOLID_ROCKS,
  WORLD_CENTER,
  isInsideWorldOutline,
} from '../../src/game/world/worldMap';
import { GAME_HEIGHT, GAME_WIDTH } from '../../src/game/config/worldBalance';
import { getVisualAssetSlotByKey } from '../../src/game/utils/assetResolver';
import { isReviewedRuntimeSprite } from '../../src/game/config/visualAssetRuntimeConfig';
import { PRELOAD_VISUAL_ASSET_KEYS } from '../../src/game/data/presentVisualAssets';

const view = {
  left: PLAYER_START.x - GAME_WIDTH / 2,
  right: PLAYER_START.x + GAME_WIDTH / 2,
  top: PLAYER_START.y - GAME_HEIGHT / 2,
  bottom: PLAYER_START.y + GAME_HEIGHT / 2,
};
const inStartView = (x: number, y: number, half: number) =>
  x - half >= view.left && x + half <= view.right && y - half >= view.top && y + half <= view.bottom;

describe('world decoration layout', () => {
  test('uses only existing, approved, preloaded PNG assets', () => {
    for (const key of ['prop-wobbly-rock', 'prop-soft-bush', 'tile-boundary-pebble']) {
      const slot = getVisualAssetSlotByKey(key)!;
      expect(existsSync(resolve(process.cwd(), 'public', slot.path))).toBe(true);
      expect(isReviewedRuntimeSprite(slot)).toBe(true);
      expect(PRELOAD_VISUAL_ASSET_KEYS.has(key)).toBe(true);
    }
  });

  test('starting view shows solid rocks, bushes, and the open clearing', () => {
    const visibleRocks = SOLID_ROCKS.filter((rock) => inStartView(rock.x, rock.y, rock.radius));
    const visibleBushes = BUSHES.filter((bush) => inStartView(bush.x, bush.y, bush.size / 2));
    expect(visibleRocks.length).toBeGreaterThanOrEqual(4);
    expect(visibleBushes.length).toBeGreaterThanOrEqual(5);
    expect(CLEARING_BLOB.some((p) => inStartView(p.x, p.y, 0))).toBe(true);
    const clearingWidth = Math.max(...CLEARING_BLOB.map((p) => p.x)) - Math.min(...CLEARING_BLOB.map((p) => p.x));
    expect(clearingWidth).toBeGreaterThan(CENTRAL_CLEARING_RADIUS * 3.5);
  });

  test('decorations stay on the island and out of the central clearing', () => {
    const items = [...BUSHES.map((b) => ({ x: b.x, y: b.y })), ...FLOWERS, ...TUFTS, ...EDGE_PEBBLES, ...LANDMARKS];
    for (const item of items) {
      expect(isInsideWorldOutline(item.x, item.y)).toBe(true);
    }
    for (const bush of BUSHES) {
      expect(Math.hypot(bush.x - WORLD_CENTER.x, bush.y - WORLD_CENTER.y)).toBeGreaterThan(CENTRAL_CLEARING_RADIUS);
    }
  });

  test('landmarks are decoration only and never overlap solid rocks', () => {
    expect(LANDMARKS.length).toBeGreaterThanOrEqual(8);
    expect(new Set(LANDMARKS.map((l) => l.kind)).size).toBe(LANDMARKS.length);
    for (const landmark of LANDMARKS) {
      for (const rock of SOLID_ROCKS) {
        expect(Math.hypot(landmark.x - rock.x, landmark.y - rock.y)).toBeGreaterThan(rock.radius + landmark.size * 0.25);
      }
    }
  });

  test('rocks are clustered with intent, not scattered singly', () => {
    expect(ROCK_CLUSTERS.length).toBeGreaterThanOrEqual(12);
    const multi = ROCK_CLUSTERS.filter((c) => c.members.length >= 2);
    expect(multi.length / ROCK_CLUSTERS.length).toBeGreaterThan(0.7);
    // Every bush hugging a cluster sits near some rock member.
    const nearRock = BUSHES.filter((bush) => SOLID_ROCKS.some((rock) => Math.hypot(bush.x - rock.x, bush.y - rock.y) < rock.radius + 100));
    expect(nearRock.length).toBeGreaterThanOrEqual(ROCK_CLUSTERS.length * 2);
  });

  test('paths radiate from the clearing to the outer lobes and regions are varied', () => {
    expect(DIRT_PATHS.length).toBeGreaterThanOrEqual(6);
    for (const path of DIRT_PATHS) {
      const start = path.points[0];
      const end = path.points[path.points.length - 1];
      expect(Math.hypot(start.x - WORLD_CENTER.x, start.y - WORLD_CENTER.y)).toBeLessThan(5);
      expect(isInsideWorldOutline(end.x, end.y)).toBe(true);
      expect(Math.hypot(end.x - WORLD_CENTER.x, end.y - WORLD_CENTER.y)).toBeGreaterThan(1200);
    }
    expect(new Set(GROUND_PATCHES.map((p) => p.kind))).toEqual(new Set(['dark', 'light', 'mud']));
  });

  test('stays within a mobile-friendly object budget', () => {
    const sprites = SOLID_ROCKS.length + BUSHES.length + EDGE_PEBBLES.length;
    expect(sprites).toBeLessThanOrEqual(170);
  });
});
