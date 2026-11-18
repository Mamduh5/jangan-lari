import type Phaser from 'phaser';
import type { PermanentUpgradeId } from '../data/permanentUpgrades';
import {
  DOODLE_COLORS,
  DOODLE_OVERLAY_COLORS,
  type DoodlePoint,
  createWobblyRectPoints,
  drawDoodleCard,
  drawDoodleCircle,
  drawDoodleCloseX,
  drawDoodleStar,
} from './doodleTheme';
import { drawMenuIslandBackdrop } from './menuCodexArtwork';

export type MetaUpgradeVisualState = 'available' | 'unaffordable' | 'locked' | 'maxed';

export function drawMetaProgressionBoardChrome(
  graphics: Phaser.GameObjects.Graphics,
  gameWidth: number,
  gameHeight: number,
): void {
  const ink = DOODLE_COLORS.ink;
  graphics.clear();

  // Shared purple doodle island backdrop gently dimmed behind the main poster
  drawMenuIslandBackdrop(graphics, gameWidth, gameHeight);
  graphics.fillStyle(0x160f2e, 0.36);
  graphics.fillRect(0, 0, gameWidth, gameHeight);

  // Kraft outer board + cream central workshop poster
  const cx = gameWidth / 2;
  const cy = gameHeight / 2;
  drawDoodleCard(graphics, {
    cx,
    cy: cy + 3,
    width: 1316,
    height: 646,
    cornerRadius: 26,
    seed: 3101,
    jitter: 1.8,
    fillColor: 0xd9bc8c,
    strokeColor: ink,
    strokeWidth: 3.6,
    shadowOffsetX: 6,
    shadowOffsetY: 8,
    shadowAlpha: 0.45,
  });
  drawDoodleCard(graphics, {
    cx,
    cy,
    width: 1292,
    height: 622,
    cornerRadius: 22,
    seed: 3107,
    jitter: 1.5,
    fillColor: DOODLE_COLORS.paper,
    strokeColor: ink,
    strokeWidth: 3.2,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowAlpha: 0,
  });

  // Faint notebook lines & corner masking tape accents
  graphics.lineStyle(1.3, DOODLE_COLORS.paperWarm, 0.9);
  for (let ly = 148; ly <= 604; ly += 48) {
    graphics.lineBetween(186, ly, 1414, ly);
  }

  const tapeTopRight: DoodlePoint[] = [
    { x: 1384, y: 40 },
    { x: 1450, y: 74 },
    { x: 1438, y: 92 },
    { x: 1372, y: 58 },
  ];
  graphics.fillStyle(DOODLE_COLORS.paperGold, 0.92);
  graphics.fillPoints(tapeTopRight, true, true);
  graphics.lineStyle(2, ink, 0.88);
  graphics.strokePoints(tapeTopRight, true, true);

  // Header divider + star sticker badge + celebratory doodle ticks
  drawDoodleStar(graphics, 212, 86, 21, 9.5, 5, DOODLE_COLORS.gold, ink, 2.5, -Math.PI / 2);
  graphics.lineStyle(2.4, DOODLE_COLORS.gold, 1);
  graphics.lineBetween(179, 64, 189, 70);
  graphics.lineBetween(176, 86, 188, 86);
  graphics.lineBetween(244, 60, 252, 68);
  graphics.lineStyle(2.4, ink, 0.22);
  graphics.lineBetween(184, 142, 1416, 142);

  // Left Panel Frame: PERMANENT UPGRADES (cx=486, cy=382, w=624, h=430)
  drawDoodleCard(graphics, {
    cx: 486,
    cy: 382,
    width: 624,
    height: 430,
    cornerRadius: 20,
    seed: 3121,
    jitter: 1.4,
    fillColor: DOODLE_COLORS.paperWarm,
    strokeColor: ink,
    strokeWidth: 2.8,
    shadowOffsetX: 3,
    shadowOffsetY: 4,
    shadowAlpha: 0.24,
  });
  drawDoodleCard(graphics, {
    cx: 486,
    cy: 168,
    width: 318,
    height: 36,
    cornerRadius: 12,
    seed: 3127,
    jitter: 0.8,
    fillColor: 0xa7f3d0,
    strokeColor: ink,
    strokeWidth: 2.5,
    shadowOffsetX: 2,
    shadowOffsetY: 2,
    shadowAlpha: 0.25,
  });

  // Right Panel Frame: QUEST BOARD (cx=1118, cy=382, w=604, h=430)
  drawDoodleCard(graphics, {
    cx: 1118,
    cy: 382,
    width: 604,
    height: 430,
    cornerRadius: 20,
    seed: 3133,
    jitter: 1.4,
    fillColor: 0xf7e8cb,
    strokeColor: ink,
    strokeWidth: 2.8,
    shadowOffsetX: 3,
    shadowOffsetY: 4,
    shadowAlpha: 0.24,
  });
  drawDoodleCard(graphics, {
    cx: 1118,
    cy: 168,
    width: 274,
    height: 36,
    cornerRadius: 12,
    seed: 3139,
    jitter: 0.8,
    fillColor: 0xe9d5ff,
    strokeColor: ink,
    strokeWidth: 2.5,
    shadowOffsetX: 2,
    shadowOffsetY: 2,
    shadowAlpha: 0.25,
  });
  // Decorative red pushpin tacks flanking Quest Board header
  drawDoodleCircle(graphics, {
    cx: 966,
    cy: 168,
    radius: 7,
    fillColor: DOODLE_COLORS.hp,
    strokeColor: ink,
    strokeWidth: 2,
    seed: 3141,
    segments: 12,
    jitter: 0.3,
  });
  drawDoodleCircle(graphics, {
    cx: 1270,
    cy: 168,
    radius: 7,
    fillColor: DOODLE_COLORS.hp,
    strokeColor: ink,
    strokeWidth: 2,
    seed: 3143,
    segments: 12,
    jitter: 0.3,
  });

  // Subtle decorative stars on poster footer
  drawDoodleStar(graphics, 1384, 632, 9, 4, 4, DOODLE_COLORS.gold, ink, 1.6, 0.2);
  drawDoodleStar(graphics, 1356, 622, 6, 2.5, 4, 0xfbcfe8, ink, 1.4, 0);
}

export function drawPermanentUpgradeGlyph(
  graphics: Phaser.GameObjects.Graphics,
  upgradeId: PermanentUpgradeId,
  cx: number,
  cy: number,
  muted = false,
): void {
  const ink = DOODLE_COLORS.ink;
  const wellFill = muted
    ? DOODLE_COLORS.paperDisabled
    : upgradeId === 'max-hp'
      ? 0xffe4e6
      : upgradeId === 'move-speed'
        ? 0xe0f2fe
        : upgradeId === 'pickup-range'
          ? 0xfef3c7
          : upgradeId === 'starting-damage'
            ? 0xf3e8ff
            : 0xdcfce7;

  drawDoodleCircle(graphics, {
    cx,
    cy,
    radius: 21,
    fillColor: wellFill,
    strokeColor: ink,
    strokeWidth: 2.1,
    seed: 3201 + upgradeId.length * 13,
    segments: 16,
    jitter: 0.55,
    shadowOffsetX: 1,
    shadowOffsetY: 2,
    shadowAlpha: 0.16,
  });

  switch (upgradeId) {
    case 'max-hp': {
      // Heart icon (Field Rations)
      const heart: DoodlePoint[] = [
        { x: cx, y: cy + 10 },
        { x: cx - 11, y: cy },
        { x: cx - 11, y: cy - 6 },
        { x: cx - 5.5, y: cy - 10 },
        { x: cx, y: cy - 4.5 },
        { x: cx + 5.5, y: cy - 10 },
        { x: cx + 11, y: cy - 6 },
        { x: cx + 11, y: cy },
      ];
      graphics.fillStyle(muted ? 0xcbd5e1 : DOODLE_COLORS.hp, 1);
      graphics.fillPoints(heart, true, true);
      graphics.lineStyle(2, ink, 1);
      graphics.strokePoints(heart, true, true);
      return;
    }

    case 'move-speed': {
      // Winged boot (Light Boots)
      const boot: DoodlePoint[] = [
        { x: cx - 7, y: cy - 10 },
        { x: cx + 1, y: cy - 10 },
        { x: cx + 1, y: cy + 2 },
        { x: cx + 11, y: cy + 4 },
        { x: cx + 11, y: cy + 10 },
        { x: cx - 8, y: cy + 10 },
      ];
      graphics.fillStyle(muted ? 0xcbd5e1 : DOODLE_COLORS.xp, 1);
      graphics.fillPoints(boot, true, true);
      graphics.lineStyle(2, ink, 1);
      graphics.strokePoints(boot, true, true);
      const wing: DoodlePoint[] = [
        { x: cx - 2, y: cy - 4 },
        { x: cx - 13, y: cy - 9 },
        { x: cx - 9, y: cy + 1 },
      ];
      graphics.fillStyle(DOODLE_COLORS.paperHover, 1);
      graphics.fillPoints(wing, true, true);
      graphics.lineStyle(1.7, ink, 1);
      graphics.strokePoints(wing, true, true);
      return;
    }

    case 'pickup-range': {
      // Horseshoe magnet (Salvage Magnet)
      const horse: DoodlePoint[] = [
        { x: cx - 10, y: cy - 10 },
        { x: cx - 4, y: cy - 10 },
        { x: cx - 4, y: cy + 3 },
        { x: cx + 4, y: cy + 3 },
        { x: cx + 4, y: cy - 10 },
        { x: cx + 10, y: cy - 10 },
        { x: cx + 10, y: cy + 5 },
        { x: cx + 5, y: cy + 10 },
        { x: cx - 5, y: cy + 10 },
        { x: cx - 10, y: cy + 5 },
      ];
      graphics.fillStyle(muted ? 0xcbd5e1 : DOODLE_COLORS.hp, 1);
      graphics.fillPoints(horse, true, true);
      graphics.lineStyle(2, ink, 1);
      graphics.strokePoints(horse, true, true);
      graphics.fillStyle(DOODLE_COLORS.paperHover, 1);
      graphics.fillRect(cx - 10, cy - 10, 6, 4);
      graphics.fillRect(cx + 4, cy - 10, 6, 4);
      return;
    }

    case 'starting-damage': {
      // Gear / sharpened core star-cog (Sharpened Core)
      drawDoodleStar(
        graphics,
        cx,
        cy,
        13,
        7.5,
        6,
        muted ? 0xcbd5e1 : 0xa855f7,
        ink,
        2,
        0.2,
      );
      drawDoodleCircle(graphics, {
        cx,
        cy,
        radius: 4.5,
        fillColor: muted ? DOODLE_COLORS.paperDisabled : DOODLE_COLORS.gold,
        strokeColor: ink,
        strokeWidth: 1.7,
        seed: 3251,
        segments: 10,
        jitter: 0.1,
      });
      return;
    }

    case 'hp-regen': {
      // Bold medical cross (Recovery)
      const cross: DoodlePoint[] = [
        { x: cx - 4, y: cy - 11 },
        { x: cx + 4, y: cy - 11 },
        { x: cx + 4, y: cy - 4 },
        { x: cx + 11, y: cy - 4 },
        { x: cx + 11, y: cy + 4 },
        { x: cx + 4, y: cy + 4 },
        { x: cx + 4, y: cy + 11 },
        { x: cx - 4, y: cy + 11 },
        { x: cx - 4, y: cy + 4 },
        { x: cx - 11, y: cy + 4 },
        { x: cx - 11, y: cy - 4 },
        { x: cx - 4, y: cy - 4 },
      ];
      graphics.fillStyle(muted ? 0xcbd5e1 : DOODLE_COLORS.mint, 1);
      graphics.fillPoints(cross, true, true);
      graphics.lineStyle(2, ink, 1);
      graphics.strokePoints(cross, true, true);
      return;
    }
  }
}

export function drawMetaRankBeads(
  graphics: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  maxRank: number,
  currentRank: number,
  muted: boolean,
  maxed: boolean,
): void {
  const count = Math.max(1, maxRank);
  const stepX = 18;
  const startX = cx - ((count - 1) * stepX) / 2;
  const fill = maxed ? DOODLE_COLORS.mint : DOODLE_COLORS.gold;

  for (let i = 0; i < count; i += 1) {
    const px = startX + i * stepX;
    const isFilled = i < currentRank;
    drawDoodleCircle(graphics, {
      cx: px,
      cy,
      radius: 6.2,
      fillColor: isFilled ? fill : muted ? DOODLE_COLORS.paperDisabled : DOODLE_COLORS.paperWarm,
      strokeColor: muted && !isFilled ? DOODLE_COLORS.inkMuted : DOODLE_COLORS.ink,
      strokeWidth: 1.8,
      seed: 3301 + i * 17,
      segments: 10,
      jitter: 0.22,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      shadowAlpha: 0,
    });
  }
}

export function drawMetaPadlockDoodle(
  graphics: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
): void {
  const ink = DOODLE_COLORS.inkMuted;
  graphics.lineStyle(2, ink, 1);
  graphics.lineBetween(cx - 4, cy - 2, cx - 4, cy - 6);
  graphics.lineBetween(cx - 4, cy - 6, cx + 4, cy - 6);
  graphics.lineBetween(cx + 4, cy - 6, cx + 4, cy - 2);
  const body = createWobblyRectPoints(cx, cy + 2.5, 13, 10, 2.5, 3361, 0.25, 6);
  graphics.fillStyle(DOODLE_COLORS.paperWarm, 1);
  graphics.fillPoints(body, true, true);
  graphics.lineStyle(1.8, ink, 1);
  graphics.strokePoints(body, true, true);
}

export function drawMetaUpgradeRowChrome(
  graphics: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  width: number,
  height: number,
  upgradeId: PermanentUpgradeId,
  level: number,
  maxLevel: number,
  state: MetaUpgradeVisualState,
  hovered: boolean,
  rowIndex: number,
): void {
  const ink = DOODLE_COLORS.ink;
  const muted = state === 'locked';
  const rowFill =
    state === 'maxed'
      ? 0xe8fbe9
      : state === 'locked'
        ? 0xe7e2d5
        : state === 'available'
          ? DOODLE_COLORS.paper
          : 0xfbf4e2;

  drawDoodleCard(graphics, {
    cx,
    cy,
    width,
    height,
    cornerRadius: 15,
    seed: 3401 + rowIndex * 29,
    jitter: 0.95,
    fillColor: rowFill,
    strokeColor: state === 'locked' ? DOODLE_COLORS.inkMuted : ink,
    strokeWidth: state === 'available' || state === 'maxed' ? 2.4 : 2.0,
    shadowOffsetX: state === 'locked' ? 1 : 2,
    shadowOffsetY: state === 'locked' ? 1 : 2.5,
    shadowAlpha: state === 'locked' ? 0.14 : 0.22,
  });

  drawPermanentUpgradeGlyph(graphics, upgradeId, cx - width / 2 + 34, cy, muted);
  drawMetaRankBeads(graphics, cx + 88, cy - 11, maxLevel, level, muted, state === 'maxed');

  // Distinct Action Pill Shape & Visual State (right side: cx + 220)
  const btnCx = cx + width / 2 - 74;
  const btnW = 126;
  const btnH = 46;

  if (state === 'available') {
    drawDoodleCard(graphics, {
      cx: btnCx,
      cy: hovered ? cy - 1.5 : cy,
      width: btnW,
      height: btnH,
      cornerRadius: 12,
      seed: 3451 + rowIndex * 11,
      jitter: 0.65,
      fillColor: hovered ? 0x86efac : DOODLE_COLORS.mint,
      strokeColor: ink,
      strokeWidth: hovered ? 3 : 2.4,
      shadowOffsetX: 2,
      shadowOffsetY: hovered ? 4 : 3,
      shadowAlpha: 0.28,
    });
    return;
  }

  if (state === 'maxed') {
    drawDoodleCard(graphics, {
      cx: btnCx,
      cy,
      width: btnW,
      height: btnH,
      cornerRadius: 16,
      seed: 3461 + rowIndex * 11,
      jitter: 0.45,
      fillColor: 0xbbf7d0,
      strokeColor: ink,
      strokeWidth: 2,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      shadowAlpha: 0,
    });
    drawDoodleStar(graphics, btnCx - 41, cy, 8, 3.6, 5, DOODLE_COLORS.gold, ink, 1.5);
    return;
  }

  if (state === 'locked') {
    drawDoodleCard(graphics, {
      cx: btnCx,
      cy,
      width: btnW,
      height: btnH,
      cornerRadius: 10,
      seed: 3471 + rowIndex * 11,
      jitter: 0.4,
      fillColor: DOODLE_COLORS.paperDisabled,
      strokeColor: DOODLE_COLORS.inkMuted,
      strokeWidth: 1.8,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      shadowAlpha: 0,
    });
    drawMetaPadlockDoodle(graphics, btnCx - 41, cy);
    return;
  }

  // state === 'unaffordable'
  drawDoodleCard(graphics, {
    cx: btnCx,
    cy,
    width: btnW,
    height: btnH,
    cornerRadius: 10,
    seed: 3481 + rowIndex * 11,
    jitter: 0.45,
    fillColor: hovered ? DOODLE_COLORS.paperGold : DOODLE_COLORS.paperWarm,
    strokeColor: DOODLE_COLORS.inkMuted,
    strokeWidth: 1.9,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowAlpha: 0,
  });
}

export function drawQuestBoardRowChrome(
  graphics: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  width: number,
  height: number,
  progressRatio: number,
  completed: boolean,
  rowIndex: number,
): void {
  const ink = DOODLE_COLORS.ink;
  const clampedRatio = Math.max(0, Math.min(1, progressRatio));

  drawDoodleCard(graphics, {
    cx,
    cy,
    width,
    height,
    cornerRadius: 15,
    seed: 3501 + rowIndex * 23,
    jitter: 0.9,
    fillColor: completed ? 0xeafbe7 : DOODLE_COLORS.paper,
    strokeColor: ink,
    strokeWidth: completed ? 2.4 : 2.1,
    shadowOffsetX: 2,
    shadowOffsetY: 2.5,
    shadowAlpha: 0.2,
  });

  // Left Quest Star Emblem
  const starCx = cx - width / 2 + 28;
  drawDoodleStar(
    graphics,
    starCx,
    cy - 4,
    14,
    6.5,
    5,
    completed ? DOODLE_COLORS.gold : DOODLE_COLORS.paperWarm,
    ink,
    2.1,
  );

  // Horizontal Progress Bar Track (x from starCx + 28 to right counter col)
  const barX = cx - width / 2 + 58;
  const barW = 354;
  const barCy = cy + 19;
  const barH = 11;
  drawDoodleCard(graphics, {
    cx: barX + barW / 2,
    cy: barCy,
    width: barW,
    height: barH,
    cornerRadius: 5,
    seed: 3551 + rowIndex * 13,
    jitter: 0.3,
    fillColor: DOODLE_COLORS.paperWarm,
    strokeColor: ink,
    strokeWidth: 1.8,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowAlpha: 0,
  });

  const fillW = Math.round((barW - 4) * clampedRatio);
  if (fillW >= 6) {
    const fillPts = createWobblyRectPoints(
      barX + 2 + fillW / 2,
      barCy,
      fillW,
      barH - 3.5,
      4,
      3571 + rowIndex * 11,
      0.2,
      10,
    );
    graphics.fillStyle(completed ? DOODLE_COLORS.mint : DOODLE_COLORS.xp, 1);
    graphics.fillPoints(fillPts, true, true);
  }

  // Reward / Completed Stamp Badge top-right
  drawDoodleCard(graphics, {
    cx: cx + width / 2 - 86,
    cy: cy - 15,
    width: 152,
    height: 22,
    cornerRadius: 8,
    seed: (completed ? 3589 : 3595) + rowIndex * 7,
    jitter: 0.35,
    fillColor: completed ? 0xbbf7d0 : DOODLE_OVERLAY_COLORS.weaponBadge,
    strokeColor: ink,
    strokeWidth: 1.8,
    shadowOffsetX: 1,
    shadowOffsetY: 1,
    shadowAlpha: 0.16,
  });
}

export function drawMetaBackButtonChrome(
  graphics: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  width: number,
  height: number,
  hovered: boolean,
  hasCloseIcon: boolean,
): void {
  const ink = DOODLE_COLORS.ink;
  graphics.clear();

  drawDoodleCard(graphics, {
    cx,
    cy: hovered ? cy - 1.5 : cy,
    width,
    height,
    cornerRadius: 16,
    seed: 3651,
    jitter: 0.9,
    fillColor: hovered ? DOODLE_COLORS.gold : DOODLE_COLORS.paperGold,
    strokeColor: ink,
    strokeWidth: hovered ? 3.2 : 2.6,
    shadowOffsetX: 2,
    shadowOffsetY: hovered ? 4 : 3,
    shadowAlpha: 0.28,
  });

  const iconCx = cx - width / 2 + 28;
  drawDoodleCircle(graphics, {
    cx: iconCx,
    cy: hovered ? cy - 1.5 : cy,
    radius: 14,
    fillColor: DOODLE_COLORS.paperHover,
    strokeColor: ink,
    strokeWidth: 2,
    seed: 3655,
    segments: 12,
    jitter: 0.3,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowAlpha: 0,
  });

  if (!hasCloseIcon) {
    drawDoodleCloseX(graphics, iconCx, hovered ? cy - 1.5 : cy, 5, ink);
  }
}
