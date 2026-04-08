import Phaser from 'phaser';
import {
  ELITE_SPAWN_INDICATOR_MS,
  ENDING_FLASH_MS,
  ENEMY_SPAWN_INTERVAL_MS,
  GOLD_REWARD_BASE,
  GOLD_REWARD_PER_KILL_STEP,
  GOLD_REWARD_PER_LEVEL,
  GOLD_REWARD_VICTORY_BONUS,
  LEVEL_UP_FLASH_MS,
  PLAYER_HIT_SHAKE_DURATION_MS,
  PLAYER_HIT_SHAKE_INTENSITY,
  RUN_TARGET_DURATION_MS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../config/constants';
import { HEROES } from '../data/heroes';
import { UPGRADE_POOL, type UpgradeDefinition, type UpgradeId } from '../data/upgrades';
import { STARTER_WEAPON, WEAPON_DEFINITIONS, type WeaponDefinition } from '../data/weapons';
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
  private weapons: AutoFireWeapon[] = [];
  private ownedWeaponIds = new Set<string>();
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

  // These modifiers stack from heroes, permanent upgrades, and level-up picks.
  private globalWeaponDamageBonus = 0;
  private globalWeaponCooldownReduction = 0;
  private globalProjectileSpeedBonus = 0;
  private globalWeaponRangeBonus = 0;

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
    this.globalWeaponDamageBonus = 0;
    this.globalWeaponCooldownReduction = 0;
    this.globalProjectileSpeedBonus = 0;
    this.globalWeaponRangeBonus = 0;
    this.runStartTime = this.time.now;
    this.frozenElapsedMs = 0;
    this.weapons = [];
    this.ownedWeaponIds.clear();

    this.cameras.main.setBackgroundColor('#111827');
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.drawArena();

    this.player = new Player(this, WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
    this.enemies = this.physics.add.group({ runChildUpdate: false });
    this.xpGems = this.physics.add.group({ runChildUpdate: false });
    this.spawnDirector = new SpawnDirector();
    this.movementKeys = createMovementKeys(this);

    this.registerWeapon(STARTER_WEAPON);
    this.applyPermanentUpgrades();
    this.applyHeroBonuses();

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(1);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.physics.add.overlap(this.player, this.enemies, (_playerObject, enemyObject) => {
      if (enemyObject instanceof Enemy) {
        this.handlePlayerEnemyOverlap(enemyObject);
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

    for (const weapon of this.weapons) {
      weapon.update(this.time.now, delta);
    }

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

  private registerWeapon(definition: WeaponDefinition, announce = false): void {
    if (this.ownedWeaponIds.has(definition.id)) {
      return;
    }

    const weapon = new AutoFireWeapon(this, this.player, this.enemies, definition);
    this.applyWeaponModifiersTo(weapon);
    this.weapons.push(weapon);
    this.ownedWeaponIds.add(definition.id);

    this.physics.add.overlap(weapon.getProjectiles(), this.enemies, (projectileObject, enemyObject) => {
      if (projectileObject instanceof Projectile && enemyObject instanceof Enemy) {
        this.handleProjectileEnemyOverlap(projectileObject, enemyObject);
      }
    });

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
        this.showSpawnIndicator(spawnPoint.x, spawnPoint.y, 'BOSS', 0xfca5a5);
      } else if (archetype.isElite) {
        this.registry.set('run.instructions', 'Elite enemy incoming. Keep moving.');
        this.showSpawnIndicator(spawnPoint.x, spawnPoint.y, 'ELITE', 0xe9d5ff);
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
      enemy.updatePresentation(this.time.now);
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
    const damage = projectile.getDamage();

    projectile.deactivate();
    const enemyDied = enemy.takeDamage(damage);

    if (enemyDied) {
      this.showFloatingText(enemyX, enemyY - 16, `${damage}`, wasBoss ? '#fca5a5' : '#fde68a', 18);
      this.createBurstCircle(enemyX, enemyY, wasBoss ? 0xfca5a5 : 0xfef08a, 10, wasBoss ? 58 : 34, 220, 0.9);
      this.handleEnemyDefeated(enemyX, enemyY, xpValue, wasBoss, wasElite);
      return;
    }

    if (wasBoss || wasElite) {
      this.showFloatingText(enemyX, enemyY - 16, `${damage}`, '#ffffff', 16);
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

    this.cameras.main.shake(PLAYER_HIT_SHAKE_DURATION_MS, PLAYER_HIT_SHAKE_INTENSITY);
    this.createBurstCircle(this.player.x, this.player.y, 0xf87171, 12, 36, 180, 0.75);
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

    this.createBurstCircle(gem.x, gem.y, 0x93c5fd, 8, 26, 150, 0.9);
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

    this.cameras.main.flash(LEVEL_UP_FLASH_MS, 255, 230, 130, false);
    this.createBurstCircle(this.player.x, this.player.y, 0xfde68a, 18, 82, 260, 0.95);
    this.showFloatingText(this.player.x, this.player.y - 56, 'LEVEL UP', '#fde68a', 24);
    this.presentLevelUpChoices();
  }

  private presentLevelUpChoices(): void {
    const choices = Phaser.Utils.Array.Shuffle(this.getAvailableUpgradePool()).slice(0, 3);
    this.registry.set('run.levelUpActive', true);
    this.registry.set('run.levelUpChoices', choices);
    this.registry.set('run.instructions', 'Choose an upgrade to continue.');
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

  private publishHudState(): void {
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

    this.cameras.main.shake(180, victory ? 0.0026 : 0.0034);
    if (victory) {
      this.cameras.main.flash(ENDING_FLASH_MS, 255, 234, 150, false);
      this.createBurstCircle(this.player.x, this.player.y, 0xfde68a, 22, 90, 300, 0.95);
    } else {
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
    this.registry.set('run.instructions', 'Press Enter, Space, or click the button to return to menu.');
    this.publishHudState();
  }

  private calculateGoldReward(victory: boolean): number {
    const levelReward = this.player.getLevel() * GOLD_REWARD_PER_LEVEL;
    const killReward = Math.floor(this.killCount / GOLD_REWARD_PER_KILL_STEP);
    const victoryReward = victory ? GOLD_REWARD_VICTORY_BONUS : 0;

    return GOLD_REWARD_BASE + levelReward + killReward + victoryReward;
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
    this.scene.stop('UIScene');
    this.scene.start('MenuScene');
  }

  private handleShutdown(): void {
    this.input.keyboard?.off('keydown-ESC', this.handleExitToMenu, this);
    this.spawnTimer?.remove(false);

    for (const weapon of this.weapons) {
      weapon.destroy();
    }
  }
}
