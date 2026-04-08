import Phaser from 'phaser';
import type { EnemyArchetype } from '../data/enemies';

export class Enemy extends Phaser.GameObjects.Rectangle {
  declare body: Phaser.Physics.Arcade.Body;

  readonly archetype: EnemyArchetype;
  readonly contactDamage: number;
  private readonly speed: number;
  private readonly maxHealth: number;
  private readonly xpValue: number;
  private health: number;

  constructor(scene: Phaser.Scene, x: number, y: number, archetype: EnemyArchetype) {
    super(scene, x, y, archetype.size, archetype.size, archetype.color);

    this.archetype = archetype;
    this.speed = archetype.speed;
    this.contactDamage = archetype.contactDamage;
    this.maxHealth = archetype.maxHealth;
    this.health = archetype.maxHealth;
    this.xpValue = archetype.xpValue;

    this.setStrokeStyle(2, archetype.strokeColor, 0.72);

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
    this.scene.time.delayedCall(80, () => {
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
