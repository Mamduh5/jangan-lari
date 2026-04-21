import type { AbilityDefinition, AbilityId } from '../data/abilities';
import { getAbilityDefinition } from '../data/abilities';
import type { HeroId } from '../data/heroes';
import type { Enemy } from '../entities/Enemy';
import type { CombatStateRuntime } from './CombatStateRuntime';
import type { TraitRuntime } from './TraitRuntime';

export type TriggerSeamOptions = {
  heroId: HeroId;
  traits: TraitRuntime;
  combatStates: CombatStateRuntime;
};

export type OnHitTriggerContext = {
  abilityId: AbilityId;
  isCloseRange: boolean;
  guardActive: boolean;
  targetWasMarked: boolean;
  targetWasDisrupted: boolean;
  targetWasAilmented: boolean;
};

export type OnHitPayoffResult = {
  damageBonus: number;
  guardGain: number;
};

export type OnHitStateApplicationResult = {
  markApplications: number;
  disruptedApplications: number;
  ailmentApplications: number;
};

export type OnKillTriggerContext = {
  enemyWasMarked: boolean;
};

export type OnKillPayoffResult = {
  guardGain: number;
};

export type SignaturePayoffContext = {
  currentTime: number;
  targetWasMarked: boolean;
  targetWasDisrupted: boolean;
  targetWasAilmented: boolean;
};

export type OnConsumeSignatureContext = {
  consumedMark: boolean;
};

export type OnConsumeSignatureResult = {
  cooldownRefundMs: number;
};

export type PrimaryPatternResult = {
  burstCount: number;
  spreadDegrees: number;
};

export class TriggerSeam {
  constructor(private readonly options: TriggerSeamOptions) {}

  resolvePrimaryPattern(ability: AbilityDefinition, guardActive: boolean): PrimaryPatternResult {
    return {
      burstCount: this.options.traits.getPrimaryBurstCount({
        heroId: this.options.heroId,
        ability,
        guardActive,
      }),
      spreadDegrees: this.options.traits.getPrimarySpreadDegrees({
        heroId: this.options.heroId,
        ability,
        guardActive,
      }),
    };
  }

  resolveOnHitPayoffs(context: OnHitTriggerContext): OnHitPayoffResult {
    return {
      damageBonus: this.options.traits.getPrimaryDamageBonus({
        heroId: this.options.heroId,
        abilityId: context.abilityId,
        isCloseRange: context.isCloseRange,
        guardActive: context.guardActive,
        targetWasMarked: context.targetWasMarked,
        targetWasDisrupted: context.targetWasDisrupted,
        targetWasAilmented: context.targetWasAilmented,
      }),
      guardGain: this.options.traits.getGuardGainOnPrimaryHit({
        heroId: this.options.heroId,
        abilityId: context.abilityId,
        isCloseRange: context.isCloseRange,
        guardActive: context.guardActive,
        targetWasMarked: context.targetWasMarked,
        targetWasDisrupted: context.targetWasDisrupted,
        targetWasAilmented: context.targetWasAilmented,
      }),
    };
  }

  applyOnHitStateApplications(
    sourceAbilityId: AbilityId,
    enemy: Enemy,
    currentTime: number,
  ): OnHitStateApplicationResult {
    if (sourceAbilityId === 'seeker-burst') {
      const markDuration = this.options.traits.getMarkDurationMs(getAbilityDefinition('seeker-burst').markDurationMs ?? 1600);
      this.options.combatStates.applyMarkTx(enemy, currentTime, markDuration);
      return { markApplications: 1, disruptedApplications: 0, ailmentApplications: 0 };
    }

    if (sourceAbilityId === 'spotter-drone') {
      const disruptedDuration = this.options.traits.getDisruptedDurationMs(
        getAbilityDefinition('spotter-drone').disruptedDurationMs ?? 1500,
      );
      this.options.combatStates.applyDisruptedTx(enemy, currentTime, disruptedDuration);
      return { markApplications: 0, disruptedApplications: 1, ailmentApplications: 0 };
    }

    if (sourceAbilityId === 'cinder-needles' || sourceAbilityId === 'contagion-node') {
      const ailmentDuration = this.options.traits.getAilmentDurationMs(
        getAbilityDefinition(sourceAbilityId).ailmentDurationMs ?? 2100,
      );
      this.options.combatStates.applyAilmentTx(enemy, currentTime, ailmentDuration);
      return { markApplications: 0, disruptedApplications: 0, ailmentApplications: 1 };
    }

    return { markApplications: 0, disruptedApplications: 0, ailmentApplications: 0 };
  }

  resolveOnKillPayoffs(context: OnKillTriggerContext): OnKillPayoffResult {
    return {
      guardGain: this.options.traits.getGuardGainOnKill({
        heroId: this.options.heroId,
        enemyWasMarked: context.enemyWasMarked,
      }),
    };
  }

  resolveOnConsumeSignaturePayoff(context: OnConsumeSignatureContext): OnConsumeSignatureResult {
    if (!context.consumedMark) {
      return { cooldownRefundMs: 0 };
    }

    return {
      cooldownRefundMs: this.options.traits.getSignatureMarkedCooldownRefundMs(),
    };
  }

  applyCatalyticExposureMark(enemy: Enemy, currentTime: number): boolean {
    const markDuration = this.options.traits.getCatalyticExposureMarkDurationMs();
    if (markDuration <= 0) {
      return false;
    }

    const transaction = this.options.combatStates.applyMarkTx(enemy, currentTime, markDuration);
    return transaction.status !== 'no-op';
  }

  resolveSignaturePayoff(context: SignaturePayoffContext): number {
    return this.options.traits.consumePredatorRelaySignatureBonus({
      currentTime: context.currentTime,
      targetWasMarked: context.targetWasMarked,
      targetWasDisrupted: context.targetWasDisrupted,
      targetWasAilmented: context.targetWasAilmented,
    });
  }
}
