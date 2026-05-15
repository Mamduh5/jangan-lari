import type Phaser from 'phaser';
import { getCombatResponseTuningSnapshot, type CombatResponseTuningSnapshot } from '../combat/combatResponse';
import type { EnemyArchetypeId } from '../data/enemies';
import type { PointerGuideState } from '../input/MovementInputController';
import type { ControlGuideMode } from '../save/saveData';
import type { TankClassId } from '../data/tankClasses';
import type { TankStatEffectSnapshot, TankStatLevels } from '../data/tankStats';
import type { UpgradeId } from '../data/upgrades';
import type { WeaponId } from '../data/weapons';

export type GameplayBotEnemySummary = {
  id: EnemyArchetypeId;
  x: number;
  y: number;
  distance: number;
  contactDamage: number;
  isElite: boolean;
  isBoss: boolean;
  isEventTarget: boolean;
};

export type GameplayBotGemSummary = {
  x: number;
  y: number;
  distance: number;
  value: number;
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
};

export type GameplayBotEventSnapshot = {
  active: boolean;
  type: 'challenge-wave' | 'reward-target' | '';
  title: string;
  objective: string;
  remainingMs: number;
  challengeWaveSuccesses: number;
  challengeWaveFailures: number;
  rewardTargetSuccesses: number;
  rewardTargetFailures: number;
};

export type GameplayBotRunSnapshot = {
  config: {
    gameWidth: number;
    gameHeight: number;
    scaleMode: 'FIT';
  };
  elapsedMs: number;
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
  upgradeChoices: GameplayBotUpgradeChoice[];
  waveTemplate: {
    id: string;
    label: string;
    highlight: boolean;
  };
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
  uiActive: boolean;
};

export type GameplayBotSnapshot = {
  timestampMs: number;
  scenes: GameplayBotSceneSnapshot;
  run: GameplayBotRunSnapshot | null;
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
        uiActive: game.scene.isActive('UIScene'),
      };

      let run: GameplayBotRunSnapshot | null = null;
      if (scenes.runActive) {
        const runScene = game.scene.getScene('RunScene') as {
          getGameplayBotSnapshot?: () => GameplayBotRunSnapshot;
        };
        run = runScene.getGameplayBotSnapshot?.() ?? null;
      }

      return {
        timestampMs: game.loop.time,
        scenes,
        run,
      };
    },
    getCombatResponseTuning: () => getCombatResponseTuningSnapshot(),
  };
}
