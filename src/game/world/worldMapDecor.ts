import {
  CENTRAL_CLEARING_RADIUS,
  ROCK_CLUSTERS,
  SOLID_ROCKS,
  WORLD_CENTER,
  WORLD_OUTLINE,
  isInsideWorldOutline,
  outlineAnchor,
  type Point,
} from './worldMap';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/worldBalance';

/**
 * R3F-D decorative layout for the weird world. Everything here is visual only:
 * ground regions, dirt paths, doodle marks, landmark "stickers", bushes and edge
 * pebbles. Solid collision lives exclusively in `worldMap.ts` (SOLID_ROCKS).
 */

export const WORLD_COLORS = {
  void: 0x2d2b3d,
  cloud: 0x3b3852,
  sparkle: 0xf3e9a8,
  outline: 0x1b1a22,
  rim: 0x6b8a2e,
  grass: 0x9db94c,
  grassDark: 0x86a63f,
  grassLight: 0xb4cc58,
  dirt: 0xdcb877,
  dirtEdge: 0xb98f55,
  mud: 0xc79a5a,
  doodle: 0xb08850,
  tuft: 0x5f7f2a,
  rock: 0x8d8aa3,
  rockTint: 0xc9bde6,
  bush: 0x5aa05a,
} as const;

export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Star-shaped organic blob around (cx, cy). */
export function makeBlob(cx: number, cy: number, rx: number, ry: number, seed: number, count = 30, jitter = 0.2): Point[] {
  const random = createSeededRandom(seed);
  const phases = [random() * 6.28, random() * 6.28, random() * 6.28];
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    const wobble =
      1 +
      jitter * 0.55 * Math.sin(2 * angle + phases[0]) +
      jitter * 0.35 * Math.sin(3 * angle + phases[1]) +
      jitter * 0.25 * Math.sin(5 * angle + phases[2]);
    return { x: cx + Math.cos(angle) * rx * wobble, y: cy + Math.sin(angle) * ry * wobble };
  });
}

function catmullRom(points: Point[], samplesPerSegment: number): Point[] {
  const result: Point[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    for (let s = 0; s < samplesPerSegment; s += 1) {
      const t = s / samplesPerSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      result.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  result.push(points[points.length - 1]);
  return result;
}

// ---------------------------------------------------------------------------
// Ground
// ---------------------------------------------------------------------------

export interface GroundPatch {
  kind: 'dark' | 'light' | 'mud';
  points: Point[];
}

export const CLEARING_RADIUS_X = 820;
export const CLEARING_RADIUS_Y = 560;
export const CLEARING_BLOB: Point[] = makeBlob(WORLD_CENTER.x, WORLD_CENTER.y, CLEARING_RADIUS_X, CLEARING_RADIUS_Y, 11, 36, 0.16);

const PATCH_SPECS: ReadonlyArray<readonly [deg: number, inset: number, rx: number, ry: number, kind: GroundPatch['kind']]> = [
  [-150, 0.55, 520, 340, 'dark'],
  [-110, 0.66, 480, 300, 'light'],
  [-70, 0.62, 560, 330, 'dark'],
  [-30, 0.6, 520, 360, 'light'],
  [15, 0.72, 560, 380, 'dark'],
  [55, 0.6, 520, 340, 'light'],
  [100, 0.55, 440, 300, 'dark'],
  [135, 0.64, 560, 360, 'light'],
  [172, 0.62, 520, 360, 'dark'],
  [-178, 0.84, 300, 220, 'light'],
  [-125, 0.86, 340, 220, 'dark'],
  [-45, 0.88, 360, 230, 'dark'],
  [30, 0.86, 340, 230, 'light'],
  [70, 0.84, 360, 230, 'dark'],
];

export const GROUND_PATCHES: ReadonlyArray<GroundPatch> = [
  ...PATCH_SPECS.map(([deg, inset, rx, ry, kind], index) => {
    const center = outlineAnchor(deg, inset);
    return { kind, points: makeBlob(center.x, center.y, rx, ry, 100 + index * 7, 28, 0.24) };
  }),
  ...[
    [-0.62, -0.42],
    [0.58, 0.46],
    [-0.4, 0.62],
    [0.66, -0.3],
    [0.12, -0.7],
    [-0.12, 0.7],
  ].map(([fx, fy], index) => ({
    kind: 'mud' as const,
    points: makeBlob(WORLD_CENTER.x + fx * CLEARING_RADIUS_X, WORLD_CENTER.y + fy * CLEARING_RADIUS_Y, 70 + index * 6, 42 + index * 4, 300 + index, 14, 0.3),
  })),
];

export interface DirtPath {
  width: number;
  points: Point[];
}

const PATH_ANGLES: ReadonlyArray<readonly [deg: number, width: number, bend: number]> = [
  [-128, 170, 120],
  [-74, 190, -140],
  [-38, 170, 150],
  [32, 180, -120],
  [64, 170, 130],
  [98, 160, -100],
  [132, 180, 140],
  [166, 190, -130],
];

export const DIRT_PATHS: ReadonlyArray<DirtPath> = PATH_ANGLES.map(([deg, width, bend]) => {
  const end = outlineAnchor(deg, 0.93);
  const mid = outlineAnchor(deg, 0.58);
  const quarter = outlineAnchor(deg, 0.3);
  const dx = end.x - WORLD_CENTER.x;
  const dy = end.y - WORLD_CENTER.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  return {
    width,
    points: catmullRom(
      [
        WORLD_CENTER,
        { x: quarter.x + nx * bend * 0.5, y: quarter.y + ny * bend * 0.5 },
        { x: mid.x + nx * bend, y: mid.y + ny * bend },
        { x: (mid.x + end.x) / 2 - nx * bend * 0.4, y: (mid.y + end.y) / 2 - ny * bend * 0.4 },
        end,
      ],
      10,
    ),
  };
});

/** Spiral doodle scratched into the center of the clearing. */
export const CLEARING_SPIRAL: Point[] = Array.from({ length: 70 }, (_, index) => {
  const t = index / 69;
  const angle = t * Math.PI * 5.2;
  const radius = 14 + t * 130;
  return { x: WORLD_CENTER.x + Math.cos(angle) * radius, y: WORLD_CENTER.y + 20 + Math.sin(angle) * radius * 0.82 };
});

/** Crown doodle above the spiral. */
export const CLEARING_CROWN: Point[] = [
  { x: WORLD_CENTER.x - 70, y: WORLD_CENTER.y - 120 },
  { x: WORLD_CENTER.x - 70, y: WORLD_CENTER.y - 195 },
  { x: WORLD_CENTER.x - 32, y: WORLD_CENTER.y - 150 },
  { x: WORLD_CENTER.x, y: WORLD_CENTER.y - 210 },
  { x: WORLD_CENTER.x + 32, y: WORLD_CENTER.y - 150 },
  { x: WORLD_CENTER.x + 70, y: WORLD_CENTER.y - 195 },
  { x: WORLD_CENTER.x + 70, y: WORLD_CENTER.y - 120 },
  { x: WORLD_CENTER.x - 70, y: WORLD_CENTER.y - 120 },
];

// ---------------------------------------------------------------------------
// Landmark "stickers" (decorative, never solid)
// ---------------------------------------------------------------------------

export type LandmarkKind =
  | 'console'
  | 'cup'
  | 'notebook'
  | 'tree'
  | 'eyed-bush'
  | 'bandage'
  | 'stump'
  | 'star'
  | 'pencil'
  | 'flag'
  | 'fence';

export interface Landmark {
  kind: LandmarkKind;
  x: number;
  y: number;
  /** Approximate footprint size in world units. */
  size: number;
  /** Tilt in radians. */
  tilt: number;
}

const landmark = (kind: LandmarkKind, deg: number, inset: number, size: number, tilt = 0): Landmark => {
  const point = outlineAnchor(deg, inset);
  return { kind, x: Math.round(point.x), y: Math.round(point.y), size, tilt };
};

export const LANDMARKS: ReadonlyArray<Landmark> = [
  landmark('console', -140, 0.82, 400, -0.12),
  landmark('tree', -101, 0.84, 340),
  landmark('eyed-bush', -80, 0.85, 300),
  landmark('flag', -64, 0.82, 260, 0.12),
  landmark('cup', -42, 0.82, 360, 0.08),
  landmark('notebook', 8, 0.84, 340, 0.14),
  landmark('star', 44, 0.8, 190, 0.2),
  landmark('pencil', 28, 0.76, 340, -0.55),
  landmark('fence', 90, 0.8, 360),
  landmark('stump', 140, 0.82, 320, -0.05),
  landmark('bandage', 184, 0.82, 330, -0.5),
];

// ---------------------------------------------------------------------------
// Scatter: bushes, flowers, tufts, pebbles
// ---------------------------------------------------------------------------

export interface BushPlacement {
  x: number;
  y: number;
  size: number;
  flipX: boolean;
}

function buildBushes(): BushPlacement[] {
  const random = createSeededRandom(7788);
  const bushes: BushPlacement[] = [];
  const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

  // 2-3 bushes hugging each rock cluster, on the side facing away from the center.
  for (const cluster of ROCK_CLUSTERS) {
    const awayAngle = Math.atan2(cluster.y - WORLD_CENTER.y, cluster.x - WORLD_CENTER.x);
    const count = cluster.members.length >= 3 ? 3 : 2;
    for (let index = 0; index < count; index += 1) {
      const member = cluster.members[index % cluster.members.length];
      const radius = member.size * 0.33;
      const angle = awayAngle + (index - (count - 1) / 2) * 1.1 + (random() - 0.5) * 0.5;
      const size = 82 + Math.round(random() * 30);
      bushes.push({
        x: Math.round(member.x + Math.cos(angle) * (radius + size * 0.32)),
        y: Math.round(member.y + Math.sin(angle) * (radius + size * 0.32)),
        size,
        flipX: random() > 0.5,
      });
    }
  }

  // Thicket groups tucked into the outer lobes next to the landmarks.
  const thicketAngles: ReadonlyArray<readonly [number, number]> = [
    [-155, 0.9], [-120, 0.9], [-90, 0.78], [-52, 0.9], [-12, 0.9], [20, 0.88], [60, 0.9], [112, 0.88], [155, 0.9], [-176, 0.9], [78, 0.76], [-32, 0.74],
  ];
  for (const [deg, inset] of thicketAngles) {
    const base = outlineAnchor(deg, inset);
    const count = 3 + Math.floor(random() * 2);
    for (let index = 0; index < count; index += 1) {
      const size = 78 + Math.round(random() * 34);
      const point = { x: base.x + (random() - 0.5) * 230, y: base.y + (random() - 0.5) * 170 };
      if (dist(point, WORLD_CENTER) > CENTRAL_CLEARING_RADIUS + 200 && isInsideWorldOutline(point.x, point.y)) {
        bushes.push({ x: Math.round(point.x), y: Math.round(point.y), size, flipX: random() > 0.5 });
      }
    }
  }

  // A few loose bushes along path edges inside the start view for visual rhythm.
  for (const offset of [[-420, -250], [660, -230], [380, 330], [-560, 300], [20, -450]]) {
    bushes.push({
      x: WORLD_CENTER.x + offset[0],
      y: WORLD_CENTER.y + offset[1],
      size: 76 + Math.round(random() * 24),
      flipX: random() > 0.5,
    });
  }

  return bushes;
}

export const BUSHES: ReadonlyArray<BushPlacement> = buildBushes();

export interface Flower {
  x: number;
  y: number;
  color: number;
  scale: number;
}

function buildFlowers(): Flower[] {
  const random = createSeededRandom(4242);
  const colors = [0xffffff, 0xf8a5c2, 0xffe27a, 0xffffff];
  const flowers: Flower[] = [];
  for (let attempt = 0; attempt < 600 && flowers.length < 46; attempt += 1) {
    const point = { x: 200 + random() * (WORLD_WIDTH - 400), y: 200 + random() * (WORLD_HEIGHT - 400) };
    if (
      !isInsideWorldOutline(point.x, point.y) ||
      Math.hypot(point.x - WORLD_CENTER.x, point.y - WORLD_CENTER.y) < 560 ||
      SOLID_ROCKS.some((rock) => Math.hypot(point.x - rock.x, point.y - rock.y) < rock.radius + 30)
    ) {
      continue;
    }
    flowers.push({ x: Math.round(point.x), y: Math.round(point.y), color: colors[flowers.length % colors.length], scale: 0.8 + random() * 0.7 });
  }
  return flowers;
}

export const FLOWERS: ReadonlyArray<Flower> = buildFlowers();

export interface Tuft {
  x: number;
  y: number;
  scale: number;
}

function buildTufts(): Tuft[] {
  const random = createSeededRandom(909);
  const tufts: Tuft[] = [];
  for (let attempt = 0; attempt < 900 && tufts.length < 170; attempt += 1) {
    const point = { x: 150 + random() * (WORLD_WIDTH - 300), y: 150 + random() * (WORLD_HEIGHT - 300) };
    if (!isInsideWorldOutline(point.x, point.y)) {
      continue;
    }
    tufts.push({ x: Math.round(point.x), y: Math.round(point.y), scale: 0.7 + random() * 0.8 });
  }
  return tufts;
}

export const TUFTS: ReadonlyArray<Tuft> = buildTufts();

/** Small non-solid pebbles scattered on the ground (visual only). */
export const PEBBLES: ReadonlyArray<{ x: number; y: number; size: number }> = (() => {
  const random = createSeededRandom(31337);
  const pebbles: Array<{ x: number; y: number; size: number }> = [];
  for (let attempt = 0; attempt < 400 && pebbles.length < 40; attempt += 1) {
    const point = { x: 220 + random() * (WORLD_WIDTH - 440), y: 220 + random() * (WORLD_HEIGHT - 440) };
    if (
      isInsideWorldOutline(point.x, point.y) &&
      Math.hypot(point.x - WORLD_CENTER.x, point.y - WORLD_CENTER.y) > 300 &&
      !SOLID_ROCKS.some((rock) => Math.hypot(point.x - rock.x, point.y - rock.y) < rock.radius + 40)
    ) {
      pebbles.push({ x: Math.round(point.x), y: Math.round(point.y), size: 18 + Math.round(random() * 18) });
    }
  }
  return pebbles;
})();

export interface EdgePebble {
  x: number;
  y: number;
  rotation: number;
  flipX: boolean;
}

/** Pebble rim hugging the inside of the playable outline. */
export const EDGE_PEBBLES: ReadonlyArray<EdgePebble> = WORLD_OUTLINE.filter((_, index) => index % 6 === 0).map((point, index) => {
  const toCenterX = WORLD_CENTER.x - point.x;
  const toCenterY = WORLD_CENTER.y - point.y;
  const length = Math.hypot(toCenterX, toCenterY) || 1;
  return {
    x: Math.round(point.x + (toCenterX / length) * 62),
    y: Math.round(point.y + (toCenterY / length) * 62),
    rotation: Math.atan2(toCenterY, toCenterX) + Math.PI / 2,
    flipX: index % 2 === 0,
  };
});

export interface Drip {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Slimy drips hanging off the lower edges of the island. */
export const DRIPS: ReadonlyArray<Drip> = (() => {
  const random = createSeededRandom(5150);
  const drips: Drip[] = [];
  WORLD_OUTLINE.forEach((point, index) => {
    const next = WORLD_OUTLINE[(index + 1) % WORLD_OUTLINE.length];
    const tangentX = next.x - point.x;
    const tangentY = next.y - point.y;
    // Only along the lower half of the silhouette where edges face down.
    if (index % 5 === 0 && point.y > WORLD_CENTER.y - 200 && Math.abs(tangentX) > Math.abs(tangentY) * 0.8 && random() > 0.35) {
      drips.push({ x: point.x, y: point.y + 30, width: 40 + random() * 34, height: 90 + random() * 90 });
    }
  });
  return drips;
})();

export const CLOUDS: ReadonlyArray<{ x: number; y: number; rx: number; ry: number }> = (() => {
  const random = createSeededRandom(2024);
  const clouds: Array<{ x: number; y: number; rx: number; ry: number }> = [];
  for (let attempt = 0; attempt < 900 && clouds.length < 36; attempt += 1) {
    const x = -260 + random() * (WORLD_WIDTH + 520);
    const y = -260 + random() * (WORLD_HEIGHT + 520);
    if (!isInsideWorldOutline(x, y)) {
      clouds.push({ x: Math.round(x), y: Math.round(y), rx: 120 + random() * 180, ry: 60 + random() * 80 });
    }
  }
  return clouds;
})();

export const SPARKLES: ReadonlyArray<{ x: number; y: number; size: number }> = (() => {
  const random = createSeededRandom(8080);
  const sparkles: Array<{ x: number; y: number; size: number }> = [];
  for (let attempt = 0; attempt < 600 && sparkles.length < 46; attempt += 1) {
    const x = -200 + random() * (WORLD_WIDTH + 400);
    const y = -200 + random() * (WORLD_HEIGHT + 400);
    if (!isInsideWorldOutline(x, y)) {
      sparkles.push({ x: Math.round(x), y: Math.round(y), size: 10 + random() * 16 });
    }
  }
  return sparkles;
})();
