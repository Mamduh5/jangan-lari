import type { GameplayBotRunSnapshot } from '../../src/game/debug/gameplaySnapshot';
import { mapGameplayRunSnapshotToSimulationSnapshot } from '../../src/game/debug/gameplaySnapshotMapper';

function createRunSnapshot(overrides: Partial<GameplayBotRunSnapshot> = {}): GameplayBotRunSnapshot {
  return {
    elapsedMs: 2500,
    hp: 84,
    maxHp: 100,
    level: 3,
    xp: 12,
    xpNext: 35,
    kills: 2,
    weaponCount: 1,
    goldEarned: 4,
    totalGold: 24,
    score: 178,
    bestScore: 300,
    finalScore: 0,
    newBestScore: false,
    localLeaderboardEntryCount: 2,
    neutralShapesDestroyed: 5,
    primaryWeapon: {
      id: 'arc-bolt',
      damage: 12,
      fireCooldownMs: 520,
      projectileSpeed: 520,
      range: 320,
      burstCount: 1,
      spreadDegrees: 0,
      latestProjectileDirection: { x: 1, y: 0 },
    },
    levelUpActive: false,
    endActive: false,
    victory: false,
    endTitle: '',
    weaponNames: ['Arc Bolt'],
    player: {
      x: 640,
      y: 480,
      facingX: 1,
      facingY: 0,
      moveSpeed: 240,
      pickupRange: 76,
    },
    input: {
      movement: { x: 0, y: 0 },
      aim: { x: 1, y: 0 },
      aimActive: false,
      aimSource: 'idle',
      movementSource: 'idle',
      hasExplicitAim: false,
    },
    tankStats: {
      availablePoints: 1,
      levels: {
        bulletDamage: 1,
        reload: 0,
        moveSpeed: 2,
        maxHealth: 0,
      },
      effects: {
        bulletDamageBonus: 2,
        fireCooldownReductionMs: 0,
        moveSpeedBonus: 20,
        maxHealthBonus: 0,
      },
    },
    tankClass: {
      id: 'twin',
      title: 'Twin',
      description: 'Two-shot spread for close shape farming.',
    },
    classChoice: {
      available: false,
      active: false,
      choices: [],
    },
    enemies: [
      {
        id: 'skimmer',
        x: 700,
        y: 520,
        distance: 72,
        contactDamage: 8,
        isElite: false,
        isBoss: false,
        isEventTarget: true,
      },
    ],
    neutralShapeCount: 1,
    neutralShapes: [
      {
        kind: 'square',
        x: 500,
        y: 460,
        distance: 150,
        hp: 10,
        maxHp: 18,
        xpValue: 5,
      },
    ],
    xpGems: [],
    upgradeChoices: [],
    camera: {
      scrollX: -160,
      scrollY: 120,
      playerScreenX: 800,
      playerScreenY: 360,
      overscrollPaddingX: 800,
      overscrollPaddingY: 360,
    },
    spawnSafety: {
      enemySafeRadius: 360,
      eliteSafeRadius: 480,
      bossSafeRadius: 620,
      nearestEnemyDistance: 72,
    },
    waveTemplate: {
      id: 'steady',
      label: 'Steady',
      highlight: false,
    },
    event: {
      active: false,
      type: '',
      title: '',
      objective: '',
      remainingMs: 0,
      challengeWaveSuccesses: 0,
      challengeWaveFailures: 0,
      rewardTargetSuccesses: 0,
      rewardTargetFailures: 0,
    },
    combatResponse: {
      hitStopStarts: 0,
      hitStopRefreshes: 0,
      hitStopSuppressions: 0,
      hitStopActive: false,
      weaponImpactCounts: {},
      enemyImpactCounts: {},
    },
    ...overrides,
  };
}

describe('gameplay snapshot mapper', () => {
  test('projects the debug run snapshot into a pure simulation snapshot', () => {
    const snapshot = mapGameplayRunSnapshotToSimulationSnapshot(createRunSnapshot(), 42);

    expect(snapshot).toMatchObject({
      schemaVersion: 1,
      tick: 42,
      elapsedMs: 2500,
      ended: false,
      player: {
        id: 'local-player',
        kind: 'player',
        position: { x: 640, y: 480 },
        hp: 84,
        maxHp: 100,
        level: 3,
      },
      tankClass: {
        id: 'twin',
        title: 'Twin',
      },
      score: {
        current: 178,
        bestLocal: 300,
        localLeaderboardEntryCount: 2,
      },
      sourceCompleteness: {
        projectedFromDebugSnapshot: true,
        projectileStateAvailable: false,
      },
    });
    expect(snapshot.weapons).toEqual([{ id: 'arc-bolt', name: 'Arc Bolt' }]);
    expect(snapshot.enemies[0]).toMatchObject({
      id: 'enemy-0-skimmer',
      archetypeId: 'skimmer',
      isEventTarget: true,
    });
    expect(snapshot.neutralShapes[0]).toMatchObject({
      id: 'neutral-shape-0-square',
      shapeKind: 'square',
      hp: 10,
      xpValue: 5,
    });
    expect(snapshot.projectiles).toEqual([]);
  });

  test('uses elapsed time to derive a default observational tick', () => {
    const snapshot = mapGameplayRunSnapshotToSimulationSnapshot(createRunSnapshot({ elapsedMs: 1234 }));

    expect(snapshot.tick).toBe(24);
  });
});
