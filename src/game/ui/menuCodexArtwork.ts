import type Phaser from 'phaser';
import type { HeroId } from '../data/heroes';
import {
  DOODLE_COLORS,
  type DoodlePoint,
  createSeededDoodleRandom,
  createWobblyCirclePoints,
  createWobblyRectPoints,
  drawDoodleCard,
  drawDoodleCircle,
  drawDoodlePlayTriangle,
  drawDoodleStar,
} from './doodleTheme';

export type HeroThemePalette = {
  ribbon: number;
  ribbonStroke: number;
  well: number;
  accent: number;
  cardTint: number;
};

export function getHeroThemePalette(heroId: HeroId): HeroThemePalette {
  switch (heroId) {
    case 'vanguard':
      return {
        ribbon: 0xe9d5ff,
        ribbonStroke: 0x7e22ce,
        well: 0xede9fe,
        accent: 0xa855f7,
        cardTint: 0xfaf5ff,
      };
    case 'shade':
      return {
        ribbon: 0x99f6e4,
        ribbonStroke: 0x0f766e,
        well: 0xccfbf1,
        accent: 0x14b8a6,
        cardTint: 0xf0fdfa,
      };
    case 'verdant':
      return {
        ribbon: 0xbbf7d0,
        ribbonStroke: 0x15803d,
        well: 0xdcfce7,
        accent: 0x22c55e,
        cardTint: 0xf0fdf4,
      };
    case 'runner':
    default:
      return {
        ribbon: 0xc7d2fe,
        ribbonStroke: 0x4338ca,
        well: 0xdbeafe,
        accent: 0x3b82f6,
        cardTint: 0xf0f9ff,
      };
  }
}

function createCloudStickerPoints(
  cx: number,
  cy: number,
  width: number,
  height: number,
  bumps: number,
  bumpDepth: number,
  seed: number,
): DoodlePoint[] {
  const rand = createSeededDoodleRandom(seed);
  const rx = width / 2;
  const ry = height / 2;
  const samples = bumps * 4;
  const points: DoodlePoint[] = [];

  for (let i = 0; i < samples; i += 1) {
    const theta = (i / samples) * Math.PI * 2;
    const lobe = Math.abs(Math.sin((theta * bumps) / 2));
    const jitter = (rand() - 0.5) * 2.2;
    const out = lobe * bumpDepth + jitter;
    points.push({
      x: cx + Math.cos(theta) * (rx + out),
      y: cy + Math.sin(theta) * (ry + out * 0.72),
    });
  }

  return points;
}

function drawMeadowBush(
  graphics: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  scale: number,
  seed: number,
): void {
  const ink = DOODLE_COLORS.ink;
  const lobes: Array<{ dx: number; dy: number; r: number }> = [
    { dx: -18 * scale, dy: 4 * scale, r: 16 * scale },
    { dx: 18 * scale, dy: 4 * scale, r: 16 * scale },
    { dx: 0, dy: -6 * scale, r: 22 * scale },
  ];

  // Outer shadow base
  for (const lobe of lobes) {
    const pts = createWobblyCirclePoints(cx + lobe.dx + 2, cy + lobe.dy + 3, lobe.r, seed + 1, 12, 0.8);
    graphics.fillStyle(ink, 0.28);
    graphics.fillPoints(pts, true, true);
  }
  for (const lobe of lobes) {
    const pts = createWobblyCirclePoints(cx + lobe.dx, cy + lobe.dy, lobe.r, seed + 5, 12, 0.8);
    graphics.fillStyle(0x55a630, 1);
    graphics.fillPoints(pts, true, true);
    graphics.lineStyle(2.6, ink, 1);
    graphics.strokePoints(pts, true, true);
  }
  const topHighlight = createWobblyCirclePoints(cx - 2 * scale, cy - 8 * scale, 15 * scale, seed + 9, 10, 0.6);
  graphics.fillStyle(0x8fd14f, 1);
  graphics.fillPoints(topHighlight, true, true);
}

function drawWildflower(
  graphics: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  petalColor: number,
  scale = 1,
): void {
  const ink = DOODLE_COLORS.ink;
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * Math.PI * 2;
    const px = cx + Math.cos(a) * 6.2 * scale;
    const py = cy + Math.sin(a) * 6.2 * scale;
    const petal = createWobblyCirclePoints(px, py, 4.2 * scale, 310 + i * 7, 8, 0.25);
    graphics.fillStyle(petalColor, 1);
    graphics.fillPoints(petal, true, true);
    graphics.lineStyle(1.4, ink, 0.9);
    graphics.strokePoints(petal, true, true);
  }
  drawDoodleCircle(graphics, {
    cx,
    cy,
    radius: 3.4 * scale,
    fillColor: DOODLE_COLORS.gold,
    strokeColor: ink,
    strokeWidth: 1.4,
    seed: 399,
    segments: 8,
    jitter: 0.2,
  });
}

function drawGrassSmileBlob(
  graphics: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  fillColor: number,
  radius: number,
): void {
  const ink = DOODLE_COLORS.ink;
  drawDoodleCircle(graphics, {
    cx,
    cy,
    radius,
    fillColor,
    strokeColor: ink,
    strokeWidth: 2.5,
    seed: 511,
    segments: 16,
    jitter: 1.0,
    shadowOffsetX: 2,
    shadowOffsetY: 3,
    shadowAlpha: 0.35,
  });
  drawDoodleCircle(graphics, {
    cx: cx - radius * 0.28,
    cy: cy - radius * 0.12,
    radius: 2.4,
    fillColor: ink,
    strokeColor: ink,
    strokeWidth: 1,
    seed: 512,
    segments: 8,
    jitter: 0,
  });
  drawDoodleCircle(graphics, {
    cx: cx + radius * 0.28,
    cy: cy - radius * 0.12,
    radius: 2.4,
    fillColor: ink,
    strokeColor: ink,
    strokeWidth: 1,
    seed: 513,
    segments: 8,
    jitter: 0,
  });
  graphics.lineStyle(2, ink, 1);
  graphics.lineBetween(cx - 4, cy + radius * 0.18, cx, cy + radius * 0.26);
  graphics.lineBetween(cx, cy + radius * 0.26, cx + 4, cy + radius * 0.18);
}

/**
 * Paints the twilight whimsical meadow diorama behind the Main Menu panels:
 * purple dusk gradient, stars, left explorer dome hut with pennant, right
 * glowing cyan stone portal with purple crystals, bushes, wildflowers, and grassy meadow floor.
 */
export function drawMenuIslandBackdrop(
  graphics: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
): void {
  const ink = DOODLE_COLORS.ink;

  // Twilight purple sky bands
  graphics.fillStyle(0x21183c, 1);
  graphics.fillRect(0, 0, width, height);
  graphics.fillStyle(0x2d2150, 0.9);
  graphics.fillRect(0, 150, width, height - 150);
  graphics.fillStyle(0x3e2d6b, 0.85);
  graphics.fillRect(0, 310, width, height - 310);

  // Twinkling sky stars
  const stars: Array<[number, number, number, number, number]> = [
    [548, 44, 14, 6, 4],
    [608, 68, 7, 3, 4],
    [820, 108, 9, 4, 5],
    [936, 40, 12, 5, 4],
    [130, 184, 8, 3.5, 4],
    [1478, 172, 11, 4.5, 5],
    [1546, 116, 7, 3, 4],
  ];
  for (const [sx, sy, outerR, innerR, pts] of stars) {
    drawDoodleStar(graphics, sx, sy, outerR, innerR, pts, DOODLE_COLORS.paperGold, ink, 1.4, 0, 0.92);
  }

  // Rolling distant meadow horizon hills
  const leftHill = createWobblyCirclePoints(220, 620, 290, 41, 24, 3.2);
  const rightHill = createWobblyCirclePoints(1380, 620, 290, 43, 24, 3.2);
  const centerMeadow = createWobblyRectPoints(width / 2, 670, width + 40, 150, 40, 47, 2.8, 24);
  for (const hill of [leftHill, rightHill, centerMeadow]) {
    graphics.fillStyle(0x64b33d, 1);
    graphics.fillPoints(hill, true, true);
    graphics.lineStyle(3, ink, 1);
    graphics.strokePoints(hill, true, true);
  }

  const grassBand = createWobblyRectPoints(width / 2, 686, width + 40, 118, 24, 49, 2.0, 24);
  graphics.fillStyle(0x7cc949, 1);
  graphics.fillPoints(grassBand, true, true);
  graphics.lineStyle(2.6, ink, 1);
  graphics.strokePoints(grassBand, true, true);

  // Left domed explorer hut & pennant flag (outside main cream stage x < 215)
  const hutCx = 104;
  const hutCy = 442;
  const hutBody: DoodlePoint[] = [
    { x: hutCx - 76, y: hutCy + 56 },
    { x: hutCx - 74, y: hutCy - 18 },
    { x: hutCx - 52, y: hutCy - 62 },
    { x: hutCx, y: hutCy - 82 },
    { x: hutCx + 52, y: hutCy - 62 },
    { x: hutCx + 74, y: hutCy - 18 },
    { x: hutCx + 76, y: hutCy + 56 },
  ];
  graphics.fillStyle(0xc5a8d1, 1);
  graphics.fillPoints(hutBody, true, true);
  graphics.lineStyle(3.2, ink, 1);
  graphics.strokePoints(hutBody, true, true);
  graphics.lineStyle(1.8, ink, 0.32);
  graphics.lineBetween(hutCx - 66, hutCy - 10, hutCx + 66, hutCy - 10);
  graphics.lineBetween(hutCx - 72, hutCy + 20, hutCx + 72, hutCy + 20);
  // Warm arched window in hut
  drawDoodleCircle(graphics, {
    cx: hutCx + 18,
    cy: hutCy + 4,
    radius: 17,
    fillColor: DOODLE_COLORS.gold,
    strokeColor: ink,
    strokeWidth: 2.6,
    seed: 81,
    segments: 14,
    jitter: 0.4,
  });
  // Rooftop flagpole & pennant
  graphics.lineStyle(3, ink, 1);
  graphics.lineBetween(hutCx - 2, hutCy - 80, hutCx - 2, hutCy - 122);
  const flagPts: DoodlePoint[] = [
    { x: hutCx, y: hutCy - 120 },
    { x: hutCx + 42, y: hutCy - 106 },
    { x: hutCx, y: hutCy - 92 },
  ];
  graphics.fillStyle(DOODLE_COLORS.hp, 1);
  graphics.fillPoints(flagPts, true, true);
  graphics.lineStyle(2.4, ink, 1);
  graphics.strokePoints(flagPts, true, true);

  // Right glowing cyan stone portal & crystal shard (outside main cream stage x > 1385)
  const portalCx = 1496;
  const portalCy = 436;
  const archOuter = createWobblyCirclePoints(portalCx, portalCy, 76, 91, 20, 2.1);
  graphics.fillStyle(0x4b3b75, 1);
  graphics.fillPoints(archOuter, true, true);
  graphics.lineStyle(3.2, ink, 1);
  graphics.strokePoints(archOuter, true, true);

  const portalGlow = createWobblyCirclePoints(portalCx, portalCy + 2, 54, 92, 18, 1.4);
  graphics.fillStyle(0x0ea5e9, 1);
  graphics.fillPoints(portalGlow, true, true);
  graphics.lineStyle(2.4, ink, 1);
  graphics.strokePoints(portalGlow, true, true);

  const portalCore = createWobblyCirclePoints(portalCx, portalCy + 2, 34, 93, 14, 1.1);
  graphics.fillStyle(0x67e8f9, 1);
  graphics.fillPoints(portalCore, true, true);
  const portalCenter = createWobblyCirclePoints(portalCx, portalCy + 2, 16, 94, 12, 0.6);
  graphics.fillStyle(0xecfeff, 1);
  graphics.fillPoints(portalCenter, true, true);

  // Crystal spire beside portal
  const crystalPts: DoodlePoint[] = [
    { x: 1412, y: 520 },
    { x: 1404, y: 472 },
    { x: 1422, y: 444 },
    { x: 1440, y: 472 },
    { x: 1434, y: 520 },
  ];
  graphics.fillStyle(0xa855f7, 1);
  graphics.fillPoints(crystalPts, true, true);
  graphics.lineStyle(2.6, ink, 1);
  graphics.strokePoints(crystalPts, true, true);

  // Lush corner bushes, boulders, smiling grass blobs & flowers
  drawMeadowBush(graphics, 56, 514, 1.25, 61);
  drawMeadowBush(graphics, 174, 526, 0.95, 63);
  drawMeadowBush(graphics, 1428, 528, 1.0, 65);
  drawMeadowBush(graphics, 1554, 510, 1.25, 67);
  drawMeadowBush(graphics, 94, 668, 1.05, 69);
  drawMeadowBush(graphics, 1524, 672, 1.05, 71);

  drawGrassSmileBlob(graphics, 156, 676, 0x99f6e4, 24);
  drawGrassSmileBlob(graphics, 1448, 672, 0xc4b5fd, 26);

  drawWildflower(graphics, 44, 588, DOODLE_COLORS.paperGold, 1.1);
  drawWildflower(graphics, 118, 608, 0xf9a8d4, 1.2);
  drawWildflower(graphics, 1388, 610, DOODLE_COLORS.paperGold, 1.1);
  drawWildflower(graphics, 1482, 588, 0xf9a8d4, 1.05);
}

/**
 * Draws the big scalloped cream-paper "Jangan Lari" logo cloud, tilted crown,
 * action ticks, and subtitle tag container.
 */
export function drawJanganLariHeaderLogo(
  graphics: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
): void {
  const ink = DOODLE_COLORS.ink;
  const shadowPts = createCloudStickerPoints(cx + 5, cy + 6, 434, 96, 12, 11, 701);
  graphics.fillStyle(DOODLE_COLORS.inkShadow, 0.42);
  graphics.fillPoints(shadowPts, true, true);

  const cloudPts = createCloudStickerPoints(cx, cy, 434, 96, 12, 11, 701);
  graphics.fillStyle(DOODLE_COLORS.paper, 1);
  graphics.fillPoints(cloudPts, true, true);
  graphics.lineStyle(3.5, ink, 1);
  graphics.strokePoints(cloudPts, true, true);

  // Cute gold crown tilted on top-left corner of logo cloud
  const crownCx = cx - 156;
  const crownCy = cy - 48;
  const crownPts: DoodlePoint[] = [
    { x: crownCx - 22, y: crownCy + 14 },
    { x: crownCx - 26, y: crownCy - 8 },
    { x: crownCx - 9, y: crownCy + 2 },
    { x: crownCx - 2, y: crownCy - 18 },
    { x: crownCx + 10, y: crownCy + 2 },
    { x: crownCx + 24, y: crownCy - 10 },
    { x: crownCx + 20, y: crownCy + 14 },
  ];
  graphics.fillStyle(DOODLE_COLORS.gold, 1);
  graphics.fillPoints(crownPts, true, true);
  graphics.lineStyle(2.6, ink, 1);
  graphics.strokePoints(crownPts, true, true);

  // Playful comic burst ticks around logo cloud
  graphics.lineStyle(3.2, DOODLE_COLORS.hp, 1);
  graphics.lineBetween(cx - 246, cy - 16, cx - 262, cy - 24);
  graphics.lineBetween(cx - 248, cy + 2, cx - 268, cy + 2);
  graphics.lineBetween(cx - 244, cy + 18, cx - 258, cy + 28);
  graphics.lineStyle(3.2, DOODLE_COLORS.gold, 1);
  graphics.lineBetween(cx + 242, cy - 14, cx + 258, cy - 22);
  graphics.lineBetween(cx + 244, cy + 4, cx + 264, cy + 4);
  graphics.lineBetween(cx + 240, cy + 20, cx + 254, cy + 30);

  // Subtitle pill below cloud sticker
  drawDoodleCard(graphics, {
    cx,
    cy: cy + 54,
    width: 304,
    height: 28,
    cornerRadius: 12,
    seed: 719,
    jitter: 0.7,
    fillColor: DOODLE_COLORS.paperWarm,
    strokeColor: ink,
    strokeWidth: 2.4,
    shadowOffsetX: 2,
    shadowOffsetY: 3,
    shadowAlpha: 0.32,
  });
}

export function drawMenuTopPillChrome(
  graphics: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  width: number,
  height: number,
  fillColor: number,
  kind: 'gold' | 'best' | 'guide',
  seed: number,
  hasGoldTexture = true,
): void {
  const ink = DOODLE_COLORS.ink;
  drawDoodleCard(graphics, {
    cx,
    cy,
    width,
    height,
    cornerRadius: 14,
    seed,
    jitter: 0.9,
    fillColor,
    strokeColor: ink,
    strokeWidth: 2.6,
    shadowOffsetX: 2,
    shadowOffsetY: 3,
    shadowAlpha: 0.34,
  });

  const iconCx = cx - width / 2 + 24;
  drawDoodleCircle(graphics, {
    cx: iconCx,
    cy,
    radius: 14,
    fillColor: kind === 'gold' ? DOODLE_COLORS.paperGold : kind === 'best' ? DOODLE_COLORS.paperGold : DOODLE_COLORS.paperHover,
    strokeColor: ink,
    strokeWidth: 2,
    seed: seed + 5,
    segments: 14,
    jitter: 0.35,
  });

  if (kind === 'gold' && !hasGoldTexture) {
    drawDoodleCircle(graphics, {
      cx: iconCx,
      cy,
      radius: 8,
      fillColor: DOODLE_COLORS.gold,
      strokeColor: ink,
      strokeWidth: 1.6,
      seed: seed + 9,
      segments: 12,
      jitter: 0.25,
    });
  } else if (kind === 'best') {
    drawDoodleStar(graphics, iconCx, cy, 9, 4.2, 5, DOODLE_COLORS.gold, ink, 1.5);
  } else if (kind === 'guide') {
    drawDoodleCircle(graphics, {
      cx: iconCx,
      cy,
      radius: 6.5,
      fillColor: DOODLE_COLORS.mint,
      strokeColor: ink,
      strokeWidth: 1.8,
      seed: seed + 13,
      segments: 10,
      jitter: 0.2,
    });
  }
}

/**
 * Draws the shared circular sticker medallion + character-specific doodle
 * accessories around each hero icon (`Runner` speed puff, `Vanguard` shield,
 * `Shade` teal bandana tails, `Verdant` double leaf sprout).
 */
export function drawHeroPortraitMedallion(
  graphics: Phaser.GameObjects.Graphics,
  heroId: HeroId,
  cx: number,
  cy: number,
  radius: number,
  includeBurst = false,
): void {
  const palette = getHeroThemePalette(heroId);
  const ink = DOODLE_COLORS.ink;

  if (includeBurst) {
    const burst = createCloudStickerPoints(cx, cy, radius * 2.4, radius * 2.1, 10, 12, 811);
    graphics.fillStyle(DOODLE_COLORS.paperGold, 0.72);
    graphics.fillPoints(burst, true, true);
    graphics.lineStyle(2.4, DOODLE_COLORS.gold, 0.9);
    graphics.lineBetween(cx + radius + 12, cy - radius * 0.55, cx + radius + 28, cy - radius * 0.85);
    graphics.lineBetween(cx + radius + 16, cy - 2, cx + radius + 34, cy - 4);
    graphics.lineBetween(cx + radius + 12, cy + radius * 0.5, cx + radius + 26, cy + radius * 0.78);
  }

  drawDoodleCircle(graphics, {
    cx,
    cy,
    radius,
    fillColor: palette.well,
    strokeColor: ink,
    strokeWidth: radius > 50 ? 3.2 : 2.4,
    seed: 830 + heroId.charCodeAt(0),
    segments: 20,
    jitter: 1.0,
    shadowOffsetX: 2,
    shadowOffsetY: 3,
    shadowAlpha: 0.26,
  });

  // Character-distinct corner accessory badge
  const ax = cx + radius * 0.68;
  const ay = cy + radius * 0.56;
  const s = radius / 44;

  if (heroId === 'runner') {
    const puff = createCloudStickerPoints(cx - radius * 0.78, cy - radius * 0.16, 22 * s, 14 * s, 6, 3 * s, 851);
    graphics.fillStyle(DOODLE_COLORS.paperHover, 1);
    graphics.fillPoints(puff, true, true);
    graphics.lineStyle(1.8, ink, 1);
    graphics.strokePoints(puff, true, true);
  } else if (heroId === 'vanguard') {
    const shield: DoodlePoint[] = [
      { x: ax - 9 * s, y: ay - 9 * s },
      { x: ax + 9 * s, y: ay - 9 * s },
      { x: ax + 9 * s, y: ay + 1 * s },
      { x: ax, y: ay + 11 * s },
      { x: ax - 9 * s, y: ay + 1 * s },
    ];
    graphics.fillStyle(0xa855f7, 1);
    graphics.fillPoints(shield, true, true);
    graphics.lineStyle(2, ink, 1);
    graphics.strokePoints(shield, true, true);
  } else if (heroId === 'shade') {
    const tail1: DoodlePoint[] = [
      { x: ax - 4 * s, y: ay - 3 * s },
      { x: ax + 13 * s, y: ay - 8 * s },
      { x: ax + 10 * s, y: ay + 1 * s },
    ];
    const tail2: DoodlePoint[] = [
      { x: ax - 4 * s, y: ay },
      { x: ax + 12 * s, y: ay + 5 * s },
      { x: ax + 7 * s, y: ay + 11 * s },
    ];
    for (const tail of [tail1, tail2]) {
      graphics.fillStyle(0x14b8a6, 1);
      graphics.fillPoints(tail, true, true);
      graphics.lineStyle(1.8, ink, 1);
      graphics.strokePoints(tail, true, true);
    }
  } else if (heroId === 'verdant') {
    const lx = cx;
    const ly = cy - radius * 0.92;
    const leftLeaf: DoodlePoint[] = [
      { x: lx, y: ly + 4 * s },
      { x: lx - 12 * s, y: ly - 4 * s },
      { x: lx - 8 * s, y: ly - 12 * s },
      { x: lx + 1 * s, y: ly - 3 * s },
    ];
    const rightLeaf: DoodlePoint[] = [
      { x: lx, y: ly + 4 * s },
      { x: lx + 12 * s, y: ly - 4 * s },
      { x: lx + 8 * s, y: ly - 12 * s },
      { x: lx - 1 * s, y: ly - 3 * s },
    ];
    for (const leaf of [leftLeaf, rightLeaf]) {
      graphics.fillStyle(0x4ade80, 1);
      graphics.fillPoints(leaf, true, true);
      graphics.lineStyle(1.8, ink, 1);
      graphics.strokePoints(leaf, true, true);
    }
  }
}

/**
 * Clean fallback character illustration used only when hero-*.png textures are absent or disabled.
 */
export function drawHeroFallbackMascot(
  graphics: Phaser.GameObjects.Graphics,
  heroId: HeroId,
  cx: number,
  cy: number,
  radius: number,
): void {
  const palette = getHeroThemePalette(heroId);
  const ink = DOODLE_COLORS.ink;
  drawDoodleCircle(graphics, {
    cx,
    cy,
    radius: radius * 0.62,
    fillColor: palette.accent,
    strokeColor: ink,
    strokeWidth: 2.6,
    seed: 877,
    segments: 16,
    jitter: 1.1,
  });
  drawDoodleCircle(graphics, {
    cx: cx + radius * 0.16,
    cy: cy - radius * 0.08,
    radius: radius * 0.14,
    fillColor: DOODLE_COLORS.paperHover,
    strokeColor: ink,
    strokeWidth: 1.6,
    seed: 879,
    segments: 10,
    jitter: 0.2,
  });
  drawDoodleCircle(graphics, {
    cx: cx + radius * 0.16,
    cy: cy - radius * 0.08,
    radius: Math.max(2, radius * 0.06),
    fillColor: ink,
    strokeColor: ink,
    strokeWidth: 1,
    seed: 880,
    segments: 8,
    jitter: 0,
  });
}

export function drawMenuBottomActionButtonChrome(
  graphics: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  width: number,
  height: number,
  kind: 'start' | 'upgrades' | 'codex' | 'lastRun',
  hovered: boolean,
  hasStartIcon = true,
): void {
  const ink = DOODLE_COLORS.ink;
  const fillColor =
    kind === 'start'
      ? hovered
        ? 0xfef08a
        : 0xfde047
      : kind === 'upgrades'
        ? hovered
          ? 0xe0f2fe
          : 0xbae6fd
        : kind === 'codex'
          ? hovered
            ? 0xf3e8ff
            : 0xe9d5ff
          : DOODLE_COLORS.paperWarm;

  drawDoodleCard(graphics, {
    cx,
    cy,
    width,
    height,
    cornerRadius: kind === 'start' ? 20 : 15,
    seed: 901 + kind.charCodeAt(0),
    jitter: 1.2,
    fillColor,
    strokeColor: ink,
    strokeWidth: kind === 'start' ? (hovered ? 4 : 3.5) : hovered ? 3.2 : 2.6,
    shadowOffsetX: kind === 'start' ? 4 : 2,
    shadowOffsetY: kind === 'start' ? 5 : 3,
    shadowAlpha: kind === 'start' ? 0.42 : 0.32,
  });

  if (kind === 'start') {
    graphics.lineStyle(3, ink, 0.9);
    graphics.lineBetween(cx - width / 2 - 14, cy - 12, cx - width / 2 - 26, cy - 18);
    graphics.lineBetween(cx - width / 2 - 14, cy + 10, cx - width / 2 - 26, cy + 16);
    graphics.lineBetween(cx + width / 2 + 14, cy - 12, cx + width / 2 + 26, cy - 18);
    graphics.lineBetween(cx + width / 2 + 14, cy + 10, cx + width / 2 + 26, cy + 16);
    if (!hasStartIcon) {
      drawDoodlePlayTriangle(graphics, cx - width / 2 + 42, cy, 11, ink, ink);
    }
    return;
  }

  const iconCx = cx - width / 2 + 28;
  if (kind === 'codex') {
    const bookPts = createWobblyRectPoints(iconCx, cy, 22, 18, 3, 921, 0.35, 8);
    graphics.fillStyle(DOODLE_COLORS.paperHover, 1);
    graphics.fillPoints(bookPts, true, true);
    graphics.lineStyle(2, ink, 1);
    graphics.strokePoints(bookPts, true, true);
    graphics.lineBetween(iconCx, cy - 8, iconCx, cy + 8);
  } else if (kind === 'upgrades') {
    drawDoodleCircle(graphics, {
      cx: iconCx,
      cy,
      radius: 10,
      fillColor: DOODLE_COLORS.gold,
      strokeColor: ink,
      strokeWidth: 2,
      seed: 931,
      segments: 12,
      jitter: 0.3,
    });
    drawDoodleStar(graphics, iconCx, cy, 6, 2.8, 4, DOODLE_COLORS.paperHover, ink, 1.2);
  } else if (kind === 'lastRun') {
    const scroll = createWobblyRectPoints(iconCx, cy, 18, 20, 4, 941, 0.3, 8);
    graphics.fillStyle(DOODLE_COLORS.paper, 1);
    graphics.fillPoints(scroll, true, true);
    graphics.lineStyle(1.8, ink, 1);
    graphics.strokePoints(scroll, true, true);
    graphics.lineBetween(iconCx - 4, cy - 4, iconCx + 4, cy - 4);
    graphics.lineBetween(iconCx - 4, cy + 1, iconCx + 4, cy + 1);
    graphics.lineBetween(iconCx - 4, cy + 6, iconCx + 2, cy + 6);
  }
}
