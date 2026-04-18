import type { WeaponId, WeaponStatPatch } from './weapons';

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
  | 'unlock-shatterbell'
  | 'signature-arc-bolt-volt-volley'
  | 'signature-twin-fangs-ripper-line'
  | 'signature-ember-lance-sundering-tip'
  | 'signature-bloom-cannon-bramble-fan'
  | 'signature-shatterbell-aftershock';

export type UpgradeKind = 'core' | 'signature';

export type UpgradeDefinition = {
  id: UpgradeId;
  title: string;
  description: string;
  kind: UpgradeKind;
  requiresWeaponId?: WeaponId;
  exclusiveSignatureForWeapon?: WeaponId;
  weaponStatPatch?: WeaponStatPatch;
};

export const UPGRADE_POOL: UpgradeDefinition[] = [
  {
    id: 'vitality',
    title: 'Vitality',
    description: '+25 max HP and heal 25 HP.',
    kind: 'core',
  },
  {
    id: 'swiftness',
    title: 'Swiftness',
    description: '+22 move speed.',
    kind: 'core',
  },
  {
    id: 'power',
    title: 'Power',
    description: '+5 damage to all owned weapons.',
    kind: 'core',
  },
  {
    id: 'rapid-fire',
    title: 'Rapid Fire',
    description: '-40 ms cooldown to all owned weapons.',
    kind: 'core',
  },
  {
    id: 'velocity',
    title: 'Velocity',
    description: '+90 projectile speed to all owned weapons.',
    kind: 'core',
  },
  {
    id: 'magnet',
    title: 'Magnet',
    description: '+35 pickup range.',
    kind: 'core',
  },
  {
    id: 'reach',
    title: 'Reach',
    description: '+55 attack range to all owned weapons.',
    kind: 'core',
  },
  {
    id: 'unlock-twin-fangs',
    title: 'Twin Fangs',
    description: 'Add a rapid dual-dart weapon with tight spread.',
    kind: 'core',
  },
  {
    id: 'unlock-ember-lance',
    title: 'Ember Lance',
    description: 'Add a slow heavy lance for hard single hits.',
    kind: 'core',
  },
  {
    id: 'unlock-bloom-cannon',
    title: 'Bloom Cannon',
    description: 'Add a short-range tri-shot bloom burst.',
    kind: 'core',
  },
  {
    id: 'unlock-phase-disc',
    title: 'Phase Disc',
    description: 'Add a wide spectral disc that pierces through packs.',
    kind: 'core',
  },
  {
    id: 'unlock-sunwheel',
    title: 'Sunwheel',
    description: 'Add a radial nova weapon that clears the space around you.',
    kind: 'core',
  },
  {
    id: 'unlock-shatterbell',
    title: 'Shatterbell',
    description: 'Add a crystal shell that explodes on impact.',
    kind: 'core',
  },
  {
    id: 'signature-arc-bolt-volt-volley',
    title: 'Volt Volley',
    description: 'Arc Bolt snaps into a tight 3-round burst with a short spread.',
    kind: 'signature',
    requiresWeaponId: 'arc-bolt',
    exclusiveSignatureForWeapon: 'arc-bolt',
    weaponStatPatch: {
      burstCount: 3,
      spreadDegrees: 12,
    },
  },
  {
    id: 'signature-twin-fangs-ripper-line',
    title: 'Ripper Line',
    description: 'Twin Fangs gains a third dart, extra speed, and light pierce for lane cutting.',
    kind: 'signature',
    requiresWeaponId: 'twin-fangs',
    exclusiveSignatureForWeapon: 'twin-fangs',
    weaponStatPatch: {
      burstCount: 3,
      pierceCount: 1,
      projectileSpeed: 90,
    },
  },
  {
    id: 'signature-ember-lance-sundering-tip',
    title: 'Sundering Tip',
    description: 'Ember Lance tears through lines with pierce, longer reach, and a thicker spearhead.',
    kind: 'signature',
    requiresWeaponId: 'ember-lance',
    exclusiveSignatureForWeapon: 'ember-lance',
    weaponStatPatch: {
      pierceCount: 2,
      projectileRadius: 2,
      range: 50,
    },
  },
  {
    id: 'signature-bloom-cannon-bramble-fan',
    title: 'Bramble Fan',
    description: 'Bloom Cannon blooms into a 5-shot control cone with shorter reach and heavier area denial.',
    kind: 'signature',
    requiresWeaponId: 'bloom-cannon',
    exclusiveSignatureForWeapon: 'bloom-cannon',
    weaponStatPatch: {
      burstCount: 5,
      spreadDegrees: 34,
      range: -25,
    },
  },
  {
    id: 'signature-shatterbell-aftershock',
    title: 'Aftershock',
    description: 'Shatterbell shells detonate into much larger blasts, but the bell takes longer to reset.',
    kind: 'signature',
    requiresWeaponId: 'shatterbell',
    exclusiveSignatureForWeapon: 'shatterbell',
    weaponStatPatch: {
      explosionRadius: 42,
      explosionDamageMultiplier: 0.35,
      fireCooldownMs: 120,
    },
  },
];

export function findUpgradeDefinitionById(upgradeId: UpgradeId): UpgradeDefinition | undefined {
  return UPGRADE_POOL.find((upgrade) => upgrade.id === upgradeId);
}

export function getEligibleSignatureUpgrades(
  upgrades: UpgradeDefinition[],
  ownedWeaponIds: Iterable<WeaponId>,
  takenSignatureIds: Iterable<UpgradeId>,
): UpgradeDefinition[] {
  const ownedWeaponSet = new Set(ownedWeaponIds);
  const takenSignatureIdSet = new Set(takenSignatureIds);
  const takenSignatureWeaponSet = new Set(
    upgrades
      .filter(
        (upgrade) =>
          upgrade.kind === 'signature' &&
          takenSignatureIdSet.has(upgrade.id) &&
          Boolean(upgrade.exclusiveSignatureForWeapon),
      )
      .map((upgrade) => upgrade.exclusiveSignatureForWeapon as WeaponId),
  );

  return upgrades.filter(
    (upgrade) =>
      upgrade.kind === 'signature' &&
      Boolean(upgrade.requiresWeaponId) &&
      ownedWeaponSet.has(upgrade.requiresWeaponId as WeaponId) &&
      !takenSignatureIdSet.has(upgrade.id) &&
      (!upgrade.exclusiveSignatureForWeapon || !takenSignatureWeaponSet.has(upgrade.exclusiveSignatureForWeapon)),
  );
}

export function buildLevelUpChoices(options: {
  upgrades: UpgradeDefinition[];
  ownedWeaponIds: Iterable<WeaponId>;
  takenSignatureIds: Iterable<UpgradeId>;
  forceSignature: boolean;
  shuffle?: <T>(items: T[]) => T[];
  maxChoices?: number;
}): UpgradeDefinition[] {
  const shuffle = options.shuffle ?? ((items) => [...items]);
  const maxChoices = options.maxChoices ?? 3;
  const eligibleSignatures = getEligibleSignatureUpgrades(
    options.upgrades,
    options.ownedWeaponIds,
    options.takenSignatureIds,
  );
  const nonSignatureUpgrades = options.upgrades.filter((upgrade) => upgrade.kind !== 'signature');
  const regularPool = shuffle([...nonSignatureUpgrades, ...eligibleSignatures]);
  const picks: UpgradeDefinition[] = [];

  if (options.forceSignature && eligibleSignatures.length > 0) {
    picks.push(shuffle([...eligibleSignatures])[0]);
  }

  const fillerPool =
    options.forceSignature && picks.length > 0 ? shuffle([...nonSignatureUpgrades]) : regularPool;

  for (const upgrade of fillerPool) {
    if (picks.length >= maxChoices) {
      break;
    }

    if (picks.some((existing) => existing.id === upgrade.id)) {
      continue;
    }

    picks.push(upgrade);
  }

  return picks.slice(0, maxChoices);
}
