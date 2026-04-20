import type { Enemy } from '../entities/Enemy';

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

  gainGuard(amount: number): number {
    if (amount <= 0 || this.maxGuard <= 0) {
      return 0;
    }

    const previous = this.guard;
    this.guard = Math.min(this.maxGuard, this.guard + Math.round(amount));
    return this.guard - previous;
  }

  spendGuard(amount: number): number {
    if (amount <= 0 || this.guard <= 0) {
      return 0;
    }

    const spent = Math.min(this.guard, Math.round(amount));
    this.guard -= spent;
    return spent;
  }

  absorbDamage(amount: number): { absorbed: number; remaining: number } {
    const absorbed = this.spendGuard(amount);
    return {
      absorbed,
      remaining: Math.max(0, amount - absorbed),
    };
  }

  applyMark(enemy: Enemy, currentTime: number, durationMs: number): void {
    enemy.applyMark(currentTime, durationMs);
  }

  isMarked(enemy: Enemy, currentTime: number): boolean {
    return enemy.isMarked(currentTime);
  }

  consumeMark(enemy: Enemy, currentTime: number): boolean {
    return enemy.consumeMark(currentTime);
  }

  applyDisrupted(enemy: Enemy, currentTime: number, durationMs: number): void {
    enemy.applyDisrupted(currentTime, durationMs);
  }

  isDisrupted(enemy: Enemy, currentTime: number): boolean {
    return enemy.isDisrupted(currentTime);
  }
}
