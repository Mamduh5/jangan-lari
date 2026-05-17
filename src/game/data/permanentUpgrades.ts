import {
  PERMANENT_HP_REGEN_PER_LEVEL,
  PERMANENT_MAX_HP_PER_LEVEL,
  PERMANENT_MOVE_SPEED_PER_LEVEL,
  PERMANENT_PICKUP_RANGE_PER_LEVEL,
  PERMANENT_STARTING_DAMAGE_PER_LEVEL,
} from '../config/playerBalance';

export type PermanentUpgradeId = 'max-hp' | 'move-speed' | 'pickup-range' | 'starting-damage' | 'hp-regen';

export type PermanentUpgradeDefinition = {
  id: PermanentUpgradeId;
  title: string;
  description: string;
  baseCost: number;
  costPerLevel: number;
  maxLevel: number;
};

export { PERMANENT_HP_REGEN_PER_LEVEL } from '../config/playerBalance';

export const PERMANENT_UPGRADES: PermanentUpgradeDefinition[] = [
  {
    id: 'max-hp',
    title: 'Field Rations',
    description: `+${PERMANENT_MAX_HP_PER_LEVEL} starting max HP per rank.`,
    baseCost: 25,
    costPerLevel: 20,
    maxLevel: 5,
  },
  {
    id: 'move-speed',
    title: 'Light Boots',
    description: `+${PERMANENT_MOVE_SPEED_PER_LEVEL} starting move speed per rank.`,
    baseCost: 20,
    costPerLevel: 18,
    maxLevel: 5,
  },
  {
    id: 'pickup-range',
    title: 'Salvage Magnet',
    description: `+${PERMANENT_PICKUP_RANGE_PER_LEVEL} starting pickup range per rank.`,
    baseCost: 18,
    costPerLevel: 16,
    maxLevel: 5,
  },
  {
    id: 'starting-damage',
    title: 'Sharpened Core',
    description: `+${PERMANENT_STARTING_DAMAGE_PER_LEVEL} starting projectile damage per rank.`,
    baseCost: 28,
    costPerLevel: 22,
    maxLevel: 5,
  },
  {
    id: 'hp-regen',
    title: 'Recovery',
    description: `+${PERMANENT_HP_REGEN_PER_LEVEL} HP/sec baseline regen per rank.`,
    baseCost: 24,
    costPerLevel: 20,
    maxLevel: 5,
  },
];

export const PERMANENT_UPGRADE_IDS: PermanentUpgradeId[] = PERMANENT_UPGRADES.map((upgrade) => upgrade.id);

export function getPermanentUpgradeCost(
  upgrade: PermanentUpgradeDefinition,
  currentLevel: number,
): number {
  return upgrade.baseCost + upgrade.costPerLevel * currentLevel;
}
