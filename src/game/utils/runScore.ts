export type RunScoreSummary = {
  neutralShapesDestroyed: number;
  enemyKills: number;
  levelReached: number;
  timeSurvivedMs: number;
  goldEarned?: number;
};

export const RUN_SCORE_WEIGHTS = {
  neutralShape: 15,
  enemyKill: 35,
  levelBeyondOne: 100,
  survivedSecond: 2,
  goldEarned: 5,
} as const;

export function calculateRunScore(summary: RunScoreSummary): number {
  const neutralShapeScore = Math.max(0, Math.floor(summary.neutralShapesDestroyed)) * RUN_SCORE_WEIGHTS.neutralShape;
  const killScore = Math.max(0, Math.floor(summary.enemyKills)) * RUN_SCORE_WEIGHTS.enemyKill;
  const levelScore = Math.max(0, Math.floor(summary.levelReached) - 1) * RUN_SCORE_WEIGHTS.levelBeyondOne;
  const survivalScore = Math.floor(Math.max(0, summary.timeSurvivedMs) / 1000) * RUN_SCORE_WEIGHTS.survivedSecond;
  const goldScore = Math.max(0, Math.floor(summary.goldEarned ?? 0)) * RUN_SCORE_WEIGHTS.goldEarned;

  return neutralShapeScore + killScore + levelScore + survivalScore + goldScore;
}
