import type { PermanentUpgradeDefinition, PermanentUpgradeId } from '../data/permanentUpgrades';
import { getPermanentUpgradeCost } from '../data/permanentUpgrades';
import type { GameSaveData } from './saveData';
import { writeGameSave } from './saveData';

export function getPermanentUpgradeLevel(saveData: GameSaveData, id: PermanentUpgradeId): number {
  return saveData.purchasedPermanentUpgrades[id] ?? 0;
}

export function canPurchasePermanentUpgrade(
  saveData: GameSaveData,
  upgrade: PermanentUpgradeDefinition,
): boolean {
  const currentLevel = getPermanentUpgradeLevel(saveData, upgrade.id);
  if (currentLevel >= upgrade.maxLevel) {
    return false;
  }

  return saveData.totalGold >= getPermanentUpgradeCost(upgrade, currentLevel);
}

export function purchasePermanentUpgrade(
  saveData: GameSaveData,
  upgrade: PermanentUpgradeDefinition,
): GameSaveData | null {
  const currentLevel = getPermanentUpgradeLevel(saveData, upgrade.id);
  if (currentLevel >= upgrade.maxLevel) {
    return null;
  }

  const cost = getPermanentUpgradeCost(upgrade, currentLevel);
  if (saveData.totalGold < cost) {
    return null;
  }

  const nextSave: GameSaveData = {
    ...saveData,
    totalGold: saveData.totalGold - cost,
    unlockedHeroes: [...saveData.unlockedHeroes],
    completedQuests: [...saveData.completedQuests],
    purchasedPermanentUpgrades: {
      ...saveData.purchasedPermanentUpgrades,
      [upgrade.id]: currentLevel + 1,
    },
  };

  writeGameSave(nextSave);
  return nextSave;
}

export function awardRunGold(saveData: GameSaveData, amount: number): GameSaveData {
  const nextSave: GameSaveData = {
    ...saveData,
    totalGold: saveData.totalGold + amount,
    unlockedHeroes: [...saveData.unlockedHeroes],
    completedQuests: [...saveData.completedQuests],
    purchasedPermanentUpgrades: { ...saveData.purchasedPermanentUpgrades },
  };

  writeGameSave(nextSave);
  return nextSave;
}
