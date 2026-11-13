import type { VisualAssetRuntimeCategory } from './visualAssetRuntimeConfig';

/**
 * R3F decorative arena environment layout.
 *
 * Render-only: these placements never create physics bodies and never feed
 * spawn, collision, pickup, or map-event logic. Every depth is negative so all
 * gameplay objects (default depth >= 0), telegraphs, HP bars and HUD stay above.
 */

export type ArenaEnvironmentCategory = Extract<VisualAssetRuntimeCategory, 'tiles' | 'mapProps'>;

export interface ArenaDecorationPlacement {
  key: string;
  category: ArenaEnvironmentCategory;
  x: number;
  y: number;
  displaySize: number;
  rotation: number;
  alpha: number;
  depth: number;
  flipX: boolean;
  tint?: number;
}

export const ARENA_ENVIRONMENT_DEPTH = {
  /** Procedural arena floor, grid and border graphics. */
  floor: -40,
  /** Faint ground blobs sitting on the floor. */
  ground: -35,
  /** Arena center marker (kept above ground blobs). */
  centerMarker: -32,
  /** Pebble edging outside the arena border. */
  boundary: -30,
  /** Sparse rocks, bushes, and outer-corner landmarks. */
  props: -25,
} as const;

/**
 * Radius around the player spawn (arena center) kept free of decoration so the
 * hero is never visually tangled with a prop at run start.
 */
export const ARENA_SPAWN_CLEAR_RADIUS = 220;
/** @deprecated R3F name kept for compatibility; equals the spawn clear radius. */
export const ARENA_CENTER_CLEAR_RADIUS = ARENA_SPAWN_CLEAR_RADIUS;
/** In-bounds props keep at least this distance from the arena wall. */
export const ARENA_PROP_WALL_MARGIN = 80;
/** Minimum spacing between in-bounds rocks/bushes for combat readability. */
export const ARENA_PROP_MIN_SPACING = 240;

const GROUND_BLOB_COUNT = 16;
const GROUND_BLOB_EDGE_INSET = 140;
const GROUND_BLOB_MIN_SPACING = 340;
const GROUND_BLOB_ALPHA = 0.22;
const BOUNDARY_PEBBLE_SPACING = 320;
const BOUNDARY_PEBBLE_OUTSET = 30;

const OUTER_PROP_ALPHA = 0.8;

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildGroundBlobs(width: number, height: number): ArenaDecorationPlacement[] {
  const random = createSeededRandom(0x52334623);
  const centerX = width / 2;
  const centerY = height / 2;
  const placements: ArenaDecorationPlacement[] = [];

  for (let attempt = 0; attempt < 400 && placements.length < GROUND_BLOB_COUNT; attempt += 1) {
    const x = GROUND_BLOB_EDGE_INSET + random() * (width - GROUND_BLOB_EDGE_INSET * 2);
    const y = GROUND_BLOB_EDGE_INSET + random() * (height - GROUND_BLOB_EDGE_INSET * 2);
    const size = 150 + random() * 70;
    const rotation = (random() - 0.5) * 0.6;
    const flipX = random() > 0.5;

    if (Math.hypot(x - centerX, y - centerY) < ARENA_SPAWN_CLEAR_RADIUS) {
      continue;
    }

    if (placements.some((other) => Math.hypot(other.x - x, other.y - y) < GROUND_BLOB_MIN_SPACING)) {
      continue;
    }

    placements.push({
      key: 'tile-ground-blob',
      category: 'tiles',
      x: Math.round(x),
      y: Math.round(y),
      displaySize: Math.round(size),
      rotation,
      alpha: GROUND_BLOB_ALPHA,
      depth: ARENA_ENVIRONMENT_DEPTH.ground,
      flipX,
      tint: 0x93a4bd,
    });
  }

  return placements;
}

function buildBoundaryPebbles(width: number, height: number): ArenaDecorationPlacement[] {
  const placements: ArenaDecorationPlacement[] = [];
  const base = {
    key: 'tile-boundary-pebble',
    category: 'tiles' as const,
    displaySize: 150,
    alpha: 0.85,
    depth: ARENA_ENVIRONMENT_DEPTH.boundary,
  };

  let index = 0;
  for (let x = BOUNDARY_PEBBLE_SPACING / 2; x < width; x += BOUNDARY_PEBBLE_SPACING) {
    placements.push({ ...base, x, y: -BOUNDARY_PEBBLE_OUTSET, rotation: 0, flipX: index % 2 === 0 });
    placements.push({ ...base, x, y: height + BOUNDARY_PEBBLE_OUTSET, rotation: 0, flipX: index % 2 === 1 });
    index += 1;
  }

  for (let y = BOUNDARY_PEBBLE_SPACING / 2; y < height; y += BOUNDARY_PEBBLE_SPACING) {
    placements.push({ ...base, x: -BOUNDARY_PEBBLE_OUTSET, y, rotation: Math.PI / 2, flipX: index % 2 === 0 });
    placements.push({ ...base, x: width + BOUNDARY_PEBBLE_OUTSET, y, rotation: Math.PI / 2, flipX: index % 2 === 1 });
    index += 1;
  }

  return placements;
}

type PropSpec = [key: string, x: number, y: number, size: number, flipX: boolean];

function toProp([key, x, y, size, flipX]: PropSpec, alpha: number): ArenaDecorationPlacement {
  return {
    key,
    category: 'mapProps',
    x: Math.round(x),
    y: Math.round(y),
    displaySize: size,
    rotation: 0,
    alpha,
    depth: ARENA_ENVIRONMENT_DEPTH.props,
    flipX,
  };
}

function buildInBoundsProps(width: number, height: number): ArenaDecorationPlacement[] {
  const cx = width / 2;
  const cy = height / 2;
  type InBoundsSpec = [key: string, x: number, y: number, size: number, flipX: boolean, alpha: number];

  // Starting view cluster: offsets from the player spawn (arena center) so 8
  // rocks/bushes are on screen the moment a run begins. Irregular offsets avoid
  // grid/line repetition; the spawn clear radius stays open.
  const startingView: InBoundsSpec[] = [
    ['prop-soft-bush', cx - 560, cy - 250, 78, false, 0.82],
    ['prop-wobbly-rock', cx - 330, cy + 190, 70, true, 0.8],
    ['prop-soft-bush', cx - 190, cy - 230, 72, true, 0.78],
    ['prop-wobbly-rock', cx + 260, cy - 210, 74, false, 0.82],
    ['prop-soft-bush', cx + 420, cy + 170, 80, true, 0.8],
    ['prop-wobbly-rock', cx + 650, cy - 60, 68, true, 0.78],
    ['prop-wobbly-rock', cx - 660, cy + 90, 72, false, 0.8],
    ['prop-soft-bush', cx + 130, cy + 250, 76, false, 0.82],
  ];

  // Wider arena scatter, hand-placed across all regions (not only the walls).
  const scatter: InBoundsSpec[] = [
    ['prop-soft-bush', width * 0.1, height * 0.12, 80, false, 0.78],
    ['prop-wobbly-rock', width * 0.24, height * 0.22, 70, true, 0.78],
    ['prop-soft-bush', width * 0.42, height * 0.15, 76, true, 0.8],
    ['prop-wobbly-rock', width * 0.62, height * 0.1, 72, false, 0.78],
    ['prop-soft-bush', width * 0.81, height * 0.19, 82, false, 0.8],
    ['prop-wobbly-rock', width * 0.92, height * 0.08, 66, true, 0.78],
    ['prop-wobbly-rock', width * 0.075, height * 0.45, 74, false, 0.8],
    ['prop-soft-bush', width * 0.16, height * 0.68, 78, true, 0.78],
    ['prop-soft-bush', width * 0.86, height * 0.43, 80, false, 0.8],
    ['prop-wobbly-rock', width * 0.94, height * 0.63, 70, true, 0.78],
    ['prop-wobbly-rock', width * 0.12, height * 0.89, 72, true, 0.8],
    ['prop-soft-bush', width * 0.33, height * 0.83, 80, false, 0.78],
    ['prop-wobbly-rock', width * 0.49, height * 0.91, 68, false, 0.8],
    ['prop-soft-bush', width * 0.68, height * 0.8, 78, true, 0.8],
    ['prop-wobbly-rock', width * 0.85, height * 0.89, 74, false, 0.78],
  ];

  return [...startingView, ...scatter].map(([key, x, y, size, flipX, alpha]) =>
    toProp([key, x, y, size, flipX], alpha));
}

function buildOuterProps(width: number, height: number): ArenaDecorationPlacement[] {
  // Landmark-style props (altar/shrine) stay outside the playable border so
  // they never read as interactive map events or obstacles.
  const specs: PropSpec[] = [
    ['prop-tiny-shrine', -130, -110, 110, false],
    ['prop-risk-altar', width + 130, -110, 104, true],
    ['prop-risk-altar', -130, height + 110, 104, false],
    ['prop-tiny-shrine', width + 130, height + 110, 110, true],
    ['prop-soft-bush', width * 0.31, -110, 80, false],
    ['prop-wobbly-rock', width * 0.69, -115, 72, true],
    ['prop-wobbly-rock', width * 0.25, height + 110, 72, false],
    ['prop-soft-bush', width * 0.75, height + 105, 80, true],
    ['prop-soft-bush', -115, height * 0.5, 78, true],
    ['prop-wobbly-rock', width + 115, height * 0.36, 70, false],
  ];

  return specs.map((spec) => toProp(spec, OUTER_PROP_ALPHA));
}

export function buildArenaEnvironmentLayout(width: number, height: number): ArenaDecorationPlacement[] {
  return [
    ...buildGroundBlobs(width, height),
    ...buildBoundaryPebbles(width, height),
    ...buildInBoundsProps(width, height),
    ...buildOuterProps(width, height),
  ];
}
