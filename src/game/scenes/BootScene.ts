import Phaser from 'phaser';
import { loadGameSave } from '../save/saveData';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0b1020');
    const saveData = loadGameSave();
    this.registry.set('save.totalGold', saveData.totalGold);
    this.scene.start('MenuScene');
  }
}
