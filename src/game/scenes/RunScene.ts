import Phaser from 'phaser';
import {
  ENEMY_SPAWN_INTERVAL_MS,
  GAME_WIDTH,
  RUN_TARGET_DURATION_MS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../config/constants';
import { getAbilityDefinition } from '../data/abilities';
import { ENEMY_ARCHETYPES, type EnemyArchetype, type EnemyArchetypeId } from '../data/enemies';
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
  private markApplyCount = 0;
  private markConsumeCount = 0;
  private goldEarned = 0;
  private xpGemSpawnCount = 0;
  private xpGemCollectCount = 0;

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
    this.markApplyCount = 0;
    this.markConsumeCount = 0;
    this.goldEarned = 0;
    this.xpGemSpawnCount = 0;
    this.xpGemCollectCount = 0;

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
      if (this.runElapsedMs >= RUN_TARGET_DURATION_MS) {
        this.endRun(true);
      }
    }

    this.player.updateVisualState(time);
    this.updateXPGems();
    this.updateProjectiles(activeDelta);
    this.updateEnemyBolts(activeDelta);
    this.harvestPendingDeaths();
    this.refreshMarkedEnemyCount(time);

    if (this.isEnded) {
      this.player.move(new Phaser.Math.Vector2(0, 0));
      this.publishHudState();
      return;
    }

    if (this.isLevelingUp) {
      this.player.move(new Phaser.Math.Vector2(0, 0));
      this.publishHudState();
      return;
    }

    this.player.move(this.readMovementInput());
    this.attemptAbilityUse(time);
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
    this.registry.set('run.levelUpActive', this.isLevelingUp);
    this.registry.set('run.levelUpChoices', this.currentRewardChoices);
    this.registry.set('run.traits', this.traitRuntime.getSelectedTraitIds().map((id) => getTraitDefinition(id)?.title ?? id));
    this.registry.set('run.markedEnemies', this.markedEnemyCount);
    this.registry.set(
      'run.stateLabel',
      this.selectedHero.stateAffinity === 'guard'
        ? `Guard ${this.combatStates.getGuard()}/${this.combatStates.getMaxGuard()}`
        : `Marked Enemies ${this.markedEnemyCount}`,
    );
    this.registry.set('run.weaponNames', [primary.name, signature.name]);
    this.registry.set('run.abilityLabels', [
      `Primary: ${primary.shortLabel} ${primary.name} (${Math.ceil(this.abilityLoadout.getRemainingCooldownMs('primary', this.time.now) / 100) / 10}s)`,
      `Signature: ${signature.shortLabel} ${signature.name} (${Math.ceil(this.abilityLoadout.getRemainingCooldownMs('signature', this.time.now) / 100) / 10}s)`,
      'Support: Locked',
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
      weaponCount: 2,
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
      },
      markedEnemies: this.markedEnemyCount,
      markApplyCount: this.markApplyCount,
      markConsumeCount: this.markConsumeCount,
      xpGemSpawnCount: this.xpGemSpawnCount,
      xpGemCollectCount: this.xpGemCollectCount,
      enemies,
      xpGems,
      upgradeChoices: this.currentRewardChoices.map((reward) => ({
        id: reward.id,
        title: reward.title,
      })),
      waveTemplate: {
        id: this.spawnDirector.getLastWaveTemplateId(),
        label: this.spawnDirector.getLastWaveTemplateLabel(),
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

    const signature = this.abilityLoadout.getAbility('signature');
    if (signature && this.abilityLoadout.canUse('signature', currentTime)) {
      if (this.selectedHero.id === 'runner' && this.combatStates.getGuard() < 6) {
        return;
      }

      const result = this.abilityResolver.tryUseAbility('signature', signature, currentTime);
      if (result.used) {
        this.abilityLoadout.commitUse('signature', currentTime);
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
    if (signal.type !== 'ranged-shot') {
      return;
    }

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
    const targetWasMarked = enemy.isMarked(currentTime);
    const damageBonus = this.traitRuntime.getPrimaryDamageBonus({
      heroId: this.selectedHero.id,
      abilityId: sourceAbilityId,
      isCloseRange,
      targetWasMarked,
    });
    const metaDamageBonus = getPermanentUpgradeLevel(this.saveData, 'starting-damage') * 2;
    enemy.takeDamage(projectile.getDamage() + damageBonus + metaDamageBonus, { x: projectile.x, y: projectile.y });

    if (sourceAbilityId === 'brace-shot') {
      const gained = this.traitRuntime.getGuardGainOnPrimaryHit({
        heroId: this.selectedHero.id,
        abilityId: sourceAbilityId,
        isCloseRange,
        targetWasMarked,
      });
      if (gained > 0) {
        this.combatStates.gainGuard(gained);
      }
    }

    if (sourceAbilityId === 'seeker-burst') {
      const markDuration = this.traitRuntime.getMarkDurationMs(getAbilityDefinition('seeker-burst').markDurationMs ?? 1600);
      this.combatStates.applyMark(enemy, currentTime, markDuration);
      this.markApplyCount += 1;
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
    if (this.isEnded) {
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
      this.combatStates.gainGuard(guardGain);
    }
    const gem = new XPGem(this, enemy.x, enemy.y, enemy.getXpValue());
    this.xpGems.add(gem);
    this.xpGemSpawnCount += 1;
  }

  private refreshMarkedEnemyCount(currentTime: number): void {
    this.markedEnemyCount = (this.enemies.getChildren() as Enemy[]).filter(
      (enemy) => enemy.active && enemy.isAlive() && enemy.isMarked(currentTime),
    ).length;
  }

  private beginLevelUp(): void {
    this.isLevelingUp = true;
    this.physics.world.pause();
    this.currentRewardChoices = this.levelUpDirector.buildChoices(this.selectedHero.id, this.traitRuntime);
    this.publishHudState();
  }

  private applyReward(reward: RewardDefinition): void {
    if (reward.category === 'trait' && reward.traitId) {
      this.traitRuntime.addTrait(reward.traitId);
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
      `${victory ? 'Held the line' : 'Run collapsed'} at ${Math.floor(this.runElapsedMs / 1000)}s.\nKills ${this.killCount}  |  Level ${this.player.getLevel()}  |  Gold +${reward}${
        questResolution.rewardMessages.length > 0 ? `\n${questResolution.rewardMessages.join('\n')}` : ''
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
  }
}
