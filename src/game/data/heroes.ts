export type HeroId = 'runner' | 'vanguard';

export type HeroDefinition = {
  id: HeroId;
  name: string;
  description: string;
  unlockCost?: number;
  maxHealthBonus: number;
  moveSpeedBonus: number;
  startingDamageBonus: number;
  fireCooldownReductionMs: number;
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
  },
};

export const HERO_LIST: HeroDefinition[] = [HEROES.runner, HEROES.vanguard];
