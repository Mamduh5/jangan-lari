import { MINIBOSS_LINE_STRIKE_DAMAGE_ACTIVE_MS, MINIBOSS_LINE_STRIKE_WIDTH } from '../../src/game/config/constants';
import {
  bossShockwaveDamageAndVisualMatch,
  createBossShockwaveContract,
  createMinibossLineAttackContract,
  createMinibossVolleyContract,
  lineAttackDamageAndVisualMatch,
  minibossVolleyProjectileDamageAndVisualMatch,
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

  test('miniboss volley projectiles use the same visual and damage radius', () => {
    const contract = createMinibossVolleyContract();

    expect(contract.projectileCount).toBeGreaterThan(1);
    expect(contract.projectileDamageRadius).toBe(contract.projectileVisualRadius);
    expect(minibossVolleyProjectileDamageAndVisualMatch(contract)).toBe(true);
  });
});
