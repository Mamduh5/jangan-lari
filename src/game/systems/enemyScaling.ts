import {
  ENEMY_ACTIVE_CAP,
  ENEMY_SCALING_DAMAGE_PER_STACK,
  ENEMY_SCALING_HP_PER_STACK,
  ENEMY_SCALING_INTERVAL_MS,
  ENEMY_SCALING_MAJOR_ENCOUNTER_FACTOR,
  ENEMY_SCALING_MAX_STACK,
  ENEMY_SCALING_SPEED_PER_STACK,
} from '../config/constants';
import type { EnemyArchetype } from '../data/enemies';

export type EnemyScalingMultipliers = {
  hp: number;
  speed: number;
  damage: number;
  projectileCooldown: number;
  projectileSpeed: number;
};

export type EnemyScalingSnapshot = {
  stack: number;
  maxStack: number;
  intervalMs: number;
  multipliers: EnemyScalingMultipliers;
};

export function getEnemyScalingStack(elapsedMs: number): number {
  const rawStack = Math.floor(Math.max(0, elapsedMs) / ENEMY_SCALING_INTERVAL_MS);
  return Math.min(ENEMY_SCALING_MAX_STACK, rawStack);
}

export function getEnemyScalingMultipliers(stack: number, majorEncounterFactor = 1): EnemyScalingMultipliers {
  const effectiveStack = Math.max(0, Math.min(ENEMY_SCALING_MAX_STACK, stack)) * majorEncounterFactor;

  return {
    hp: 1 + effectiveStack * ENEMY_SCALING_HP_PER_STACK,
    speed: 1 + effectiveStack * ENEMY_SCALING_SPEED_PER_STACK,
    damage: 1 + effectiveStack * ENEMY_SCALING_DAMAGE_PER_STACK,
    projectileCooldown: Math.max(0.82, 1 - effectiveStack * 0.025),
    projectileSpeed: 1 + effectiveStack * 0.025,
  };
}

export function getEnemyScalingSnapshot(elapsedMs: number): EnemyScalingSnapshot {
  const stack = getEnemyScalingStack(elapsedMs);

  return {
    stack,
    maxStack: ENEMY_SCALING_MAX_STACK,
    intervalMs: ENEMY_SCALING_INTERVAL_MS,
    multipliers: getEnemyScalingMultipliers(stack),
  };
}

export function getEnemyMajorEncounterFactor(archetype: EnemyArchetype): number {
  return archetype.isElite || archetype.isMiniboss || archetype.isBoss ? ENEMY_SCALING_MAJOR_ENCOUNTER_FACTOR : 1;
}

export function applyEnemyScaling(archetype: EnemyArchetype, elapsedMs: number): EnemyArchetype {
  const stack = getEnemyScalingStack(elapsedMs);
  if (stack <= 0) {
    return archetype;
  }

  const multipliers = getEnemyScalingMultipliers(stack, getEnemyMajorEncounterFactor(archetype));

  return {
    ...archetype,
    maxHealth: Math.max(1, Math.round(archetype.maxHealth * multipliers.hp)),
    speed: Math.max(1, Math.round(archetype.speed * multipliers.speed)),
    contactDamage: Math.max(1, Math.round(archetype.contactDamage * multipliers.damage)),
    shotDamage:
      archetype.shotDamage === undefined ? undefined : Math.max(1, Math.round(archetype.shotDamage * multipliers.damage)),
    shotSpeed:
      archetype.shotSpeed === undefined ? undefined : Math.max(1, Math.round(archetype.shotSpeed * multipliers.projectileSpeed)),
    shotCooldownMs:
      archetype.shotCooldownMs === undefined
        ? undefined
        : Math.max(850, Math.round(archetype.shotCooldownMs * multipliers.projectileCooldown)),
  };
}

export function getAvailableEnemySpawnSlots(activeEnemyCount: number, activeCap = ENEMY_ACTIVE_CAP): number {
  return Math.max(0, activeCap - Math.max(0, activeEnemyCount));
}
