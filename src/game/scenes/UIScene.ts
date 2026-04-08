import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import type { UpgradeDefinition } from '../data/upgrades';
import { RunScene } from './RunScene';

export class UIScene extends Phaser.Scene {
  private hpText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private xpBarFill!: Phaser.GameObjects.Rectangle;
  private xpBarLabel!: Phaser.GameObjects.Text;
  private gameOverContainer!: Phaser.GameObjects.Container;
  private levelUpContainer!: Phaser.GameObjects.Container;
  private levelUpButtons: Phaser.GameObjects.Text[] = [];
  private levelUpDescriptions: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('UIScene');
  }

  create(): void {
    const panel = this.add.rectangle(16, 16, 470, 160, 0x020617, 0.76).setOrigin(0);
    panel.setStrokeStyle(2, 0x334155, 0.9);
    panel.setScrollFactor(0);

    this.add
      .text(32, 24, 'Phase 4 Sandbox', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '20px',
        color: '#f8fafc',
      })
      .setScrollFactor(0);

    this.hpText = this.add
      .text(32, 52, 'HP: --/--', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '18px',
        color: '#fca5a5',
      })
      .setScrollFactor(0);

    this.levelText = this.add
      .text(160, 52, 'Level: 1', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '18px',
        color: '#fde68a',
      })
      .setScrollFactor(0);

    this.timerText = this.add
      .text(32, 78, 'Time: 00:00', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '18px',
        color: '#93c5fd',
      })
      .setScrollFactor(0);

    this.add
      .text(GAME_WIDTH - 32, 24, 'ESC: Menu', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '16px',
        color: '#cbd5e1',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);

    this.xpBarLabel = this.add
      .text(32, 108, 'XP', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '15px',
        color: '#bfdbfe',
      })
      .setScrollFactor(0);

    const xpBarFrame = this.add.rectangle(32, 130, 280, 18, 0x172554, 0.95).setOrigin(0, 0.5);
    xpBarFrame.setStrokeStyle(2, 0x60a5fa, 0.8);
    xpBarFrame.setScrollFactor(0);

    this.xpBarFill = this.add.rectangle(32, 130, 0, 12, 0x38bdf8, 1).setOrigin(0, 0.5);
    this.xpBarFill.setScrollFactor(0);

    this.hintText = this.add
      .text(32, 148, 'Collect gems to level up', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '15px',
        color: '#93c5fd',
      })
      .setScrollFactor(0);

    this.gameOverContainer = this.createGameOverOverlay();
    this.levelUpContainer = this.createLevelUpOverlay();

    this.input.keyboard?.on('keydown-ENTER', this.handleConfirmInput, this);
    this.input.keyboard?.on('keydown-SPACE', this.handleConfirmInput, this);
    this.input.keyboard?.on('keydown-ONE', () => this.selectUpgrade(0));
    this.input.keyboard?.on('keydown-TWO', () => this.selectUpgrade(1));
    this.input.keyboard?.on('keydown-THREE', () => this.selectUpgrade(2));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
  }

  update(): void {
    const currentHp = Number(this.registry.get('run.hp') ?? 0);
    const maxHp = Number(this.registry.get('run.maxHp') ?? 0);
    const level = Number(this.registry.get('run.level') ?? 1);
    const xp = Number(this.registry.get('run.xp') ?? 0);
    const xpNext = Number(this.registry.get('run.xpNext') ?? 1);
    const elapsedMs = Number(this.registry.get('run.elapsedMs') ?? 0);
    const gameOver = Boolean(this.registry.get('run.gameOver'));
    const levelUpActive = Boolean(this.registry.get('run.levelUpActive'));
    const instructions = String(this.registry.get('run.instructions') ?? 'Move with WASD or Arrow Keys');
    const levelUpChoices = (this.registry.get('run.levelUpChoices') ?? []) as UpgradeDefinition[];

    this.hpText.setText(`HP: ${currentHp}/${maxHp}`);
    this.levelText.setText(`Level: ${level}`);
    this.timerText.setText(`Time: ${this.formatTime(elapsedMs)}`);
    this.xpBarLabel.setText(`XP ${xp}/${xpNext}`);
    this.xpBarFill.width = Phaser.Math.Clamp((xp / Math.max(1, xpNext)) * 280, 0, 280);
    this.hintText.setText(instructions);

    this.gameOverContainer.setVisible(gameOver);
    this.levelUpContainer.setVisible(levelUpActive && !gameOver);

    if (levelUpActive && !gameOver) {
      this.refreshLevelUpChoices(levelUpChoices);
    }
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

  private createLevelUpOverlay(): Phaser.GameObjects.Container {
    const backdrop = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x020617, 0.72).setOrigin(0);
    const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 860, 420, 0x111827, 0.96);
    panel.setStrokeStyle(3, 0x60a5fa, 1);

    const title = this.add
      .text(GAME_WIDTH / 2, 190, 'Level Up', {
        fontFamily: 'Georgia, serif',
        fontSize: '40px',
        color: '#f8fafc',
      })
      .setOrigin(0.5);

    const subtitle = this.add
      .text(GAME_WIDTH / 2, 232, 'Choose 1 upgrade', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '18px',
        color: '#bfdbfe',
      })
      .setOrigin(0.5);

    const children: Phaser.GameObjects.GameObject[] = [backdrop, panel, title, subtitle];

    for (let index = 0; index < 3; index += 1) {
      const x = 300 + index * 260;
      const button = this.add
        .text(x, 340, `${index + 1}. Upgrade`, {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '24px',
          color: '#f8fafc',
          backgroundColor: '#1e293b',
          padding: { left: 18, right: 18, top: 14, bottom: 14 },
          align: 'center',
          wordWrap: { width: 180 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      button.on('pointerdown', () => this.selectUpgrade(index));
      button.on('pointerover', () => {
        button.setStyle({ backgroundColor: '#334155', color: '#ffffff' });
      });
      button.on('pointerout', () => {
        button.setStyle({ backgroundColor: '#1e293b', color: '#f8fafc' });
      });

      const description = this.add
        .text(x, 410, 'Description', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '16px',
          color: '#cbd5e1',
          align: 'center',
          wordWrap: { width: 190 },
        })
        .setOrigin(0.5);

      this.levelUpButtons.push(button);
      this.levelUpDescriptions.push(description);
      children.push(button, description);
    }

    const helpText = this.add
      .text(GAME_WIDTH / 2, 500, 'Use mouse or press 1, 2, or 3', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '16px',
        color: '#93c5fd',
      })
      .setOrigin(0.5);

    children.push(helpText);

    const container = this.add.container(0, 0, children);
    container.setDepth(90);
    container.setVisible(false);
    container.setScrollFactor(0);

    return container;
  }

  private refreshLevelUpChoices(choices: UpgradeDefinition[]): void {
    for (let index = 0; index < this.levelUpButtons.length; index += 1) {
      const choice = choices[index];
      const button = this.levelUpButtons[index];
      const description = this.levelUpDescriptions[index];

      if (!choice) {
        button.setText(`${index + 1}. --`);
        description.setText('');
        continue;
      }

      button.setText(`${index + 1}. ${choice.title}`);
      description.setText(choice.description);
    }
  }

  private selectUpgrade(index: number): void {
    if (!this.registry.get('run.levelUpActive') || this.registry.get('run.gameOver')) {
      return;
    }

    const runScene = this.scene.get('RunScene') as RunScene;
    runScene.selectLevelUp(index);
  }

  private handleConfirmInput(): void {
    if (this.registry.get('run.gameOver')) {
      this.returnToMenuIfGameOver();
    }
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
    this.input.keyboard?.off('keydown-ENTER', this.handleConfirmInput, this);
    this.input.keyboard?.off('keydown-SPACE', this.handleConfirmInput, this);
    this.input.keyboard?.off('keydown-ONE');
    this.input.keyboard?.off('keydown-TWO');
    this.input.keyboard?.off('keydown-THREE');
  }
}
