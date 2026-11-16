import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/worldBalance';

/**
 * R3F-D data-driven "weird world" map.
 *
 * The Phaser/physics world stays a rectangle (WORLD_WIDTH x WORLD_HEIGHT), but
 * the *playable* area is an irregular blob island defined by `WORLD_OUTLINE`.
 * Everything outside the outline is void; entities are kept inside it with
 * `resolveWalkable`. Large rocks are solid circles, everything else is decoration.
 *
 * This module is pure (no Phaser) so geometry, collision and spawn safety are
 * unit-testable.
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

/** Collision radius of a rock sprite as a fraction of its display size. */
export const ROCK_COLLISION_RADIUS_RATIO = 0.33;

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
// Geometry
// ---------------------------------------------------------------------------

interface OutlineProbe {
  inside: boolean;
  distance: number;
  nearestX: number;
  nearestY: number;
}

// Largest circle around the center that is certainly inside the outline; lets
// resolveWalkable skip the outline test for the vast majority of positions.
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

export function isInsideWorldOutline(x: number, y: number): boolean {
  return probeOutline(x, y).inside;
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
 * Pushes a circle of `radius` at (x, y) out of the void and out of solid rocks.
 * Deterministic and cheap; used each frame for the player and enemies, and to
 * validate spawn points.
 */
export function resolveWalkable(x: number, y: number, radius: number): WalkResolution {
  let px = x;
  let py = y;
  let blocked = false;
  let normalX = 0;
  let normalY = 0;
  let settled = false;
  const outlineNeed = radius + OUTLINE_EDGE_INSET;

  for (let pass = 0; pass < 8; pass += 1) {
    let moved = false;

    if (Math.hypot(px - WORLD_CENTER.x, py - WORLD_CENTER.y) > INNER_SAFE_RADIUS - outlineNeed) {
      const probe = probeOutline(px, py);
      const signed = probe.inside ? probe.distance : -probe.distance;
      if (signed < outlineNeed) {
        let nx: number;
        let ny: number;
        if (probe.distance < 1e-6) {
          nx = WORLD_CENTER.x - px;
          ny = WORLD_CENTER.y - py;
        } else if (probe.inside) {
          nx = px - probe.nearestX;
          ny = py - probe.nearestY;
        } else {
          nx = probe.nearestX - px;
          ny = probe.nearestY - py;
        }
        const length = Math.hypot(nx, ny) || 1;
        nx /= length;
        ny /= length;
        px = probe.nearestX + nx * outlineNeed;
        py = probe.nearestY + ny * outlineNeed;
        normalX = nx;
        normalY = ny;
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
      px = rock.x + nx * minDistance;
      py = rock.y + ny * minDistance;
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
    // Cornered between several surfaces (e.g. deep in a bay): walk the point back
    // along the ray to the open center until it is clear.
    let low = 0;
    let high = 1;
    for (let iteration = 0; iteration < 14; iteration += 1) {
      const mid = (low + high) / 2;
      const tx = WORLD_CENTER.x + (px - WORLD_CENTER.x) * mid;
      const ty = WORLD_CENTER.y + (py - WORLD_CENTER.y) * mid;
      if (isClearAt(tx, ty, radius)) {
        low = mid;
      } else {
        high = mid;
      }
    }
    px = WORLD_CENTER.x + (px - WORLD_CENTER.x) * low;
    py = WORLD_CENTER.y + (py - WORLD_CENTER.y) * low;
  }

  return { x: px, y: py, blocked, normalX, normalY };
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

export function isWalkable(x: number, y: number, radius: number): boolean {
  return !resolveWalkable(x, y, radius).blocked;
}

// ---------------------------------------------------------------------------
// Reachability grid + spawn snapping
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
 * `radius`. Used by every spawn path so nothing appears in rocks, in the void,
 * or in a pocket the player cannot reach.
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
