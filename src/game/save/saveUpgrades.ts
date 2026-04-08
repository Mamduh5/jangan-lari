import type { PermanentUpgradeDefinition, PermanentUpgradeId } from '../data/permanentUpgrades';
import { getPermanentUpgradeCost } from '../data/permanentUpgrades';
import type { GameSaveData } from './saveData';
import { writeGameSave } from './saveData';

export function getPermanentUpgradeLevel(saveData: GameSaveData, id: PermanentUpgradeId): number {
  return saveData.purchasedPermanentUpgrades[id] ?? 0;
}

export function isPermanentUpgradeUnlocked(saveData: GameSaveData, id: PermanentUpgradeId): boolean {
  return saveData.unlockedPermanentUpgrades.includes(id);
}

export function canPurchasePermanentUpgrade(
  saveData: GameSaveData,
  upgrade: PermanentUpgradeDefinition,
): boolean {
  const currentLevel = getPermanentUpgradeLevel(saveData, upgrade.id);
  if (currentLevel >= upgrade.maxLevel || !isPermanentUpgradeUnlocked(saveData, upgrade.id)) {
    return false;
  }

  return saveData.totalGold >= getPermanentUpgradeCost(upgrade, currentLevel);
}

export function purchasePermanentUpgrade(
  saveData: GameSaveData,
  upgrade: PermanentUpgradeDefinition,
): GameSaveData | null {
  const currentLevel = getPermanentUpgradeLevel(saveData, upgrade.id);
  if (currentLevel >= upgrade.maxLevel || !isPermanentUpgradeUnlocked(saveData, upgrade.id)) {
    return null;
  }

  const cost = getPermanentUpgradeCost(upgrade, currentLevel);
  if (saveData.totalGold < cost) {
    return null;
  }

  const nextSave: GameSaveData = {
    ...saveData,
    totalGold: saveData.totalGold - cost,
    selectedHero: saveData.selectedHero,
    unlockedHeroes: [...saveData.unlockedHeroes],
    unlockedPermanentUpgrades: [...saveData.unlockedPermanentUpgrades],
    completedQuests: [...saveData.completedQuests],
    progressStats: { ...saveData.progressStats },
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
    selectedHero: saveData.selectedHero,
    unlockedHeroes: [...saveData.unlockedHeroes],
    unlockedPermanentUpgrades: [...saveData.unlockedPermanentUpgrades],
    completedQuests: [...saveData.completedQuests],
    progressStats: { ...saveData.progressStats },
    purchasedPermanentUpgrades: { ...saveData.purchasedPermanentUpgrades },
  };

  writeGameSave(nextSave);
  return nextSave;
}
