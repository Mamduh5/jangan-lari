import type { WeaponId } from '../data/weapons';

export const PLAYER_PROJECTILE_VISUAL_SCALE_MULTIPLIER = 2.4;
export const ENEMY_PROJECTILE_VISUAL_SCALE_MULTIPLIER = 2.2;
export const PROJECTILE_VISUAL_MIN_DIAMETER = 28;
export const PROJECTILE_VISUAL_MAX_DIAMETER = 68;

export const PLAYER_PROJECTILE_VISUAL_SCALE_BY_WEAPON: Partial<Record<WeaponId, number>> = {
  'arc-bolt': 2.55,
  'twin-fangs':  2.55,
  'ember-lance': 2.3,
  'bloom-cannon': 2.2,
  'phase-disc': 2.2,
  sunwheel: 2.7,
  shatterbell: 2.25,
};

export function resolvePlayerProjectileVisualDiameter(weaponId: WeaponId, gameplayRadius: number): number {
  const multiplier = PLAYER_PROJECTILE_VISUAL_SCALE_BY_WEAPON[weaponId] ?? PLAYER_PROJECTILE_VISUAL_SCALE_MULTIPLIER;
  return clampProjectileVisualDiameter(gameplayRadius * 2 * multiplier);
}

export function resolveEnemyProjectileVisualDiameter(gameplayRadius: number): number {
  return clampProjectileVisualDiameter(gameplayRadius * 2 * ENEMY_PROJECTILE_VISUAL_SCALE_MULTIPLIER);
}

function clampProjectileVisualDiameter(diameter: number): number {
  return Math.round(Math.min(PROJECTILE_VISUAL_MAX_DIAMETER, Math.max(PROJECTILE_VISUAL_MIN_DIAMETER, diameter)));
}
