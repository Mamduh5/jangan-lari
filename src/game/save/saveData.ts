import { HERO_IDS, type HeroId } from '../data/heroes';
import { PERMANENT_UPGRADE_IDS, type PermanentUpgradeId } from '../data/permanentUpgrades';
import type { QuestId } from '../data/quests';
import type { TankClassId } from '../data/tankClasses';

const SAVE_VERSION = 5;
const SAVE_STORAGE_KEY = 'jangan-lari-save-v1';
const LOCAL_LEADERBOARD_LIMIT = 5;

export const CONTROL_GUIDE_MODES = ['hidden', 'subtle', 'visible'] as const;
export type ControlGuideMode = (typeof CONTROL_GUIDE_MODES)[number];

export type ProgressStats = {
  totalKills: number;
  totalSurvivalMs: number;
  maxLevelReached: number;
  totalGoldCollected: number;
  eliteKills: number;
};

export type LocalLeaderboardEntry = {
  id: string;
  score: number;
  level: number;
  classId: TankClassId;
  classTitle: string;
  kills: number;
  timeSurvivedMs: number;
  timestamp: number;
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
  bestScore: number;
  localLeaderboard: LocalLeaderboardEntry[];
  controlGuideMode: ControlGuideMode;
  controlHintDismissed: boolean;
};

export function createDefaultSaveData(): GameSaveData {
  return {
    version: SAVE_VERSION,
    totalGold: 0,
    selectedHero: 'runner',
    unlockedHeroes: ['runner'],
    unlockedPermanentUpgrades: ['max-hp', 'move-speed', 'pickup-range', 'hp-regen'],
    purchasedPermanentUpgrades: {
      'max-hp': 0,
      'move-speed': 0,
      'pickup-range': 0,
      'starting-damage': 0,
      'hp-regen': 0,
    },
    completedQuests: [],
    progressStats: {
      totalKills: 0,
      totalSurvivalMs: 0,
      maxLevelReached: 0,
      totalGoldCollected: 0,
      eliteKills: 0,
    },
    bestScore: 0,
    localLeaderboard: [],
    controlGuideMode: 'subtle',
    controlHintDismissed: false,
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
          (upgrade): upgrade is PermanentUpgradeId => PERMANENT_UPGRADE_IDS.includes(upgrade as PermanentUpgradeId),
        )
      : fallback.unlockedPermanentUpgrades;
    const mergedUnlockedPermanentUpgrades = [
      ...new Set([...fallback.unlockedPermanentUpgrades, ...unlockedPermanentUpgrades]),
    ];

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
        mergedUnlockedPermanentUpgrades.length > 0 ? mergedUnlockedPermanentUpgrades : fallback.unlockedPermanentUpgrades,
      purchasedPermanentUpgrades: {
        'max-hp': Math.max(0, Number(parsed.purchasedPermanentUpgrades?.['max-hp'] ?? 0)),
        'move-speed': Math.max(0, Number(parsed.purchasedPermanentUpgrades?.['move-speed'] ?? 0)),
        'pickup-range': Math.max(0, Number(parsed.purchasedPermanentUpgrades?.['pickup-range'] ?? 0)),
        'starting-damage': Math.max(0, Number(parsed.purchasedPermanentUpgrades?.['starting-damage'] ?? 0)),
        'hp-regen': Math.max(0, Number(parsed.purchasedPermanentUpgrades?.['hp-regen'] ?? 0)),
      },
      completedQuests,
      progressStats: {
        totalKills: Math.max(0, Number(parsed.progressStats?.totalKills ?? 0)),
        totalSurvivalMs: Math.max(0, Number(parsed.progressStats?.totalSurvivalMs ?? 0)),
        maxLevelReached: Math.max(0, Number(parsed.progressStats?.maxLevelReached ?? 0)),
        totalGoldCollected: Math.max(0, Number(parsed.progressStats?.totalGoldCollected ?? 0)),
        eliteKills: Math.max(0, Number(parsed.progressStats?.eliteKills ?? 0)),
      },
      bestScore: Math.max(0, Number(parsed.bestScore ?? 0)),
      localLeaderboard: sanitizeLocalLeaderboard(parsed.localLeaderboard),
      controlGuideMode: sanitizeControlGuideMode(parsed.controlGuideMode, fallback.controlGuideMode),
      controlHintDismissed: Boolean(parsed.controlHintDismissed ?? fallback.controlHintDismissed),
    };

    loaded.bestScore = Math.max(loaded.bestScore, loaded.localLeaderboard[0]?.score ?? 0);

    window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(loaded));
    return loaded;
  } catch {
    return fallback;
  }
}

export function writeGameSave(saveData: GameSaveData): void {
  window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(saveData));
}

export function updateControlGuideMode(saveData: GameSaveData, mode: ControlGuideMode): GameSaveData {
  const nextSave: GameSaveData = {
    ...saveData,
    unlockedHeroes: [...saveData.unlockedHeroes],
    unlockedPermanentUpgrades: [...saveData.unlockedPermanentUpgrades],
    purchasedPermanentUpgrades: { ...saveData.purchasedPermanentUpgrades },
    completedQuests: [...saveData.completedQuests],
    progressStats: { ...saveData.progressStats },
    localLeaderboard: [...saveData.localLeaderboard],
    controlGuideMode: mode,
  };

  writeGameSave(nextSave);
  return nextSave;
}

export function markControlHintDismissed(saveData: GameSaveData): GameSaveData {
  if (saveData.controlHintDismissed) {
    return saveData;
  }

  const nextSave: GameSaveData = {
    ...saveData,
    unlockedHeroes: [...saveData.unlockedHeroes],
    unlockedPermanentUpgrades: [...saveData.unlockedPermanentUpgrades],
    purchasedPermanentUpgrades: { ...saveData.purchasedPermanentUpgrades },
    completedQuests: [...saveData.completedQuests],
    progressStats: { ...saveData.progressStats },
    localLeaderboard: [...saveData.localLeaderboard],
    controlHintDismissed: true,
  };

  writeGameSave(nextSave);
  return nextSave;
}

export function recordLocalLeaderboardEntry(
  saveData: GameSaveData,
  entry: Omit<LocalLeaderboardEntry, 'id' | 'timestamp'> & { timestamp?: number },
): { saveData: GameSaveData; entry: LocalLeaderboardEntry; isNewBest: boolean } {
  const previousBestScore = Math.max(saveData.bestScore, saveData.localLeaderboard[0]?.score ?? 0);
  const timestamp = Math.max(0, Number(entry.timestamp ?? Date.now()));
  const nextEntry: LocalLeaderboardEntry = {
    id: `run-${timestamp}-${Math.max(0, Math.floor(entry.score))}`,
    score: Math.max(0, Math.floor(entry.score)),
    level: Math.max(1, Math.floor(entry.level)),
    classId: entry.classId,
    classTitle: entry.classTitle || entry.classId,
    kills: Math.max(0, Math.floor(entry.kills)),
    timeSurvivedMs: Math.max(0, Math.floor(entry.timeSurvivedMs)),
    timestamp,
  };
  const localLeaderboard = [...saveData.localLeaderboard, nextEntry]
    .sort((left, right) => right.score - left.score || right.timestamp - left.timestamp)
    .slice(0, LOCAL_LEADERBOARD_LIMIT);
  const nextSave: GameSaveData = {
    ...saveData,
    selectedHero: saveData.selectedHero,
    unlockedHeroes: [...saveData.unlockedHeroes],
    unlockedPermanentUpgrades: [...saveData.unlockedPermanentUpgrades],
    purchasedPermanentUpgrades: { ...saveData.purchasedPermanentUpgrades },
    completedQuests: [...saveData.completedQuests],
    progressStats: { ...saveData.progressStats },
    bestScore: Math.max(previousBestScore, nextEntry.score),
    localLeaderboard,
  };

  writeGameSave(nextSave);
  return {
    saveData: nextSave,
    entry: nextEntry,
    isNewBest: nextEntry.score > previousBestScore,
  };
}

function sanitizeLocalLeaderboard(value: unknown): LocalLeaderboardEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((entry): LocalLeaderboardEntry[] => {
      if (!entry || typeof entry !== 'object') {
        return [];
      }

      const candidate = entry as Partial<LocalLeaderboardEntry>;
      if (!candidate.classId || !isTankClassId(candidate.classId)) {
        return [];
      }

      const score = Math.max(0, Math.floor(Number(candidate.score ?? 0)));
      const timestamp = Math.max(0, Math.floor(Number(candidate.timestamp ?? 0)));
      return [
        {
          id: String(candidate.id || `run-${timestamp}-${score}`),
          score,
          level: Math.max(1, Math.floor(Number(candidate.level ?? 1))),
          classId: candidate.classId,
          classTitle: String(candidate.classTitle || candidate.classId),
          kills: Math.max(0, Math.floor(Number(candidate.kills ?? 0))),
          timeSurvivedMs: Math.max(0, Math.floor(Number(candidate.timeSurvivedMs ?? 0))),
          timestamp,
        },
      ];
    })
    .sort((left, right) => right.score - left.score || right.timestamp - left.timestamp)
    .slice(0, LOCAL_LEADERBOARD_LIMIT);
}

function isTankClassId(value: unknown): value is TankClassId {
  return value === 'basic' || value === 'twin' || value === 'sniper';
}

function sanitizeControlGuideMode(value: unknown, fallback: ControlGuideMode): ControlGuideMode {
  return CONTROL_GUIDE_MODES.includes(value as ControlGuideMode) ? (value as ControlGuideMode) : fallback;
}
