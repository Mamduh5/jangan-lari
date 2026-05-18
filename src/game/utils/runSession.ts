import {
  BOSS_SPAWN_TIME_MS,
  EVENT_ENEMY_STAT_MULTIPLIER,
  GOLD_REWARD_BASE,
  GOLD_REWARD_PER_KILL_STEP,
  GOLD_REWARD_PER_LEVEL,
  GOLD_REWARD_VICTORY_BONUS,
  LEVEL_UP_AUTO_PICK_MS,
  RUN_ACTIVE_DELTA_CAP_MS,
} from '../config/constants';

export type RunSessionState = {
  runElapsedMs: number;
  pendingLevelUps: number;
  levelUpRemainingMs: number;
  killCount: number;
  eliteKillCount: number;
  neutralShapesDestroyed: number;
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
    neutralShapesDestroyed: 0,
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
  targetMs = Number.POSITIVE_INFINITY,
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

export function shouldBeginQueuedLevelUp(options: {
  levelUpQueued: boolean;
  pendingLevelUps: number;
  isEnded: boolean;
  isTransitioningToMenu: boolean;
  isSystemPaused: boolean;
  isHitStopActive: boolean;
  isLevelingUp: boolean;
}): boolean {
  return (
    options.levelUpQueued &&
    options.pendingLevelUps > 0 &&
    !options.isEnded &&
    !options.isTransitioningToMenu &&
    !options.isSystemPaused &&
    !options.isHitStopActive &&
    !options.isLevelingUp
  );
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
    'run.levelUpMode': 'normal',
    'run.levelUpChoices': [],
    'run.levelUpChoiceCount': 0,
    'run.levelUpRemainingMs': 0,
    'run.upgradePoolExhausted': false,
    'run.statPoints': 0,
    'run.canSpendStatPoints': false,
    'run.statsMaxed': false,
    'run.tankStatLevels': {
      bulletDamage: 0,
      reload: 0,
      moveSpeed: 0,
      hpRegen: 0,
    },
    'run.tankStatEffects': {
      bulletDamageBonus: 0,
      fireCooldownReductionMs: 0,
      moveSpeedBonus: 0,
      hpRegenPerSecond: 0,
    },
    'run.effectiveHpRegenPerSecond': 0,
    'run.metaHpRegenPerSecond': 0,
    'run.runHpRegenPerSecond': 0,
    'run.hpRegenActive': false,
    'run.tankClass': {
      id: 'basic',
      title: 'Basic',
      description: 'Balanced starter tank.',
    },
    'run.classChoiceAvailable': false,
    'run.classChoiceActive': false,
    'run.classChoiceChoices': [],
    'run.manualPaused': false,
    'run.pauseMenuActive': false,
    'run.questRewards': [],
    'run.heroName': selectedHeroName,
    'run.heroPassive': '',
    'run.weaponNames': [],
    'run.alertKind': 'objective',
    'run.alertText': '',
    'run.rewardText': '',
    'run.rewardColor': '#fcd34d',
    'run.instructions': `Selected Hero: ${selectedHeroName}`,
    'run.stagePhase': 'preBoss',
    'run.bossSpawnTimeMs': BOSS_SPAWN_TIME_MS,
    'run.bossActive': false,
    'run.bossHp': null,
    'run.bossMaxHp': null,
    'run.bossPhase': 1,
    'run.bossPhaseTwoTriggered': false,
    'run.activeBossSkill': '',
    'run.bossSkillTelegraphActive': false,
    'run.bossSkillDamageActive': false,
    'run.activeMinibossSkill': '',
    'run.eventEnemyMultiplier': EVENT_ENEMY_STAT_MULTIPLIER,
    'run.normalSpawnsSuppressed': false,
    'run.victoryCondition': 'pendingBoss',
    'run.elapsedMs': 0,
    'run.score': 0,
    'run.bestScore': 0,
    'run.finalScore': 0,
    'run.newBestScore': false,
    'run.localLeaderboard': [],
    'run.localLeaderboardEntryCount': 0,
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
    'run.levelUpMode': 'normal',
    'run.levelUpChoices': [],
    'run.levelUpChoiceCount': 0,
    'run.levelUpRemainingMs': 0,
    'run.upgradePoolExhausted': false,
    'run.statPoints': 0,
    'run.canSpendStatPoints': false,
    'run.statsMaxed': false,
    'run.tankStatLevels': {
      bulletDamage: 0,
      reload: 0,
      moveSpeed: 0,
      hpRegen: 0,
    },
    'run.tankStatEffects': {
      bulletDamageBonus: 0,
      fireCooldownReductionMs: 0,
      moveSpeedBonus: 0,
      hpRegenPerSecond: 0,
    },
    'run.effectiveHpRegenPerSecond': 0,
    'run.metaHpRegenPerSecond': 0,
    'run.runHpRegenPerSecond': 0,
    'run.hpRegenActive': false,
    'run.tankClass': {
      id: 'basic',
      title: 'Basic',
      description: 'Balanced starter tank.',
    },
    'run.classChoiceAvailable': false,
    'run.classChoiceActive': false,
    'run.classChoiceChoices': [],
    'run.manualPaused': false,
    'run.pauseMenuActive': false,
    'run.questRewards': [],
    'run.heroName': '',
    'run.heroPassive': '',
    'run.weaponNames': [],
    'run.alertKind': 'objective',
    'run.alertText': '',
    'run.rewardText': '',
    'run.rewardColor': '#fcd34d',
    'run.instructions': 'Return to menu complete.',
    'run.stagePhase': 'preBoss',
    'run.bossSpawnTimeMs': BOSS_SPAWN_TIME_MS,
    'run.bossActive': false,
    'run.bossHp': null,
    'run.bossMaxHp': null,
    'run.bossPhase': 1,
    'run.bossPhaseTwoTriggered': false,
    'run.activeBossSkill': '',
    'run.bossSkillTelegraphActive': false,
    'run.bossSkillDamageActive': false,
    'run.activeMinibossSkill': '',
    'run.eventEnemyMultiplier': EVENT_ENEMY_STAT_MULTIPLIER,
    'run.normalSpawnsSuppressed': false,
    'run.victoryCondition': 'pendingBoss',
    'run.elapsedMs': 0,
    'run.score': 0,
    'run.bestScore': 0,
    'run.finalScore': 0,
    'run.newBestScore': false,
    'run.localLeaderboard': [],
    'run.localLeaderboardEntryCount': 0,
    'run.goldEarned': 0,
    'run.totalGold': totalGold,
  };

  for (const [key, value] of Object.entries(state)) {
    registry.set(key, value);
  }
}
