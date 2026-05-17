import { createTankStatEffectSnapshot, sanitizeTankStatLevels } from '../../src/game/data/tankStats';
import { TankStatRuntime } from '../../src/game/systems/TankStatRuntime';

describe('tank stat runtime', () => {
  test('starts with zero stat levels and no available points', () => {
    const stats = new TankStatRuntime();

    expect(stats.getAvailablePoints()).toBe(0);
    expect(stats.getLevels()).toEqual({
      bulletDamage: 0,
      reload: 0,
      moveSpeed: 0,
      hpRegen: 0,
    });
  });

  test('spends granted points into stat levels', () => {
    const stats = new TankStatRuntime();
    stats.grantPoints(2);

    const result = stats.spendPoint('moveSpeed');

    expect(result).toMatchObject({
      spent: true,
      statId: 'moveSpeed',
      previousLevel: 0,
      nextLevel: 1,
      effectDelta: 10,
    });
    expect(stats.getAvailablePoints()).toBe(1);
    expect(stats.getLevels().moveSpeed).toBe(1);
  });

  test('refuses spending when no points are available', () => {
    const stats = new TankStatRuntime();

    const result = stats.spendPoint('bulletDamage');

    expect(result.spent).toBe(false);
    expect(stats.getLevels().bulletDamage).toBe(0);
  });

  test('caps stat spending at max level', () => {
    const stats = new TankStatRuntime();
    stats.grantPoints(8);

    for (let index = 0; index < 8; index += 1) {
      stats.spendPoint('reload');
    }

    expect(stats.getLevels().reload).toBe(5);
    expect(stats.getAvailablePoints()).toBe(3);
  });

  test('keeps leftover points unspendable after every stat reaches max level', () => {
    const stats = new TankStatRuntime();
    stats.grantPoints(27);

    for (const statId of ['bulletDamage', 'reload', 'moveSpeed', 'hpRegen'] as const) {
      for (let index = 0; index < 5; index += 1) {
        stats.spendPoint(statId);
      }
    }

    expect(stats.getAvailablePoints()).toBe(7);
    expect((['bulletDamage', 'reload', 'moveSpeed', 'hpRegen'] as const).some((statId) => stats.canSpend(statId))).toBe(false);
  });

  test('calculates stat effects predictably from levels', () => {
    expect(
      createTankStatEffectSnapshot({
        bulletDamage: 2,
        reload: 3,
        moveSpeed: 1,
        hpRegen: 4,
      }),
    ).toEqual({
      bulletDamageBonus: 4,
      fireCooldownReductionMs: 60,
      moveSpeedBonus: 10,
      hpRegenPerSecond: 1.4,
    });
  });

  test('sanitizes stale maxHealth run stat state without exposing it as spendable', () => {
    const stats = new TankStatRuntime({ maxHealth: 5 }, 1);

    expect(stats.canSpend('maxHealth')).toBe(false);
    expect(stats.spendPoint('maxHealth').spent).toBe(false);
    expect(
      sanitizeTankStatLevels({
        bulletDamage: 1,
        maxHealth: 5,
      }),
    ).toEqual({
      bulletDamage: 1,
      reload: 0,
      moveSpeed: 0,
      hpRegen: 0,
    });
  });
});
