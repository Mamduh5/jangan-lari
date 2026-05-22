import Phaser from 'phaser';
import { XP_GEM_ATTRACT_SPEED } from '../config/constants';
import { getXpGemVisual, type XpGemTier } from '../systems/readabilityVisuals';
import { getPickupIconAssetSlot, shouldUseVisualAsset } from '../utils/assetResolver';
import { Player } from './Player';

const DEFAULT_XP_GEM_VALUE = 8;

export class XPGem extends Phaser.GameObjects.Arc {
  declare body: Phaser.Physics.Arcade.Body;

  private value = DEFAULT_XP_GEM_VALUE;
  private readonly tier: XpGemTier;
  private readonly gemFillColor: number;
  private readonly gemStrokeColor: number;
  private readonly glowColor: number;
  private glow: Phaser.GameObjects.Arc | null = null;
  private iconOverlay: Phaser.GameObjects.Image | null = null;
  private iconOverlayActive = false;

  constructor(scene: Phaser.Scene, x: number, y: number, value = DEFAULT_XP_GEM_VALUE) {
    const visual = getXpGemVisual(value);
    super(scene, x, y, visual.radius, 0, 360, false, visual.fillColor);

    this.value = value;
    this.tier = visual.tier;
    this.gemFillColor = visual.fillColor;
    this.gemStrokeColor = visual.strokeColor;
    this.glowColor = visual.glowColor;
    this.setStrokeStyle(value >= 24 ? 3 : 2, visual.strokeColor, 0.86);
    this.setDepth(3);

    if (visual.tier !== 'small') {
      this.glow = scene.add.circle(x, y, visual.radius * 1.9, visual.glowColor, visual.tier === 'huge' ? 0.2 : 0.14);
      this.glow.setBlendMode(Phaser.BlendModes.ADD);
      this.glow.setDepth(2.9);
    }

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setAllowGravity(false);
    this.body.setCircle(visual.radius);
    this.body.setDrag(1200, 1200);
    this.refreshIconOverlay(scene, visual.radius);
  }

  getValue(): number {
    return this.value;
  }

  getTier(): XpGemTier {
    return this.tier;
  }

  getFillColor(): number {
    return this.gemFillColor;
  }

  getStrokeColor(): number {
    return this.gemStrokeColor;
  }

  getGlowColor(): number {
    return this.glowColor;
  }

  update(player: Player): void {
    if (!this.active) {
      return;
    }

    const pulse = 1 + Math.sin((this.scene.time.now + this.x * 2) * 0.01) * 0.08;
    this.setFillStyle(this.gemFillColor, this.tier === 'huge' ? 0.98 : 0.92);
    this.setScale(pulse);
    this.glow?.setPosition(this.x, this.y);
    this.glow?.setScale(pulse * (this.tier === 'huge' ? 1.12 : 1));
    this.syncIconOverlay(pulse);

    const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    if (distance > player.getPickupRange()) {
      this.setAlpha(0.88);
      this.body.setVelocity(0, 0);
      return;
    }

    const direction = new Phaser.Math.Vector2(player.x - this.x, player.y - this.y);
    if (direction.lengthSq() === 0) {
      this.body.setVelocity(0, 0);
      return;
    }

    const attractionSpeed = XP_GEM_ATTRACT_SPEED + Math.max(0, player.getPickupRange() - distance) * 2.4;
    this.setAlpha(1);
    this.setScale(1.08 + Math.sin(this.scene.time.now * 0.02) * 0.12);
    this.syncIconOverlay(this.scaleX);
    direction.normalize();
    this.body.setVelocity(direction.x * attractionSpeed, direction.y * attractionSpeed);
  }

  playCollectFeedback(): void {
    this.setScale(1.45);
    this.glow?.setScale(1.75);
    this.syncIconOverlay(1.45);
    this.setAlpha(1);
  }

  destroy(fromScene?: boolean): void {
    this.glow?.destroy();
    this.iconOverlay?.destroy();
    this.iconOverlay = null;
    this.iconOverlayActive = false;
    super.destroy(fromScene);
  }

  private refreshIconOverlay(scene: Phaser.Scene, radius: number): void {
    const pickupId = `xp-${this.tier}` as const;
    const slot = getPickupIconAssetSlot(pickupId);
    this.iconOverlayActive = shouldUseVisualAsset(scene, 'pickupIcons', slot);

    if (!this.iconOverlayActive) {
      this.iconOverlay?.setVisible(false);
      return;
    }

    this.iconOverlay = scene.add.image(this.x, this.y, slot.key).setDepth(this.depth + 0.2);
    this.iconOverlay.setDisplaySize(radius * 2.4, radius * 2.4).setAlpha(0.96);
  }

  private syncIconOverlay(scale: number): void {
    if (!this.iconOverlay || !this.iconOverlayActive) {
      return;
    }

    this.iconOverlay
      .setPosition(this.x, this.y)
      .setScale(scale)
      .setAlpha(this.alpha)
      .setVisible(this.visible && this.active);
  }
}
