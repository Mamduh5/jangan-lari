import {
  GOLD_REWARD_BASE,
  GOLD_REWARD_PER_KILL_STEP,
  GOLD_REWARD_PER_LEVEL,
  GOLD_REWARD_VICTORY_BONUS,
  LEVEL_UP_AUTO_PICK_MS,
  RUN_ACTIVE_DELTA_CAP_MS,
  RUN_TARGET_DURATION_MS,
} from '../config/constants';

export type RunSessionState = {
  runElapsedMs: number;
  pendingLevelUps: number;
  levelUpRemainingMs: number;
  killCount: number;
  eliteKillCount: number;
  goldEarned: number;
  isEnded: boolean;
  isLevelingUp: boolean;
  isSystemPaused: boolean;
  isTransitioningToMenu: boolean;
  isResolvingLevelUpChoice: boolean;
  globalWeaponDamageBonus: number;
  globalWeaponCooldownReduction: number;
  globalProjectileSpeedBonus: number;
  globalWeaponRangeBonus: number;
};

export type RegistryLike = {
  set: (key: string, value: unknown) => void;
};

export function createFreshRunSessionState(): RunSessionState {
  return {
    runElapsedMs: 0,
    pendingLevelUps: 0,
    levelUpRemainingMs: 0,
    killCount: 0,
    eliteKillCount: 0,
    goldEarned: 0,
    isEnded: false,
    isLevelingUp: false,
    isSystemPaused: false,
    isTransitioningToMenu: false,
    isResolvingLevelUpChoice: false,
    globalWeaponDamageBonus: 0,
    globalWeaponCooldownReduction: 0,
    globalProjectileSpeedBonus: 0,
    globalWeaponRangeBonus: 0,
  };
}

export function accumulateRunElapsedMs(
  currentElapsedMs: number,
  deltaMs: number,
  canAdvance: boolean,
  maxDeltaMs = RUN_ACTIVE_DELTA_CAP_MS,
  targetMs = RUN_TARGET_DURATION_MS,
): number {
  if (!canAdvance) {
    return currentElapsedMs;
  }

  const clampedDeltaMs = Math.min(Math.max(deltaMs, 0), maxDeltaMs);
  return Math.min(targetMs, currentElapsedMs + clampedDeltaMs);
}

export function beginLevelUpCountdown(initialMs = LEVEL_UP_AUTO_PICK_MS): number {
  return initialMs;
}

export function tickLevelUpCountdown(
  remainingMs: number,
  deltaMs: number,
  canAdvance: boolean,
): { remainingMs: number; expired: boolean } {
  if (!canAdvance || remainingMs <= 0) {
    return { remainingMs, expired: remainingMs === 0 };
  }

  const nextRemainingMs = Math.max(0, remainingMs - Math.max(deltaMs, 0));
  return {
    remainingMs: nextRemainingMs,
    expired: nextRemainingMs === 0,
  };
}

export function chooseRandomValidIndex<T>(
  choices: Array<T | null | undefined>,
  randomValue = Math.random(),
): number | null {
  const validIndices = choices.flatMap((choice, index) => (choice ? [index] : []));
  if (validIndices.length === 0) {
    return null;
  }

  const normalizedRandom = Math.min(0.999999, Math.max(0, randomValue));
  const pickedIndex = Math.floor(normalizedRandom * validIndices.length);
  return validIndices[pickedIndex];
}

export function calculateRunGoldReward(level: number, kills: number, victory: boolean): number {
  const levelReward = level * GOLD_REWARD_PER_LEVEL;
  const killReward = Math.floor(kills / GOLD_REWARD_PER_KILL_STEP);
  const victoryReward = victory ? GOLD_REWARD_VICTORY_BONUS : 0;

  return GOLD_REWARD_BASE + levelReward + killReward + victoryReward;
}

export function writeFreshRunRegistryState(registry: RegistryLike, selectedHeroName: string, totalGold: number): void {
  const state: Record<string, unknown> = {
    'run.endActive': false,
    'run.victory': false,
    'run.levelUpActive': false,
    'run.levelUpChoices': [],
    'run.levelUpRemainingMs': 0,
    'run.questRewards': [],
    'run.instructions': `Selected Hero: ${selectedHeroName}`,
    'run.elapsedMs': 0,
    'run.goldEarned': 0,
    'run.totalGold': totalGold,
  };

  for (const [key, value] of Object.entries(state)) {
    registry.set(key, value);
  }
}

export function clearRunRegistryState(registry: RegistryLike, totalGold: number): void {
  const state: Record<string, unknown> = {
    'run.endActive': false,
    'run.victory': false,
    'run.levelUpActive': false,
    'run.levelUpChoices': [],
    'run.levelUpRemainingMs': 0,
    'run.questRewards': [],
    'run.instructions': 'Return to menu complete.',
    'run.elapsedMs': 0,
    'run.goldEarned': 0,
    'run.totalGold': totalGold,
  };

  for (const [key, value] of Object.entries(state)) {
    registry.set(key, value);
  }
}
