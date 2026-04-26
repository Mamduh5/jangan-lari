import Phaser from 'phaser';
import {
  BOSS_TRIGGER_TIME_MS,
  ENEMY_SPAWN_INTERVAL_MS,
  GAME_WIDTH,
  RUN_TARGET_DURATION_MS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../config/constants';
import { getAbilityDefinition } from '../data/abilities';
import { ENEMY_ARCHETYPES, type EnemyArchetype, type EnemyArchetypeId } from '../data/enemies';
import { getEvolutionDefinition, type EvolutionId } from '../data/evolutions';
import { HEROES, type HeroDefinition, type HeroId } from '../data/heroes';
import { getRewardDefinition, type RewardDefinition, type RewardId } from '../data/rewards';
import { getTraitDefinition, type TraitId } from '../data/traits';
import type { GameplayBotRunSnapshot } from '../debug/gameplaySnapshot';
import { AbilityProjectile } from '../entities/AbilityProjectile';
import { Enemy, type EnemyAttackSignal } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { XPGem } from '../entities/XPGem';
import { createMovementKeys, type MovementKeys } from '../input/createMovementKeys';
import type { GameSaveData } from '../save/saveData';
import { loadGameSave } from '../save/saveData';
import { applyRunProgressToQuests } from '../save/saveQuests';
import { awardRunGold, getPermanentUpgradeLevel } from '../save/saveUpgrades';
import { AbilityLoadout } from '../systems/AbilityLoadout';
import { AbilityResolver } from '../systems/AbilityResolver';
import { CombatStateRuntime } from '../systems/CombatStateRuntime';
import { LevelUpDirector } from '../systems/LevelUpDirector';
import { SpawnDirector, type PressureBeatEventType } from '../systems/SpawnDirector';
import { TraitRuntime } from '../systems/TraitRuntime';
import { TriggerSeam } from '../systems/TriggerSeam';
import { accumulateRunElapsedMs, calculateRunGoldReward, clearRunRegistryState, writeFreshRunRegistryState } from '../utils/runSession';

type EnemyBolt = {
  orb: Phaser.GameObjects.Arc;
  halo: Phaser.GameObjects.Arc;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  elapsedMs: number;
  lifetimeMs: number;
  hasHitPlayer: boolean;
};

type StateBreakEventStatus = 'inactive' | 'active' | 'broken' | 'failed';
type StateBreakReason = 'guard-slam' | 'mark-consume' | 'ailment-detonation';
type PressureChallengeType = Exclude<PressureBeatEventType, 'state-break'>;
type PressureChallengeStatus = 'inactive' | 'active' | 'completed' | 'failed';
type PressureChallengeSuccessReason = 'held-zone' | 'target-cleared' | StateBreakReason;
type BossQuestionType = 'guard-pressure' | 'priority-window' | 'cluster-setup';
type BossQuestionStatus = 'inactive' | 'active' | 'completed' | 'failed';
type BossQuestionSuccessReason = 'held-zone' | 'target-cleared' | StateBreakReason;

export class RunScene extends Phaser.Scene {
  player!: Player;

  private enemies!: Phaser.Physics.Arcade.Group;
  private xpGems!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private movementKeys!: MovementKeys;
  private saveData!: GameSaveData;
  private selectedHero!: HeroDefinition;
  private combatStates!: CombatStateRuntime;
  private traitRuntime!: TraitRuntime;
  private levelUpDirector!: LevelUpDirector;
  private abilityLoadout!: AbilityLoadout;
  private abilityResolver!: AbilityResolver;
  private triggerSeam!: TriggerSeam;
  private spawnDirector!: SpawnDirector;
  private enemyBolts: EnemyBolt[] = [];

  private runElapsedMs = 0;
  private killCount = 0;
  private pendingLevelUps = 0;
  private isEnded = false;
  private isLevelingUp = false;
  private isTransitioningToMenu = false;
  private nextSpawnAtMs = 0;
  private currentRewardChoices: RewardDefinition[] = [];
  private markedEnemyCount = 0;
  private disruptedEnemyCount = 0;
  private ailmentedEnemyCount = 0;
  private markApplyCount = 0;
  private markConsumeCount = 0;
  private disruptedApplyCount = 0;
  private disruptedSignatureHitCount = 0;
  private ailmentApplyCount = 0;
  private ailmentConsumeCount = 0;
  private supportUseCount = 0;
  private selectedEvolutionId: EvolutionId | null = null;
  private goldEarned = 0;
  private xpGemSpawnCount = 0;
  private xpGemCollectCount = 0;
  private bossEnemy: Enemy | null = null;
  private bossEncounterActive = false;
  private bossProtectors: Enemy[] = [];
  private bossProtected = false;
  private bossObjectiveText = '';
  private nextBossAddSpawnAtMs = 0;
  private bossTelegraphs: Phaser.GameObjects.Shape[] = [];
  private bossAddWaveIndex = 0;
  private bossQuestionTarget: Enemy | null = null;
  private bossQuestionType: BossQuestionType | null = null;
  private bossQuestionStatus: BossQuestionStatus = 'inactive';
  private bossQuestionObjective = '';
  private bossQuestionUntilMs = 0;
  private bossQuestionHoldMs = 0;
  private bossQuestionIndex = 0;
  private nextBossQuestionAtMs = 0;
  private bossQuestionSuccessCount = 0;
  private bossQuestionFailureCount = 0;
  private stateBreakTarget: Enemy | null = null;
  private stateBreakStatus: StateBreakEventStatus = 'inactive';
  private stateBreakTitle = '';
  private stateBreakObjective = '';
  private stateBreakUntilMs = 0;
  private stateBreakSuccessCount = 0;
  private stateBreakFailureCount = 0;
  private pressureChallengeTarget: Enemy | null = null;
  private pressureChallengeType: PressureChallengeType | null = null;
  private pressureChallengeStatus: PressureChallengeStatus = 'inactive';
  private pressureChallengeTitle = '';
  private pressureChallengeObjective = '';
  private pressureChallengeUntilMs = 0;
  private pressureChallengeHoldMs = 0;
  private pressureChallengeSuccessCount = 0;
  private pressureChallengeFailureCount = 0;

  private readonly handlePageVisibilityChange = (): void => {
    if (document.hidden && !this.isEnded && !this.isLevelingUp) {
      this.physics.world.pause();
    } else if (!document.hidden && !this.isEnded && !this.isLevelingUp) {
      this.physics.world.resume();
    }
  };

  constructor() {
    super('RunScene');
  }

  private isRunFrozen(): boolean {
    return this.isEnded || this.isLevelingUp || this.isTransitioningToMenu || document.hidden;
  }

  create(): void {
    this.saveData = loadGameSave();
    this.selectedHero = HEROES[this.saveData.selectedHero];
    this.runElapsedMs = 0;
    this.killCount = 0;
    this.pendingLevelUps = 0;
    this.isEnded = false;
    this.isLevelingUp = false;
    this.isTransitioningToMenu = false;
    this.currentRewardChoices = [];
    this.enemyBolts = [];
    this.markedEnemyCount = 0;
    this.disruptedEnemyCount = 0;
    this.ailmentedEnemyCount = 0;
    this.markApplyCount = 0;
    this.markConsumeCount = 0;
    this.disruptedApplyCount = 0;
    this.disruptedSignatureHitCount = 0;
    this.ailmentApplyCount = 0;
    this.ailmentConsumeCount = 0;
    this.supportUseCount = 0;
    this.selectedEvolutionId = null;
    this.goldEarned = 0;
    this.xpGemSpawnCount = 0;
    this.xpGemCollectCount = 0;
    this.bossEnemy = null;
    this.bossEncounterActive = false;
    this.bossProtectors = [];
    this.bossProtected = false;
    this.bossObjectiveText = '';
    this.nextBossAddSpawnAtMs = 0;
    this.bossTelegraphs = [];
    this.bossAddWaveIndex = 0;
    this.bossQuestionTarget = null;
    this.bossQuestionType = null;
    this.bossQuestionStatus = 'inactive';
    this.bossQuestionObjective = '';
    this.bossQuestionUntilMs = 0;
    this.bossQuestionHoldMs = 0;
    this.bossQuestionIndex = 0;
    this.nextBossQuestionAtMs = 0;
    this.bossQuestionSuccessCount = 0;
    this.bossQuestionFailureCount = 0;
    this.stateBreakTarget = null;
    this.stateBreakStatus = 'inactive';
    this.stateBreakTitle = '';
    this.stateBreakObjective = '';
    this.stateBreakUntilMs = 0;
    this.stateBreakSuccessCount = 0;
    this.stateBreakFailureCount = 0;
    this.pressureChallengeTarget = null;
    this.pressureChallengeType = null;
    this.pressureChallengeStatus = 'inactive';
    this.pressureChallengeTitle = '';
    this.pressureChallengeObjective = '';
    this.pressureChallengeUntilMs = 0;
    this.pressureChallengeHoldMs = 0;
    this.pressureChallengeSuccessCount = 0;
    this.pressureChallengeFailureCount = 0;

    this.cameras.main.setBackgroundColor('#111827');
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.drawArena();

    this.player = new Player(this, WORLD_WIDTH / 2, WORLD_HEIGHT / 2, this.selectedHero);
    this.applyPermanentUpgrades();

    this.enemies = this.physics.add.group({ runChildUpdate: false });
    this.xpGems = this.physics.add.group({ runChildUpdate: false });
    this.projectiles = this.physics.add.group({ runChildUpdate: false });

    this.movementKeys = createMovementKeys(this);
    this.combatStates = new CombatStateRuntime();
    this.combatStates.setMaxGuard(this.selectedHero.baseGuardMax);
    this.traitRuntime = new TraitRuntime();
    this.triggerSeam = new TriggerSeam({
      heroId: this.selectedHero.id,
      traits: this.traitRuntime,
      combatStates: this.combatStates,
    });
    this.levelUpDirector = new LevelUpDirector();
    this.abilityLoadout = new AbilityLoadout(
      this.selectedHero.primaryAbilityId,
      this.selectedHero.signatureAbilityId,
    );
    this.abilityResolver = new AbilityResolver({
      scene: this,
      player: this.player,
      enemies: this.enemies,
      projectiles: this.projectiles,
      combatStates: this.combatStates,
      traits: this.traitRuntime,
      heroId: this.selectedHero.id,
      triggers: this.triggerSeam,
    });
    this.abilityResolver.setEvolutionId(null);
    this.spawnDirector = new SpawnDirector();

    this.physics.add.overlap(
      this.projectiles,
      this.enemies,
      (projectile, enemy) => this.handleProjectileEnemyOverlap(projectile as AbilityProjectile, enemy as Enemy),
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.enemies,
      (_player, enemy) => this.handleEnemyContact(enemy as Enemy),
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.xpGems,
      (_player, gem) => this.collectXpGem(gem as XPGem),
      undefined,
      this,
    );

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1);
    this.input.keyboard?.on('keydown-ESC', this.returnToMenu, this);
    document.addEventListener('visibilitychange', this.handlePageVisibilityChange);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);

    writeFreshRunRegistryState(this.registry, this.selectedHero.name, this.saveData.totalGold);
    this.publishHudState();
    this.spawnEnemyWave();
  }

  update(time: number, delta: number): void {
    const activeDelta = Math.max(0, delta);

    if (!this.isRunFrozen()) {
      this.runElapsedMs = accumulateRunElapsedMs(this.runElapsedMs, activeDelta, true, 100, RUN_TARGET_DURATION_MS);
      if (this.runElapsedMs >= RUN_TARGET_DURATION_MS && !this.isBossAlive()) {
        this.endRun(true);
      }
    }

    this.player.updateVisualState(time);

    if (this.isRunFrozen()) {
      this.player.move(new Phaser.Math.Vector2(0, 0));
      this.publishHudState();
      return;
    }

    this.updateXPGems();
    this.updateProjectiles(activeDelta);
    this.updateEnemyBolts(activeDelta);
    this.harvestPendingDeaths();
    this.refreshCombatStateCounts(time);

    this.player.move(this.readMovementInput());
    this.attemptAbilityUse(time);
    this.updateBossEncounter(time, activeDelta);
    this.updateStateBreakEvent();
    this.updatePressureChallengeEvent(activeDelta);
    this.updateEnemies(time);
    this.spawnIfDue(time);

    if (this.pendingLevelUps > 0 && !this.isLevelingUp) {
      this.beginLevelUp();
    }

    this.publishHudState();
  }

  selectReward(index: number): void {
    if (!this.isLevelingUp || this.isEnded || this.isTransitioningToMenu) {
      return;
    }

    const reward = this.currentRewardChoices[index];
    if (!reward) {
      return;
    }

    this.applyReward(reward);
    this.pendingLevelUps = Math.max(0, this.pendingLevelUps - 1);
    this.currentRewardChoices = [];
    this.isLevelingUp = false;
    this.physics.world.resume();
    this.publishHudState();
  }

  returnToMenu(): void {
    if (this.isTransitioningToMenu) {
      return;
    }

    this.isTransitioningToMenu = true;
    this.isLevelingUp = false;
    this.currentRewardChoices = [];
    this.physics.world.pause();
    this.clearTransientHazards();
    clearRunRegistryState(this.registry, this.saveData.totalGold);
    if (this.scene.isActive('UIScene')) {
      this.scene.stop('UIScene');
    }
    this.scene.stop('RunScene');
    this.scene.start('MenuScene');
  }

  spawnEnemyWave(): void {
    if (this.isEnded || this.isTransitioningToMenu) {
      return;
    }
    const result = this.spawnDirector.nextWave(this.runElapsedMs);
    result.wave.forEach((archetype, index) => {
      const enemy = this.spawnEnemy(archetype, index, result.wave.length);
      if (result.eventTargetIndex !== null && index === result.eventTargetIndex) {
        enemy.setEventMarker(result.eventTargetColor ?? 0xfbbf24);
        if (result.eventType === 'state-break') {
          this.clearPressureChallengeEvent();
          this.beginStateBreakEvent(enemy, {
            title: result.eventTitle,
            objective: result.eventObjective,
          });
        } else if (result.eventType) {
          this.beginPressureChallengeEvent(enemy, {
            type: result.eventType,
            title: result.eventTitle,
            objective: result.eventObjective,
            durationMs: result.eventDurationMs,
          });
        }
      }
    });
    this.nextSpawnAtMs = this.time.now + this.getSpawnIntervalMs();
    this.publishHudState();
  }

  debugGrantExperience(amount = 24): void {
    if (this.isEnded) {
      return;
    }
    this.handleExperienceGain(amount);
    this.publishHudState();
  }

  debugForceLevelUp(): void {
    if (this.isEnded || this.isLevelingUp) {
      return;
    }
    this.pendingLevelUps = Math.max(1, this.pendingLevelUps);
    this.beginLevelUp();
  }

  debugForceEndRun(victory = true): void {
    this.endRun(victory);
  }

  debugForceBossEncounter(): void {
    if (this.isEnded || this.isLevelingUp || this.isTransitioningToMenu) {
      return;
    }
    this.spawnBossEncounter();
    this.publishHudState();
  }

  debugForceReward(rewardId: RewardId): boolean {
    const reward = getRewardDefinition(rewardId);
    if (!reward) {
      return false;
    }
    this.applyReward(reward);
    this.publishHudState();
    return true;
  }

  debugSpawnEnemy(enemyId: EnemyArchetypeId): boolean {
    const archetype = ENEMY_ARCHETYPES[enemyId];
    if (!archetype) {
      return false;
    }
    this.spawnEnemy(archetype, 0, 1);
    this.publishHudState();
    return true;
  }

  publishHudState(): void {
    const primary = getAbilityDefinition(this.selectedHero.primaryAbilityId);
    const signature = getAbilityDefinition(this.selectedHero.signatureAbilityId);
    const support = this.abilityLoadout.getAbility('support');
    const pressureBeat = this.spawnDirector.getPressureBeat(this.runElapsedMs);
    this.registry.set('run.heroName', this.selectedHero.name);
    this.registry.set('run.heroAffinity', this.selectedHero.stateAffinity);
    this.registry.set('run.hp', this.player.getCurrentHealth());
    this.registry.set('run.maxHp', this.player.getMaxHealth());
    this.registry.set('run.guard', this.combatStates.getGuard());
    this.registry.set('run.maxGuard', this.combatStates.getMaxGuard());
    this.registry.set('run.level', this.player.getLevel());
    this.registry.set('run.xp', this.player.getExperience());
    this.registry.set('run.xpNext', this.player.getExperienceToNextLevel());
    this.registry.set('run.kills', this.killCount);
    this.registry.set('run.elapsedMs', this.runElapsedMs);
    this.registry.set('run.targetMs', RUN_TARGET_DURATION_MS);
    this.registry.set('run.goldEarned', this.goldEarned);
    this.registry.set('run.totalGold', this.saveData.totalGold);
    this.registry.set('run.evolutionId', this.selectedEvolutionId);
    this.registry.set(
      'run.evolutionTitle',
      this.selectedEvolutionId ? getEvolutionDefinition(this.selectedEvolutionId).title : '',
    );
    this.registry.set('run.levelUpActive', this.isLevelingUp);
    this.registry.set('run.levelUpChoices', this.currentRewardChoices);
    this.registry.set('run.traits', this.traitRuntime.getSelectedTraitIds().map((id) => getTraitDefinition(id)?.title ?? id));
    this.registry.set('run.markedEnemies', this.markedEnemyCount);
    this.registry.set('run.disruptedEnemies', this.disruptedEnemyCount);
    this.registry.set('run.ailmentedEnemies', this.ailmentedEnemyCount);
    this.registry.set('run.stateLabel', this.buildStateLabel());
    this.registry.set('run.bossActive', this.isBossAlive());
    this.registry.set('run.bossHp', this.bossEnemy?.getCurrentHealth() ?? 0);
    this.registry.set('run.bossMaxHp', this.bossEnemy?.getMaxHealth() ?? 0);
    this.registry.set('run.bossProtectors', this.getActiveBossProtectors().length);
    this.registry.set('run.bossProtected', this.bossProtected);
    this.registry.set('run.bossName', this.bossEnemy?.archetype.name ?? '');
    this.registry.set('run.bossObjective', this.bossObjectiveText);
    this.registry.set('run.pressureBeatActive', pressureBeat.active);
    this.registry.set('run.pressureBeatId', pressureBeat.id);
    this.registry.set('run.pressureBeatLabel', pressureBeat.label);
    this.registry.set('run.pressureBeatObjective', pressureBeat.objective);
    this.registry.set('run.pressureBeatRemainingMs', pressureBeat.remainingMs);
    this.registry.set('run.eventActive', this.getEventActive());
    this.registry.set('run.eventType', this.getEventType());
    this.registry.set('run.eventTitle', this.getEventTitle());
    this.registry.set('run.eventObjective', this.getEventObjectiveText());
    this.registry.set('run.eventRemainingMs', this.getEventRemainingMs());
    this.registry.set('run.eventTargetStatus', this.getEventTargetStatus());
    this.registry.set('run.eventSuccesses', this.getEventSuccessCount());
    this.registry.set('run.eventFailures', this.getEventFailureCount());
    this.registry.set('run.supportName', support?.name ?? 'Locked');
    this.registry.set('run.weaponNames', [primary.name, signature.name]);
    this.registry.set('run.abilityLabels', [
      `Primary: ${primary.shortLabel} ${primary.name} (${Math.ceil(this.abilityLoadout.getRemainingCooldownMs('primary', this.time.now) / 100) / 10}s)`,
      `Signature: ${signature.shortLabel} ${signature.name} (${Math.ceil(this.abilityLoadout.getRemainingCooldownMs('signature', this.time.now) / 100) / 10}s)`,
      support
        ? `Support: ${support.shortLabel} ${support.name} (${Math.ceil(this.abilityLoadout.getRemainingCooldownMs('support', this.time.now) / 100) / 10}s)`
        : 'Support: Locked',
    ]);
  }

  getGameplayBotSnapshot(): GameplayBotRunSnapshot {
    const enemies = (this.enemies.getChildren() as Enemy[])
      .filter((enemy) => enemy.active)
      .map((enemy) => ({
        id: enemy.archetype.id,
        x: enemy.x,
        y: enemy.y,
        distance: Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y),
        contactDamage: enemy.contactDamage,
        isElite: enemy.isElite(),
        isBoss: enemy.isBoss(),
        isEventTarget: enemy.isEventMarked(),
        isMarked: enemy.isMarked(this.time.now),
        isDisrupted: enemy.isDisrupted(this.time.now),
        isAilmented: enemy.isAilmented(this.time.now),
      }))
      .sort((left, right) => left.distance - right.distance);

    const xpGems = (this.xpGems.getChildren() as XPGem[])
      .filter((gem) => gem.active)
      .map((gem) => ({
        x: gem.x,
        y: gem.y,
        distance: Phaser.Math.Distance.Between(this.player.x, this.player.y, gem.x, gem.y),
        value: gem.getValue(),
      }))
      .sort((left, right) => left.distance - right.distance);

    return {
      elapsedMs: this.runElapsedMs,
      hp: this.player.getCurrentHealth(),
      maxHp: this.player.getMaxHealth(),
      level: this.player.getLevel(),
      xp: this.player.getExperience(),
      xpNext: this.player.getExperienceToNextLevel(),
      kills: this.killCount,
      weaponCount: this.abilityLoadout.hasAbility('support') ? 3 : 2,
      goldEarned: this.goldEarned,
      levelUpActive: this.isLevelingUp,
      endActive: this.isEnded,
      victory: Boolean(this.registry.get('run.victory')),
      endTitle: String(this.registry.get('run.endTitle') ?? ''),
      weaponNames: this.registry.get('run.weaponNames') as string[],
      traits: this.traitRuntime.getSelectedTraitIds(),
      rewardChoices: this.currentRewardChoices.map((reward) => ({
        id: reward.id,
        title: reward.title,
        lane: reward.lane,
      })),
      player: {
        x: this.player.x,
        y: this.player.y,
        moveSpeed: this.player.getMoveSpeed(),
        pickupRange: this.player.getPickupRange(),
        guard: this.combatStates.getGuard(),
        maxGuard: this.combatStates.getMaxGuard(),
      },
      cooldowns: {
        primaryRemainingMs: this.abilityLoadout.getRemainingCooldownMs('primary', this.time.now),
        signatureRemainingMs: this.abilityLoadout.getRemainingCooldownMs('signature', this.time.now),
        supportRemainingMs: this.abilityLoadout.getRemainingCooldownMs('support', this.time.now),
      },
      markedEnemies: this.markedEnemyCount,
      disruptedEnemies: this.disruptedEnemyCount,
      ailmentedEnemies: this.ailmentedEnemyCount,
      markApplyCount: this.markApplyCount,
      markConsumeCount: this.markConsumeCount,
      disruptedApplyCount: this.disruptedApplyCount,
      disruptedSignatureHitCount: this.disruptedSignatureHitCount,
      ailmentApplyCount: this.ailmentApplyCount,
      ailmentConsumeCount: this.ailmentConsumeCount,
      supportAbilityId: this.abilityLoadout.getAbilityId('support'),
      supportUseCount: this.supportUseCount,
      evolutionId: this.selectedEvolutionId,
      evolutionTitle: this.selectedEvolutionId ? getEvolutionDefinition(this.selectedEvolutionId).title : '',
      xpGemSpawnCount: this.xpGemSpawnCount,
      xpGemCollectCount: this.xpGemCollectCount,
      bossActive: this.isBossAlive(),
      bossHp: this.bossEnemy?.getCurrentHealth() ?? 0,
      bossMaxHp: this.bossEnemy?.getMaxHealth() ?? 0,
      bossProtectors: this.getActiveBossProtectors().length,
      bossProtected: this.bossProtected,
      bossName: this.bossEnemy?.archetype.name ?? '',
      bossObjective: this.bossObjectiveText,
      bossQuestion: this.getBossQuestionSnapshot(),
      pressureBeat: this.spawnDirector.getPressureBeat(this.runElapsedMs),
      enemies,
      xpGems,
      upgradeChoices: this.currentRewardChoices.map((reward) => ({
        id: reward.id,
        title: reward.title,
      })),
      waveTemplate: {
        id: this.spawnDirector.getLastWaveTemplateId(),
        label: this.spawnDirector.getLastWaveTemplateLabel(),
        highlight: this.spawnDirector.getLastWaveTemplateHighlight(),
      },
      event: {
        active: this.getEventActive(),
        type: this.getEventType(),
        title: this.getEventTitle(),
        objective: this.getEventObjectiveText(),
        remainingMs: this.getEventRemainingMs(),
        targetStatus: this.getEventTargetStatus(),
        challengeWaveSuccesses: this.pressureChallengeSuccessCount,
        challengeWaveFailures: this.pressureChallengeFailureCount,
        rewardTargetSuccesses: this.stateBreakSuccessCount,
        rewardTargetFailures: this.stateBreakFailureCount,
      },
      combatResponse: {
        hitStopStarts: 0,
        hitStopRefreshes: 0,
        hitStopSuppressions: 0,
        hitStopActive: false,
        weaponImpactCounts: {},
        enemyImpactCounts: {},
      },
    };
  }

  private drawArena(): void {
    this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x111827, 1);
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x1f2937, 0.4);

    for (let x = 120; x < WORLD_WIDTH; x += 120) {
      graphics.lineBetween(x, 0, x, WORLD_HEIGHT);
    }
    for (let y = 120; y < WORLD_HEIGHT; y += 120) {
      graphics.lineBetween(0, y, WORLD_WIDTH, y);
    }

    graphics.lineStyle(4, 0x223247, 0.8);
    graphics.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }

  private applyPermanentUpgrades(): void {
    const bonusHp = getPermanentUpgradeLevel(this.saveData, 'max-hp') * 10;
    const bonusSpeed = getPermanentUpgradeLevel(this.saveData, 'move-speed') * 8;
    const bonusPickup = getPermanentUpgradeLevel(this.saveData, 'pickup-range') * 12;
    if (bonusHp > 0) {
      this.player.addMaxHealth(bonusHp);
    }
    if (bonusSpeed > 0) {
      this.player.addMoveSpeed(bonusSpeed);
    }
    if (bonusPickup > 0) {
      this.player.addPickupRange(bonusPickup);
    }
  }

  private readMovementInput(): Phaser.Math.Vector2 {
    const direction = new Phaser.Math.Vector2(0, 0);
    if (this.movementKeys.left.isDown) {
      direction.x -= 1;
    }
    if (this.movementKeys.right.isDown) {
      direction.x += 1;
    }
    if (this.movementKeys.up.isDown) {
      direction.y -= 1;
    }
    if (this.movementKeys.down.isDown) {
      direction.y += 1;
    }
    return direction;
  }

  private attemptAbilityUse(currentTime: number): void {
    const primary = this.abilityLoadout.getAbility('primary');
    if (primary && this.abilityLoadout.canUse('primary', currentTime)) {
      const result = this.abilityResolver.tryUseAbility('primary', primary, currentTime);
      if (result.used) {
        this.abilityLoadout.commitUse('primary', currentTime);
      }
    }

    const support = this.abilityLoadout.getAbility('support');
    if (support && this.abilityLoadout.canUse('support', currentTime)) {
      const result = this.abilityResolver.tryUseAbility('support', support, currentTime);
      if (result.used) {
        this.abilityLoadout.commitUse('support', currentTime);
        this.supportUseCount += 1;
        if ((result.disruptedApplications ?? 0) > 0) {
          this.disruptedApplyCount += result.disruptedApplications ?? 0;
        }
        if ((result.ailmentApplications ?? 0) > 0) {
          this.ailmentApplyCount += result.ailmentApplications ?? 0;
        }
      }
    }

    const signature = this.abilityLoadout.getAbility('signature');
    if (signature && this.abilityLoadout.canUse('signature', currentTime)) {
      if (this.selectedHero.id === 'runner' && this.combatStates.getGuard() < 3) {
        return;
      }

      const activeStateBreakTarget = this.getActiveStateBreakTarget();
      const stateBreakTargetWasAilmented = Boolean(activeStateBreakTarget?.isAilmented(currentTime));
      const activePressureChallengeTarget = this.getActivePressureChallengeTarget();
      const pressureChallengeTargetWasAilmented = Boolean(activePressureChallengeTarget?.isAilmented(currentTime));
      const activeBossQuestionTarget = this.getActiveBossQuestionTarget();
      const bossQuestionTargetWasAilmented = Boolean(activeBossQuestionTarget?.isAilmented(currentTime));
      const result = this.abilityResolver.tryUseAbility('signature', signature, currentTime);
      if (result.used) {
        this.abilityLoadout.commitUse('signature', currentTime);
        if ((result.disruptedTargetsHit ?? 0) > 0) {
          this.disruptedSignatureHitCount += result.disruptedTargetsHit ?? 0;
        }
        if ((result.ailmentConsumes ?? 0) > 0) {
          this.ailmentConsumeCount += result.ailmentConsumes ?? 0;
          if (this.selectedHero.id === 'weaver') {
            this.abilityLoadout.reduceCooldown(
              'signature',
              Math.min(360, (result.ailmentConsumes ?? 0) * 120),
              currentTime,
            );
          }
        }
        if (result.signatureHit?.consumedMark) {
          this.markConsumeCount += 1;
          const consumePayoff = this.triggerSeam.resolveOnConsumeSignaturePayoff({
            consumedMark: true,
          });
          if (consumePayoff.guardGain > 0) {
            const actualGain = this.combatStates.gainGuardTx(consumePayoff.guardGain).value;
            this.traitRuntime.notifyGuardGain(currentTime, actualGain);
          }
          this.abilityLoadout.reduceCooldown(
            'signature',
            consumePayoff.cooldownRefundMs,
            currentTime,
          );
        }
        this.resolveStateBreakFromSignature(result, {
          targetBeforeUse: activeStateBreakTarget,
          targetWasAilmented: stateBreakTargetWasAilmented,
          currentTime,
        });
        this.resolvePressureChallengeFromSignature(result, {
          targetBeforeUse: activePressureChallengeTarget,
          targetWasAilmented: pressureChallengeTargetWasAilmented,
          currentTime,
        });
        this.resolveBossQuestionFromSignature(result, {
          targetBeforeUse: activeBossQuestionTarget,
          targetWasAilmented: bossQuestionTargetWasAilmented,
          currentTime,
        });
      }
    }
  }

  private beginStateBreakEvent(enemy: Enemy, options: { title: string; objective: string }): void {
    this.stateBreakTarget = enemy;
    this.stateBreakStatus = 'active';
    this.stateBreakTitle = options.title || 'State Break';
    this.stateBreakObjective = options.objective || 'Break the pressure target with a hero payoff.';
    this.stateBreakUntilMs = this.runElapsedMs + 16_000;

    const pulse = this.add.circle(enemy.x, enemy.y, 18, 0xfbbf24, 0.18).setDepth(8);
    pulse.setStrokeStyle(4, 0xfef08a, 0.96);
    this.tweens.add({
      targets: pulse,
      radius: Math.max(78, enemy.width * 1.8),
      alpha: 0,
      duration: 420,
      ease: 'Quad.Out',
      onComplete: () => pulse.destroy(),
    });
  }

  private updateStateBreakEvent(): void {
    if (this.stateBreakStatus !== 'active') {
      return;
    }

    const target = this.getActiveStateBreakTarget();
    if (!target) {
      this.resolveStateBreakFailure('Target escaped.');
      return;
    }

    if (this.runElapsedMs >= this.stateBreakUntilMs) {
      this.resolveStateBreakFailure('Conduit hardened.');
    }
  }

  private resolveStateBreakFromSignature(
    result: { signatureHit?: { target: Enemy; consumedMark: boolean } | null; ailmentConsumes?: number },
    options: {
      targetBeforeUse: Enemy | null;
      targetWasAilmented: boolean;
      currentTime: number;
    },
  ): void {
    const target = options.targetBeforeUse;
    if (this.stateBreakStatus !== 'active' || !target || target !== this.stateBreakTarget) {
      return;
    }

    if (this.selectedHero.id === 'runner' && this.isStateBreakTargetInsideRunnerPayoff(target)) {
      this.resolveStateBreakSuccess('guard-slam');
      return;
    }

    if (
      this.selectedHero.id === 'shade' &&
      result.signatureHit?.target === target &&
      result.signatureHit.consumedMark
    ) {
      this.resolveStateBreakSuccess('mark-consume');
      return;
    }

    if (
      this.selectedHero.id === 'weaver' &&
      options.targetWasAilmented &&
      !target.isAilmented(options.currentTime) &&
      (result.ailmentConsumes ?? 0) > 0
    ) {
      this.resolveStateBreakSuccess('ailment-detonation');
    }
  }

  private resolveStateBreakSuccess(reason: StateBreakReason): void {
    if (this.stateBreakStatus !== 'active') {
      return;
    }

    const target = this.stateBreakTarget?.active ? this.stateBreakTarget : null;
    this.stateBreakStatus = 'broken';
    this.stateBreakSuccessCount += 1;
    this.stateBreakObjective = this.getStateBreakSuccessText(reason);
    this.stateBreakUntilMs = this.runElapsedMs;
    this.spawnDirector.clearPressureBeat();

    if (target) {
      target.setEventMarker(0x4ade80);
      this.playStateBreakPayoffCue(target, reason);
      this.dropStateBreakXpBurst(target);
      const burst = this.add.circle(target.x, target.y, 20, 0x4ade80, 0.18).setDepth(9);
      burst.setStrokeStyle(4, 0xdcfce7, 0.95);
      this.tweens.add({
        targets: burst,
        radius: 96,
        alpha: 0,
        duration: 320,
        ease: 'Quad.Out',
        onComplete: () => burst.destroy(),
      });
      this.time.delayedCall(900, () => {
        if (target.active && this.stateBreakStatus === 'broken') {
          target.setEventMarker(null);
        }
      });
    }

    this.player.heal(6);
    const gained = this.combatStates.gainGuardTx(4).value;
    this.traitRuntime.notifyGuardGain(this.time.now, gained);
    this.abilityLoadout.reduceCooldown('signature', 600, this.time.now);
    this.cameras.main.shake(80, 0.0018);
    this.publishHudState();
  }

  private playStateBreakPayoffCue(target: Enemy, reason: StateBreakReason): void {
    const config = {
      'guard-slam': {
        color: 0xfb923c,
        strokeColor: 0xffedd5,
        lineWidth: 7,
        startRadius: 18,
        endRadius: 78,
      },
      'mark-consume': {
        color: 0xfef08a,
        strokeColor: 0xfffbeb,
        lineWidth: 4,
        startRadius: 12,
        endRadius: 64,
      },
      'ailment-detonation': {
        color: 0xfb7185,
        strokeColor: 0xffedd5,
        lineWidth: 5,
        startRadius: 16,
        endRadius: 84,
      },
    }[reason];

    target.playPayoffReaction('state-break');

    const payoffLine = this.add.line(0, 0, this.player.x, this.player.y, target.x, target.y, config.color, 0.88);
    payoffLine.setLineWidth(config.lineWidth, config.lineWidth);
    payoffLine.setDepth(9.3);
    this.tweens.add({
      targets: payoffLine,
      alpha: 0,
      duration: 170,
      ease: 'Quad.Out',
      onComplete: () => payoffLine.destroy(),
    });

    const shatter = this.add.circle(target.x, target.y, config.startRadius, config.color, 0.26).setDepth(9.4);
    shatter.setStrokeStyle(4, config.strokeColor, 0.95);
    this.tweens.add({
      targets: shatter,
      radius: config.endRadius,
      alpha: 0,
      duration: 230,
      ease: 'Quad.Out',
      onComplete: () => shatter.destroy(),
    });
  }

  private resolveStateBreakFailure(message: string): void {
    if (this.stateBreakStatus !== 'active') {
      return;
    }

    const target = this.getActiveStateBreakTarget();
    this.stateBreakStatus = 'failed';
    this.stateBreakFailureCount += 1;
    this.stateBreakObjective = `${message} Reinforcements incoming.`;
    this.stateBreakUntilMs = this.runElapsedMs;

    if (target) {
      target.setEventMarker(0xef4444);
      this.spawnStateBreakFailureAdds(target);
      const flare = this.add.circle(target.x, target.y, 22, 0xef4444, 0.16).setDepth(8);
      flare.setStrokeStyle(4, 0xfee2e2, 0.9);
      this.tweens.add({
        targets: flare,
        radius: 84,
        alpha: 0,
        duration: 300,
        ease: 'Quad.Out',
        onComplete: () => flare.destroy(),
      });
      this.time.delayedCall(900, () => {
        if (target.active && this.stateBreakStatus === 'failed') {
          target.setEventMarker(null);
        }
      });
    }

    this.publishHudState();
  }

  private getActiveStateBreakTarget(): Enemy | null {
    if (this.stateBreakStatus !== 'active' || !this.stateBreakTarget?.active || !this.stateBreakTarget.isAlive()) {
      return null;
    }

    return this.stateBreakTarget;
  }

  private isStateBreakTargetInsideRunnerPayoff(target: Enemy): boolean {
    if (this.selectedEvolutionId === 'reckoner-drive') {
      return Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y) <= 420;
    }

    return Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y) <= 170;
  }

  private getStateBreakSuccessText(reason: StateBreakReason): string {
    switch (reason) {
      case 'guard-slam':
        return 'State Break: Guard slam shattered the conduit. Pressure relieved.';
      case 'mark-consume':
        return 'State Break: Mark execution broke the conduit. Pressure relieved.';
      case 'ailment-detonation':
      default:
        return 'State Break: Ailment detonation broke the conduit. Pressure relieved.';
    }
  }

  private getStateBreakObjectiveText(): string {
    if (this.stateBreakStatus === 'active') {
      return `${this.stateBreakObjective} ${Math.ceil(this.getStateBreakRemainingMs() / 1000)}s`;
    }
    return this.stateBreakObjective;
  }

  private getStateBreakRemainingMs(): number {
    if (this.stateBreakStatus !== 'active') {
      return 0;
    }

    return Math.max(0, this.stateBreakUntilMs - this.runElapsedMs);
  }

  private beginPressureChallengeEvent(
    enemy: Enemy,
    options: { type: PressureChallengeType; title: string; objective: string; durationMs: number },
  ): void {
    this.clearPressureChallengeEvent();
    this.pressureChallengeTarget = enemy;
    this.pressureChallengeType = options.type;
    this.pressureChallengeStatus = 'active';
    this.pressureChallengeTitle = options.title || this.getPressureChallengeDefaultTitle(options.type);
    this.pressureChallengeObjective = options.objective || this.getPressureChallengeDefaultObjective(options.type);
    this.pressureChallengeUntilMs = this.runElapsedMs + (options.durationMs || 16_000);
    this.pressureChallengeHoldMs = 0;

    const color = this.getPressureChallengeColor(options.type);
    const pulse = this.add.circle(enemy.x, enemy.y, 20, color, 0.18).setDepth(8.8);
    pulse.setStrokeStyle(4, 0xfffbeb, 0.86);
    this.tweens.add({
      targets: pulse,
      radius: options.type === 'hold-space' ? 150 : Math.max(82, enemy.width * 2),
      alpha: 0,
      duration: 430,
      ease: 'Quad.Out',
      onComplete: () => pulse.destroy(),
    });
  }

  private updatePressureChallengeEvent(deltaMs: number): void {
    if (this.pressureChallengeStatus !== 'active') {
      return;
    }

    const target = this.getActivePressureChallengeTarget();
    if (!target) {
      this.resolvePressureChallengeSuccess('target-cleared');
      return;
    }

    if (this.pressureChallengeType === 'hold-space') {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y);
      if (distance <= 150) {
        this.pressureChallengeHoldMs += deltaMs;
        if (this.pressureChallengeHoldMs >= 3200) {
          this.resolvePressureChallengeSuccess('held-zone');
          return;
        }
      } else {
        this.pressureChallengeHoldMs = Math.max(0, this.pressureChallengeHoldMs - deltaMs * 0.45);
      }
    }

    if (this.runElapsedMs >= this.pressureChallengeUntilMs) {
      this.resolvePressureChallengeFailure();
    }
  }

  private resolvePressureChallengeFromSignature(
    result: { signatureHit?: { target: Enemy; consumedMark: boolean; killed: boolean } | null; ailmentConsumes?: number },
    options: {
      targetBeforeUse: Enemy | null;
      targetWasAilmented: boolean;
      currentTime: number;
    },
  ): void {
    const target = options.targetBeforeUse;
    if (this.pressureChallengeStatus !== 'active' || !this.pressureChallengeType || !target || target !== this.pressureChallengeTarget) {
      if (
        this.pressureChallengeStatus === 'active' &&
        this.pressureChallengeType === 'stabilize-collapse' &&
        this.selectedHero.id === 'weaver' &&
        (result.ailmentConsumes ?? 0) >= 2
      ) {
        this.resolvePressureChallengeSuccess('ailment-detonation');
      }
      return;
    }

    if (this.selectedHero.id === 'runner' && this.isPressureChallengeTargetInsideRunnerPayoff(target)) {
      this.resolvePressureChallengeSuccess('guard-slam');
      return;
    }

    if (this.selectedHero.id === 'shade' && result.signatureHit?.target === target && result.signatureHit.consumedMark) {
      this.resolvePressureChallengeSuccess('mark-consume');
      return;
    }

    if (
      this.selectedHero.id === 'weaver' &&
      ((options.targetWasAilmented && !target.isAilmented(options.currentTime) && (result.ailmentConsumes ?? 0) > 0) ||
        (this.pressureChallengeType === 'stabilize-collapse' && (result.ailmentConsumes ?? 0) >= 2))
    ) {
      this.resolvePressureChallengeSuccess('ailment-detonation');
    }
  }

  private resolvePressureChallengeSuccess(reason: PressureChallengeSuccessReason): void {
    if (this.pressureChallengeStatus !== 'active') {
      return;
    }

    const target = this.pressureChallengeTarget?.active ? this.pressureChallengeTarget : null;
    this.pressureChallengeStatus = 'completed';
    this.pressureChallengeSuccessCount += 1;
    this.pressureChallengeObjective = this.getPressureChallengeSuccessText(reason);
    this.pressureChallengeUntilMs = this.runElapsedMs;
    this.spawnDirector.clearPressureBeat();

    if (target) {
      target.setEventMarker(0x4ade80);
      target.playPayoffReaction('state-break');
      this.playPressureChallengeResolveCue(target, 0x4ade80, 0xdcfce7);
      this.dropPressureChallengeReliefBurst(target);
      this.time.delayedCall(850, () => {
        if (target.active && this.pressureChallengeStatus === 'completed') {
          target.setEventMarker(null);
        }
      });
    }

    this.player.heal(3);
    const gained = this.combatStates.gainGuardTx(2).value;
    this.traitRuntime.notifyGuardGain(this.time.now, gained);
    this.abilityLoadout.reduceCooldown('signature', 280, this.time.now);
    this.cameras.main.shake(55, 0.0012);
    this.publishHudState();
  }

  private resolvePressureChallengeFailure(): void {
    if (this.pressureChallengeStatus !== 'active') {
      return;
    }

    const target = this.getActivePressureChallengeTarget();
    this.pressureChallengeStatus = 'failed';
    this.pressureChallengeFailureCount += 1;
    this.pressureChallengeObjective = `${this.pressureChallengeTitle || 'Pressure beat'} failed. Controlled pressure incoming.`;
    this.pressureChallengeUntilMs = this.runElapsedMs;

    if (target) {
      target.setEventMarker(0xef4444);
      this.playPressureChallengeResolveCue(target, 0xef4444, 0xfee2e2);
      this.spawnPressureChallengeFailureAdds(target, this.pressureChallengeType);
      this.time.delayedCall(850, () => {
        if (target.active && this.pressureChallengeStatus === 'failed') {
          target.setEventMarker(null);
        }
      });
    }

    this.publishHudState();
  }

  private getActivePressureChallengeTarget(): Enemy | null {
    if (this.pressureChallengeStatus !== 'active' || !this.pressureChallengeTarget?.active || !this.pressureChallengeTarget.isAlive()) {
      return null;
    }

    return this.pressureChallengeTarget;
  }

  private isPressureChallengeTargetInsideRunnerPayoff(target: Enemy): boolean {
    if (this.selectedEvolutionId === 'reckoner-drive') {
      return Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y) <= 420;
    }

    return Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y) <= 170;
  }

  private getPressureChallengeObjectiveText(): string {
    if (this.pressureChallengeStatus === 'active') {
      const remaining = `${Math.ceil(this.getPressureChallengeRemainingMs() / 1000)}s`;
      if (this.pressureChallengeType === 'hold-space') {
        const held = Math.min(3.2, this.pressureChallengeHoldMs / 1000).toFixed(1);
        return `${this.pressureChallengeObjective} Hold ${held}/3.2s | ${remaining}`;
      }
      return `${this.pressureChallengeObjective} ${remaining}`;
    }
    return this.pressureChallengeObjective;
  }

  private getPressureChallengeRemainingMs(): number {
    if (this.pressureChallengeStatus !== 'active') {
      return 0;
    }

    return Math.max(0, this.pressureChallengeUntilMs - this.runElapsedMs);
  }

  private getPressureChallengeDefaultTitle(type: PressureChallengeType): string {
    switch (type) {
      case 'hold-space':
        return 'Hold Space';
      case 'priority-execution':
        return 'Priority Execution';
      case 'stabilize-collapse':
      default:
        return 'Stabilize Pocket';
    }
  }

  private getPressureChallengeDefaultObjective(type: PressureChallengeType): string {
    switch (type) {
      case 'hold-space':
        return 'Stand near the breach anchor or break it with a payoff.';
      case 'priority-execution':
        return 'Break the ramp target before it turns the wave sharper.';
      case 'stabilize-collapse':
      default:
        return 'Collapse the messy cluster before it spreads across the lane.';
    }
  }

  private getPressureChallengeSuccessText(reason: PressureChallengeSuccessReason): string {
    switch (reason) {
      case 'held-zone':
        return 'Hold Space: lane held. Pressure relieved.';
      case 'target-cleared':
        return `${this.pressureChallengeTitle || 'Pressure beat'}: target cleared. Pressure relieved.`;
      case 'guard-slam':
        return `${this.pressureChallengeTitle || 'Pressure beat'}: Guard slam broke the pressure.`;
      case 'mark-consume':
        return `${this.pressureChallengeTitle || 'Pressure beat'}: Mark execution cut the pressure.`;
      case 'ailment-detonation':
      default:
        return `${this.pressureChallengeTitle || 'Pressure beat'}: Ailment detonation collapsed the pressure.`;
    }
  }

  private getPressureChallengeColor(type: PressureChallengeType | null): number {
    switch (type) {
      case 'hold-space':
        return 0xfb923c;
      case 'priority-execution':
        return 0xfef08a;
      case 'stabilize-collapse':
      default:
        return 0xfb7185;
    }
  }

  private playPressureChallengeResolveCue(target: Enemy, color: number, strokeColor: number): void {
    const burst = this.add.circle(target.x, target.y, 18, color, 0.2).setDepth(9);
    burst.setStrokeStyle(4, strokeColor, 0.92);
    this.tweens.add({
      targets: burst,
      radius: 86,
      alpha: 0,
      duration: 280,
      ease: 'Quad.Out',
      onComplete: () => burst.destroy(),
    });
  }

  private dropPressureChallengeReliefBurst(target: Enemy): void {
    const offsets = [new Phaser.Math.Vector2(-18, -14), new Phaser.Math.Vector2(20, 16)];
    offsets.forEach((offset) => {
      const gem = new XPGem(this, target.x + offset.x, target.y + offset.y, 5);
      this.xpGems.add(gem);
      this.xpGemSpawnCount += 1;
    });
  }

  private spawnPressureChallengeFailureAdds(target: Enemy, type: PressureChallengeType | null): void {
    const addArchetypes =
      type === 'priority-execution'
        ? [ENEMY_ARCHETYPES.swarmer, ENEMY_ARCHETYPES.swarmer]
        : type === 'stabilize-collapse'
          ? [ENEMY_ARCHETYPES.swarmer, ENEMY_ARCHETYPES.shooter]
          : [ENEMY_ARCHETYPES.swarmer, ENEMY_ARCHETYPES.anchor];

    addArchetypes.forEach((archetype, index) => {
      const angle = (Math.PI * 2 * index) / addArchetypes.length + Math.PI / 5;
      const x = Phaser.Math.Clamp(target.x + Math.cos(angle) * 88, 90, WORLD_WIDTH - 90);
      const y = Phaser.Math.Clamp(target.y + Math.sin(angle) * 88, 90, WORLD_HEIGHT - 90);
      const enemy = new Enemy(this, x, y, archetype);
      this.enemies.add(enemy);
    });
  }

  private clearPressureChallengeEvent(): void {
    if (this.pressureChallengeTarget?.active) {
      this.pressureChallengeTarget.setEventMarker(null);
    }
    this.pressureChallengeTarget = null;
    this.pressureChallengeType = null;
    this.pressureChallengeStatus = 'inactive';
    this.pressureChallengeTitle = '';
    this.pressureChallengeObjective = '';
    this.pressureChallengeUntilMs = 0;
    this.pressureChallengeHoldMs = 0;
  }

  private getEventActive(): boolean {
    return this.stateBreakStatus === 'active' || this.pressureChallengeStatus === 'active';
  }

  private getEventType(): GameplayBotRunSnapshot['event']['type'] {
    if (this.stateBreakStatus !== 'inactive') {
      return 'state-break';
    }
    return this.pressureChallengeType ?? '';
  }

  private getEventTitle(): string {
    if (this.stateBreakStatus !== 'inactive') {
      return this.stateBreakTitle;
    }
    return this.pressureChallengeTitle;
  }

  private getEventObjectiveText(): string {
    if (this.stateBreakStatus !== 'inactive') {
      return this.getStateBreakObjectiveText();
    }
    return this.getPressureChallengeObjectiveText();
  }

  private getEventRemainingMs(): number {
    if (this.stateBreakStatus !== 'inactive') {
      return this.getStateBreakRemainingMs();
    }
    return this.getPressureChallengeRemainingMs();
  }

  private getEventTargetStatus(): GameplayBotRunSnapshot['event']['targetStatus'] {
    if (this.stateBreakStatus !== 'inactive') {
      return this.stateBreakStatus;
    }
    return this.pressureChallengeStatus;
  }

  private getEventSuccessCount(): number {
    if (this.stateBreakStatus !== 'inactive') {
      return this.stateBreakSuccessCount;
    }
    return this.pressureChallengeSuccessCount;
  }

  private getEventFailureCount(): number {
    if (this.stateBreakStatus !== 'inactive') {
      return this.stateBreakFailureCount;
    }
    return this.pressureChallengeFailureCount;
  }

  private dropStateBreakXpBurst(target: Enemy): void {
    const offsets = [
      new Phaser.Math.Vector2(0, -28),
      new Phaser.Math.Vector2(-26, 18),
      new Phaser.Math.Vector2(26, 18),
    ];

    offsets.forEach((offset) => {
      const gem = new XPGem(this, target.x + offset.x, target.y + offset.y, 8);
      this.xpGems.add(gem);
      this.xpGemSpawnCount += 1;
    });
  }

  private spawnStateBreakFailureAdds(target: Enemy): void {
    const addArchetypes = [ENEMY_ARCHETYPES.swarmer, ENEMY_ARCHETYPES.swarmer, ENEMY_ARCHETYPES.shooter];
    addArchetypes.forEach((archetype, index) => {
      const angle = (Math.PI * 2 * index) / addArchetypes.length;
      const x = Phaser.Math.Clamp(target.x + Math.cos(angle) * 96, 90, WORLD_WIDTH - 90);
      const y = Phaser.Math.Clamp(target.y + Math.sin(angle) * 96, 90, WORLD_HEIGHT - 90);
      const enemy = new Enemy(this, x, y, archetype);
      this.enemies.add(enemy);
    });
  }

  private updateEnemies(currentTime: number): void {
    (this.enemies.getChildren() as Enemy[]).forEach((enemy) => {
      if (!enemy.active) {
        return;
      }
      const signal = enemy.chase(this.player, currentTime);
      enemy.updatePresentation(currentTime);
      if (signal) {
        this.handleEnemyAttackSignal(signal);
      }
    });
  }

  private handleEnemyAttackSignal(signal: EnemyAttackSignal): void {
    if (signal.type === 'ranged-shot') {
      const orb = this.add.circle(signal.x, signal.y, signal.radius, signal.color, 0.92).setDepth(6);
      const halo = this.add.circle(signal.x, signal.y, signal.radius + 4, signal.color, 0.18).setDepth(5);
      halo.setStrokeStyle(2, 0xe0f2fe, 0.65);
      this.enemyBolts.push({
        orb,
        halo,
        vx: signal.direction.x * signal.speed,
        vy: signal.direction.y * signal.speed,
        radius: signal.radius,
        damage: signal.damage,
        elapsedMs: 0,
        lifetimeMs: 2200,
        hasHitPlayer: false,
      });
      return;
    }

    if (signal.type === 'boss-shockwave-telegraph') {
      const telegraph = this.add.circle(signal.x, signal.y, 40, 0xfca5a5, 0.08).setDepth(3);
      telegraph.setStrokeStyle(4, 0xfca5a5, 0.9);
      this.bossTelegraphs.push(telegraph);
      this.tweens.add({
        targets: telegraph,
        radius: signal.radius,
        alpha: 0.3,
        duration: 760,
        ease: 'Quad.Out',
        onComplete: () => {
          Phaser.Utils.Array.Remove(this.bossTelegraphs, telegraph);
          telegraph.destroy();
        },
      });
      return;
    }

    if (signal.type === 'boss-shockwave-execute') {
      const shockwave = this.add.circle(signal.x, signal.y, Math.max(28, signal.radius * 0.25), 0xf97316, 0.12).setDepth(7);
      shockwave.setStrokeStyle(5, 0xffedd5, 0.95);
      this.bossTelegraphs.push(shockwave);
      this.tweens.add({
        targets: shockwave,
        radius: signal.radius,
        alpha: 0,
        duration: signal.durationMs ?? 980,
        ease: 'Quad.Out',
        onComplete: () => {
          Phaser.Utils.Array.Remove(this.bossTelegraphs, shockwave);
          shockwave.destroy();
        },
      });

      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, signal.x, signal.y) <= signal.radius) {
        this.applyDamageToPlayer(signal.damage);
      }
    }
  }

  private updateProjectiles(deltaMs: number): void {
    (this.projectiles.getChildren() as AbilityProjectile[]).forEach((projectile) => {
      if (projectile.active) {
        projectile.update(deltaMs);
      }
    });
  }

  private updateEnemyBolts(deltaMs: number): void {
    for (let index = this.enemyBolts.length - 1; index >= 0; index -= 1) {
      const bolt = this.enemyBolts[index];
      bolt.elapsedMs += deltaMs;
      bolt.orb.x += bolt.vx * (deltaMs / 1000);
      bolt.orb.y += bolt.vy * (deltaMs / 1000);
      bolt.halo.setPosition(bolt.orb.x, bolt.orb.y);

      const distance = Phaser.Math.Distance.Between(bolt.orb.x, bolt.orb.y, this.player.x, this.player.y);
      if (!bolt.hasHitPlayer && distance <= bolt.radius + Math.max(this.player.width, this.player.height) * 0.34) {
        bolt.hasHitPlayer = true;
        this.applyDamageToPlayer(bolt.damage);
      }

      const outOfBounds =
        bolt.orb.x < -40 ||
        bolt.orb.x > WORLD_WIDTH + 40 ||
        bolt.orb.y < -40 ||
        bolt.orb.y > WORLD_HEIGHT + 40;
      if (bolt.elapsedMs >= bolt.lifetimeMs || outOfBounds || bolt.hasHitPlayer) {
        bolt.orb.destroy();
        bolt.halo.destroy();
        this.enemyBolts.splice(index, 1);
      }
    }
  }

  private updateXPGems(): void {
    (this.xpGems.getChildren() as XPGem[]).forEach((gem) => {
      if (gem.active) {
        gem.update(this.player);
      }
    });
  }

  private handleProjectileEnemyOverlap(projectile: AbilityProjectile, enemy: Enemy): void {
    if (!projectile.active || !enemy.active || !enemy.isAlive()) {
      return;
    }

    const currentTime = this.time.now;
    const sourceAbilityId = projectile.getSourceAbilityId();
    const isCloseRange = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) <= 160;
    const guardActive = this.combatStates.hasGuard();
    const targetWasMarked = enemy.isMarked(currentTime);
    const targetWasDisrupted = enemy.isDisrupted(currentTime);
    const targetWasAilmented = enemy.isAilmented(currentTime);
    const onHitPayoff = this.triggerSeam.resolveOnHitPayoffs({
      abilityId: sourceAbilityId,
      isCloseRange,
      guardActive,
      targetWasMarked,
      targetWasDisrupted,
      targetWasAilmented,
    });
    const metaDamageBonus = getPermanentUpgradeLevel(this.saveData, 'starting-damage') * 2;
    enemy.takeDamage(projectile.getDamage() + onHitPayoff.damageBonus + metaDamageBonus, { x: projectile.x, y: projectile.y });

    if (onHitPayoff.guardGain > 0) {
      const actualGain = this.combatStates.gainGuardTx(onHitPayoff.guardGain).value;
      this.traitRuntime.notifyGuardGain(currentTime, actualGain);
    }

    const stateApplications = this.triggerSeam.applyOnHitStateApplications(sourceAbilityId, enemy, currentTime);
    this.markApplyCount += stateApplications.markApplications;
    this.disruptedApplyCount += stateApplications.disruptedApplications;
    this.ailmentApplyCount += stateApplications.ailmentApplications;

    projectile.deactivate();
  }

  private handleEnemyContact(enemy: Enemy): void {
    if (!enemy.active || !enemy.isAlive()) {
      return;
    }
    this.applyDamageToPlayer(enemy.contactDamage);
  }

  private applyDamageToPlayer(amount: number): void {
    if (this.isRunFrozen()) {
      return;
    }

    const guarded = this.combatStates.absorbDamageTx(amount);
    const tookHit = guarded.remaining > 0 ? this.player.takeDamage(guarded.remaining, this.time.now) : false;
    if (guarded.absorbed > 0 && guarded.remaining === 0) {
      this.cameras.main.shake(40, 0.0016);
    } else if (tookHit) {
      this.cameras.main.shake(70, 0.0028);
    }

    if (!this.player.isAlive()) {
      this.endRun(false);
    }
  }

  private collectXpGem(gem: XPGem): void {
    if (!gem.active || this.isEnded || this.isLevelingUp || this.isTransitioningToMenu) {
      return;
    }

    const value = gem.getValue();
    gem.playCollectFeedback();
    gem.destroy();
    this.xpGemCollectCount += 1;
    this.handleExperienceGain(value);
  }

  private handleExperienceGain(amount: number): void {
    const levelsGained = this.player.gainExperience(amount);
    if (levelsGained > 0) {
      this.pendingLevelUps += levelsGained;
    }
  }

  private harvestPendingDeaths(): void {
    (this.enemies.getChildren() as Enemy[]).forEach((enemy) => {
      if (this.isEnded) {
        return;
      }
      if (!enemy.active || !enemy.consumeDeathRewardPending()) {
        return;
      }
      this.handleEnemyDeath(enemy);
    });
  }

  private handleEnemyDeath(enemy: Enemy): void {
    if (this.isEnded) {
      return;
    }

    this.killCount += 1;
    this.handleExperienceGain(enemy.getXpValue());
    const enemyWasMarked = enemy.isMarked(this.time.now);
    const onKillPayoff = this.triggerSeam.resolveOnKillPayoffs({
      enemyWasMarked,
    });
    if (onKillPayoff.guardGain > 0) {
      const actualGain = this.combatStates.gainGuardTx(onKillPayoff.guardGain).value;
      this.traitRuntime.notifyGuardGain(this.time.now, actualGain);
    }
    const gem = new XPGem(this, enemy.x, enemy.y, enemy.getXpValue());
    this.xpGems.add(gem);
    this.xpGemSpawnCount += 1;

    if (enemy === this.bossEnemy) {
      this.bossEnemy = null;
      this.bossEncounterActive = false;
      this.bossProtected = false;
      this.bossObjectiveText = 'Boss broken.';
      this.bossProtectors = [];
      this.clearBossQuestionWindow();
      this.endRun(true);
    }
  }

  private refreshCombatStateCounts(currentTime: number): void {
    this.markedEnemyCount = (this.enemies.getChildren() as Enemy[]).filter(
      (enemy) => enemy.active && enemy.isAlive() && enemy.isMarked(currentTime),
    ).length;
    this.disruptedEnemyCount = (this.enemies.getChildren() as Enemy[]).filter(
      (enemy) => enemy.active && enemy.isAlive() && enemy.isDisrupted(currentTime),
    ).length;
    this.ailmentedEnemyCount = (this.enemies.getChildren() as Enemy[]).filter(
      (enemy) => enemy.active && enemy.isAlive() && enemy.isAilmented(currentTime),
    ).length;
  }

  private beginLevelUp(): void {
    if (this.isEnded || this.isLevelingUp || this.isTransitioningToMenu) {
      return;
    }

    this.isLevelingUp = true;
    this.physics.world.pause();

    this.currentRewardChoices = this.levelUpDirector.buildChoices(this.selectedHero.id, this.traitRuntime, {
      hasSupportAbility: this.abilityLoadout.hasAbility('support'),
      supportAbilityId: this.abilityLoadout.getAbilityId('support'),
      level: this.player.getLevel(),
      elapsedMs: this.runElapsedMs,
      selectedEvolutionId: this.selectedEvolutionId,
    });

    const validChoices = this.currentRewardChoices.filter(
      (reward): reward is RewardDefinition => Boolean(reward),
    );

    if (validChoices.length === 0) {
      this.currentRewardChoices = [];
      this.isLevelingUp = false;
      this.physics.world.resume();
      this.publishHudState();
      return;
    }

    this.currentRewardChoices = validChoices.slice(0, 3);
    this.publishHudState();

  }

  private applyReward(reward: RewardDefinition): void {
    if (reward.category === 'trait' && reward.traitId) {
      const added = this.traitRuntime.addTrait(reward.traitId);
      if (added && reward.traitId === 'iron-reserve') {
        this.combatStates.setMaxGuard(this.selectedHero.baseGuardMax + this.traitRuntime.getBonusGuardMax());
      }
      return;
    }

    if (reward.category === 'support' && reward.abilityId) {
      this.abilityLoadout.setAbility('support', reward.abilityId);
      return;
    }

    if (reward.category === 'evolution' && reward.evolutionId) {
      this.selectedEvolutionId = reward.evolutionId;
      this.abilityResolver.setEvolutionId(reward.evolutionId);
      return;
    }

    switch (reward.id) {
      case 'field-repairs':
        this.player.addMaxHealth(24);
        this.player.heal(24);
        break;
      case 'reflex-boots':
        this.player.addMoveSpeed(20);
        break;
      default:
        break;
    }
  }

  private spawnIfDue(currentTime: number): void {
    if (this.bossEncounterActive) {
      return;
    }

    if (currentTime < this.nextSpawnAtMs) {
      return;
    }

    const activeEnemies = (this.enemies.getChildren() as Enemy[]).filter((enemy) => enemy.active && enemy.isAlive()).length;
    if (activeEnemies >= 16) {
      this.nextSpawnAtMs = currentTime + 900;
      return;
    }

    this.spawnEnemyWave();
  }

  private getSpawnIntervalMs(): number {
    const progress = Phaser.Math.Clamp(this.runElapsedMs / RUN_TARGET_DURATION_MS, 0, 1);
    return Math.round(Phaser.Math.Linear(2100, ENEMY_SPAWN_INTERVAL_MS, progress));
  }

  private spawnEnemy(archetype: EnemyArchetype, index: number, count: number): Enemy {
    const spawnPosition = this.getSpawnPosition(index, count);
    const enemy = new Enemy(this, spawnPosition.x, spawnPosition.y, archetype);
    this.enemies.add(enemy);
    return enemy;
  }

  private getSpawnPosition(index: number, count: number): Phaser.Math.Vector2 {
    const margin = 80;
    const perimeter = [
      new Phaser.Math.Vector2(Phaser.Math.Between(margin, WORLD_WIDTH - margin), margin),
      new Phaser.Math.Vector2(Phaser.Math.Between(margin, WORLD_WIDTH - margin), WORLD_HEIGHT - margin),
      new Phaser.Math.Vector2(margin, Phaser.Math.Between(margin, WORLD_HEIGHT - margin)),
      new Phaser.Math.Vector2(WORLD_WIDTH - margin, Phaser.Math.Between(margin, WORLD_HEIGHT - margin)),
    ];
    const base = perimeter[index % perimeter.length].clone();
    const offsetAngle = (Math.PI * 2 * index) / Math.max(1, count);
    base.x += Math.cos(offsetAngle) * Phaser.Math.Between(0, 72);
    base.y += Math.sin(offsetAngle) * Phaser.Math.Between(0, 72);
    return base;
  }

  private endRun(victory: boolean): void {
    if (this.isEnded) {
      return;
    }

    this.isEnded = true;
    this.isLevelingUp = false;
    this.physics.world.pause();
    this.clearTransientHazards();

    const reward = calculateRunGoldReward(this.player.getLevel(), this.killCount, victory);
    this.goldEarned = reward;
    this.saveData = awardRunGold(this.saveData, reward);
    const questResolution = applyRunProgressToQuests(this.saveData, {
      kills: this.killCount,
      survivalMs: this.runElapsedMs,
      levelReached: this.player.getLevel(),
      goldCollected: reward,
      eliteKills: 0,
    });
    this.saveData = questResolution.saveData;

    this.registry.set('save.totalGold', this.saveData.totalGold);
    this.registry.set('run.endActive', true);
    this.registry.set('run.victory', victory);
    this.registry.set('run.endTitle', victory ? 'Victory' : 'Defeat');
    this.registry.set(
      'run.endSubtitle',
      `${victory ? 'Held the line' : 'Run collapsed'} at ${Math.floor(this.runElapsedMs / 1000)}s.\nKills ${this.killCount}  |  Level ${this.player.getLevel()}  |  Gold +${reward}${questResolution.rewardMessages.length > 0 ? `\n${questResolution.rewardMessages.join('\n')}` : ''
      }`,
    );
    this.currentRewardChoices = [];
    this.publishHudState();
  }

  private handleShutdown(): void {
    this.input.keyboard?.off('keydown-ESC', this.returnToMenu, this);
    document.removeEventListener('visibilitychange', this.handlePageVisibilityChange);
    this.clearTransientHazards();
  }

  private buildStateLabel(): string {
    switch (this.selectedHero.stateAffinity) {
      case 'guard':
        return `Guard ${this.combatStates.getGuard()}/${this.combatStates.getMaxGuard()}  |  Disrupted ${this.disruptedEnemyCount}`;
      case 'mark':
        return `Marked ${this.markedEnemyCount}  |  Disrupted ${this.disruptedEnemyCount}`;
      case 'ailment':
      default:
        return `Ailment ${this.ailmentedEnemyCount}  |  Disrupted ${this.disruptedEnemyCount}`;
    }
  }

  private updateBossEncounter(currentTime: number, deltaMs: number): void {
    if (
      !this.bossEncounterActive &&
      !this.isEnded &&
      !this.isTransitioningToMenu &&
      this.pendingLevelUps === 0 &&
      this.runElapsedMs >= BOSS_TRIGGER_TIME_MS
    ) {
      this.spawnBossEncounter();
    }

    if (!this.isBossAlive()) {
      this.bossProtected = false;
      if (!this.bossEncounterActive) {
        this.bossObjectiveText = this.selectedEvolutionId
          ? `Evolution ${getEvolutionDefinition(this.selectedEvolutionId).title} online`
          : '';
      }
      return;
    }

    const activeProtectors = this.getActiveBossProtectors();
    this.bossProtected = activeProtectors.length > 0;
    this.bossEnemy?.setDamageTakenMultiplier(this.bossProtected ? 0.18 : 1);
    this.bossEnemy?.setEventMarker(this.bossProtected ? 0x60a5fa : null);
    this.updateBossQuestionWindow(currentTime, deltaMs);
    this.bossObjectiveText = this.getBossObjectiveText(activeProtectors.length);

    if (this.pendingLevelUps > 0) {
      return;
    }

    if (!this.bossProtected && this.bossQuestionStatus !== 'active' && currentTime >= this.nextBossQuestionAtMs) {
      this.beginNextBossQuestionWindow(currentTime);
      this.bossObjectiveText = this.getBossObjectiveText(activeProtectors.length);
    }

    if (this.bossQuestionStatus !== 'active' && currentTime >= this.nextBossAddSpawnAtMs) {
      this.spawnBossAddWave();
      this.nextBossAddSpawnAtMs = currentTime + 9000;
    }
  }

  private updateBossQuestionWindow(currentTime: number, deltaMs: number): void {
    if (this.bossQuestionStatus !== 'active') {
      return;
    }

    const target = this.getActiveBossQuestionTarget();
    if (!target) {
      this.resolveBossQuestionSuccess('target-cleared');
      return;
    }

    if (this.bossQuestionType === 'guard-pressure') {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y);
      if (distance <= 165) {
        this.bossQuestionHoldMs += deltaMs;
        if (this.bossQuestionHoldMs >= 2800) {
          this.resolveBossQuestionSuccess('held-zone');
          return;
        }
      } else {
        this.bossQuestionHoldMs = Math.max(0, this.bossQuestionHoldMs - deltaMs * 0.4);
      }
    }

    if (this.runElapsedMs >= this.bossQuestionUntilMs) {
      this.resolveBossQuestionFailure();
    }

    if (currentTime > this.bossQuestionUntilMs + 4000) {
      this.clearBossQuestionWindow();
    }
  }

  private beginNextBossQuestionWindow(currentTime: number): void {
    if (!this.bossEnemy || !this.bossEnemy.active || this.bossProtected || this.bossQuestionStatus === 'active') {
      return;
    }

    const sequence: BossQuestionType[] = ['guard-pressure', 'priority-window', 'cluster-setup'];
    const type = sequence[this.bossQuestionIndex % sequence.length]!;
    this.bossQuestionIndex += 1;
    this.beginBossQuestionWindow(type, currentTime);
  }

  private beginBossQuestionWindow(type: BossQuestionType, currentTime: number): void {
    if (!this.bossEnemy || !this.bossEnemy.active) {
      return;
    }

    this.clearBossQuestionTargetMarker();
    this.bossQuestionType = type;
    this.bossQuestionStatus = 'active';
    this.bossQuestionHoldMs = 0;
    this.bossQuestionUntilMs = this.runElapsedMs + this.getBossQuestionDurationMs(type);
    this.bossQuestionObjective = this.getBossQuestionStartText(type);

    const target = this.spawnBossQuestionTarget(type);
    this.bossQuestionTarget = target;
    target.setEventMarker(this.getBossQuestionColor(type));
    this.playBossQuestionCue(target, this.getBossQuestionColor(type), 0xfffbeb);
  }

  private spawnBossQuestionTarget(type: BossQuestionType): Enemy {
    const origin = this.bossEnemy ?? this.player;
    const angleToPlayer = Phaser.Math.Angle.Between(origin.x, origin.y, this.player.x, this.player.y);
    const distance = type === 'guard-pressure' ? 145 : type === 'priority-window' ? 190 : 175;
    const x = Phaser.Math.Clamp(origin.x + Math.cos(angleToPlayer) * distance, 100, WORLD_WIDTH - 100);
    const y = Phaser.Math.Clamp(origin.y + Math.sin(angleToPlayer) * distance, 100, WORLD_HEIGHT - 100);
    const archetype =
      type === 'guard-pressure'
        ? ENEMY_ARCHETYPES.bulwark
        : type === 'priority-window'
          ? ENEMY_ARCHETYPES.harrier
          : ENEMY_ARCHETYPES.hexcaster;
    const target = new Enemy(this, x, y, archetype);
    this.enemies.add(target);

    if (type === 'cluster-setup') {
      [0, 1].forEach((index) => {
        const angle = angleToPlayer + Phaser.Math.DegToRad(index === 0 ? 65 : -65);
        const add = new Enemy(
          this,
          Phaser.Math.Clamp(x + Math.cos(angle) * 64, 90, WORLD_WIDTH - 90),
          Phaser.Math.Clamp(y + Math.sin(angle) * 64, 90, WORLD_HEIGHT - 90),
          ENEMY_ARCHETYPES.swarmer,
        );
        this.enemies.add(add);
      });
    }

    return target;
  }

  private resolveBossQuestionFromSignature(
    result: { signatureHit?: { target: Enemy; consumedMark: boolean; killed: boolean } | null; ailmentConsumes?: number },
    options: {
      targetBeforeUse: Enemy | null;
      targetWasAilmented: boolean;
      currentTime: number;
    },
  ): void {
    const target = options.targetBeforeUse;
    if (this.bossQuestionStatus !== 'active' || !this.bossQuestionType) {
      return;
    }

    if (
      this.bossQuestionType === 'cluster-setup' &&
      this.selectedHero.id === 'weaver' &&
      (result.ailmentConsumes ?? 0) >= 2
    ) {
      this.resolveBossQuestionSuccess('ailment-detonation');
      return;
    }

    if (!target || target !== this.bossQuestionTarget) {
      return;
    }

    if (this.selectedHero.id === 'runner' && this.isBossQuestionTargetInsideRunnerPayoff(target)) {
      this.resolveBossQuestionSuccess('guard-slam');
      return;
    }

    if (this.selectedHero.id === 'shade' && result.signatureHit?.target === target && result.signatureHit.consumedMark) {
      this.resolveBossQuestionSuccess('mark-consume');
      return;
    }

    if (
      this.selectedHero.id === 'weaver' &&
      options.targetWasAilmented &&
      !target.isAilmented(options.currentTime) &&
      (result.ailmentConsumes ?? 0) > 0
    ) {
      this.resolveBossQuestionSuccess('ailment-detonation');
    }
  }

  private resolveBossQuestionSuccess(reason: BossQuestionSuccessReason): void {
    if (this.bossQuestionStatus !== 'active') {
      return;
    }

    const target = this.bossQuestionTarget?.active ? this.bossQuestionTarget : null;
    this.bossQuestionStatus = 'completed';
    this.bossQuestionSuccessCount += 1;
    this.bossQuestionObjective = this.getBossQuestionSuccessText(reason);
    this.bossQuestionUntilMs = this.runElapsedMs;
    this.nextBossQuestionAtMs = this.time.now + 8500;
    this.nextBossAddSpawnAtMs = Math.max(this.nextBossAddSpawnAtMs, this.time.now + 5200);

    if (target) {
      target.setEventMarker(0x4ade80);
      target.playPayoffReaction('state-break');
      this.playBossQuestionCue(target, 0x4ade80, 0xdcfce7);
      this.time.delayedCall(900, () => {
        if (target.active && this.bossQuestionStatus === 'completed') {
          target.setEventMarker(null);
        }
      });
    }

    if (this.bossEnemy?.active && this.bossEnemy.isAlive()) {
      this.bossEnemy.takeDamage(42, target ? { x: target.x, y: target.y } : undefined);
      this.playBossQuestionCue(this.bossEnemy, 0x4ade80, 0xdcfce7);
    }

    this.player.heal(3);
    const gained = this.combatStates.gainGuardTx(2).value;
    this.traitRuntime.notifyGuardGain(this.time.now, gained);
    this.abilityLoadout.reduceCooldown('signature', 260, this.time.now);
    this.cameras.main.shake(65, 0.0015);
    this.publishHudState();
  }

  private resolveBossQuestionFailure(): void {
    if (this.bossQuestionStatus !== 'active') {
      return;
    }

    const target = this.getActiveBossQuestionTarget();
    this.bossQuestionStatus = 'failed';
    this.bossQuestionFailureCount += 1;
    this.bossQuestionObjective = `${this.getBossQuestionTitle(this.bossQuestionType)} failed. Behemoth presses the lane.`;
    this.bossQuestionUntilMs = this.runElapsedMs;
    this.nextBossQuestionAtMs = this.time.now + 9000;
    this.nextBossAddSpawnAtMs = this.time.now + 3600;

    if (target) {
      target.setEventMarker(0xef4444);
      this.playBossQuestionCue(target, 0xef4444, 0xfee2e2);
      this.spawnBossQuestionFailureAdds(target, this.bossQuestionType);
      this.time.delayedCall(900, () => {
        if (target.active && this.bossQuestionStatus === 'failed') {
          target.setEventMarker(null);
        }
      });
    }

    this.cameras.main.shake(60, 0.0014);
    this.publishHudState();
  }

  private getBossObjectiveText(activeProtectorCount: number): string {
    if (this.bossQuestionStatus !== 'inactive') {
      return this.getBossQuestionObjectiveText();
    }
    return this.bossProtected ? `Break Escorts ${activeProtectorCount}` : 'Boss Vulnerable';
  }

  private getBossQuestionObjectiveText(): string {
    if (this.bossQuestionStatus === 'active') {
      const remaining = `${Math.ceil(this.getBossQuestionRemainingMs() / 1000)}s`;
      if (this.bossQuestionType === 'guard-pressure') {
        const held = Math.min(2.8, this.bossQuestionHoldMs / 1000).toFixed(1);
        return `${this.bossQuestionObjective} Hold ${held}/2.8s | ${remaining}`;
      }
      return `${this.bossQuestionObjective} ${remaining}`;
    }
    return this.bossQuestionObjective;
  }

  private getBossQuestionSnapshot(): GameplayBotRunSnapshot['bossQuestion'] {
    return {
      active: this.bossQuestionStatus === 'active',
      type: this.bossQuestionType ?? '',
      status: this.bossQuestionStatus,
      objective: this.getBossQuestionObjectiveText(),
      remainingMs: this.getBossQuestionRemainingMs(),
      successes: this.bossQuestionSuccessCount,
      failures: this.bossQuestionFailureCount,
      targetActive: Boolean(this.bossQuestionTarget?.active && this.bossQuestionTarget.isAlive()),
    };
  }

  private getBossQuestionRemainingMs(): number {
    if (this.bossQuestionStatus !== 'active') {
      return 0;
    }

    return Math.max(0, this.bossQuestionUntilMs - this.runElapsedMs);
  }

  private getActiveBossQuestionTarget(): Enemy | null {
    if (this.bossQuestionStatus !== 'active' || !this.bossQuestionTarget?.active || !this.bossQuestionTarget.isAlive()) {
      return null;
    }

    return this.bossQuestionTarget;
  }

  private isBossQuestionTargetInsideRunnerPayoff(target: Enemy): boolean {
    if (this.selectedEvolutionId === 'reckoner-drive') {
      return Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y) <= 420;
    }

    return Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y) <= 170;
  }

  private getBossQuestionDurationMs(type: BossQuestionType): number {
    return type === 'guard-pressure' ? 12_000 : type === 'priority-window' ? 11_000 : 13_000;
  }

  private getBossQuestionTitle(type: BossQuestionType | null): string {
    switch (type) {
      case 'guard-pressure':
        return 'Breach Pressure';
      case 'priority-window':
        return 'Execution Window';
      case 'cluster-setup':
      default:
        return 'Cluster Collapse';
    }
  }

  private getBossQuestionStartText(type: BossQuestionType): string {
    switch (type) {
      case 'guard-pressure':
        return 'Hold near the breach node or break it with a payoff.';
      case 'priority-window':
        return 'Break the charged node before Behemoth reinforces.';
      case 'cluster-setup':
      default:
        return 'Collapse the volatile cluster before it spreads.';
    }
  }

  private getBossQuestionSuccessText(reason: BossQuestionSuccessReason): string {
    switch (reason) {
      case 'held-zone':
        return 'Breach held. Behemoth pressure interrupted.';
      case 'target-cleared':
        return `${this.getBossQuestionTitle(this.bossQuestionType)} cleared. Behemoth exposed.`;
      case 'guard-slam':
        return 'Guard slam interrupted Behemoth pressure.';
      case 'mark-consume':
        return 'Mark execution cut Behemoth window open.';
      case 'ailment-detonation':
      default:
        return 'Ailment detonation collapsed Behemoth setup.';
    }
  }

  private getBossQuestionColor(type: BossQuestionType | null): number {
    switch (type) {
      case 'guard-pressure':
        return 0xfb923c;
      case 'priority-window':
        return 0xfef08a;
      case 'cluster-setup':
      default:
        return 0xfb7185;
    }
  }

  private playBossQuestionCue(target: Enemy, color: number, strokeColor: number): void {
    const cue = this.add.circle(target.x, target.y, Math.max(18, target.width * 0.44), color, 0.18).setDepth(9);
    cue.setStrokeStyle(4, strokeColor, 0.9);
    this.tweens.add({
      targets: cue,
      radius: Math.max(82, target.width * 1.7),
      alpha: 0,
      duration: 300,
      ease: 'Quad.Out',
      onComplete: () => cue.destroy(),
    });
  }

  private spawnBossQuestionFailureAdds(target: Enemy, type: BossQuestionType | null): void {
    const addArchetypes =
      type === 'priority-window'
        ? [ENEMY_ARCHETYPES.swarmer, ENEMY_ARCHETYPES.shooter]
        : type === 'cluster-setup'
          ? [ENEMY_ARCHETYPES.swarmer, ENEMY_ARCHETYPES.swarmer, ENEMY_ARCHETYPES.shooter]
          : [ENEMY_ARCHETYPES.swarmer, ENEMY_ARCHETYPES.anchor];

    addArchetypes.forEach((archetype, index) => {
      const angle = (Math.PI * 2 * index) / addArchetypes.length;
      const enemy = new Enemy(
        this,
        Phaser.Math.Clamp(target.x + Math.cos(angle) * 96, 90, WORLD_WIDTH - 90),
        Phaser.Math.Clamp(target.y + Math.sin(angle) * 96, 90, WORLD_HEIGHT - 90),
        archetype,
      );
      this.enemies.add(enemy);
    });
  }

  private clearBossQuestionTargetMarker(): void {
    if (this.bossQuestionTarget?.active) {
      this.bossQuestionTarget.setEventMarker(null);
    }
  }

  private clearBossQuestionWindow(): void {
    this.clearBossQuestionTargetMarker();
    this.bossQuestionTarget = null;
    this.bossQuestionType = null;
    this.bossQuestionStatus = 'inactive';
    this.bossQuestionObjective = '';
    this.bossQuestionUntilMs = 0;
    this.bossQuestionHoldMs = 0;
  }

  private spawnBossEncounter(): void {
    if (this.bossEncounterActive || this.isEnded || this.isLevelingUp || this.isTransitioningToMenu) {
      return;
    }

    this.clearStateBreakEvent();
    this.clearPressureChallengeEvent();
    (this.enemies.getChildren() as Enemy[]).forEach((enemy) => {
      if (enemy.active) {
        enemy.despawnSilently();
      }
    });
    this.clearTransientHazards();
    this.spawnDirector.clearPressureBeat();

    const bossPosition = new Phaser.Math.Vector2(
      Phaser.Math.Clamp(this.player.x + Phaser.Math.Between(-80, 80), 180, WORLD_WIDTH - 180),
      Phaser.Math.Clamp(this.player.y - 220, 180, WORLD_HEIGHT - 180),
    );
    const boss = new Enemy(this, bossPosition.x, bossPosition.y, ENEMY_ARCHETYPES.behemoth);
    this.enemies.add(boss);
    this.bossEnemy = boss;
    this.bossEncounterActive = true;
    this.bossProtectors = [];
    this.spawnBossProtectors();
    this.bossProtected = true;
    this.bossAddWaveIndex = 0;
    this.bossQuestionTarget = null;
    this.bossQuestionType = null;
    this.bossQuestionStatus = 'inactive';
    this.bossQuestionObjective = '';
    this.bossQuestionHoldMs = 0;
    this.bossQuestionIndex = 0;
    this.bossQuestionSuccessCount = 0;
    this.bossQuestionFailureCount = 0;
    this.bossEnemy.setDamageTakenMultiplier(0.18);
    this.bossEnemy.setEventMarker(0x60a5fa);
    this.nextBossAddSpawnAtMs = this.time.now + 7000;
    this.nextBossQuestionAtMs = this.time.now + 6500;
    this.bossObjectiveText = 'Break Escorts 2';
    this.publishHudState();
  }

  private spawnBossProtectors(): void {
    if (!this.bossEnemy || !this.bossEnemy.active) {
      return;
    }

    const offsets = [
      new Phaser.Math.Vector2(-150, 84),
      new Phaser.Math.Vector2(150, 84),
    ];

    this.bossProtectors = offsets.map((offset) => {
      const protector = new Enemy(this, this.bossEnemy!.x + offset.x, this.bossEnemy!.y + offset.y, ENEMY_ARCHETYPES.bulwark);
      this.enemies.add(protector);
      return protector;
    });
  }

  private spawnBossAddWave(): void {
    if (!this.bossEnemy || !this.bossEnemy.active || this.isEnded || this.isLevelingUp || this.isTransitioningToMenu) {
      return;
    }

    const addWaves = [
      [ENEMY_ARCHETYPES.swarmer, ENEMY_ARCHETYPES.swarmer, ENEMY_ARCHETYPES.shooter],
      [ENEMY_ARCHETYPES.harrier, ENEMY_ARCHETYPES.hexcaster, ENEMY_ARCHETYPES.shooter],
      [ENEMY_ARCHETYPES.bulwark, ENEMY_ARCHETYPES.skimmer, ENEMY_ARCHETYPES.anchor],
    ];
    const addArchetypes = addWaves[this.bossAddWaveIndex % addWaves.length]!;
    this.bossAddWaveIndex += 1;
    addArchetypes.forEach((archetype, index) => {
      const angle = (Math.PI * 2 * index) / addArchetypes.length;
      const x = this.bossEnemy!.x + Math.cos(angle) * 180;
      const y = this.bossEnemy!.y + Math.sin(angle) * 180;
      const enemy = new Enemy(this, x, y, archetype);
      this.enemies.add(enemy);
    });
  }

  private getActiveBossProtectors(): Enemy[] {
    return this.bossProtectors.filter((enemy) => enemy.active && enemy.isAlive());
  }

  private isBossAlive(): boolean {
    return Boolean(this.bossEnemy && this.bossEnemy.active && this.bossEnemy.isAlive());
  }

  private clearTransientHazards(): void {
    this.enemyBolts.forEach((bolt) => {
      bolt.orb.destroy();
      bolt.halo.destroy();
    });
    this.enemyBolts = [];
    this.bossTelegraphs.forEach((shape) => shape.destroy());
    this.bossTelegraphs = [];
    this.clearPressureChallengeEvent();
    this.clearBossQuestionWindow();
  }

  private clearStateBreakEvent(): void {
    if (this.stateBreakTarget?.active) {
      this.stateBreakTarget.setEventMarker(null);
    }
    this.stateBreakTarget = null;
    this.stateBreakStatus = 'inactive';
    this.stateBreakTitle = '';
    this.stateBreakObjective = '';
    this.stateBreakUntilMs = 0;
  }
}
