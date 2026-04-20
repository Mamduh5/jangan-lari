import Phaser from 'phaser';
import { getEnemyCombatResponseProfile, type EnemyCombatResponseProfile } from '../combat/combatResponse';
import { ENEMY_HIT_FLASH_MS } from '../config/constants';
import type { EnemyArchetype } from '../data/enemies';

export type EnemyAttackSignal =
  | {
      type: 'miniboss-line-telegraph' | 'miniboss-line-execute';
      x: number;
      y: number;
      direction: { x: number; y: number };
      length: number;
    }
  | {
      type: 'boss-shockwave-telegraph' | 'boss-shockwave-execute';
      x: number;
      y: number;
      radius: number;
      damage: number;
      durationMs?: number;
    }
  | {
      type: 'ranged-shot';
      x: number;
      y: number;
      direction: { x: number; y: number };
      speed: number;
      damage: number;
      color: number;
      radius: number;
    };

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
  private primedMinibossCharge: Phaser.Math.Vector2 | null = null;
  private pendingAttackSignal: EnemyAttackSignal | null = null;
  private nextShockwaveAt = 0;
  private shockwaveWindupUntil = 0;
  private shockwaveRadius = 0;
  private shockwaveDamage = 0;
  private shockwaveQueued = false;
  private nextRangedShotAt = 0;
  private hitReactionUntil = 0;
  private readonly responseProfile: EnemyCombatResponseProfile | null;
  private readonly responseScale = { x: 1, y: 1 };
  private readonly markRing: Phaser.GameObjects.Arc;
  private readonly markPip: Phaser.GameObjects.Arc;
  private deathPresentationActive = false;
  private eventMarkerColor: number | null = null;
  private markedUntil = 0;
  private deathRewardPending = false;

  constructor(scene: Phaser.Scene, x: number, y: number, archetype: EnemyArchetype) {
    super(scene, x, y, archetype.size, archetype.size, archetype.color);

    this.archetype = archetype;
    this.speed = archetype.speed;
    this.contactDamage = archetype.contactDamage;
    this.health = archetype.maxHealth;
    this.xpValue = archetype.xpValue;
    this.responseProfile = getEnemyCombatResponseProfile(archetype.id);
    this.strafeDirection = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;
    this.nextDashAt = scene.time.now + Phaser.Math.Between(500, 1200);
    if (archetype.isBoss) {
      this.nextShockwaveAt = scene.time.now + Phaser.Math.Between(2600, 3400);
    }
    if (archetype.behavior === 'ranged') {
      this.nextRangedShotAt = scene.time.now + Phaser.Math.Between(1100, 1900);
    }

    const strokeWidth = archetype.isBoss ? 4 : archetype.isMiniboss ? 4 : archetype.isElite ? 3 : 2;
    this.baseStrokeWidth = strokeWidth;
    this.setStrokeStyle(strokeWidth, archetype.strokeColor, 0.76);
    this.setDepth(archetype.isBoss ? 6 : archetype.isMiniboss ? 5.5 : archetype.isElite ? 5 : 4);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.markRing = scene.add.circle(x, y, Math.round(archetype.size * 0.76), 0xfef08a, 0.08);
    this.markRing.setDepth(this.depth - 0.2);
    this.markRing.setStrokeStyle(2, 0xfef08a, 0.9);
    this.markRing.setVisible(false);

    this.markPip = scene.add.circle(x, y - archetype.size * 0.7, Math.max(4, Math.round(archetype.size * 0.16)), 0xfef08a, 1);
    this.markPip.setDepth(this.depth + 0.2);
    this.markPip.setStrokeStyle(2, 0xfffbeb, 0.95);
    this.markPip.setVisible(false);

    const bodySize = Math.max(16, archetype.size - 6);
    this.body.setSize(bodySize, bodySize);
    this.body.setMaxVelocity(this.speed * 3, this.speed * 3);
  }

  isAlive(): boolean {
    return this.health > 0;
  }

  getCurrentHealth(): number {
    return this.health;
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

  isEventMarked(): boolean {
    return this.eventMarkerColor !== null;
  }

  applyMark(currentTimeOrUntilMs: number, durationMs?: number): void {
    const nextUntil = durationMs === undefined ? currentTimeOrUntilMs : currentTimeOrUntilMs + Math.max(0, durationMs);
    this.markedUntil = Math.max(this.markedUntil, nextUntil);
  }

  isMarked(currentTime: number): boolean {
    return currentTime < this.markedUntil;
  }

  consumeMark(currentTime: number): boolean {
    if (!this.isMarked(currentTime)) {
      return false;
    }

    this.markedUntil = 0;
    return true;
  }

  consumeDeathRewardPending(): boolean {
    if (!this.deathRewardPending) {
      return false;
    }

    this.deathRewardPending = false;
    return true;
  }

  setEventMarker(color: number | null): void {
    this.eventMarkerColor = color;
  }

  despawnSilently(): void {
    if (!this.active) {
      return;
    }

    this.pendingAttackSignal = null;
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.killTweensOf(this.responseScale);
    this.body.stop();
    this.body.enable = false;
    this.destroy();
  }

  chase(target: Phaser.GameObjects.Components.Transform, currentTime: number): EnemyAttackSignal | null {
    if (!this.isAlive()) {
      this.body.setVelocity(0, 0);
      return this.consumePendingAttackSignal();
    }

    const towardTarget = new Phaser.Math.Vector2(target.x - this.x, target.y - this.y);
    if (towardTarget.lengthSq() === 0) {
      this.body.setVelocity(0, 0);
      return this.consumePendingAttackSignal();
    }

    this.updateSignatureAttackState(towardTarget, currentTime);

    if (this.isBoss() && currentTime < this.shockwaveWindupUntil) {
      this.body.setVelocity(0, 0);
      return this.consumePendingAttackSignal();
    }

    switch (this.archetype.behavior) {
      case 'ranged':
        this.applyRangedMovement(towardTarget, currentTime);
        break;
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

    return this.consumePendingAttackSignal();
  }

  updatePresentation(currentTime: number): void {
    this.syncMarkPresentation(currentTime);

    const velocity = this.body.velocity;
    if (velocity.lengthSq() > 0) {
      this.setAngle(Phaser.Math.RadToDeg(Math.atan2(velocity.y, velocity.x)) + 90);
    }

    if (this.deathPresentationActive) {
      this.setScale(this.responseScale.x, this.responseScale.y);
      if (this.markedUntil > currentTime) {
        this.setStrokeStyle(this.baseStrokeWidth + 2, 0xfef08a, 1);
      }
      return;
    }

    const chargingDash = this.isChargingDash(currentTime);
    const pulse = 1 + Math.sin((currentTime + this.y) * 0.012) * 0.03;
    const hitReactionActive = currentTime < this.hitReactionUntil;
    const minibossChargePrimed = this.isMiniboss() && Boolean(this.primedMinibossCharge) && currentTime < this.nextDashAt;
    const shockwaveCharging = this.isBoss() && this.shockwaveQueued && currentTime < this.shockwaveWindupUntil;
    const rangedCharging =
      this.archetype.behavior === 'ranged' && currentTime >= this.nextRangedShotAt - 260 && currentTime < this.nextRangedShotAt;

    if (shockwaveCharging) {
      const windupProgress = Phaser.Math.Clamp(1 - (this.shockwaveWindupUntil - currentTime) / 780, 0, 1);
      const chargePulse = 1 + Math.sin((currentTime + this.x) * 0.015) * 0.04;
      this.setResponseScale((1.03 + windupProgress * 0.07) * chargePulse * (hitReactionActive ? 0.97 : 1));
      this.setStrokeStyle(this.baseStrokeWidth + 1, 0xffedd5, 1);
      this.setAlpha(hitReactionActive ? 0.88 : 0.96);
      return;
    }

    if (minibossChargePrimed) {
      const chargeWindowMs = 420;
      const chargeProgress = Phaser.Math.Clamp(1 - (this.nextDashAt - currentTime) / chargeWindowMs, 0, 1);
      this.setResponseScale((1.02 + chargeProgress * 0.13) * (hitReactionActive ? 0.96 : 1));
      this.setStrokeStyle(this.baseStrokeWidth + 1, 0xffe4e6, 0.98);
      this.setAlpha(hitReactionActive ? 0.84 : 0.92);
      return;
    }

    if (rangedCharging) {
      const chargeWindowMs = 260;
      const chargeProgress = Phaser.Math.Clamp(1 - (this.nextRangedShotAt - currentTime) / chargeWindowMs, 0, 1);
      this.setResponseScale((1.01 + chargeProgress * 0.1) * (hitReactionActive ? 0.95 : 1));
      this.setStrokeStyle(this.baseStrokeWidth + 1, 0xe0f2fe, 0.96);
      this.setAlpha(hitReactionActive ? 0.82 : 0.94);
      return;
    }

    if (chargingDash) {
      const chargeWindowMs = 260;
      const chargeProgress = Phaser.Math.Clamp(1 - (this.nextDashAt - currentTime) / chargeWindowMs, 0, 1);
      this.setResponseScale(1.02 + chargeProgress * 0.2);
      this.setStrokeStyle(this.baseStrokeWidth + 1, 0xfef2f2, 1);
      this.setAlpha(0.82 + chargeProgress * 0.18);
      return;
    }

    if (this.isBoss()) {
      this.setResponseScale((1 + Math.sin((currentTime + this.x) * 0.008) * 0.07) * (hitReactionActive ? 0.94 : 1));
      this.setStrokeStyle(this.baseStrokeWidth, this.archetype.strokeColor, 0.96);
      this.setAlpha(hitReactionActive ? 0.82 : 1);
      return;
    }

    if (this.isMiniboss()) {
      this.setResponseScale((1 + Math.sin((currentTime + this.y) * 0.01) * 0.05) * (hitReactionActive ? 0.92 : 1));
      this.setStrokeStyle(this.baseStrokeWidth, this.archetype.strokeColor, 0.9);
      this.setAlpha(hitReactionActive ? 0.8 : 1);
      return;
    }

    if (this.isElite()) {
      this.setResponseScale((1 + Math.sin((currentTime + this.y) * 0.012) * 0.03) * (hitReactionActive ? 0.9 : 1));
      this.setStrokeStyle(this.baseStrokeWidth, this.archetype.strokeColor, 0.92);
      this.setAlpha(hitReactionActive ? 0.78 : 1);
      return;
    }

    if (this.eventMarkerColor !== null) {
      this.setResponseScale((1 + Math.sin((currentTime + this.x) * 0.014) * 0.06) * (hitReactionActive ? 0.9 : 1));
      this.setStrokeStyle(this.baseStrokeWidth + 1, this.eventMarkerColor, 1);
      this.setAlpha(hitReactionActive ? 0.8 : 1);
      return;
    }

    if (this.isMarked(currentTime)) {
      this.setResponseScale((1 + Math.sin((currentTime + this.x) * 0.018) * 0.05) * (hitReactionActive ? 0.9 : 1));
      this.setStrokeStyle(this.baseStrokeWidth + 2, 0xfef08a, 1);
      this.setAlpha(hitReactionActive ? 0.76 : 1);
      return;
    }

    if (this.archetype.behavior === 'strafe') {
      this.setResponseScale(pulse * (hitReactionActive ? 0.88 : 1));
      this.setStrokeStyle(this.baseStrokeWidth, this.archetype.strokeColor, 0.86);
      this.setAlpha(hitReactionActive ? 0.74 : 0.94);
      return;
    }

    this.setResponseScale(hitReactionActive ? 0.86 : 1);
    this.setStrokeStyle(this.baseStrokeWidth, this.archetype.strokeColor, 0.76);
    this.setAlpha(hitReactionActive ? 0.72 : 1);
  }

  takeDamage(amount: number, impactPoint?: { x: number; y: number }): boolean {
    if (!this.isAlive()) {
      return false;
    }

    this.health = Math.max(0, this.health - amount);

    if (this.health === 0) {
      this.deathRewardPending = true;
      this.playDeathResponse(impactPoint);
      return true;
    }

    const hurtFlashMs = this.responseProfile?.hurtFlashMs ?? ENEMY_HIT_FLASH_MS;
    this.hitReactionUntil = this.scene.time.now + hurtFlashMs + 28;
    this.applyHitMotion(impactPoint);
    this.setFillStyle(0xffffff);
    this.setStrokeStyle(this.baseStrokeWidth + 1, 0xffffff, 1);
    this.playHitScaleResponse();
    this.scene.time.delayedCall(hurtFlashMs, () => {
      if (this.active && !this.deathPresentationActive) {
        this.setFillStyle(this.archetype.color);
        this.setStrokeStyle(this.baseStrokeWidth, this.archetype.strokeColor, this.isElite() || this.isMiniboss() || this.isBoss() ? 0.92 : 0.76);
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

  private applyRangedMovement(towardTarget: Phaser.Math.Vector2, currentTime: number): void {
    const distance = Math.max(1, towardTarget.length());
    const forward = towardTarget.clone().normalize();
    const orbit = new Phaser.Math.Vector2(-forward.y * this.strafeDirection, forward.x * this.strafeDirection);
    const preferredDistance = this.archetype.preferredDistance ?? 320;
    const distanceError = Phaser.Math.Clamp((distance - preferredDistance) / preferredDistance, -1, 1);
    const strafeStrength = this.archetype.strafeStrength ?? 0.95;
    const forwardScale = distance < preferredDistance * 0.85 ? 1.2 : 0.72;

    const velocity = forward
      .scale(this.speed * distanceError * forwardScale)
      .add(orbit.scale(this.speed * strafeStrength));
    this.body.setVelocity(velocity.x, velocity.y);

    if (currentTime < this.nextRangedShotAt || towardTarget.lengthSq() === 0) {
      return;
    }

    const shotDirection = towardTarget.clone().normalize();
    this.pendingAttackSignal = {
      type: 'ranged-shot',
      x: this.x,
      y: this.y,
      direction: { x: shotDirection.x, y: shotDirection.y },
      speed: this.archetype.shotSpeed ?? 300,
      damage: this.archetype.shotDamage ?? Math.max(8, this.contactDamage - 1),
      color: this.archetype.color,
      radius: Math.max(4, Math.round(this.archetype.size * 0.22)),
    };
    this.nextRangedShotAt = currentTime + (this.archetype.shotCooldownMs ?? 1800);
  }

  private applyDashMovement(towardTarget: Phaser.Math.Vector2, currentTime: number): void {
    if (currentTime < this.dashUntil) {
      this.body.setVelocity(this.dashVector.x, this.dashVector.y);
      return;
    }

    if (currentTime >= this.nextDashAt) {
      const dashDirection = (this.primedMinibossCharge ?? towardTarget).clone().normalize();
      const dashSpeed = this.speed * (this.archetype.dashSpeedMultiplier ?? 2);
      this.dashVector = dashDirection.scale(dashSpeed);
      this.dashUntil = currentTime + (this.archetype.dashDurationMs ?? 240);
      this.nextDashAt = this.dashUntil + (this.archetype.dashCooldownMs ?? 1400);
      if (this.isMiniboss() && this.primedMinibossCharge) {
        this.pendingAttackSignal = {
          type: 'miniboss-line-execute',
          x: this.x,
          y: this.y,
          direction: { x: dashDirection.x, y: dashDirection.y },
          length: 420,
        };
        this.primedMinibossCharge = null;
      }
      this.body.setVelocity(this.dashVector.x, this.dashVector.y);
      return;
    }

    if (this.isMiniboss() && this.primedMinibossCharge) {
      this.body.setVelocity(0, 0);
      return;
    }

    towardTarget.normalize();
    this.body.setVelocity(towardTarget.x * this.speed * 0.62, towardTarget.y * this.speed * 0.62);
  }

  private updateSignatureAttackState(towardTarget: Phaser.Math.Vector2, currentTime: number): void {
    if (this.isMiniboss()) {
      const chargeWindowMs = 420;
      if (
        !this.primedMinibossCharge &&
        currentTime >= this.nextDashAt - chargeWindowMs &&
        currentTime < this.nextDashAt &&
        towardTarget.lengthSq() > 0
      ) {
        const chargeDirection = towardTarget.clone().normalize();
        this.primedMinibossCharge = chargeDirection;
        this.pendingAttackSignal = {
          type: 'miniboss-line-telegraph',
          x: this.x,
          y: this.y,
          direction: { x: chargeDirection.x, y: chargeDirection.y },
          length: 420,
        };
      }
    }

    if (!this.isBoss()) {
      return;
    }

    if (!this.shockwaveQueued && currentTime >= this.nextShockwaveAt) {
      this.shockwaveQueued = true;
      this.shockwaveWindupUntil = currentTime + 780;
      this.shockwaveRadius = 300;
      this.shockwaveDamage = Math.max(24, this.contactDamage - 6);
      this.pendingAttackSignal = {
        type: 'boss-shockwave-telegraph',
        x: this.x,
        y: this.y,
        radius: this.shockwaveRadius,
        damage: this.shockwaveDamage,
      };
      return;
    }

    if (this.shockwaveQueued && currentTime >= this.shockwaveWindupUntil) {
      this.shockwaveQueued = false;
      this.pendingAttackSignal = {
        type: 'boss-shockwave-execute',
        x: this.x,
        y: this.y,
        radius: this.shockwaveRadius,
        damage: this.shockwaveDamage,
        durationMs: 980,
      };
      this.nextShockwaveAt = currentTime + Phaser.Math.Between(3800, 5000);
    }
  }

  private isChargingDash(currentTime: number): boolean {
    if (this.archetype.behavior !== 'dash' || currentTime < this.dashUntil) {
      return false;
    }

    return currentTime >= this.nextDashAt - 260 && currentTime < this.nextDashAt;
  }

  private destroyEnemy(): void {
    if (!this.active) {
      return;
    }

    this.body.stop();
    this.body.enable = false;
    this.destroy();
  }

  private consumePendingAttackSignal(): EnemyAttackSignal | null {
    const signal = this.pendingAttackSignal;
    this.pendingAttackSignal = null;
    return signal;
  }

  private applyHitMotion(impactPoint?: { x: number; y: number }): void {
    const velocityScale = this.responseProfile?.flinchVelocityScale ?? 0.72;
    const nextVelocityX = this.body.velocity.x * velocityScale;
    const nextVelocityY = this.body.velocity.y * velocityScale;

    if (!impactPoint || !this.responseProfile) {
      this.body.setVelocity(nextVelocityX, nextVelocityY);
      return;
    }

    const recoil = new Phaser.Math.Vector2(this.x - impactPoint.x, this.y - impactPoint.y);
    if (recoil.lengthSq() === 0) {
      this.body.setVelocity(nextVelocityX, nextVelocityY);
      return;
    }

    recoil.normalize().scale(this.responseProfile.recoilSpeed);
    this.body.setVelocity(nextVelocityX + recoil.x, nextVelocityY + recoil.y);
  }

  private playHitScaleResponse(): void {
    if (!this.responseProfile || this.deathPresentationActive) {
      return;
    }

    this.scene.tweens.killTweensOf(this.responseScale);
    this.responseScale.x = this.responseProfile.hitScaleX;
    this.responseScale.y = this.responseProfile.hitScaleY;

    this.scene.tweens.add({
      targets: this.responseScale,
      x: 1,
      y: 1,
      duration: this.responseProfile.hitTweenMs,
      ease: 'Quad.Out',
    });
  }

  private playDeathResponse(impactPoint?: { x: number; y: number }): void {
    if (!this.responseProfile) {
      this.deathPresentationActive = true;
      this.pendingAttackSignal = null;
      if (this.body) {
        this.body.stop();
        this.body.enable = false;
      }
      this.setFillStyle(0xffffff);
      this.setStrokeStyle(this.baseStrokeWidth + 1, 0xffffff, 1);
      this.scene.tweens.add({
        targets: this,
        alpha: 0.16,
        duration: 96,
        ease: 'Quad.Out',
      });
      this.scene.time.delayedCall(120, () => {
        if (this.active) {
          this.destroyEnemy();
        }
      });
      return;
    }

    this.deathPresentationActive = true;
    this.hitReactionUntil = 0;
    this.pendingAttackSignal = null;
    this.applyHitMotion(impactPoint);
    this.body.stop();
    this.body.enable = false;
    this.setFillStyle(0xffffff);
    this.setStrokeStyle(this.baseStrokeWidth + 1, 0xffffff, 1);

    this.scene.tweens.killTweensOf(this.responseScale);
    this.responseScale.x = 1;
    this.responseScale.y = 1;

    this.scene.tweens.add({
      targets: this.responseScale,
      x: this.responseProfile.deathScaleX,
      y: this.responseProfile.deathScaleY,
      duration: this.responseProfile.deathTweenMs,
      ease: 'Cubic.Out',
    });

    this.scene.tweens.add({
      targets: this,
      alpha: 0.14,
      duration: this.responseProfile.deathTweenMs,
      ease: 'Cubic.Out',
    });

    this.scene.time.delayedCall(this.responseProfile.deathBeatMs, () => {
      this.destroyEnemy();
    });
  }

  private setResponseScale(baseScale: number): void {
    this.setScale(baseScale * this.responseScale.x, baseScale * this.responseScale.y);
  }

  destroy(fromScene?: boolean): void {
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.killTweensOf(this.responseScale);
    this.scene.tweens.killTweensOf(this.markRing);
    this.scene.tweens.killTweensOf(this.markPip);
    this.responseScale.x = 1;
    this.responseScale.y = 1;
    this.deathPresentationActive = false;
    this.hitReactionUntil = 0;
    this.markRing.destroy();
    this.markPip.destroy();
    super.destroy(fromScene);
  }

  private syncMarkPresentation(currentTime: number): void {
    const marked = this.isMarked(currentTime) && this.active;
    this.markRing.setVisible(marked);
    this.markPip.setVisible(marked);

    if (!marked) {
      return;
    }

    const pulse = 1 + Math.sin((currentTime + this.x) * 0.022) * 0.08;
    this.markRing.setPosition(this.x, this.y);
    this.markRing.setRadius(Math.round(this.archetype.size * 0.82 * pulse));
    this.markRing.setAlpha(this.deathPresentationActive ? 0.28 : 0.5);
    this.markPip.setPosition(this.x, this.y - this.archetype.size * 0.74);
    this.markPip.setScale(1 + Math.sin((currentTime + this.y) * 0.026) * 0.12);
    this.markPip.setAlpha(this.deathPresentationActive ? 0.45 : 1);
  }
}
