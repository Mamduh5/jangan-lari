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


export const DOODLE_OVERLAY_COLORS = {
  goldRibbon: 0xfde047,
  breakthroughRibbon: 0xf9a8d4,
  breakthroughAccent: 0xf472b6,
  supportBadge: 0xd1fae5,
  weaponBadge: 0xfde68a,
  signatureBadge: 0xfbcfe8,
  branchBadge: 0xe9d5ff,
  archStone: 0x3b2a5e,
  archStoneDark: 0x241840,
  archGlow: 0xa855f7,
  archRune: 0xd8b4fe,
  twinAura: 0x2dd4bf,
  twinButton: 0x5eead4,
  twinWell: 0xccfbf1,
  sniperAura: 0xc084fc,
  sniperButton: 0xd8b4fe,
  sniperWell: 0xf3e8ff,
  starFill: 0xfacc15,
  starPink: 0xf472b6,
} as const;

export const DOODLE_OVERLAY_HEX = {
  supportBadge: '#d1fae5',
  weaponBadge: '#fde68a',
  signatureBadge: '#fbcfe8',
  branchBadge: '#e9d5ff',
  twinPill: '#5eead4',
  sniperPill: '#d8b4fe',
  evolutionTitle: '#fdf7e7',
  evolutionSubtitle: '#e9d5ff',
} as const;

export type DoodleTankVisualSpec = {
  hullColor: number;
  turretColor: number;
  barrelColor: number;
  barrelCount: 1 | 2;
  barrelLengthMultiplier: number;
  barrelWidthMultiplier: number;
};

function rotateDoodlePoint(
  dx: number,
  dy: number,
  cosA: number,
  sinA: number,
  cx: number,
  cy: number,
): DoodlePoint {
  return {
    x: cx + dx * cosA - dy * sinA,
    y: cy + dx * sinA + dy * cosA,
  };
}

function createRotatedBoxPoints(
  localX: number,
  localY: number,
  width: number,
  height: number,
  angleRad: number,
  cx: number,
  cy: number,
): DoodlePoint[] {
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);
  const hw = width / 2;
  const hh = height / 2;
  return [
    rotateDoodlePoint(localX - hw, localY - hh, cosA, sinA, cx, cy),
    rotateDoodlePoint(localX + hw, localY - hh, cosA, sinA, cx, cy),
    rotateDoodlePoint(localX + hw, localY + hh, cosA, sinA, cx, cy),
    rotateDoodlePoint(localX - hw, localY + hh, cosA, sinA, cx, cy),
  ];
}

export function drawDoodleStar(
  graphics: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  pointsCount = 5,
  fillColor: number = DOODLE_OVERLAY_COLORS.starFill,
  strokeColor: number = DOODLE_COLORS.ink,
  strokeWidth = 2,
  rotationOffset = -Math.PI / 2,
  fillAlpha = 1,
): void {
  const vertices: DoodlePoint[] = [];
  const total = pointsCount * 2;
  for (let i = 0; i < total; i += 1) {
    const angle = rotationOffset + (i * Math.PI) / pointsCount;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    vertices.push({
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    });
  }

  graphics.fillStyle(fillColor, fillAlpha);
  graphics.fillPoints(vertices, true, true);
  if (strokeWidth > 0) {
    graphics.lineStyle(strokeWidth, strokeColor, 1);
    graphics.strokePoints(vertices, true, true);
  }
}

export function drawDoodleUpgradeGlyph(
  graphics: Phaser.GameObjects.Graphics,
  rewardType: string,
  upgradeId: string,
  cx: number,
  cy: number,
  accentColor: number,
  kind?: string,
): void {
  const ink = DOODLE_COLORS.ink;

  if (kind === 'signature') {
    drawDoodleStar(graphics, cx, cy, 18, 8.5, 5, DOODLE_OVERLAY_COLORS.breakthroughAccent, ink, 2.2);
    drawDoodleStar(graphics, cx + 14, cy - 13, 6.5, 2.5, 4, DOODLE_COLORS.gold, ink, 1.5, 0);
    return;
  }

  if (kind === 'branch') {
    graphics.lineStyle(4, ink, 1);
    graphics.lineBetween(cx, cy + 16, cx, cy + 1);
    graphics.lineBetween(cx, cy + 1, cx - 12, cy - 12);
    graphics.lineBetween(cx, cy + 1, cx + 12, cy - 12);
    graphics.lineStyle(2.2, accentColor, 1);
    graphics.lineBetween(cx, cy + 15, cx, cy + 1);
    graphics.lineBetween(cx, cy + 1, cx - 12, cy - 12);
    graphics.lineBetween(cx, cy + 1, cx + 12, cy - 12);
    drawDoodleStar(graphics, cx - 12, cy - 12, 7.5, 3.2, 4, DOODLE_OVERLAY_COLORS.branchBadge, ink, 1.8, 0);
    drawDoodleStar(graphics, cx + 12, cy - 12, 7.5, 3.2, 4, DOODLE_COLORS.gold, ink, 1.8, 0);
    return;
  }

  if (rewardType === 'weapon') {
    const body = createRotatedBoxPoints(0, 0, 26, 11, -0.35, cx, cy);
    graphics.fillStyle(accentColor, 1);
    graphics.fillPoints(body, true, true);
    graphics.lineStyle(2.2, ink, 1);
    graphics.strokePoints(body, true, true);
    drawDoodleStar(graphics, cx + 14, cy - 6, 8, 3.5, 4, DOODLE_COLORS.gold, ink, 1.6, 0.2);
    return;
  }

  switch (upgradeId) {
    case 'vitality': {
      const heart: DoodlePoint[] = [
        { x: cx, y: cy + 14 },
        { x: cx - 15, y: cy },
        { x: cx - 15, y: cy - 9 },
        { x: cx - 8, y: cy - 14 },
        { x: cx, y: cy - 7 },
        { x: cx + 8, y: cy - 14 },
        { x: cx + 15, y: cy - 9 },
        { x: cx + 15, y: cy },
      ];
      graphics.fillStyle(DOODLE_COLORS.hp, 1);
      graphics.fillPoints(heart, true, true);
      graphics.lineStyle(2.2, ink, 1);
      graphics.strokePoints(heart, true, true);
      graphics.lineStyle(2.5, DOODLE_COLORS.paper, 1);
      graphics.lineBetween(cx - 5, cy - 1, cx + 5, cy - 1);
      graphics.lineBetween(cx, cy - 6, cx, cy + 4);
      return;
    }
    case 'swiftness': {
      graphics.lineStyle(4, ink, 1);
      graphics.lineBetween(cx - 12, cy - 10, cx - 2, cy);
      graphics.lineBetween(cx - 2, cy, cx - 12, cy + 10);
      graphics.lineBetween(cx + 2, cy - 10, cx + 12, cy);
      graphics.lineBetween(cx + 12, cy, cx + 2, cy + 10);
      graphics.lineStyle(2, DOODLE_COLORS.xp, 1);
      graphics.lineBetween(cx - 12, cy - 10, cx - 2, cy);
      graphics.lineBetween(cx - 2, cy, cx - 12, cy + 10);
      graphics.lineBetween(cx + 2, cy - 10, cx + 12, cy);
      graphics.lineBetween(cx + 12, cy, cx + 2, cy + 10);
      return;
    }
    case 'power': {
      const arrow: DoodlePoint[] = [
        { x: cx, y: cy - 16 },
        { x: cx + 14, y: cy - 2 },
        { x: cx + 6, y: cy - 2 },
        { x: cx + 6, y: cy + 14 },
        { x: cx - 6, y: cy + 14 },
        { x: cx - 6, y: cy - 2 },
        { x: cx - 14, y: cy - 2 },
      ];
      graphics.fillStyle(DOODLE_COLORS.gold, 1);
      graphics.fillPoints(arrow, true, true);
      graphics.lineStyle(2.2, ink, 1);
      graphics.strokePoints(arrow, true, true);
      return;
    }
    case 'rapid-fire': {
      for (const offsetY of [-9, 0, 9]) {
        const pill = createWobblyRectPoints(cx + (offsetY === 0 ? 4 : -2), cy + offsetY, 16, 6, 2.5, 41 + offsetY, 0.25, 6);
        graphics.fillStyle(DOODLE_COLORS.mint, 1);
        graphics.fillPoints(pill, true, true);
        graphics.lineStyle(1.8, ink, 1);
        graphics.strokePoints(pill, true, true);
      }
      return;
    }
    case 'velocity': {
      const bolt: DoodlePoint[] = [
        { x: cx + 5, y: cy - 16 },
        { x: cx - 10, y: cy + 1 },
        { x: cx - 1, y: cy + 1 },
        { x: cx - 5, y: cy + 16 },
        { x: cx + 11, y: cy - 2 },
        { x: cx + 2, y: cy - 2 },
      ];
      graphics.fillStyle(DOODLE_COLORS.xp, 1);
      graphics.fillPoints(bolt, true, true);
      graphics.lineStyle(2.2, ink, 1);
      graphics.strokePoints(bolt, true, true);
      return;
    }
    case 'magnet': {
      const horse: DoodlePoint[] = [
        { x: cx - 12, y: cy - 13 },
        { x: cx - 5, y: cy - 13 },
        { x: cx - 5, y: cy + 2 },
        { x: cx, y: cy + 7 },
        { x: cx + 5, y: cy + 2 },
        { x: cx + 5, y: cy - 13 },
        { x: cx + 12, y: cy - 13 },
        { x: cx + 12, y: cy + 5 },
        { x: cx, y: cy + 15 },
        { x: cx - 12, y: cy + 5 },
      ];
      graphics.fillStyle(DOODLE_COLORS.hp, 1);
      graphics.fillPoints(horse, true, true);
      graphics.lineStyle(2.2, ink, 1);
      graphics.strokePoints(horse, true, true);
      return;
    }
    case 'reach': {
      drawDoodleCircle(graphics, {
        cx,
        cy,
        radius: 15,
        fillColor: DOODLE_COLORS.paperSky,
        strokeColor: DOODLE_COLORS.xp,
        strokeWidth: 2.4,
        seed: 71,
        segments: 16,
        jitter: 0.4,
      });
      drawDoodleCircle(graphics, {
        cx,
        cy,
        radius: 6.5,
        fillColor: DOODLE_COLORS.gold,
        strokeColor: ink,
        strokeWidth: 2,
        seed: 72,
        segments: 12,
        jitter: 0.3,
      });
      return;
    }
    default: {
      drawDoodleStar(graphics, cx, cy, 15, 7, 5, DOODLE_COLORS.gold, ink, 2);
    }
  }
}

export function drawDoodleTankEmblem(
  graphics: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  visual: DoodleTankVisualSpec,
  wellFillColor: number,
  auraStrokeColor: number,
  scale = 1,
): void {
  const ink = DOODLE_COLORS.ink;
  const wellRadius = 56 * scale;

  drawDoodleCircle(graphics, {
    cx,
    cy,
    radius: wellRadius,
    fillColor: wellFillColor,
    strokeColor: ink,
    strokeWidth: 3,
    seed: visual.barrelCount === 2 ? 411 : 421,
    segments: 22,
    jitter: 1.1,
    shadowOffsetX: 2,
    shadowOffsetY: 3,
    shadowAlpha: 0.22,
  });

  const innerRing = createWobblyCirclePoints(cx, cy, wellRadius - 6 * scale, 433, 20, 0.7);
  graphics.lineStyle(2, auraStrokeColor, 0.85);
  graphics.strokePoints(innerRing, true, true);

  const angleRad = -0.18;
  const tankOriginX =
    cx - (visual.barrelCount === 1 && visual.barrelLengthMultiplier > 1.2 ? 16 : 10) * scale;
  const tankOriginY = cy + 3 * scale;

  // Ground doodle shadow beneath tank hull
  const shadowPoly = createRotatedBoxPoints(-2 * scale, 10 * scale, 50 * scale, 22 * scale, angleRad, tankOriginX, tankOriginY);
  graphics.fillStyle(DOODLE_COLORS.inkShadow, 0.16);
  graphics.fillPoints(shadowPoly, true, true);

  // Side treads / chassis hull based on TankClassVisualIdentity
  const topTread = createRotatedBoxPoints(-2 * scale, -14 * scale, 40 * scale, 11 * scale, angleRad, tankOriginX, tankOriginY);
  const botTread = createRotatedBoxPoints(-2 * scale, 14 * scale, 40 * scale, 11 * scale, angleRad, tankOriginX, tankOriginY);
  for (const tread of [topTread, botTread]) {
    graphics.fillStyle(visual.hullColor, 1);
    graphics.fillPoints(tread, true, true);
    graphics.lineStyle(2.5, ink, 1);
    graphics.strokePoints(tread, true, true);
  }

  // Barrels rendered directly from barrelCount, barrelLengthMultiplier, barrelWidthMultiplier
  const barrelLength = 30 * scale * visual.barrelLengthMultiplier;
  const barrelWidth = Math.max(7, 11.5 * scale * visual.barrelWidthMultiplier);
  const barrelStartX = 11 * scale;
  const barrelCenterX = barrelStartX + barrelLength / 2;
  const barrelOffsets = visual.barrelCount === 2 ? [-8 * scale, 8 * scale] : [0];

  for (const offsetY of barrelOffsets) {
    const barrelPts = createRotatedBoxPoints(
      barrelCenterX,
      offsetY,
      barrelLength,
      barrelWidth,
      angleRad,
      tankOriginX,
      tankOriginY,
    );
    graphics.fillStyle(visual.barrelColor, 1);
    graphics.fillPoints(barrelPts, true, true);
    graphics.lineStyle(2.6, ink, 1);
    graphics.strokePoints(barrelPts, true, true);

    const muzzleTip = createRotatedBoxPoints(
      barrelStartX + barrelLength - 2 * scale,
      offsetY,
      6 * scale,
      barrelWidth + 2 * scale,
      angleRad,
      tankOriginX,
      tankOriginY,
    );
    graphics.fillStyle(visual.turretColor, 1);
    graphics.fillPoints(muzzleTip, true, true);
    graphics.lineStyle(2.2, ink, 1);
    graphics.strokePoints(muzzleTip, true, true);
  }

  // Main hexagonal / chunky tank hull & turret dome
  const hullBody = createWobblyRectPoints(tankOriginX, tankOriginY, 38 * scale, 30 * scale, 9 * scale, 451, 0.9, 8);
  graphics.fillStyle(visual.hullColor, 1);
  graphics.fillPoints(hullBody, true, true);
  graphics.lineStyle(2.8, ink, 1);
  graphics.strokePoints(hullBody, true, true);

  drawDoodleCircle(graphics, {
    cx: tankOriginX,
    cy: tankOriginY,
    radius: 15.5 * scale,
    fillColor: visual.turretColor,
    strokeColor: ink,
    strokeWidth: 2.6,
    seed: 467,
    segments: 16,
    jitter: 0.65,
  });

  // Specular highlight dot on turret top-left
  const glint = createWobblyCirclePoints(tankOriginX - 5 * scale, tankOriginY - 5 * scale, 4.2 * scale, 479, 10, 0.25);
  graphics.fillStyle(DOODLE_COLORS.paperHover, 0.85);
  graphics.fillPoints(glint, true, true);
}

export function drawDoodleEvolutionArch(
  graphics: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  width: number,
  height: number,
): void {
  const ink = DOODLE_COLORS.ink;
  const leftX = cx - width / 2;
  const rightX = cx + width / 2;
  const bottomY = cy + height / 2;
  const pillarW = 74;
  const shoulderY = cy - height / 2 + 170;

  // Soft twilight portal aura behind archway opening
  const portalAura = createWobblyRectPoints(cx, cy + 28, width - 96, height - 96, 170, 811, 2.2, 20);
  graphics.fillStyle(0x2e1065, 0.44);
  graphics.fillPoints(portalAura, true, true);
  graphics.lineStyle(2, DOODLE_OVERLAY_COLORS.archGlow, 0.45);
  graphics.strokePoints(portalAura, true, true);

  const innerAura = createWobblyRectPoints(cx, cy + 36, width - 160, height - 148, 130, 823, 1.8, 22);
  graphics.fillStyle(0x4c1d95, 0.3);
  graphics.fillPoints(innerAura, true, true);

  // Carved stone pillars (left & right blocks)
  const blockCount = 4;
  const blockH = (bottomY - shoulderY) / blockCount;
  for (let i = 0; i < blockCount; i += 1) {
    const by = shoulderY + blockH * i + blockH / 2;
    for (const side of [-1, 1] as const) {
      const bx = side < 0 ? leftX + pillarW / 2 : rightX - pillarW / 2;
      drawDoodleCard(graphics, {
        cx: bx,
        cy: by,
        width: pillarW - 4,
        height: blockH - 4,
        cornerRadius: 10,
        seed: 830 + i * 7 + (side < 0 ? 1 : 2),
        jitter: 1.3,
        fillColor: i % 2 === 0 ? DOODLE_OVERLAY_COLORS.archStone : DOODLE_OVERLAY_COLORS.archStoneDark,
        strokeColor: ink,
        strokeWidth: 3,
        shadowOffsetX: side < 0 ? -3 : 3,
        shadowOffsetY: 3,
        shadowAlpha: 0.4,
      });

      // Glowing carved rune diamond on middle pillar stones
      if (i === 1 || i === 2) {
        drawDoodleStar(
          graphics,
          bx,
          by,
          10,
          4.5,
          4,
          DOODLE_OVERLAY_COLORS.archRune,
          ink,
          1.6,
          0,
          0.9,
        );
      }
    }
  }

  // Curved top stone arch stones (voussoirs)
  const archSegments = 9;
  const archRxOuter = width / 2;
  const archRxInner = width / 2 - pillarW + 4;
  const archRyOuter = shoulderY - (cy - height / 2);
  const archRyInner = Math.max(40, archRyOuter - 64);

  for (let i = 0; i < archSegments; i += 1) {
    const a0 = Math.PI + (i / archSegments) * Math.PI;
    const a1 = Math.PI + ((i + 1) / archSegments) * Math.PI;
    const stone: DoodlePoint[] = [
      { x: cx + Math.cos(a0) * archRxOuter, y: shoulderY + Math.sin(a0) * archRyOuter },
      { x: cx + Math.cos(a1) * archRxOuter, y: shoulderY + Math.sin(a1) * archRyOuter },
      { x: cx + Math.cos(a1) * archRxInner, y: shoulderY + Math.sin(a1) * archRyInner },
      { x: cx + Math.cos(a0) * archRxInner, y: shoulderY + Math.sin(a0) * archRyInner },
    ];
    const isKeystone = i === Math.floor(archSegments / 2);
    graphics.fillStyle(
      isKeystone
        ? 0x5b21b6
        : i % 2 === 0
          ? DOODLE_OVERLAY_COLORS.archStone
          : DOODLE_OVERLAY_COLORS.archStoneDark,
      1,
    );
    graphics.fillPoints(stone, true, true);
    graphics.lineStyle(3, ink, 1);
    graphics.strokePoints(stone, true, true);
  }

  // Subtle top keystone gem and side sparkles
  const apexY = cy - height / 2 + 28;
  drawDoodleStar(graphics, cx, apexY, 16, 7, 4, DOODLE_OVERLAY_COLORS.archGlow, ink, 2, 0);
  drawDoodleStar(graphics, leftX + 26, shoulderY - 60, 10, 4, 4, DOODLE_OVERLAY_COLORS.twinAura, ink, 1.5, 0.25, 0.9);
  drawDoodleStar(graphics, rightX - 26, shoulderY - 60, 10, 4, 4, DOODLE_OVERLAY_COLORS.sniperAura, ink, 1.5, 0.25, 0.9);
  drawDoodleStar(graphics, leftX + 20, bottomY - 48, 8, 3.2, 4, DOODLE_OVERLAY_COLORS.archRune, ink, 1.4, 0, 0.8);
  drawDoodleStar(graphics, rightX - 20, bottomY - 48, 8, 3.2, 4, DOODLE_OVERLAY_COLORS.archRune, ink, 1.4, 0, 0.8);
}


export function drawDoodleRankPips(
  graphics: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  maxRank: number,
  currentRank: number,
  fillColor: number,
  muted = false,
): void {
  const count = Math.max(1, maxRank);
  const pipW = 18;
  const pipH = 8;
  const stepX = 22;
  const startX = cx - ((count - 1) * stepX) / 2;

  for (let i = 0; i < count; i += 1) {
    const px = startX + i * stepX;
    const isFilled = i < currentRank;
    const points = createWobblyRectPoints(px, cy, pipW, pipH, 2.5, 601 + i * 11, 0.28, 6);
    graphics.fillStyle(
      isFilled ? fillColor : muted ? DOODLE_COLORS.paperDisabled : DOODLE_COLORS.paperWarm,
      isFilled ? (muted ? 0.85 : 1) : 0.9,
    );
    graphics.fillPoints(points, true, true);
    graphics.lineStyle(1.8, muted && !isFilled ? DOODLE_COLORS.inkMuted : DOODLE_COLORS.ink, 1);
    graphics.strokePoints(points, true, true);
  }
}

export function drawDoodlePlayTriangle(
  graphics: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  radius: number,
  fillColor: number = DOODLE_COLORS.mint,
  strokeColor: number = DOODLE_COLORS.ink,
): void {
  const pts: DoodlePoint[] = [
    { x: cx - radius * 0.65, y: cy - radius * 0.85 },
    { x: cx + radius * 0.9, y: cy },
    { x: cx - radius * 0.65, y: cy + radius * 0.85 },
  ];
  graphics.fillStyle(fillColor, 1);
  graphics.fillPoints(pts, true, true);
  graphics.lineStyle(2.2, strokeColor, 1);
  graphics.strokePoints(pts, true, true);
}

export function drawDoodleRetryLoop(
  graphics: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  radius: number,
  strokeColor: number = DOODLE_COLORS.ink,
): void {
  const segments = 10;
  graphics.lineStyle(2.4, strokeColor, 1);
  for (let i = 0; i < segments; i += 1) {
    const a0 = -Math.PI * 0.85 + (i / segments) * (Math.PI * 1.55);
    const a1 = -Math.PI * 0.85 + ((i + 1) / segments) * (Math.PI * 1.55);
    graphics.lineBetween(
      cx + Math.cos(a0) * radius,
      cy + Math.sin(a0) * radius,
      cx + Math.cos(a1) * radius,
      cy + Math.sin(a1) * radius,
    );
  }
  const tipX = cx + Math.cos(-Math.PI * 0.85) * radius;
  const tipY = cy + Math.sin(-Math.PI * 0.85) * radius;
  graphics.lineBetween(tipX, tipY, tipX - 5, tipY + 1);
  graphics.lineBetween(tipX, tipY, tipX + 2, tipY - 5);
}

export function drawDoodleCloseX(
  graphics: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  radius: number,
  strokeColor: number = DOODLE_COLORS.ink,
): void {
  graphics.lineStyle(2.8, strokeColor, 1);
  graphics.lineBetween(cx - radius, cy - radius, cx + radius, cy + radius);
  graphics.lineBetween(cx + radius, cy - radius, cx - radius, cy + radius);
}

export function drawDoodleFieldNotebook(
  graphics: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  width: number,
  height: number,
): void {
  const ink = DOODLE_COLORS.ink;

  // Kraft cover backing peeking beneath the cream notebook sheet
  drawDoodleCard(graphics, {
    cx: cx + 5,
    cy: cy + 6,
    width: width + 16,
    height: height + 14,
    cornerRadius: 20,
    seed: 1011,
    jitter: 1.5,
    fillColor: 0xd9bc8c,
    strokeColor: ink,
    strokeWidth: 3.2,
    shadowOffsetX: 6,
    shadowOffsetY: 7,
    shadowAlpha: 0.45,
  });

  // Main cream field-notebook sheet
  drawDoodleCard(graphics, {
    cx,
    cy,
    width,
    height,
    cornerRadius: 16,
    seed: 1017,
    jitter: 1.3,
    fillColor: DOODLE_COLORS.paper,
    strokeColor: ink,
    strokeWidth: 3.2,
    shadowOffsetX: 2,
    shadowOffsetY: 2,
    shadowAlpha: 0.25,
  });

  // Faint ruled horizontal notebook lines across the sheet
  const leftEdge = cx - width / 2 + 44;
  const rightEdge = cx + width / 2 - 24;
  const topLineY = cy - height / 2 + 54;
  const lineStep = 34;
  graphics.lineStyle(1.4, DOODLE_COLORS.paperWarm, 0.95);
  for (let y = topLineY; y < cy + height / 2 - 24; y += lineStep) {
    graphics.lineBetween(leftEdge, y, rightEdge, y);
  }

  // Left pink margin line
  graphics.lineStyle(1.8, DOODLE_COLORS.hp, 0.28);
  graphics.lineBetween(cx - width / 2 + 42, cy - height / 2 + 16, cx - width / 2 + 42, cy + height / 2 - 16);

  // Spiral notebook wire rings on the left spine
  const ringX = cx - width / 2 + 12;
  const ringCount = 7;
  const ringStartY = cy - height / 2 + 64;
  const ringGap = (height - 128) / (ringCount - 1);
  for (let i = 0; i < ringCount; i += 1) {
    const ry = ringStartY + i * ringGap;
    drawDoodleCircle(graphics, {
      cx: ringX + 12,
      cy: ry,
      radius: 6,
      fillColor: ink,
      strokeColor: ink,
      strokeWidth: 1,
      seed: 1030 + i * 7,
      segments: 10,
      jitter: 0.25,
    });
    const wireLoop = createWobblyRectPoints(ringX - 2, ry, 24, 9, 4, 1050 + i * 9, 0.35, 8);
    graphics.fillStyle(DOODLE_COLORS.paperHover, 1);
    graphics.fillPoints(wireLoop, true, true);
    graphics.lineStyle(2.4, ink, 1);
    graphics.strokePoints(wireLoop, true, true);
  }

  // Small masking-tape sticker on the top-right corner
  const tapePts = createRotatedBoxPoints(0, 0, 74, 22, 0.42, cx + width / 2 - 34, cy - height / 2 + 18);
  graphics.fillStyle(DOODLE_COLORS.paperGold, 0.92);
  graphics.fillPoints(tapePts, true, true);
  graphics.lineStyle(2, ink, 0.85);
  graphics.strokePoints(tapePts, true, true);
}

export function drawDoodleVictoryCrown(
  graphics: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  scale = 1,
): void {
  const ink = DOODLE_COLORS.ink;
  const w = 18 * scale;
  const h = 13 * scale;
  const crown: DoodlePoint[] = [
    { x: cx - w, y: cy + h * 0.7 },
    { x: cx - w * 1.08, y: cy - h * 0.55 },
    { x: cx - w * 0.4, y: cy + h * 0.05 },
    { x: cx, y: cy - h },
    { x: cx + w * 0.4, y: cy + h * 0.05 },
    { x: cx + w * 1.08, y: cy - h * 0.55 },
    { x: cx + w, y: cy + h * 0.7 },
  ];
  graphics.fillStyle(DOODLE_COLORS.gold, 1);
  graphics.fillPoints(crown, true, true);
  graphics.lineStyle(2.4, ink, 1);
  graphics.strokePoints(crown, true, true);

  drawDoodleCircle(graphics, {
    cx,
    cy: cy + h * 0.25,
    radius: 4 * scale,
    fillColor: DOODLE_COLORS.mint,
    strokeColor: ink,
    strokeWidth: 1.8,
    seed: 1121,
    segments: 10,
    jitter: 0.2,
  });
}

export function drawDoodleDefeatSticker(
  graphics: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  scale = 1,
): void {
  const ink = DOODLE_COLORS.ink;
  const r = 15 * scale;
  drawDoodleCircle(graphics, {
    cx,
    cy,
    radius: r,
    fillColor: 0xddd6fe,
    strokeColor: ink,
    strokeWidth: 2.2,
    seed: 1151,
    segments: 14,
    jitter: 0.9,
    shadowOffsetX: 2,
    shadowOffsetY: 2,
    shadowAlpha: 0.28,
  });

  // Mini tilted coral crack / X eyes on defeated blob sticker
  const eyeOffX = 5 * scale;
  const eyeY = cy - 2 * scale;
  const eyeR = 2.6 * scale;
  graphics.lineStyle(2, ink, 1);
  graphics.lineBetween(cx - eyeOffX - eyeR, eyeY - eyeR, cx - eyeOffX + eyeR, eyeY + eyeR);
  graphics.lineBetween(cx - eyeOffX + eyeR, eyeY - eyeR, cx - eyeOffX - eyeR, eyeY + eyeR);
  graphics.lineBetween(cx + eyeOffX - eyeR, eyeY - eyeR, cx + eyeOffX + eyeR, eyeY + eyeR);
  graphics.lineBetween(cx + eyeOffX + eyeR, eyeY - eyeR, cx + eyeOffX - eyeR, eyeY + eyeR);

  graphics.lineStyle(2.2, DOODLE_COLORS.hp, 1);
  graphics.lineBetween(cx - 5 * scale, cy + 6 * scale, cx + 5 * scale, cy + 4 * scale);
}
