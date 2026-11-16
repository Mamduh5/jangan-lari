import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/worldBalance';

/**
 * R3F-D / R3F-E data-driven "weird world" map.
 *
 * The Phaser/physics world stays a rectangle (WORLD_WIDTH x WORLD_HEIGHT), but
 * the *playable* area is an irregular blob island defined by `WORLD_OUTLINE`.
 * Everything outside the outline is void, and large rocks (`SOLID_ROCKS`) are
 * solid circles.
 *
 * Runtime movement uses continuous swept-circle collision (`moveAlongWorldMap`)
 * with local surface sliding so entities never tunnel through obstacles and
 * never teleport toward the world center or across rocks. Spawn/debug helpers
 * (`snapToWalkable`) remain strictly separate from runtime movement.
 *
 * This module is pure (no Phaser) so geometry, collision, steering and spawn
 * safety are unit-testable.
 */

export interface Point {
  x: number;
  y: number;
}

export interface SolidCircle {
  x: number;
  y: number;
  radius: number;
}

export interface RockMember {
  x: number;
  y: number;
  /** Display size of the rock sprite (world units). */
  size: number;
  flipX: boolean;
}

export interface RockCluster {
  id: string;
  x: number;
  y: number;
  members: RockMember[];
}

export const WORLD_CENTER: Point = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };
export const PLAYER_START: Point = { x: WORLD_CENTER.x, y: WORLD_CENTER.y };

/** Semi-axes of the base ellipse that the blob outline deforms. */
export const OUTLINE_SEMI_AXIS = { x: 2300, y: 1620 } as const;

/** Extra distance (beyond an entity's radius) kept between entities and the outline. */
export const OUTLINE_EDGE_INSET = 34;

/**
 * Collision radius of a rock sprite as a fraction of its display size.
 * Sized to match `prop-wobbly-rock.png`'s opaque boulder silhouette (~0.36-0.44
 * radial extent, ~0.39 average) while keeping cluster corridors >= 168px wide.
 */
export const ROCK_COLLISION_RADIUS_RATIO = 0.38;

/** Radius of the open central combat clearing (visual and rock-free). */
export const CENTRAL_CLEARING_RADIUS = 380;

// [angle degrees (screen space, 0 = right, 90 = down), amplitude, sigma degrees]
const OUTLINE_LOBES: ReadonlyArray<readonly [number, number, number]> = [
  [-140, 0.07, 13], // top-left lobe (console)
  [-118, -0.08, 6], // top-left bay
  [-100, 0.035, 9], // top lobe (tree)
  [-78, 0.03, 8], // top lobe (eyed bush)
  [-62, -0.06, 6], // top-right bay
  [-42, 0.07, 13], // top-right lobe (cup)
  [8, 0.06, 12], // right lobe (notebook)
  [22, -0.08, 6], // right-lower bay
  [42, 0.07, 12], // bottom-right lobe (star)
  [90, -0.2, 11], // bottom bay (fence)
  [118, -0.07, 7], // bottom-left bay
  [140, 0.07, 13], // bottom-left lobe (stump)
  [162, -0.1, 7], // left bay
  [183, 0.05, 11], // left lobe (bandage)
];

function wrapAngle(angle: number): number {
  let wrapped = angle;
  while (wrapped > Math.PI) wrapped -= Math.PI * 2;
  while (wrapped < -Math.PI) wrapped += Math.PI * 2;
  return wrapped;
}

/** Radial scale factor of the blob outline at ellipse parameter `theta` (radians). */
export function outlineRadiusScale(theta: number): number {
  let scale = 1 + 0.025 * Math.cos(3 * theta + 0.8) + 0.018 * Math.cos(5 * theta + 2.1);
  for (const [deg, amp, sigmaDeg] of OUTLINE_LOBES) {
    const delta = wrapAngle(theta - (deg * Math.PI) / 180);
    const sigma = (sigmaDeg * Math.PI) / 180;
    scale += amp * Math.exp(-(delta * delta) / (2 * sigma * sigma));
  }
  return scale;
}

/**
 * Point on the world, expressed in blob-relative terms: `degrees` is the ellipse
 * angle and `inset` scales toward the center (1 = on the outline, 0 = center).
 * Because the outline is star-shaped around the center, every inset <= 1 is inside.
 */
export function outlineAnchor(degrees: number, inset: number): Point {
  const theta = (degrees * Math.PI) / 180;
  const scale = outlineRadiusScale(theta) * inset;
  return {
    x: WORLD_CENTER.x + OUTLINE_SEMI_AXIS.x * Math.cos(theta) * scale,
    y: WORLD_CENTER.y + OUTLINE_SEMI_AXIS.y * Math.sin(theta) * scale,
  };
}

const OUTLINE_SAMPLE_COUNT = 240;

export const WORLD_OUTLINE: ReadonlyArray<Readonly<Point>> = Array.from({ length: OUTLINE_SAMPLE_COUNT }, (_, index) =>
  outlineAnchor((index / OUTLINE_SAMPLE_COUNT) * 360, 1),
);

// ---------------------------------------------------------------------------
// Solid rocks
// ---------------------------------------------------------------------------

type RockTemplate = ReadonlyArray<readonly [dx: number, dy: number, size: number, flipX: boolean]>;

const ROCK_BIG: RockTemplate = [
  [0, 0, 300, false],
  [125, 75, 190, true],
  [-105, 88, 140, false],
];
const ROCK_TRIO: RockTemplate = [
  [0, 0, 260, true],
  [140, -25, 200, false],
  [60, 125, 170, true],
];
const ROCK_PAIR: RockTemplate = [
  [0, 0, 230, true],
  [-95, 58, 150, false],
];
const ROCK_LONE: RockTemplate = [[0, 0, 250, false]];

function makeCluster(id: string, origin: Point, template: RockTemplate): RockCluster {
  return {
    id,
    x: Math.round(origin.x),
    y: Math.round(origin.y),
    members: template.map(([dx, dy, size, flipX]) => ({
      x: Math.round(origin.x + dx),
      y: Math.round(origin.y + dy),
      size,
      flipX,
    })),
  };
}

const at = (dx: number, dy: number): Point => ({ x: WORLD_CENTER.x + dx, y: WORLD_CENTER.y + dy });

/**
 * Hand-placed rock clusters. The first four sit inside the starting camera view
 * around (never on) the central clearing; the rest ring the island in the lobes.
 */
export const ROCK_CLUSTERS: ReadonlyArray<RockCluster> = [
  makeCluster('start-west', at(-790, -90), ROCK_BIG),
  makeCluster('start-east', at(570, 95), ROCK_TRIO),
  makeCluster('start-south', at(-200, 360), ROCK_PAIR),
  makeCluster('start-north', at(240, -350), ROCK_LONE),
  makeCluster('nw', outlineAnchor(-150, 0.64), ROCK_BIG),
  makeCluster('n-west', outlineAnchor(-108, 0.7), ROCK_PAIR),
  makeCluster('n-mid', outlineAnchor(-92, 0.5), ROCK_LONE),
  makeCluster('ne', outlineAnchor(-55, 0.66), ROCK_TRIO),
  makeCluster('e-north', outlineAnchor(-22, 0.62), ROCK_BIG),
  makeCluster('e', outlineAnchor(12, 0.68), ROCK_PAIR),
  makeCluster('se', outlineAnchor(52, 0.66), ROCK_BIG),
  makeCluster('s-east', outlineAnchor(75, 0.58), ROCK_PAIR),
  makeCluster('s-west', outlineAnchor(112, 0.62), ROCK_TRIO),
  makeCluster('sw', outlineAnchor(150, 0.62), ROCK_BIG),
  makeCluster('w', outlineAnchor(178, 0.64), ROCK_PAIR),
  makeCluster('w-north', outlineAnchor(-170, 0.5), ROCK_LONE),
];

export const SOLID_ROCKS: ReadonlyArray<SolidCircle> = ROCK_CLUSTERS.flatMap((cluster) =>
  cluster.members.map((member) => ({
    x: member.x,
    y: member.y,
    radius: Math.round(member.size * ROCK_COLLISION_RADIUS_RATIO),
  })),
);

// ---------------------------------------------------------------------------
// Geometry & Local Depenetration (No World-Center Teleport)
// ---------------------------------------------------------------------------

interface OutlineProbe {
  inside: boolean;
  distance: number;
  nearestX: number;
  nearestY: number;
}

// Largest circle around the center that is certainly inside the outline; lets
// collision checks skip the outline test when strictly inside this disk.
const INNER_SAFE_RADIUS = (() => {
  let min = Number.POSITIVE_INFINITY;
  for (const point of WORLD_OUTLINE) {
    min = Math.min(min, Math.hypot(point.x - WORLD_CENTER.x, point.y - WORLD_CENTER.y));
  }
  return min;
})();

function probeOutline(x: number, y: number): OutlineProbe {
  let inside = false;
  let best = Number.POSITIVE_INFINITY;
  let nearestX = x;
  let nearestY = y;
  const count = WORLD_OUTLINE.length;

  for (let index = 0, previous = count - 1; index < count; previous = index, index += 1) {
    const a = WORLD_OUTLINE[previous];
    const b = WORLD_OUTLINE[index];

    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }

    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const lengthSq = abx * abx + aby * aby;
    const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * abx + (y - a.y) * aby) / lengthSq));
    const qx = a.x + abx * t;
    const qy = a.y + aby * t;
    const distSq = (x - qx) * (x - qx) + (y - qy) * (y - qy);
    if (distSq < best) {
      best = distSq;
      nearestX = qx;
      nearestY = qy;
    }
  }

  return { inside, distance: Math.sqrt(best), nearestX, nearestY };
}

function getOutlineInwardNormal(x: number, y: number, probe: OutlineProbe): Point {
  let nx: number;
  let ny: number;
  if (probe.distance < 1e-6) {
    nx = WORLD_CENTER.x - x;
    ny = WORLD_CENTER.y - y;
  } else if (probe.inside) {
    nx = x - probe.nearestX;
    ny = y - probe.nearestY;
  } else {
    nx = probe.nearestX - x;
    ny = probe.nearestY - y;
  }
  const length = Math.hypot(nx, ny) || 1;
  return { x: nx / length, y: ny / length };
}

export function isInsideWorldOutline(x: number, y: number): boolean {
  return probeOutline(x, y).inside;
}

function isClearAt(x: number, y: number, radius: number): boolean {
  const outlineNeed = radius + OUTLINE_EDGE_INSET;
  if (Math.hypot(x - WORLD_CENTER.x, y - WORLD_CENTER.y) > INNER_SAFE_RADIUS - outlineNeed) {
    const probe = probeOutline(x, y);
    if ((probe.inside ? probe.distance : -probe.distance) < outlineNeed) {
      return false;
    }
  }
  for (const rock of SOLID_ROCKS) {
    const minDistance = rock.radius + radius;
    const dx = x - rock.x;
    const dy = y - rock.y;
    if (dx * dx + dy * dy < minDistance * minDistance) {
      return false;
    }
  }
  return true;
}

function intersectTwoCircles(
  ax: number,
  ay: number,
  ar: number,
  bx: number,
  by: number,
  br: number,
): Point[] {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-6 || dist > ar + br || dist < Math.abs(ar - br)) {
    return [];
  }
  const a = (ar * ar - br * br + dist * dist) / (2 * dist);
  const hSq = Math.max(0, ar * ar - a * a);
  const h = Math.sqrt(hSq);
  const ux = dx / dist;
  const uy = dy / dist;
  const mx = ax + a * ux;
  const my = ay + a * uy;
  if (h < 1e-6) {
    return [{ x: mx, y: my }];
  }
  return [
    { x: mx + h * -uy, y: my + h * ux },
    { x: mx - h * -uy, y: my - h * ux },
  ];
}

export interface WalkResolution {
  x: number;
  y: number;
  /** True when the input position had to be moved. */
  blocked: boolean;
  /** Unit normal of the last surface that pushed the entity back (0,0 if not blocked). */
  normalX: number;
  normalY: number;
}

/**
 * Locally resolves overlaps against the outline and solid rocks without ever
 * teleporting toward `WORLD_CENTER` or jumping to a distant obstacle.
 * If alternating pushes hit a seam between two overlapping cluster rocks,
 * exact two-circle intersection finds the closest exterior notch point.
 */
export function resolveWalkable(x: number, y: number, radius: number): WalkResolution {
  let px = x;
  let py = y;
  let blocked = false;
  let normalX = 0;
  let normalY = 0;
  let settled = false;
  const outlineNeed = radius + OUTLINE_EDGE_INSET;

  for (let pass = 0; pass < 12; pass += 1) {
    let moved = false;

    if (Math.hypot(px - WORLD_CENTER.x, py - WORLD_CENTER.y) > INNER_SAFE_RADIUS - outlineNeed) {
      const probe = probeOutline(px, py);
      const signed = probe.inside ? probe.distance : -probe.distance;
      if (signed < outlineNeed) {
        const normal = getOutlineInwardNormal(px, py, probe);
        px = probe.nearestX + normal.x * (outlineNeed + 0.02);
        py = probe.nearestY + normal.y * (outlineNeed + 0.02);
        normalX = normal.x;
        normalY = normal.y;
        blocked = true;
        moved = true;
      }
    }

    for (const rock of SOLID_ROCKS) {
      const dx = px - rock.x;
      const dy = py - rock.y;
      const minDistance = rock.radius + radius;
      const distSq = dx * dx + dy * dy;
      if (distSq >= minDistance * minDistance) {
        continue;
      }

      const distance = Math.sqrt(distSq);
      const nx = distance < 1e-4 ? 1 : dx / distance;
      const ny = distance < 1e-4 ? 0 : dy / distance;
      px = rock.x + nx * (minDistance + 0.02);
      py = rock.y + ny * (minDistance + 0.02);
      normalX = nx;
      normalY = ny;
      blocked = true;
      moved = true;
    }

    if (!moved) {
      settled = true;
      break;
    }
  }

  if (blocked && !settled) {
    // Alternating push oscillated in a cluster seam between overlapping rocks:
    // solve the exact exterior intersection of those overlapping circles locally.
    const nearbyRocks = SOLID_ROCKS.filter(
      (rock) => Math.hypot(px - rock.x, py - rock.y) <= rock.radius + radius + 12,
    );
    let bestPoint: Point | null = null;
    let bestDistSq = Number.POSITIVE_INFINITY;

    for (let i = 0; i < nearbyRocks.length; i += 1) {
      for (let j = i + 1; j < nearbyRocks.length; j += 1) {
        const a = nearbyRocks[i];
        const b = nearbyRocks[j];
        const candidates = intersectTwoCircles(
          a.x,
          a.y,
          a.radius + radius + 0.05,
          b.x,
          b.y,
          b.radius + radius + 0.05,
        );
        for (const candidate of candidates) {
          if (!isClearAt(candidate.x, candidate.y, radius)) {
            continue;
          }
          const distSq = (candidate.x - x) * (candidate.x - x) + (candidate.y - y) * (candidate.y - y);
          if (distSq < bestDistSq) {
            bestDistSq = distSq;
            bestPoint = candidate;
          }
        }
      }
    }

    if (bestPoint) {
      px = bestPoint.x;
      py = bestPoint.y;
      settled = true;
    }
  }

  if (blocked && !settled) {
    // Strictly local concentric search around the position (never WORLD_CENTER).
    const maxSearchRadius = 320;
    outer: for (let searchR = 8; searchR <= maxSearchRadius; searchR += 8) {
      let bestPoint: Point | null = null;
      let bestDistSq = Number.POSITIVE_INFINITY;
      for (let step = 0; step < 24; step += 1) {
        const angle = (step / 24) * Math.PI * 2;
        const cx = x + Math.cos(angle) * searchR;
        const cy = y + Math.sin(angle) * searchR;
        if (!isClearAt(cx, cy, radius)) {
          continue;
        }
        const distSq = (cx - px) * (cx - px) + (cy - py) * (cy - py);
        if (distSq < bestDistSq) {
          bestDistSq = distSq;
          bestPoint = { x: cx, y: cy };
        }
      }
      if (bestPoint) {
        px = bestPoint.x;
        py = bestPoint.y;
        break outer;
      }
    }
  }

  if (blocked && normalX === 0 && normalY === 0) {
    const len = Math.hypot(px - x, py - y);
    if (len > 1e-6) {
      normalX = (px - x) / len;
      normalY = (py - y) / len;
    }
  }

  return { x: px, y: py, blocked, normalX, normalY };
}

export function isWalkable(x: number, y: number, radius: number): boolean {
  return isClearAt(x, y, radius);
}

// ---------------------------------------------------------------------------
// Continuous Swept-Circle Movement & Surface Sliding
// ---------------------------------------------------------------------------

const MAX_SWEEP_CHUNK_DISTANCE = 20;
const MAX_SWEEP_CHUNKS = 40;
const MAX_SLIDE_ITERATIONS = 4;
const CONTACT_SKIN_EPSILON = 0.01;
const OUTLINE_SWEEP_STEP = 8;

export interface MoveAlongWorldOptions {
  /** Allow tangential sliding when hitting an obstacle (default true). */
  allowSlide?: boolean;
}

export interface MoveAlongWorldResult {
  x: number;
  y: number;
  blocked: boolean;
  /** Unit normal of the last surface hit during movement, or (0,0) if unblocked. */
  normalX: number;
  normalY: number;
  /** Distinct inward surface normals encountered while moving. */
  contactNormals: Point[];
  /** True when remaining velocity was completely halted against surfaces. */
  stopped: boolean;
}

interface SweepHit {
  t: number;
  nx: number;
  ny: number;
}

function findOutlineHitAlongSegment(
  px: number,
  py: number,
  vx: number,
  vy: number,
  outlineNeed: number,
  segLen: number,
): SweepHit | null {
  const safeCheckRadius = INNER_SAFE_RADIUS - outlineNeed - 1;
  if (
    Math.hypot(px - WORLD_CENTER.x, py - WORLD_CENTER.y) < safeCheckRadius &&
    Math.hypot(px + vx - WORLD_CENTER.x, py + vy - WORLD_CENTER.y) < safeCheckRadius
  ) {
    return null;
  }

  const probe0 = probeOutline(px, py);
  const signed0 = probe0.inside ? probe0.distance : -probe0.distance;
  if (signed0 <= outlineNeed + 0.02) {
    const n0 = getOutlineInwardNormal(px, py, probe0);
    if (vx * n0.x + vy * n0.y < -1e-6 * segLen) {
      return { t: 0, nx: n0.x, ny: n0.y };
    }
  }

  const steps = Math.max(1, Math.ceil(segLen / OUTLINE_SWEEP_STEP));
  let prevT = 0;

  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps;
    const qx = px + vx * t;
    const qy = py + vy * t;
    const probe = probeOutline(qx, qy);
    const signed = probe.inside ? probe.distance : -probe.distance;
    if (signed < outlineNeed) {
      let lo = prevT;
      let hi = t;
      for (let iter = 0; iter < 12; iter += 1) {
        const mid = (lo + hi) * 0.5;
        const mx = px + vx * mid;
        const my = py + vy * mid;
        const midProbe = probeOutline(mx, my);
        const midSigned = midProbe.inside ? midProbe.distance : -midProbe.distance;
        if (midSigned >= outlineNeed) {
          lo = mid;
        } else {
          hi = mid;
        }
      }
      const contactProbe = probeOutline(px + vx * hi, py + vy * hi);
      const normal = getOutlineInwardNormal(px + vx * hi, py + vy * hi, contactProbe);
      if (vx * normal.x + vy * normal.y < 0) {
        return { t: lo, nx: normal.x, ny: normal.y };
      }
    }
    prevT = t;
  }

  return null;
}

function findEarliestObstacleHit(px: number, py: number, vx: number, vy: number, radius: number): SweepHit | null {
  const segLenSq = vx * vx + vy * vy;
  if (segLenSq < 1e-12) {
    return null;
  }
  const segLen = Math.sqrt(segLenSq);

  let bestT = Number.POSITIVE_INFINITY;
  let bestNx = 0;
  let bestNy = 0;

  for (const rock of SOLID_ROCKS) {
    const minDistance = rock.radius + radius;
    const dx = px - rock.x;
    const dy = py - rock.y;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq);
    const b = dx * vx + dy * vy;

    // Only collide if moving inward into the rock (ignore strictly tangential/outward rounding noise).
    if (b >= -1e-6 * dist * segLen) {
      continue;
    }

    const c = distSq - minDistance * minDistance;
    if (c <= 0) {
      const nx = dist < 1e-4 ? -vx / segLen : dx / dist;
      const ny = dist < 1e-4 ? -vy / segLen : dy / dist;
      bestT = 0;
      bestNx = nx;
      bestNy = ny;
      break;
    }

    const disc = b * b - segLenSq * c;
    if (disc < 0) {
      continue;
    }

    const t = c / (-b + Math.sqrt(disc));
    if (t >= 0 && t <= 1 && t < bestT) {
      const hx = px + t * vx;
      const hy = py + t * vy;
      const hLen = Math.hypot(hx - rock.x, hy - rock.y) || 1;
      bestT = t;
      bestNx = (hx - rock.x) / hLen;
      bestNy = (hy - rock.y) / hLen;
    }
  }

  const outlineHit = findOutlineHitAlongSegment(px, py, vx, vy, radius + OUTLINE_EDGE_INSET, segLen);
  if (outlineHit && outlineHit.t < bestT) {
    bestT = outlineHit.t;
    bestNx = outlineHit.nx;
    bestNy = outlineHit.ny;
  }

  if (bestT > 1) {
    return null;
  }

  return { t: bestT, nx: bestNx, ny: bestNy };
}

function addUniqueNormal(normals: Point[], nx: number, ny: number): void {
  for (const existing of normals) {
    if (existing.x * nx + existing.y * ny > 0.9999) {
      return;
    }
  }
  normals.push({ x: nx, y: ny });
}

export function projectVelocityAgainstNormals(
  vx: number,
  vy: number,
  normals: ReadonlyArray<Point>,
): Point {
  if (normals.length === 0) {
    return { x: vx, y: vy };
  }

  if (normals.length === 1) {
    const n = normals[0];
    const dot = vx * n.x + vy * n.y;
    if (dot >= 0) {
      return { x: vx, y: vy };
    }
    return { x: vx - dot * n.x, y: vy - dot * n.y };
  }

  let bestX = 0;
  let bestY = 0;
  let bestProgress = 0;

  for (const n of normals) {
    const dot = vx * n.x + vy * n.y;
    const candX = dot < 0 ? vx - dot * n.x : vx;
    const candY = dot < 0 ? vy - dot * n.y : vy;

    let valid = true;
    for (const other of normals) {
      if (candX * other.x + candY * other.y < -1e-5 * (Math.hypot(candX, candY) + 1)) {
        valid = false;
        break;
      }
    }
    if (!valid) {
      continue;
    }

    const progress = candX * vx + candY * vy;
    if (progress > bestProgress) {
      bestProgress = progress;
      bestX = candX;
      bestY = candY;
    }
  }

  return { x: bestX, y: bestY };
}

function sweepSingleChunk(
  startX: number,
  startY: number,
  dx: number,
  dy: number,
  radius: number,
  allowSlide: boolean,
): MoveAlongWorldResult {
  let px = startX;
  let py = startY;
  let remX = dx;
  let remY = dy;
  const origLen = Math.hypot(dx, dy);
  let blocked = false;
  let stopped = false;
  let lastNx = 0;
  let lastNy = 0;
  const activeNormals: Point[] = [];

  for (let iter = 0; iter < MAX_SLIDE_ITERATIONS; iter += 1) {
    const remLen = Math.hypot(remX, remY);
    if (remLen < 1e-6) {
      break;
    }

    const hit = findEarliestObstacleHit(px, py, remX, remY, radius);
    if (!hit) {
      px += remX;
      py += remY;
      remX = 0;
      remY = 0;
      break;
    }

    blocked = true;
    lastNx = hit.nx;
    lastNy = hit.ny;
    addUniqueNormal(activeNormals, hit.nx, hit.ny);

    const advanceDist = Math.max(0, hit.t * remLen - CONTACT_SKIN_EPSILON);
    const advanceT = advanceDist / remLen;
    if (advanceDist > 0.005) {
      px += remX * advanceT;
      py += remY * advanceT;
      const leftover = Math.max(0, 1 - advanceT);
      remX *= leftover;
      remY *= leftover;
    }

    if (!allowSlide) {
      remX = 0;
      remY = 0;
      stopped = true;
      break;
    }

    const curRemLen = Math.hypot(remX, remY);
    const budgetScale = origLen > 1e-6 ? curRemLen / origLen : 0;
    const baseVx = dx * budgetScale;
    const baseVy = dy * budgetScale;
    const projected = projectVelocityAgainstNormals(baseVx, baseVy, activeNormals);
    remX = projected.x;
    remY = projected.y;

    if (Math.hypot(remX, remY) < 1e-5) {
      remX = 0;
      remY = 0;
      stopped = true;
      break;
    }
  }

  return {
    x: px,
    y: py,
    blocked,
    normalX: lastNx,
    normalY: lastNy,
    contactNormals: activeNormals,
    stopped,
  };
}

/**
 * Continuous collision-aware movement from `(startX, startY)` toward
 * `(targetX, targetY)` for a circle of `radius`.
 *
 * Guarantees:
 * - Never tunnels through rocks or across the irregular island outline, regardless
 *   of step magnitude.
 * - Never teleports toward `WORLD_CENTER` or across an obstacle.
 * - Displacement never exceeds `hypot(targetX - startX, targetY - startY)` when
 *   starting from a walkable point.
 */
export function moveAlongWorldMap(
  startX: number,
  startY: number,
  targetX: number,
  targetY: number,
  radius: number,
  options?: MoveAlongWorldOptions,
): MoveAlongWorldResult {
  const allowSlide = options?.allowSlide ?? true;
  let curX = startX;
  let curY = startY;
  let preBlocked = false;
  let preNx = 0;
  let preNy = 0;

  if (!isClearAt(curX, curY, radius)) {
    const local = resolveWalkable(curX, curY, radius);
    curX = local.x;
    curY = local.y;
    preBlocked = local.blocked;
    preNx = local.normalX;
    preNy = local.normalY;
  }

  const totalDx = targetX - startX;
  const totalDy = targetY - startY;
  const totalDist = Math.hypot(totalDx, totalDy);
  if (totalDist < 1e-6) {
    return {
      x: curX,
      y: curY,
      blocked: preBlocked,
      normalX: preNx,
      normalY: preNy,
      contactNormals: preBlocked && (preNx !== 0 || preNy !== 0) ? [{ x: preNx, y: preNy }] : [],
      stopped: preBlocked,
    };
  }

  // Sweeping the chunk vector from the current position ensures curved boulder
  // sliding without losing analytic zero-tunneling even on arbitrarily large moves.
  const chunks = Math.min(MAX_SWEEP_CHUNKS, Math.max(1, Math.ceil(totalDist / MAX_SWEEP_CHUNK_DISTANCE)));
  const stepDx = totalDx / chunks;
  const stepDy = totalDy / chunks;

  let anyBlocked = preBlocked;
  let lastNx = preNx;
  let lastNy = preNy;
  let lastStopped = false;
  const allNormals: Point[] = [];
  if (preBlocked && (preNx !== 0 || preNy !== 0)) {
    addUniqueNormal(allNormals, preNx, preNy);
  }

  for (let chunk = 0; chunk < chunks; chunk += 1) {
    const prevX = curX;
    const prevY = curY;
    const res = sweepSingleChunk(curX, curY, stepDx, stepDy, radius, allowSlide);
    curX = res.x;
    curY = res.y;
    if (res.blocked) {
      anyBlocked = true;
      lastNx = res.normalX;
      lastNy = res.normalY;
      for (const n of res.contactNormals) {
        addUniqueNormal(allNormals, n.x, n.y);
      }
    }
    lastStopped = res.stopped;
    if (res.stopped && Math.hypot(curX - prevX, curY - prevY) < 1e-6 && chunk > 0) {
      break;
    }
  }

  return {
    x: curX,
    y: curY,
    blocked: anyBlocked,
    normalX: lastNx,
    normalY: lastNy,
    contactNormals: allNormals,
    stopped: lastStopped,
  };
}

// ---------------------------------------------------------------------------
// Enemy Obstacle Steering (Consistent Winding, Zero Oscillation)
// ---------------------------------------------------------------------------

export interface ObstacleSteeringState {
  /** +1 = CCW winding around obstacle, -1 = CW winding, 0 = none. */
  detourSign: -1 | 0 | 1;
  /** Timestamp (ms) until which the committed winding stays active. */
  detourUntilMs: number;
}

export interface SteerVelocityInput {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  targetX: number;
  targetY: number;
  nowMs: number;
  state: ObstacleSteeringState;
  committedDash?: boolean;
  contactNormals?: ReadonlyArray<Point>;
}

export interface SteerVelocityResult {
  vx: number;
  vy: number;
}

const DETOUR_MEMORY_MS = 480;

export function steerVelocityAroundObstacles(input: SteerVelocityInput): SteerVelocityResult {
  const { x, y, vx, vy, radius, targetX, targetY, nowMs, state, committedDash, contactNormals } = input;
  const speed = Math.hypot(vx, vy);
  if (speed < 1e-3) {
    return { vx, vy };
  }

  if (committedDash) {
    // Committed charges/line-strikes preserve their telegraphed axis: slide along
    // contact surfaces without redirecting perpendicular around rocks.
    const normals: Point[] = [];
    if (contactNormals) {
      for (const n of contactNormals) {
        if (vx * n.x + vy * n.y < 0) {
          addUniqueNormal(normals, n.x, n.y);
        }
      }
    }
    if (normals.length === 0) {
      return { vx, vy };
    }
    const projected = projectVelocityAgainstNormals(vx, vy, normals);
    return { vx: projected.x, vy: projected.y };
  }

  const dirX = vx / speed;
  const dirY = vy / speed;
  const probeDist = Math.max(18, Math.min(48, speed * 0.15));
  const probe = moveAlongWorldMap(x, y, x + dirX * probeDist, y + dirY * probeDist, radius, { allowSlide: false });

  const blockingNormals: Point[] = [];
  if (contactNormals) {
    for (const n of contactNormals) {
      if (dirX * n.x + dirY * n.y < -1e-3) {
        addUniqueNormal(blockingNormals, n.x, n.y);
      }
    }
  }
  if (probe.blocked && (probe.normalX !== 0 || probe.normalY !== 0)) {
    addUniqueNormal(blockingNormals, probe.normalX, probe.normalY);
  }

  if (blockingNormals.length === 0) {
    if (nowMs >= state.detourUntilMs) {
      state.detourSign = 0;
    }
    return { vx, vy };
  }

  // Pick a consistent CW (-1) or CCW (+1) tangent winding so multi-rock clusters
  // never cause left/right oscillation in notches.
  let sign: -1 | 1;
  if (state.detourSign !== 0 && nowMs < state.detourUntilMs) {
    sign = state.detourSign;
  } else {
    const primary = blockingNormals[0];
    const ccw = { x: -primary.y, y: primary.x };
    const cw = { x: primary.y, y: -primary.x };
    const toTargetDx = targetX - x;
    const toTargetDy = targetY - y;
    const toTargetLen = Math.hypot(toTargetDx, toTargetDy) || 1;
    const toTx = toTargetDx / toTargetLen;
    const toTy = toTargetDy / toTargetLen;

    const ccwProbe = moveAlongWorldMap(x, y, x + ccw.x * 56, y + ccw.y * 56, radius, { allowSlide: false });
    const cwProbe = moveAlongWorldMap(x, y, x + cw.x * 56, y + cw.y * 56, radius, { allowSlide: false });

    const ccwScore =
      (ccw.x * dirX + ccw.y * dirY) +
      0.5 * (ccw.x * toTx + ccw.y * toTy) +
      (ccwProbe.blocked ? -1.2 : 0.6);
    const cwScore =
      (cw.x * dirX + cw.y * dirY) +
      0.5 * (cw.x * toTx + cw.y * toTy) +
      (cwProbe.blocked ? -1.2 : 0.6);

    sign = ccwScore >= cwScore ? 1 : -1;
    state.detourSign = sign;
  }
  state.detourUntilMs = nowMs + DETOUR_MEMORY_MS;

  // Evaluate the winding tangent on the blocking normal (and if in a notch where
  // that tangent points into a second blocking normal, follow the second normal's
  // same-handed tangent around the exterior of the cluster).
  let tangentX = sign === 1 ? -blockingNormals[0].y : blockingNormals[0].y;
  let tangentY = sign === 1 ? blockingNormals[0].x : -blockingNormals[0].x;

  if (blockingNormals.length > 1) {
    for (const candidateNormal of blockingNormals) {
      const tx = sign === 1 ? -candidateNormal.y : candidateNormal.y;
      const ty = sign === 1 ? candidateNormal.x : -candidateNormal.x;
      const clearsAll = blockingNormals.every((other) => tx * other.x + ty * other.y >= -1e-3);
      if (clearsAll) {
        tangentX = tx;
        tangentY = ty;
        break;
      }
    }
  }

  return {
    vx: tangentX * speed,
    vy: tangentY * speed,
  };
}

// ---------------------------------------------------------------------------
// Reachability grid + spawn snapping (Spawn/Debug only, NEVER normal movement)
// ---------------------------------------------------------------------------

export const WALK_GRID_CELL = 48;
const WALK_GRID_COLUMNS = Math.ceil(WORLD_WIDTH / WALK_GRID_CELL);
const WALK_GRID_ROWS = Math.ceil(WORLD_HEIGHT / WALK_GRID_CELL);

export interface WalkGrid {
  radius: number;
  columns: number;
  rows: number;
  /** 1 when the cell center is walkable *and* connected to the player start. */
  reachable: Uint8Array;
  /** 1 when the cell center is walkable regardless of connectivity. */
  walkable: Uint8Array;
}

const walkGridCache = new Map<number, WalkGrid>();

function cellCenter(column: number, row: number): Point {
  return { x: (column + 0.5) * WALK_GRID_CELL, y: (row + 0.5) * WALK_GRID_CELL };
}

export function getWalkGrid(radius: number): WalkGrid {
  const cached = walkGridCache.get(radius);
  if (cached) {
    return cached;
  }

  const walkable = new Uint8Array(WALK_GRID_COLUMNS * WALK_GRID_ROWS);
  for (let row = 0; row < WALK_GRID_ROWS; row += 1) {
    for (let column = 0; column < WALK_GRID_COLUMNS; column += 1) {
      const center = cellCenter(column, row);
      walkable[row * WALK_GRID_COLUMNS + column] = isWalkable(center.x, center.y, radius) ? 1 : 0;
    }
  }

  const reachable = new Uint8Array(walkable.length);
  const startColumn = Math.floor(PLAYER_START.x / WALK_GRID_CELL);
  const startRow = Math.floor(PLAYER_START.y / WALK_GRID_CELL);
  const queue: number[] = [startRow * WALK_GRID_COLUMNS + startColumn];
  reachable[queue[0]] = walkable[queue[0]];

  for (let head = 0; head < queue.length; head += 1) {
    const index = queue[head];
    const column = index % WALK_GRID_COLUMNS;
    const row = Math.floor(index / WALK_GRID_COLUMNS);
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const nc = column + dx;
        const nr = row + dy;
        if ((dx === 0 && dy === 0) || nc < 0 || nr < 0 || nc >= WALK_GRID_COLUMNS || nr >= WALK_GRID_ROWS) {
          continue;
        }
        // Forbid diagonal squeezes between two blocked cells.
        if (dx !== 0 && dy !== 0 && !walkable[row * WALK_GRID_COLUMNS + nc] && !walkable[nr * WALK_GRID_COLUMNS + column]) {
          continue;
        }
        const next = nr * WALK_GRID_COLUMNS + nc;
        if (walkable[next] && !reachable[next]) {
          reachable[next] = 1;
          queue.push(next);
        }
      }
    }
  }

  const grid: WalkGrid = { radius, columns: WALK_GRID_COLUMNS, rows: WALK_GRID_ROWS, reachable, walkable };
  walkGridCache.set(radius, grid);
  return grid;
}

export function isReachablePoint(x: number, y: number, radius: number): boolean {
  const grid = getWalkGrid(radius);
  const column = Math.floor(x / WALK_GRID_CELL);
  const row = Math.floor(y / WALK_GRID_CELL);
  if (column < 0 || row < 0 || column >= grid.columns || row >= grid.rows) {
    return false;
  }
  return grid.reachable[row * grid.columns + column] === 1 && isWalkable(x, y, radius);
}

/** Entity radius classes used for the cached reachability grids. */
export const WALK_RADIUS_STANDARD = 40;
export const WALK_RADIUS_LARGE = 64;

/** True when a large entity (up to boss size) can stand at (x, y) and the player can reach it. */
export function isReachableSpawn(x: number, y: number): boolean {
  return isReachablePoint(x, y, WALK_RADIUS_LARGE);
}

/**
 * Returns the closest valid, reachable position to (x, y) for a circle of
 * `radius`. Used only by spawn and explicit debug placement paths — never for
 * normal runtime movement.
 */
export function snapToWalkable(x: number, y: number, radius: number): Point {
  const gridRadius = radius > WALK_RADIUS_STANDARD ? WALK_RADIUS_LARGE : WALK_RADIUS_STANDARD;

  if (isReachablePoint(x, y, gridRadius)) {
    return { x, y };
  }

  const resolved = resolveWalkable(x, y, gridRadius);
  if (isReachablePoint(resolved.x, resolved.y, gridRadius)) {
    return { x: resolved.x, y: resolved.y };
  }

  const grid = getWalkGrid(gridRadius);
  const startColumn = Math.min(grid.columns - 1, Math.max(0, Math.floor(x / WALK_GRID_CELL)));
  const startRow = Math.min(grid.rows - 1, Math.max(0, Math.floor(y / WALK_GRID_CELL)));
  const maxRing = Math.max(grid.columns, grid.rows);

  for (let ring = 0; ring <= maxRing; ring += 1) {
    let best: Point | null = null;
    let bestDistSq = Number.POSITIVE_INFINITY;

    for (let row = startRow - ring; row <= startRow + ring; row += 1) {
      for (let column = startColumn - ring; column <= startColumn + ring; column += 1) {
        const onRing = Math.max(Math.abs(row - startRow), Math.abs(column - startColumn)) === ring;
        if (!onRing || column < 0 || row < 0 || column >= grid.columns || row >= grid.rows) {
          continue;
        }
        if (!grid.reachable[row * grid.columns + column]) {
          continue;
        }
        const center = cellCenter(column, row);
        const distSq = (center.x - x) * (center.x - x) + (center.y - y) * (center.y - y);
        if (distSq < bestDistSq) {
          bestDistSq = distSq;
          best = center;
        }
      }
    }

    if (best) {
      return best;
    }
  }

  return { x: PLAYER_START.x, y: PLAYER_START.y };
}
