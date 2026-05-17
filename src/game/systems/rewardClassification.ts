import type { UpgradeDefinition, UpgradeId } from '../data/upgrades';

export type UpgradeRewardType = 'weapon' | 'stat' | 'passive' | 'utility';

const WEAPON_UNLOCK_UPGRADE_IDS = new Set<UpgradeId>([
  'unlock-twin-fangs',
  'unlock-ember-lance',
  'unlock-bloom-cannon',
  'unlock-phase-disc',
  'unlock-sunwheel',
  'unlock-shatterbell',
]);

const STAT_UPGRADE_IDS = new Set<UpgradeId>(['vitality', 'swiftness']);

export function getUpgradeRewardType(upgrade: UpgradeDefinition): UpgradeRewardType {
  if (upgrade.kind === 'signature' || upgrade.kind === 'branch' || WEAPON_UNLOCK_UPGRADE_IDS.has(upgrade.id)) {
    return 'weapon';
  }

  if (STAT_UPGRADE_IDS.has(upgrade.id)) {
    return 'stat';
  }

  if (upgrade.id === 'magnet') {
    return 'utility';
  }

  return 'passive';
}

export function upgradeHasWeaponRewardTag(upgrade: UpgradeDefinition): boolean {
  return getUpgradeRewardType(upgrade) === 'weapon';
}
