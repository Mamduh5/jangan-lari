import {
  BOSS_SUMMON_MAX_ACTIVE,
  BOSS_SUMMON_XP_VALUE,
} from '../../src/game/config/constants';
import { ENEMY_ARCHETYPES } from '../../src/game/data/enemies';
import {
  createBossSummonArchetype,
  getAvailableBossSummonSlots,
  getBossPhasePressureState,
  shouldSpawnBossSummons,
} from '../../src/game/systems/bossSummons';

describe('boss summon helpers', () => {
  test('caps available boss-owned summon slots', () => {
    expect(getAvailableBossSummonSlots(0)).toBe(BOSS_SUMMON_MAX_ACTIVE);
    expect(getAvailableBossSummonSlots(BOSS_SUMMON_MAX_ACTIVE - 2)).toBe(2);
    expect(getAvailableBossSummonSlots(BOSS_SUMMON_MAX_ACTIVE + 3)).toBe(0);
  });

  test('only allows summons during active phase 2 boss pressure', () => {
    const baseOptions = {
      stagePhase: 'boss' as const,
      bossPhase: 2 as const,
      bossActive: true,
      elapsedMs: 10_000,
      nextSummonAtMs: 9_000,
      activeSummonCount: 0,
    };

    expect(shouldSpawnBossSummons(baseOptions)).toBe(true);
    expect(shouldSpawnBossSummons({ ...baseOptions, bossPhase: 1 })).toBe(false);
    expect(shouldSpawnBossSummons({ ...baseOptions, stagePhase: 'preBoss' })).toBe(false);
    expect(shouldSpawnBossSummons({ ...baseOptions, bossActive: false })).toBe(false);
    expect(shouldSpawnBossSummons({ ...baseOptions, elapsedMs: 8_999 })).toBe(false);
    expect(shouldSpawnBossSummons({ ...baseOptions, activeSummonCount: BOSS_SUMMON_MAX_ACTIVE })).toBe(false);
  });

  test('builds a lightweight boss-owned summon archetype from existing data', () => {
    const summon = createBossSummonArchetype(ENEMY_ARCHETYPES.scuttler);

    expect(summon.id).toBe('scuttler');
    expect(summon.maxHealth).toBeGreaterThan(ENEMY_ARCHETYPES.scuttler.maxHealth);
    expect(summon.contactDamage).toBeLessThan(ENEMY_ARCHETYPES.scuttler.contactDamage);
    expect(summon.speed).toBeGreaterThan(ENEMY_ARCHETYPES.scuttler.speed);
    expect(summon.xpValue).toBe(BOSS_SUMMON_XP_VALUE);
    expect(summon.isBoss).toBe(false);
    expect(summon.isElite).toBe(false);
  });

  test('reports phase 2 summons as the boss pressure state', () => {
    expect(getBossPhasePressureState({ stagePhase: 'boss', bossPhase: 2, bossActive: true })).toBe('phase2-summons');
    expect(getBossPhasePressureState({ stagePhase: 'boss', bossPhase: 1, bossActive: true })).toBe('inactive');
  });
});
