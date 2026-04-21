import type Phaser from 'phaser';
import { getCombatResponseTuningSnapshot, type CombatResponseTuningSnapshot } from '../combat/combatResponse';
import type { AbilityId } from '../data/abilities';
import type { EnemyArchetypeId } from '../data/enemies';
import type { EvolutionId } from '../data/evolutions';
import type { RewardId, RewardLane } from '../data/rewards';
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
  isMarked?: boolean;
  isDisrupted?: boolean;
  isAilmented?: boolean;
};

export type GameplayBotGemSummary = {
  x: number;
  y: number;
  distance: number;
  value: number;
};

export type GameplayBotUpgradeChoice = {
  id: RewardId;
  title: string;
};

export type GameplayBotRewardChoice = {
  id: RewardId;
  title: string;
  lane: RewardLane;
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
  xp: number;
  xpNext: number;
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
    guard: number;
    maxGuard: number;
  };
  cooldowns: {
    primaryRemainingMs: number;
    signatureRemainingMs: number;
    supportRemainingMs: number;
  };
  markedEnemies: number;
  disruptedEnemies: number;
  ailmentedEnemies: number;
  markApplyCount: number;
  markConsumeCount: number;
  disruptedApplyCount: number;
  disruptedSignatureHitCount: number;
  ailmentApplyCount: number;
  ailmentConsumeCount: number;
  supportAbilityId: AbilityId | null;
  supportUseCount: number;
  evolutionId: EvolutionId | null;
  evolutionTitle: string;
  xpGemSpawnCount: number;
  xpGemCollectCount: number;
  bossActive: boolean;
  bossHp: number;
  bossMaxHp: number;
  bossProtectors: number;
  bossProtected: boolean;
  bossName: string;
  bossObjective: string;
  pressureBeat: {
    active: boolean;
    id: string;
    label: string;
    objective: string;
    remainingMs: number;
  };
  enemies: GameplayBotEnemySummary[];
  xpGems: GameplayBotGemSummary[];
  upgradeChoices: GameplayBotUpgradeChoice[];
  traits: string[];
  rewardChoices: GameplayBotRewardChoice[];
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
  hud?: {
    hpBarWidth: number;
    guardBarWidth: number;
    xpBarWidth: number;
    hpBarRatio: number;
    guardBarRatio: number;
    xpBarRatio: number;
    hpBarFrameDepth: number;
    hpBarFillDepth: number;
    guardBarFrameDepth: number;
    guardBarFillDepth: number;
    xpBarFrameDepth: number;
    xpBarFillDepth: number;
    hpText: string;
    guardText: string;
    xpText: string;
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
        if (run && scenes.uiActive) {
          const uiScene = game.scene.getScene('UIScene') as {
            getDebugHudSnapshot?: () => GameplayBotRunSnapshot['hud'];
          };
          run.hud = uiScene.getDebugHudSnapshot?.();
        }
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
