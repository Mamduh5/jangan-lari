import { UPGRADE_POOL } from '../../src/game/data/upgrades';
import { getUpgradeRewardType, upgradeHasWeaponRewardTag } from '../../src/game/systems/rewardClassification';

describe('reward classification', () => {
  test('weapon unlock rewards receive the weapon tag classification', () => {
    const twinFangs = UPGRADE_POOL.find((upgrade) => upgrade.id === 'unlock-twin-fangs');

    expect(twinFangs).toBeTruthy();
    expect(getUpgradeRewardType(twinFangs!)).toBe('weapon');
    expect(upgradeHasWeaponRewardTag(twinFangs!)).toBe(true);
  });

  test('signature and branch rewards are weapon rewards', () => {
    const signature = UPGRADE_POOL.find((upgrade) => upgrade.id === 'signature-arc-bolt-volt-volley');
    const branch = UPGRADE_POOL.find((upgrade) => upgrade.id === 'branch-arc-bolt-lanebreaker');

    expect(signature).toBeTruthy();
    expect(branch).toBeTruthy();
    expect(getUpgradeRewardType(signature!)).toBe('weapon');
    expect(getUpgradeRewardType(branch!)).toBe('weapon');
    expect(upgradeHasWeaponRewardTag(signature!)).toBe(true);
    expect(upgradeHasWeaponRewardTag(branch!)).toBe(true);
  });

  test('stat and passive rewards do not receive weapon tags', () => {
    const vitality = UPGRADE_POOL.find((upgrade) => upgrade.id === 'vitality');
    const rapidFire = UPGRADE_POOL.find((upgrade) => upgrade.id === 'rapid-fire');

    expect(vitality).toBeTruthy();
    expect(rapidFire).toBeTruthy();
    expect(getUpgradeRewardType(vitality!)).toBe('stat');
    expect(getUpgradeRewardType(rapidFire!)).toBe('passive');
    expect(upgradeHasWeaponRewardTag(vitality!)).toBe(false);
    expect(upgradeHasWeaponRewardTag(rapidFire!)).toBe(false);
  });
});
