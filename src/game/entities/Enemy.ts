import Phaser from 'phaser';
import { getEnemyCombatResponseProfile, type EnemyCombatResponseProfile } from '../combat/combatResponse';
import { ENEMY_HIT_FLASH_MS } from '../config/constants';
import {
  BLOCKER_BRACE_COOLDOWN_MS,
  BLOCKER_BRACE_DURATION_MS,
  BLOCKER_BRACE_TRIGGER_DISTANCE,
  CHARGER_COOLDOWN_MS,
  CHARGER_DASH_DURATION_MS,
  CHARGER_DASH_SPEED,
  CHARGER_RECOVERY_MS,
  CHARGER_TRIGGER_DISTANCE,
  CHARGER_WARN_COLOR,
  CHARGER_WINDUP_MS,
  INTERCEPT_APPROACH_STRAFE_STRENGTH,
  INTERCEPT_DISTANCE_FORWARD_SPEED_SCALE,
  INTERCEPT_MIN_FORWARD_SPEED_SCALE,
  INTERCEPT_PREDICTION_TIME_S,
} from '../config/enemyBehaviorBalance';
import type { EnemyArchetype } from '../data/enemies';
import {
  computeMinibossLineStrikeDynamicLength,
  createBossShockwaveContract,
  createMinibossLineAttackContract,
  createMinibossVolleyContract,
} from '../systems/dangerousEffectContracts';

export type EnemyBehaviorState =
  | 'chasing'
  | 'intercepting'
  | 'windup'
  | 'dashing'
  | 'recovering'
  | 'bracing'
  | 'strafing';

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
      thickness?: number;
      telegraphMs?: number;
      phase?: 1 | 2;
    }
  | {
      type: 'miniboss-volley-telegraph' | 'miniboss-volley-execute';
      x: number;
      y: number;
      direction: { x: number; y: number };
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
  private readonly maxHealth: number;
  private health: number;
  private readonly strafeDirection: number;
  private dashUntil = 0;
  private nextDashAt = 0;
  private dashVector = new Phaser.Math.Vector2(0, 0);
  private readonly baseStrokeWidth: number;
  private primedMinibossCharge: Phaser.Math.Vector2 | null = null;
  private minibossLineStrikeLength = 0;
  public isLineStrikeMoving = false;
  private pendingAttackSignal: EnemyAttackSignal | null = null;
  private nextShockwaveAt = 0;
  private shockwaveWindupUntil = 0;
  private shockwaveRadius = 0;
  private shockwaveDamage = 0;
  private shockwaveThickness = createBossShockwaveContract().thickness;
  private shockwaveDurationMs = createBossShockwaveContract().damageActiveMs;
  private shockwaveQueued = false;
  private bossPhase: 1 | 2 = 1;
  private nextMinibossVolleyAt = 0;
  private minibossVolleyWindupUntil = 0;
  private minibossVolleyQueued = false;
  private minibossVolleyDirection = new Phaser.Math.Vector2(1, 0);
  private nextRangedShotAt = 0;
  private hitReactionUntil = 0;
  private readonly responseProfile: EnemyCombatResponseProfile | null;
  private readonly responseScale = { x: 1, y: 1 };
  private deathPresentationActive = false;
  private eventMarkerColor: number | null = null;
  private bossOwned = false;
  private behaviorState: EnemyBehaviorState = 'chasing';
  private chargerWindupUntil = 0;
  private chargerDashUntil = 0;
  private chargerRecoveryUntil = 0;
  private chargerNextAttackAt = 0;
  private chargerDashVector = new Phaser.Math.Vector2(0, 0);
  private blockerBraceUntil = 0;
  private blockerBraceNextAt = 0;
  private lastTargetPos = new Phaser.Math.Vector2(0, 0);
  private lastTargetPosTime = 0;
  private targetApparentVelocity = new Phaser.Math.Vector2(0, 0);
  private readonly roleVisuals: Array<{
    object: Phaser.GameObjects.Shape;
    forward: number;
    side: number;
    angleOffset: number;
  }> = [];

  constructor(scene: Phaser.Scene, x: number, y: number, archetype: EnemyArchetype) {
    super(scene, x, y, archetype.size, archetype.size, archetype.color);

    this.archetype = archetype;
    this.speed = archetype.speed;
    this.contactDamage = archetype.contactDamage;
    this.maxHealth = archetype.maxHealth;
    this.health = this.maxHealth;
    this.xpValue = archetype.xpValue;
    this.responseProfile = getEnemyCombatResponseProfile(archetype.id);
    this.strafeDirection = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;
    this.nextDashAt = scene.time.now + Phaser.Math.Between(500, 1200);
    if (archetype.isBoss) {
      this.nextShockwaveAt = scene.time.now + Phaser.Math.Between(2600, 3400);
    }
    if (archetype.isMiniboss) {
      this.nextMinibossVolleyAt = scene.time.now + Phaser.Math.Between(2200, 3200);
    }
    if (archetype.behavior === 'ranged') {
      this.nextRangedShotAt = scene.time.now + Phaser.Math.Between(1100, 1900);
    }

    if (archetype.behavior === 'charger') {
      this.chargerNextAttackAt = scene.time.now + Phaser.Math.Between(800, 1800);
    }

    if (archetype.behavior === 'blocker') {
      this.blockerBraceNextAt = scene.time.now + Phaser.Math.Between(600, 1400);
    }

    const strokeWidth = archetype.isBoss ? 4 : archetype.isMiniboss ? 4 : archetype.isElite ? 3 : 2;
    this.baseStrokeWidth = strokeWidth;
    this.setStrokeStyle(strokeWidth, archetype.strokeColor, 0.76);
    this.setDepth(archetype.isBoss ? 6 : archetype.isMiniboss ? 5.5 : archetype.isElite ? 5 : 4);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const bodySize = Math.max(16, archetype.size - 6);
    this.body.setSize(bodySize, bodySize);
    this.body.setMaxVelocity(this.speed * 3, this.speed * 3);
    this.createRoleVisuals(scene);
  }

  isAlive(): boolean {
    return this.health > 0;
  }

  isBoss(): boolean {
    return Boolean(this.archetype.isBoss);
  }

  isBossOwned(): boolean {
    return this.bossOwned;
  }

  setBossOwned(value = true): void {
    this.bossOwned = value;
    if (value) {
      this.setStrokeStyle(this.baseStrokeWidth + 1, 0xfca5a5, 0.95);
    }
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

  getCurrentHealth(): number {
    return this.health;
  }

  getMaxHealth(): number {
    return this.maxHealth;
  }

  getMoveSpeed(): number {
    return this.speed;
  }

  getBehavior(): EnemyArchetype['behavior'] {
    return this.archetype.behavior;
  }

  getBossPhase(): 1 | 2 {
    return this.bossPhase;
  }

  setBossPhase(phase: 1 | 2): void {
    if (!this.isBoss() || this.bossPhase === phase) {
      return;
    }

    this.bossPhase = phase;
    if (phase === 2) {
      this.nextShockwaveAt = Math.min(this.nextShockwaveAt, this.scene.time.now + 900);
    }
  }

  isRangedShooter(): boolean {
    return this.archetype.behavior === 'ranged';
  }

  getBehaviorState(): EnemyBehaviorState {
    return this.behaviorState;
  }

  isPriorityThreat(): boolean {
    if (this.archetype.behavior === 'ranged') {
      return true;
    }
    if (this.archetype.behavior === 'charger') {
      return this.behaviorState === 'windup' || this.behaviorState === 'dashing';
    }
    return false;
  }

  isBlockingRoute(): boolean {
    return this.behaviorState === 'bracing';
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

    if (this.isMiniboss() && this.minibossVolleyQueued && currentTime < this.minibossVolleyWindupUntil) {
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
      case 'intercept':
        this.applyInterceptMovement(towardTarget, currentTime);
        break;
      case 'charger':
        this.applyChargerMovement(towardTarget, currentTime);
        break;
      case 'blocker':
        this.applyBlockerMovement(towardTarget, currentTime);
        break;
      default:
        this.applyChaseMovement(towardTarget);
        break;
    }

    return this.consumePendingAttackSignal();
  }

  updatePresentation(currentTime: number): void {
    const velocity = this.body.velocity;
    if (velocity.lengthSq() > 0) {
      this.setAngle(Phaser.Math.RadToDeg(Math.atan2(velocity.y, velocity.x)) + 90);
    }
    this.syncRoleVisuals();

    if (this.deathPresentationActive) {
      this.setScale(this.responseScale.x, this.responseScale.y);
      return;
    }

    const chargingDash = this.isChargingDash(currentTime);
    const pulse = 1 + Math.sin((currentTime + this.y) * 0.012) * 0.03;
    const hitReactionActive = currentTime < this.hitReactionUntil;
    const minibossChargePrimed = this.isMiniboss() && Boolean(this.primedMinibossCharge) && currentTime < this.nextDashAt;
    const minibossVolleyCharging = this.isMiniboss() && this.minibossVolleyQueued && currentTime < this.minibossVolleyWindupUntil;
    const shockwaveCharging = this.isBoss() && this.shockwaveQueued && currentTime < this.shockwaveWindupUntil;
    const rangedCharging =
      this.archetype.behavior === 'ranged' && currentTime >= this.nextRangedShotAt - 260 && currentTime < this.nextRangedShotAt;
    const chargerWindupActive = this.archetype.behavior === 'charger' && this.behaviorState === 'windup';
    const chargerDashingActive = this.archetype.behavior === 'charger' && this.behaviorState === 'dashing';
    const blockerBracingActive = this.archetype.behavior === 'blocker' && this.behaviorState === 'bracing';

    if (shockwaveCharging) {
      const windupProgress = Phaser.Math.Clamp(
        1 - (this.shockwaveWindupUntil - currentTime) / createBossShockwaveContract(this.bossPhase).telegraphMs,
        0,
        1,
      );
      const chargePulse = 1 + Math.sin((currentTime + this.x) * 0.015) * 0.04;
      this.setResponseScale((1.03 + windupProgress * 0.07) * chargePulse * (hitReactionActive ? 0.97 : 1));
      this.setStrokeStyle(this.baseStrokeWidth + 1, 0xffedd5, 1);
      this.setAlpha(hitReactionActive ? 0.88 : 0.96);
      return;
    }

    if (minibossChargePrimed) {
      const chargeWindowMs = createMinibossLineAttackContract().telegraphMs;
      const chargeProgress = Phaser.Math.Clamp(1 - (this.nextDashAt - currentTime) / chargeWindowMs, 0, 1);
      this.setResponseScale((1.02 + chargeProgress * 0.13) * (hitReactionActive ? 0.96 : 1));
      this.setStrokeStyle(this.baseStrokeWidth + 1, 0xffe4e6, 0.98);
      this.setAlpha(hitReactionActive ? 0.84 : 0.92);
      return;
    }

    if (minibossVolleyCharging) {
      const contract = createMinibossVolleyContract();
      const volleyProgress = Phaser.Math.Clamp(1 - (this.minibossVolleyWindupUntil - currentTime) / contract.telegraphMs, 0, 1);
      this.setResponseScale((1.03 + volleyProgress * 0.11) * (hitReactionActive ? 0.95 : 1));
      this.setStrokeStyle(this.baseStrokeWidth + 1, 0xfef08a, 0.98);
      this.setAlpha(hitReactionActive ? 0.82 : 0.93);
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

    if (chargerWindupActive) {
      const windupProgress = Phaser.Math.Clamp(1 - (this.chargerWindupUntil - currentTime) / CHARGER_WINDUP_MS, 0, 1);
      const chargePulse = 1 + Math.sin(currentTime * 0.018) * 0.05;
      this.setResponseScale((1.04 + windupProgress * 0.18) * chargePulse * (hitReactionActive ? 0.97 : 1));
      this.setStrokeStyle(this.baseStrokeWidth + 2, CHARGER_WARN_COLOR, 1);
      this.setAlpha(0.78 + windupProgress * 0.22);
      return;
    }

    if (chargerDashingActive) {
      const dashRemaining = Math.max(0, this.chargerDashUntil - currentTime);
      const dashProgress = 1 - Phaser.Math.Clamp(dashRemaining / CHARGER_DASH_DURATION_MS, 0, 1);
      this.setResponseScale((1.12 - dashProgress * 0.04) * (hitReactionActive ? 0.97 : 1));
      this.setStrokeStyle(this.baseStrokeWidth + 1, 0xffa060, 0.95);
      this.setAlpha(hitReactionActive ? 0.88 : 1);
      return;
    }

    if (blockerBracingActive) {
      const braceProgress = Phaser.Math.Clamp(1 - (this.blockerBraceUntil - currentTime) / BLOCKER_BRACE_DURATION_MS, 0, 1);
      const bracePulse = 1 + Math.sin(currentTime * 0.008) * 0.03;
      this.setResponseScale((1.06 + braceProgress * 0.06) * bracePulse * (hitReactionActive ? 0.95 : 1));
      this.setStrokeStyle(this.baseStrokeWidth + 2, 0xbbe080, 1);
      this.setAlpha(hitReactionActive ? 0.82 : 0.97);
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

    if (this.bossOwned) {
      this.setResponseScale((1 + Math.sin((currentTime + this.x) * 0.014) * 0.04) * (hitReactionActive ? 0.9 : 1));
      this.setStrokeStyle(this.baseStrokeWidth + 1, 0xfca5a5, 0.95);
      this.setAlpha(hitReactionActive ? 0.78 : 0.94);
      return;
    }

    if (this.eventMarkerColor !== null) {
      this.setResponseScale((1 + Math.sin((currentTime + this.x) * 0.014) * 0.06) * (hitReactionActive ? 0.9 : 1));
      this.setStrokeStyle(this.baseStrokeWidth + 1, this.eventMarkerColor, 1);
      this.setAlpha(hitReactionActive ? 0.8 : 1);
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
    this.behaviorState = 'chasing';
  }

  private updateTargetTracking(targetX: number, targetY: number, currentTime: number): void {
    const dtSec = (currentTime - this.lastTargetPosTime) / 1000;
    if (dtSec > 0.016 && dtSec < 1.5) {
      this.targetApparentVelocity.set(
        (targetX - this.lastTargetPos.x) / dtSec,
        (targetY - this.lastTargetPos.y) / dtSec,
      );
    }
    this.lastTargetPos.set(targetX, targetY);
    this.lastTargetPosTime = currentTime;
  }

  private applyInterceptMovement(towardTarget: Phaser.Math.Vector2, currentTime: number): void {
    const targetX = this.x + towardTarget.x;
    const targetY = this.y + towardTarget.y;
    this.updateTargetTracking(targetX, targetY, currentTime);

    const predictedX = targetX + this.targetApparentVelocity.x * INTERCEPT_PREDICTION_TIME_S;
    const predictedY = targetY + this.targetApparentVelocity.y * INTERCEPT_PREDICTION_TIME_S;

    const toPredicted = new Phaser.Math.Vector2(predictedX - this.x, predictedY - this.y);
    const distance = Math.max(1, towardTarget.length());
    const preferredDistance = this.archetype.preferredDistance ?? 140;
    const distanceError = Phaser.Math.Clamp((distance - preferredDistance) / Math.max(1, preferredDistance), -0.6, 1);

    const forward = toPredicted.clone().normalize();
    const orbit = new Phaser.Math.Vector2(-forward.y * this.strafeDirection, forward.x * this.strafeDirection);

    const velocity = forward
      .scale(this.speed * (INTERCEPT_MIN_FORWARD_SPEED_SCALE + distanceError * INTERCEPT_DISTANCE_FORWARD_SPEED_SCALE))
      .add(orbit.scale(this.speed * INTERCEPT_APPROACH_STRAFE_STRENGTH));
    this.body.setVelocity(velocity.x, velocity.y);
    this.behaviorState = 'intercepting';
  }

  private applyChargerMovement(towardTarget: Phaser.Math.Vector2, currentTime: number): void {
    const distance = towardTarget.length();

    if (this.behaviorState === 'dashing') {
      if (currentTime < this.chargerDashUntil) {
        this.body.setVelocity(this.chargerDashVector.x, this.chargerDashVector.y);
        return;
      }
      this.chargerRecoveryUntil = currentTime + CHARGER_RECOVERY_MS;
      this.chargerNextAttackAt = this.chargerRecoveryUntil + CHARGER_COOLDOWN_MS;
      this.behaviorState = 'recovering';
    }

    if (this.behaviorState === 'recovering') {
      if (currentTime < this.chargerRecoveryUntil) {
        const fwd = towardTarget.clone().normalize();
        this.body.setVelocity(fwd.x * this.speed * 0.24, fwd.y * this.speed * 0.24);
        return;
      }
      this.behaviorState = 'chasing';
    }

    if (this.behaviorState === 'windup') {
      if (currentTime < this.chargerWindupUntil) {
        this.body.setVelocity(0, 0);
        return;
      }
      this.chargerDashVector.set(
        this.chargerDashVector.x * CHARGER_DASH_SPEED,
        this.chargerDashVector.y * CHARGER_DASH_SPEED,
      );
      this.chargerDashUntil = currentTime + CHARGER_DASH_DURATION_MS;
      this.behaviorState = 'dashing';
      this.body.setVelocity(this.chargerDashVector.x, this.chargerDashVector.y);
      return;
    }

    if (currentTime >= this.chargerNextAttackAt && distance <= CHARGER_TRIGGER_DISTANCE) {
      this.chargerDashVector = towardTarget.clone().normalize();
      this.chargerWindupUntil = currentTime + CHARGER_WINDUP_MS;
      this.behaviorState = 'windup';
      this.body.setVelocity(0, 0);
      return;
    }

    const fwd = towardTarget.clone().normalize();
    this.body.setVelocity(fwd.x * this.speed, fwd.y * this.speed);
    this.behaviorState = 'chasing';
  }

  private applyBlockerMovement(towardTarget: Phaser.Math.Vector2, currentTime: number): void {
    const distance = towardTarget.length();

    if (this.behaviorState === 'bracing') {
      if (currentTime < this.blockerBraceUntil) {
        this.body.setVelocity(0, 0);
        return;
      }
      this.behaviorState = 'chasing';
      this.blockerBraceNextAt = currentTime + BLOCKER_BRACE_COOLDOWN_MS;
    }

    if (currentTime >= this.blockerBraceNextAt && distance <= BLOCKER_BRACE_TRIGGER_DISTANCE) {
      this.blockerBraceUntil = currentTime + BLOCKER_BRACE_DURATION_MS;
      this.behaviorState = 'bracing';
      this.body.setVelocity(0, 0);
      return;
    }

    const fwd = towardTarget.clone().normalize();
    this.body.setVelocity(fwd.x * this.speed, fwd.y * this.speed);
    this.behaviorState = 'chasing';
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
    this.behaviorState = 'strafing';
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

    this.isLineStrikeMoving = false;

    if (currentTime >= this.nextDashAt) {
      const dashDirection = (this.primedMinibossCharge ?? towardTarget).clone().normalize();

      if (this.isMiniboss() && this.primedMinibossCharge) {
        const contract = createMinibossLineAttackContract(this.minibossLineStrikeLength);
        const travelDistance = this.minibossLineStrikeLength * contract.travelMultiplier;
        const worldBounds = this.scene.physics.world.bounds;
        const halfBodySize = this.body.halfWidth;
        const rawDestX = this.x + dashDirection.x * travelDistance;
        const rawDestY = this.y + dashDirection.y * travelDistance;
        const destX = Phaser.Math.Clamp(rawDestX, worldBounds.x + halfBodySize, worldBounds.right - halfBodySize);
        const destY = Phaser.Math.Clamp(rawDestY, worldBounds.y + halfBodySize, worldBounds.bottom - halfBodySize);
        this.dashVector.set(
          ((destX - this.x) / contract.damageActiveMs) * 1000,
          ((destY - this.y) / contract.damageActiveMs) * 1000,
        );
        this.dashUntil = currentTime + contract.damageActiveMs;
        this.nextDashAt = this.dashUntil + (this.archetype.dashCooldownMs ?? 1400);
        this.isLineStrikeMoving = true;
        this.pendingAttackSignal = {
          type: 'miniboss-line-execute',
          x: this.x,
          y: this.y,
          direction: { x: dashDirection.x, y: dashDirection.y },
          length: this.minibossLineStrikeLength,
        };
        this.primedMinibossCharge = null;
      } else {
        const dashSpeed = this.speed * (this.archetype.dashSpeedMultiplier ?? 2);
        this.dashVector = dashDirection.scale(dashSpeed);
        this.dashUntil = currentTime + (this.archetype.dashDurationMs ?? 240);
        this.nextDashAt = this.dashUntil + (this.archetype.dashCooldownMs ?? 1400);
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
      const chargeContract = createMinibossLineAttackContract();
      const chargeWindowMs = chargeContract.telegraphMs;
      if (
        !this.primedMinibossCharge &&
        !this.minibossVolleyQueued &&
        !this.pendingAttackSignal &&
        currentTime >= this.nextDashAt - chargeWindowMs &&
        currentTime < this.nextDashAt &&
        towardTarget.lengthSq() > 0
      ) {
        const chargeDirection = towardTarget.clone().normalize();
        const dynamicLength = computeMinibossLineStrikeDynamicLength(towardTarget.length());
        this.minibossLineStrikeLength = dynamicLength;
        this.primedMinibossCharge = chargeDirection;
        this.pendingAttackSignal = {
          type: 'miniboss-line-telegraph',
          x: this.x,
          y: this.y,
          direction: { x: chargeDirection.x, y: chargeDirection.y },
          length: dynamicLength,
        };
      }

      const volleyContract = createMinibossVolleyContract();
      if (
        !this.minibossVolleyQueued &&
        !this.primedMinibossCharge &&
        !this.pendingAttackSignal &&
        currentTime >= this.nextMinibossVolleyAt &&
        currentTime >= this.dashUntil &&
        towardTarget.lengthSq() > 0
      ) {
        const volleyDirection = towardTarget.clone().normalize();
        this.minibossVolleyDirection = volleyDirection;
        this.minibossVolleyQueued = true;
        this.minibossVolleyWindupUntil = currentTime + volleyContract.telegraphMs;
        this.pendingAttackSignal = {
          type: 'miniboss-volley-telegraph',
          x: this.x,
          y: this.y,
          direction: { x: volleyDirection.x, y: volleyDirection.y },
        };
      }

      if (this.minibossVolleyQueued && currentTime >= this.minibossVolleyWindupUntil && !this.pendingAttackSignal) {
        this.minibossVolleyQueued = false;
        this.nextMinibossVolleyAt = currentTime + volleyContract.cooldownMs;
        this.pendingAttackSignal = {
          type: 'miniboss-volley-execute',
          x: this.x,
          y: this.y,
          direction: { x: this.minibossVolleyDirection.x, y: this.minibossVolleyDirection.y },
        };
      }
    }

    if (!this.isBoss()) {
      return;
    }

    if (!this.shockwaveQueued && currentTime >= this.nextShockwaveAt) {
      const contract = createBossShockwaveContract(this.bossPhase);
      this.shockwaveQueued = true;
      this.shockwaveWindupUntil = currentTime + contract.telegraphMs;
      this.shockwaveRadius = contract.radius;
      this.shockwaveDamage = Math.round(Math.max(24, this.contactDamage - 6) * contract.damageMultiplier);
      this.shockwaveThickness = contract.thickness;
      this.shockwaveDurationMs = contract.damageActiveMs;
      this.pendingAttackSignal = {
        type: 'boss-shockwave-telegraph',
        x: this.x,
        y: this.y,
        radius: this.shockwaveRadius,
        damage: this.shockwaveDamage,
        thickness: this.shockwaveThickness,
        telegraphMs: contract.telegraphMs,
        phase: this.bossPhase,
      };
      return;
    }

    if (this.shockwaveQueued && currentTime >= this.shockwaveWindupUntil) {
      const contract = createBossShockwaveContract(this.bossPhase);
      this.shockwaveQueued = false;
      this.pendingAttackSignal = {
        type: 'boss-shockwave-execute',
        x: this.x,
        y: this.y,
        radius: this.shockwaveRadius,
        damage: this.shockwaveDamage,
        durationMs: this.shockwaveDurationMs,
        thickness: this.shockwaveThickness,
        phase: this.bossPhase,
      };
      this.nextShockwaveAt = currentTime + Phaser.Math.Between(contract.cooldownMinMs, contract.cooldownMaxMs);
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
      this.destroyEnemy();
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
    for (const visual of this.roleVisuals) {
      visual.object.destroy();
    }
    this.roleVisuals.length = 0;
    this.responseScale.x = 1;
    this.responseScale.y = 1;
    this.deathPresentationActive = false;
    this.hitReactionUntil = 0;
    super.destroy(fromScene);
  }

  private createRoleVisuals(scene: Phaser.Scene): void {
    const size = this.archetype.size;
    const depth = this.depth + 0.2;

    if (this.archetype.behavior === 'ranged') {
      this.addRoleVisual(scene.add.rectangle(this.x, this.y, size * 0.2, size * 0.78, 0xff3344, 0.96), size * 0.48, 0, 0);
      this.addRoleVisual(scene.add.circle(this.x, this.y, Math.max(4, size * 0.14), 0xffc4c4, 0.95), size * 0.9, 0, 0);
    } else if (this.archetype.behavior === 'strafe') {
      this.addRoleVisual(scene.add.triangle(this.x, this.y, 0, size * 0.34, size * 0.5, 0, size * 0.5, size * 0.68, 0xe0f2fe, 0.75), 0, -size * 0.52, 0);
      this.addRoleVisual(scene.add.triangle(this.x, this.y, 0, 0, size * 0.5, size * 0.34, 0, size * 0.68, 0xe0f2fe, 0.75), 0, size * 0.52, 0);
    } else if (this.archetype.behavior === 'intercept') {
      this.addRoleVisual(scene.add.triangle(this.x, this.y, 0, size * 0.5, size * 0.46, 0, size * 0.92, size * 0.5, 0xfbbf24, 0.84), size * 0.36, 0, 0);
    } else if (this.archetype.behavior === 'charger') {
      this.addRoleVisual(scene.add.triangle(this.x, this.y, 0, size * 0.5, size * 0.44, 0, size * 0.88, size * 0.5, 0xff7722, 0.92), size * 0.42, 0, 0);
    } else if (this.archetype.behavior === 'dash') {
      this.addRoleVisual(scene.add.triangle(this.x, this.y, 0, size * 0.5, size * 0.44, 0, size * 0.88, size * 0.5, 0xffedd5, 0.86), size * 0.42, 0, 0);
    } else if (this.archetype.behavior === 'blocker') {
      this.addRoleVisual(scene.add.rectangle(this.x, this.y, size * 0.74, size * 0.13, 0x84dd50, 0.86), 0, -size * 0.3, 0);
      this.addRoleVisual(scene.add.rectangle(this.x, this.y, size * 0.74, size * 0.13, 0x84dd50, 0.86), 0, size * 0.3, 0);
    } else {
      this.addRoleVisual(scene.add.rectangle(this.x, this.y, size * 0.28, size * 0.12, this.archetype.strokeColor, 0.9), size * 0.44, 0, 0);
    }

    if (this.isElite() || this.isMiniboss() || this.isBoss()) {
      this.addRoleVisual(scene.add.circle(this.x, this.y, size * 0.56, this.archetype.strokeColor, 0.08), 0, 0, 0);
    }

    for (const visual of this.roleVisuals) {
      visual.object.setDepth(depth);
      visual.object.setBlendMode(Phaser.BlendModes.ADD);
    }
  }

  private addRoleVisual(object: Phaser.GameObjects.Shape, forward: number, side: number, angleOffset: number): void {
    this.roleVisuals.push({ object, forward, side, angleOffset });
  }

  private syncRoleVisuals(): void {
    if (this.roleVisuals.length === 0) {
      return;
    }

    const angle = Phaser.Math.DegToRad(this.angle - 90);
    const forwardX = Math.cos(angle);
    const forwardY = Math.sin(angle);
    const sideX = -forwardY;
    const sideY = forwardX;

    for (const visual of this.roleVisuals) {
      visual.object.setPosition(this.x + forwardX * visual.forward + sideX * visual.side, this.y + forwardY * visual.forward + sideY * visual.side);
      visual.object.setAngle(this.angle + visual.angleOffset);
      visual.object.setVisible(this.visible && this.active);
      visual.object.setAlpha(this.alpha);
    }
  }
}
