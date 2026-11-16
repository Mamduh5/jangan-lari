import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  OUTLINE_EDGE_INSET,
  OUTLINE_SEMI_AXIS,
  PLAYER_START,
  ROCK_CLUSTERS,
  ROCK_COLLISION_RADIUS_RATIO,
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
  moveAlongWorldMap,
  outlineAnchor,
  resolveWalkable,
  snapToWalkable,
  steerVelocityAroundObstacles,
  type ObstacleSteeringState,
} from '../../src/game/world/worldMap';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../../src/game/config/worldBalance';
import { BREAKOUT_PULSE_KNOCKBACK } from '../../src/game/config/playerBalance';
import { CHARGER_DASH_SPEED } from '../../src/game/config/enemyBehaviorBalance';
import { ENEMY_ARCHETYPES } from '../../src/game/data/enemies';
import { HEROES } from '../../src/game/data/heroes';

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

function heroRadius(heroId: keyof typeof HEROES): number {
  const size = Math.max(20, Math.round(HEROES[heroId].appearance.size * 0.72));
  return Math.max(8, size * 0.5);
}

function enemyRadius(archetypeId: keyof typeof ENEMY_ARCHETYPES): number {
  const size = Math.max(16, ENEMY_ARCHETYPES[archetypeId].size - 6);
  return Math.max(8, size * 0.5);
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

describe('walkability and local resolution', () => {
  test('leaves walkable points untouched', () => {
    const result = resolveWalkable(PLAYER_START.x + 100, PLAYER_START.y + 50, 30);
    expect(result.blocked).toBe(false);
    expect(result.x).toBe(PLAYER_START.x + 100);
    expect(result.y).toBe(PLAYER_START.y + 50);
  });

  test('pushes entities out of the void back inside the outline', () => {
    for (const point of [
      { x: 10, y: 10 },
      { x: WORLD_WIDTH - 10, y: 20 },
      { x: 40, y: WORLD_HEIGHT - 40 },
      { x: WORLD_CENTER.x, y: WORLD_HEIGHT - 30 },
    ]) {
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

  test('solid rocks block movement for any entity size and resolve cleanly locally', () => {
    for (const rock of SOLID_ROCKS) {
      for (const radius of [16, 30, 52]) {
        const inside = resolveWalkable(rock.x + 3, rock.y + 2, radius);
        expect(inside.blocked).toBe(true);
        expect(isWalkable(inside.x, inside.y, radius)).toBe(true);
        for (const other of SOLID_ROCKS) {
          expect(Math.hypot(inside.x - other.x, inside.y - other.y)).toBeGreaterThanOrEqual(other.radius + radius - 0.1);
        }
        expect(Math.hypot(inside.x - rock.x, inside.y - rock.y)).toBeLessThan(rock.radius + radius + 160);
      }
      expect(Math.hypot(rock.x - WORLD_CENTER.x, rock.y - WORLD_CENTER.y)).toBeGreaterThan(rock.radius);
    }
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
        return {
          x: rock.x + Math.cos(angle) * (rock.radius + 2 * WALK_RADIUS_LARGE),
          y: rock.y + Math.sin(angle) * (rock.radius + 2 * WALK_RADIUS_LARGE),
        };
      });
      const walkableAround = ring.filter((p) => isWalkable(p.x, p.y, WALK_RADIUS_STANDARD)).length;
      expect(walkableAround).toBeGreaterThanOrEqual(6);
    }
  });
});

describe('continuous movement collision and no-teleport guarantees (R3F-E)', () => {
  test('1. player moving directly into a rock stops at its near edge', () => {
    const r = heroRadius('runner');
    const rock = ROCK_CLUSTERS.find((c) => c.id === 'start-north')!.members[0];
    const rockCircle = SOLID_ROCKS.find((s) => s.x === rock.x && s.y === rock.y)!;
    const startX = rockCircle.x;
    let y = rockCircle.y + rockCircle.radius + r + 140;

    for (let step = 0; step < 90; step += 1) {
      const moved = moveAlongWorldMap(startX, y, startX, y - 4.5, r);
      y = moved.y;
      expect(isWalkable(moved.x, moved.y, r)).toBe(true);
    }

    const expectedNearEdgeY = rockCircle.y + rockCircle.radius + r;
    expect(y).toBeGreaterThanOrEqual(expectedNearEdgeY - 0.05);
    expect(y).toBeLessThanOrEqual(expectedNearEdgeY + 0.5);
  });

  test('2. player sliding diagonally along a rock remains smooth and clears it', () => {
    const r = heroRadius('runner');
    const loneCluster = ROCK_CLUSTERS.find((c) => c.id === 'start-north')!;
    const rock = SOLID_ROCKS.find((s) => s.x === loneCluster.x && s.y === loneCluster.y)!;
    let x = rock.x - rock.radius - r - 60;
    let y = rock.y - 18;
    const minXs: number[] = [];

    for (let frame = 0; frame < 110; frame += 1) {
      const next = moveAlongWorldMap(x, y, x + 3.8, y + 2.4, r);
      const distMoved = Math.hypot(next.x - x, next.y - y);
      expect(distMoved).toBeLessThanOrEqual(Math.hypot(3.8, 2.4) + 1e-4);
      expect(Math.hypot(next.x - rock.x, next.y - rock.y)).toBeGreaterThanOrEqual(rock.radius + r - 1e-4);
      expect(next.x).toBeGreaterThanOrEqual(x - 0.05);
      x = next.x;
      y = next.y;
      minXs.push(x);
    }

    expect(x).toBeGreaterThan(rock.x + rock.radius);
    expect(minXs.length).toBe(110);
  });

  test('3. a large single movement step cannot tunnel through a rock', () => {
    const r = heroRadius('shade');
    let testedHeadOn = 0;
    let testedSlide = 0;

    for (const rock of SOLID_ROCKS) {
      for (const [dirX, dirY] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const startX = rock.x - dirX * (rock.radius + r + 80);
        const startY = rock.y - dirY * (rock.radius + r + 80);
        if (!isWalkable(startX, startY, r)) {
          continue;
        }
        testedHeadOn += 1;
        const targetX = rock.x + dirX * (rock.radius + r + 350);
        const targetY = rock.y + dirY * (rock.radius + r + 350);

        const noSlide = moveAlongWorldMap(startX, startY, targetX, targetY, r, { allowSlide: false });
        expect(noSlide.blocked).toBe(true);
        const noSlideProgress = (noSlide.x - rock.x) * dirX + (noSlide.y - rock.y) * dirY;
        expect(noSlideProgress).toBeLessThanOrEqual(-(rock.radius + r) + 0.1);
        expect(isWalkable(noSlide.x, noSlide.y, r)).toBe(true);

        const withSlide = moveAlongWorldMap(startX, startY, targetX, targetY, r);
        expect(withSlide.blocked).toBe(true);
        expect(isWalkable(withSlide.x, withSlide.y, r)).toBe(true);
        // Only rocks whose first contact is strictly perpendicular (no sibling shoulder deflecting sideways)
        // stay on the centerline and stop at the near edge; otherwise the mover must go around, never through.
        const lateralShift = Math.abs((withSlide.x - startX) * -dirY + (withSlide.y - startY) * dirX);
        if (lateralShift < 1) {
          testedSlide += 1;
          const slideProgress = (withSlide.x - rock.x) * dirX + (withSlide.y - rock.y) * dirY;
          expect(slideProgress).toBeLessThanOrEqual(-(rock.radius + r) + 0.1);
        } else {
          expect(Math.hypot(withSlide.x - rock.x, withSlide.y - rock.y)).toBeGreaterThanOrEqual(rock.radius + r - 0.05);
        }
      }
    }
    expect(testedHeadOn).toBeGreaterThanOrEqual(SOLID_ROCKS.length * 2);
    expect(testedSlide).toBeGreaterThanOrEqual(SOLID_ROCKS.length);
  });

  test('4. a fast dash (including low-FPS frame spikes) cannot pass through a rock or boundary', () => {
    const chargerR = enemyRadius('crusher');
    const riftbladeR = enemyRadius('riftblade');
    const lone = ROCK_CLUSTERS.find((c) => c.id === 'start-north')!;
    const rock = SOLID_ROCKS.find((s) => s.x === lone.x && s.y === lone.y)!;

    // Simulate 150ms low-FPS steps at CHARGER_DASH_SPEED (760 px/s -> 114 px/step) straight across rock.
    let cx = rock.x - rock.radius - chargerR - 40;
    const cy = rock.y;
    for (let tick = 0; tick < 8; tick += 1) {
      const step = CHARGER_DASH_SPEED * 0.15;
      const moved = moveAlongWorldMap(cx, cy, cx + step, cy, chargerR);
      cx = moved.x;
      expect(cx).toBeLessThanOrEqual(rock.x - rock.radius - chargerR + 0.1);
      expect(isWalkable(cx, cy, chargerR)).toBe(true);
    }

    // Extreme single-step dash across the island outline at a lobe and bay.
    for (const deg of [-140, -118, 22, 90, 162]) {
      const inside = outlineAnchor(deg, 0.88);
      const outside = outlineAnchor(deg, 1.35);
      const moved = moveAlongWorldMap(inside.x, inside.y, outside.x, outside.y, riftbladeR);
      expect(moved.blocked).toBe(true);
      expect(isInsideWorldOutline(moved.x, moved.y)).toBe(true);
      expect(isWalkable(moved.x, moved.y, riftbladeR)).toBe(true);
    }
  });

  test('5. an entity between overlapping collision circles cannot teleport across the map', () => {
    const r = heroRadius('runner');
    const overlappingClusters = ROCK_CLUSTERS.filter((c) => c.members.length >= 2);

    for (const cluster of overlappingClusters) {
      const m0 = cluster.members[0];
      const m1 = cluster.members[1];
      const c0 = SOLID_ROCKS.find((s) => s.x === m0.x && s.y === m0.y)!;
      const c1 = SOLID_ROCKS.find((s) => s.x === m1.x && s.y === m1.y)!;
      const midX = (c0.x + c1.x) * 0.5;
      const midY = (c0.y + c1.y) * 0.5;

      const resolved = resolveWalkable(midX, midY, r);
      expect(isWalkable(resolved.x, resolved.y, r)).toBe(true);
      // Must stay right on this cluster's exterior notch, nowhere near WORLD_CENTER or other clusters.
      expect(Math.hypot(resolved.x - midX, resolved.y - midY)).toBeLessThan(Math.max(c0.radius, c1.radius) + r + 25);

      const moved = moveAlongWorldMap(midX, midY, midX + 30, midY - 20, r);
      expect(isWalkable(moved.x, moved.y, r)).toBe(true);
      expect(Math.hypot(moved.x - midX, moved.y - midY)).toBeLessThan(Math.max(c0.radius, c1.radius) + r + 60);
    }
  });

  test('6. collision correction never causes arbitrary large displacement from valid positions', () => {
    const random = seeded(9001);
    const r = heroRadius('vanguard');
    let checked = 0;

    for (let i = 0; i < 600 && checked < 250; i += 1) {
      const startX = 200 + random() * (WORLD_WIDTH - 400);
      const startY = 200 + random() * (WORLD_HEIGHT - 400);
      if (!isWalkable(startX, startY, r)) {
        continue;
      }
      checked += 1;
      const angle = random() * Math.PI * 2;
      const dist = 5 + random() * 450;
      const targetX = startX + Math.cos(angle) * dist;
      const targetY = startY + Math.sin(angle) * dist;
      const moved = moveAlongWorldMap(startX, startY, targetX, targetY, r);

      expect(isWalkable(moved.x, moved.y, r)).toBe(true);
      expect(Math.hypot(moved.x - startX, moved.y - startY)).toBeLessThanOrEqual(dist + 0.05);
    }
    expect(checked).toBe(250);
  });

  test('7. repeated contact with a rock or cluster crease does not cause jitter or oscillation', () => {
    const r = heroRadius('runner');
    const bigCluster = ROCK_CLUSTERS.find((c) => c.id === 'start-west')!;
    const c0 = SOLID_ROCKS.find((s) => s.x === bigCluster.members[0].x && s.y === bigCluster.members[0].y)!;
    const c1 = SOLID_ROCKS.find((s) => s.x === bigCluster.members[1].x && s.y === bigCluster.members[1].y)!;

    // Push straight into the notch between overlapping circles c0 and c1 from outside.
    const dx = c1.x - c0.x;
    const dy = c1.y - c0.y;
    const len = Math.hypot(dx, dy);
    const nx = -dy / len;
    const ny = dx / len;
    const notchStart = { x: (c0.x + c1.x) * 0.5 + nx * 190, y: (c0.y + c1.y) * 0.5 + ny * 190 };
    const pushDir = { x: -nx * 4.5, y: -ny * 4.5 };

    let x = notchStart.x;
    let y = notchStart.y;
    const trail: Array<{ x: number; y: number }> = [];
    for (let frame = 0; frame < 140; frame += 1) {
      const moved = moveAlongWorldMap(x, y, x + pushDir.x, y + pushDir.y, r);
      x = moved.x;
      y = moved.y;
      trail.push({ x, y });
      expect(isWalkable(x, y, r)).toBe(true);
    }

    // Once settled into the crease, consecutive frames must not jitter back and forth.
    for (let frame = 90; frame < trail.length; frame += 1) {
      const delta = Math.hypot(trail[frame].x - trail[frame - 1].x, trail[frame].y - trail[frame - 1].y);
      expect(delta).toBeLessThan(0.05);
    }
  });

  test('8. irregular boundary concavities do not cause long-distance snapping and allow smooth sliding', () => {
    const r = heroRadius('runner');
    for (const bayDeg of [-118, -62, 22, 90, 118, 162]) {
      const safeStart = outlineAnchor(bayDeg, 0.85);
      const bayEdge = outlineAnchor(bayDeg, 1);
      const resolved = resolveWalkable(bayEdge.x, bayEdge.y, r);
      expect(isWalkable(resolved.x, resolved.y, r)).toBe(true);
      expect(Math.hypot(resolved.x - bayEdge.x, resolved.y - bayEdge.y)).toBeLessThan(r + OUTLINE_EDGE_INSET + 45);

      let x = safeStart.x;
      let y = safeStart.y;
      const outDirX = (bayEdge.x - safeStart.x) / Math.hypot(bayEdge.x - safeStart.x, bayEdge.y - safeStart.y);
      const outDirY = (bayEdge.y - safeStart.y) / Math.hypot(bayEdge.x - safeStart.x, bayEdge.y - safeStart.y);
      // Push diagonally outward + tangentially along the concave bay.
      const tangX = -outDirY;
      const tangY = outDirX;
      for (let step = 0; step < 50; step += 1) {
        const vx = (outDirX * 0.7 + tangX * 0.7) * 4;
        const vy = (outDirY * 0.7 + tangY * 0.7) * 4;
        const moved = moveAlongWorldMap(x, y, x + vx, y + vy, r);
        expect(Math.hypot(moved.x - x, moved.y - y)).toBeLessThanOrEqual(Math.hypot(vx, vy) + 1e-3);
        expect(isWalkable(moved.x, moved.y, r)).toBe(true);
        x = moved.x;
        y = moved.y;
      }
      expect(Math.hypot(x - safeStart.x, y - safeStart.y)).toBeGreaterThan(80);
    }
  });

  test('9. enemy movement around rocks and cluster notches is stable without oscillating or getting stuck', () => {
    const bigCluster = ROCK_CLUSTERS.find((c) => c.id === 'start-west')!;
    const playerTarget = { x: bigCluster.x + 260, y: bigCluster.y - 30 };

    for (const archetypeId of ['scuttler', 'riftblade', 'behemoth'] as const) {
      const r = enemyRadius(archetypeId);
      const speed = ENEMY_ARCHETYPES[archetypeId].speed;
      // Start directly behind the multi-rock cluster relative to the player.
      let ex = bigCluster.x - 240;
      let ey = bigCluster.y + 40;
      expect(isWalkable(ex, ey, r)).toBe(true);

      const steeringState: ObstacleSteeringState = { detourSign: 0, detourUntilMs: 0 };
      const detourSignsSeen = new Set<-1 | 1>();
      const dtSec = 1 / 60;
      let reached = false;

      for (let frame = 0; frame < 420; frame += 1) {
        const dx = playerTarget.x - ex;
        const dy = playerTarget.y - ey;
        const dist = Math.hypot(dx, dy);
        if (dist < 40) {
          reached = true;
          break;
        }
        const rawVx = (dx / dist) * speed;
        const rawVy = (dy / dist) * speed;
        const steered = steerVelocityAroundObstacles({
          x: ex,
          y: ey,
          vx: rawVx,
          vy: rawVy,
          radius: r,
          targetX: playerTarget.x,
          targetY: playerTarget.y,
          nowMs: frame * 16.67,
          state: steeringState,
        });
        if (steeringState.detourSign !== 0) {
          detourSignsSeen.add(steeringState.detourSign);
        }

        const moved = moveAlongWorldMap(ex, ey, ex + steered.vx * dtSec, ey + steered.vy * dtSec, r);
        expect(isWalkable(moved.x, moved.y, r)).toBe(true);
        ex = moved.x;
        ey = moved.y;
      }

      expect(reached).toBe(true);
      // Never flipped back and forth between CW and CCW around the cluster.
      expect(detourSignsSeen.size).toBeLessThanOrEqual(1);
    }
  });

  test('10. player and boss retain correct collision clearance based on physical sizes', () => {
    const runnerR = heroRadius('runner');
    const vanguardR = heroRadius('vanguard');
    const bossR = enemyRadius('behemoth');
    const rock = SOLID_ROCKS[0];

    for (const r of [runnerR, vanguardR, bossR]) {
      const moved = moveAlongWorldMap(rock.x - rock.radius - r - 50, rock.y, rock.x, rock.y, r);
      const dist = Math.hypot(moved.x - rock.x, moved.y - rock.y);
      expect(dist).toBeGreaterThanOrEqual(rock.radius + r - 0.02);
      expect(dist).toBeLessThanOrEqual(rock.radius + r + 0.1);
    }

    // Boss size fits inside WALK_RADIUS_LARGE reachability and stays clear of outline.
    expect(bossR).toBeLessThan(WALK_RADIUS_LARGE);
    const edge = outlineAnchor(-140, 1);
    const bossAtEdge = moveAlongWorldMap(WORLD_CENTER.x, WORLD_CENTER.y, edge.x, edge.y, bossR);
    expect(isWalkable(bossAtEdge.x, bossAtEdge.y, bossR)).toBe(true);
  });

  test('11. knockback into rocks and boundaries remains bounded and never crosses obstacles', () => {
    const r = enemyRadius('scuttler');
    const rock = SOLID_ROCKS.find((s) => s.x === ROCK_CLUSTERS.find((c) => c.id === 'start-north')!.x)!;
    const startX = rock.x - rock.radius - r - 35;
    const startY = rock.y;
    const pushed = moveAlongWorldMap(startX, startY, startX + BREAKOUT_PULSE_KNOCKBACK, startY, r);

    expect(pushed.blocked).toBe(true);
    expect(pushed.x).toBeLessThanOrEqual(rock.x - rock.radius - r + 0.05);
    expect(Math.hypot(pushed.x - startX, pushed.y - startY)).toBeLessThanOrEqual(BREAKOUT_PULSE_KNOCKBACK + 0.05);
    expect(isWalkable(pushed.x, pushed.y, r)).toBe(true);

    const bayInside = outlineAnchor(90, 0.94);
    const bayOutward = outlineAnchor(90, 1.2);
    const dirLen = Math.hypot(bayOutward.x - bayInside.x, bayOutward.y - bayInside.y);
    const kx = bayInside.x + ((bayOutward.x - bayInside.x) / dirLen) * BREAKOUT_PULSE_KNOCKBACK;
    const ky = bayInside.y + ((bayOutward.y - bayInside.y) / dirLen) * BREAKOUT_PULSE_KNOCKBACK;
    const edgeKnock = moveAlongWorldMap(bayInside.x, bayInside.y, kx, ky, r);
    expect(isInsideWorldOutline(edgeKnock.x, edgeKnock.y)).toBe(true);
    expect(isWalkable(edgeKnock.x, edgeKnock.y, r)).toBe(true);
    expect(Math.hypot(edgeKnock.x - bayInside.x, edgeKnock.y - bayInside.y)).toBeLessThanOrEqual(BREAKOUT_PULSE_KNOCKBACK + 0.05);
  });

  test('12. visual rock footprints and collision footprints remain aligned', () => {
    expect(ROCK_COLLISION_RADIUS_RATIO).toBeGreaterThanOrEqual(0.36);
    expect(ROCK_COLLISION_RADIUS_RATIO).toBeLessThanOrEqual(0.42);
    const allMembers = ROCK_CLUSTERS.flatMap((c) => c.members);
    expect(SOLID_ROCKS).toHaveLength(allMembers.length);
    for (let i = 0; i < allMembers.length; i += 1) {
      expect(SOLID_ROCKS[i].x).toBe(allMembers[i].x);
      expect(SOLID_ROCKS[i].y).toBe(allMembers[i].y);
      expect(SOLID_ROCKS[i].radius).toBe(Math.round(allMembers[i].size * ROCK_COLLISION_RADIUS_RATIO));
    }
  });

  test('RunScene uses continuous movement and never uses spawn/center recovery during runtime movement', () => {
    const runSceneSource = readFileSync(resolve(process.cwd(), 'src/game/scenes/RunScene.ts'), 'utf8');
    expect(runSceneSource).toContain('moveAlongWorldMap');
    expect(runSceneSource).toContain('steerVelocityAroundObstacles');
    expect(runSceneSource).not.toContain('resolveWalkable(');
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
