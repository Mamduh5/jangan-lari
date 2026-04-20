import type { RewardDefinition, RewardId } from '../data/rewards';
import { REWARD_DEFINITIONS } from '../data/rewards';
import type { HeroId } from '../data/heroes';
import type { TraitRuntime } from './TraitRuntime';

export class LevelUpDirector {
  buildChoices(heroId: HeroId, traitRuntime: TraitRuntime, shuffle?: <T>(items: T[]) => T[]): RewardDefinition[] {
    const selectedTraits = new Set(traitRuntime.getSelectedTraitIds());
    const applyShuffle = shuffle ?? ((items) => [...items]);

    const alignedTraits = applyShuffle(
      Object.values(REWARD_DEFINITIONS).filter(
        (reward) =>
          reward.category === 'trait' &&
          reward.lane === 'deepen' &&
          reward.heroBias === heroId &&
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

    if (heroId === 'shade') {
      addIfUnique(bridgeTraits.find((reward) => reward.id === 'scavenger-shield'));
    } else {
      addIfUnique(alignedTraits[1]);
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
}
