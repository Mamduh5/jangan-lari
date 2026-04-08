import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    this.add
      .text(centerX, centerY - 120, 'JANGAN LARI', {
        fontFamily: 'Georgia, serif',
        fontSize: '48px',
        color: '#f8fafc',
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY - 56, 'Phase 2 Survival Sandbox', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '20px',
        color: '#93c5fd',
      })
      .setOrigin(0.5);

    const startLabel = this.add
      .text(centerX, centerY + 24, 'Start Run', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '28px',
        color: '#fef3c7',
        backgroundColor: '#1f2937',
        padding: { left: 24, right: 24, top: 12, bottom: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    startLabel.on('pointerover', () => {
      startLabel.setStyle({ color: '#ffffff', backgroundColor: '#374151' });
    });

    startLabel.on('pointerout', () => {
      startLabel.setStyle({ color: '#fef3c7', backgroundColor: '#1f2937' });
    });

    startLabel.on('pointerdown', () => {
      this.startRun();
    });

    this.add
      .text(centerX, centerY + 120, 'Move with WASD or Arrow Keys, avoid the swarm', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '18px',
        color: '#cbd5e1',
      })
      .setOrigin(0.5);

    this.input.keyboard?.once('keydown-ENTER', () => this.startRun());
    this.input.keyboard?.once('keydown-SPACE', () => this.startRun());
  }

  private startRun(): void {
    this.scene.start('RunScene');
    this.scene.launch('UIScene');
  }
}
