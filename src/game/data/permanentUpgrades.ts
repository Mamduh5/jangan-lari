export type PermanentUpgradeId = 'max-hp' | 'move-speed' | 'pickup-range' | 'starting-damage';

export type PermanentUpgradeDefinition = {
  id: PermanentUpgradeId;
  title: string;
  description: string;
  baseCost: number;
  costPerLevel: number;
  maxLevel: number;
};

export const PERMANENT_UPGRADES: PermanentUpgradeDefinition[] = [
  {
    id: 'max-hp',
    title: 'Field Rations',
    description: '+10 starting max HP per rank.',
    baseCost: 25,
    costPerLevel: 20,
    maxLevel: 5,
  },
  {
    id: 'move-speed',
    title: 'Light Boots',
    description: '+8 starting move speed per rank.',
    baseCost: 20,
    costPerLevel: 18,
    maxLevel: 5,
  },
  {
    id: 'pickup-range',
    title: 'Salvage Magnet',
    description: '+12 starting pickup range per rank.',
    baseCost: 18,
    costPerLevel: 16,
    maxLevel: 5,
  },
  {
    id: 'starting-damage',
    title: 'Sharpened Core',
    description: '+3 starting projectile damage per rank.',
    baseCost: 28,
    costPerLevel: 22,
    maxLevel: 5,
  },
];

export function getPermanentUpgradeCost(
  upgrade: PermanentUpgradeDefinition,
  currentLevel: number,
): number {
  return upgrade.baseCost + upgrade.costPerLevel * currentLevel;
}
