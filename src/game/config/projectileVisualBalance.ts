import type { WeaponId } from '../data/weapons';

export const PLAYER_PROJECTILE_VISUAL_SCALE_MULTIPLIER = 3.6;
export const ENEMY_PROJECTILE_VISUAL_SCALE_MULTIPLIER = 3.2;
export const PROJECTILE_VISUAL_MIN_DIAMETER = 42;
export const PROJECTILE_VISUAL_MAX_DIAMETER = 94;

export const PLAYER_PROJECTILE_VISUAL_SCALE_BY_WEAPON: Partial<Record<WeaponId, number>> = {
  'arc-bolt': 3.7,
  'twin-fangs': 4.0,
  'ember-lance': 3.9,
  'bloom-cannon': 3.6,
  'phase-disc': 3.5,
  sunwheel: 3.7,
  shatterbell: 3.8,
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
