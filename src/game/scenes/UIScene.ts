import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import type { UpgradeDefinition } from '../data/upgrades';
import { RunScene } from './RunScene';

export class UIScene extends Phaser.Scene {
  private hpText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private weaponText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private xpBarFill!: Phaser.GameObjects.Rectangle;
  private xpBarLabel!: Phaser.GameObjects.Text;
  private endContainer!: Phaser.GameObjects.Container;
  private endTitleText!: Phaser.GameObjects.Text;
  private endSubtitleText!: Phaser.GameObjects.Text;
  private endStatsText!: Phaser.GameObjects.Text;
  private levelUpContainer!: Phaser.GameObjects.Container;
  private levelUpTimerText!: Phaser.GameObjects.Text;
  private levelUpButtons: Phaser.GameObjects.Text[] = [];
  private levelUpDescriptions: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('UIScene');
  }

  create(): void {
    const panel = this.add.rectangle(18, 16, 500, 176, 0x030712, 0.82).setOrigin(0);
    panel.setStrokeStyle(2, 0x334155, 0.98);
    panel.setScrollFactor(0);

    this.add
      .text(34, 24, 'JANGAN LARI', {
        fontFamily: 'Georgia, serif',
        fontSize: '24px',
        color: '#f8fafc',
      })
      .setScrollFactor(0);

    this.hpText = this.add
      .text(34, 58, 'HP: --/--', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '18px',
        color: '#fca5a5',
      })
      .setScrollFactor(0);

    this.levelText = this.add
      .text(180, 58, 'Level: 1', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '18px',
        color: '#fde68a',
      })
      .setScrollFactor(0);

    this.timerText = this.add
      .text(34, 84, 'Time: 00:00 / 00:00', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '18px',
        color: '#93c5fd',
      })
      .setScrollFactor(0);

    this.goldText = this.add
      .text(272, 84, 'Gold Bank: 0', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '18px',
        color: '#facc15',
      })
      .setScrollFactor(0);

    this.weaponText = this.add
      .text(34, 110, 'Weapons: 1', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '16px',
        color: '#c4b5fd',
      })
      .setScrollFactor(0);

    this.xpBarLabel = this.add
      .text(162, 110, 'XP 0/0   Kills 0', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '15px',
        color: '#bfdbfe',
      })
      .setScrollFactor(0);

    this.add
      .text(GAME_WIDTH - 30, 24, 'ESC: Return to Menu', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '16px',
        color: '#cbd5e1',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);

    const xpBarFrame = this.add.rectangle(34, 140, 356, 18, 0x172554, 0.98).setOrigin(0, 0.5);
    xpBarFrame.setStrokeStyle(2, 0x60a5fa, 0.85);
    xpBarFrame.setScrollFactor(0);

    this.xpBarFill = this.add.rectangle(34, 140, 0, 12, 0x38bdf8, 1).setOrigin(0, 0.5);
    this.xpBarFill.setScrollFactor(0);

    this.hintText = this.add
      .text(34, 158, 'Survive the timer or kill the final boss', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '15px',
        color: '#93c5fd',
      })
      .setScrollFactor(0);

    this.endContainer = this.createEndOverlay();
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
    const kills = Number(this.registry.get('run.kills') ?? 0);
    const xp = Number(this.registry.get('run.xp') ?? 0);
    const xpNext = Number(this.registry.get('run.xpNext') ?? 1);
    const elapsedMs = Number(this.registry.get('run.elapsedMs') ?? 0);
    const targetMs = Number(this.registry.get('run.targetMs') ?? 0);
    const totalGold = Number(this.registry.get('run.totalGold') ?? this.registry.get('save.totalGold') ?? 0);
    const weaponCount = Number(this.registry.get('run.weaponCount') ?? 1);
    const levelUpRemainingMs = Number(this.registry.get('run.levelUpRemainingMs') ?? 0);
    const endActive = Boolean(this.registry.get('run.endActive'));
    const levelUpActive = Boolean(this.registry.get('run.levelUpActive'));
    const instructions = String(this.registry.get('run.instructions') ?? 'Move with WASD or Arrow Keys');
    const levelUpChoices = (this.registry.get('run.levelUpChoices') ?? []) as UpgradeDefinition[];

    this.hpText.setText(`HP: ${currentHp}/${maxHp}`);
    this.levelText.setText(`Level: ${level}`);
    this.timerText.setText(`Time: ${this.formatTime(elapsedMs)} / ${this.formatTime(targetMs)}`);
    this.goldText.setText(`Gold Bank: ${totalGold}`);
    this.weaponText.setText(`Weapons: ${weaponCount}`);
    this.xpBarLabel.setText(`XP ${xp}/${xpNext}   Kills ${kills}`);
    this.xpBarFill.width = Phaser.Math.Clamp((xp / Math.max(1, xpNext)) * 356, 0, 356);
    this.hintText.setText(instructions);

    this.endContainer.setVisible(endActive);
    this.levelUpContainer.setVisible(levelUpActive && !endActive);

    if (endActive) {
      this.refreshEndOverlay(level, kills, elapsedMs);
    }

    if (levelUpActive && !endActive) {
      this.refreshLevelUpChoices(levelUpChoices, levelUpRemainingMs);
    }
  }

  private createEndOverlay(): Phaser.GameObjects.Container {
    const backdrop = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x020617, 0.76).setOrigin(0);
    const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 700, 430, 0x0f172a, 0.98);
    panel.setStrokeStyle(3, 0x475569, 1);

    this.endTitleText = this.add
      .text(GAME_WIDTH / 2, 196, 'Victory', {
        fontFamily: 'Georgia, serif',
        fontSize: '46px',
        color: '#f8fafc',
      })
      .setOrigin(0.5);

    this.endSubtitleText = this.add
      .text(GAME_WIDTH / 2, 248, 'Subtitle', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '20px',
        color: '#cbd5e1',
      })
      .setOrigin(0.5);

    this.endStatsText = this.add
      .text(GAME_WIDTH / 2, 396, 'Kills: 0\nLevel Reached: 1', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '18px',
        color: '#bfdbfe',
        align: 'center',
        wordWrap: { width: 580 },
        lineSpacing: 4,
      })
      .setOrigin(0.5);

    const button = this.add
      .text(GAME_WIDTH / 2, 572, 'Return to Menu', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '24px',
        color: '#fef3c7',
        backgroundColor: '#1f2937',
        padding: { left: 22, right: 22, top: 12, bottom: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    button.on('pointerdown', () => this.returnToMenuIfEnded());
    button.on('pointerover', () => {
      button.setStyle({ color: '#ffffff', backgroundColor: '#374151' });
    });
    button.on('pointerout', () => {
      button.setStyle({ color: '#fef3c7', backgroundColor: '#1f2937' });
    });

    const helpText = this.add
      .text(GAME_WIDTH / 2, 632, 'Press Enter or Space to continue', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '16px',
        color: '#93c5fd',
      })
      .setOrigin(0.5);

    const container = this.add.container(0, 0, [
      backdrop,
      panel,
      this.endTitleText,
      this.endSubtitleText,
      this.endStatsText,
      button,
      helpText,
    ]);
    container.setDepth(100);
    container.setVisible(false);
    container.setScrollFactor(0);

    return container;
  }

  private createLevelUpOverlay(): Phaser.GameObjects.Container {
    const backdrop = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x020617, 0.78).setOrigin(0);
    const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 920, 440, 0x0f172a, 0.98);
    panel.setStrokeStyle(3, 0x60a5fa, 1);

    const title = this.add
      .text(GAME_WIDTH / 2, 176, 'Power Selection', {
        fontFamily: 'Georgia, serif',
        fontSize: '40px',
        color: '#f8fafc',
      })
      .setOrigin(0.5);

    const subtitle = this.add
      .text(GAME_WIDTH / 2, 220, 'Choose 1 upgrade or let the game auto-pick for you.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '18px',
        color: '#bfdbfe',
      })
      .setOrigin(0.5);

    this.levelUpTimerText = this.add
      .text(GAME_WIDTH / 2, 252, 'Auto-pick in 15.0s', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '18px',
        color: '#fef08a',
      })
      .setOrigin(0.5);

    const children: Phaser.GameObjects.GameObject[] = [backdrop, panel, title, subtitle, this.levelUpTimerText];

    for (let index = 0; index < 3; index += 1) {
      const x = 300 + index * 340;
      const card = this.add.rectangle(x, 384, 250, 182, 0x111827, 0.98);
      card.setStrokeStyle(2, 0x334155, 1);

      const button = this.add
        .text(x, 340, `${index + 1}. Upgrade`, {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '24px',
          color: '#f8fafc',
          align: 'center',
          wordWrap: { width: 210 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      button.on('pointerdown', () => this.selectUpgrade(index));
      button.on('pointerover', () => {
        card.setStrokeStyle(2, 0x93c5fd, 1);
        card.setFillStyle(0x172033, 1);
      });
      button.on('pointerout', () => {
        card.setStrokeStyle(2, 0x334155, 1);
        card.setFillStyle(0x111827, 0.98);
      });

      const description = this.add
        .text(x, 412, 'Description', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '16px',
          color: '#cbd5e1',
          align: 'center',
          wordWrap: { width: 210 },
          lineSpacing: 4,
        })
        .setOrigin(0.5);

      this.levelUpButtons.push(button);
      this.levelUpDescriptions.push(description);
      children.push(card, button, description);
    }

    const helpText = this.add
      .text(GAME_WIDTH / 2, 530, 'Use mouse or press 1, 2, or 3', {
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

  private refreshEndOverlay(level: number, kills: number, elapsedMs: number): void {
    const victory = Boolean(this.registry.get('run.victory'));
    const title = String(this.registry.get('run.endTitle') ?? (victory ? 'Victory' : 'Defeat'));
    const subtitle = String(this.registry.get('run.endSubtitle') ?? '');
    const goldEarned = Number(this.registry.get('run.goldEarned') ?? 0);
    const totalGold = Number(this.registry.get('run.totalGold') ?? 0);
    const weaponCount = Number(this.registry.get('run.weaponCount') ?? 1);
    const questRewards = (this.registry.get('run.questRewards') ?? []) as string[];
    const questSummary = questRewards.length > 0 ? `\n\nQuest Rewards\n${questRewards.join('\n')}` : '';

    this.endTitleText.setText(title);
    this.endTitleText.setColor(victory ? '#fef08a' : '#fca5a5');
    this.endSubtitleText.setText(subtitle);
    this.endStatsText.setText(
      `Time Survived: ${this.formatTime(elapsedMs)}\nEnemies Killed: ${kills}\nLevel Reached: ${level}\nWeapons Online: ${weaponCount}\nGold Earned: ${goldEarned}\nTotal Gold: ${totalGold}${questSummary}`,
    );
  }

  private refreshLevelUpChoices(choices: UpgradeDefinition[], remainingMs: number): void {
    this.levelUpTimerText.setText(`Auto-pick in ${(remainingMs / 1000).toFixed(1)}s`);

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
    if (!this.registry.get('run.levelUpActive') || this.registry.get('run.endActive') || !this.scene.isActive('RunScene')) {
      return;
    }

    const runScene = this.scene.get('RunScene') as RunScene;
    runScene.selectLevelUp(index);
  }

  private handleConfirmInput(): void {
    if (this.registry.get('run.endActive')) {
      this.returnToMenuIfEnded();
    }
  }

  private returnToMenuIfEnded(): void {
    if (!this.registry.get('run.endActive')) {
      return;
    }

    if (this.scene.isActive('RunScene')) {
      const runScene = this.scene.get('RunScene') as RunScene;
      runScene.exitToMenu();
      return;
    }

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
