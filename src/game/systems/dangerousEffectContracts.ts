import {
  BOSS_PHASE_TWO_ATTACK_INTERVAL_MULTIPLIER,
  BOSS_PHASE_TWO_DAMAGE_MULTIPLIER,
  BOSS_PHASE_TWO_SHOCKWAVE_RADIUS_MULTIPLIER,
  BOSS_SHOCKWAVE_COOLDOWN_MAX_MS,
  BOSS_SHOCKWAVE_COOLDOWN_MIN_MS,
  BOSS_SHOCKWAVE_DAMAGE_ACTIVE_MS,
  BOSS_SHOCKWAVE_RADIUS,
  BOSS_SHOCKWAVE_TELEGRAPH_MS,
  BOSS_SHOCKWAVE_THICKNESS,
  MINIBOSS_LINE_STRIKE_DAMAGE_ACTIVE_MS,
  MINIBOSS_LINE_STRIKE_LENGTH,
  MINIBOSS_LINE_STRIKE_TELEGRAPH_MS,
  MINIBOSS_LINE_STRIKE_WIDTH,
  MINIBOSS_VOLLEY_ACTIVE_MS,
  MINIBOSS_VOLLEY_COOLDOWN_MS,
  MINIBOSS_VOLLEY_DAMAGE,
  MINIBOSS_VOLLEY_LANE_DAMAGE_WIDTH,
  MINIBOSS_VOLLEY_LANE_VISUAL_WIDTH,
  MINIBOSS_VOLLEY_PROJECTILE_COUNT,
  MINIBOSS_VOLLEY_SPREAD_DEGREES,
  MINIBOSS_VOLLEY_TELEGRAPH_LANE_LENGTH,
  MINIBOSS_VOLLEY_TELEGRAPH_MS,
} from '../config/constants';

export type LineAttackEffectContract = {
  kind: 'miniboss-line-strike';
  length: number;
  damageWidth: number;
  visualWidth: number;
  halfWidth: number;
  telegraphMs: number;
  damageActiveMs: number;
  activeVisualMs: number;
};

export type BossShockwaveContract = {
  kind: 'boss-shockwave';
  phase: 1 | 2;
  radius: number;
  damageRadius: number;
  visualRadius: number;
  thickness: number;
  telegraphMs: number;
  damageActiveMs: number;
  activeVisualMs: number;
  damageMultiplier: number;
  cooldownMinMs: number;
  cooldownMaxMs: number;
};

export type MinibossVolleyContract = {
  kind: 'miniboss-volley';
  telegraphMs: number;
  activeMs: number;
  laneLength: number;
  laneCount: number;
  laneDamageWidth: number;
  laneVisualWidth: number;
  laneHalfWidth: number;
  spreadDegrees: number;
  damage: number;
  cooldownMs: number;
};

export function createMinibossLineAttackContract(length = MINIBOSS_LINE_STRIKE_LENGTH): LineAttackEffectContract {
  const safeLength = Math.max(1, Math.floor(length));
  const width = MINIBOSS_LINE_STRIKE_WIDTH;

  return {
    kind: 'miniboss-line-strike',
    length: safeLength,
    damageWidth: width,
    visualWidth: width,
    halfWidth: width / 2,
    telegraphMs: MINIBOSS_LINE_STRIKE_TELEGRAPH_MS,
    damageActiveMs: MINIBOSS_LINE_STRIKE_DAMAGE_ACTIVE_MS,
    activeVisualMs: MINIBOSS_LINE_STRIKE_DAMAGE_ACTIVE_MS,
  };
}

export function createBossShockwaveContract(phase: 1 | 2 = 1): BossShockwaveContract {
  const phaseTwo = phase === 2;
  const radius = Math.round(BOSS_SHOCKWAVE_RADIUS * (phaseTwo ? BOSS_PHASE_TWO_SHOCKWAVE_RADIUS_MULTIPLIER : 1));
  const cooldownMultiplier = phaseTwo ? BOSS_PHASE_TWO_ATTACK_INTERVAL_MULTIPLIER : 1;

  return {
    kind: 'boss-shockwave',
    phase,
    radius,
    damageRadius: radius,
    visualRadius: radius,
    thickness: BOSS_SHOCKWAVE_THICKNESS,
    telegraphMs: BOSS_SHOCKWAVE_TELEGRAPH_MS,
    damageActiveMs: BOSS_SHOCKWAVE_DAMAGE_ACTIVE_MS,
    activeVisualMs: BOSS_SHOCKWAVE_DAMAGE_ACTIVE_MS,
    damageMultiplier: phaseTwo ? BOSS_PHASE_TWO_DAMAGE_MULTIPLIER : 1,
    cooldownMinMs: Math.round(BOSS_SHOCKWAVE_COOLDOWN_MIN_MS * cooldownMultiplier),
    cooldownMaxMs: Math.round(BOSS_SHOCKWAVE_COOLDOWN_MAX_MS * cooldownMultiplier),
  };
}

export function createMinibossVolleyContract(): MinibossVolleyContract {
  return {
    kind: 'miniboss-volley',
    telegraphMs: MINIBOSS_VOLLEY_TELEGRAPH_MS,
    activeMs: MINIBOSS_VOLLEY_ACTIVE_MS,
    laneLength: MINIBOSS_VOLLEY_TELEGRAPH_LANE_LENGTH,
    laneCount: MINIBOSS_VOLLEY_PROJECTILE_COUNT,
    laneDamageWidth: MINIBOSS_VOLLEY_LANE_DAMAGE_WIDTH,
    laneVisualWidth: MINIBOSS_VOLLEY_LANE_VISUAL_WIDTH,
    laneHalfWidth: MINIBOSS_VOLLEY_LANE_DAMAGE_WIDTH / 2,
    spreadDegrees: MINIBOSS_VOLLEY_SPREAD_DEGREES,
    damage: MINIBOSS_VOLLEY_DAMAGE,
    cooldownMs: MINIBOSS_VOLLEY_COOLDOWN_MS,
  };
}

export function lineAttackDamageAndVisualMatch(contract: LineAttackEffectContract): boolean {
  return (
    contract.length > 0 &&
    contract.damageWidth === contract.visualWidth &&
    contract.halfWidth * 2 === contract.damageWidth &&
    contract.activeVisualMs === contract.damageActiveMs
  );
}

export function bossShockwaveDamageAndVisualMatch(contract: BossShockwaveContract): boolean {
  return (
    contract.radius > 0 &&
    contract.damageRadius === contract.visualRadius &&
    contract.activeVisualMs === contract.damageActiveMs &&
    contract.thickness > 0
  );
}

export function minibossVolleyLaneDamageAndVisualMatch(contract: MinibossVolleyContract): boolean {
  return (
    contract.laneCount > 0 &&
    contract.laneDamageWidth > 0 &&
    contract.laneLength > 0 &&
    contract.laneHalfWidth * 2 === contract.laneDamageWidth &&
    contract.activeMs > 0
  );
}
