export type HeroId = 'runner' | 'vanguard';

export type HeroAppearance = {
  bodyColor: number;
  strokeColor: number;
  auraColor: number;
  markerColor: number;
  markerShape: 'dot' | 'bar';
  size: number;
  angle: number;
};

export type HeroDefinition = {
  id: HeroId;
  name: string;
  description: string;
  unlockCost?: number;
  maxHealthBonus: number;
  moveSpeedBonus: number;
  startingDamageBonus: number;
  fireCooldownReductionMs: number;
  appearance: HeroAppearance;
};

export const HEROES: Record<HeroId, HeroDefinition> = {
  runner: {
    id: 'runner',
    name: 'Runner',
    description: 'Default scout with faster feet and a snappier opening volley.',
    maxHealthBonus: 0,
    moveSpeedBonus: 24,
    startingDamageBonus: 0,
    fireCooldownReductionMs: 35,
    appearance: {
      bodyColor: 0x6ee7b7,
      strokeColor: 0xeafff7,
      auraColor: 0x34d399,
      markerColor: 0xe0f2fe,
      markerShape: 'dot',
      size: 32,
      angle: 45,
    },
  },
  vanguard: {
    id: 'vanguard',
    name: 'Vanguard',
    description: 'Unlockable bruiser with more health and heavier starting shots.',
    unlockCost: 120,
    maxHealthBonus: 35,
    moveSpeedBonus: 0,
    startingDamageBonus: 5,
    fireCooldownReductionMs: 0,
    appearance: {
      bodyColor: 0xf59e0b,
      strokeColor: 0xfffbeb,
      auraColor: 0xfb923c,
      markerColor: 0x7c2d12,
      markerShape: 'bar',
      size: 40,
      angle: 0,
    },
  },
};

export const HERO_LIST: HeroDefinition[] = [HEROES.runner, HEROES.vanguard];
