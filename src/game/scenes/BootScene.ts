import Phaser from 'phaser';
import { PRELOAD_VISUAL_ASSET_SLOTS } from '../data/presentVisualAssets';
import { loadGameSave } from '../save/saveData';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    for (const slot of PRELOAD_VISUAL_ASSET_SLOTS) {
      this.load.image(slot.key, slot.path);
    }
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0b1020');
    const saveData = loadGameSave();
    this.registry.set('save.totalGold', saveData.totalGold);
    this.scene.start('MenuScene');
  }
}
