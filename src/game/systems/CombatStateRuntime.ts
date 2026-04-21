import type { Enemy } from '../entities/Enemy';

export type GuardGainTransaction = {
  family: 'guard';
  operation: 'gain';
  status: 'applied' | 'blocked' | 'no-op';
  requested: number;
  value: number;
  previous: number;
  current: number;
  max: number;
};

export type GuardSpendTransaction = {
  family: 'guard';
  operation: 'spend';
  status: 'consumed' | 'blocked' | 'no-op';
  requested: number;
  value: number;
  previous: number;
  current: number;
};

export type GuardAbsorbTransaction = {
  family: 'guard';
  operation: 'absorb';
  status: 'consumed' | 'no-op';
  requestedDamage: number;
  absorbed: number;
  remaining: number;
  spend: GuardSpendTransaction;
};

export type TimedStateFamily = 'mark' | 'disrupted' | 'ailment';

export type TimedStateApplyTransaction = {
  family: TimedStateFamily;
  operation: 'apply';
  status: 'applied' | 'refreshed' | 'no-op';
  requestedDurationMs: number;
  wasActive: boolean;
  isActive: boolean;
};

export type TimedStateConsumeTransaction = {
  family: Extract<TimedStateFamily, 'mark' | 'ailment'>;
  operation: 'consume';
  status: 'consumed' | 'no-op';
  wasActive: boolean;
  isActive: boolean;
  consumed: boolean;
};

export class CombatStateRuntime {
  private guard = 0;
  private maxGuard = 16;

  setMaxGuard(value: number): void {
    this.maxGuard = Math.max(0, Math.round(value));
    this.guard = Math.min(this.guard, this.maxGuard);
  }

  getGuard(): number {
    return this.guard;
  }

  getMaxGuard(): number {
    return this.maxGuard;
  }

  hasGuard(): boolean {
    return this.guard > 0;
  }

  gainGuardTx(amount: number): GuardGainTransaction {
    const requested = amount;
    const previous = this.guard;
    if (amount <= 0 || this.maxGuard <= 0) {
      return {
        family: 'guard',
        operation: 'gain',
        status: 'blocked',
        requested,
        value: 0,
        previous,
        current: this.guard,
        max: this.maxGuard,
      };
    }

    this.guard = Math.min(this.maxGuard, this.guard + Math.round(amount));
    const gained = this.guard - previous;
    return {
      family: 'guard',
      operation: 'gain',
      status: gained > 0 ? 'applied' : 'no-op',
      requested,
      value: gained,
      previous,
      current: this.guard,
      max: this.maxGuard,
    };
  }

  gainGuard(amount: number): number {
    return this.gainGuardTx(amount).value;
  }

  spendGuardTx(amount: number): GuardSpendTransaction {
    const requested = amount;
    const previous = this.guard;
    if (amount <= 0) {
      return {
        family: 'guard',
        operation: 'spend',
        status: 'blocked',
        requested,
        value: 0,
        previous,
        current: this.guard,
      };
    }

    if (this.guard <= 0) {
      return {
        family: 'guard',
        operation: 'spend',
        status: 'no-op',
        requested,
        value: 0,
        previous,
        current: this.guard,
      };
    }

    const spent = Math.min(this.guard, Math.round(amount));
    this.guard -= spent;
    return {
      family: 'guard',
      operation: 'spend',
      status: spent > 0 ? 'consumed' : 'no-op',
      requested,
      value: spent,
      previous,
      current: this.guard,
    };
  }

  spendGuard(amount: number): number {
    return this.spendGuardTx(amount).value;
  }

  absorbDamageTx(amount: number): GuardAbsorbTransaction {
    const spend = this.spendGuardTx(amount);
    const absorbed = spend.value;
    const remaining = Math.max(0, amount - absorbed);
    return {
      family: 'guard',
      operation: 'absorb',
      status: absorbed > 0 ? 'consumed' : 'no-op',
      requestedDamage: amount,
      absorbed,
      remaining,
      spend,
    };
  }

  absorbDamage(amount: number): { absorbed: number; remaining: number } {
    const transaction = this.absorbDamageTx(amount);
    return {
      absorbed: transaction.absorbed,
      remaining: transaction.remaining,
    };
  }

  applyMarkTx(enemy: Enemy, currentTime: number, durationMs: number): TimedStateApplyTransaction {
    const wasActive = enemy.isMarked(currentTime);
    enemy.applyMark(currentTime, durationMs);
    const isActive = enemy.isMarked(currentTime);
    return {
      family: 'mark',
      operation: 'apply',
      status: this.resolveTimedApplyStatus(wasActive, isActive),
      requestedDurationMs: durationMs,
      wasActive,
      isActive,
    };
  }

  applyMark(enemy: Enemy, currentTime: number, durationMs: number): void {
    this.applyMarkTx(enemy, currentTime, durationMs);
  }

  isMarked(enemy: Enemy, currentTime: number): boolean {
    return enemy.isMarked(currentTime);
  }

  consumeMarkTx(enemy: Enemy, currentTime: number): TimedStateConsumeTransaction {
    const wasActive = enemy.isMarked(currentTime);
    const consumed = enemy.consumeMark(currentTime);
    return {
      family: 'mark',
      operation: 'consume',
      status: consumed ? 'consumed' : 'no-op',
      wasActive,
      isActive: enemy.isMarked(currentTime),
      consumed,
    };
  }

  consumeMark(enemy: Enemy, currentTime: number): boolean {
    return this.consumeMarkTx(enemy, currentTime).consumed;
  }

  applyDisruptedTx(enemy: Enemy, currentTime: number, durationMs: number): TimedStateApplyTransaction {
    const wasActive = enemy.isDisrupted(currentTime);
    enemy.applyDisrupted(currentTime, durationMs);
    const isActive = enemy.isDisrupted(currentTime);
    return {
      family: 'disrupted',
      operation: 'apply',
      status: this.resolveTimedApplyStatus(wasActive, isActive),
      requestedDurationMs: durationMs,
      wasActive,
      isActive,
    };
  }

  applyDisrupted(enemy: Enemy, currentTime: number, durationMs: number): void {
    this.applyDisruptedTx(enemy, currentTime, durationMs);
  }

  isDisrupted(enemy: Enemy, currentTime: number): boolean {
    return enemy.isDisrupted(currentTime);
  }

  applyAilmentTx(enemy: Enemy, currentTime: number, durationMs: number): TimedStateApplyTransaction {
    const wasActive = enemy.isAilmented(currentTime);
    enemy.applyAilment(currentTime, durationMs);
    const isActive = enemy.isAilmented(currentTime);
    return {
      family: 'ailment',
      operation: 'apply',
      status: this.resolveTimedApplyStatus(wasActive, isActive),
      requestedDurationMs: durationMs,
      wasActive,
      isActive,
    };
  }

  applyAilment(enemy: Enemy, currentTime: number, durationMs: number): void {
    this.applyAilmentTx(enemy, currentTime, durationMs);
  }

  isAilmented(enemy: Enemy, currentTime: number): boolean {
    return enemy.isAilmented(currentTime);
  }

  consumeAilmentTx(enemy: Enemy, currentTime: number): TimedStateConsumeTransaction {
    const wasActive = enemy.isAilmented(currentTime);
    const consumed = enemy.consumeAilment(currentTime);
    return {
      family: 'ailment',
      operation: 'consume',
      status: consumed ? 'consumed' : 'no-op',
      wasActive,
      isActive: enemy.isAilmented(currentTime),
      consumed,
    };
  }

  consumeAilment(enemy: Enemy, currentTime: number): boolean {
    return this.consumeAilmentTx(enemy, currentTime).consumed;
  }

  private resolveTimedApplyStatus(wasActive: boolean, isActive: boolean): TimedStateApplyTransaction['status'] {
    if (!isActive) {
      return 'no-op';
    }

    return wasActive ? 'refreshed' : 'applied';
  }
}
