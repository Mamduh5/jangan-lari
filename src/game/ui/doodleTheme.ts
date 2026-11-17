import type Phaser from 'phaser';

export type DoodlePoint = {
  x: number;
  y: number;
};

/**
 * Shared handmade-doodle UI tokens aligned with the cream-paper concept
 * (`docs/art-direction/r3g-ui/approved-ui-concept.png`) and the island world palette.
 */
export const DOODLE_COLORS = {
  paper: 0xfdf7e7,
  paperWarm: 0xf4e7c8,
  paperHover: 0xfffdf5,
  paperPressed: 0xe7d5af,
  paperDisabled: 0xdcd4c0,
  paperDanger: 0xfee2e2,
  paperGold: 0xfef3c7,
  paperSky: 0xe0f2fe,
  paperPurple: 0xf3e8ff,
  paperPink: 0xfce7f3,
  ink: 0x1b1a22,
  inkMuted: 0x5b5247,
  inkShadow: 0x1b1a22,
  hp: 0xef5b6c,
  xp: 0x38bdf8,
  gold: 0xf5c84b,
  mint: 0x6ee787,
  danger: 0xdc2626,
  weaponWellDark: 0x2f374b,
  weaponWellLight: 0xf4e7c8,
} as const;

export const DOODLE_HEX = {
  paper: '#fdf7e7',
  paperWarm: '#f4e7c8',
  ink: '#1b1a22',
  inkMuted: '#5b5247',
  hp: '#ef5b6c',
  xp: '#38bdf8',
  gold: '#f5c84b',
  mint: '#6ee787',
  danger: '#dc2626',
} as const;

export const DOODLE_FONTS = {
  display: 'Georgia, serif',
  body: 'Trebuchet MS, sans-serif',
} as const;

export function createSeededDoodleRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates deterministic, gently wobbly points tracing a rounded-rectangle sticker.
 * Subtle amplitude keeps cards crisp and non-distracting at mobile scale.
 */
export function createWobblyRectPoints(
  cx: number,
  cy: number,
  width: number,
  height: number,
  cornerRadius: number,
  seed: number,
  jitter = 1.25,
  stepPx = 22,
): DoodlePoint[] {
  const halfW = Math.max(4, width / 2);
  const halfH = Math.max(4, height / 2);
  const radius = Math.max(2, Math.min(cornerRadius, halfW - 1, halfH - 1));
  const random = createSeededDoodleRandom(seed);

  const corners: Array<{ x: number; y: number; startAngle: number }> = [
    { x: cx + halfW - radius, y: cy - halfH + radius, startAngle: -Math.PI / 2 },
    { x: cx + halfW - radius, y: cy + halfH - radius, startAngle: 0 },
    { x: cx - halfW + radius, y: cy + halfH - radius, startAngle: Math.PI / 2 },
    { x: cx - halfW + radius, y: cy - halfH + radius, startAngle: Math.PI },
  ];

  const points: DoodlePoint[] = [];
  const arcSteps = Math.max(3, Math.round((Math.PI * radius) / 2 / 8));

  for (let cornerIdx = 0; cornerIdx < corners.length; cornerIdx += 1) {
    const corner = corners[cornerIdx];
    const nextCorner = corners[(cornerIdx + 1) % corners.length];

    for (let step = 0; step <= arcSteps; step += 1) {
      const t = step / arcSteps;
      const angle = corner.startAngle + t * (Math.PI / 2);
      const radialWobble = (random() - 0.5) * 2 * jitter * 0.7;
      const r = radius + radialWobble;
      points.push({
        x: corner.x + Math.cos(angle) * r,
        y: corner.y + Math.sin(angle) * r,
      });
    }

    const endAngle = corner.startAngle + Math.PI / 2;
    const edgeStart = {
      x: corner.x + Math.cos(endAngle) * radius,
      y: corner.y + Math.sin(endAngle) * radius,
    };
    const edgeEnd = {
      x: nextCorner.x + Math.cos(nextCorner.startAngle) * radius,
      y: nextCorner.y + Math.sin(nextCorner.startAngle) * radius,
    };
    const edgeLength = Math.hypot(edgeEnd.x - edgeStart.x, edgeEnd.y - edgeStart.y);
    const edgeSegments = Math.max(1, Math.round(edgeLength / stepPx));
    const nx = edgeLength > 0 ? -(edgeEnd.y - edgeStart.y) / edgeLength : 0;
    const ny = edgeLength > 0 ? (edgeEnd.x - edgeStart.x) / edgeLength : 0;

    for (let seg = 1; seg < edgeSegments; seg += 1) {
      const t = seg / edgeSegments;
      const wobble = (random() - 0.5) * 2 * jitter;
      points.push({
        x: edgeStart.x + (edgeEnd.x - edgeStart.x) * t + nx * wobble,
        y: edgeStart.y + (edgeEnd.y - edgeStart.y) * t + ny * wobble,
      });
    }
  }

  return points;
}

/**
 * Generates deterministic wobbly points around a circular sticker or button.
 */
export function createWobblyCirclePoints(
  cx: number,
  cy: number,
  radius: number,
  seed: number,
  segments = 24,
  jitter = 1.2,
): DoodlePoint[] {
  const random = createSeededDoodleRandom(seed);
  const count = Math.max(12, segments);
  const phaseA = random() * Math.PI * 2;
  const phaseB = random() * Math.PI * 2;

  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    const harmonic = 0.55 * Math.sin(2 * angle + phaseA) + 0.45 * Math.sin(3 * angle + phaseB);
    const micro = (random() - 0.5) * 0.7;
    const r = radius + (harmonic * 0.65 + micro) * jitter;
    return {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    };
  });
}

export type DoodleCardDrawOptions = {
  cx: number;
  cy: number;
  width: number;
  height: number;
  cornerRadius?: number;
  seed: number;
  jitter?: number;
  fillColor?: number;
  fillAlpha?: number;
  strokeColor?: number;
  strokeAlpha?: number;
  strokeWidth?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowAlpha?: number;
  clear?: boolean;
};

export function drawDoodleCard(graphics: Phaser.GameObjects.Graphics, opts: DoodleCardDrawOptions): void {
  if (opts.clear) {
    graphics.clear();
  }

  const points = createWobblyRectPoints(
    opts.cx,
    opts.cy,
    opts.width,
    opts.height,
    opts.cornerRadius ?? 12,
    opts.seed,
    opts.jitter ?? 1.25,
  );

  const shadowX = opts.shadowOffsetX ?? 2;
  const shadowY = opts.shadowOffsetY ?? 3;
  const shadowAlpha = opts.shadowAlpha ?? 0.28;
  if (shadowAlpha > 0 && (shadowX !== 0 || shadowY !== 0)) {
    const shadowPoints = points.map((p) => ({ x: p.x + shadowX, y: p.y + shadowY }));
    graphics.fillStyle(DOODLE_COLORS.inkShadow, shadowAlpha);
    graphics.fillPoints(shadowPoints, true, true);
  }

  graphics.fillStyle(opts.fillColor ?? DOODLE_COLORS.paper, opts.fillAlpha ?? 1);
  graphics.fillPoints(points, true, true);

  const strokeWidth = opts.strokeWidth ?? 2.5;
  if (strokeWidth > 0) {
    graphics.lineStyle(strokeWidth, opts.strokeColor ?? DOODLE_COLORS.ink, opts.strokeAlpha ?? 1);
    graphics.strokePoints(points, true, true);
  }
}

export function drawDoodleStrokeRect(
  graphics: Phaser.GameObjects.Graphics,
  opts: {
    cx: number;
    cy: number;
    width: number;
    height: number;
    cornerRadius?: number;
    seed: number;
    jitter?: number;
    strokeColor?: number;
    strokeAlpha?: number;
    strokeWidth?: number;
    clear?: boolean;
  },
): void {
  if (opts.clear) {
    graphics.clear();
  }

  const points = createWobblyRectPoints(
    opts.cx,
    opts.cy,
    opts.width,
    opts.height,
    opts.cornerRadius ?? 7,
    opts.seed,
    opts.jitter ?? 0.85,
  );
  graphics.lineStyle(opts.strokeWidth ?? 2.2, opts.strokeColor ?? DOODLE_COLORS.ink, opts.strokeAlpha ?? 1);
  graphics.strokePoints(points, true, true);
}

export type DoodleCircleDrawOptions = {
  cx: number;
  cy: number;
  radius: number;
  seed: number;
  jitter?: number;
  segments?: number;
  fillColor?: number;
  fillAlpha?: number;
  strokeColor?: number;
  strokeAlpha?: number;
  strokeWidth?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowAlpha?: number;
  clear?: boolean;
};

export function drawDoodleCircle(graphics: Phaser.GameObjects.Graphics, opts: DoodleCircleDrawOptions): void {
  if (opts.clear) {
    graphics.clear();
  }

  const points = createWobblyCirclePoints(
    opts.cx,
    opts.cy,
    opts.radius,
    opts.seed,
    opts.segments ?? 24,
    opts.jitter ?? 1.15,
  );

  const shadowX = opts.shadowOffsetX ?? 2;
  const shadowY = opts.shadowOffsetY ?? 3;
  const shadowAlpha = opts.shadowAlpha ?? 0.28;
  if (shadowAlpha > 0 && (shadowX !== 0 || shadowY !== 0)) {
    const shadowPoints = points.map((p) => ({ x: p.x + shadowX, y: p.y + shadowY }));
    graphics.fillStyle(DOODLE_COLORS.inkShadow, shadowAlpha);
    graphics.fillPoints(shadowPoints, true, true);
  }

  if ((opts.fillAlpha ?? 1) > 0) {
    graphics.fillStyle(opts.fillColor ?? DOODLE_COLORS.paper, opts.fillAlpha ?? 1);
    graphics.fillPoints(points, true, true);
  }

  const strokeWidth = opts.strokeWidth ?? 2.5;
  if (strokeWidth > 0) {
    graphics.lineStyle(strokeWidth, opts.strokeColor ?? DOODLE_COLORS.ink, opts.strokeAlpha ?? 1);
    graphics.strokePoints(points, true, true);
  }
}

export function drawDoodleClockGlyph(
  graphics: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  radius = 8,
  color: number = DOODLE_COLORS.ink,
): void {
  const ring = createWobblyCirclePoints(cx, cy, radius, 701, 14, 0.55);
  graphics.lineStyle(2, color, 1);
  graphics.strokePoints(ring, true, true);
  // Top winding nub and hands
  graphics.lineBetween(cx - 2, cy - radius - 2, cx + 2, cy - radius - 2);
  graphics.lineBetween(cx, cy, cx, cy - radius * 0.55);
  graphics.lineBetween(cx, cy, cx + radius * 0.45, cy + radius * 0.2);
}

export function drawDoodleShieldGlyph(
  graphics: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  halfSize = 7,
  fillColor: number = DOODLE_COLORS.xp,
  strokeColor: number = DOODLE_COLORS.ink,
): void {
  const pts: DoodlePoint[] = [
    { x: cx - halfSize, y: cy - halfSize * 0.78 },
    { x: cx, y: cy - halfSize * 0.98 },
    { x: cx + halfSize, y: cy - halfSize * 0.78 },
    { x: cx + halfSize * 0.85, y: cy + halfSize * 0.22 },
    { x: cx, y: cy + halfSize * 0.96 },
    { x: cx - halfSize * 0.85, y: cy + halfSize * 0.22 },
  ];
  graphics.fillStyle(fillColor, 0.95);
  graphics.fillPoints(pts, true, true);
  graphics.lineStyle(2, strokeColor, 1);
  graphics.strokePoints(pts, true, true);
}

export function formatCoreShieldLabel(mapBuffType: string, mapBuffRemainingMs: number): string | null {
  if (mapBuffType !== 'shield-pulse' || !Number.isFinite(mapBuffRemainingMs) || mapBuffRemainingMs <= 0) {
    return null;
  }

  const seconds = Math.max(1, Math.ceil(mapBuffRemainingMs / 1000));
  return `CORE SHIELD ${seconds}s`;
}
