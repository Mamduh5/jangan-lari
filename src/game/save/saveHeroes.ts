import type { HeroDefinition, HeroId } from '../data/heroes';
import type { GameSaveData } from './saveData';
import { writeGameSave } from './saveData';

export function isHeroUnlocked(saveData: GameSaveData, heroId: HeroId): boolean {
  return saveData.unlockedHeroes.includes(heroId);
}

export function selectHero(saveData: GameSaveData, heroId: HeroId): GameSaveData | null {
  if (!isHeroUnlocked(saveData, heroId)) {
    return null;
  }

  const nextSave: GameSaveData = {
    ...saveData,
    selectedHero: heroId,
    unlockedHeroes: [...saveData.unlockedHeroes],
    unlockedPermanentUpgrades: [...saveData.unlockedPermanentUpgrades],
    completedQuests: [...saveData.completedQuests],
    progressStats: { ...saveData.progressStats },
    purchasedPermanentUpgrades: { ...saveData.purchasedPermanentUpgrades },
  };

  writeGameSave(nextSave);
  return nextSave;
}

export function unlockHero(saveData: GameSaveData, hero: HeroDefinition): GameSaveData | null {
  if (!hero.unlockCost || isHeroUnlocked(saveData, hero.id) || saveData.totalGold < hero.unlockCost) {
    return null;
  }

  const nextSave: GameSaveData = {
    ...saveData,
    totalGold: saveData.totalGold - hero.unlockCost,
    selectedHero: hero.id,
    unlockedHeroes: [...saveData.unlockedHeroes, hero.id],
    unlockedPermanentUpgrades: [...saveData.unlockedPermanentUpgrades],
    completedQuests: [...saveData.completedQuests],
    progressStats: { ...saveData.progressStats },
    purchasedPermanentUpgrades: { ...saveData.purchasedPermanentUpgrades },
  };

  writeGameSave(nextSave);
  return nextSave;
}
