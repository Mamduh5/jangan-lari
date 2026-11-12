import Phaser from 'phaser';
import { isReviewedRuntimeSprite } from '../config/visualAssetRuntimeConfig';
import type { VisualAssetSlot } from '../data/assetSlots';
import { RUNTIME_PRELOAD_VISUAL_ASSET_SLOTS } from '../data/presentVisualAssets';
import { loadGameSave } from '../save/saveData';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    for (const slot of RUNTIME_PRELOAD_VISUAL_ASSET_SLOTS) {
      if (!isReviewedRuntimeSprite(slot)) {
        this.load.image(slot.key, slot.path);
      }
    }
  }

  async create(): Promise<void> {
    this.cameras.main.setBackgroundColor('#0b1020');
    const saveData = loadGameSave();
    this.registry.set('save.totalGold', saveData.totalGold);
    // Optional character artwork must not fail the Phaser loader or block play.
    await Promise.all(RUNTIME_PRELOAD_VISUAL_ASSET_SLOTS
      .filter(isReviewedRuntimeSprite)
      .map((slot) => this.loadReviewedSprite(slot)));
    if (this.sys.isActive()) this.scene.start('MenuScene');
  }

  private loadReviewedSprite(slot: VisualAssetSlot): Promise<void> {
    return new Promise((resolve) => {
      const image = new Image();
      const finish = (loaded: boolean): void => {
        window.clearTimeout(timeout);
        image.onload = null;
        image.onerror = null;
        try {
          if (loaded && this.sys.isActive() && !this.textures.exists(slot.key)) {
            this.textures.addImage(slot.key, image);
          }
        } catch {
          // Optional art registration may fail; the entity retains its shape fallback.
        } finally {
          if (!loaded) image.removeAttribute('src');
          resolve();
        }
      };
      const timeout = window.setTimeout(() => finish(false), 5000);
      image.onload = () => finish(true);
      image.onerror = () => finish(false);
      image.src = slot.path;
    });
  }
}
