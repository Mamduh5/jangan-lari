import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/constants';

export class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  create(): void {
    const panel = this.add.rectangle(16, 16, 340, 72, 0x020617, 0.72).setOrigin(0);
    panel.setStrokeStyle(2, 0x334155, 0.9);
    panel.setScrollFactor(0);

    this.add
      .text(32, 28, 'Phase 1 Sandbox', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '20px',
        color: '#f8fafc',
      })
      .setScrollFactor(0);

    this.add
      .text(GAME_WIDTH - 32, 28, 'ESC: Menu', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '16px',
        color: '#cbd5e1',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);

    this.add
      .text(32, 52, 'Move with WASD or Arrow Keys', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '16px',
        color: '#93c5fd',
      })
      .setScrollFactor(0);
  }
}
