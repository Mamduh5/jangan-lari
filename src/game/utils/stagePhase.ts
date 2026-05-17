export type StagePhase = 'preBoss' | 'boss' | 'victory' | 'defeat';

export type StageVictoryCondition = 'pendingBoss' | 'bossActive' | 'bossDefeated' | 'playerDefeated';

export function getStagePhaseForRunState(options: {
  elapsedMs: number;
  bossSpawnTimeMs: number;
  bossActive: boolean;
  ended: boolean;
  victory: boolean;
}): StagePhase {
  if (options.ended) {
    return options.victory ? 'victory' : 'defeat';
  }

  return options.bossActive || options.elapsedMs >= options.bossSpawnTimeMs ? 'boss' : 'preBoss';
}

export function areNormalSpawnsSuppressed(stagePhase: StagePhase): boolean {
  return stagePhase === 'boss';
}

export function getStageVictoryCondition(stagePhase: StagePhase): StageVictoryCondition {
  switch (stagePhase) {
    case 'victory':
      return 'bossDefeated';
    case 'defeat':
      return 'playerDefeated';
    case 'boss':
      return 'bossActive';
    default:
      return 'pendingBoss';
  }
}
