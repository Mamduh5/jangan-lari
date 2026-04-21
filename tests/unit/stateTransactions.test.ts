import type { Enemy } from '../../src/game/entities/Enemy';
import { CombatStateRuntime } from '../../src/game/systems/CombatStateRuntime';
import { TraitRuntime } from '../../src/game/systems/TraitRuntime';
import { TriggerSeam } from '../../src/game/systems/TriggerSeam';

function createMockStateEnemy(): Enemy {
  let markedUntil = 0;
  let disruptedUntil = 0;
  let ailmentUntil = 0;

  return {
    applyMark(currentTime: number, durationMs: number): void {
      markedUntil = Math.max(markedUntil, currentTime + durationMs);
    },
    isMarked(currentTime: number): boolean {
      return currentTime < markedUntil;
    },
    consumeMark(currentTime: number): boolean {
      if (currentTime >= markedUntil) {
        return false;
      }
      markedUntil = 0;
      return true;
    },
    applyDisrupted(currentTime: number, durationMs: number): void {
      disruptedUntil = Math.max(disruptedUntil, currentTime + durationMs);
    },
    isDisrupted(currentTime: number): boolean {
      return currentTime < disruptedUntil;
    },
    applyAilment(currentTime: number, durationMs: number): void {
      ailmentUntil = Math.max(ailmentUntil, currentTime + durationMs);
    },
    isAilmented(currentTime: number): boolean {
      return currentTime < ailmentUntil;
    },
    consumeAilment(currentTime: number): boolean {
      if (currentTime >= ailmentUntil) {
        return false;
      }
      ailmentUntil = 0;
      return true;
    },
  } as unknown as Enemy;
}

describe('state transactions', () => {
  test('Guard transactions report blocked, no-op, applied, consumed, and absorb payloads', () => {
    const states = new CombatStateRuntime();
    states.setMaxGuard(10);

    expect(states.gainGuardTx(0).status).toBe('blocked');
    expect(states.gainGuardTx(6)).toMatchObject({
      status: 'applied',
      value: 6,
      previous: 0,
      current: 6,
      max: 10,
    });
    expect(states.gainGuardTx(10)).toMatchObject({
      status: 'applied',
      value: 4,
      previous: 6,
      current: 10,
      max: 10,
    });
    expect(states.gainGuardTx(3)).toMatchObject({
      status: 'no-op',
      value: 0,
      previous: 10,
      current: 10,
      max: 10,
    });

    expect(states.spendGuardTx(0).status).toBe('blocked');
    expect(states.spendGuardTx(4)).toMatchObject({
      status: 'consumed',
      value: 4,
      previous: 10,
      current: 6,
    });
    expect(states.absorbDamageTx(8)).toMatchObject({
      status: 'consumed',
      absorbed: 6,
      remaining: 2,
    });
    expect(states.getGuard()).toBe(0);
    expect(states.absorbDamageTx(5)).toMatchObject({
      status: 'no-op',
      absorbed: 0,
      remaining: 5,
    });
  });

  test('Mark transactions report applied, refreshed, consumed, and no-op transitions', () => {
    const states = new CombatStateRuntime();
    const enemy = createMockStateEnemy();

    expect(states.applyMarkTx(enemy, 1_000, 1_600)).toMatchObject({
      family: 'mark',
      status: 'applied',
      wasActive: false,
      isActive: true,
    });
    expect(states.applyMarkTx(enemy, 1_100, 1_600)).toMatchObject({
      family: 'mark',
      status: 'refreshed',
      wasActive: true,
      isActive: true,
    });
    expect(states.consumeMarkTx(enemy, 1_200)).toMatchObject({
      family: 'mark',
      status: 'consumed',
      consumed: true,
      wasActive: true,
      isActive: false,
    });
    expect(states.consumeMarkTx(enemy, 1_250)).toMatchObject({
      family: 'mark',
      status: 'no-op',
      consumed: false,
      wasActive: false,
      isActive: false,
    });
  });

  test('Disrupted transactions report apply and refresh transitions', () => {
    const states = new CombatStateRuntime();
    const enemy = createMockStateEnemy();

    expect(states.applyDisruptedTx(enemy, 1_000, 1_500)).toMatchObject({
      family: 'disrupted',
      status: 'applied',
      wasActive: false,
      isActive: true,
    });
    expect(states.applyDisruptedTx(enemy, 1_100, 1_500)).toMatchObject({
      family: 'disrupted',
      status: 'refreshed',
      wasActive: true,
      isActive: true,
    });
  });

  test('Ailment transactions report apply, refresh, consume, and no-op transitions', () => {
    const states = new CombatStateRuntime();
    const enemy = createMockStateEnemy();

    expect(states.applyAilmentTx(enemy, 1_000, 0)).toMatchObject({
      family: 'ailment',
      status: 'no-op',
      wasActive: false,
      isActive: false,
    });
    expect(states.applyAilmentTx(enemy, 1_000, 2_100)).toMatchObject({
      family: 'ailment',
      status: 'applied',
      wasActive: false,
      isActive: true,
    });
    expect(states.applyAilmentTx(enemy, 1_100, 2_100)).toMatchObject({
      family: 'ailment',
      status: 'refreshed',
      wasActive: true,
      isActive: true,
    });
    expect(states.consumeAilmentTx(enemy, 1_400)).toMatchObject({
      family: 'ailment',
      status: 'consumed',
      consumed: true,
      wasActive: true,
      isActive: false,
    });
    expect(states.consumeAilmentTx(enemy, 1_500)).toMatchObject({
      family: 'ailment',
      status: 'no-op',
      consumed: false,
      wasActive: false,
      isActive: false,
    });
  });

  test('signature mark-consume path uses transaction result without changing trait payoff', () => {
    const traits = new TraitRuntime();
    traits.addTrait('focused-breach');
    const states = new CombatStateRuntime();
    const seam = new TriggerSeam({
      heroId: 'shade',
      traits,
      combatStates: states,
    });
    const enemy = createMockStateEnemy();

    states.applyMarkTx(enemy, 1_000, 1_500);
    const consumeTx = states.consumeMarkTx(enemy, 1_100);
    const payoff = seam.resolveOnConsumeSignaturePayoff({
      consumedMark: consumeTx.consumed,
    });

    expect(consumeTx.status).toBe('consumed');
    expect(payoff.cooldownRefundMs).toBe(220);
  });
});
