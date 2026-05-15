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
import type { TankClassVisualIdentity } from '../data/tankClasses';

export class Player extends Phaser.GameObjects.Rectangle {
  declare body: Phaser.Physics.Arcade.Body;

  private readonly aura: Phaser.GameObjects.Arc;
  private readonly barrel: Phaser.GameObjects.Rectangle;
  private readonly secondaryBarrel: Phaser.GameObjects.Rectangle;
  private readonly turret: Phaser.GameObjects.Arc;
  private readonly heroMarker: Phaser.GameObjects.Shape;
  private readonly baseBarrelWidth: number;
  private readonly baseBarrelHeight: number;
  private readonly visualSize: number;
  private facingDirection = new Phaser.Math.Vector2(1, 0);
  private currentFillColor: number;
  private currentBarrelColor: number;
  private currentTurretColor: number;
  private barrelCount: 1 | 2 = 1;
  private barrelLengthMultiplier = 1;
  private barrelWidthMultiplier = 1;
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
    const hullWidth = Math.round(appearance.size * 1.12);
    const hullHeight = Math.round(appearance.size * 0.82);
    super(scene, x, y, hullWidth, hullHeight, appearance.bodyColor);

    this.currentFillColor = appearance.bodyColor;
    this.currentBarrelColor = appearance.strokeColor;
    this.currentTurretColor = appearance.markerColor;
    this.baseBarrelWidth = Math.round(appearance.size * 0.68);
    this.baseBarrelHeight = Math.max(6, Math.round(appearance.size * 0.18));
    this.visualSize = appearance.size;
    this.facingDirection.setToPolar(Phaser.Math.DegToRad(appearance.angle), 1);

    this.aura = scene.add.circle(x, y, Math.round(appearance.size * 0.88), appearance.auraColor, 0.16);
    this.aura.setDepth(5);
    this.aura.setBlendMode(Phaser.BlendModes.ADD);

    this.barrel = scene.add.rectangle(
      x,
      y,
      this.baseBarrelWidth,
      this.baseBarrelHeight,
      appearance.strokeColor,
      0.96,
    );
    this.barrel.setOrigin(0, 0.5);
    this.barrel.setDepth(7);
    this.barrel.setStrokeStyle(1, appearance.bodyColor, 0.65);

    this.secondaryBarrel = scene.add.rectangle(
      x,
      y,
      this.baseBarrelWidth,
      this.baseBarrelHeight,
      appearance.strokeColor,
      0.96,
    );
    this.secondaryBarrel.setOrigin(0, 0.5);
    this.secondaryBarrel.setDepth(7);
    this.secondaryBarrel.setStrokeStyle(1, appearance.bodyColor, 0.65);
    this.secondaryBarrel.setVisible(false);

    this.turret = scene.add.circle(
      x,
      y,
      Math.max(7, Math.round(appearance.size * 0.25)),
      appearance.markerColor,
      0.96,
    );
    this.turret.setDepth(8);
    this.turret.setStrokeStyle(2, appearance.strokeColor, 0.9);

    this.heroMarker =
      appearance.markerShape === 'dot'
        ? scene.add.circle(x, y, Math.max(3, Math.round(appearance.size * 0.1)), appearance.strokeColor, 0.95)
        : scene.add.rectangle(x, y, Math.round(appearance.size * 0.34), 5, appearance.strokeColor, 0.95);
    this.heroMarker.setDepth(9);

    this.setStrokeStyle(3, appearance.strokeColor, 0.95);
    this.setDepth(6);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const bodySize = Math.max(20, Math.round(appearance.size * 0.72));
    this.body.setCollideWorldBounds(true);
    this.body.setDrag(1600, 1600);
    this.body.setMaxVelocity(this.speed, this.speed);
    this.body.setSize(bodySize, bodySize, true);

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
        this.setFillStyle(this.isAlive() ? this.currentFillColor : 0x64748b);
      }
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

  applyTankClassVisualIdentity(visual: TankClassVisualIdentity): void {
    this.barrelCount = visual.barrelCount;
    this.barrelLengthMultiplier = visual.barrelLengthMultiplier;
    this.barrelWidthMultiplier = visual.barrelWidthMultiplier;
    this.currentFillColor = visual.hullColor;
    this.currentBarrelColor = visual.barrelColor;
    this.currentTurretColor = visual.turretColor;

    this.setFillStyle(visual.hullColor);
    this.setStrokeStyle(3, visual.barrelColor, 0.95);
    this.barrel.setFillStyle(visual.barrelColor, 0.96);
    this.barrel.setStrokeStyle(1, visual.hullColor, 0.65);
    this.secondaryBarrel.setFillStyle(visual.barrelColor, 0.96);
    this.secondaryBarrel.setStrokeStyle(1, visual.hullColor, 0.65);
    this.secondaryBarrel.setVisible(visual.barrelCount === 2);
    this.turret.setFillStyle(visual.turretColor, 0.96);
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
      this.barrel.setFillStyle(0x475569, 0.74);
      this.secondaryBarrel.setFillStyle(0x475569, 0.74);
      this.turret.setFillStyle(0x64748b, 0.74);
      this.setAlpha(0.7);
      this.aura.setAlpha(0.08);
      this.barrel.setAlpha(0.42);
      this.secondaryBarrel.setAlpha(0.42);
      this.turret.setAlpha(0.5);
      this.heroMarker.setAlpha(0.25);
      return;
    }

    const invulnerable = currentTime < this.invulnerableUntil;
    this.setFillStyle(this.currentFillColor);
    this.barrel.setFillStyle(this.currentBarrelColor, 0.96);
    this.secondaryBarrel.setFillStyle(this.currentBarrelColor, 0.96);
    this.turret.setFillStyle(this.currentTurretColor, 0.96);
    this.setAlpha(invulnerable ? 0.72 : 1);
    this.aura.setAlpha(invulnerable ? 0.12 : 0.22);
    this.barrel.setAlpha(invulnerable ? 0.62 : 1);
    this.secondaryBarrel.setAlpha(invulnerable ? 0.62 : 1);
    this.turret.setAlpha(invulnerable ? 0.7 : 1);
    this.heroMarker.setAlpha(invulnerable ? 0.55 : 0.95);
  }

  setFacingDirection(direction: Phaser.Math.Vector2): void {
    if (direction.lengthSq() === 0) {
      return;
    }

    this.facingDirection.copy(direction).normalize();
  }

  getFacingDirection(): { x: number; y: number } {
    return {
      x: this.facingDirection.x,
      y: this.facingDirection.y,
    };
  }

  move(direction: Phaser.Math.Vector2, updateFacing = true): void {
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
    if (updateFacing) {
      this.setFacingDirection(direction);
    }
    this.body.setVelocity(direction.x * this.speed, direction.y * this.speed);
  }

  destroy(fromScene?: boolean): void {
    this.aura.destroy();
    this.barrel.destroy();
    this.secondaryBarrel.destroy();
    this.turret.destroy();
    this.heroMarker.destroy();
    super.destroy(fromScene);
  }

  private calculateExperienceToNextLevel(): number {
    return Math.floor(PLAYER_START_XP_TO_NEXT_LEVEL + (this.level - 1) * PLAYER_XP_PER_LEVEL);
  }

  private syncVisualDecorations(currentTime: number): void {
    const pulse = 1 + Math.sin((currentTime + this.x * 0.45) * 0.01) * 0.035;
    const facingAngle = Phaser.Math.RadToDeg(this.facingDirection.angle());
    const barrelInset = this.visualSize * 0.12;
    const markerOffset = this.visualSize * 0.18;
    const barrelOffset = this.barrelCount === 2 ? this.visualSize * 0.13 : 0;
    const perpendicularX = -this.facingDirection.y;
    const perpendicularY = this.facingDirection.x;
    const barrelWidth = Math.round(this.baseBarrelWidth * this.barrelLengthMultiplier);
    const barrelHeight = Math.max(4, Math.round(this.baseBarrelHeight * this.barrelWidthMultiplier));

    this.aura.setPosition(this.x, this.y);
    this.aura.setScale(pulse);
    this.setAngle(facingAngle);
    this.barrel.setSize(barrelWidth, barrelHeight);
    this.secondaryBarrel.setSize(barrelWidth, barrelHeight);
    this.barrel.setPosition(
      this.x + this.facingDirection.x * barrelInset + perpendicularX * barrelOffset,
      this.y + this.facingDirection.y * barrelInset + perpendicularY * barrelOffset,
    );
    this.barrel.setAngle(facingAngle);
    this.secondaryBarrel.setPosition(
      this.x + this.facingDirection.x * barrelInset - perpendicularX * barrelOffset,
      this.y + this.facingDirection.y * barrelInset - perpendicularY * barrelOffset,
    );
    this.secondaryBarrel.setAngle(facingAngle);
    this.turret.setPosition(this.x, this.y);
    this.heroMarker.setPosition(
      this.x + this.facingDirection.x * markerOffset,
      this.y + this.facingDirection.y * markerOffset,
    );
    this.heroMarker.setAngle(facingAngle);
  }
}
