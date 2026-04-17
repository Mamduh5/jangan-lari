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
  private readonly strafeDirection: number;
  private dashUntil = 0;
  private nextDashAt = 0;
  private dashVector = new Phaser.Math.Vector2(0, 0);
  private readonly baseStrokeWidth: number;

  constructor(scene: Phaser.Scene, x: number, y: number, archetype: EnemyArchetype) {
    super(scene, x, y, archetype.size, archetype.size, archetype.color);

    this.archetype = archetype;
    this.speed = archetype.speed;
    this.contactDamage = archetype.contactDamage;
    this.health = archetype.maxHealth;
    this.xpValue = archetype.xpValue;
    this.strafeDirection = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;
    this.nextDashAt = scene.time.now + Phaser.Math.Between(500, 1200);

    const strokeWidth = archetype.isBoss ? 4 : archetype.isMiniboss ? 4 : archetype.isElite ? 3 : 2;
    this.baseStrokeWidth = strokeWidth;
    this.setStrokeStyle(strokeWidth, archetype.strokeColor, 0.76);
    this.setDepth(archetype.isBoss ? 6 : archetype.isMiniboss ? 5.5 : archetype.isElite ? 5 : 4);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const bodySize = Math.max(16, archetype.size - 6);
    this.body.setSize(bodySize, bodySize);
    this.body.setMaxVelocity(this.speed * 3, this.speed * 3);
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

  isMiniboss(): boolean {
    return Boolean(this.archetype.isMiniboss);
  }

  getXpValue(): number {
    return this.xpValue;
  }

  getRewardGold(): number {
    return this.archetype.rewardGold ?? 0;
  }

  getRewardLevelUps(): number {
    return this.archetype.rewardLevelUps ?? 0;
  }

  chase(target: Phaser.GameObjects.Components.Transform, currentTime: number): void {
    if (!this.isAlive()) {
      this.body.setVelocity(0, 0);
      return;
    }

    const towardTarget = new Phaser.Math.Vector2(target.x - this.x, target.y - this.y);
    if (towardTarget.lengthSq() === 0) {
      this.body.setVelocity(0, 0);
      return;
    }

    switch (this.archetype.behavior) {
      case 'strafe':
        this.applyStrafeMovement(towardTarget);
        break;
      case 'dash':
        this.applyDashMovement(towardTarget, currentTime);
        break;
      default:
        this.applyChaseMovement(towardTarget);
        break;
    }
  }

  updatePresentation(currentTime: number): void {
    const velocity = this.body.velocity;
    if (velocity.lengthSq() > 0) {
      this.setAngle(Phaser.Math.RadToDeg(Math.atan2(velocity.y, velocity.x)) + 90);
    }

    const chargingDash = this.isChargingDash(currentTime);
    const pulse = 1 + Math.sin((currentTime + this.y) * 0.012) * 0.03;

    if (chargingDash) {
      const chargeWindowMs = 260;
      const chargeProgress = Phaser.Math.Clamp(1 - (this.nextDashAt - currentTime) / chargeWindowMs, 0, 1);
      this.setScale(1.02 + chargeProgress * 0.2);
      this.setStrokeStyle(this.baseStrokeWidth + 1, 0xfef2f2, 1);
      this.setAlpha(0.82 + chargeProgress * 0.18);
      return;
    }

    if (this.isBoss()) {
      this.setScale(1 + Math.sin((currentTime + this.x) * 0.008) * 0.07);
      this.setStrokeStyle(this.baseStrokeWidth, this.archetype.strokeColor, 0.96);
      this.setAlpha(1);
      return;
    }

    if (this.isMiniboss()) {
      this.setScale(1 + Math.sin((currentTime + this.y) * 0.01) * 0.05);
      this.setStrokeStyle(this.baseStrokeWidth, this.archetype.strokeColor, 0.9);
      this.setAlpha(1);
      return;
    }

    if (this.isElite()) {
      this.setScale(1 + Math.sin((currentTime + this.y) * 0.012) * 0.03);
      this.setStrokeStyle(this.baseStrokeWidth, this.archetype.strokeColor, 0.92);
      this.setAlpha(1);
      return;
    }

    if (this.archetype.behavior === 'strafe') {
      this.setScale(pulse);
      this.setStrokeStyle(this.baseStrokeWidth, this.archetype.strokeColor, 0.86);
      this.setAlpha(0.94);
      return;
    }

    this.setScale(1);
    this.setStrokeStyle(this.baseStrokeWidth, this.archetype.strokeColor, 0.76);
    this.setAlpha(1);
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

  private applyChaseMovement(towardTarget: Phaser.Math.Vector2): void {
    towardTarget.normalize();
    this.body.setVelocity(towardTarget.x * this.speed, towardTarget.y * this.speed);
  }

  private applyStrafeMovement(towardTarget: Phaser.Math.Vector2): void {
    const distance = Math.max(1, towardTarget.length());
    const forward = towardTarget.clone().normalize();
    const orbit = new Phaser.Math.Vector2(-forward.y * this.strafeDirection, forward.x * this.strafeDirection);
    const preferredDistance = this.archetype.preferredDistance ?? 180;
    const distanceError = Phaser.Math.Clamp((distance - preferredDistance) / preferredDistance, -0.8, 1);
    const strafeStrength = this.archetype.strafeStrength ?? 0.8;

    const velocity = forward.scale(this.speed * distanceError).add(orbit.scale(this.speed * strafeStrength));
    this.body.setVelocity(velocity.x, velocity.y);
  }

  private applyDashMovement(towardTarget: Phaser.Math.Vector2, currentTime: number): void {
    if (currentTime < this.dashUntil) {
      this.body.setVelocity(this.dashVector.x, this.dashVector.y);
      return;
    }

    if (currentTime >= this.nextDashAt) {
      const dashDirection = towardTarget.clone().normalize();
      const dashSpeed = this.speed * (this.archetype.dashSpeedMultiplier ?? 2);
      this.dashVector = dashDirection.scale(dashSpeed);
      this.dashUntil = currentTime + (this.archetype.dashDurationMs ?? 240);
      this.nextDashAt = this.dashUntil + (this.archetype.dashCooldownMs ?? 1400);
      this.body.setVelocity(this.dashVector.x, this.dashVector.y);
      return;
    }

    towardTarget.normalize();
    this.body.setVelocity(towardTarget.x * this.speed * 0.62, towardTarget.y * this.speed * 0.62);
  }

  private isChargingDash(currentTime: number): boolean {
    if (this.archetype.behavior !== 'dash' || currentTime < this.dashUntil) {
      return false;
    }

    return currentTime >= this.nextDashAt - 260 && currentTime < this.nextDashAt;
  }

  private destroyEnemy(): void {
    this.body.stop();
    this.body.enable = false;
    this.destroy();
  }
}
