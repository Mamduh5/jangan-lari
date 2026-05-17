import { DEFAULT_HP_REGEN_MAX_DELTA_MS } from '../../src/game/config/constants';
import { resolveHpRegenTick } from '../../src/game/systems/hpRegen';

describe('hp regen', () => {
  test('heals over time with fractional accumulation', () => {
    const first = resolveHpRegenTick({
      currentHp: 50,
      maxHp: 100,
      regenPerSecond: 2,
      accumulator: 0,
      deltaMs: 250,
      alive: true,
    });

    expect(first.nextHp).toBe(50);
    expect(first.nextAccumulator).toBe(0.5);
    expect(first.active).toBe(true);

    const second = resolveHpRegenTick({
      currentHp: first.nextHp,
      maxHp: 100,
      regenPerSecond: 2,
      accumulator: first.nextAccumulator,
      deltaMs: 250,
      alive: true,
    });

    expect(second.nextHp).toBe(51);
    expect(second.nextAccumulator).toBe(0);
    expect(second.healedAmount).toBe(1);
  });

  test('does not heal above max hp', () => {
    const result = resolveHpRegenTick({
      currentHp: 99,
      maxHp: 100,
      regenPerSecond: 8,
      accumulator: 0,
      deltaMs: 1000,
      maxDeltaMs: 1000,
      alive: true,
    });

    expect(result.nextHp).toBe(100);
    expect(result.nextAccumulator).toBe(0);
    expect(result.healedAmount).toBe(1);
  });

  test('does not apply while dead', () => {
    const result = resolveHpRegenTick({
      currentHp: 0,
      maxHp: 100,
      regenPerSecond: 5,
      accumulator: 0.5,
      deltaMs: 1000,
      alive: false,
    });

    expect(result.nextHp).toBe(0);
    expect(result.nextAccumulator).toBe(0);
    expect(result.active).toBe(false);
  });

  test('uses the configured default max delta cap', () => {
    const capped = resolveHpRegenTick({
      currentHp: 50,
      maxHp: 100,
      regenPerSecond: 8,
      accumulator: 0,
      deltaMs: DEFAULT_HP_REGEN_MAX_DELTA_MS * 4,
      alive: true,
    });
    const uncapped = resolveHpRegenTick({
      currentHp: 50,
      maxHp: 100,
      regenPerSecond: 8,
      accumulator: 0,
      deltaMs: DEFAULT_HP_REGEN_MAX_DELTA_MS,
      alive: true,
    });

    expect(capped).toEqual(uncapped);
  });
});
