import type { AbilityDefinition, AbilityId } from '../data/abilities';
import type { HeroId } from '../data/heroes';
import type { TraitId } from '../data/traits';

type PrimaryHitContext = {
  heroId: HeroId;
  abilityId: AbilityId;
  isCloseRange: boolean;
  guardActive: boolean;
  targetWasMarked: boolean;
  targetWasDisrupted: boolean;
  targetWasAilmented: boolean;
};

type KillContext = {
  heroId: HeroId;
  enemyWasMarked: boolean;
};

export class TraitRuntime {
  private readonly selectedTraits = new Set<TraitId>();
  private predatorRelayUntilMs = 0;

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

    if (options.heroId === 'weaver' && options.ability.id === 'cinder-needles' && this.hasTrait('infectious-volley')) {
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
    let totalBonus = 0;

    if (options.heroId === 'shade' && options.abilityId === 'seeker-burst' && options.targetWasMarked && this.hasTrait('target-painter')) {
      totalBonus += 4;
    }

    if (this.hasTrait('pressure-lenses')) {
      if (options.heroId === 'runner' && options.abilityId === 'brace-shot' && options.guardActive && options.isCloseRange) {
        totalBonus += 2;
      } else if (options.heroId === 'shade' && options.abilityId === 'seeker-burst' && options.targetWasMarked) {
        totalBonus += 2;
      } else if (options.heroId === 'weaver' && options.abilityId === 'cinder-needles' && options.targetWasAilmented) {
        totalBonus += 2;
      }
    }

    return totalBonus;
  }

  getSignatureMarkedDamageMultiplier(): number {
    return this.hasTrait('focused-breach') ? 1.8 : 1.45;
  }

  getSignatureMarkedCooldownRefundMs(): number {
    return this.hasTrait('focused-breach') ? 220 : 0;
  }

  getDisruptedDurationMs(baseDurationMs: number): number {
    return this.hasTrait('lingering-static') ? baseDurationMs + 900 : baseDurationMs;
  }

  getSignatureDisruptedDamageMultiplier(): number {
    return this.hasTrait('breach-capacitor') ? 1.45 : 1.25;
  }

  getAilmentDurationMs(baseDurationMs: number): number {
    let durationMs = baseDurationMs;
    if (this.hasTrait('infectious-volley')) {
      durationMs += 350;
    }
    if (this.hasTrait('lingering-fever')) {
      durationMs += 900;
    }
    return durationMs;
  }

  getHexConsumeBonusDamage(): number {
    return this.hasTrait('volatile-bloom') ? 18 : 12;
  }

  getHexSecondaryBurstRadius(baseRadius: number): number {
    return this.hasTrait('volatile-bloom') ? baseRadius + 24 : baseRadius;
  }

  getHexSecondaryBurstDamage(): number {
    return this.hasTrait('volatile-bloom') ? 12 : 0;
  }

  getEchoTurretStateAlignedBonusDamage(): number {
    return this.hasTrait('pressure-lenses') ? 1 : 0;
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

  getBonusGuardMax(): number {
    return this.hasTrait('iron-reserve') ? 10 : 0;
  }

  getIronReserveSpendBonus(): number {
    return this.hasTrait('iron-reserve') ? 4 : 0;
  }

  getIronReserveDamageMultiplier(): number {
    return this.hasTrait('iron-reserve') ? 1.18 : 1;
  }

  notifyGuardGain(currentTime: number, amount: number): void {
    if (amount < 2 || !this.hasTrait('predator-relay')) {
      return;
    }

    this.predatorRelayUntilMs = Math.max(this.predatorRelayUntilMs, currentTime + 1250);
  }

  consumePredatorRelaySignatureBonus(options: {
    currentTime: number;
    targetWasMarked: boolean;
    targetWasDisrupted: boolean;
    targetWasAilmented: boolean;
  }): number {
    if (options.currentTime >= this.predatorRelayUntilMs) {
      return 1;
    }
    if (!options.targetWasMarked && !options.targetWasDisrupted && !options.targetWasAilmented) {
      return 1;
    }

    this.predatorRelayUntilMs = 0;
    return 1.18;
  }

  getCatalyticExposureMarkDurationMs(): number {
    return this.hasTrait('catalytic-exposure') ? 1800 : 0;
  }

  getCatalyticExposureGuardGain(): number {
    return this.hasTrait('catalytic-exposure') ? 2 : 0;
  }
}
