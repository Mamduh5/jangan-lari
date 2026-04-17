import Phaser from 'phaser';
import { getWeaponCombatResponseProfile } from '../combat/combatResponse';
import type { WeaponDefinition } from '../data/weapons';

export class Projectile extends Phaser.GameObjects.Arc {
  declare body: Phaser.Physics.Arcade.Body;

  private weaponId: WeaponDefinition['id'] = 'arc-bolt';
  private damage = 0;
  private maxDistance = 0;
  private traveledDistance = 0;
  private remainingPierces = 0;
  private explosionRadius = 0;
  private explosionDamageMultiplier = 0;
  private visualColor = 0xfacc15;
  private visualRadius = 5;
  private firePattern: WeaponDefinition['firePattern'] = 'targeted';
  private trailAccumulatorMs = 0;
  private travelScale = 0.9;
  private readonly responseScale = { x: 1, y: 1 };

  constructor(scene: Phaser.Scene) {
    super(scene, -1000, -1000, 5, 0, 360, false, 0xfacc15);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(7);
    this.body.setAllowGravity(false);
    this.body.setCircle(5);
    this.deactivate();
  }

  fire(x: number, y: number, direction: Phaser.Math.Vector2, weapon: WeaponDefinition): void {
    const normalizedDirection = direction.clone().normalize();

    this.weaponId = weapon.id;
    this.damage = weapon.damage;
    this.maxDistance = weapon.range;
    this.traveledDistance = 0;
    this.remainingPierces = weapon.pierceCount ?? 0;
    this.explosionRadius = weapon.explosionRadius ?? 0;
    this.explosionDamageMultiplier = weapon.explosionDamageMultiplier ?? 0;
    this.visualColor = weapon.projectileColor;
    this.visualRadius = weapon.projectileRadius;
    this.firePattern = weapon.firePattern ?? 'targeted';
    this.trailAccumulatorMs = 0;
    this.travelScale = weapon.firePattern === 'radial' ? 1.08 : weapon.pierceCount ? 1.12 : 0.9;
    this.scene.tweens.killTweensOf(this.responseScale);
    this.responseScale.x = 1;
    this.responseScale.y = 1;

    this.setRadius(weapon.projectileRadius);
    this.setFillStyle(weapon.projectileColor);
    this.setStrokeStyle(weapon.explosionRadius ? 4 : weapon.pierceCount ? 3 : 2, weapon.projectileStrokeColor, 0.95);
    this.setAlpha(weapon.projectileAlpha ?? 1);
    this.setScale(weapon.firePattern === 'radial' ? 1.08 : weapon.pierceCount ? 1.12 : 0.9);
    this.setBlendMode(
      weapon.firePattern === 'radial' || weapon.pierceCount || weapon.explosionRadius
        ? Phaser.BlendModes.ADD
        : Phaser.BlendModes.NORMAL,
    );
    this.setActive(true);
    this.setVisible(true);
    this.setPosition(x, y);

    this.body.enable = true;
    this.body.setCircle(weapon.projectileRadius);
    this.body.setVelocity(
      normalizedDirection.x * weapon.projectileSpeed,
      normalizedDirection.y * weapon.projectileSpeed,
    );

    this.playLaunchResponse(weapon);
  }

  getDamage(): number {
    return this.damage;
  }

  getExplosionRadius(): number {
    return this.explosionRadius;
  }

  getExplosionDamage(): number {
    return Math.max(0, Math.round(this.damage * this.explosionDamageMultiplier));
  }

  getVisualColor(): number {
    return this.visualColor;
  }

  getVisualRadius(): number {
    return this.visualRadius;
  }

  getWeaponId(): WeaponDefinition['id'] {
    return this.weaponId;
  }

  consumeHit(): boolean {
    if (this.remainingPierces > 0) {
      this.remainingPierces -= 1;
      this.travelScale = Math.max(0.72, this.travelScale * 0.92);
      this.setScale(this.travelScale * this.responseScale.x, this.travelScale * this.responseScale.y);
      return false;
    }

    return true;
  }

  update(deltaMs: number): void {
    if (!this.active) {
      return;
    }

    const deltaSeconds = deltaMs / 1000;
    const speed = this.body.velocity.length();
    this.traveledDistance += speed * deltaSeconds;

    const scaleTarget =
      this.firePattern === 'radial'
        ? 1.2
        : this.explosionRadius > 0
          ? 1.26
          : this.remainingPierces > 0
            ? 1.22
            : 1.08;
    this.travelScale = Math.min(scaleTarget, this.travelScale + deltaSeconds * 0.5);
    this.setScale(this.travelScale * this.responseScale.x, this.travelScale * this.responseScale.y);
    this.trailAccumulatorMs += deltaMs;

    if (this.shouldEmitTrail() && this.trailAccumulatorMs >= 36) {
      this.trailAccumulatorMs = 0;
      this.emitTrail();
    }

    if (this.traveledDistance >= this.maxDistance) {
      this.deactivate();
    }
  }

  deactivate(): void {
    this.scene.tweens.killTweensOf(this.responseScale);
    this.travelScale = 0.9;
    this.responseScale.x = 1;
    this.responseScale.y = 1;
    this.setActive(false);
    this.setVisible(false);
    this.setPosition(-1000, -1000);
    this.body.stop();
    this.body.enable = false;
  }

  private shouldEmitTrail(): boolean {
    return this.firePattern === 'radial' || this.remainingPierces > 0 || this.explosionRadius > 0;
  }

  private emitTrail(): void {
    const trail = this.scene.add
      .circle(this.x, this.y, Math.max(3, this.visualRadius * 0.72), this.visualColor, this.firePattern === 'radial' ? 0.16 : 0.2)
      .setDepth(6);
    trail.setBlendMode(Phaser.BlendModes.ADD);

    this.scene.tweens.add({
      targets: trail,
      scale: 0.72,
      alpha: 0,
      duration: 110,
      ease: 'Quad.Out',
      onComplete: () => trail.destroy(),
    });
  }

  private playLaunchResponse(weapon: WeaponDefinition): void {
    const responseProfile = getWeaponCombatResponseProfile(weapon.id);
    if (!responseProfile) {
      return;
    }

    this.responseScale.x = responseProfile.launchScaleX;
    this.responseScale.y = responseProfile.launchScaleY;

    this.scene.tweens.add({
      targets: this.responseScale,
      x: 1,
      y: 1,
      duration: responseProfile.launchTweenMs,
      ease: 'Quad.Out',
    });
  }

  destroy(fromScene?: boolean): void {
    this.scene.tweens.killTweensOf(this.responseScale);
    this.responseScale.x = 1;
    this.responseScale.y = 1;
    super.destroy(fromScene);
  }
}
