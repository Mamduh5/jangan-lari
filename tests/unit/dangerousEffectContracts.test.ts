import { MINIBOSS_LINE_STRIKE_DAMAGE_ACTIVE_MS, MINIBOSS_LINE_STRIKE_MIN_LENGTH, MINIBOSS_LINE_STRIKE_WIDTH } from '../../src/game/config/constants';
import {
  bossShockwaveDamageAndVisualMatch,
  createBossShockwaveContract,
  createMinibossLineAttackContract,
  createMinibossVolleyContract,
  computeMinibossLineStrikeDynamicLength,
  lineAttackDamageAndVisualMatch,
  minibossVolleyLaneDamageAndVisualMatch,
} from '../../src/game/systems/dangerousEffectContracts';

describe('dangerous effect contracts', () => {
  test('miniboss line strike active visual matches damage geometry and duration', () => {
    const contract = createMinibossLineAttackContract();

    expect(contract.damageWidth).toBe(MINIBOSS_LINE_STRIKE_WIDTH);
    expect(contract.visualWidth).toBe(contract.damageWidth);
    expect(contract.halfWidth * 2).toBe(contract.damageWidth);
    expect(contract.activeVisualMs).toBe(MINIBOSS_LINE_STRIKE_DAMAGE_ACTIVE_MS);
    expect(contract.damageActiveMs).toBe(contract.activeVisualMs);
    expect(lineAttackDamageAndVisualMatch(contract)).toBe(true);
  });

  test('line strike contract carries dynamic length parameters', () => {
    const contract = createMinibossLineAttackContract();

    expect(contract.minLength).toBe(MINIBOSS_LINE_STRIKE_MIN_LENGTH);
    expect(contract.maxLength).toBeGreaterThan(contract.minLength);
    expect(contract.overrunDistance).toBeGreaterThan(0);
    expect(contract.travelMultiplier).toBeGreaterThan(1);
  });

  test('dynamic strike length clamps to min/max and adds overrun', () => {
    const contract = createMinibossLineAttackContract();

    expect(computeMinibossLineStrikeDynamicLength(0)).toBe(contract.minLength);
    expect(computeMinibossLineStrikeDynamicLength(500)).toBe(610);
    expect(computeMinibossLineStrikeDynamicLength(1000)).toBe(contract.maxLength);
    const normalDashDistancePx = 92 * 2.45 * (380 / 1000);
    expect(contract.minLength * contract.travelMultiplier).toBeGreaterThan(normalDashDistancePx * 4);
  });

  test('custom line lengths keep visual and damage range together', () => {
    const contract = createMinibossLineAttackContract(260);

    expect(contract.length).toBe(260);
    expect(contract.length).toBeGreaterThan(0);
    expect(lineAttackDamageAndVisualMatch(contract)).toBe(true);
  });

  test('boss shockwave keeps active visual and damage ring geometry matched across phases', () => {
    const phaseOne = createBossShockwaveContract(1);
    const phaseTwo = createBossShockwaveContract(2);

    expect(bossShockwaveDamageAndVisualMatch(phaseOne)).toBe(true);
    expect(bossShockwaveDamageAndVisualMatch(phaseTwo)).toBe(true);
    expect(phaseTwo.radius).toBeGreaterThan(phaseOne.radius);
    expect(phaseTwo.cooldownMaxMs).toBeLessThan(phaseOne.cooldownMaxMs);
    expect(phaseTwo.damageMultiplier).toBeGreaterThan(phaseOne.damageMultiplier);
  });

  test('miniboss volley lanes use matching damage and visual geometry', () => {
    const contract = createMinibossVolleyContract();

    expect(contract.laneCount).toBeGreaterThan(1);
    expect(contract.laneDamageWidth).toBeGreaterThan(0);
    expect(contract.laneVisualWidth).toBeGreaterThan(0);
    expect(contract.laneHalfWidth * 2).toBe(contract.laneDamageWidth);
    expect(contract.activeMs).toBeGreaterThan(0);
    expect(minibossVolleyLaneDamageAndVisualMatch(contract)).toBe(true);
  });
});
