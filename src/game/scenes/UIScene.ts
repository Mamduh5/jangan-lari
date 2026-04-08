import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';

export class UIScene extends Phaser.Scene {
  private hpText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private gameOverContainer!: Phaser.GameObjects.Container;

  constructor() {
    super('UIScene');
  }

  create(): void {
    const panel = this.add.rectangle(16, 16, 420, 116, 0x020617, 0.72).setOrigin(0);
    panel.setStrokeStyle(2, 0x334155, 0.9);
    panel.setScrollFactor(0);

    this.add
      .text(32, 26, 'Phase 3 Sandbox', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '20px',
        color: '#f8fafc',
      })
      .setScrollFactor(0);

    this.hpText = this.add
      .text(32, 54, 'HP: --/--', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '18px',
        color: '#fca5a5',
      })
      .setScrollFactor(0);

    this.timerText = this.add
      .text(32, 80, 'Time: 00:00', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '18px',
        color: '#93c5fd',
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

    this.hintText = this.add
      .text(32, 106, 'Auto-fire attacks nearby enemies', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '15px',
        color: '#93c5fd',
      })
      .setScrollFactor(0);

    this.gameOverContainer = this.createGameOverOverlay();

    this.input.keyboard?.on('keydown-ENTER', this.returnToMenuIfGameOver, this);
    this.input.keyboard?.on('keydown-SPACE', this.returnToMenuIfGameOver, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
  }

  update(): void {
    const currentHp = Number(this.registry.get('run.hp') ?? 0);
    const maxHp = Number(this.registry.get('run.maxHp') ?? 0);
    const elapsedMs = Number(this.registry.get('run.elapsedMs') ?? 0);
    const gameOver = Boolean(this.registry.get('run.gameOver'));
    const instructions = String(this.registry.get('run.instructions') ?? 'Move with WASD or Arrow Keys');

    this.hpText.setText(`HP: ${currentHp}/${maxHp}`);
    this.timerText.setText(`Time: ${this.formatTime(elapsedMs)}`);
    this.hintText.setText(instructions);
    this.gameOverContainer.setVisible(gameOver);
  }

  private createGameOverOverlay(): Phaser.GameObjects.Container {
    const backdrop = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x020617, 0.7).setOrigin(0);
    const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 460, 220, 0x111827, 0.94);
    panel.setStrokeStyle(3, 0x475569, 1);

    const title = this.add
      .text(GAME_WIDTH / 2, 300, 'Run Over', {
        fontFamily: 'Georgia, serif',
        fontSize: '42px',
        color: '#f8fafc',
      })
      .setOrigin(0.5);

    const subtitle = this.add
      .text(GAME_WIDTH / 2, 350, 'You were overwhelmed.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '20px',
        color: '#cbd5e1',
      })
      .setOrigin(0.5);

    const button = this.add
      .text(GAME_WIDTH / 2, 420, 'Return to Menu', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '24px',
        color: '#fef3c7',
        backgroundColor: '#1f2937',
        padding: { left: 20, right: 20, top: 10, bottom: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    button.on('pointerdown', () => this.returnToMenuIfGameOver());
    button.on('pointerover', () => {
      button.setStyle({ color: '#ffffff', backgroundColor: '#374151' });
    });
    button.on('pointerout', () => {
      button.setStyle({ color: '#fef3c7', backgroundColor: '#1f2937' });
    });

    const helpText = this.add
      .text(GAME_WIDTH / 2, 475, 'Press Enter or Space to continue', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '16px',
        color: '#93c5fd',
      })
      .setOrigin(0.5);

    const container = this.add.container(0, 0, [backdrop, panel, title, subtitle, button, helpText]);
    container.setDepth(100);
    container.setVisible(false);
    container.setScrollFactor(0);

    return container;
  }

  private returnToMenuIfGameOver(): void {
    if (!this.registry.get('run.gameOver')) {
      return;
    }

    this.scene.stop('RunScene');
    this.scene.stop();
    this.scene.start('MenuScene');
  }

  private formatTime(elapsedMs: number): string {
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  private handleShutdown(): void {
    this.input.keyboard?.off('keydown-ENTER', this.returnToMenuIfGameOver, this);
    this.input.keyboard?.off('keydown-SPACE', this.returnToMenuIfGameOver, this);
  }
}
