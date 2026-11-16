import {
  OUTLINE_EDGE_INSET,
  OUTLINE_SEMI_AXIS,
  PLAYER_START,
  ROCK_CLUSTERS,
  SOLID_ROCKS,
  WALK_GRID_CELL,
  WALK_RADIUS_LARGE,
  WALK_RADIUS_STANDARD,
  WORLD_CENTER,
  WORLD_OUTLINE,
  getWalkGrid,
  isInsideWorldOutline,
  isReachablePoint,
  isReachableSpawn,
  isWalkable,
  outlineAnchor,
  resolveWalkable,
  snapToWalkable,
} from '../../src/game/world/worldMap';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../../src/game/config/worldBalance';

function polygonArea(points: ReadonlyArray<{ x: number; y: number }>): number {
  let sum = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    sum += points[j].x * points[i].y - points[i].x * points[j].y;
  }
  return Math.abs(sum) / 2;
}

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('world size', () => {
  test('is larger than the old 3200 x 2200 arena', () => {
    expect(WORLD_WIDTH).toBe(5200);
    expect(WORLD_HEIGHT).toBe(3700);
    expect(WORLD_WIDTH * WORLD_HEIGHT).toBeGreaterThan(3200 * 2200 * 2);
  });
});

describe('irregular playable outline', () => {
  test('fits inside the physics world with room to spare', () => {
    for (const point of WORLD_OUTLINE) {
      expect(point.x).toBeGreaterThanOrEqual(60);
      expect(point.x).toBeLessThanOrEqual(WORLD_WIDTH - 60);
      expect(point.y).toBeGreaterThanOrEqual(60);
      expect(point.y).toBeLessThanOrEqual(WORLD_HEIGHT - 60);
    }
  });

  test('is a blob, not a rectangle', () => {
    const area = polygonArea(WORLD_OUTLINE);
    const xs = WORLD_OUTLINE.map((p) => p.x);
    const ys = WORLD_OUTLINE.map((p) => p.y);
    const boxArea = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
    expect(area / boxArea).toBeLessThan(0.82);
    expect(area).toBeGreaterThan(3200 * 2200 * 1.4);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    for (const [x, y] of [[minX, minY], [maxX, minY], [minX, maxY], [maxX, maxY]]) {
      expect(isInsideWorldOutline(x, y)).toBe(false);
    }
    expect(isInsideWorldOutline(WORLD_CENTER.x, WORLD_CENTER.y)).toBe(true);
    expect(isInsideWorldOutline(0, 0)).toBe(false);
    expect(isInsideWorldOutline(WORLD_WIDTH, WORLD_HEIGHT)).toBe(false);
  });

  test('has bays (concave edges), so the silhouette is irregular', () => {
    const radii = Array.from({ length: 360 }, (_, deg) => {
      const p = outlineAnchor(deg, 1);
      return Math.hypot((p.x - WORLD_CENTER.x) / OUTLINE_SEMI_AXIS.x, (p.y - WORLD_CENTER.y) / OUTLINE_SEMI_AXIS.y);
    });
    expect(Math.max(...radii) - Math.min(...radii)).toBeGreaterThan(0.25);
  });

  test('keeps an open central combat area free of void and rocks', () => {
    expect(PLAYER_START).toEqual(WORLD_CENTER);
    expect(isWalkable(PLAYER_START.x, PLAYER_START.y, WALK_RADIUS_LARGE)).toBe(true);
    for (const rock of SOLID_ROCKS) {
      expect(Math.hypot(rock.x - WORLD_CENTER.x, rock.y - WORLD_CENTER.y) - rock.radius).toBeGreaterThanOrEqual(300);
    }
  });
});

describe('walkability and collision', () => {
  test('leaves walkable points untouched', () => {
    const result = resolveWalkable(PLAYER_START.x + 100, PLAYER_START.y + 50, 30);
    expect(result.blocked).toBe(false);
    expect(result.x).toBe(PLAYER_START.x + 100);
    expect(result.y).toBe(PLAYER_START.y + 50);
  });

  test('pushes entities out of the void back inside the outline', () => {
    for (const point of [{ x: 10, y: 10 }, { x: WORLD_WIDTH - 10, y: 20 }, { x: 40, y: WORLD_HEIGHT - 40 }, { x: WORLD_CENTER.x, y: WORLD_HEIGHT - 30 }]) {
      const result = resolveWalkable(point.x, point.y, 20);
      expect(result.blocked).toBe(true);
      expect(isInsideWorldOutline(result.x, result.y)).toBe(true);
      expect(isWalkable(result.x, result.y, 20)).toBe(true);
    }
  });

  test('keeps the entity edge clear of the outline', () => {
    const edge = outlineAnchor(0, 1);
    const result = resolveWalkable(edge.x + 5, edge.y, 25);
    expect(result.blocked).toBe(true);
    expect(Math.hypot(result.x - edge.x, result.y - edge.y)).toBeGreaterThanOrEqual(25 + OUTLINE_EDGE_INSET - 60);
    expect(result.x).toBeLessThan(edge.x);
  });

  test('solid rocks block movement for any entity size and push out radially', () => {
    for (const rock of SOLID_ROCKS) {
      for (const radius of [16, 30, 52]) {
        const inside = resolveWalkable(rock.x + 3, rock.y + 2, radius);
        expect(inside.blocked).toBe(true);
        for (const other of SOLID_ROCKS) {
          expect(Math.hypot(inside.x - other.x, inside.y - other.y)).toBeGreaterThanOrEqual(other.radius + radius - 6);
        }
      }
      expect(Math.hypot(rock.x - WORLD_CENTER.x, rock.y - WORLD_CENTER.y)).toBeGreaterThan(rock.radius);
    }
  });

  test('a mover heading straight into a rock is stopped at its surface', () => {
    const rock = SOLID_ROCKS[0];
    let x = rock.x - rock.radius - 200;
    const y = rock.y;
    for (let step = 0; step < 200; step += 1) {
      x += 6;
      const resolved = resolveWalkable(x, y, 20);
      x = resolved.x;
    }
    expect(x).toBeLessThanOrEqual(rock.x - rock.radius - 20 + 0.5);
  });

  test('keeps a gap wide enough for the largest enemies between separate rock clusters', () => {
    for (let a = 0; a < ROCK_CLUSTERS.length; a += 1) {
      for (let b = a + 1; b < ROCK_CLUSTERS.length; b += 1) {
        for (const ma of ROCK_CLUSTERS[a].members) {
          for (const mb of ROCK_CLUSTERS[b].members) {
            const ra = SOLID_ROCKS.find((r) => r.x === ma.x && r.y === ma.y)!.radius;
            const rb = SOLID_ROCKS.find((r) => r.x === mb.x && r.y === mb.y)!.radius;
            const gap = Math.hypot(ma.x - mb.x, ma.y - mb.y) - ra - rb;
            expect(gap).toBeGreaterThanOrEqual(2 * WALK_RADIUS_LARGE + 40);
          }
        }
      }
    }
  });

  test('every rock sits inside the outline with room to walk around it', () => {
    for (const rock of SOLID_ROCKS) {
      const ring = Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        return { x: rock.x + Math.cos(angle) * (rock.radius + 2 * WALK_RADIUS_LARGE), y: rock.y + Math.sin(angle) * (rock.radius + 2 * WALK_RADIUS_LARGE) };
      });
      const walkableAround = ring.filter((p) => isWalkable(p.x, p.y, WALK_RADIUS_STANDARD)).length;
      expect(walkableAround).toBeGreaterThanOrEqual(6);
    }
  });
});

describe('reachability and spawn safety', () => {
  test.each([WALK_RADIUS_STANDARD, WALK_RADIUS_LARGE])('has no unreachable pockets for radius %i', (radius) => {
    const grid = getWalkGrid(radius);
    let walkable = 0;
    let reachable = 0;
    for (let i = 0; i < grid.walkable.length; i += 1) {
      walkable += grid.walkable[i];
      reachable += grid.reachable[i];
    }
    expect(walkable).toBeGreaterThan(1000);
    expect(reachable).toBe(walkable);
    expect(reachable * WALK_GRID_CELL * WALK_GRID_CELL).toBeGreaterThan(3200 * 2200 * 1.2);
  });

  test('snapToWalkable always returns a reachable, rock-free, in-outline point', () => {
    const random = seeded(1234);
    for (let i = 0; i < 600; i += 1) {
      const x = random() * (WORLD_WIDTH + 400) - 200;
      const y = random() * (WORLD_HEIGHT + 400) - 200;
      for (const radius of [20, 40, 60]) {
        const snapped = snapToWalkable(x, y, radius);
        expect(isReachablePoint(snapped.x, snapped.y, radius > 40 ? WALK_RADIUS_LARGE : WALK_RADIUS_STANDARD)).toBe(true);
        expect(isInsideWorldOutline(snapped.x, snapped.y)).toBe(true);
        expect(isWalkable(snapped.x, snapped.y, radius)).toBe(true);
      }
    }
  });

  test('snapToWalkable leaves already-valid points alone and moves points in rocks the least', () => {
    const open = { x: WORLD_CENTER.x + 200, y: WORLD_CENTER.y - 100 };
    expect(snapToWalkable(open.x, open.y, 30)).toEqual(open);

    const rock = SOLID_ROCKS[0];
    const snapped = snapToWalkable(rock.x, rock.y, 30);
    expect(Math.hypot(snapped.x - rock.x, snapped.y - rock.y)).toBeLessThan(rock.radius + 200);
    expect(isWalkable(snapped.x, snapped.y, 30)).toBe(true);
  });

  test('spawn candidates at typical encounter distances from the start resolve safely', () => {
    for (const distance of [380, 420, 460, 520, 700]) {
      for (const angle of Array.from({ length: 24 }, (_, i) => (i / 24) * Math.PI * 2)) {
        const snapped = snapToWalkable(
          PLAYER_START.x + Math.cos(angle) * distance,
          PLAYER_START.y + Math.sin(angle) * distance,
          WALK_RADIUS_LARGE,
        );
        expect(isReachableSpawn(snapped.x, snapped.y)).toBe(true);
      }
    }
  });
});
