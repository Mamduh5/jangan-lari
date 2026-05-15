import type { EnemyArchetypeId } from '../data/enemies';
import type { TankClassId } from '../data/tankClasses';
import type { TankStatEffectSnapshot, TankStatId, TankStatLevels } from '../data/tankStats';
import type { WeaponId } from '../data/weapons';

export type Vector2Snapshot = {
  x: number;
  y: number;
};

export type PlayerInputState = {
  movement: Vector2Snapshot;
};

export type AimState =
  | {
      mode: 'direction';
      direction: Vector2Snapshot;
    }
  | {
      mode: 'target';
      target: Vector2Snapshot;
    };

export type ClientInputCommand = {
  sequence: number;
  clientTimeMs: number;
  input: PlayerInputState;
  aim: AimState;
  requestedAction?: {
    allocateStat?: TankStatId;
    selectClass?: TankClassId;
  };
};

export type EntitySnapshot = {
  id: string;
  kind: 'player' | 'enemy' | 'neutral-shape' | 'xp-gem';
  position: Vector2Snapshot;
  hp?: number;
  maxHp?: number;
};

export type ProjectileSnapshot = {
  id: string;
  weaponId: WeaponId;
  position: Vector2Snapshot;
  velocity: Vector2Snapshot;
  damage: number;
  remainingRange: number;
};

export type TankClassSnapshot = {
  id: TankClassId;
  title: string;
};

export type TankStatsSnapshot = {
  availablePoints: number;
  levels: TankStatLevels;
  effects: TankStatEffectSnapshot;
};

export type ScoreSnapshot = {
  current: number;
  bestLocal: number;
  final: number;
  isNewBest: boolean;
  localLeaderboardEntryCount: number;
};

export type SimulationSnapshot = {
  schemaVersion: 1;
  tick: number;
  elapsedMs: number;
  ended: boolean;
  player: EntitySnapshot & {
    kind: 'player';
    level: number;
    xp: number;
    xpNext: number;
    facing: Vector2Snapshot;
    moveSpeed: number;
    pickupRange: number;
  };
  tankClass: TankClassSnapshot;
  tankStats: TankStatsSnapshot;
  weapons: Array<{
    id: WeaponId | string;
    name: string;
  }>;
  enemies: Array<
    EntitySnapshot & {
      kind: 'enemy';
      archetypeId: EnemyArchetypeId;
      isElite: boolean;
      isBoss: boolean;
      isEventTarget: boolean;
    }
  >;
  neutralShapes: Array<
    EntitySnapshot & {
      kind: 'neutral-shape';
      shapeKind: string;
      xpValue: number;
    }
  >;
  projectiles: ProjectileSnapshot[];
  score: ScoreSnapshot;
  sourceCompleteness: {
    projectedFromDebugSnapshot: boolean;
    projectileStateAvailable: boolean;
  };
};
