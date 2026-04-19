import type Phaser from 'phaser';
import { getCombatResponseTuningSnapshot, type CombatResponseTuningSnapshot } from '../combat/combatResponse';
import type { EnemyArchetypeId } from '../data/enemies';
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
  elapsedMs: number;
  hp: number;
  maxHp: number;
  level: number;
  kills: number;
  weaponCount: number;
  goldEarned: number;
  levelUpActive: boolean;
  endActive: boolean;
  victory: boolean;
  endTitle: string;
  weaponNames: string[];
  player: {
    x: number;
    y: number;
    moveSpeed: number;
    pickupRange: number;
  };
  enemies: GameplayBotEnemySummary[];
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
