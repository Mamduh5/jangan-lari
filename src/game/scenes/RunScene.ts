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
import { SpawnDirector } from '../systems/SpawnDirector';
import { TraitRuntime } from '../systems/TraitRuntime';
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

    if (!this.isEnded && !this.isLevelingUp && !document.hidden) {
      this.runElapsedMs = accumulateRunElapsedMs(this.runElapsedMs, activeDelta, true, 100, RUN_TARGET_DURATION_MS);
      if (this.runElapsedMs >= RUN_TARGET_DURATION_MS && !this.isBossAlive()) {
        this.endRun(true);
      }
    }

    this.player.updateVisualState(time);

    if (this.isEnded) {
      this.player.move(new Phaser.Math.Vector2(0, 0));
      this.refreshCombatStateCounts(time);
      this.publishHudState();
      return;
    }

    if (this.isLevelingUp) {
      this.player.move(new Phaser.Math.Vector2(0, 0));
      this.refreshCombatStateCounts(time);
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
    this.updateBossEncounter(time);
    this.updateEnemies(time);
    this.spawnIfDue(time);

    if (this.pendingLevelUps > 0 && !this.isLevelingUp) {
      this.beginLevelUp();
    }

    this.publishHudState();
  }

  selectReward(index: number): void {
    if (!this.isLevelingUp) {
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
    clearRunRegistryState(this.registry, this.saveData.totalGold);
    if (this.scene.isActive('UIScene')) {
      this.scene.stop('UIScene');
    }
    this.scene.stop('RunScene');
    this.scene.start('MenuScene');
  }

  spawnEnemyWave(): void {
    const result = this.spawnDirector.nextWave(this.runElapsedMs);
    result.wave.forEach((archetype, index) => this.spawnEnemy(archetype, index, result.wave.length));
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
    if (this.isEnded) {
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
        isEventTarget: false,
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
          this.abilityLoadout.reduceCooldown(
            'signature',
            this.traitRuntime.getSignatureMarkedCooldownRefundMs(),
            currentTime,
          );
        }
      }
    }
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
    const damageBonus = this.traitRuntime.getPrimaryDamageBonus({
      heroId: this.selectedHero.id,
      abilityId: sourceAbilityId,
      isCloseRange,
      guardActive,
      targetWasMarked,
      targetWasDisrupted,
      targetWasAilmented,
    });
    const metaDamageBonus = getPermanentUpgradeLevel(this.saveData, 'starting-damage') * 2;
    enemy.takeDamage(projectile.getDamage() + damageBonus + metaDamageBonus, { x: projectile.x, y: projectile.y });

    if (sourceAbilityId === 'brace-shot') {
      const gained = this.traitRuntime.getGuardGainOnPrimaryHit({
        heroId: this.selectedHero.id,
        abilityId: sourceAbilityId,
        isCloseRange,
        guardActive,
        targetWasMarked,
        targetWasDisrupted,
        targetWasAilmented,
      });
      if (gained > 0) {
        const actualGain = this.combatStates.gainGuard(gained);
        this.traitRuntime.notifyGuardGain(currentTime, actualGain);
      }
    }

    if (sourceAbilityId === 'seeker-burst') {
      const markDuration = this.traitRuntime.getMarkDurationMs(getAbilityDefinition('seeker-burst').markDurationMs ?? 1600);
      this.combatStates.applyMark(enemy, currentTime, markDuration);
      this.markApplyCount += 1;
    }

    if (sourceAbilityId === 'spotter-drone') {
      const disruptedDuration = this.traitRuntime.getDisruptedDurationMs(
        getAbilityDefinition('spotter-drone').disruptedDurationMs ?? 1500,
      );
      this.combatStates.applyDisrupted(enemy, currentTime, disruptedDuration);
      this.disruptedApplyCount += 1;
    }

    if (sourceAbilityId === 'cinder-needles' || sourceAbilityId === 'contagion-node') {
      const ailmentDuration = this.traitRuntime.getAilmentDurationMs(
        getAbilityDefinition(sourceAbilityId).ailmentDurationMs ?? 2100,
      );
      this.combatStates.applyAilment(enemy, currentTime, ailmentDuration);
      this.ailmentApplyCount += 1;
    }

    projectile.deactivate();
  }

  private handleEnemyContact(enemy: Enemy): void {
    if (!enemy.active || !enemy.isAlive()) {
      return;
    }
    this.applyDamageToPlayer(enemy.contactDamage);
  }

  private applyDamageToPlayer(amount: number): void {
    if (this.isEnded || this.isLevelingUp) {
      return;
    }

    const guarded = this.combatStates.absorbDamage(amount);
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
    if (!gem.active || this.isEnded) {
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
      if (!enemy.active || !enemy.consumeDeathRewardPending()) {
        return;
      }
      this.handleEnemyDeath(enemy);
    });
  }

  private handleEnemyDeath(enemy: Enemy): void {
    this.killCount += 1;
    this.handleExperienceGain(enemy.getXpValue());
    const enemyWasMarked = enemy.isMarked(this.time.now);
    const guardGain = this.traitRuntime.getGuardGainOnKill({
      heroId: this.selectedHero.id,
      enemyWasMarked,
    });
    if (guardGain > 0) {
      const actualGain = this.combatStates.gainGuard(guardGain);
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

  private spawnEnemy(archetype: EnemyArchetype, index: number, count: number): void {
    const spawnPosition = this.getSpawnPosition(index, count);
    const enemy = new Enemy(this, spawnPosition.x, spawnPosition.y, archetype);
    this.enemies.add(enemy);
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
    this.enemyBolts.forEach((bolt) => {
      bolt.orb.destroy();
      bolt.halo.destroy();
    });
    this.enemyBolts = [];
    this.bossTelegraphs.forEach((shape) => shape.destroy());
    this.bossTelegraphs = [];
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

  private updateBossEncounter(currentTime: number): void {
    if (!this.bossEncounterActive && !this.isEnded && this.runElapsedMs >= BOSS_TRIGGER_TIME_MS) {
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
    this.bossObjectiveText = this.bossProtected
      ? `Break Escorts ${activeProtectors.length}`
      : 'Boss Vulnerable';

    if (currentTime >= this.nextBossAddSpawnAtMs) {
      this.spawnBossAddWave();
      this.nextBossAddSpawnAtMs = currentTime + 9000;
    }
  }

  private spawnBossEncounter(): void {
    if (this.bossEncounterActive || this.isEnded) {
      return;
    }

    (this.enemies.getChildren() as Enemy[]).forEach((enemy) => {
      if (enemy.active) {
        enemy.despawnSilently();
      }
    });
    this.enemyBolts.forEach((bolt) => {
      bolt.orb.destroy();
      bolt.halo.destroy();
    });
    this.enemyBolts = [];
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
    this.bossEnemy.setDamageTakenMultiplier(0.18);
    this.bossEnemy.setEventMarker(0x60a5fa);
    this.nextBossAddSpawnAtMs = this.time.now + 7000;
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
    if (!this.bossEnemy || !this.bossEnemy.active) {
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
}
