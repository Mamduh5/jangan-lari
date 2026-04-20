import type { HeroId } from './heroes';
import type { PermanentUpgradeId } from './permanentUpgrades';

export type QuestId =
  | 'kill-100-enemies'
  | 'survive-5-minutes'
  | 'reach-level-10'
  | 'collect-500-gold'
  | 'defeat-1-elite';

export type QuestMetric =
  | 'totalKills'
  | 'totalSurvivalMs'
  | 'maxLevelReached'
  | 'totalGoldCollected'
  | 'eliteKills';

export type QuestReward =
  | { type: 'gold'; amount: number }
  | { type: 'unlockHero'; heroId: HeroId }
  | { type: 'unlockPermanentUpgrade'; upgradeId: PermanentUpgradeId };

export type QuestDefinition = {
  id: QuestId;
  title: string;
  description: string;
  metric: QuestMetric;
  target: number;
  reward: QuestReward;
};

export const QUESTS: QuestDefinition[] = [
  {
    id: 'kill-100-enemies',
    title: 'Cull The Swarm',
    description: 'Kill 100 enemies total.',
    metric: 'totalKills',
    target: 100,
    reward: { type: 'gold', amount: 80 },
  },
  {
    id: 'survive-5-minutes',
    title: 'Stay Standing',
    description: 'Survive 5 minutes total across runs.',
    metric: 'totalSurvivalMs',
    target: 5 * 60 * 1000,
    reward: { type: 'gold', amount: 100 },
  },
  {
    id: 'reach-level-10',
    title: 'Power Spike',
    description: 'Reach level 10 in a run.',
    metric: 'maxLevelReached',
    target: 10,
    reward: { type: 'unlockPermanentUpgrade', upgradeId: 'starting-damage' },
  },
  {
    id: 'collect-500-gold',
    title: 'Treasure Circuit',
    description: 'Collect 500 gold total across all runs.',
    metric: 'totalGoldCollected',
    target: 500,
    reward: { type: 'gold', amount: 140 },
  },
  {
    id: 'defeat-1-elite',
    title: 'Break The Line',
    description: 'Reach level 4 in a run.',
    metric: 'maxLevelReached',
    target: 4,
    reward: { type: 'gold', amount: 90 },
  },
];
