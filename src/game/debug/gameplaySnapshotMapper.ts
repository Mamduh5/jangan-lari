import type { GameplayBotRunSnapshot } from './gameplaySnapshot';
import type { SimulationSnapshot } from '../simulation/simulationTypes';

export function mapGameplayRunSnapshotToSimulationSnapshot(
  run: GameplayBotRunSnapshot,
  tick = Math.floor(run.elapsedMs / 50),
): SimulationSnapshot {
  return {
    schemaVersion: 1,
    tick,
    elapsedMs: run.elapsedMs,
    ended: run.endActive,
    player: {
      id: 'local-player',
      kind: 'player',
      position: {
        x: run.player.x,
        y: run.player.y,
      },
      hp: run.hp,
      maxHp: run.maxHp,
      level: run.level,
      xp: run.xp,
      xpNext: run.xpNext,
      facing: {
        x: run.player.facingX,
        y: run.player.facingY,
      },
      moveSpeed: run.player.moveSpeed,
      pickupRange: run.player.pickupRange,
    },
    tankClass: {
      id: run.tankClass.id,
      title: run.tankClass.title,
    },
    tankStats: {
      availablePoints: run.tankStats.availablePoints,
      levels: run.tankStats.levels,
      effects: run.tankStats.effects,
    },
    weapons: run.weaponNames.map((name, index) => ({
      id: index === 0 && run.primaryWeapon ? run.primaryWeapon.id : name,
      name,
    })),
    enemies: run.enemies.map((enemy, index) => ({
      id: `enemy-${index}-${enemy.id}`,
      kind: 'enemy',
      archetypeId: enemy.id,
      position: {
        x: enemy.x,
        y: enemy.y,
      },
      hp: undefined,
      maxHp: undefined,
      isElite: enemy.isElite,
      isBoss: enemy.isBoss,
      isEventTarget: enemy.isEventTarget,
    })),
    neutralShapes: run.neutralShapes.map((shape, index) => ({
      id: `neutral-shape-${index}-${shape.kind}`,
      kind: 'neutral-shape',
      shapeKind: shape.kind,
      position: {
        x: shape.x,
        y: shape.y,
      },
      hp: shape.hp,
      maxHp: shape.maxHp,
      xpValue: shape.xpValue,
    })),
    projectiles: [],
    score: {
      current: run.score,
      bestLocal: run.bestScore,
      final: run.finalScore,
      isNewBest: run.newBestScore,
      localLeaderboardEntryCount: run.localLeaderboardEntryCount,
    },
    sourceCompleteness: {
      projectedFromDebugSnapshot: true,
      projectileStateAvailable: false,
    },
  };
}
