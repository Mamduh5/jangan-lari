import type { PermanentUpgradeId } from '../data/permanentUpgrades';

const SAVE_VERSION = 1;
const SAVE_STORAGE_KEY = 'jangan-lari-save-v1';

export type GameSaveData = {
  version: number;
  totalGold: number;
  unlockedHeroes: string[];
  purchasedPermanentUpgrades: Record<PermanentUpgradeId, number>;
  completedQuests: string[];
};

export function createDefaultSaveData(): GameSaveData {
  return {
    version: SAVE_VERSION,
    totalGold: 0,
    unlockedHeroes: ['runner'],
    purchasedPermanentUpgrades: {
      'max-hp': 0,
      'move-speed': 0,
      'pickup-range': 0,
      'starting-damage': 0,
    },
    completedQuests: [],
  };
}

export function loadGameSave(): GameSaveData {
  const fallback = createDefaultSaveData();

  try {
    const rawValue = window.localStorage.getItem(SAVE_STORAGE_KEY);
    if (!rawValue) {
      window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(fallback));
      return fallback;
    }

    const parsed = JSON.parse(rawValue) as Partial<GameSaveData>;
    const loaded: GameSaveData = {
      version: SAVE_VERSION,
      totalGold: Math.max(0, Number(parsed.totalGold ?? fallback.totalGold)),
      unlockedHeroes: Array.isArray(parsed.unlockedHeroes)
        ? parsed.unlockedHeroes.filter((hero): hero is string => typeof hero === 'string')
        : fallback.unlockedHeroes,
      purchasedPermanentUpgrades: {
        'max-hp': Math.max(0, Number(parsed.purchasedPermanentUpgrades?.['max-hp'] ?? 0)),
        'move-speed': Math.max(0, Number(parsed.purchasedPermanentUpgrades?.['move-speed'] ?? 0)),
        'pickup-range': Math.max(0, Number(parsed.purchasedPermanentUpgrades?.['pickup-range'] ?? 0)),
        'starting-damage': Math.max(0, Number(parsed.purchasedPermanentUpgrades?.['starting-damage'] ?? 0)),
      },
      completedQuests: Array.isArray(parsed.completedQuests)
        ? parsed.completedQuests.filter((quest): quest is string => typeof quest === 'string')
        : fallback.completedQuests,
    };

    window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(loaded));
    return loaded;
  } catch {
    return fallback;
  }
}

export function writeGameSave(saveData: GameSaveData): void {
  window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(saveData));
}
