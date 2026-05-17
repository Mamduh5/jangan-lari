import { BOSS_PHASE_TWO_HEALTH_RATIO } from '../config/constants';

export type BossPhase = 1 | 2;

export function resolveBossPhase(options: {
  currentPhase: BossPhase;
  phaseTwoTriggered: boolean;
  hp: number;
  maxHp: number;
  thresholdRatio?: number;
}): { phase: BossPhase; phaseTwoTriggered: boolean; changed: boolean } {
  if (options.currentPhase === 2 || options.phaseTwoTriggered) {
    return { phase: 2, phaseTwoTriggered: true, changed: false };
  }

  const maxHp = Math.max(1, options.maxHp);
  const thresholdRatio = options.thresholdRatio ?? BOSS_PHASE_TWO_HEALTH_RATIO;
  const shouldTrigger = Math.max(0, options.hp) / maxHp <= thresholdRatio;

  return {
    phase: shouldTrigger ? 2 : 1,
    phaseTwoTriggered: shouldTrigger,
    changed: shouldTrigger,
  };
}
