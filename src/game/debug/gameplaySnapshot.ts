import type Phaser from 'phaser';
import type { UpgradeId } from '../data/upgrades';

export type GameplayBotEnemySummary = {
  x: number;
  y: number;
  distance: number;
  contactDamage: number;
  isElite: boolean;
  isBoss: boolean;
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

export type GameplayBotRunSnapshot = {
  elapsedMs: number;
  targetMs: number;
  hp: number;
  maxHp: number;
  level: number;
  kills: number;
  weaponCount: number;
  goldEarned: number;
  totalGold: number;
  instructions: string;
  levelUpActive: boolean;
  levelUpRemainingMs: number;
  endActive: boolean;
  victory: boolean;
  endTitle: string;
  player: {
    x: number;
    y: number;
    moveSpeed: number;
    pickupRange: number;
  };
  enemies: GameplayBotEnemySummary[];
  xpGems: GameplayBotGemSummary[];
  upgradeChoices: GameplayBotUpgradeChoice[];
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
  };
}
