export type TankStatId = 'bulletDamage' | 'reload' | 'moveSpeed' | 'maxHealth';

export type TankStatLevels = Record<TankStatId, number>;

export type TankStatEffectSnapshot = {
  bulletDamageBonus: number;
  fireCooldownReductionMs: number;
  moveSpeedBonus: number;
  maxHealthBonus: number;
};

export type TankStatDefinition = {
  id: TankStatId;
  label: string;
  shortLabel: string;
  maxLevel: number;
  effectPerLevel: number;
  summary: string;
};

export const TANK_STAT_IDS: TankStatId[] = ['bulletDamage', 'reload', 'moveSpeed', 'maxHealth'];

export const TANK_STAT_DEFINITIONS: Record<TankStatId, TankStatDefinition> = {
  bulletDamage: {
    id: 'bulletDamage',
    label: 'Bullet Damage',
    shortLabel: 'DMG',
    maxLevel: 5,
    effectPerLevel: 2,
    summary: '+2 bullet damage',
  },
  reload: {
    id: 'reload',
    label: 'Reload',
    shortLabel: 'RLD',
    maxLevel: 5,
    effectPerLevel: 20,
    summary: '-20 ms cooldown',
  },
  moveSpeed: {
    id: 'moveSpeed',
    label: 'Move Speed',
    shortLabel: 'SPD',
    maxLevel: 5,
    effectPerLevel: 10,
    summary: '+10 move speed',
  },
  maxHealth: {
    id: 'maxHealth',
    label: 'Max Health',
    shortLabel: 'HP',
    maxLevel: 5,
    effectPerLevel: 12,
    summary: '+12 max HP',
  },
};

export function createInitialTankStatLevels(): TankStatLevels {
  return {
    bulletDamage: 0,
    reload: 0,
    moveSpeed: 0,
    maxHealth: 0,
  };
}

export function getTankStatDefinition(statId: TankStatId): TankStatDefinition {
  return TANK_STAT_DEFINITIONS[statId];
}

export function createTankStatEffectSnapshot(levels: TankStatLevels): TankStatEffectSnapshot {
  return {
    bulletDamageBonus: levels.bulletDamage * TANK_STAT_DEFINITIONS.bulletDamage.effectPerLevel,
    fireCooldownReductionMs: levels.reload * TANK_STAT_DEFINITIONS.reload.effectPerLevel,
    moveSpeedBonus: levels.moveSpeed * TANK_STAT_DEFINITIONS.moveSpeed.effectPerLevel,
    maxHealthBonus: levels.maxHealth * TANK_STAT_DEFINITIONS.maxHealth.effectPerLevel,
  };
}
