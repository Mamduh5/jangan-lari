import { BOSS_PHASE_TWO_HEALTH_RATIO } from '../../src/game/config/constants';
import { resolveBossPhase } from '../../src/game/systems/bossPhase';

describe('boss phase helper', () => {
  test('stays phase 1 above the threshold', () => {
    expect(
      resolveBossPhase({
        currentPhase: 1,
        phaseTwoTriggered: false,
        hp: 6001,
        maxHp: 12000,
      }),
    ).toEqual({ phase: 1, phaseTwoTriggered: false, changed: false });
  });

  test('triggers phase 2 once at the configured health threshold', () => {
    expect(
      resolveBossPhase({
        currentPhase: 1,
        phaseTwoTriggered: false,
        hp: 12000 * BOSS_PHASE_TWO_HEALTH_RATIO,
        maxHp: 12000,
      }),
    ).toEqual({ phase: 2, phaseTwoTriggered: true, changed: true });
  });

  test('does not retrigger phase 2 after it has already happened', () => {
    expect(
      resolveBossPhase({
        currentPhase: 2,
        phaseTwoTriggered: true,
        hp: 4000,
        maxHp: 12000,
      }),
    ).toEqual({ phase: 2, phaseTwoTriggered: true, changed: false });
  });
});
