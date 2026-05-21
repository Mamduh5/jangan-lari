import {
  BOSS_FIRST_PASS_MAX_HEALTH,
  ENEMY_ACTIVE_CAP,
  ENEMY_SCALING_INTERVAL_MS,
  ENEMY_SCALING_MAX_STACK,
} from '../../src/game/config/constants';
import { ENEMY_ARCHETYPES } from '../../src/game/data/enemies';
import {
  applyEventEnemyStatMultiplier,
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
    const multipliers = getEnemyScalingMultipliers(2);
    expect(multipliers.hp).toBeCloseTo(1.68);
    expect(multipliers.speed).toBe(1.09);
    expect(multipliers.damage).toBe(1.16);
    expect(multipliers.projectileCooldown).toBe(0.944);
    expect(multipliers.projectileSpeed).toBe(1.07);
  });

  test('scales regular enemies more strongly than major encounters', () => {
    const elapsedMs = ENEMY_SCALING_INTERVAL_MS * 4;
    const hexcaster = applyEnemyScaling(ENEMY_ARCHETYPES.hexcaster, elapsedMs);
    const boss = applyEnemyScaling(ENEMY_ARCHETYPES.behemoth, elapsedMs);

    expect(getEnemyMajorEncounterFactor(ENEMY_ARCHETYPES.hexcaster)).toBe(1);
    expect(getEnemyMajorEncounterFactor(ENEMY_ARCHETYPES.behemoth)).toBe(0.65);
    expect(hexcaster.maxHealth).toBe(227);
    expect(hexcaster.shotCooldownMs).toBe(1465);
    expect(boss.maxHealth).toBe(Math.round(BOSS_FIRST_PASS_MAX_HEALTH * 1.884));
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

  test('event stat multiplier applies only when explicitly requested', () => {
    const base = ENEMY_ARCHETYPES.harrier;
    const eventEnemy = applyEventEnemyStatMultiplier(base);

    expect(base.maxHealth).toBe(74);
    expect(base.contactDamage).toBe(11);
    expect(eventEnemy.maxHealth).toBe(370);
    expect(eventEnemy.contactDamage).toBe(55);
    expect(eventEnemy.speed).toBeGreaterThan(base.speed);
  });
});
