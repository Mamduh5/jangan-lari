import Phaser from 'phaser';
import { playCue, playHeroIntroCue } from '../audio/audioCuePlayer';
import { CombatResponseController, resolveCombatImpactResponse } from '../combat/combatResponse';
import {
  ELITE_SPAWN_INDICATOR_MS,
  ENDING_FLASH_MS,
  ENEMY_SPAWN_INTERVAL_MS,
  GAME_WIDTH,
  LEVEL_UP_FLASH_MS,
  PLAYER_HIT_SHAKE_DURATION_MS,
  PLAYER_HIT_SHAKE_INTENSITY,
  RUN_TARGET_DURATION_MS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../config/constants';
import { HEROES } from '../data/heroes';
import { UPGRADE_POOL, type UpgradeDefinition, type UpgradeId } from '../data/upgrades';
import { WEAPON_DEFINITIONS, type WeaponDefinition, type WeaponId } from '../data/weapons';
import { Enemy, type EnemyAttackSignal } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { XPGem } from '../entities/XPGem';
import { createMovementKeys, type MovementKeys } from '../input/createMovementKeys';
import type { GameplayBotRunSnapshot } from '../debug/gameplaySnapshot';
import type { GameSaveData } from '../save/saveData';
import { loadGameSave } from '../save/saveData';
import { applyRunProgressToQuests } from '../save/saveQuests';
import { awardRunGold, getPermanentUpgradeLevel } from '../save/saveUpgrades';
import { AutoFireWeapon } from '../systems/AutoFireWeapon';
import { SpawnDirector } from '../systems/SpawnDirector';
import {
  accumulateRunElapsedMs,
  beginLevelUpCountdown,
  calculateRunGoldReward,
  chooseRandomValidIndex,
  clearRunRegistryState,
  createFreshRunSessionState,
  tickLevelUpCountdown,
  writeFreshRunRegistryState,
} from '../utils/runSession';

export class RunScene extends Phaser.Scene {
  private player!: Player;
  private enemies!: Phaser.Physics.Arcade.Group;
  private xpGems!: Phaser.Physics.Arcade.Group;
  private weapons: AutoFireWeapon[] = [];
  private ownedWeaponIds = new Set<string>();
  private spawnDirector!: SpawnDirector;
  private saveData!: GameSaveData;
  private movementKeys!: MovementKeys;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private colliders: Phaser.Physics.Arcade.Collider[] = [];
  private combatResponse!: CombatResponseController;
  private combatResponseImpactCounts: Partial<Record<WeaponId, number>> = {};
  private shockwaveAttacks: Array<{
    ring: Phaser.GameObjects.Arc;
    halo: Phaser.GameObjects.Arc;
    x: number;
    y: number;
    maxRadius: number;
    currentRadius: number;
    durationMs: number;
    elapsedMs: number;
    thickness: number;
    damage: number;
    hasHitPlayer: boolean;
  }> = [];
  private runElapsedMs = 0;
  private pendingLevelUps = 0;
  private levelUpRemainingMs = 0;
  private killCount = 0;
  private eliteKillCount = 0;
  private goldEarned = 0;
  private isEnded = false;
  private isLevelingUp = false;
  private isSystemPaused = false;
  private isTransitioningToMenu = false;
  private isResolvingLevelUpChoice = false;
  private rewardToastToken = 0;
  private alertToken = 0;
  private activeAlertPriority = 0;
  private activeAlertKind = 'objective';
  private activeAlertUntil = 0;
  private queuedRewardToast: { text: string; color: string } | null = null;

  // These modifiers stack from heroes, permanent upgrades, and level-up picks.
  private globalWeaponDamageBonus = 0;
  private globalWeaponCooldownReduction = 0;
  private globalProjectileSpeedBonus = 0;
  private globalWeaponRangeBonus = 0;

  private readonly handlePageVisibilityChange = (): void => {
    this.refreshSystemPauseState();
  };

  private readonly handleWindowBlur = (): void => {
    this.refreshSystemPauseState();
  };

  private readonly handleWindowFocus = (): void => {
    this.refreshSystemPauseState();
  };

  constructor() {
    super('RunScene');
  }

  create(): void {
    this.saveData = loadGameSave();

    const freshSession = createFreshRunSessionState();
    this.runElapsedMs = freshSession.runElapsedMs;
    this.pendingLevelUps = freshSession.pendingLevelUps;
    this.levelUpRemainingMs = freshSession.levelUpRemainingMs;
    this.killCount = freshSession.killCount;
    this.eliteKillCount = freshSession.eliteKillCount;
    this.goldEarned = freshSession.goldEarned;
    this.isEnded = freshSession.isEnded;
    this.isLevelingUp = freshSession.isLevelingUp;
    this.isSystemPaused = freshSession.isSystemPaused;
    this.isTransitioningToMenu = freshSession.isTransitioningToMenu;
    this.isResolvingLevelUpChoice = freshSession.isResolvingLevelUpChoice;
    this.globalWeaponDamageBonus = freshSession.globalWeaponDamageBonus;
    this.globalWeaponCooldownReduction = freshSession.globalWeaponCooldownReduction;
    this.globalProjectileSpeedBonus = freshSession.globalProjectileSpeedBonus;
    this.globalWeaponRangeBonus = freshSession.globalWeaponRangeBonus;
    this.weapons = [];
    this.colliders = [];
    this.shockwaveAttacks = [];
    this.ownedWeaponIds.clear();
    this.combatResponseImpactCounts = {};

    const selectedHero = HEROES[this.saveData.selectedHero];

    this.cameras.main.setBackgroundColor('#111827');
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.drawArena();

    this.player = new Player(this, WORLD_WIDTH / 2, WORLD_HEIGHT / 2, selectedHero);
    this.enemies = this.physics.add.group({ runChildUpdate: false });
    this.xpGems = this.physics.add.group({ runChildUpdate: false });
    this.spawnDirector = new SpawnDirector();
    this.movementKeys = createMovementKeys(this);
    this.combatResponse = new CombatResponseController({
      onHitStopStart: () => this.pauseCombatResponseSystems(),
      onHitStopEnd: () => this.resumeCombatResponseSystems(),
      onImpactCue: (cue) => {
        this.createBurstCircle(cue.x, cue.y, cue.color, cue.startRadius, cue.endRadius, cue.durationMs, cue.alpha);
      },
    });

    this.registerWeapon(WEAPON_DEFINITIONS[selectedHero.startingWeaponId]);
    this.applyPermanentUpgrades();
    this.applyHeroBonuses();

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(1);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.colliders.push(
      this.physics.add.overlap(this.player, this.enemies, (_playerObject, enemyObject) => {
        if (enemyObject instanceof Enemy) {
          this.handlePlayerEnemyOverlap(enemyObject);
        }
      }),
    );

    this.colliders.push(
      this.physics.add.overlap(this.player, this.xpGems, (_playerObject, gemObject) => {
        if (gemObject instanceof XPGem) {
          this.collectXPGem(gemObject);
        }
      }),
    );

    this.spawnTimer = this.time.addEvent({
      delay: ENEMY_SPAWN_INTERVAL_MS,
      loop: true,
      callback: this.spawnEnemyWave,
      callbackScope: this,
    });

    writeFreshRunRegistryState(this.registry, selectedHero.name, this.saveData.totalGold);
    this.publishHudState();
    this.presentHeroIntro(selectedHero);

    document.addEventListener('visibilitychange', this.handlePageVisibilityChange);
    window.addEventListener('blur', this.handleWindowBlur);
    window.addEventListener('focus', this.handleWindowFocus);

    this.input.keyboard?.on('keydown-ESC', this.handleExitToMenu, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    this.refreshSystemPauseState();
  }

  update(_time: number, delta: number): void {
    if (!this.player) {
      return;
    }

    this.combatResponse.update(delta);
    this.player.updateVisualState(this.time.now);

    if (this.isEnded || this.isTransitioningToMenu) {
      this.publishHudState();
      return;
    }

    if (this.isSystemPaused) {
      this.publishHudState();
      return;
    }

    if (this.combatResponse.isHitStopActive()) {
      this.publishHudState();
      return;
    }

    if (this.isLevelingUp) {
      this.updateLevelUpCountdown(delta);
      this.publishHudState();
      return;
    }

    this.runElapsedMs = accumulateRunElapsedMs(this.runElapsedMs, delta, true);
    if (this.runElapsedMs >= RUN_TARGET_DURATION_MS) {
      this.endRun(true, 'Victory', 'You survived until extraction.');
      return;
    }

    const horizontal =
      Number(this.movementKeys.right.isDown || this.movementKeys.altRight.isDown) -
      Number(this.movementKeys.left.isDown || this.movementKeys.altLeft.isDown);
    const vertical =
      Number(this.movementKeys.down.isDown || this.movementKeys.altDown.isDown) -
      Number(this.movementKeys.up.isDown || this.movementKeys.altUp.isDown);

    this.player.move(new Phaser.Math.Vector2(horizontal, vertical));
    this.updateEnemies();
    this.updateShockwaveAttacks(delta);
    this.updateGems();

    for (const weapon of this.weapons) {
      weapon.update(this.time.now, delta);
    }

    this.publishHudState();
  }

  public exitToMenu(): void {
    if (this.isTransitioningToMenu) {
      return;
    }

    this.isTransitioningToMenu = true;
    this.pauseGameplaySystems();
    clearRunRegistryState(this.registry, this.saveData?.totalGold ?? Number(this.registry.get('save.totalGold') ?? 0));

    const sceneManager = this.game.scene;

    if (sceneManager.isActive('UIScene')) {
      sceneManager.stop('UIScene');
    }

    sceneManager.stop('RunScene');
    sceneManager.start('MenuScene');
  }

  public getGameplayBotSnapshot(): GameplayBotRunSnapshot {
    const levelUpChoices = (this.registry.get('run.levelUpChoices') ?? []) as UpgradeDefinition[];
    const activeEnemies = this.enemies?.active ? (this.enemies.getChildren() as Enemy[]) : [];
    const activeGems = this.xpGems?.active ? (this.xpGems.getChildren() as XPGem[]) : [];

    const enemies = activeEnemies
      .filter((enemy) => enemy.active && enemy.isAlive())
      .map((enemy) => ({
        x: enemy.x,
        y: enemy.y,
        distance: Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y),
        contactDamage: enemy.contactDamage,
        isElite: enemy.isElite() || enemy.isMiniboss(),
        isBoss: enemy.isBoss(),
      }))
      .sort((left, right) => left.distance - right.distance)
      .slice(0, 14);

    const xpGems = activeGems
      .filter((gem) => gem.active)
      .map((gem) => ({
        x: gem.x,
        y: gem.y,
        distance: Phaser.Math.Distance.Between(this.player.x, this.player.y, gem.x, gem.y),
        value: gem.getValue(),
      }))
      .sort((left, right) => left.distance - right.distance)
      .slice(0, 10);
    const combatResponseMetrics = this.combatResponse.getMetrics();

    return {
      elapsedMs: this.runElapsedMs,
      hp: this.player.getCurrentHealth(),
      maxHp: this.player.getMaxHealth(),
      level: this.player.getLevel(),
      kills: this.killCount,
      weaponCount: this.weapons.length,
      weaponNames: this.weapons.map((weapon) => weapon.getStats().name),
      goldEarned: this.goldEarned,
      levelUpActive: Boolean(this.registry.get('run.levelUpActive')),
      endActive: Boolean(this.registry.get('run.endActive')),
      victory: Boolean(this.registry.get('run.victory')),
      endTitle: String(this.registry.get('run.endTitle') ?? ''),
      player: {
        x: this.player.x,
        y: this.player.y,
        moveSpeed: this.player.getMoveSpeed(),
        pickupRange: this.player.getPickupRange(),
      },
      enemies,
      xpGems,
      upgradeChoices: levelUpChoices.map((choice) => ({
        id: choice.id,
        title: choice.title,
      })),
      combatResponse: {
        hitStopStarts: combatResponseMetrics.hitStopStarts,
        hitStopRefreshes: combatResponseMetrics.hitStopRefreshes,
        hitStopSuppressions: combatResponseMetrics.hitStopSuppressions,
        hitStopActive: this.combatResponse.isHitStopActive(),
        weaponImpactCounts: { ...this.combatResponseImpactCounts },
      },
    };
  }

  selectLevelUp(index: number): void {
    if (!this.isLevelingUp || this.isEnded || this.isResolvingLevelUpChoice) {
      return;
    }

    const choices = this.registry.get('run.levelUpChoices') as UpgradeDefinition[] | undefined;
    const selectedUpgrade = choices?.[index];
    if (!selectedUpgrade) {
      return;
    }

    this.isResolvingLevelUpChoice = true;
    this.levelUpRemainingMs = 0;
    this.registry.set('run.levelUpRemainingMs', 0);
    this.applyUpgrade(selectedUpgrade.id);
    this.pendingLevelUps = Math.max(0, this.pendingLevelUps - 1);

    if (this.pendingLevelUps > 0) {
      this.isResolvingLevelUpChoice = false;
      this.presentLevelUpChoices();
      this.publishHudState();
      return;
    }

    this.finishLevelUpSelection();
  }

  private registerWeapon(definition: WeaponDefinition, announce = false): void {
    if (this.ownedWeaponIds.has(definition.id)) {
      return;
    }

    const weapon = new AutoFireWeapon(this, this.player, this.enemies, definition);
    this.applyWeaponModifiersTo(weapon);
    this.weapons.push(weapon);
    this.ownedWeaponIds.add(definition.id);

    this.colliders.push(
      this.physics.add.overlap(weapon.getProjectiles(), this.enemies, (projectileObject, enemyObject) => {
        if (projectileObject instanceof Projectile && enemyObject instanceof Enemy) {
          this.handleProjectileEnemyOverlap(projectileObject, enemyObject);
        }
      }),
    );

    if (announce) {
      this.showFloatingText(this.player.x, this.player.y - 62, `${definition.name} online`, '#bfdbfe', 20);
      this.createBurstCircle(this.player.x, this.player.y, definition.projectileColor, 22, 70, 220, 0.9);
      this.cameras.main.flash(120, 140, 190, 255, false);
    }
  }

  private applyPermanentUpgrades(): void {
    const maxHpLevel = getPermanentUpgradeLevel(this.saveData, 'max-hp');
    const moveSpeedLevel = getPermanentUpgradeLevel(this.saveData, 'move-speed');
    const pickupRangeLevel = getPermanentUpgradeLevel(this.saveData, 'pickup-range');
    const startingDamageLevel = getPermanentUpgradeLevel(this.saveData, 'starting-damage');

    if (maxHpLevel > 0) {
      this.player.addMaxHealth(maxHpLevel * 10);
    }

    if (moveSpeedLevel > 0) {
      this.player.addMoveSpeed(moveSpeedLevel * 8);
    }

    if (pickupRangeLevel > 0) {
      this.player.addPickupRange(pickupRangeLevel * 12);
    }

    if (startingDamageLevel > 0) {
      this.applyWeaponDamageBonus(startingDamageLevel * 3);
    }
  }

  private applyHeroBonuses(): void {
    const hero = HEROES[this.saveData.selectedHero];

    if (hero.maxHealthBonus !== 0) {
      this.player.addMaxHealth(hero.maxHealthBonus);
    }

    if (hero.moveSpeedBonus !== 0) {
      this.player.addMoveSpeed(hero.moveSpeedBonus);
    }

    if (hero.pickupRangeBonus !== 0) {
      this.player.addPickupRange(hero.pickupRangeBonus);
    }

    if (hero.startingDamageBonus !== 0) {
      this.applyWeaponDamageBonus(hero.startingDamageBonus);
    }

    if (hero.fireCooldownReductionMs !== 0) {
      this.applyWeaponCooldownReduction(hero.fireCooldownReductionMs);
    }
  }

  private drawArena(): void {
    const graphics = this.add.graphics();

    graphics.fillStyle(0x152238, 1);
    graphics.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    graphics.fillStyle(0x0f172a, 0.65);
    for (let x = 0; x < WORLD_WIDTH; x += 160) {
      for (let y = 0; y < WORLD_HEIGHT; y += 160) {
        if ((x + y) % 320 === 0) {
          graphics.fillRect(x, y, 160, 160);
        }
      }
    }

    graphics.lineStyle(2, 0x243247, 0.7);
    for (let x = 0; x <= WORLD_WIDTH; x += 80) {
      graphics.lineBetween(x, 0, x, WORLD_HEIGHT);
    }

    for (let y = 0; y <= WORLD_HEIGHT; y += 80) {
      graphics.lineBetween(0, y, WORLD_WIDTH, y);
    }

    graphics.lineStyle(6, 0x475569, 1);
    graphics.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    const arenaCenter = this.add.circle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 90, 0x1d4ed8, 0.16);
    arenaCenter.setStrokeStyle(4, 0x93c5fd, 0.5);
  }

  private spawnEnemyWave(): void {
    if (this.isEnded || this.isLevelingUp || this.isSystemPaused || !this.enemies?.active) {
      return;
    }

    const wave = this.spawnDirector.nextWave(this.runElapsedMs);

    for (const archetype of wave) {
      const spawnPoint = this.getSpawnPoint(archetype.isBoss ? 700 : 520);
      const enemy = new Enemy(this, spawnPoint.x, spawnPoint.y, archetype);
      this.enemies.add(enemy);

      if (archetype.isBoss) {
        this.registry.set('run.instructions', 'Boss sighted. Defeat it or survive to extraction.');
        this.setAlert('boss', 'Final boss active', 2600);
        this.showSpawnIndicator(spawnPoint.x, spawnPoint.y, 'BOSS', 0xfca5a5);
        this.showEncounterBanner('FINAL BOSS', `${archetype.name} has arrived. Watch the charge and break it for victory.`, 0xf87171, 2600);
        this.cameras.main.flash(180, 255, 120, 120, false);
        playCue('boss-arrival');
      } else if (archetype.isMiniboss) {
        this.registry.set('run.instructions', 'Miniboss approaching. Break the charge and claim the reward.');
        this.setAlert('miniboss', 'Miniboss active', 2200);
        this.showSpawnIndicator(spawnPoint.x, spawnPoint.y, 'MINIBOSS', 0xfda4af);
        this.showEncounterBanner('MINIBOSS', `${archetype.name} enters the arena. Beat it for bonus gold and a free upgrade.`, 0xfda4af, 2200);
        this.cameras.main.flash(120, 255, 180, 180, false);
        playCue('miniboss-arrival');
      } else if (archetype.isElite) {
        this.registry.set('run.instructions', 'Elite enemy incoming. Keep moving.');
        this.setAlert('elite', 'Elite target active', 1600);
        this.showSpawnIndicator(spawnPoint.x, spawnPoint.y, 'ELITE', 0xe9d5ff);
        this.showEncounterBanner('ELITE TARGET', `${archetype.name} is carrying a reward cache.`, 0xe9d5ff, 1500);
        this.cameras.main.flash(90, 190, 150, 255, false);
      }
    }
  }

  private getSpawnPoint(distance: number): Phaser.Math.Vector2 {
    const side = Phaser.Math.Between(0, 3);
    const offset = Phaser.Math.Between(-260, 260);

    switch (side) {
      case 0:
        return new Phaser.Math.Vector2(
          Phaser.Math.Clamp(this.player.x + offset, 24, WORLD_WIDTH - 24),
          Phaser.Math.Clamp(this.player.y - distance, 24, WORLD_HEIGHT - 24),
        );
      case 1:
        return new Phaser.Math.Vector2(
          Phaser.Math.Clamp(this.player.x + distance, 24, WORLD_WIDTH - 24),
          Phaser.Math.Clamp(this.player.y + offset, 24, WORLD_HEIGHT - 24),
        );
      case 2:
        return new Phaser.Math.Vector2(
          Phaser.Math.Clamp(this.player.x + offset, 24, WORLD_WIDTH - 24),
          Phaser.Math.Clamp(this.player.y + distance, 24, WORLD_HEIGHT - 24),
        );
      default:
        return new Phaser.Math.Vector2(
          Phaser.Math.Clamp(this.player.x - distance, 24, WORLD_WIDTH - 24),
          Phaser.Math.Clamp(this.player.y + offset, 24, WORLD_HEIGHT - 24),
        );
    }
  }

  private updateEnemies(): void {
    if (!this.enemies?.active) {
      return;
    }

    const enemyChildren = this.enemies.getChildren() as Enemy[];

    for (const enemy of enemyChildren) {
      const attackSignal = enemy.chase(this.player, this.time.now);
      if (attackSignal) {
        this.handleEnemyAttackSignal(enemy, attackSignal);
      }
      enemy.updatePresentation(this.time.now);
    }
  }

  private updateShockwaveAttacks(deltaMs: number): void {
    if (this.shockwaveAttacks.length === 0) {
      return;
    }

    const nextAttacks: typeof this.shockwaveAttacks = [];

    for (const attack of this.shockwaveAttacks) {
      attack.elapsedMs += deltaMs;
      const progress = Phaser.Math.Clamp(attack.elapsedMs / attack.durationMs, 0, 1);
      attack.currentRadius = Phaser.Math.Linear(52, attack.maxRadius, progress);
      attack.ring.setRadius(attack.currentRadius);
      attack.ring.setAlpha(0.92 - progress * 0.48);
      attack.ring.setStrokeStyle(Math.max(8, 14 - progress * 4), progress < 0.22 ? 0xffffff : 0xfca5a5, 0.95);
      attack.halo.setRadius(attack.currentRadius + attack.thickness * 0.7);
      attack.halo.setAlpha(0.16 - progress * 0.12);

      if (!attack.hasHitPlayer) {
        const playerDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, attack.x, attack.y);
        if (Math.abs(playerDistance - attack.currentRadius) <= attack.thickness + 18) {
          attack.hasHitPlayer = true;
          const tookDamage = this.player.takeDamage(attack.damage, this.time.now);
          if (tookDamage) {
            this.cameras.main.shake(110, PLAYER_HIT_SHAKE_INTENSITY * 1.15);
            this.createBurstCircle(this.player.x, this.player.y, 0xfca5a5, 14, 42, 220, 0.8);
            this.showFloatingText(this.player.x, this.player.y - 24, `${attack.damage}`, '#fecaca', 18);

            if (!this.player.isAlive()) {
              attack.ring.destroy();
              attack.halo.destroy();
              this.endRun(false, 'Defeat', 'You were overwhelmed.');
              continue;
            }
          }
        }
      }

      if (progress >= 1) {
        attack.ring.destroy();
        attack.halo.destroy();
        continue;
      }

      nextAttacks.push(attack);
    }

    this.shockwaveAttacks = nextAttacks;
  }

  private updateGems(): void {
    if (!this.xpGems?.active) {
      return;
    }

    const gems = this.xpGems.getChildren() as XPGem[];

    for (const gem of gems) {
      gem.update(this.player);
    }
  }

  private handleProjectileEnemyOverlap(projectile: Projectile, enemy: Enemy): void {
    if (!projectile.active || !enemy.active || this.isEnded) {
      return;
    }

    const enemyX = enemy.x;
    const enemyY = enemy.y;
    const xpValue = enemy.getXpValue();
    const wasBoss = enemy.isBoss();
    const wasMiniboss = enemy.isMiniboss();
    const wasElite = enemy.isElite();
    const damage = projectile.getDamage();
    const impactColor = projectile.getVisualColor();
    const impactRadius = projectile.getVisualRadius();
    const shouldDeactivate = projectile.consumeHit();
    const explosionRadius = projectile.getExplosionRadius();
    const explosionDamage = projectile.getExplosionDamage();
    const enemyDied = enemy.takeDamage(damage, { x: projectile.x, y: projectile.y });
    const baseBurstRadius = Math.max(12, impactRadius * 2.2);
    const impactFlashRadius = explosionRadius > 0 ? Math.max(baseBurstRadius, explosionRadius * 0.45) : baseBurstRadius;

    this.createBurstCircle(enemyX, enemyY, impactColor, Math.max(5, impactRadius * 0.7), impactFlashRadius, 90, 0.22);
    this.createBurstCircle(enemyX, enemyY, 0xffffff, Math.max(3, impactRadius * 0.28), Math.max(8, impactRadius * 1.15), 70, 0.18);
    this.applyCombatImpactResponse(projectile.getWeaponId(), enemy, enemyDied, enemyX, enemyY, impactColor, impactRadius, true);

    if (enemyDied) {
      this.showFloatingText(enemyX, enemyY - 16, `${damage}`, wasBoss ? '#fca5a5' : Phaser.Display.Color.IntegerToColor(impactColor).rgba, 18);
      this.createBurstCircle(enemyX, enemyY, wasBoss ? 0xfca5a5 : impactColor, 10, wasBoss ? 58 : Math.max(34, impactRadius * 4), 220, 0.9);
      this.createBurstCircle(enemyX, enemyY, 0xffffff, 6, wasBoss ? 74 : Math.max(26, impactRadius * 2.8), 160, 0.3);
      this.handleEnemyDefeated(enemy, enemyX, enemyY, xpValue, wasBoss, wasMiniboss, wasElite);
    } else if (wasBoss || wasMiniboss || wasElite || damage >= 18) {
      this.showFloatingText(enemyX, enemyY - 16, `${damage}`, wasBoss || wasMiniboss ? '#ffffff' : '#dbeafe', 16);
    }

    if (explosionRadius > 0 && explosionDamage > 0) {
      this.applyProjectileExplosion(enemyX, enemyY, explosionRadius, explosionDamage, enemy, impactColor);
    }

    if (shouldDeactivate) {
      projectile.deactivate();
    }
  }

  private handlePlayerEnemyOverlap(enemy: Enemy): void {
    if (this.isEnded || this.isLevelingUp || this.isSystemPaused) {
      return;
    }

    const tookDamage = this.player.takeDamage(enemy.contactDamage, this.time.now);

    if (!tookDamage) {
      return;
    }

    this.cameras.main.shake(PLAYER_HIT_SHAKE_DURATION_MS, PLAYER_HIT_SHAKE_INTENSITY);
    this.createBurstCircle(this.player.x, this.player.y, 0xf87171, 12, 36, 180, 0.75);
    this.publishHudState();

    if (!this.player.isAlive()) {
      this.endRun(false, 'Defeat', 'You were overwhelmed.');
    }
  }

  private handleEnemyDefeated(
    enemy: Enemy,
    x: number,
    y: number,
    xpValue: number,
    wasBoss: boolean,
    wasMiniboss: boolean,
    wasElite: boolean,
  ): void {
    this.killCount += 1;
    if (wasElite) {
      this.eliteKillCount += 1;
    }

    const gem = new XPGem(this, x, y, xpValue);
    this.xpGems.add(gem);

    this.grantEncounterRewards(enemy, x, y);

    if (wasBoss) {
      this.endRun(true, 'Victory', 'The Behemoth has fallen.');
      return;
    }

    if (wasMiniboss) {
      this.registry.set('run.instructions', 'Miniboss broken. Claim the power spike and keep moving.');
      this.setAlert('objective', 'Miniboss broken', 1600);
      return;
    }

    if (wasElite) {
      this.registry.set('run.instructions', 'Elite defeated. Spend the reward before the next wave arrives.');
      this.setAlert('objective', 'Elite reward claimed', 1400);
    }
  }

  private applyProjectileExplosion(
    x: number,
    y: number,
    radius: number,
    damage: number,
    primaryTarget: Enemy,
    color: number,
  ): void {
    const enemies = this.enemies?.getChildren() as Enemy[] | undefined;
    if (!enemies) {
      return;
    }

    this.createBurstCircle(x, y, color, 14, radius, 220, 0.45);

    for (const enemy of enemies) {
      if (!enemy.active || enemy === primaryTarget) {
        continue;
      }

      const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (distance > radius) {
        continue;
      }

      const enemyDied = enemy.takeDamage(damage, { x, y });
      this.createBurstCircle(enemy.x, enemy.y, 0xffffff, 4, 14, 80, 0.16);
      this.applyCombatImpactResponse('shatterbell', enemy, enemyDied, x, y, color, Math.max(8, radius * 0.22), false);
      if (!enemyDied) {
        continue;
      }

      this.handleEnemyDefeated(
        enemy,
        enemy.x,
        enemy.y,
        enemy.getXpValue(),
        enemy.isBoss(),
        enemy.isMiniboss(),
        enemy.isElite(),
      );
    }
  }

  private grantEncounterRewards(enemy: Enemy, x: number, y: number): void {
    const rewardGold = enemy.getRewardGold();
    const rewardLevelUps = enemy.getRewardLevelUps();
    const rewardMessages: string[] = [];

    if (rewardGold > 0) {
      this.goldEarned += rewardGold;
      this.showFloatingText(x, y - 38, `+${rewardGold} gold`, '#fcd34d', 16);
      this.createBurstCircle(x, y, 0xfbbf24, 14, 48, 220, 0.45);
      rewardMessages.push(`+${rewardGold} gold`);
    }

    if (rewardLevelUps > 0) {
      this.pendingLevelUps += rewardLevelUps;
      this.showFloatingText(x, y - 58, rewardLevelUps > 1 ? `+${rewardLevelUps} upgrades` : '+1 upgrade', '#bfdbfe', 18);
      rewardMessages.push(rewardLevelUps > 1 ? `+${rewardLevelUps} upgrades` : '+1 upgrade');
    }

    if (rewardLevelUps > 0 && !this.isLevelingUp) {
      this.beginLevelUp();
    }

    if (enemy.isBoss()) {
      this.showRewardToast(`Boss reward secured: ${rewardMessages.join(' • ') || 'Victory payout'}`, '#fde68a');
      playCue('boss-reward');
    } else if (enemy.isMiniboss()) {
      this.showRewardToast(`Miniboss reward: ${rewardMessages.join(' • ')}`, '#f9a8d4');
      playCue('miniboss-reward');
    } else if (enemy.isElite()) {
      this.showRewardToast(`Elite reward: ${rewardMessages.join(' • ')}`, '#ddd6fe');
      playCue('elite-reward');
    }
  }

  private presentHeroIntro(hero: (typeof HEROES)[keyof typeof HEROES]): void {
    const startingWeapon = WEAPON_DEFINITIONS[hero.startingWeaponId];
    this.registry.set('run.instructions', `${hero.name}: ${hero.passiveLabel}`);
    this.registry.set('run.heroName', hero.name);
    this.registry.set('run.heroPassive', hero.passiveLabel);
    this.setAlert('hero', `${hero.name} deployed`, 2400);
    this.showEncounterBanner(hero.name, `${startingWeapon.name} online. ${hero.passiveLabel}`, startingWeapon.projectileColor, 2200);
    this.showFloatingText(this.player.x, this.player.y - 78, `${startingWeapon.name} ready`, '#dbeafe', 18);
    playHeroIntroCue(hero, startingWeapon);

    this.time.delayedCall(2600, () => {
      if (!this.isEnded && !this.isLevelingUp && !this.isSystemPaused && !this.isTransitioningToMenu) {
        this.registry.set('run.instructions', 'Survive the full timer or kill the final boss.');
      }
    });
  }

  private handleEnemyAttackSignal(enemy: Enemy, signal: EnemyAttackSignal): void {
    switch (signal.type) {
      case 'miniboss-line-telegraph':
        this.registry.set('run.instructions', 'Miniboss charge lane forming. Step sideways before it fires.');
        this.setAlert('miniboss', 'Miniboss charge lane', 900);
        this.showLineAttackTelegraph(signal.x, signal.y, signal.direction, signal.length, 58, 0xfda4af, 420, 'warning');
        playCue('dash-warning');
        break;
      case 'miniboss-line-execute':
        this.registry.set('run.instructions', 'Dreadnought line charge released. Reposition and punish the recovery.');
        this.setAlert('miniboss', 'Line charge live', 900);
        this.executeMinibossLineStrike(enemy, signal.x, signal.y, signal.direction, signal.length);
        playCue('miniboss-release');
        break;
      case 'boss-shockwave-telegraph':
        this.registry.set('run.instructions', 'Behemoth is winding up a shockwave. Back out before the ring expands.');
        this.setAlert('boss', 'Shockwave winding up', 980);
        this.showBossShockwaveTelegraph(signal.x, signal.y, signal.radius);
        playCue('dash-warning');
        break;
      case 'boss-shockwave-execute':
        this.registry.set('run.instructions', 'Shockwave released. Keep clear of the expanding ring.');
        this.setAlert('boss', 'Shockwave live', 1100);
        this.spawnBossShockwave(signal.x, signal.y, signal.radius, signal.damage, signal.durationMs ?? 980);
        playCue('boss-release');
        break;
    }
  }

  private executeMinibossLineStrike(
    enemy: Enemy,
    x: number,
    y: number,
    direction: { x: number; y: number },
    length: number,
  ): void {
    this.showLineAttackTelegraph(x, y, direction, length, 62, 0xfb7185, 180, 'active');
    this.createBurstCircle(x, y, 0xfb7185, 22, 70, 260, 0.75);
    this.cameras.main.shake(100, 0.0022);

    if (this.isPlayerInsideLineAttack(x, y, direction, length, 38)) {
      const lineDamage = Math.max(18, enemy.contactDamage - 4);
      const tookDamage = this.player.takeDamage(lineDamage, this.time.now);
      if (tookDamage) {
        this.createBurstCircle(this.player.x, this.player.y, 0xfb7185, 16, 54, 220, 0.85);
        this.showFloatingText(this.player.x, this.player.y - 28, `${lineDamage}`, '#fecdd3', 18);
        if (!this.player.isAlive()) {
          this.endRun(false, 'Defeat', 'The Dreadnought broke through your position.');
        }
      }
    }
  }

  private showLineAttackTelegraph(
    x: number,
    y: number,
    direction: { x: number; y: number },
    length: number,
    width: number,
    color: number,
    durationMs: number,
    phase: 'warning' | 'active',
  ): void {
    const centerX = x + direction.x * (length / 2);
    const centerY = y + direction.y * (length / 2);
    const angle = Math.atan2(direction.y, direction.x);
    const fillAlpha = phase === 'warning' ? 0.1 : 0.26;
    const lane = this.add.rectangle(centerX, centerY, length, width, color, fillAlpha).setDepth(8);
    lane.setRotation(angle);
    lane.setStrokeStyle(phase === 'warning' ? 2 : 4, color, phase === 'warning' ? 0.88 : 1);

    const laneCore = this.add
      .rectangle(
        centerX,
        centerY,
        length,
        phase === 'warning' ? Math.max(10, width * 0.14) : Math.max(12, width * 0.22),
        0xffffff,
        phase === 'warning' ? 0.16 : 0.4,
      )
      .setDepth(8);
    laneCore.setRotation(angle);

    const upperEdge = this.add.rectangle(centerX, centerY - width / 2, length, 3, color, phase === 'warning' ? 0.75 : 1).setDepth(8);
    upperEdge.setRotation(angle);
    const lowerEdge = this.add.rectangle(centerX, centerY + width / 2, length, 3, color, phase === 'warning' ? 0.75 : 1).setDepth(8);
    lowerEdge.setRotation(angle);

    const impactCap = this.add.circle(x + direction.x * length, y + direction.y * length, width * 0.4, color, 0.18).setDepth(8);
    impactCap.setStrokeStyle(phase === 'warning' ? 3 : 4, phase === 'warning' ? color : 0xffffff, 0.95);

    if (phase === 'warning') {
      this.tweens.add({
        targets: [lane, laneCore, upperEdge, lowerEdge, impactCap],
        alpha: '+=0.18',
        duration: Math.max(120, durationMs - 120),
        ease: 'Sine.InOut',
        yoyo: true,
      });
    }

    this.tweens.add({
      targets: [lane, laneCore, upperEdge, lowerEdge, impactCap],
      alpha: 0,
      duration: durationMs,
      ease: 'Quad.Out',
      onComplete: () => {
        lane.destroy();
        laneCore.destroy();
        upperEdge.destroy();
        lowerEdge.destroy();
        impactCap.destroy();
      },
    });
  }

  private showBossShockwaveTelegraph(x: number, y: number, radius: number): void {
    const warningCore = this.add.circle(x, y, 48, 0xfca5a5, 0.14).setDepth(8);
    warningCore.setBlendMode(Phaser.BlendModes.ADD);
    const warning = this.add.circle(x, y, radius * 0.32, 0xfca5a5, 0.06).setDepth(8);
    warning.setStrokeStyle(4, 0xfca5a5, 0.98);
    const outerEdge = this.add.circle(x, y, radius * 0.32, 0xffffff, 0).setDepth(8);
    outerEdge.setStrokeStyle(2, 0xffffff, 0.95);

    this.tweens.add({
      targets: [warning, outerEdge],
      radius,
      alpha: 0,
      duration: 780,
      ease: 'Cubic.Out',
      onComplete: () => {
        warning.destroy();
        outerEdge.destroy();
      },
    });

    this.tweens.add({
      targets: warningCore,
      scale: 2.4,
      alpha: 0,
      duration: 780,
      ease: 'Quad.Out',
      onComplete: () => warningCore.destroy(),
    });
  }

  private spawnBossShockwave(x: number, y: number, radius: number, damage: number, durationMs: number): void {
    const ring = this.add.circle(x, y, 52, 0xfca5a5, 0).setDepth(8);
    ring.setStrokeStyle(14, 0xffffff, 0.98);
    const halo = this.add.circle(x, y, 52, 0xfca5a5, 0.12).setDepth(7);
    halo.setBlendMode(Phaser.BlendModes.ADD);
    this.createBurstCircle(x, y, 0xfca5a5, 28, 80, 260, 0.65);
    this.cameras.main.flash(120, 255, 170, 170, false);

    this.shockwaveAttacks.push({
      ring,
      halo,
      x,
      y,
      maxRadius: radius,
      currentRadius: 52,
      durationMs,
      elapsedMs: 0,
      thickness: 16,
      damage,
      hasHitPlayer: false,
    });
  }

  private isPlayerInsideLineAttack(
    originX: number,
    originY: number,
    direction: { x: number; y: number },
    length: number,
    halfWidth: number,
  ): boolean {
    const relativeX = this.player.x - originX;
    const relativeY = this.player.y - originY;
    const along = relativeX * direction.x + relativeY * direction.y;
    const perpendicular = Math.abs(relativeX * -direction.y + relativeY * direction.x);

    return along >= 0 && along <= length && perpendicular <= halfWidth + 18;
  }

  private collectXPGem(gem: XPGem): void {
    if (!gem.active || this.isLevelingUp || this.isEnded || this.isSystemPaused) {
      return;
    }

    const gemValue = gem.getValue();
    gem.playCollectFeedback();
    this.createBurstCircle(gem.x, gem.y, 0x93c5fd, 8, 26, 150, 0.9);
    this.createBurstCircle(this.player.x, this.player.y, 0x60a5fa, 6, 24, 130, 0.2);
    if (gemValue >= 8) {
      this.showFloatingText(this.player.x, this.player.y - 22, `+${gemValue} XP`, '#bfdbfe', 14);
    }
    const levelsGained = this.player.gainExperience(gemValue);
    gem.destroy();

    if (levelsGained > 0) {
      this.pendingLevelUps += levelsGained;
      this.beginLevelUp();
    }

    this.publishHudState();
  }

  private beginLevelUp(): void {
    if (this.isLevelingUp || this.pendingLevelUps <= 0 || this.isEnded) {
      return;
    }

    this.isLevelingUp = true;
    this.pauseGameplaySystems();
    this.cameras.main.flash(LEVEL_UP_FLASH_MS, 255, 230, 130, false);
    this.createBurstCircle(this.player.x, this.player.y, 0xfde68a, 18, 82, 260, 0.95);
    this.showFloatingText(this.player.x, this.player.y - 56, 'LEVEL UP', '#fde68a', 24);
    this.presentLevelUpChoices();
  }

  private presentLevelUpChoices(): void {
    const choices = Phaser.Utils.Array.Shuffle(this.getAvailableUpgradePool()).slice(0, 3);
    this.isResolvingLevelUpChoice = false;
    this.levelUpRemainingMs = beginLevelUpCountdown();
    this.registry.set('run.levelUpActive', true);
    this.registry.set('run.levelUpChoices', choices);
    this.registry.set('run.levelUpRemainingMs', this.levelUpRemainingMs);
    this.registry.set('run.instructions', 'Choose an upgrade. Auto-pick starts in 15 seconds.');
  }

  private updateLevelUpCountdown(deltaMs: number): void {
    const nextCountdown = tickLevelUpCountdown(this.levelUpRemainingMs, deltaMs, true);
    this.levelUpRemainingMs = nextCountdown.remainingMs;
    this.registry.set('run.levelUpRemainingMs', this.levelUpRemainingMs);

    if (nextCountdown.expired && !this.isResolvingLevelUpChoice) {
      this.autoPickLevelUp();
    }
  }

  private autoPickLevelUp(): void {
    const choices = (this.registry.get('run.levelUpChoices') ?? []) as UpgradeDefinition[];
    const randomIndex = chooseRandomValidIndex(choices);

    if (randomIndex === null) {
      this.finishLevelUpSelection();
      return;
    }

    this.selectLevelUp(randomIndex);
  }

  private finishLevelUpSelection(): void {
    this.isLevelingUp = false;
    this.isResolvingLevelUpChoice = false;
    this.levelUpRemainingMs = 0;
    this.registry.set('run.levelUpActive', false);
    this.registry.set('run.levelUpChoices', []);
    this.registry.set('run.levelUpRemainingMs', 0);
    this.registry.set('run.instructions', 'Survive the full timer or kill the final boss.');

    if (!this.isSystemPaused) {
      this.resumeGameplaySystems('Survive the full timer or kill the final boss.');
    }

    this.setAlert('objective', 'Objective active');
    this.publishHudState();
  }

  private getAvailableUpgradePool(): UpgradeDefinition[] {
    return UPGRADE_POOL.filter((upgrade) => {
      switch (upgrade.id) {
        case 'unlock-twin-fangs':
          return !this.ownedWeaponIds.has('twin-fangs');
        case 'unlock-ember-lance':
          return !this.ownedWeaponIds.has('ember-lance');
        case 'unlock-bloom-cannon':
          return !this.ownedWeaponIds.has('bloom-cannon');
        case 'unlock-phase-disc':
          return !this.ownedWeaponIds.has('phase-disc');
        case 'unlock-sunwheel':
          return !this.ownedWeaponIds.has('sunwheel');
        case 'unlock-shatterbell':
          return !this.ownedWeaponIds.has('shatterbell');
        default:
          return true;
      }
    });
  }

  private applyUpgrade(upgradeId: UpgradeId): void {
    switch (upgradeId) {
      case 'vitality':
        this.player.addMaxHealth(25);
        break;
      case 'swiftness':
        this.player.addMoveSpeed(22);
        break;
      case 'power':
        this.applyWeaponDamageBonus(5);
        break;
      case 'rapid-fire':
        this.applyWeaponCooldownReduction(40);
        break;
      case 'velocity':
        this.applyProjectileSpeedBonus(90);
        break;
      case 'magnet':
        this.player.addPickupRange(35);
        break;
      case 'reach':
        this.applyWeaponRangeBonus(55);
        break;
      case 'unlock-twin-fangs':
        this.registerWeapon(WEAPON_DEFINITIONS['twin-fangs'], true);
        break;
      case 'unlock-ember-lance':
        this.registerWeapon(WEAPON_DEFINITIONS['ember-lance'], true);
        break;
      case 'unlock-bloom-cannon':
        this.registerWeapon(WEAPON_DEFINITIONS['bloom-cannon'], true);
        break;
      case 'unlock-phase-disc':
        this.registerWeapon(WEAPON_DEFINITIONS['phase-disc'], true);
        break;
      case 'unlock-sunwheel':
        this.registerWeapon(WEAPON_DEFINITIONS.sunwheel, true);
        break;
      case 'unlock-shatterbell':
        this.registerWeapon(WEAPON_DEFINITIONS.shatterbell, true);
        break;
    }
  }

  private applyWeaponDamageBonus(amount: number): void {
    this.globalWeaponDamageBonus += amount;
    for (const weapon of this.weapons) {
      weapon.addDamage(amount);
    }
  }

  private applyWeaponCooldownReduction(amount: number): void {
    this.globalWeaponCooldownReduction += amount;
    for (const weapon of this.weapons) {
      weapon.reduceCooldown(amount);
    }
  }

  private applyProjectileSpeedBonus(amount: number): void {
    this.globalProjectileSpeedBonus += amount;
    for (const weapon of this.weapons) {
      weapon.addProjectileSpeed(amount);
    }
  }

  private applyWeaponRangeBonus(amount: number): void {
    this.globalWeaponRangeBonus += amount;
    for (const weapon of this.weapons) {
      weapon.addRange(amount);
    }
  }

  private applyWeaponModifiersTo(weapon: AutoFireWeapon): void {
    if (this.globalWeaponDamageBonus !== 0) {
      weapon.addDamage(this.globalWeaponDamageBonus);
    }

    if (this.globalWeaponCooldownReduction !== 0) {
      weapon.reduceCooldown(this.globalWeaponCooldownReduction);
    }

    if (this.globalProjectileSpeedBonus !== 0) {
      weapon.addProjectileSpeed(this.globalProjectileSpeedBonus);
    }

    if (this.globalWeaponRangeBonus !== 0) {
      weapon.addRange(this.globalWeaponRangeBonus);
    }
  }

  private refreshSystemPauseState(): void {
    if (this.isEnded || this.isTransitioningToMenu) {
      return;
    }

    const shouldPause = document.hidden || !document.hasFocus();
    if (shouldPause === this.isSystemPaused) {
      return;
    }

    this.isSystemPaused = shouldPause;

    if (shouldPause) {
      const message = this.isLevelingUp ? 'Tab inactive. Upgrade choice paused.' : 'Tab inactive. Run paused.';
      this.pauseGameplaySystems(message);
    } else if (this.isLevelingUp) {
      this.registry.set('run.instructions', 'Choose an upgrade. Auto-pick starts in 15 seconds.');
    } else {
      this.resumeGameplaySystems('Survive the full timer or kill the final boss.');
    }

    this.publishHudState();
  }

  private pauseGameplaySystems(instructionText?: string): void {
    if (this.player?.active) {
      this.player.move(new Phaser.Math.Vector2(0, 0));
    }

    this.physics.pause();
    if (this.spawnTimer) {
      this.spawnTimer.paused = true;
    }

    if (instructionText) {
      this.registry.set('run.instructions', instructionText);
    }
  }

  private resumeGameplaySystems(instructionText?: string): void {
    if (this.isEnded || this.isSystemPaused || this.isLevelingUp || this.isTransitioningToMenu) {
      return;
    }

    this.physics.resume();
    if (this.spawnTimer) {
      this.spawnTimer.paused = false;
    }

    if (instructionText) {
      this.registry.set('run.instructions', instructionText);
    }
  }

  private publishHudState(): void {
    if (!this.player) {
      return;
    }

    this.registry.set('run.hp', this.player.getCurrentHealth());
    this.registry.set('run.maxHp', this.player.getMaxHealth());
    this.registry.set('run.level', this.player.getLevel());
    this.registry.set('run.kills', this.killCount);
    this.registry.set('run.weaponCount', this.weapons.length);
    this.registry.set('run.xp', this.player.getExperience());
    this.registry.set('run.xpNext', this.player.getExperienceToNextLevel());
    this.registry.set('run.targetMs', RUN_TARGET_DURATION_MS);
    this.registry.set('run.goldEarned', this.goldEarned);
    this.registry.set('run.totalGold', this.saveData.totalGold);
    this.registry.set('run.elapsedMs', this.runElapsedMs);
    this.registry.set('run.weaponNames', this.weapons.map((weapon) => weapon.getStats().name));
  }

  private endRun(victory: boolean, title: string, subtitle: string): void {
    if (this.isEnded) {
      return;
    }

    this.isEnded = true;
    this.isLevelingUp = false;
    this.isResolvingLevelUpChoice = false;
    this.levelUpRemainingMs = 0;
    this.combatResponse.clear({ suppressCallbacks: true });
    this.goldEarned += calculateRunGoldReward(this.player.getLevel(), this.killCount, victory);
    this.saveData = awardRunGold(this.saveData, this.goldEarned);

    const questResolution = applyRunProgressToQuests(this.saveData, {
      kills: this.killCount,
      survivalMs: this.runElapsedMs,
      levelReached: this.player.getLevel(),
      goldCollected: this.goldEarned,
      eliteKills: this.eliteKillCount,
    });
    this.saveData = questResolution.saveData;

    this.spawnTimer?.remove(false);
    this.player.move(new Phaser.Math.Vector2(0, 0));
    this.player.updateVisualState(this.time.now);
    this.physics.pause();
    for (const attack of this.shockwaveAttacks) {
      attack.ring.destroy();
      attack.halo.destroy();
    }
    this.shockwaveAttacks = [];

    this.cameras.main.shake(180, victory ? 0.0026 : 0.0034);
    if (victory) {
      playCue('victory');
      this.cameras.main.flash(ENDING_FLASH_MS, 255, 234, 150, false);
      this.createBurstCircle(this.player.x, this.player.y, 0xfde68a, 22, 90, 300, 0.95);
    } else {
      playCue('defeat');
      this.cameras.main.flash(ENDING_FLASH_MS, 255, 120, 120, false);
      this.createBurstCircle(this.player.x, this.player.y, 0xf87171, 18, 74, 260, 0.9);
    }

    this.registry.set('save.totalGold', this.saveData.totalGold);
    this.registry.set('run.endActive', true);
    this.registry.set('run.victory', victory);
    this.registry.set('run.endTitle', title);
    this.registry.set('run.endSubtitle', subtitle);
    this.registry.set('run.questRewards', questResolution.rewardMessages);
    this.registry.set('run.levelUpActive', false);
    this.registry.set('run.levelUpChoices', []);
    this.registry.set('run.levelUpRemainingMs', 0);
    this.registry.set('run.instructions', 'Press Enter, Space, or click the button to return to menu.');
    this.setAlert(victory ? 'victory' : 'defeat', title);
    this.showRewardToast(victory ? `Victory payout: +${this.goldEarned} gold` : `Run payout: +${this.goldEarned} gold`, victory ? '#fde68a' : '#fca5a5');
    this.publishHudState();
  }

  private setAlert(kind: string, text: string, durationMs = 0): void {
    const priority = this.getAlertPriority(kind);
    const now = this.time.now;

    if (now < this.activeAlertUntil && priority < this.activeAlertPriority) {
      return;
    }

    this.activeAlertPriority = priority;
    this.activeAlertKind = kind;
    this.activeAlertUntil = durationMs > 0 ? now + durationMs : 0;
    this.registry.set('run.alertKind', kind);
    this.registry.set('run.alertText', text);

    if (durationMs <= 0) {
      return;
    }

    const token = this.alertToken + 1;
    this.alertToken = token;
    this.time.delayedCall(durationMs, () => {
      if (this.alertToken !== token || this.isEnded) {
        return;
      }

      this.activeAlertPriority = 0;
      this.activeAlertKind = 'objective';
      this.activeAlertUntil = 0;
      this.registry.set('run.alertKind', 'objective');
      this.registry.set('run.alertText', '');
      this.flushQueuedRewardToast();
    });
  }

  private showRewardToast(text: string, color: string): void {
    if (
      !this.isEnded &&
      this.time.now < this.activeAlertUntil &&
      this.getAlertPriority(this.activeAlertKind) >= this.getAlertPriority('miniboss')
    ) {
      this.queuedRewardToast = { text, color };
      return;
    }

    const token = this.rewardToastToken + 1;
    this.rewardToastToken = token;
    this.registry.set('run.rewardText', text);
    this.registry.set('run.rewardColor', color);

    this.time.delayedCall(2400, () => {
      if (this.rewardToastToken !== token) {
        return;
      }

      this.registry.set('run.rewardText', '');
    });
  }

  private flushQueuedRewardToast(): void {
    if (!this.queuedRewardToast) {
      return;
    }

    const queuedToast = this.queuedRewardToast;
    this.queuedRewardToast = null;
    this.showRewardToast(queuedToast.text, queuedToast.color);
  }

  private getAlertPriority(kind: string): number {
    switch (kind) {
      case 'victory':
      case 'defeat':
      case 'boss':
        return 5;
      case 'miniboss':
        return 4;
      case 'elite':
        return 3;
      case 'hero':
        return 2;
      case 'objective':
      default:
        return 1;
    }
  }

  private showSpawnIndicator(x: number, y: number, label: string, color: number): void {
    const ring = this.add.circle(x, y, 14, color, 0.12).setDepth(8);
    ring.setStrokeStyle(3, color, 0.95);

    this.tweens.add({
      targets: ring,
      radius: 78,
      alpha: 0,
      duration: ELITE_SPAWN_INDICATOR_MS,
      ease: 'Cubic.Out',
      onComplete: () => ring.destroy(),
    });

    this.showFloatingText(x, y - 34, label, Phaser.Display.Color.IntegerToColor(color).rgba, 18);
  }

  private showEncounterBanner(title: string, subtitle: string, color: number, duration: number): void {
    const bannerY = 86;
    const backdrop = this.add.rectangle(GAME_WIDTH / 2, bannerY, 620, 92, 0x020617, 0.86).setDepth(30).setScrollFactor(0);
    backdrop.setStrokeStyle(2, color, 0.95);
    const accent = this.add.rectangle(GAME_WIDTH / 2, bannerY - 38, 560, 4, color, 0.9).setDepth(31).setScrollFactor(0);
    const titleText = this.add
      .text(GAME_WIDTH / 2, bannerY - 10, title, {
        fontFamily: 'Georgia, serif',
        fontSize: '30px',
        color: '#f8fafc',
      })
      .setOrigin(0.5)
      .setDepth(31)
      .setScrollFactor(0);
    const subtitleText = this.add
      .text(GAME_WIDTH / 2, bannerY + 22, subtitle, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '16px',
        color: '#dbeafe',
        align: 'center',
        wordWrap: { width: 540 },
      })
      .setOrigin(0.5)
      .setDepth(31)
      .setScrollFactor(0);

    for (const object of [backdrop, accent, titleText, subtitleText]) {
      object.setAlpha(0);
      object.y -= 18;
    }

    this.tweens.add({
      targets: [backdrop, accent, titleText, subtitleText],
      alpha: 1,
      y: `+=18`,
      duration: 180,
      ease: 'Quad.Out',
      hold: duration,
      yoyo: true,
      onComplete: () => {
        backdrop.destroy();
        accent.destroy();
        titleText.destroy();
        subtitleText.destroy();
      },
    });
  }

  private createBurstCircle(
    x: number,
    y: number,
    color: number,
    startRadius: number,
    endRadius: number,
    duration: number,
    alpha: number,
  ): void {
    const burst = this.add.circle(x, y, startRadius, color, alpha).setDepth(9);
    burst.setStrokeStyle(2, color, Math.min(1, alpha + 0.15));

    this.tweens.add({
      targets: burst,
      radius: endRadius,
      alpha: 0,
      duration,
      ease: 'Quad.Out',
      onComplete: () => burst.destroy(),
    });
  }

  private showFloatingText(x: number, y: number, text: string, color: string, fontSize: number): void {
    const label = this.add
      .text(x, y, text, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: `${fontSize}px`,
        color,
        stroke: '#0f172a',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(10);

    this.tweens.add({
      targets: label,
      y: y - 24,
      alpha: 0,
      duration: 420,
      ease: 'Quad.Out',
      onComplete: () => label.destroy(),
    });
  }

  private handleExitToMenu(): void {
    this.exitToMenu();
  }

  private handleShutdown(): void {
    this.input.keyboard?.off('keydown-ESC', this.handleExitToMenu, this);
    document.removeEventListener('visibilitychange', this.handlePageVisibilityChange);
    window.removeEventListener('blur', this.handleWindowBlur);
    window.removeEventListener('focus', this.handleWindowFocus);
    this.combatResponse.clear({ suppressCallbacks: true });

    this.spawnTimer?.remove(false);
    this.spawnTimer = undefined;

    for (const collider of this.colliders) {
      collider.destroy();
    }
    this.colliders = [];

    for (const weapon of this.weapons) {
      weapon.destroy();
    }
    this.weapons = [];

    for (const attack of this.shockwaveAttacks) {
      attack.ring.destroy();
      attack.halo.destroy();
    }
    this.shockwaveAttacks = [];

    this.destroyPhysicsGroup(this.enemies);
    this.destroyPhysicsGroup(this.xpGems);

    if (this.player?.active) {
      this.player.destroy();
    }
  }

  private destroyPhysicsGroup(group?: Phaser.Physics.Arcade.Group): void {
    if (!group) {
      return;
    }

    const internalChildren = (group as Phaser.Physics.Arcade.Group & {
      children?: { entries?: Phaser.GameObjects.GameObject[] };
    }).children;
    const children = Array.isArray(internalChildren?.entries) ? [...internalChildren.entries] : [];

    for (const child of children) {
      child.destroy();
    }

    group.destroy();
  }

  private applyCombatImpactResponse(
    weaponId: WeaponId,
    enemy: Enemy,
    defeated: boolean,
    x: number,
    y: number,
    color: number,
    radius: number,
    emitCue: boolean,
  ): void {
    const impactResponse = resolveCombatImpactResponse({
      enemyId: enemy.archetype.id,
      weaponId,
      defeated,
      x,
      y,
      color,
      radius,
    });

    if (impactResponse.hitStopMs <= 0 && !impactResponse.cue) {
      return;
    }

    this.combatResponseImpactCounts[weaponId] = (this.combatResponseImpactCounts[weaponId] ?? 0) + 1;
    this.combatResponse.triggerHitStop(impactResponse.hitStopMs);

    if (emitCue) {
      this.combatResponse.emitImpactCue(impactResponse.cue);
    }
  }

  private pauseCombatResponseSystems(): void {
    if (
      this.isEnded ||
      this.isLevelingUp ||
      this.isSystemPaused ||
      this.isTransitioningToMenu ||
      !this.sys.isActive()
    ) {
      return;
    }

    this.physics.pause();
    this.tweens.pauseAll();
    if (this.spawnTimer) {
      this.spawnTimer.paused = true;
    }
  }

  private resumeCombatResponseSystems(): void {
    if (!this.sys.isActive()) {
      return;
    }

    this.tweens.resumeAll();

    if (this.isEnded || this.isLevelingUp || this.isSystemPaused || this.isTransitioningToMenu) {
      return;
    }

    this.physics.resume();
    if (this.spawnTimer) {
      this.spawnTimer.paused = false;
    }
  }
}




