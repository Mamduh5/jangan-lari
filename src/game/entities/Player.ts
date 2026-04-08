import Phaser from 'phaser';
import {
  PLAYER_HIT_FLASH_MS,
  PLAYER_HIT_INVULNERABILITY_MS,
  PLAYER_MAX_HP,
  PLAYER_PICKUP_RANGE,
  PLAYER_SPEED,
  PLAYER_START_LEVEL,
  PLAYER_START_XP_TO_NEXT_LEVEL,
  PLAYER_XP_PER_LEVEL,
} from '../config/constants';

export class Player extends Phaser.GameObjects.Rectangle {
  declare body: Phaser.Physics.Arcade.Body;

  private speed = PLAYER_SPEED;
  private maxHealth = PLAYER_MAX_HP;
  private readonly hitInvulnerabilityMs = PLAYER_HIT_INVULNERABILITY_MS;
  private health = PLAYER_MAX_HP;
  private pickupRange = PLAYER_PICKUP_RANGE;
  private level = PLAYER_START_LEVEL;
  private experience = 0;
  private experienceToNextLevel = PLAYER_START_XP_TO_NEXT_LEVEL;
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

  getPickupRange(): number {
    return this.pickupRange;
  }

  getLevel(): number {
    return this.level;
  }

  getExperience(): number {
    return this.experience;
  }

  getExperienceToNextLevel(): number {
    return this.experienceToNextLevel;
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

    this.scene.time.delayedCall(PLAYER_HIT_FLASH_MS, () => {
      this.setFillStyle(this.isAlive() ? 0x6ee7b7 : 0x64748b);
    });

    return true;
  }

  addMaxHealth(amount: number): void {
    this.maxHealth += amount;
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  addMoveSpeed(amount: number): void {
    this.speed += amount;
    this.body.setMaxVelocity(this.speed, this.speed);
  }

  addPickupRange(amount: number): void {
    this.pickupRange += amount;
  }

  gainExperience(amount: number): number {
    this.experience += amount;

    let levelsGained = 0;
    while (this.experience >= this.experienceToNextLevel) {
      this.experience -= this.experienceToNextLevel;
      this.level += 1;
      levelsGained += 1;
      this.experienceToNextLevel = this.calculateExperienceToNextLevel();
    }

    return levelsGained;
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

  private calculateExperienceToNextLevel(): number {
    return Math.floor(PLAYER_START_XP_TO_NEXT_LEVEL + (this.level - 1) * PLAYER_XP_PER_LEVEL);
  }
}
