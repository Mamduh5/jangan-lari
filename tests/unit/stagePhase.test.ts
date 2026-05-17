import { BOSS_SPAWN_TIME_MS } from '../../src/game/config/constants';
import {
  areNormalSpawnsSuppressed,
  getStagePhaseForRunState,
  getStageVictoryCondition,
} from '../../src/game/utils/stagePhase';

describe('stage phase helper', () => {
  test('stays pre-boss before boss spawn time', () => {
    const phase = getStagePhaseForRunState({
      elapsedMs: BOSS_SPAWN_TIME_MS - 1,
      bossSpawnTimeMs: BOSS_SPAWN_TIME_MS,
      bossActive: false,
      ended: false,
      victory: false,
    });

    expect(phase).toBe('preBoss');
    expect(areNormalSpawnsSuppressed(phase)).toBe(false);
    expect(getStageVictoryCondition(phase)).toBe('pendingBoss');
  });

  test('moves to boss at spawn time without becoming victory', () => {
    const phase = getStagePhaseForRunState({
      elapsedMs: BOSS_SPAWN_TIME_MS,
      bossSpawnTimeMs: BOSS_SPAWN_TIME_MS,
      bossActive: false,
      ended: false,
      victory: false,
    });

    expect(phase).toBe('boss');
    expect(areNormalSpawnsSuppressed(phase)).toBe(true);
    expect(getStageVictoryCondition(phase)).toBe('bossActive');
  });

  test('distinguishes boss-defeated victory from player defeat', () => {
    expect(
      getStagePhaseForRunState({
        elapsedMs: BOSS_SPAWN_TIME_MS + 5000,
        bossSpawnTimeMs: BOSS_SPAWN_TIME_MS,
        bossActive: false,
        ended: true,
        victory: true,
      }),
    ).toBe('victory');
    expect(getStageVictoryCondition('victory')).toBe('bossDefeated');

    expect(
      getStagePhaseForRunState({
        elapsedMs: BOSS_SPAWN_TIME_MS + 5000,
        bossSpawnTimeMs: BOSS_SPAWN_TIME_MS,
        bossActive: true,
        ended: true,
        victory: false,
      }),
    ).toBe('defeat');
    expect(getStageVictoryCondition('defeat')).toBe('playerDefeated');
  });
});
