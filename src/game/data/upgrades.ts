export type UpgradeId =
  | 'vitality'
  | 'swiftness'
  | 'power'
  | 'rapid-fire'
  | 'velocity'
  | 'magnet'
  | 'reach'
  | 'unlock-twin-fangs'
  | 'unlock-ember-lance'
  | 'unlock-bloom-cannon'
  | 'unlock-phase-disc'
  | 'unlock-sunwheel'
  | 'unlock-shatterbell';

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
    description: '+22 move speed.',
  },
  {
    id: 'power',
    title: 'Power',
    description: '+5 damage to all owned weapons.',
  },
  {
    id: 'rapid-fire',
    title: 'Rapid Fire',
    description: '-40 ms cooldown to all owned weapons.',
  },
  {
    id: 'velocity',
    title: 'Velocity',
    description: '+90 projectile speed to all owned weapons.',
  },
  {
    id: 'magnet',
    title: 'Magnet',
    description: '+35 pickup range.',
  },
  {
    id: 'reach',
    title: 'Reach',
    description: '+55 attack range to all owned weapons.',
  },
  {
    id: 'unlock-twin-fangs',
    title: 'Twin Fangs',
    description: 'Add a rapid dual-dart weapon with tight spread.',
  },
  {
    id: 'unlock-ember-lance',
    title: 'Ember Lance',
    description: 'Add a slow heavy lance for hard single hits.',
  },
  {
    id: 'unlock-bloom-cannon',
    title: 'Bloom Cannon',
    description: 'Add a short-range tri-shot bloom burst.',
  },
  {
    id: 'unlock-phase-disc',
    title: 'Phase Disc',
    description: 'Add a wide spectral disc that pierces through packs.',
  },
  {
    id: 'unlock-sunwheel',
    title: 'Sunwheel',
    description: 'Add a radial nova weapon that clears the space around you.',
  },
  {
    id: 'unlock-shatterbell',
    title: 'Shatterbell',
    description: 'Add a crystal shell that explodes on impact.',
  },
];
