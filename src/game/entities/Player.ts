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
import type { HeroDefinition } from '../data/heroes';

export class Player extends Phaser.GameObjects.Rectangle {
  declare body: Phaser.Physics.Arcade.Body;

  private readonly aura: Phaser.GameObjects.Arc;
  private readonly heroMarker: Phaser.GameObjects.Shape;
  private readonly baseFillColor: number;
  private speed = PLAYER_SPEED;
  private maxHealth = PLAYER_MAX_HP;
  private readonly hitInvulnerabilityMs = PLAYER_HIT_INVULNERABILITY_MS;
  private health = PLAYER_MAX_HP;
  private pickupRange = PLAYER_PICKUP_RANGE;
  private level = PLAYER_START_LEVEL;
  private experience = 0;
  private experienceToNextLevel = PLAYER_START_XP_TO_NEXT_LEVEL;
  private invulnerableUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, hero: HeroDefinition) {
    const { appearance } = hero;
    super(scene, x, y, appearance.size, appearance.size, appearance.bodyColor);

    this.baseFillColor = appearance.bodyColor;
    this.aura = scene.add.circle(x, y, Math.round(appearance.size * 0.88), appearance.auraColor, 0.16);
    this.aura.setDepth(5);
    this.aura.setBlendMode(Phaser.BlendModes.ADD);

    this.heroMarker =
      appearance.markerShape === 'dot'
        ? scene.add.circle(x, y - appearance.size * 0.24, Math.max(4, Math.round(appearance.size * 0.14)), appearance.markerColor, 0.95)
        : scene.add.rectangle(x, y - appearance.size * 0.24, Math.round(appearance.size * 0.5), 7, appearance.markerColor, 0.95);
    this.heroMarker.setDepth(7);

    this.setStrokeStyle(3, appearance.strokeColor, 0.95);
    this.setAngle(appearance.angle);
    this.setDepth(6);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const bodySize = Math.max(20, Math.round(appearance.size * 0.72));
    this.body.setCollideWorldBounds(true);
    this.body.setDrag(1600, 1600);
    this.body.setMaxVelocity(this.speed, this.speed);
    this.body.setSize(bodySize, bodySize, true);

    if (hero.maxHealthBonus !== 0) {
      this.addMaxHealth(hero.maxHealthBonus);
    }
    if (hero.moveSpeedBonus !== 0) {
      this.addMoveSpeed(hero.moveSpeedBonus);
    }
    if (hero.pickupRangeBonus !== 0) {
      this.addPickupRange(hero.pickupRangeBonus);
    }

    this.syncVisualDecorations(scene.time.now);
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
      if (this.active) {
        this.setFillStyle(this.isAlive() ? this.baseFillColor : 0x64748b);
      }
    });

    return true;
  }

  addMaxHealth(amount: number): void {
    this.maxHealth = Math.max(1, this.maxHealth + amount);
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + Math.max(0, amount));
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
    this.syncVisualDecorations(currentTime);

    if (!this.isAlive()) {
      this.setFillStyle(0x64748b);
      this.setAlpha(0.7);
      this.aura.setAlpha(0.08);
      this.heroMarker.setAlpha(0.25);
      return;
    }

    const invulnerable = currentTime < this.invulnerableUntil;
    this.setFillStyle(this.baseFillColor);
    this.setAlpha(invulnerable ? 0.72 : 1);
    this.aura.setAlpha(invulnerable ? 0.12 : 0.22);
    this.heroMarker.setAlpha(invulnerable ? 0.55 : 0.95);
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

  destroy(fromScene?: boolean): void {
    this.aura.destroy();
    this.heroMarker.destroy();
    super.destroy(fromScene);
  }

  private calculateExperienceToNextLevel(): number {
    return Math.floor(PLAYER_START_XP_TO_NEXT_LEVEL + (this.level - 1) * PLAYER_XP_PER_LEVEL);
  }

  private syncVisualDecorations(currentTime: number): void {
    const pulse = 1 + Math.sin((currentTime + this.x * 0.45) * 0.01) * 0.035;
    this.aura.setPosition(this.x, this.y);
    this.aura.setScale(pulse);
    this.heroMarker.setPosition(this.x, this.y - this.height * 0.26);
    this.heroMarker.setAngle(this.angle);
  }
}
