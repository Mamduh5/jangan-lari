export type TankStatId = 'bulletDamage' | 'reload' | 'moveSpeed' | 'hpRegen';

export type TankStatLevels = Record<TankStatId, number>;

export type TankStatEffectSnapshot = {
  bulletDamageBonus: number;
  fireCooldownReductionMs: number;
  moveSpeedBonus: number;
  hpRegenPerSecond: number;
};

export type TankStatDefinition = {
  id: TankStatId;
  label: string;
  shortLabel: string;
  maxLevel: number;
  effectPerLevel: number;
  summary: string;
};

export const TANK_STAT_IDS: TankStatId[] = ['bulletDamage', 'reload', 'moveSpeed', 'hpRegen'];

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
  hpRegen: {
    id: 'hpRegen',
    label: 'Regen',
    shortLabel: 'REG',
    maxLevel: 5,
    effectPerLevel: 0.2,
    summary: '+0.2 HP/sec',
  },
};

export function createInitialTankStatLevels(): TankStatLevels {
  return {
    bulletDamage: 0,
    reload: 0,
    moveSpeed: 0,
    hpRegen: 0,
  };
}

export function isTankStatId(value: unknown): value is TankStatId {
  return TANK_STAT_IDS.includes(value as TankStatId);
}

export function sanitizeTankStatLevels(levels: Partial<Record<TankStatId | 'maxHealth', number>> = {}): TankStatLevels {
  const initial = createInitialTankStatLevels();

  for (const statId of TANK_STAT_IDS) {
    initial[statId] = Math.max(0, Math.floor(Number(levels[statId] ?? 0)));
  }

  return initial;
}

export function getTankStatDefinition(statId: TankStatId): TankStatDefinition {
  return TANK_STAT_DEFINITIONS[statId];
}

export function createTankStatEffectSnapshot(levels: TankStatLevels): TankStatEffectSnapshot {
  return {
    bulletDamageBonus: levels.bulletDamage * TANK_STAT_DEFINITIONS.bulletDamage.effectPerLevel,
    fireCooldownReductionMs: levels.reload * TANK_STAT_DEFINITIONS.reload.effectPerLevel,
    moveSpeedBonus: levels.moveSpeed * TANK_STAT_DEFINITIONS.moveSpeed.effectPerLevel,
    hpRegenPerSecond: levels.hpRegen * TANK_STAT_DEFINITIONS.hpRegen.effectPerLevel,
  };
}
