import Phaser from 'phaser';
import {
  PLAYER_HIT_INVULNERABILITY_MS,
  PLAYER_MAX_HP,
  PLAYER_SPEED,
} from '../config/constants';

export class Player extends Phaser.GameObjects.Rectangle {
  declare body: Phaser.Physics.Arcade.Body;

  private readonly speed = PLAYER_SPEED;
  private readonly maxHealth = PLAYER_MAX_HP;
  private readonly hitInvulnerabilityMs = PLAYER_HIT_INVULNERABILITY_MS;
  private health = PLAYER_MAX_HP;
  private invulnerableUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 34, 34, 0x6ee7b7);

    this.setStrokeStyle(2, 0xeafff7, 0.7);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setCollideWorldBounds(true);
    this.body.setDrag(1600, 1600);
    this.body.setMaxVelocity(this.speed, this.speed);
  }

  getCurrentHealth(): number {
    return this.health;
  }

  getMaxHealth(): number {
    return this.maxHealth;
  }

  getMoveSpeed(): number {
    return this.speed;
  }

  isAlive(): boolean {
    return this.health > 0;
  }

  takeDamage(amount: number, currentTime: number): boolean {
    if (currentTime < this.invulnerableUntil || !this.isAlive()) {
      return false;
    }

    this.health = Math.max(0, this.health - amount);
    this.invulnerableUntil = currentTime + this.hitInvulnerabilityMs;
    this.setFillStyle(0xf87171);

    this.scene.time.delayedCall(120, () => {
      this.setFillStyle(this.isAlive() ? 0x6ee7b7 : 0x64748b);
    });

    return true;
  }

  updateVisualState(currentTime: number): void {
    if (!this.isAlive()) {
      this.setFillStyle(0x64748b);
      this.setAlpha(0.7);
      return;
    }

    const invulnerable = currentTime < this.invulnerableUntil;
    this.setAlpha(invulnerable ? 0.72 : 1);
  }

  move(direction: Phaser.Math.Vector2): void {
    if (!this.isAlive()) {
      this.body.setVelocity(0, 0);
      return;
    }

    if (direction.lengthSq() === 0) {
      this.body.setAcceleration(0, 0);
      this.body.setVelocity(0, 0);
      return;
    }

    direction.normalize();
    this.body.setVelocity(direction.x * this.speed, direction.y * this.speed);
  }
}
