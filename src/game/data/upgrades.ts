export type UpgradeId =
  | 'vitality'
  | 'swiftness'
  | 'power'
  | 'rapid-fire'
  | 'velocity'
  | 'magnet'
  | 'reach';

export type UpgradeDefinition = {
  id: UpgradeId;
  title: string;
  description: string;
};

export const UPGRADE_POOL: UpgradeDefinition[] = [
  {
    id: 'vitality',
    title: 'Vitality',
    description: '+25 max HP and heal 25 HP.',
  },
  {
    id: 'swiftness',
    title: 'Swiftness',
    description: '+24 move speed.',
  },
  {
    id: 'power',
    title: 'Power',
    description: '+6 projectile damage.',
  },
  {
    id: 'rapid-fire',
    title: 'Rapid Fire',
    description: '-45 ms attack cooldown.',
  },
  {
    id: 'velocity',
    title: 'Velocity',
    description: '+110 projectile speed.',
  },
  {
    id: 'magnet',
    title: 'Magnet',
    description: '+40 pickup range.',
  },
  {
    id: 'reach',
    title: 'Reach',
    description: '+65 attack range.',
  },
];
