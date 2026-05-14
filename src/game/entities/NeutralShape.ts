import Phaser from 'phaser';
import { NEUTRAL_SHAPE_HIT_FLASH_MS } from '../config/constants';
import { getNeutralShapeDefinition, type NeutralShapeKind } from '../data/neutralShapes';

export class NeutralShape extends Phaser.GameObjects.Polygon {
  declare body: Phaser.Physics.Arcade.Body;

  private readonly kind: NeutralShapeKind;
  private readonly maxHealth: number;
  private readonly xpValue: number;
  private readonly baseFillColor: number;
  private readonly baseStrokeColor: number;
  private health: number;

  constructor(scene: Phaser.Scene, x: number, y: number, kind: NeutralShapeKind) {
    const definition = getNeutralShapeDefinition(kind);
    super(scene, x, y, buildPolygonPoints(definition.sides, definition.size, definition.rotationDeg), definition.fillColor, 0.9);

    this.kind = kind;
    this.maxHealth = definition.maxHealth;
    this.health = definition.maxHealth;
    this.xpValue = definition.xpValue;
    this.baseFillColor = definition.fillColor;
    this.baseStrokeColor = definition.strokeColor;

    this.setStrokeStyle(3, definition.strokeColor, 0.92);
    this.setDepth(3.5);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const bodySize = Math.max(18, Math.round(definition.size * 0.9));
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.body.setSize(bodySize, bodySize, true);
  }

  getCurrentHealth(): number {
    return this.health;
  }

  getMaxHealth(): number {
    return this.maxHealth;
  }

  getXpValue(): number {
    return this.xpValue;
  }

  getKind(): NeutralShapeKind {
    return this.kind;
  }

  isAlive(): boolean {
    return this.health > 0;
  }

  takeDamage(amount: number, currentTime: number): boolean {
    if (!this.active || !this.isAlive()) {
      return false;
    }

    this.health = Math.max(0, this.health - amount);
    this.setFillStyle(0xffffff, 0.96);
    this.setScale(1.08);

    this.scene.time.delayedCall(NEUTRAL_SHAPE_HIT_FLASH_MS, () => {
      if (!this.active || !this.isAlive()) {
        return;
      }

      this.setFillStyle(this.baseFillColor, 0.9);
      this.setScale(1);
    });

    return !this.isAlive();
  }

  updatePresentation(currentTime: number): void {
    if (!this.active || !this.isAlive()) {
      return;
    }

    const pulse = 1 + Math.sin((currentTime + this.x * 1.7 + this.y * 0.6) * 0.006) * 0.025;
    this.setScale(pulse);
    this.setAngle(this.angle + 0.04);
    this.setStrokeStyle(3, this.baseStrokeColor, 0.86 + Math.sin(currentTime * 0.006) * 0.06);
  }
}

function buildPolygonPoints(sides: number, size: number, rotationDeg: number): number[] {
  const radius = size / 2;
  const rotation = Phaser.Math.DegToRad(rotationDeg);
  const points: number[] = [];

  for (let index = 0; index < sides; index += 1) {
    const angle = rotation + (Math.PI * 2 * index) / sides;
    points.push(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }

  return points;
}
