import type { AbilityDefinition, AbilityId } from '../data/abilities';
import type { HeroId } from '../data/heroes';
import type { TraitId } from '../data/traits';

type PrimaryHitContext = {
  heroId: HeroId;
  abilityId: AbilityId;
  isCloseRange: boolean;
  targetWasMarked: boolean;
};

type KillContext = {
  heroId: HeroId;
  enemyWasMarked: boolean;
};

export class TraitRuntime {
  private readonly selectedTraits = new Set<TraitId>();

  getSelectedTraitIds(): TraitId[] {
    return [...this.selectedTraits];
  }

  hasTrait(id: TraitId): boolean {
    return this.selectedTraits.has(id);
  }

  addTrait(id: TraitId): boolean {
    if (this.selectedTraits.has(id)) {
      return false;
    }

    this.selectedTraits.add(id);
    return true;
  }

  getPrimaryBurstCount(options: {
    heroId: HeroId;
    ability: AbilityDefinition;
    guardActive: boolean;
  }): number {
    if (options.heroId === 'runner' && options.ability.id === 'brace-shot' && options.guardActive && this.hasTrait('steadfast-posture')) {
      return (options.ability.burstCount ?? 1) + 1;
    }

    return options.ability.burstCount ?? 1;
  }

  getPrimarySpreadDegrees(options: {
    heroId: HeroId;
    ability: AbilityDefinition;
    guardActive: boolean;
  }): number {
    const baseSpread = options.ability.spreadDegrees ?? 0;

    if (options.heroId === 'runner' && options.ability.id === 'brace-shot' && options.guardActive && this.hasTrait('steadfast-posture')) {
      return baseSpread + 8;
    }

    return baseSpread;
  }

  getMarkDurationMs(baseDurationMs: number): number {
    return this.hasTrait('target-painter') ? baseDurationMs + 900 : baseDurationMs;
  }

  getPrimaryDamageBonus(options: PrimaryHitContext): number {
    if (options.heroId === 'shade' && options.abilityId === 'seeker-burst' && options.targetWasMarked && this.hasTrait('target-painter')) {
      return 4;
    }

    return 0;
  }

  getSignatureMarkedDamageMultiplier(): number {
    return this.hasTrait('focused-breach') ? 1.8 : 1.45;
  }

  getSignatureMarkedCooldownRefundMs(): number {
    return this.hasTrait('focused-breach') ? 220 : 0;
  }

  getGuardGainOnPrimaryHit(options: PrimaryHitContext): number {
    if (options.heroId !== 'runner' || options.abilityId !== 'brace-shot') {
      return 0;
    }

    let totalGuard = options.isCloseRange ? 2 : 0;
    if (options.isCloseRange && this.hasTrait('close-guard')) {
      totalGuard += 1;
    }
    return totalGuard;
  }

  getGuardGainOnKill(options: KillContext): number {
    if (options.enemyWasMarked && this.hasTrait('scavenger-shield')) {
      return 5;
    }

    return 0;
  }
}
