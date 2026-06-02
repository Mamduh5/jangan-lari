import type Phaser from 'phaser';
import { getCombatResponseTuningSnapshot, type CombatResponseTuningSnapshot } from '../combat/combatResponse';
import type { EnemyArchetypeId, EnemyBehavior } from '../data/enemies';
import type { PointerGuideState } from '../input/MovementInputController';
import type { ControlGuideMode } from '../save/saveData';
import type { TankClassId } from '../data/tankClasses';
import type { TankStatEffectSnapshot, TankStatLevels } from '../data/tankStats';
import type { UpgradeId } from '../data/upgrades';
import type { UpgradeRewardType } from '../systems/rewardClassification';
import type { WeaponId } from '../data/weapons';
import type { StagePhase, StageVictoryCondition } from '../utils/stagePhase';
import type { RoyaleSnapshot } from '../royale/RoyaleScene';

export type GameplayBotEnemySummary = {
  id: EnemyArchetypeId;
  x: number;
  y: number;
  distance: number;
  hp: number;
  maxHp: number;
  moveSpeed: number;
  contactDamage: number;
  shotDamage: number | null;
  shotCooldownMs: number | null;
  shotSpeed: number | null;
  scalingStack: number;
  behavior: EnemyBehavior;
  behaviorState: string;
  xpValue: number;
  isRanged: boolean;
  hasRangedWeapon: boolean;
  isElite: boolean;
  isBoss: boolean;
  isBossOwned: boolean;
  isEventTarget: boolean;
  isPriorityThreat: boolean;
  isBlockingRoute: boolean;
};

export type GameplayBotGemSummary = {
  x: number;
  y: number;
  distance: number;
  value: number;
  tier: 'small' | 'medium' | 'large' | 'huge';
  fillColor: number;
  strokeColor: number;
  glowColor: number;
};

export type GameplayBotNeutralShapeSummary = {
  kind: string;
  x: number;
  y: number;
  distance: number;
  hp: number;
  maxHp: number;
  xpValue: number;
};

export type GameplayBotUpgradeChoice = {
  id: UpgradeId;
  title: string;
  rewardType: UpgradeRewardType;
  hasWeaponTag: boolean;
};

export type GameplayBotEnemyProjectileSummary = {
  x: number;
  y: number;
  radius: number;
  owner: 'enemy';
  fillColor: number;
  strokeColor: number;
  dangerColor: number | null;
  containsRed: boolean;
};

export type GameplayBotEnemyAttackSummary = {
  kind: 'miniboss-line-strike' | 'miniboss-volley' | 'boss-shockwave';
  phase: 'warning' | 'active';
  warningOnly: boolean;
  damageRange: number;
  visualRange: number;
  damageWidth: number | null;
  visualWidth: number | null;
  damageRadius: number | null;
  visualRadius: number | null;
  damageActive: boolean;
  effectActive: boolean;
  remainingMs: number;
};

export type GameplayBotEventSnapshot = {
  active: boolean;
  type: 'challenge-wave' | 'reward-target' | 'buff-shrine' | '';
  title: string;
  objective: string;
  remainingMs: number;
  x: number | null;
  y: number | null;
  claimRadius: number | null;
  buffType: string;
  buffRemainingMs: number;
  challengeWaveSuccesses: number;
  challengeWaveFailures: number;
  rewardTargetSuccesses: number;
  rewardTargetFailures: number;
  buffShrineSuccesses: number;
  buffShrineFailures: number;
};

export type GameplayBotFormationSnapshot = {
  enabled: boolean;
  active: boolean;
  lastFormationType: 'ring-breakout' | 'pincer' | 'sweep-wall' | '';
  cooldownMs: number;
  spawnCount: number;
  waveCount: number;
  spawnPoints: Array<{
    x: number;
    y: number;
    distanceFromPlayer: number;
    angle: number;
  }>;
};

export type GameplayBotDangerZoneSnapshot = {
  enabled: boolean;
  activeCount: number;
  warningCount: number;
  damageActiveCount: number;
  cooldownMs: number;
  spawnCount: number;
  lastPhase: 'warning' | 'active' | '';
  zones: Array<{
    x: number;
    y: number;
    radius: number;
    phase: 'warning' | 'active';
    elapsedMs: number;
    remainingMs: number;
    damage: number;
  }>;
};

export type GameplayBotActiveAbilitySnapshot = {
  label: string;
  ready: boolean;
  cooldownMs: number;
  cooldownTotalMs: number;
  protectionRemainingMs: number;
  activationCount: number;
  radius: number;
};

export type GameplayBotRunSnapshot = {
  config: {
    gameWidth: number;
    gameHeight: number;
    scaleMode: 'FIT';
  };
  stagePhase: StagePhase;
  elapsedMs: number;
  bossSpawnTimeMs: number;
  bossActive: boolean;
  bossHp: number | null;
  bossMaxHp: number | null;
  bossPhase: 1 | 2;
  bossPhaseTwoTriggered: boolean;
  bossSummonActiveCount: number;
  bossSummonCap: number;
  bossTargetFastKillMs: number;
  bossOwnedEnemyCount: number;
  bossPhasePressure: string;
  bossFightState: string;
  bossStateRemainingMs: number;
  activeBossSkill: string;
  bossSkillTelegraphActive: boolean;
  bossSkillDamageActive: boolean;
  activeMinibossSkill: string;
  eventEnemyMultiplier: number;
  normalSpawnsSuppressed: boolean;
  victoryCondition: StageVictoryCondition;
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  xpNext: number;
  kills: number;
  weaponCount: number;
  goldEarned: number;
  totalGold: number;
  score: number;
  bestScore: number;
  finalScore: number;
  newBestScore: boolean;
  localLeaderboardEntryCount: number;
  neutralShapesDestroyed: number;
  primaryWeapon: {
    id: WeaponId;
    damage: number;
    fireCooldownMs: number;
    projectileSpeed: number;
    range: number;
    burstCount: number;
    spreadDegrees: number;
    latestProjectileDirection: {
      x: number;
      y: number;
    };
  } | null;
  levelUpActive: boolean;
  levelUpChoiceCount: number;
  upgradePoolExhausted: boolean;
  rewardText: string;
  endActive: boolean;
  victory: boolean;
  endTitle: string;
  weaponNames: string[];
  player: {
    x: number;
    y: number;
    facingX: number;
    facingY: number;
    moveSpeed: number;
    pickupRange: number;
  };
  input: {
    movement: {
      x: number;
      y: number;
    };
    aim: {
      x: number;
      y: number;
    };
    aimActive: boolean;
    aimSource: 'pointer' | 'movement' | 'idle';
    movementSource: 'keyboard' | 'pointer' | 'idle';
    hasExplicitAim: boolean;
    suppressed: boolean;
    movementPointerActive: boolean;
    aimPointerActive: boolean;
  };
  controlGuideMode: ControlGuideMode;
  controlHintVisible: boolean;
  controlJoysticks: PointerGuideState;
  tankStats: {
    availablePoints: number;
    canSpend: boolean;
    statsMaxed: boolean;
    levels: TankStatLevels;
    effects: TankStatEffectSnapshot;
    effectiveHpRegenPerSecond: number;
    metaHpRegenPerSecond: number;
    runHpRegenPerSecond: number;
    hpRegenActive: boolean;
  };
  tankClass: {
    id: TankClassId;
    title: string;
    description: string;
  };
  classChoice: {
    available: boolean;
    active: boolean;
    choices: Array<{
      id: TankClassId;
      title: string;
      description: string;
    }>;
  };
  enemies: GameplayBotEnemySummary[];
  neutralShapeCount: number;
  neutralShapes: GameplayBotNeutralShapeSummary[];
  xpGems: GameplayBotGemSummary[];
  enemyProjectiles: GameplayBotEnemyProjectileSummary[];
  enemyAttacks: GameplayBotEnemyAttackSummary[];
  upgradeChoices: GameplayBotUpgradeChoice[];
  camera: {
    scrollX: number;
    scrollY: number;
    playerScreenX: number;
    playerScreenY: number;
    overscrollPaddingX: number;
    overscrollPaddingY: number;
  };
  spawnSafety: {
    enemySafeRadius: number;
    eliteSafeRadius: number;
    bossSafeRadius: number;
    nearestEnemyDistance: number | null;
  };
  enemyPopulation: {
    activeCount: number;
    activeCap: number;
    normalSpawnSlots: number;
    enemyEnemyPhysicalCollision: boolean;
  };
  enemyScaling: {
    stack: number;
    maxStack: number;
    intervalMs: number;
    multipliers: {
      hp: number;
      speed: number;
      damage: number;
      projectileCooldown: number;
      projectileSpeed: number;
    };
  };
  waveTemplate: {
    id: string;
    label: string;
    highlight: boolean;
  };
  formationPressure: GameplayBotFormationSnapshot;
  dangerZones: GameplayBotDangerZoneSnapshot;
  activeAbility: GameplayBotActiveAbilitySnapshot;
  event: GameplayBotEventSnapshot;
  combatResponse: {
    hitStopStarts: number;
    hitStopRefreshes: number;
    hitStopSuppressions: number;
    hitStopActive: boolean;
    weaponImpactCounts: Partial<Record<WeaponId, number>>;
    enemyImpactCounts: Partial<Record<EnemyArchetypeId, number>>;
  };
};

export type GameplayBotSceneSnapshot = {
  menuActive: boolean;
  metaActive: boolean;
  runActive: boolean;
  royaleActive: boolean;
  uiActive: boolean;
};

export type GameplayBotSnapshot = {
  timestampMs: number;
  scenes: GameplayBotSceneSnapshot;
  run: GameplayBotRunSnapshot | null;
  royale: RoyaleSnapshot | null;
};

export type GameplayDebugHandle = {
  getGameplaySnapshot: () => GameplayBotSnapshot;
  getCombatResponseTuning: () => CombatResponseTuningSnapshot;
};

export function createGameplayDebugHandle(game: Phaser.Game): GameplayDebugHandle {
  return {
    getGameplaySnapshot: () => {
      const scenes: GameplayBotSceneSnapshot = {
        menuActive: game.scene.isActive('MenuScene'),
        metaActive: game.scene.isActive('MetaScene'),
        runActive: game.scene.isActive('RunScene'),
        royaleActive: game.scene.isActive('RoyaleScene'),
        uiActive: game.scene.isActive('UIScene'),
      };

      let run: GameplayBotRunSnapshot | null = null;
      if (scenes.runActive) {
        const runScene = game.scene.getScene('RunScene') as {
          getGameplayBotSnapshot?: () => GameplayBotRunSnapshot;
        };
        run = runScene.getGameplayBotSnapshot?.() ?? null;
      }
      let royale: RoyaleSnapshot | null = null;
      if (scenes.royaleActive) {
        const royaleScene = game.scene.getScene('RoyaleScene') as {
          getRoyaleSnapshot?: () => RoyaleSnapshot;
        };
        royale = royaleScene.getRoyaleSnapshot?.() ?? null;
      }

      return {
        timestampMs: game.loop.time,
        scenes,
        run,
        royale,
      };
    },
    getCombatResponseTuning: () => getCombatResponseTuningSnapshot(),
  };
}
