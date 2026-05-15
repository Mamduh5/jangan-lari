import type { WeaponStatPatch } from './weapons';

export type TankClassId = 'basic' | 'twin' | 'sniper';

export type TankClassVisualIdentity = {
  hullColor: number;
  turretColor: number;
  barrelColor: number;
  barrelCount: 1 | 2;
  barrelLengthMultiplier: number;
  barrelWidthMultiplier: number;
};

export type TankClassDefinition = {
  id: TankClassId;
  title: string;
  description: string;
  unlockLevel: number;
  weaponPatch: WeaponStatPatch;
  visual: TankClassVisualIdentity;
};

export const TANK_CLASS_EVOLUTION_LEVEL = 4;
export const BASIC_TANK_CLASS_ID: TankClassId = 'basic';

export const TANK_CLASS_DEFINITIONS: Record<TankClassId, TankClassDefinition> = {
  basic: {
    id: 'basic',
    title: 'Basic',
    description: 'Balanced starter tank.',
    unlockLevel: 1,
    weaponPatch: {},
    visual: {
      hullColor: 0x38bdf8,
      turretColor: 0xfacc15,
      barrelColor: 0xe0f2fe,
      barrelCount: 1,
      barrelLengthMultiplier: 1,
      barrelWidthMultiplier: 1,
    },
  },
  twin: {
    id: 'twin',
    title: 'Twin',
    description: 'Two-shot spread for close shape farming.',
    unlockLevel: TANK_CLASS_EVOLUTION_LEVEL,
    weaponPatch: {
      burstCount: 2,
      spreadDegrees: 12,
      fireCooldownMs: 40,
    },
    visual: {
      hullColor: 0x0ea5e9,
      turretColor: 0x7dd3fc,
      barrelColor: 0xe0f2fe,
      barrelCount: 2,
      barrelLengthMultiplier: 0.92,
      barrelWidthMultiplier: 0.82,
    },
  },
  sniper: {
    id: 'sniper',
    title: 'Sniper',
    description: 'Longer, harder shots for precision pressure.',
    unlockLevel: TANK_CLASS_EVOLUTION_LEVEL,
    weaponPatch: {
      damage: 6,
      projectileSpeed: 140,
      range: 170,
      fireCooldownMs: 120,
    },
    visual: {
      hullColor: 0x2563eb,
      turretColor: 0xbfdbfe,
      barrelColor: 0xdbeafe,
      barrelCount: 1,
      barrelLengthMultiplier: 1.42,
      barrelWidthMultiplier: 0.76,
    },
  },
};

export const TANK_CLASS_BRANCH_IDS: TankClassId[] = ['twin', 'sniper'];

export function getTankClassDefinition(classId: TankClassId): TankClassDefinition {
  return TANK_CLASS_DEFINITIONS[classId];
}

export function getAvailableTankClassChoices(options: {
  level: number;
  currentClassId: TankClassId;
  classChoiceConsumed: boolean;
}): TankClassDefinition[] {
  if (
    options.classChoiceConsumed ||
    options.currentClassId !== BASIC_TANK_CLASS_ID ||
    options.level < TANK_CLASS_EVOLUTION_LEVEL
  ) {
    return [];
  }

  return TANK_CLASS_BRANCH_IDS.map((classId) => TANK_CLASS_DEFINITIONS[classId]);
}

export function canSelectTankClass(options: {
  classId: string;
  level: number;
  currentClassId: TankClassId;
  classChoiceConsumed: boolean;
}): options is {
  classId: TankClassId;
  level: number;
  currentClassId: TankClassId;
  classChoiceConsumed: boolean;
} {
  return getAvailableTankClassChoices(options).some((definition) => definition.id === options.classId);
}
