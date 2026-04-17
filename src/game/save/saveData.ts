import { HERO_IDS, type HeroId } from '../data/heroes';
import type { PermanentUpgradeId } from '../data/permanentUpgrades';
import type { QuestId } from '../data/quests';

const SAVE_VERSION = 3;
const SAVE_STORAGE_KEY = 'jangan-lari-save-v1';

export type ProgressStats = {
  totalKills: number;
  totalSurvivalMs: number;
  maxLevelReached: number;
  totalGoldCollected: number;
  eliteKills: number;
};

export type GameSaveData = {
  version: number;
  totalGold: number;
  selectedHero: HeroId;
  unlockedHeroes: HeroId[];
  unlockedPermanentUpgrades: PermanentUpgradeId[];
  purchasedPermanentUpgrades: Record<PermanentUpgradeId, number>;
  completedQuests: QuestId[];
  progressStats: ProgressStats;
};

export function createDefaultSaveData(): GameSaveData {
  return {
    version: SAVE_VERSION,
    totalGold: 0,
    selectedHero: 'runner',
    unlockedHeroes: ['runner'],
    unlockedPermanentUpgrades: ['max-hp', 'move-speed', 'pickup-range'],
    purchasedPermanentUpgrades: {
      'max-hp': 0,
      'move-speed': 0,
      'pickup-range': 0,
      'starting-damage': 0,
    },
    completedQuests: [],
    progressStats: {
      totalKills: 0,
      totalSurvivalMs: 0,
      maxLevelReached: 0,
      totalGoldCollected: 0,
      eliteKills: 0,
    },
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
      ? parsed.unlockedHeroes.filter((hero): hero is HeroId => HERO_IDS.includes(hero as HeroId))
      : fallback.unlockedHeroes;

    const selectedHero = HERO_IDS.includes(parsed.selectedHero as HeroId)
      ? (parsed.selectedHero as HeroId)
      : fallback.selectedHero;

    const unlockedPermanentUpgrades = Array.isArray(parsed.unlockedPermanentUpgrades)
      ? parsed.unlockedPermanentUpgrades.filter(
          (upgrade): upgrade is PermanentUpgradeId =>
            upgrade === 'max-hp' ||
            upgrade === 'move-speed' ||
            upgrade === 'pickup-range' ||
            upgrade === 'starting-damage',
        )
      : fallback.unlockedPermanentUpgrades;

    const completedQuests = Array.isArray(parsed.completedQuests)
      ? parsed.completedQuests.filter(
          (quest): quest is QuestId =>
            quest === 'kill-100-enemies' ||
            quest === 'survive-5-minutes' ||
            quest === 'reach-level-10' ||
            quest === 'collect-500-gold' ||
            quest === 'defeat-1-elite',
        )
      : fallback.completedQuests;

    const loaded: GameSaveData = {
      version: SAVE_VERSION,
      totalGold: Math.max(0, Number(parsed.totalGold ?? fallback.totalGold)),
      selectedHero: unlockedHeroes.includes(selectedHero) ? selectedHero : unlockedHeroes[0] ?? fallback.selectedHero,
      unlockedHeroes: unlockedHeroes.length > 0 ? unlockedHeroes : fallback.unlockedHeroes,
      unlockedPermanentUpgrades:
        unlockedPermanentUpgrades.length > 0 ? unlockedPermanentUpgrades : fallback.unlockedPermanentUpgrades,
      purchasedPermanentUpgrades: {
        'max-hp': Math.max(0, Number(parsed.purchasedPermanentUpgrades?.['max-hp'] ?? 0)),
        'move-speed': Math.max(0, Number(parsed.purchasedPermanentUpgrades?.['move-speed'] ?? 0)),
        'pickup-range': Math.max(0, Number(parsed.purchasedPermanentUpgrades?.['pickup-range'] ?? 0)),
        'starting-damage': Math.max(0, Number(parsed.purchasedPermanentUpgrades?.['starting-damage'] ?? 0)),
      },
      completedQuests,
      progressStats: {
        totalKills: Math.max(0, Number(parsed.progressStats?.totalKills ?? 0)),
        totalSurvivalMs: Math.max(0, Number(parsed.progressStats?.totalSurvivalMs ?? 0)),
        maxLevelReached: Math.max(0, Number(parsed.progressStats?.maxLevelReached ?? 0)),
        totalGoldCollected: Math.max(0, Number(parsed.progressStats?.totalGoldCollected ?? 0)),
        eliteKills: Math.max(0, Number(parsed.progressStats?.eliteKills ?? 0)),
      },
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
