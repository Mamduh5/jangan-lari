import type { WeaponStats } from '../data/weapons';
import type { ManualAttackCommand, ManualAttackPhase } from '../input/ManualAttackController';
import { normalizeMovementVector, type MovementVector } from '../input/MovementInputController';
import type {
  WeaponAttackCommand,
  WeaponAttackExecutionResult,
  WeaponTapTargetResolution,
} from './AutoFireWeapon';

export type AttackCapableWeapon = {
  getId(): string;
  getStats(): WeaponStats;
  isReadyToFire(currentTime: number): boolean;
  getCooldownRemainingMs(currentTime: number): number;
  findTapTargetDirection(): WeaponTapTargetResolution | null;
  executeAttackCommand(currentTime: number, command: WeaponAttackCommand): WeaponAttackExecutionResult;
};

export type ManualAttackDispatchResult = {
  commandId: number;
  kind: ManualAttackCommand['kind'];
  firedCount: number;
  firedWeaponIds: string[];
  blockedByCooldownCount: number;
  minCooldownRemainingMs: number;
  resolvedFacingDirection: MovementVector | null;
  targetKind: 'aimed' | 'enemy' | 'neutral' | 'fallback' | 'radial' | 'none';
  results: WeaponAttackExecutionResult[];
};

export type ManualAttackReadinessSummary = {
  ready: boolean;
  readyWeaponCount: number;
  totalWeaponCount: number;
  nextReadyCooldownMs: number;
  nextReadyCooldownTotalMs: number;
  primaryReadyRange: number;
  hasOnlyRadialReady: boolean;
};

export type ManualAttackHudState = {
  enabled: boolean;
  ready: boolean;
  readyWeaponCount: number;
  totalWeaponCount: number;
  nextReadyCooldownMs: number;
  nextReadyCooldownTotalMs: number;
  phase: ManualAttackPhase;
  aimDirection: MovementVector | null;
  knobOffset: MovementVector;
  cancelHighlighted: boolean;
  cooldownFeedbackMs: number;
};

const DEFAULT_FALLBACK_DIRECTION: MovementVector = { x: 1, y: 0 };

export function createIdleManualAttackHudState(enabled = false): ManualAttackHudState {
  return {
    enabled,
    ready: enabled,
    readyWeaponCount: 0,
    totalWeaponCount: 0,
    nextReadyCooldownMs: 0,
    nextReadyCooldownTotalMs: 1,
    phase: 'idle',
    aimDirection: null,
    knobOffset: { x: 0, y: 0 },
    cancelHighlighted: false,
    cooldownFeedbackMs: 0,
  };
}

export function summarizeManualAttackReadiness(
  weapons: readonly AttackCapableWeapon[],
  currentTime: number,
): ManualAttackReadinessSummary {
  const totalWeaponCount = weapons.length;
  let readyWeaponCount = 0;
  let nextReadyCooldownMs = Number.POSITIVE_INFINITY;
  let nextReadyCooldownTotalMs = 1;
  let primaryReadyRange = 0;
  let readyTargetedCount = 0;
  let readyRadialCount = 0;

  for (const weapon of weapons) {
    const stats = weapon.getStats();
    if (weapon.isReadyToFire(currentTime)) {
      readyWeaponCount += 1;
      if (stats.firePattern === 'radial') {
        readyRadialCount += 1;
      } else {
        readyTargetedCount += 1;
        primaryReadyRange = Math.max(primaryReadyRange, stats.range);
      }
      continue;
    }

    const remainingMs = weapon.getCooldownRemainingMs(currentTime);
    if (remainingMs < nextReadyCooldownMs) {
      nextReadyCooldownMs = remainingMs;
      nextReadyCooldownTotalMs = Math.max(1, stats.fireCooldownMs);
    }
  }

  const fallbackRange = weapons.reduce((best, weapon) => Math.max(best, weapon.getStats().range), 320);

  return {
    ready: readyWeaponCount > 0,
    readyWeaponCount,
    totalWeaponCount,
    nextReadyCooldownMs: readyWeaponCount > 0 || !Number.isFinite(nextReadyCooldownMs) ? 0 : nextReadyCooldownMs,
    nextReadyCooldownTotalMs: readyWeaponCount > 0 ? 1 : nextReadyCooldownTotalMs,
    primaryReadyRange: primaryReadyRange > 0 ? primaryReadyRange : fallbackRange,
    hasOnlyRadialReady: readyWeaponCount > 0 && readyTargetedCount === 0 && readyRadialCount > 0,
  };
}

export function dispatchManualAttackCommand(
  weapons: readonly AttackCapableWeapon[],
  currentTime: number,
  command: ManualAttackCommand,
  fallbackDirection: MovementVector,
): ManualAttackDispatchResult {
  const normalizedFallback = normalizeMovementVector(fallbackDirection);
  const safeFallback =
    normalizedFallback.x === 0 && normalizedFallback.y === 0 ? DEFAULT_FALLBACK_DIRECTION : normalizedFallback;

  if (command.kind === 'aimed') {
    const normalizedAim = command.direction ? normalizeMovementVector(command.direction) : { x: 0, y: 0 };
    if (normalizedAim.x === 0 && normalizedAim.y === 0) {
      return {
        commandId: command.id,
        kind: command.kind,
        firedCount: 0,
        firedWeaponIds: [],
        blockedByCooldownCount: 0,
        minCooldownRemainingMs: 0,
        resolvedFacingDirection: null,
        targetKind: 'none',
        results: [],
      };
    }

    return executeAcrossWeapons(weapons, currentTime, command, {
      kind: 'aimed',
      direction: normalizedAim,
      fallbackDirection: normalizedAim,
    });
  }

  // Tap command: resolve the highest-priority shared target across ready targeted weapons
  // (nearest enemy first, else nearest neutral shape) so multi-weapon tap volleys stay coherent.
  let bestEnemyTarget: WeaponTapTargetResolution | null = null;
  let bestNeutralTarget: WeaponTapTargetResolution | null = null;

  for (const weapon of weapons) {
    if (!weapon.isReadyToFire(currentTime)) {
      continue;
    }

    if (weapon.getStats().firePattern === 'radial') {
      continue;
    }

    const candidate = weapon.findTapTargetDirection();
    if (!candidate) {
      continue;
    }

    if (candidate.targetKind === 'enemy') {
      if (!bestEnemyTarget || candidate.distanceSq < bestEnemyTarget.distanceSq) {
        bestEnemyTarget = candidate;
      }
    } else if (!bestNeutralTarget || candidate.distanceSq < bestNeutralTarget.distanceSq) {
      bestNeutralTarget = candidate;
    }
  }

  const sharedTapTarget = bestEnemyTarget ?? bestNeutralTarget;
  return executeAcrossWeapons(weapons, currentTime, command, {
    kind: 'tap',
    direction: sharedTapTarget ? sharedTapTarget.direction : null,
    fallbackDirection: safeFallback,
  });
}

function executeAcrossWeapons(
  weapons: readonly AttackCapableWeapon[],
  currentTime: number,
  command: ManualAttackCommand,
  weaponCommand: WeaponAttackCommand,
): ManualAttackDispatchResult {
  const results: WeaponAttackExecutionResult[] = [];
  const firedWeaponIds: string[] = [];
  let blockedByCooldownCount = 0;
  let minCooldownRemainingMs = Number.POSITIVE_INFINITY;
  let resolvedFacingDirection: MovementVector | null = null;
  let primaryTargetKind: ManualAttackDispatchResult['targetKind'] = 'none';

  for (const weapon of weapons) {
    const result = weapon.executeAttackCommand(currentTime, weaponCommand);
    results.push(result);

    if (result.fired) {
      firedWeaponIds.push(result.weaponId);

      // Prefer a targeted weapon's resolved direction for player facing over radial fallback.
      if (result.resolvedDirection) {
        const shouldPreferDirection =
          resolvedFacingDirection === null ||
          (primaryTargetKind === 'radial' && result.targetKind !== 'radial');
        if (shouldPreferDirection) {
          resolvedFacingDirection = { ...result.resolvedDirection };
          primaryTargetKind = result.targetKind;
        }
      }
    } else if (result.reason === 'cooldown') {
      blockedByCooldownCount += 1;
      if (result.cooldownRemainingMs < minCooldownRemainingMs) {
        minCooldownRemainingMs = result.cooldownRemainingMs;
      }
    }
  }

  return {
    commandId: command.id,
    kind: command.kind,
    firedCount: firedWeaponIds.length,
    firedWeaponIds,
    blockedByCooldownCount,
    minCooldownRemainingMs: Number.isFinite(minCooldownRemainingMs) ? minCooldownRemainingMs : 0,
    resolvedFacingDirection,
    targetKind: primaryTargetKind,
    results,
  };
}
