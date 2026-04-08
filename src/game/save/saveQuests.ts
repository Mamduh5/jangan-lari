import { HEROES } from '../data/heroes';
import { QUESTS, type QuestDefinition } from '../data/quests';
import type { PermanentUpgradeId } from '../data/permanentUpgrades';
import type { GameSaveData } from './saveData';
import { writeGameSave } from './saveData';

export type RunProgressSummary = {
  kills: number;
  survivalMs: number;
  levelReached: number;
  goldCollected: number;
  eliteKills: number;
};

export type QuestResolution = {
  saveData: GameSaveData;
  completedQuests: QuestDefinition[];
  rewardMessages: string[];
};

export function applyRunProgressToQuests(
  saveData: GameSaveData,
  summary: RunProgressSummary,
): QuestResolution {
  const nextSave: GameSaveData = {
    ...saveData,
    unlockedHeroes: [...saveData.unlockedHeroes],
    unlockedPermanentUpgrades: [...saveData.unlockedPermanentUpgrades],
    completedQuests: [...saveData.completedQuests],
    progressStats: {
      totalKills: saveData.progressStats.totalKills + summary.kills,
      totalSurvivalMs: saveData.progressStats.totalSurvivalMs + summary.survivalMs,
      maxLevelReached: Math.max(saveData.progressStats.maxLevelReached, summary.levelReached),
      totalGoldCollected: saveData.progressStats.totalGoldCollected + summary.goldCollected,
      eliteKills: saveData.progressStats.eliteKills + summary.eliteKills,
    },
    purchasedPermanentUpgrades: { ...saveData.purchasedPermanentUpgrades },
  };

  const completedQuests: QuestDefinition[] = [];
  const rewardMessages: string[] = [];

  for (const quest of QUESTS) {
    if (nextSave.completedQuests.includes(quest.id)) {
      continue;
    }

    if (nextSave.progressStats[quest.metric] < quest.target) {
      continue;
    }

    nextSave.completedQuests.push(quest.id);
    completedQuests.push(quest);
    rewardMessages.push(applyQuestReward(nextSave, quest));
  }

  writeGameSave(nextSave);
  return { saveData: nextSave, completedQuests, rewardMessages };
}

function applyQuestReward(saveData: GameSaveData, quest: QuestDefinition): string {
  switch (quest.reward.type) {
    case 'gold':
      saveData.totalGold += quest.reward.amount;
      return `${quest.title}: +${quest.reward.amount} gold`;
    case 'unlockHero': {
      if (!saveData.unlockedHeroes.includes(quest.reward.heroId)) {
        saveData.unlockedHeroes.push(quest.reward.heroId);
      }

      return `${quest.title}: ${HEROES[quest.reward.heroId].name} unlocked`;
    }
    case 'unlockPermanentUpgrade': {
      unlockPermanentUpgrade(saveData, quest.reward.upgradeId);
      return `${quest.title}: permanent upgrade unlocked`;
    }
  }
}

function unlockPermanentUpgrade(saveData: GameSaveData, upgradeId: PermanentUpgradeId): void {
  if (!saveData.unlockedPermanentUpgrades.includes(upgradeId)) {
    saveData.unlockedPermanentUpgrades.push(upgradeId);
  }
}
