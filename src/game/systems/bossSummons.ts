import {
  BOSS_SUMMON_DAMAGE_MULTIPLIER,
  BOSS_SUMMON_HEALTH_MULTIPLIER,
  BOSS_SUMMON_MAX_ACTIVE,
  BOSS_SUMMON_SPEED_MULTIPLIER,
  BOSS_SUMMON_XP_VALUE,
} from '../config/constants';
import type { EnemyArchetype } from '../data/enemies';
import type { StagePhase } from '../utils/stagePhase';
import type { BossPhase } from './bossPhase';

export type BossSummonPressureState = 'inactive' | 'phase2-summons';

export function getAvailableBossSummonSlots(
  activeSummonCount: number,
  cap = BOSS_SUMMON_MAX_ACTIVE,
): number {
  return Math.max(0, Math.max(0, cap) - Math.max(0, activeSummonCount));
}

export function shouldSpawnBossSummons(options: {
  stagePhase: StagePhase;
  bossPhase: BossPhase;
  bossActive: boolean;
  elapsedMs: number;
  nextSummonAtMs: number;
  activeSummonCount: number;
  cap?: number;
}): boolean {
  if (options.stagePhase !== 'boss' || options.bossPhase !== 2 || !options.bossActive) {
    return false;
  }

  return (
    options.elapsedMs >= options.nextSummonAtMs &&
    getAvailableBossSummonSlots(options.activeSummonCount, options.cap) > 0
  );
}

export function createBossSummonArchetype(base: EnemyArchetype): EnemyArchetype {
  return {
    ...base,
    name: `Boss ${base.name}`,
    maxHealth: Math.max(1, Math.round(base.maxHealth * BOSS_SUMMON_HEALTH_MULTIPLIER)),
    speed: Math.max(1, Math.round(base.speed * BOSS_SUMMON_SPEED_MULTIPLIER)),
    contactDamage: Math.max(1, Math.round(base.contactDamage * BOSS_SUMMON_DAMAGE_MULTIPLIER)),
    xpValue: BOSS_SUMMON_XP_VALUE,
    rewardGold: 0,
    rewardLevelUps: 0,
    isElite: false,
    isMiniboss: false,
    isBoss: false,
  };
}

export function getBossPhasePressureState(options: {
  stagePhase: StagePhase;
  bossPhase: BossPhase;
  bossActive: boolean;
}): BossSummonPressureState {
  return options.stagePhase === 'boss' && options.bossPhase === 2 && options.bossActive
    ? 'phase2-summons'
    : 'inactive';
}
