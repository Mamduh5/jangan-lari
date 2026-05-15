import { calculateRunScore } from '../../src/game/utils/runScore';

describe('run score helper', () => {
  test('scores transparent run pressure inputs deterministically', () => {
    expect(
      calculateRunScore({
        neutralShapesDestroyed: 4,
        enemyKills: 3,
        levelReached: 5,
        timeSurvivedMs: 12_800,
        goldEarned: 7,
      }),
    ).toBe(624);
  });

  test('clamps invalid score contributors to zero floors', () => {
    expect(
      calculateRunScore({
        neutralShapesDestroyed: -1,
        enemyKills: -1,
        levelReached: 0,
        timeSurvivedMs: -1000,
        goldEarned: -5,
      }),
    ).toBe(0);
  });
});
