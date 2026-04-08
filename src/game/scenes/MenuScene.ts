import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { loadGameSave } from '../save/saveData';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create(): void {
    const saveData = loadGameSave();
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    this.add
      .text(centerX, centerY - 140, 'JANGAN LARI', {
        fontFamily: 'Georgia, serif',
        fontSize: '48px',
        color: '#f8fafc',
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY - 82, 'Phase 6 Meta Progression', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '20px',
        color: '#93c5fd',
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY - 32, `Total Gold: ${saveData.totalGold}`, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '24px',
        color: '#fde68a',
      })
      .setOrigin(0.5);

    const startLabel = this.createMenuButton(centerX, centerY + 34, 'Start Run', () => {
      this.scene.start('RunScene');
      this.scene.launch('UIScene');
    });

    const metaLabel = this.createMenuButton(centerX, centerY + 102, 'Meta Upgrades', () => {
      this.scene.start('MetaScene');
    });

    this.add
      .text(centerX, centerY + 176, 'Survive runs, earn gold, buy permanent boosts', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '18px',
        color: '#cbd5e1',
      })
      .setOrigin(0.5);

    this.input.keyboard?.once('keydown-ENTER', () => startLabel.emit('pointerdown'));
    this.input.keyboard?.once('keydown-SPACE', () => startLabel.emit('pointerdown'));
    this.input.keyboard?.once('keydown-M', () => metaLabel.emit('pointerdown'));
  }

  private createMenuButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Text {
    const button = this.add
      .text(x, y, label, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '28px',
        color: '#fef3c7',
        backgroundColor: '#1f2937',
        padding: { left: 24, right: 24, top: 12, bottom: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    button.on('pointerover', () => {
      button.setStyle({ color: '#ffffff', backgroundColor: '#374151' });
    });

    button.on('pointerout', () => {
      button.setStyle({ color: '#fef3c7', backgroundColor: '#1f2937' });
    });

    button.on('pointerdown', onClick);
    return button;
  }
}
