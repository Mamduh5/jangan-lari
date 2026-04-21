import { getEvolutionDefinition } from '../data/evolutions';
import type { RewardDefinition, RewardId } from '../data/rewards';
import { REWARD_DEFINITIONS } from '../data/rewards';
import type { HeroId } from '../data/heroes';
import type { AbilityId } from '../data/abilities';
import type { TraitRuntime } from './TraitRuntime';

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
    const preferredRewardIds = this.getPreferredRewardIds(heroId, selectedTraits, options?.supportAbilityId ?? null);
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
    const sortByPreference = <T extends RewardDefinition>(items: T[]): T[] =>
      [...items].sort((left, right) => {
        const leftPreferred = preferredRewardIds.has(left.id) ? 1 : 0;
        const rightPreferred = preferredRewardIds.has(right.id) ? 1 : 0;
        return rightPreferred - leftPreferred;
      });

    const heroAlignedTraits = sortByPreference(applyShuffle(
      Object.values(REWARD_DEFINITIONS).filter(
        (reward) =>
          reward.category === 'trait' &&
          reward.lane === 'deepen' &&
          reward.heroBias === heroId &&
          reward.traitId &&
          !selectedTraits.has(reward.traitId),
      ),
    ));
    const sharedAlignedTraits = sortByPreference(applyShuffle(
      Object.values(REWARD_DEFINITIONS).filter(
        (reward) =>
          reward.category === 'trait' &&
          reward.lane === 'deepen' &&
          reward.heroBias === 'shared' &&
          reward.traitId &&
          !selectedTraits.has(reward.traitId),
      ),
    ));
    const alignedTraits = [...heroAlignedTraits, ...sharedAlignedTraits];

    const heroBridgeTraits = sortByPreference(applyShuffle(
      Object.values(REWARD_DEFINITIONS).filter(
        (reward) =>
          reward.category === 'trait' &&
          reward.lane === 'bridge' &&
          reward.heroBias === heroId &&
          reward.traitId &&
          !selectedTraits.has(reward.traitId),
      ),
    ));
    const sharedBridgeTraits = sortByPreference(applyShuffle(
      Object.values(REWARD_DEFINITIONS).filter(
        (reward) =>
          reward.category === 'trait' &&
          reward.lane === 'bridge' &&
          reward.heroBias === 'shared' &&
          reward.traitId &&
          !selectedTraits.has(reward.traitId),
      ),
    ));
    const bridgeTraits = [...heroBridgeTraits, ...sharedBridgeTraits];

    const heroSpecificSupportRewards = Object.values(REWARD_DEFINITIONS).filter(
      (reward) =>
        reward.category === 'support' &&
        reward.abilityId &&
        reward.heroBias === heroId,
    );

    const sharedSupportRewards = Object.values(REWARD_DEFINITIONS).filter(
      (reward) =>
        reward.category === 'support' &&
        reward.abilityId &&
        reward.heroBias === 'shared',
    );

    const otherSupportRewards = Object.values(REWARD_DEFINITIONS).filter(
      (reward) =>
        reward.category === 'support' &&
        reward.abilityId &&
        reward.heroBias !== heroId &&
        reward.heroBias !== 'shared',
    );

    const supportPool = hasSupportAbility
      ? []
      : sortByPreference(applyShuffle([
        ...heroSpecificSupportRewards,
        ...heroSpecificSupportRewards,
        ...heroSpecificSupportRewards,
        ...sharedSupportRewards,
        ...otherSupportRewards,
      ]));

    const supportChoice = supportPool[0];
    const eligibleEvolution = !selectedEvolutionId
      ? Object.values(REWARD_DEFINITIONS)
          .filter((reward) => {
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
          })
          .sort((left, right) => {
            const leftEvolution = getEvolutionDefinition(left.evolutionId!);
            const rightEvolution = getEvolutionDefinition(right.evolutionId!);
            const leftSupportMatch = leftEvolution.requiredSupportAbilityId && leftEvolution.requiredSupportAbilityId === options?.supportAbilityId ? 2 : 0;
            const rightSupportMatch = rightEvolution.requiredSupportAbilityId && rightEvolution.requiredSupportAbilityId === options?.supportAbilityId ? 2 : 0;
            const leftSpecificity = leftEvolution.requiredTraitIds.length + (leftEvolution.oneOfTraitIds ? 1 : 0);
            const rightSpecificity = rightEvolution.requiredTraitIds.length + (rightEvolution.oneOfTraitIds ? 1 : 0);
            const leftPreferred = preferredRewardIds.has(left.id) ? 1 : 0;
            const rightPreferred = preferredRewardIds.has(right.id) ? 1 : 0;
            return rightSupportMatch + rightSpecificity + rightPreferred - (leftSupportMatch + leftSpecificity + leftPreferred);
          })[0]
      : undefined;

    const stabilizers = applyShuffle(
      Object.values(REWARD_DEFINITIONS).filter((reward) => reward.category === 'stabilizer'),
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

    addIfUnique(eligibleEvolution ?? alignedTraits[0]);

    if (!hasSupportAbility) {
      addIfUnique(supportChoice ?? bridgeTraits[0]);
    } else if (heroId === 'shade') {
      addIfUnique(bridgeTraits.find((reward) => reward.id === 'scavenger-shield'));
    } else {
      addIfUnique(bridgeTraits[0] ?? alignedTraits[1]);
    }

    addIfUnique(stabilizers[0]);

    for (const reward of [...alignedTraits, ...bridgeTraits, ...stabilizers]) {
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

  private getPreferredRewardIds(
    heroId: HeroId,
    selectedTraits: Set<string>,
    supportAbilityId: AbilityId | null,
  ): Set<RewardId> {
    const preferred = new Set<RewardId>();

    if (heroId === 'runner') {
      if (selectedTraits.has('iron-reserve')) {
        preferred.add('echo-turret');
        preferred.add('predator-relay');
        preferred.add('pressure-lenses');
        preferred.add('reckoner-drive');
      }
      if (supportAbilityId === 'echo-turret') {
        preferred.add('predator-relay');
        preferred.add('pressure-lenses');
      }
    }

    if (heroId === 'shade') {
      if (selectedTraits.has('target-painter')) {
        preferred.add('recovery-field');
      }
      if (supportAbilityId === 'recovery-field' || selectedTraits.has('predator-relay')) {
        preferred.add('predator-relay');
        preferred.add('siege-lock-array');
      }
    }

    if (heroId === 'weaver') {
      if (selectedTraits.has('infectious-volley')) {
        preferred.add('catalytic-exposure');
      }
      if (selectedTraits.has('catalytic-exposure')) {
        preferred.add('echo-turret');
        preferred.add('pressure-lenses');
        preferred.add('volatile-bloom');
        preferred.add('cinder-crown');
      }
    }

    return preferred;
  }
}
