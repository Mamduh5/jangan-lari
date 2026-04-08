import Phaser from 'phaser';
import {
  ENEMY_SPAWN_INTERVAL_MS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../config/constants';
import { STARTER_WEAPON } from '../data/weapons';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { createMovementKeys, type MovementKeys } from '../input/createMovementKeys';
import { AutoFireWeapon } from '../systems/AutoFireWeapon';

export class RunScene extends Phaser.Scene {
  private player!: Player;
  private enemies!: Phaser.Physics.Arcade.Group;
  private starterWeapon!: AutoFireWeapon;
  private movementKeys!: MovementKeys;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private runStartTime = 0;
  private isGameOver = false;

  constructor() {
    super('RunScene');
  }

  create(): void {
    this.isGameOver = false;
    this.runStartTime = this.time.now;

    this.cameras.main.setBackgroundColor('#111827');
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.drawArena();

    this.player = new Player(this, WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
    this.enemies = this.physics.add.group({ runChildUpdate: false });
    this.starterWeapon = new AutoFireWeapon(this, this.player, this.enemies, STARTER_WEAPON);
    this.movementKeys = createMovementKeys(this);

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(1);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.physics.add.overlap(this.player, this.enemies, (_playerObject, enemyObject) => {
      if (!(enemyObject instanceof Enemy)) {
        return;
      }

      this.handlePlayerEnemyOverlap(enemyObject);
    });

    this.physics.add.overlap(this.starterWeapon.getProjectiles(), this.enemies, (projectileObject, enemyObject) => {
      if (!(projectileObject instanceof Projectile) || !(enemyObject instanceof Enemy)) {
        return;
      }

      this.handleProjectileEnemyOverlap(projectileObject, enemyObject);
    });

    this.spawnTimer = this.time.addEvent({
      delay: ENEMY_SPAWN_INTERVAL_MS,
      loop: true,
      callback: this.spawnEnemyWave,
      callbackScope: this,
    });

    this.registry.set('run.hp', this.player.getCurrentHealth());
    this.registry.set('run.maxHp', this.player.getMaxHealth());
    this.registry.set('run.elapsedMs', 0);
    this.registry.set('run.gameOver', false);
    this.registry.set('run.instructions', 'Move with WASD or Arrow Keys. Auto-fire attacks nearby enemies.');

    this.input.keyboard?.on('keydown-ESC', this.handleExitToMenu, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
  }

  update(_time: number, delta: number): void {
    if (this.isGameOver) {
      this.registry.set('run.elapsedMs', this.time.now - this.runStartTime);
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
    this.starterWeapon.update(this.time.now, delta);

    this.registry.set('run.hp', this.player.getCurrentHealth());
    this.registry.set('run.maxHp', this.player.getMaxHealth());
    this.registry.set('run.elapsedMs', this.time.now - this.runStartTime);
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
    if (this.isGameOver) {
      return;
    }

    const elapsedSeconds = Math.floor((this.time.now - this.runStartTime) / 1000);
    const spawnCount = Phaser.Math.Clamp(1 + Math.floor(elapsedSeconds / 18), 1, 4);
    const speedBonus = Math.min(36, Math.floor(elapsedSeconds / 6) * 4);
    const damageBonus = Math.min(10, Math.floor(elapsedSeconds / 20) * 2);
    const healthBonus = Math.min(24, Math.floor(elapsedSeconds / 15) * 3);

    for (let index = 0; index < spawnCount; index += 1) {
      const spawnPoint = this.getSpawnPoint();
      const enemy = new Enemy(this, spawnPoint.x, spawnPoint.y, speedBonus, damageBonus, healthBonus);
      this.enemies.add(enemy);
    }
  }

  private getSpawnPoint(): Phaser.Math.Vector2 {
    const side = Phaser.Math.Between(0, 3);
    const spawnDistance = 520;
    const offset = Phaser.Math.Between(-260, 260);

    switch (side) {
      case 0:
        return new Phaser.Math.Vector2(
          Phaser.Math.Clamp(this.player.x + offset, 24, WORLD_WIDTH - 24),
          Phaser.Math.Clamp(this.player.y - spawnDistance, 24, WORLD_HEIGHT - 24),
        );
      case 1:
        return new Phaser.Math.Vector2(
          Phaser.Math.Clamp(this.player.x + spawnDistance, 24, WORLD_WIDTH - 24),
          Phaser.Math.Clamp(this.player.y + offset, 24, WORLD_HEIGHT - 24),
        );
      case 2:
        return new Phaser.Math.Vector2(
          Phaser.Math.Clamp(this.player.x + offset, 24, WORLD_WIDTH - 24),
          Phaser.Math.Clamp(this.player.y + spawnDistance, 24, WORLD_HEIGHT - 24),
        );
      default:
        return new Phaser.Math.Vector2(
          Phaser.Math.Clamp(this.player.x - spawnDistance, 24, WORLD_WIDTH - 24),
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

  private handleProjectileEnemyOverlap(projectile: Projectile, enemy: Enemy): void {
    if (!projectile.active || !enemy.active) {
      return;
    }

    projectile.deactivate();
    const enemyDied = enemy.takeDamage(projectile.getDamage());

    if (enemyDied) {
      this.handleEnemyDefeated(enemy);
    }
  }

  private handlePlayerEnemyOverlap(enemy: Enemy): void {
    if (this.isGameOver) {
      return;
    }

    const tookDamage = this.player.takeDamage(enemy.contactDamage, this.time.now);

    if (!tookDamage) {
      return;
    }

    this.cameras.main.shake(90, 0.0035);
    this.registry.set('run.hp', this.player.getCurrentHealth());

    if (!this.player.isAlive()) {
      this.triggerGameOver();
    }
  }

  private handleEnemyDefeated(_enemy: Enemy): void {
    // Hook for XP gems or drops in a later phase.
  }

  private triggerGameOver(): void {
    this.isGameOver = true;
    this.spawnTimer?.remove(false);
    this.player.move(new Phaser.Math.Vector2(0, 0));
    this.player.updateVisualState(this.time.now);
    this.physics.pause();

    this.registry.set('run.gameOver', true);
    this.registry.set('run.elapsedMs', this.time.now - this.runStartTime);
    this.registry.set('run.instructions', 'Press Enter, Space, or click the button to return to menu.');
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
