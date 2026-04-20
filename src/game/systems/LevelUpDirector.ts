import type { RewardDefinition, RewardId } from '../data/rewards';
import { REWARD_DEFINITIONS } from '../data/rewards';
import type { HeroId } from '../data/heroes';
import type { TraitRuntime } from './TraitRuntime';

export class LevelUpDirector {
  buildChoices(
    heroId: HeroId,
    traitRuntime: TraitRuntime,
    options?: {
      hasSupportAbility?: boolean;
      shuffle?: <T>(items: T[]) => T[];
    },
  ): RewardDefinition[] {
    const selectedTraits = new Set(traitRuntime.getSelectedTraitIds());
    const hasSupportAbility = Boolean(options?.hasSupportAbility);
    const applyShuffle = options?.shuffle ?? ((items) => [...items]);

    const alignedTraits = applyShuffle(
      Object.values(REWARD_DEFINITIONS).filter(
        (reward) =>
          reward.category === 'trait' &&
          reward.lane === 'deepen' &&
          (reward.heroBias === heroId || reward.heroBias === 'shared') &&
          reward.traitId &&
          !selectedTraits.has(reward.traitId),
      ),
    );

    const bridgeTraits = applyShuffle(
      Object.values(REWARD_DEFINITIONS).filter(
        (reward) =>
          reward.category === 'trait' &&
          reward.lane === 'bridge' &&
          reward.traitId &&
          !selectedTraits.has(reward.traitId),
      ),
    );

    const supportRewards = hasSupportAbility
      ? []
      : applyShuffle(
          Object.values(REWARD_DEFINITIONS).filter(
            (reward) =>
              reward.category === 'support' &&
              reward.abilityId &&
              (reward.heroBias === heroId || reward.heroBias === 'shared'),
          ),
        );

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

    addIfUnique(alignedTraits[0]);

    if (!hasSupportAbility) {
      addIfUnique(supportRewards[0] ?? bridgeTraits[0]);
    } else if (heroId === 'shade') {
      addIfUnique(bridgeTraits.find((reward) => reward.id === 'scavenger-shield'));
    } else {
      addIfUnique(bridgeTraits[0] ?? alignedTraits[1]);
    }

    addIfUnique(stabilizers[0]);

    for (const reward of [...alignedTraits, ...bridgeTraits, ...supportRewards, ...stabilizers]) {
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
}
