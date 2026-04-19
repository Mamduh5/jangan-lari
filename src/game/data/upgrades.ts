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
  | 'signature-phase-disc-rift-array'
  | 'signature-sunwheel-corona-lattice'
  | 'signature-shatterbell-aftershock'
  | 'branch-arc-bolt-lanebreaker'
  | 'branch-twin-fangs-serrated-stream'
  | 'branch-phase-disc-deep-cut'
  | 'branch-sunwheel-outer-ring';

export type UpgradeKind = 'core' | 'signature' | 'branch';
export type UpgradeChoiceMode = 'normal' | 'breakthrough';

export type UpgradeDefinition = {
  id: UpgradeId;
  title: string;
  description: string;
  kind: UpgradeKind;
  requiresWeaponId?: WeaponId;
  requiresUpgradeIds?: UpgradeId[];
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
  {
    id: 'signature-phase-disc-rift-array',
    title: 'Rift Array',
    description: 'Phase Disc splits into a twin-disc fan with broader pack coverage and deeper pass-through.',
    kind: 'signature',
    requiresWeaponId: 'phase-disc',
    exclusiveSignatureForWeapon: 'phase-disc',
    weaponStatPatch: {
      burstCount: 2,
      spreadDegrees: 20,
      pierceCount: 3,
    },
  },
  {
    id: 'signature-sunwheel-corona-lattice',
    title: 'Corona Lattice',
    description: 'Sunwheel throws a denser outer ring farther from the player and resets faster between novas.',
    kind: 'signature',
    requiresWeaponId: 'sunwheel',
    exclusiveSignatureForWeapon: 'sunwheel',
    weaponStatPatch: {
      radialCount: 8,
      range: 30,
      fireCooldownMs: -140,
    },
  },
  {
    id: 'branch-arc-bolt-lanebreaker',
    title: 'Lanebreaker',
    description: 'Volt Volley starts drilling through the front line with sharper velocity and light pierce.',
    kind: 'branch',
    requiresWeaponId: 'arc-bolt',
    requiresUpgradeIds: ['signature-arc-bolt-volt-volley'],
    weaponStatPatch: {
      pierceCount: 1,
      projectileSpeed: 120,
    },
  },
  {
    id: 'branch-twin-fangs-serrated-stream',
    title: 'Serrated Stream',
    description: 'Ripper Line tightens into a faster dart stream for close-range lane shredding.',
    kind: 'branch',
    requiresWeaponId: 'twin-fangs',
    requiresUpgradeIds: ['signature-twin-fangs-ripper-line'],
    weaponStatPatch: {
      spreadDegrees: 6,
      projectileSpeed: 80,
      fireCooldownMs: -70,
    },
  },
  {
    id: 'branch-phase-disc-deep-cut',
    title: 'Deep Cut',
    description: 'Rift Array keeps carving past the front pack with heavier pass-through and longer travel.',
    kind: 'branch',
    requiresWeaponId: 'phase-disc',
    requiresUpgradeIds: ['signature-phase-disc-rift-array'],
    weaponStatPatch: {
      pierceCount: 5,
      range: 70,
    },
  },
  {
    id: 'branch-sunwheel-outer-ring',
    title: 'Outer Ring',
    description: 'Corona Lattice widens into a larger control halo with more orbiting blades per pulse.',
    kind: 'branch',
    requiresWeaponId: 'sunwheel',
    requiresUpgradeIds: ['signature-sunwheel-corona-lattice'],
    weaponStatPatch: {
      radialCount: 10,
      range: 35,
      projectileRadius: 1,
    },
  },
];

export function findUpgradeDefinitionById(upgradeId: UpgradeId): UpgradeDefinition | undefined {
  return UPGRADE_POOL.find((upgrade) => upgrade.id === upgradeId);
}

export function getEligibleSignatureUpgrades(
  upgrades: UpgradeDefinition[],
  ownedWeaponIds: Iterable<WeaponId>,
  takenUpgradeIds: Iterable<UpgradeId>,
): UpgradeDefinition[] {
  const ownedWeaponSet = new Set(ownedWeaponIds);
  const takenUpgradeIdSet = new Set(takenUpgradeIds);
  const takenSignatureWeaponSet = new Set(
    upgrades
      .filter(
        (upgrade) =>
          upgrade.kind === 'signature' &&
          takenUpgradeIdSet.has(upgrade.id) &&
          Boolean(upgrade.exclusiveSignatureForWeapon),
      )
      .map((upgrade) => upgrade.exclusiveSignatureForWeapon as WeaponId),
  );

  return upgrades.filter(
    (upgrade) =>
      upgrade.kind === 'signature' &&
      Boolean(upgrade.requiresWeaponId) &&
      ownedWeaponSet.has(upgrade.requiresWeaponId as WeaponId) &&
      !takenUpgradeIdSet.has(upgrade.id) &&
      (!upgrade.exclusiveSignatureForWeapon || !takenSignatureWeaponSet.has(upgrade.exclusiveSignatureForWeapon)),
  );
}

export function getEligibleBranchUpgrades(
  upgrades: UpgradeDefinition[],
  ownedWeaponIds: Iterable<WeaponId>,
  takenUpgradeIds: Iterable<UpgradeId>,
): UpgradeDefinition[] {
  const ownedWeaponSet = new Set(ownedWeaponIds);
  const takenUpgradeIdSet = new Set(takenUpgradeIds);

  return upgrades.filter(
    (upgrade) =>
      upgrade.kind === 'branch' &&
      Boolean(upgrade.requiresWeaponId) &&
      ownedWeaponSet.has(upgrade.requiresWeaponId as WeaponId) &&
      !takenUpgradeIdSet.has(upgrade.id) &&
      (upgrade.requiresUpgradeIds ?? []).every((requiredUpgradeId) => takenUpgradeIdSet.has(requiredUpgradeId)),
  );
}

const BREAKTHROUGH_PRIORITY_CORE_UPGRADE_IDS = new Set<UpgradeId>(['power', 'rapid-fire', 'velocity', 'reach']);
const BREAKTHROUGH_EXCLUDED_FALLBACK_UPGRADE_IDS = new Set<UpgradeId>(['vitality', 'swiftness', 'magnet']);
const WEAPON_DIRECTION_UPGRADE_IDS = new Set<UpgradeId>([
  'unlock-twin-fangs',
  'unlock-ember-lance',
  'unlock-bloom-cannon',
  'unlock-phase-disc',
  'unlock-sunwheel',
  'unlock-shatterbell',
]);

function isWeaponDirectionUpgrade(upgrade: UpgradeDefinition): boolean {
  return WEAPON_DIRECTION_UPGRADE_IDS.has(upgrade.id);
}

function isBranchUpgrade(upgrade: UpgradeDefinition): boolean {
  return upgrade.kind === 'branch';
}

export function shouldQueueBreakthroughChoice(options: {
  upgrades: UpgradeDefinition[];
  ownedWeaponIds: Iterable<WeaponId>;
  takenUpgradeIds: Iterable<UpgradeId>;
  milestoneConsumed: boolean;
}): boolean {
  return (
    !options.milestoneConsumed &&
    getEligibleSignatureUpgrades(options.upgrades, options.ownedWeaponIds, options.takenUpgradeIds).length > 0
  );
}

export function buildLevelUpChoices(options: {
  upgrades: UpgradeDefinition[];
  ownedWeaponIds: Iterable<WeaponId>;
  takenUpgradeIds: Iterable<UpgradeId>;
  forceSignature: boolean;
  preferWeaponDirection?: boolean;
  mode?: UpgradeChoiceMode;
  shuffle?: <T>(items: T[]) => T[];
  maxChoices?: number;
}): UpgradeDefinition[] {
  const shuffle = options.shuffle ?? ((items) => [...items]);
  const maxChoices = options.maxChoices ?? 3;
  const mode = options.mode ?? 'normal';
  const preferWeaponDirection = options.preferWeaponDirection ?? false;
  const eligibleSignatures = getEligibleSignatureUpgrades(
    options.upgrades,
    options.ownedWeaponIds,
    options.takenUpgradeIds,
  );
  const eligibleBranches = getEligibleBranchUpgrades(options.upgrades, options.ownedWeaponIds, options.takenUpgradeIds);
  const coreUpgrades = options.upgrades.filter((upgrade) => upgrade.kind === 'core');
  const regularPool = shuffle([...coreUpgrades, ...eligibleBranches, ...eligibleSignatures]);
  const picks: UpgradeDefinition[] = [];
  const shouldInjectSignature = options.forceSignature || mode === 'breakthrough';

  if (shouldInjectSignature && eligibleSignatures.length > 0) {
    picks.push(shuffle([...eligibleSignatures])[0]);
  }

  if (mode === 'breakthrough') {
    const breakthroughPriorityPool = shuffle(
      coreUpgrades.filter((upgrade) => BREAKTHROUGH_PRIORITY_CORE_UPGRADE_IDS.has(upgrade.id)),
    );
    const breakthroughFallbackPool = shuffle(
      coreUpgrades.filter(
        (upgrade) =>
          !BREAKTHROUGH_PRIORITY_CORE_UPGRADE_IDS.has(upgrade.id) &&
          !BREAKTHROUGH_EXCLUDED_FALLBACK_UPGRADE_IDS.has(upgrade.id),
      ),
    );

    for (const upgrade of [...breakthroughPriorityPool, ...breakthroughFallbackPool]) {
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

  if (picks.length < maxChoices && !picks.some((upgrade) => isBranchUpgrade(upgrade))) {
    const branchChoices = shuffle([...eligibleBranches]);

    for (const upgrade of branchChoices) {
      if (picks.some((existing) => existing.id === upgrade.id)) {
        continue;
      }

      picks.push(upgrade);
      break;
    }
  }

  if (preferWeaponDirection && picks.length < maxChoices && !picks.some((upgrade) => isWeaponDirectionUpgrade(upgrade))) {
    const weaponDirectionChoices = shuffle(coreUpgrades.filter((upgrade) => isWeaponDirectionUpgrade(upgrade)));

    for (const upgrade of weaponDirectionChoices) {
      if (picks.some((existing) => existing.id === upgrade.id)) {
        continue;
      }

      picks.push(upgrade);
      break;
    }
  }

  const fillerPool = options.forceSignature && picks.length > 0 ? shuffle([...coreUpgrades, ...eligibleBranches]) : regularPool;

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
