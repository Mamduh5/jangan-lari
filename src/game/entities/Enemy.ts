import Phaser from 'phaser';
import { ENEMY_HIT_FLASH_MS } from '../config/constants';
import type { EnemyArchetype } from '../data/enemies';

export class Enemy extends Phaser.GameObjects.Rectangle {
  declare body: Phaser.Physics.Arcade.Body;

  readonly archetype: EnemyArchetype;
  readonly contactDamage: number;
  private readonly speed: number;
  private readonly xpValue: number;
  private health: number;

  constructor(scene: Phaser.Scene, x: number, y: number, archetype: EnemyArchetype) {
    super(scene, x, y, archetype.size, archetype.size, archetype.color);

    this.archetype = archetype;
    this.speed = archetype.speed;
    this.contactDamage = archetype.contactDamage;
    this.health = archetype.maxHealth;
    this.xpValue = archetype.xpValue;

    const strokeWidth = archetype.isBoss ? 4 : archetype.isElite ? 3 : 2;
    this.setStrokeStyle(strokeWidth, archetype.strokeColor, 0.76);
    this.setDepth(archetype.isBoss ? 6 : archetype.isElite ? 5 : 4);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const bodySize = Math.max(16, archetype.size - 6);
    this.body.setSize(bodySize, bodySize);
    this.body.setMaxVelocity(this.speed, this.speed);
  }

  isAlive(): boolean {
    return this.health > 0;
  }

  isBoss(): boolean {
    return Boolean(this.archetype.isBoss);
  }

  isElite(): boolean {
    return Boolean(this.archetype.isElite);
  }

  getXpValue(): number {
    return this.xpValue;
  }

  chase(target: Phaser.GameObjects.Components.Transform): void {
    if (!this.isAlive()) {
      this.body.setVelocity(0, 0);
      return;
    }

    const direction = new Phaser.Math.Vector2(target.x - this.x, target.y - this.y);

    if (direction.lengthSq() === 0) {
      this.body.setVelocity(0, 0);
      return;
    }

    direction.normalize();
    this.body.setVelocity(direction.x * this.speed, direction.y * this.speed);
  }

  updatePresentation(currentTime: number): void {
    if (this.isBoss()) {
      this.setScale(1 + Math.sin((currentTime + this.x) * 0.008) * 0.05);
      return;
    }

    if (this.isElite()) {
      this.setScale(1 + Math.sin((currentTime + this.y) * 0.012) * 0.03);
      return;
    }

    this.setScale(1);
  }

  takeDamage(amount: number): boolean {
    if (!this.isAlive()) {
      return false;
    }

    this.health = Math.max(0, this.health - amount);

    if (this.health === 0) {
      this.destroyEnemy();
      return true;
    }

    this.setFillStyle(0xffffff);
    this.scene.time.delayedCall(ENEMY_HIT_FLASH_MS, () => {
      if (this.active) {
        this.setFillStyle(this.archetype.color);
      }
    });

    return false;
  }

  private destroyEnemy(): void {
    this.body.stop();
    this.body.enable = false;
    this.destroy();
  }
}
