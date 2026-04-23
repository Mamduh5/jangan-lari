import { getEvolutionDefinition } from '../data/evolutions';
import type { RewardDefinition, RewardId } from '../data/rewards';
import { REWARD_DEFINITIONS } from '../data/rewards';
import type { HeroId } from '../data/heroes';
import type { AbilityId } from '../data/abilities';
import { getTraitDefinition, type TraitCategory, type TraitId } from '../data/traits';
import type { TraitRuntime } from './TraitRuntime';

type RewardContext = {
  heroId: HeroId;
  selectedTraits: Set<TraitId>;
  selectedTraitCategories: Set<TraitCategory>;
  supportAbilityId: AbilityId | null;
  hasSupportAbility: boolean;
  hasHeroEnabler: boolean;
  hasHeroAmplifier: boolean;
  hasHeroConverter: boolean;
  hasDisruptedSupport: boolean;
  hasEchoSupport: boolean;
  hasAilmentSupport: boolean;
};

export class LevelUpDirector {
  buildChoices(
    heroId: HeroId,
    traitRuntime: TraitRuntime,
    options?: {
      hasSupportAbility?: boolean;
      supportAbilityId?: AbilityId | null;
      level?: number;
      elapsedMs?: number;
      selectedEvolutionId?: string | null;
      shuffle?: <T>(items: T[]) => T[];
    },
  ): RewardDefinition[] {
    const selectedTraits = new Set(traitRuntime.getSelectedTraitIds());
    const hasSupportAbility = Boolean(options?.hasSupportAbility);
    const selectedEvolutionId = options?.selectedEvolutionId ?? null;
    const supportAbilityId = options?.supportAbilityId ?? null;
    const context = this.buildRewardContext(heroId, selectedTraits, supportAbilityId, hasSupportAbility);
    const applyShuffle =
      options?.shuffle ??
      ((items) => {
        const copy = [...items];
        for (let i = copy.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
      });
    const deepenTraits = this.sortByPriority(
      [
        ...applyShuffle(this.getTraitRewards('deepen', heroId, 'hero', selectedTraits)),
        ...applyShuffle(this.getTraitRewards('deepen', heroId, 'shared', selectedTraits)),
      ],
      this.getDeepenPriorityIds(context),
    );
    const bridgeTraits = this.sortByPriority(
      [
        ...applyShuffle(this.getTraitRewards('bridge', heroId, 'hero', selectedTraits)),
        ...applyShuffle(this.getTraitRewards('bridge', heroId, 'shared', selectedTraits)),
      ],
      this.getBridgePriorityIds(context),
    );
    const bridgeSupports = hasSupportAbility
      ? []
      : this.sortByPriority(
          [
            ...applyShuffle(this.getSupportRewards('bridge', heroId, 'hero')),
            ...applyShuffle(this.getSupportRewards('bridge', heroId, 'shared')),
            ...applyShuffle(this.getSupportRewards('bridge', heroId, 'other')),
          ],
          this.getBridgePriorityIds(context),
        );
    const stabilizeSupports = hasSupportAbility
      ? []
      : this.sortByPriority(
          [
            ...applyShuffle(this.getSupportRewards('stabilize', heroId, 'hero')),
            ...applyShuffle(this.getSupportRewards('stabilize', heroId, 'shared')),
            ...applyShuffle(this.getSupportRewards('stabilize', heroId, 'other')),
          ],
          this.getStabilizePriorityIds(context),
        );
    const eligibleEvolution = selectedEvolutionId
      ? undefined
      : this.sortByPriority(
          this.getEligibleEvolutionRewards(heroId, selectedTraits, {
            level: options?.level,
            elapsedMs: options?.elapsedMs,
            supportAbilityId,
          }),
          this.getEvolutionPriorityIds(context),
        )[0];
    const branchChoices = this.sortByPriority(
      [...bridgeTraits, ...bridgeSupports],
      this.getBridgePriorityIds(context),
    );
    const stabilizeChoices = this.sortByPriority(
      [
        ...stabilizeSupports,
        ...applyShuffle(Object.values(REWARD_DEFINITIONS).filter((reward) => reward.category === 'stabilizer')),
      ],
      this.getStabilizePriorityIds(context),
    );

    const picks: RewardDefinition[] = [];
    const addIfUnique = (reward?: RewardDefinition): void => {
      if (!reward) {
        return;
      }
      if (picks.some((entry) => entry.id === reward.id)) {
        return;
      }
      picks.push(reward);
    };

    addIfUnique(eligibleEvolution ?? deepenTraits[0]);
    addIfUnique(this.firstAvailable(branchChoices, picks));
    addIfUnique(this.firstAvailable(stabilizeChoices, picks));

    for (const reward of [...deepenTraits, ...branchChoices, ...stabilizeChoices]) {
      if (picks.length >= 3) {
        break;
      }
      addIfUnique(reward);
    }

    return picks.slice(0, 3);
  }

  getRewardDefinition(id: RewardId): RewardDefinition {
    return REWARD_DEFINITIONS[id];
  }

  private buildRewardContext(
    heroId: HeroId,
    selectedTraits: Set<TraitId>,
    supportAbilityId: AbilityId | null,
    hasSupportAbility: boolean,
  ): RewardContext {
    const selectedTraitCategories = new Set<TraitCategory>();
    let hasHeroEnabler = false;
    let hasHeroAmplifier = false;
    let hasHeroConverter = false;

    selectedTraits.forEach((traitId) => {
      const definition = getTraitDefinition(traitId);
      selectedTraitCategories.add(definition.category);
      if (definition.heroBias !== heroId) {
        return;
      }

      if (definition.category === 'enabler') {
        hasHeroEnabler = true;
      } else if (definition.category === 'amplifier') {
        hasHeroAmplifier = true;
      } else if (definition.category === 'converter') {
        hasHeroConverter = true;
      }
    });

    return {
      heroId,
      selectedTraits,
      selectedTraitCategories,
      supportAbilityId,
      hasSupportAbility,
      hasHeroEnabler,
      hasHeroAmplifier,
      hasHeroConverter,
      hasDisruptedSupport: supportAbilityId === 'shock-lattice' || supportAbilityId === 'spotter-drone',
      hasEchoSupport: supportAbilityId === 'echo-turret',
      hasAilmentSupport: supportAbilityId === 'contagion-node',
    };
  }

  private getTraitRewards(
    lane: 'deepen' | 'bridge',
    heroId: HeroId,
    bias: 'hero' | 'shared',
    selectedTraits: Set<TraitId>,
  ): RewardDefinition[] {
    return Object.values(REWARD_DEFINITIONS).filter((reward) => {
      if (reward.category !== 'trait' || reward.lane !== lane || !reward.traitId || selectedTraits.has(reward.traitId)) {
        return false;
      }

      if (bias === 'hero') {
        return reward.heroBias === heroId;
      }

      return reward.heroBias === 'shared';
    });
  }

  private getSupportRewards(
    lane: 'bridge' | 'stabilize',
    heroId: HeroId,
    bias: 'hero' | 'shared' | 'other',
  ): RewardDefinition[] {
    return Object.values(REWARD_DEFINITIONS).filter((reward) => {
      if (reward.category !== 'support' || reward.lane !== lane || !reward.abilityId) {
        return false;
      }

      if (bias === 'hero') {
        return reward.heroBias === heroId;
      }
      if (bias === 'shared') {
        return reward.heroBias === 'shared';
      }

      return reward.heroBias !== heroId && reward.heroBias !== 'shared';
    });
  }

  private getEligibleEvolutionRewards(
    heroId: HeroId,
    selectedTraits: Set<TraitId>,
    options?: {
      level?: number;
      elapsedMs?: number;
      supportAbilityId?: AbilityId | null;
    },
  ): RewardDefinition[] {
    return Object.values(REWARD_DEFINITIONS).filter((reward) => {
      if (reward.category !== 'evolution' || reward.heroBias !== heroId || !reward.evolutionId) {
        return false;
      }

      const evolution = getEvolutionDefinition(reward.evolutionId);
      if ((options?.level ?? 1) < evolution.minLevel) {
        return false;
      }
      if ((options?.elapsedMs ?? 0) < evolution.minElapsedMs) {
        return false;
      }
      if (evolution.requiredSupportAbilityId && options?.supportAbilityId !== evolution.requiredSupportAbilityId) {
        return false;
      }
      if (!evolution.requiredTraitIds.every((traitId) => selectedTraits.has(traitId))) {
        return false;
      }
      if (evolution.oneOfTraitIds && !evolution.oneOfTraitIds.some((traitId) => selectedTraits.has(traitId))) {
        return false;
      }

      return true;
    });
  }

  private getDeepenPriorityIds(context: RewardContext): RewardId[] {
    const priorities: RewardId[] = [];
    const add = (id: RewardId): void => {
      if (!priorities.includes(id) && !context.selectedTraits.has(id as TraitId)) {
        priorities.push(id);
      }
    };

    switch (context.heroId) {
      case 'runner':
        if (!context.selectedTraits.has('close-guard')) {
          add('close-guard');
        }
        if (context.selectedTraits.has('close-guard') && !context.selectedTraits.has('steadfast-posture')) {
          add('steadfast-posture');
        }
        if ((context.hasHeroEnabler || context.selectedTraits.has('steadfast-posture')) && !context.selectedTraits.has('iron-reserve')) {
          add('iron-reserve');
        }
        if (context.hasDisruptedSupport) {
          add('breach-capacitor');
        }
        if (context.hasEchoSupport) {
          add('pressure-lenses');
        }
        add('steadfast-posture');
        add('iron-reserve');
        add('pressure-lenses');
        add('breach-capacitor');
        break;
      case 'shade':
        if (!context.selectedTraits.has('target-painter')) {
          add('target-painter');
        }
        if (context.selectedTraits.has('target-painter') && !context.selectedTraits.has('focused-breach')) {
          add('focused-breach');
        }
        if (context.hasDisruptedSupport) {
          add('breach-capacitor');
        }
        if (context.hasEchoSupport) {
          add('pressure-lenses');
        }
        add('focused-breach');
        add('breach-capacitor');
        add('pressure-lenses');
        break;
      case 'weaver':
        if (!context.selectedTraits.has('infectious-volley')) {
          add('infectious-volley');
        }
        if (context.selectedTraits.has('infectious-volley') && !context.selectedTraits.has('lingering-fever')) {
          add('lingering-fever');
        }
        if (context.hasEchoSupport || context.hasAilmentSupport) {
          add('pressure-lenses');
        }
        add('lingering-fever');
        add('pressure-lenses');
        add('breach-capacitor');
        break;
    }

    return priorities;
  }

  private getBridgePriorityIds(context: RewardContext): RewardId[] {
    const priorities: RewardId[] = [];
    const add = (id: RewardId): void => {
      if (!priorities.includes(id) && !context.selectedTraits.has(id as TraitId)) {
        priorities.push(id);
      }
    };

    switch (context.heroId) {
      case 'runner':
        if (context.selectedTraits.has('iron-reserve') && !context.hasSupportAbility) {
          add('echo-turret');
        }
        if (context.hasDisruptedSupport && !context.selectedTraits.has('lingering-static')) {
          add('lingering-static');
        }
        if ((context.hasDisruptedSupport || context.hasEchoSupport) && !context.selectedTraits.has('predator-relay')) {
          add('predator-relay');
        }
        if (!context.hasSupportAbility) {
          add('shock-lattice');
        }
        add('predator-relay');
        add('scavenger-shield');
        add('lingering-static');
        break;
      case 'shade':
        if (context.selectedTraits.has('target-painter') && context.selectedTraits.has('focused-breach') && !context.selectedTraits.has('scavenger-shield')) {
          add('scavenger-shield');
        }
        if (context.hasDisruptedSupport && !context.selectedTraits.has('lingering-static')) {
          add('lingering-static');
        }
        if (!context.hasSupportAbility) {
          add('spotter-drone');
        }
        if ((context.supportAbilityId === 'recovery-field' || context.selectedTraits.has('predator-relay')) && !context.selectedTraits.has('predator-relay')) {
          add('predator-relay');
        }
        add('scavenger-shield');
        add('predator-relay');
        add('lingering-static');
        break;
      case 'weaver':
        if (context.selectedTraits.has('infectious-volley') && !context.selectedTraits.has('volatile-bloom')) {
          add('volatile-bloom');
        }
        if (context.selectedTraits.has('infectious-volley') && !context.selectedTraits.has('catalytic-exposure')) {
          add('catalytic-exposure');
        }
        if (context.selectedTraits.has('catalytic-exposure') && !context.hasSupportAbility) {
          add('echo-turret');
        }
        if (!context.hasSupportAbility) {
          add('contagion-node');
        }
        if (context.hasDisruptedSupport && !context.selectedTraits.has('lingering-static')) {
          add('lingering-static');
        }
        add('volatile-bloom');
        add('catalytic-exposure');
        add('contagion-node');
        add('lingering-static');
        break;
    }

    return priorities;
  }

  private getStabilizePriorityIds(context: RewardContext): RewardId[] {
    const priorities: RewardId[] = [];
    const add = (id: RewardId): void => {
      if (!priorities.includes(id)) {
        priorities.push(id);
      }
    };

    if (!context.hasSupportAbility) {
      if (context.heroId === 'runner' && (context.selectedTraits.has('close-guard') || context.selectedTraits.has('iron-reserve'))) {
        add('recovery-field');
      }
      if (context.heroId === 'shade' && context.selectedTraits.has('target-painter')) {
        add('recovery-field');
      }
    }

    add('field-repairs');
    add('reflex-boots');
    return priorities;
  }

  private getEvolutionPriorityIds(context: RewardContext): RewardId[] {
    const priorities: RewardId[] = [];
    const add = (id: RewardId): void => {
      if (!priorities.includes(id)) {
        priorities.push(id);
      }
    };

    switch (context.heroId) {
      case 'runner':
        if (context.supportAbilityId === 'echo-turret' || context.selectedTraits.has('predator-relay') || context.selectedTraits.has('pressure-lenses')) {
          add('reckoner-drive');
        }
        add('citadel-core');
        add('reckoner-drive');
        break;
      case 'shade':
        if (context.supportAbilityId === 'recovery-field' || context.selectedTraits.has('predator-relay')) {
          add('siege-lock-array');
        }
        add('kill-chain-protocol');
        add('siege-lock-array');
        break;
      case 'weaver':
        if (context.selectedTraits.has('catalytic-exposure')) {
          add('cinder-crown');
        }
        add('pyre-constellation');
        add('cinder-crown');
        break;
    }

    return priorities;
  }

  private sortByPriority<T extends RewardDefinition>(items: T[], priorities: RewardId[]): T[] {
    return [...items].sort((left, right) => {
      const leftIndex = this.getPriorityIndex(priorities, left.id);
      const rightIndex = this.getPriorityIndex(priorities, right.id);
      return leftIndex - rightIndex;
    });
  }

  private getPriorityIndex(priorities: RewardId[], rewardId: RewardId): number {
    const index = priorities.indexOf(rewardId);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  }

  private firstAvailable(rewards: RewardDefinition[], picks: RewardDefinition[]): RewardDefinition | undefined {
    return rewards.find((reward) => !picks.some((entry) => entry.id === reward.id));
  }
}
