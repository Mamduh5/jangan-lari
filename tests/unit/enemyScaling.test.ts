import { ENEMY_ACTIVE_CAP, ENEMY_SCALING_INTERVAL_MS, ENEMY_SCALING_MAX_STACK } from '../../src/game/config/constants';
import { ENEMY_ARCHETYPES } from '../../src/game/data/enemies';
import {
  applyEnemyScaling,
  getAvailableEnemySpawnSlots,
  getEnemyMajorEncounterFactor,
  getEnemyScalingMultipliers,
  getEnemyScalingSnapshot,
  getEnemyScalingStack,
} from '../../src/game/systems/enemyScaling';

describe('enemy scaling', () => {
  test('starts at stack 0 and advances by interval', () => {
    expect(getEnemyScalingStack(0)).toBe(0);
    expect(getEnemyScalingStack(ENEMY_SCALING_INTERVAL_MS - 1)).toBe(0);
    expect(getEnemyScalingStack(ENEMY_SCALING_INTERVAL_MS)).toBe(1);
    expect(getEnemyScalingStack(ENEMY_SCALING_INTERVAL_MS * 3)).toBe(3);
  });

  test('caps normal timed scaling at max stack', () => {
    expect(getEnemyScalingStack(ENEMY_SCALING_INTERVAL_MS * (ENEMY_SCALING_MAX_STACK + 10))).toBe(
      ENEMY_SCALING_MAX_STACK,
    );
  });

  test('calculates deterministic stat multipliers', () => {
    expect(getEnemyScalingMultipliers(2)).toEqual({
      hp: 1.16,
      speed: 1.05,
      damage: 1.12,
      projectileCooldown: 0.95,
      projectileSpeed: 1.05,
    });
  });

  test('scales regular enemies more strongly than major encounters', () => {
    const elapsedMs = ENEMY_SCALING_INTERVAL_MS * 4;
    const hexcaster = applyEnemyScaling(ENEMY_ARCHETYPES.hexcaster, elapsedMs);
    const boss = applyEnemyScaling(ENEMY_ARCHETYPES.behemoth, elapsedMs);

    expect(getEnemyMajorEncounterFactor(ENEMY_ARCHETYPES.hexcaster)).toBe(1);
    expect(getEnemyMajorEncounterFactor(ENEMY_ARCHETYPES.behemoth)).toBe(0.5);
    expect(hexcaster.maxHealth).toBe(55);
    expect(hexcaster.shotCooldownMs).toBe(1575);
    expect(boss.maxHealth).toBe(13920);
  });

  test('reports scaling snapshot and active cap slots', () => {
    expect(getEnemyScalingSnapshot(ENEMY_SCALING_INTERVAL_MS * 2)).toMatchObject({
      stack: 2,
      maxStack: ENEMY_SCALING_MAX_STACK,
      intervalMs: ENEMY_SCALING_INTERVAL_MS,
    });
    expect(getAvailableEnemySpawnSlots(0)).toBe(ENEMY_ACTIVE_CAP);
    expect(getAvailableEnemySpawnSlots(ENEMY_ACTIVE_CAP - 2)).toBe(2);
    expect(getAvailableEnemySpawnSlots(ENEMY_ACTIVE_CAP + 5)).toBe(0);
  });
});
