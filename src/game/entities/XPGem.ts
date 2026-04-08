import Phaser from 'phaser';
import { XP_GEM_ATTRACT_SPEED, XP_GEM_VALUE } from '../config/constants';
import { Player } from './Player';

export class XPGem extends Phaser.GameObjects.Arc {
  declare body: Phaser.Physics.Arcade.Body;

  private value = XP_GEM_VALUE;

  constructor(scene: Phaser.Scene, x: number, y: number, value = XP_GEM_VALUE) {
    super(scene, x, y, 7, 0, 360, false, 0x60a5fa);

    this.value = value;
    this.setStrokeStyle(2, 0xdbeafe, 0.8);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setAllowGravity(false);
    this.body.setCircle(7);
    this.body.setDrag(1200, 1200);
  }

  getValue(): number {
    return this.value;
  }

  update(player: Player): void {
    if (!this.active) {
      return;
    }

    const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    if (distance > player.getPickupRange()) {
      this.body.setVelocity(0, 0);
      return;
    }

    const direction = new Phaser.Math.Vector2(player.x - this.x, player.y - this.y);
    if (direction.lengthSq() === 0) {
      this.body.setVelocity(0, 0);
      return;
    }

    direction.normalize();
    this.body.setVelocity(direction.x * XP_GEM_ATTRACT_SPEED, direction.y * XP_GEM_ATTRACT_SPEED);
  }
}
