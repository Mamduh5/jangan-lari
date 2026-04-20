import Phaser from 'phaser';
import type { AbilityId } from '../data/abilities';

export type AbilityProjectilePayload = {
  sourceAbilityId: AbilityId;
  damage: number;
  maxDistance: number;
  speed: number;
  radius: number;
  color: number;
  strokeColor: number;
};

export class AbilityProjectile extends Phaser.GameObjects.Arc {
  declare body: Phaser.Physics.Arcade.Body;

  private sourceAbilityId: AbilityId = 'brace-shot';
  private damage = 0;
  private maxDistance = 0;
  private traveledDistance = 0;

  constructor(scene: Phaser.Scene) {
    super(scene, -1000, -1000, 5, 0, 360, false, 0xffffff);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(7);
    this.body.setAllowGravity(false);
    this.deactivate();
  }

  fire(x: number, y: number, direction: Phaser.Math.Vector2, payload: AbilityProjectilePayload): void {
    const normalizedDirection = direction.clone().normalize();
    this.sourceAbilityId = payload.sourceAbilityId;
    this.damage = payload.damage;
    this.maxDistance = payload.maxDistance;
    this.traveledDistance = 0;

    this.setRadius(payload.radius);
    this.setFillStyle(payload.color, 0.95);
    this.setStrokeStyle(2, payload.strokeColor, 0.95);
    this.setActive(true);
    this.setVisible(true);
    this.setPosition(x, y);

    this.body.enable = true;
    this.body.setCircle(payload.radius);
    this.body.setVelocity(normalizedDirection.x * payload.speed, normalizedDirection.y * payload.speed);
  }

  getSourceAbilityId(): AbilityId {
    return this.sourceAbilityId;
  }

  getDamage(): number {
    return this.damage;
  }

  update(deltaMs: number): void {
    if (!this.active) {
      return;
    }

    const deltaSeconds = deltaMs / 1000;
    this.traveledDistance += this.body.velocity.length() * deltaSeconds;

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
