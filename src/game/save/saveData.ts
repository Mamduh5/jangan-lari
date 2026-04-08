import type { HeroId } from '../data/heroes';
import type { PermanentUpgradeId } from '../data/permanentUpgrades';

const SAVE_VERSION = 2;
const SAVE_STORAGE_KEY = 'jangan-lari-save-v1';

export type GameSaveData = {
  version: number;
  totalGold: number;
  selectedHero: HeroId;
  unlockedHeroes: HeroId[];
  purchasedPermanentUpgrades: Record<PermanentUpgradeId, number>;
  completedQuests: string[];
};

export function createDefaultSaveData(): GameSaveData {
  return {
    version: SAVE_VERSION,
    totalGold: 0,
    selectedHero: 'runner',
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
    const unlockedHeroes = Array.isArray(parsed.unlockedHeroes)
      ? parsed.unlockedHeroes.filter((hero): hero is HeroId => hero === 'runner' || hero === 'vanguard')
      : fallback.unlockedHeroes;

    const selectedHero =
      parsed.selectedHero === 'runner' || parsed.selectedHero === 'vanguard'
        ? parsed.selectedHero
        : fallback.selectedHero;

    const loaded: GameSaveData = {
      version: SAVE_VERSION,
      totalGold: Math.max(0, Number(parsed.totalGold ?? fallback.totalGold)),
      selectedHero: unlockedHeroes.includes(selectedHero) ? selectedHero : unlockedHeroes[0] ?? fallback.selectedHero,
      unlockedHeroes: unlockedHeroes.length > 0 ? unlockedHeroes : fallback.unlockedHeroes,
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
