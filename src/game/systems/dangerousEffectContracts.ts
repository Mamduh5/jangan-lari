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
  MINIBOSS_VOLLEY_COOLDOWN_MS,
  MINIBOSS_VOLLEY_DAMAGE,
  MINIBOSS_VOLLEY_PROJECTILE_COUNT,
  MINIBOSS_VOLLEY_PROJECTILE_RADIUS,
  MINIBOSS_VOLLEY_PROJECTILE_SPEED,
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
  telegraphLaneLength: number;
  cooldownMs: number;
  projectileCount: number;
  projectileDamageRadius: number;
  projectileVisualRadius: number;
  projectileSpeed: number;
  projectileDamage: number;
  spreadDegrees: number;
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
    telegraphLaneLength: MINIBOSS_VOLLEY_TELEGRAPH_LANE_LENGTH,
    cooldownMs: MINIBOSS_VOLLEY_COOLDOWN_MS,
    projectileCount: MINIBOSS_VOLLEY_PROJECTILE_COUNT,
    projectileDamageRadius: MINIBOSS_VOLLEY_PROJECTILE_RADIUS,
    projectileVisualRadius: MINIBOSS_VOLLEY_PROJECTILE_RADIUS,
    projectileSpeed: MINIBOSS_VOLLEY_PROJECTILE_SPEED,
    projectileDamage: MINIBOSS_VOLLEY_DAMAGE,
    spreadDegrees: MINIBOSS_VOLLEY_SPREAD_DEGREES,
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

export function minibossVolleyProjectileDamageAndVisualMatch(contract: MinibossVolleyContract): boolean {
  return (
    contract.projectileCount > 0 &&
    contract.projectileDamageRadius > 0 &&
    contract.projectileDamageRadius === contract.projectileVisualRadius &&
    contract.projectileSpeed > 0
  );
}
