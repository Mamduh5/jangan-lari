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

/** Radius around the arena center kept free of in-bounds decoration. */
export const ARENA_CENTER_CLEAR_RADIUS = 480;
/** In-bounds props live only in this band measured from the arena wall. */
export const ARENA_PROP_EDGE_BAND = { min: 80, max: 260 } as const;

const GROUND_BLOB_COUNT = 12;
const GROUND_BLOB_EDGE_INSET = 140;
const GROUND_BLOB_MIN_SPACING = 380;
const BOUNDARY_PEBBLE_SPACING = 320;
const BOUNDARY_PEBBLE_OUTSET = 30;

const IN_BOUNDS_PROP_ALPHA = 0.55;
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

    if (Math.hypot(x - centerX, y - centerY) < ARENA_CENTER_CLEAR_RADIUS) {
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
      alpha: 0.12,
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
  // Sparse, hand-placed rocks/bushes hugging the arena wall; center stays open.
  const specs: PropSpec[] = [
    ['prop-soft-bush', width * 0.08, 150, 64, false],
    ['prop-wobbly-rock', width * 0.29, 120, 56, true],
    ['prop-soft-bush', width * 0.73, 140, 60, true],
    ['prop-wobbly-rock', width - 200, 240, 60, false],
    ['prop-wobbly-rock', 130, height * 0.37, 52, false],
    ['prop-soft-bush', width - 120, height * 0.6, 62, true],
    ['prop-soft-bush', 200, height - 150, 66, false],
    ['prop-wobbly-rock', width * 0.36, height - 120, 54, true],
    ['prop-soft-bush', width * 0.64, height - 130, 58, false],
    ['prop-wobbly-rock', width - 230, height - 200, 60, true],
  ];

  return specs.map((spec) => toProp(spec, IN_BOUNDS_PROP_ALPHA));
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
