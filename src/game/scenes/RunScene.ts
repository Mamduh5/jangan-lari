import Phaser from 'phaser';
import {
  ENEMY_SPAWN_INTERVAL_MS,
  GOLD_REWARD_BASE,
  GOLD_REWARD_PER_KILL_STEP,
  GOLD_REWARD_PER_LEVEL,
  GOLD_REWARD_VICTORY_BONUS,
  RUN_TARGET_DURATION_MS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../config/constants';
import { HEROES } from '../data/heroes';
import { UPGRADE_POOL, type UpgradeDefinition, type UpgradeId } from '../data/upgrades';
import { STARTER_WEAPON } from '../data/weapons';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { XPGem } from '../entities/XPGem';
import { createMovementKeys, type MovementKeys } from '../input/createMovementKeys';
import type { GameSaveData } from '../save/saveData';
import { loadGameSave } from '../save/saveData';
import { applyRunProgressToQuests } from '../save/saveQuests';
import { awardRunGold, getPermanentUpgradeLevel } from '../save/saveUpgrades';
import { AutoFireWeapon } from '../systems/AutoFireWeapon';
import { SpawnDirector } from '../systems/SpawnDirector';

export class RunScene extends Phaser.Scene {
  private player!: Player;
  private enemies!: Phaser.Physics.Arcade.Group;
  private xpGems!: Phaser.Physics.Arcade.Group;
  private starterWeapon!: AutoFireWeapon;
  private spawnDirector!: SpawnDirector;
  private saveData!: GameSaveData;
  private movementKeys!: MovementKeys;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private runStartTime = 0;
  private frozenElapsedMs = 0;
  private pendingLevelUps = 0;
  private killCount = 0;
  private eliteKillCount = 0;
  private goldEarned = 0;
  private isEnded = false;
  private isLevelingUp = false;

  constructor() {
    super('RunScene');
  }

  create(): void {
    this.saveData = loadGameSave();
    this.isEnded = false;
    this.isLevelingUp = false;
    this.pendingLevelUps = 0;
    this.killCount = 0;
    this.eliteKillCount = 0;
    this.goldEarned = 0;
    this.runStartTime = this.time.now;
    this.frozenElapsedMs = 0;

    this.cameras.main.setBackgroundColor('#111827');
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.drawArena();

    this.player = new Player(this, WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
    this.enemies = this.physics.add.group({ runChildUpdate: false });
    this.xpGems = this.physics.add.group({ runChildUpdate: false });
    this.spawnDirector = new SpawnDirector();
    this.starterWeapon = new AutoFireWeapon(this, this.player, this.enemies, STARTER_WEAPON);
    this.applyPermanentUpgrades();
    this.applyHeroBonuses();
    this.movementKeys = createMovementKeys(this);

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(1);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.physics.add.overlap(this.player, this.enemies, (_playerObject, enemyObject) => {
      if (enemyObject instanceof Enemy) {
        this.handlePlayerEnemyOverlap(enemyObject);
      }
    });

    this.physics.add.overlap(this.starterWeapon.getProjectiles(), this.enemies, (projectileObject, enemyObject) => {
      if (projectileObject instanceof Projectile && enemyObject instanceof Enemy) {
        this.handleProjectileEnemyOverlap(projectileObject, enemyObject);
      }
    });

    this.physics.add.overlap(this.player, this.xpGems, (_playerObject, gemObject) => {
      if (gemObject instanceof XPGem) {
        this.collectXPGem(gemObject);
      }
    });

    this.spawnTimer = this.time.addEvent({
      delay: ENEMY_SPAWN_INTERVAL_MS,
      loop: true,
      callback: this.spawnEnemyWave,
      callbackScope: this,
    });

    this.publishHudState();
    this.registry.set('run.endActive', false);
    this.registry.set('run.victory', false);
    this.registry.set('run.levelUpActive', false);
    this.registry.set('run.levelUpChoices', []);
    this.registry.set('run.questRewards', []);
    this.registry.set('run.instructions', `Selected Hero: ${HEROES[this.saveData.selectedHero].name}`);

    this.input.keyboard?.on('keydown-ESC', this.handleExitToMenu, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
  }

  update(_time: number, delta: number): void {
    if (this.isEnded) {
      this.publishHudState();
      return;
    }

    if (this.isLevelingUp) {
      this.publishHudState();
      return;
    }

    const elapsedMs = this.time.now - this.runStartTime;
    if (elapsedMs >= RUN_TARGET_DURATION_MS) {
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
    this.player.updateVisualState(this.time.now);
    this.updateEnemies();
    this.updateGems();
    this.starterWeapon.update(this.time.now, delta);

    this.publishHudState();
  }

  selectLevelUp(index: number): void {
    if (!this.isLevelingUp || this.isEnded) {
      return;
    }

    const choices = this.registry.get('run.levelUpChoices') as UpgradeDefinition[] | undefined;
    const selectedUpgrade = choices?.[index];
    if (!selectedUpgrade) {
      return;
    }

    this.applyUpgrade(selectedUpgrade.id);
    this.pendingLevelUps = Math.max(0, this.pendingLevelUps - 1);

    if (this.pendingLevelUps > 0) {
      this.presentLevelUpChoices();
      this.publishHudState();
      return;
    }

    this.isLevelingUp = false;
    this.registry.set('run.levelUpActive', false);
    this.registry.set('run.levelUpChoices', []);
    this.registry.set('run.instructions', 'Survive the full timer or kill the final boss.');

    if (this.spawnTimer) {
      this.spawnTimer.paused = false;
    }

    this.physics.resume();
    this.runStartTime = this.time.now - this.frozenElapsedMs;
    this.publishHudState();
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
      this.starterWeapon.addDamage(startingDamageLevel * 3);
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

    if (hero.startingDamageBonus !== 0) {
      this.starterWeapon.addDamage(hero.startingDamageBonus);
    }

    if (hero.fireCooldownReductionMs !== 0) {
      this.starterWeapon.reduceCooldown(hero.fireCooldownReductionMs);
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
    if (this.isEnded || this.isLevelingUp) {
      return;
    }

    const elapsedMs = this.time.now - this.runStartTime;
    const wave = this.spawnDirector.nextWave(elapsedMs);

    for (const archetype of wave) {
      const spawnPoint = this.getSpawnPoint(archetype.isBoss ? 700 : 520);
      const enemy = new Enemy(this, spawnPoint.x, spawnPoint.y, archetype);
      this.enemies.add(enemy);

      if (archetype.isBoss) {
        this.registry.set('run.instructions', 'Boss sighted. Defeat it or survive to extraction.');
      } else if (archetype.isElite) {
        this.registry.set('run.instructions', 'Elite enemy incoming. Keep moving.');
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
    const enemyChildren = this.enemies.getChildren() as Enemy[];

    for (const enemy of enemyChildren) {
      enemy.chase(this.player);
    }
  }

  private updateGems(): void {
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
    const wasElite = enemy.isElite();

    projectile.deactivate();
    const enemyDied = enemy.takeDamage(projectile.getDamage());

    if (enemyDied) {
      this.handleEnemyDefeated(enemyX, enemyY, xpValue, wasBoss, wasElite);
    }
  }

  private handlePlayerEnemyOverlap(enemy: Enemy): void {
    if (this.isEnded || this.isLevelingUp) {
      return;
    }

    const tookDamage = this.player.takeDamage(enemy.contactDamage, this.time.now);

    if (!tookDamage) {
      return;
    }

    this.cameras.main.shake(90, 0.0035);
    this.publishHudState();

    if (!this.player.isAlive()) {
      this.endRun(false, 'Defeat', 'You were overwhelmed.');
    }
  }

  private handleEnemyDefeated(
    x: number,
    y: number,
    xpValue: number,
    wasBoss: boolean,
    wasElite: boolean,
  ): void {
    this.killCount += 1;
    if (wasElite) {
      this.eliteKillCount += 1;
    }

    const gem = new XPGem(this, x, y, xpValue);
    this.xpGems.add(gem);

    if (wasBoss) {
      this.endRun(true, 'Victory', 'The Behemoth has fallen.');
    }
  }

  private collectXPGem(gem: XPGem): void {
    if (!gem.active || this.isLevelingUp || this.isEnded) {
      return;
    }

    const levelsGained = this.player.gainExperience(gem.getValue());
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
    this.frozenElapsedMs = this.time.now - this.runStartTime;
    this.physics.pause();

    if (this.spawnTimer) {
      this.spawnTimer.paused = true;
    }

    this.presentLevelUpChoices();
  }

  private presentLevelUpChoices(): void {
    const choices = Phaser.Utils.Array.Shuffle([...UPGRADE_POOL]).slice(0, 3);
    this.registry.set('run.levelUpActive', true);
    this.registry.set('run.levelUpChoices', choices);
    this.registry.set('run.instructions', 'Choose an upgrade to continue.');
  }

  private applyUpgrade(upgradeId: UpgradeId): void {
    switch (upgradeId) {
      case 'vitality':
        this.player.addMaxHealth(25);
        break;
      case 'swiftness':
        this.player.addMoveSpeed(24);
        break;
      case 'power':
        this.starterWeapon.addDamage(6);
        break;
      case 'rapid-fire':
        this.starterWeapon.reduceCooldown(45);
        break;
      case 'velocity':
        this.starterWeapon.addProjectileSpeed(110);
        break;
      case 'magnet':
        this.player.addPickupRange(40);
        break;
      case 'reach':
        this.starterWeapon.addRange(65);
        break;
    }
  }

  private publishHudState(): void {
    this.registry.set('run.hp', this.player.getCurrentHealth());
    this.registry.set('run.maxHp', this.player.getMaxHealth());
    this.registry.set('run.level', this.player.getLevel());
    this.registry.set('run.kills', this.killCount);
    this.registry.set('run.xp', this.player.getExperience());
    this.registry.set('run.xpNext', this.player.getExperienceToNextLevel());
    this.registry.set('run.targetMs', RUN_TARGET_DURATION_MS);
    this.registry.set('run.goldEarned', this.goldEarned);
    this.registry.set('run.totalGold', this.saveData.totalGold);
    this.registry.set(
      'run.elapsedMs',
      this.isLevelingUp || this.isEnded ? this.frozenElapsedMs : this.time.now - this.runStartTime,
    );
  }

  private endRun(victory: boolean, title: string, subtitle: string): void {
    if (this.isEnded) {
      return;
    }

    this.isEnded = true;
    this.isLevelingUp = false;
    this.frozenElapsedMs = this.time.now - this.runStartTime;
    this.goldEarned = this.calculateGoldReward(victory);
    this.saveData = awardRunGold(this.saveData, this.goldEarned);

    const questResolution = applyRunProgressToQuests(this.saveData, {
      kills: this.killCount,
      survivalMs: this.frozenElapsedMs,
      levelReached: this.player.getLevel(),
      goldCollected: this.goldEarned,
      eliteKills: this.eliteKillCount,
    });
    this.saveData = questResolution.saveData;

    this.spawnTimer?.remove(false);
    this.player.move(new Phaser.Math.Vector2(0, 0));
    this.player.updateVisualState(this.time.now);
    this.physics.pause();

    this.registry.set('save.totalGold', this.saveData.totalGold);
    this.registry.set('run.endActive', true);
    this.registry.set('run.victory', victory);
    this.registry.set('run.endTitle', title);
    this.registry.set('run.endSubtitle', subtitle);
    this.registry.set('run.questRewards', questResolution.rewardMessages);
    this.registry.set('run.levelUpActive', false);
    this.registry.set('run.levelUpChoices', []);
    this.registry.set('run.instructions', 'Press Enter, Space, or click the button to return to menu.');
    this.publishHudState();
  }

  private calculateGoldReward(victory: boolean): number {
    const levelReward = this.player.getLevel() * GOLD_REWARD_PER_LEVEL;
    const killReward = Math.floor(this.killCount / GOLD_REWARD_PER_KILL_STEP);
    const victoryReward = victory ? GOLD_REWARD_VICTORY_BONUS : 0;

    return GOLD_REWARD_BASE + levelReward + killReward + victoryReward;
  }

  private handleExitToMenu(): void {
    this.scene.stop('UIScene');
    this.scene.start('MenuScene');
  }

  private handleShutdown(): void {
    this.input.keyboard?.off('keydown-ESC', this.handleExitToMenu, this);
    this.spawnTimer?.remove(false);
    this.starterWeapon.destroy();
  }
}
