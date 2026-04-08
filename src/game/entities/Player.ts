import Phaser from 'phaser';
import { PLAYER_SPEED } from '../config/constants';

export class Player extends Phaser.GameObjects.Rectangle {
  declare body: Phaser.Physics.Arcade.Body;

  private readonly speed = PLAYER_SPEED;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 34, 34, 0x6ee7b7);

    this.setStrokeStyle(2, 0xeafff7, 0.7);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setCollideWorldBounds(true);
    this.body.setDrag(1600, 1600);
    this.body.setMaxVelocity(this.speed, this.speed);
  }

  move(direction: Phaser.Math.Vector2): void {
    if (direction.lengthSq() === 0) {
      this.body.setAcceleration(0, 0);
      this.body.setVelocity(0, 0);
      return;
    }

    direction.normalize();
    this.body.setVelocity(direction.x * this.speed, direction.y * this.speed);
  }
}
