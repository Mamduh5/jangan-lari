import Phaser from 'phaser';
import type { WeaponDefinition } from '../data/weapons';

export class Projectile extends Phaser.GameObjects.Arc {
  declare body: Phaser.Physics.Arcade.Body;

  private damage = 0;
  private maxDistance = 0;
  private traveledDistance = 0;
  private remainingPierces = 0;
  private explosionRadius = 0;
  private explosionDamageMultiplier = 0;

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

    this.damage = weapon.damage;
    this.maxDistance = weapon.range;
    this.traveledDistance = 0;
    this.remainingPierces = weapon.pierceCount ?? 0;
    this.explosionRadius = weapon.explosionRadius ?? 0;
    this.explosionDamageMultiplier = weapon.explosionDamageMultiplier ?? 0;

    this.setRadius(weapon.projectileRadius);
    this.setFillStyle(weapon.projectileColor);
    this.setStrokeStyle(2, weapon.projectileStrokeColor, 0.9);
    this.setAlpha(weapon.projectileAlpha ?? 1);
    this.setScale(0.9);
    this.setActive(true);
    this.setVisible(true);
    this.setPosition(x, y);

    this.body.enable = true;
    this.body.setCircle(weapon.projectileRadius);
    this.body.setVelocity(
      normalizedDirection.x * weapon.projectileSpeed,
      normalizedDirection.y * weapon.projectileSpeed,
    );
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

  consumeHit(): boolean {
    if (this.remainingPierces > 0) {
      this.remainingPierces -= 1;
      this.setScale(Math.max(0.72, this.scaleX * 0.92));
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
    this.setScale(Math.min(1.18, this.scaleX + deltaSeconds * 0.5));

    if (this.traveledDistance >= this.maxDistance) {
      this.deactivate();
    }
  }

  deactivate(): void {
    this.setActive(false);
    this.setVisible(false);
    this.setPosition(-1000, -1000);
    this.body.stop();
    this.body.enable = false;
  }
}
