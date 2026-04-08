import Phaser from 'phaser';
import { ENEMY_BASE_DAMAGE, ENEMY_BASE_SPEED } from '../config/constants';

export class Enemy extends Phaser.GameObjects.Rectangle {
  declare body: Phaser.Physics.Arcade.Body;

  readonly contactDamage: number;
  private readonly speed: number;

  constructor(scene: Phaser.Scene, x: number, y: number, speedBonus = 0, damageBonus = 0) {
    super(scene, x, y, 28, 28, 0xf97316);

    this.speed = ENEMY_BASE_SPEED + speedBonus;
    this.contactDamage = ENEMY_BASE_DAMAGE + damageBonus;

    this.setStrokeStyle(2, 0xffedd5, 0.65);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setSize(24, 24);
    this.body.setMaxVelocity(this.speed, this.speed);
  }

  chase(target: Phaser.GameObjects.Components.Transform): void {
    const direction = new Phaser.Math.Vector2(target.x - this.x, target.y - this.y);

    if (direction.lengthSq() === 0) {
      this.body.setVelocity(0, 0);
      return;
    }

    direction.normalize();
    this.body.setVelocity(direction.x * this.speed, direction.y * this.speed);
  }
}
