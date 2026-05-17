import { MINIBOSS_LINE_STRIKE_DAMAGE_ACTIVE_MS, MINIBOSS_LINE_STRIKE_WIDTH } from '../../src/game/config/constants';
import {
  createMinibossLineAttackContract,
  lineAttackDamageAndVisualMatch,
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
});
