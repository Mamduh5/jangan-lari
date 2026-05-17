import type { EnemyArchetype } from '../data/enemies';

export type ProjectileFaction = 'player' | 'enemy';

export type ProjectileVisual = {
  faction: ProjectileFaction;
  fillColor: number;
  strokeColor: number;
  trailColor: number;
  dangerColor: number | null;
  containsRed: boolean;
};

export type XpGemTier = 'small' | 'medium' | 'large' | 'huge';

export type XpGemVisual = {
  tier: XpGemTier;
  fillColor: number;
  strokeColor: number;
  glowColor: number;
  textColor: string;
  radius: number;
};

export function resolveProjectileVisual(options: {
  faction: ProjectileFaction;
  baseColor: number;
  strokeColor: number;
}): ProjectileVisual {
  if (options.faction === 'enemy') {
    return {
      faction: 'enemy',
      fillColor: 0xff3344,
      strokeColor: 0xffc4c4,
      trailColor: 0xfb7185,
      dangerColor: 0xff3344,
      containsRed: true,
    };
  }

  return {
    faction: 'player',
    fillColor: options.baseColor,
    strokeColor: options.strokeColor,
    trailColor: options.baseColor,
    dangerColor: null,
    containsRed: containsVisibleRed(options.baseColor) || containsVisibleRed(options.strokeColor),
  };
}

export function getEnemyProjectileVisual(baseColor: number, strokeColor = 0xffc4c4): ProjectileVisual {
  return resolveProjectileVisual({
    faction: 'enemy',
    baseColor,
    strokeColor,
  });
}

export function getEnemyXpReward(archetype: EnemyArchetype): number {
  return archetype.xpValue;
}

export function getXpGemVisual(value: number): XpGemVisual {
  if (value >= 50) {
    return {
      tier: 'huge',
      fillColor: 0xfbbf24,
      strokeColor: 0xfef3c7,
      glowColor: 0xf59e0b,
      textColor: '#fde68a',
      radius: 11,
    };
  }

  if (value >= 24) {
    return {
      tier: 'large',
      fillColor: 0xc084fc,
      strokeColor: 0xf3e8ff,
      glowColor: 0xa855f7,
      textColor: '#e9d5ff',
      radius: 10,
    };
  }

  if (value >= 10) {
    return {
      tier: 'medium',
      fillColor: 0x34d399,
      strokeColor: 0xd1fae5,
      glowColor: 0x14b8a6,
      textColor: '#bbf7d0',
      radius: 8,
    };
  }

  return {
    tier: 'small',
    fillColor: 0x60a5fa,
    strokeColor: 0xdbeafe,
    glowColor: 0x38bdf8,
    textColor: '#bfdbfe',
    radius: 7,
  };
}

function containsVisibleRed(color: number): boolean {
  const red = (color >> 16) & 0xff;
  const green = (color >> 8) & 0xff;
  const blue = color & 0xff;
  return red >= 180 && green <= 140 && blue <= 150 && red >= green + 40 && red >= blue + 40;
}
