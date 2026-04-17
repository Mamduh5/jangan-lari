import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import type { UpgradeDefinition } from '../data/upgrades';
import { RunScene } from './RunScene';

export class UIScene extends Phaser.Scene {
  private heroText!: Phaser.GameObjects.Text;
  private passiveText!: Phaser.GameObjects.Text;
  private hpText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private loadoutLabel!: Phaser.GameObjects.Text;
  private loadoutChipTexts: Phaser.GameObjects.Text[] = [];
  private alertText!: Phaser.GameObjects.Text;
  private rewardText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private xpBarFill!: Phaser.GameObjects.Rectangle;
  private xpBarLabel!: Phaser.GameObjects.Text;
  private endContainer!: Phaser.GameObjects.Container;
  private endTitleText!: Phaser.GameObjects.Text;
  private endSubtitleText!: Phaser.GameObjects.Text;
  private endStatsText!: Phaser.GameObjects.Text;
  private endButton!: Phaser.GameObjects.Text;
  private levelUpContainer!: Phaser.GameObjects.Container;
  private levelUpTimerText!: Phaser.GameObjects.Text;
  private levelUpButtons: Phaser.GameObjects.Text[] = [];
  private levelUpDescriptions: Phaser.GameObjects.Text[] = [];

  private readonly handleSelectUpgradeOne = (): void => {
    this.selectUpgrade(0);
  };

  private readonly handleSelectUpgradeTwo = (): void => {
    this.selectUpgrade(1);
  };

  private readonly handleSelectUpgradeThree = (): void => {
    this.selectUpgrade(2);
  };

  constructor() {
    super('UIScene');
  }

  create(): void {
    const panel = this.add.rectangle(18, 16, 560, 240, 0x030712, 0.9).setOrigin(0);
    panel.setStrokeStyle(2, 0x334155, 0.98);
    panel.setScrollFactor(0);

    this.add
      .text(34, 24, 'JANGAN LARI', {
        fontFamily: 'Georgia, serif',
        fontSize: '26px',
        color: '#f8fafc',
      })
      .setScrollFactor(0);

    this.heroText = this.add
      .text(34, 56, '--', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '16px',
        color: '#fdf4ff',
        backgroundColor: '#581c87',
        padding: { left: 10, right: 10, top: 6, bottom: 6 },
      })
      .setScrollFactor(0);

    this.passiveText = this.add
      .text(146, 58, 'PASSIVE --', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '14px',
        color: '#c4b5fd',
        backgroundColor: '#221133',
        padding: { left: 8, right: 8, top: 5, bottom: 5 },
        wordWrap: { width: 410 },
      })
      .setScrollFactor(0);

    this.hpText = this.add
      .text(34, 88, 'HP: --/--', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '20px',
        color: '#fca5a5',
      })
      .setScrollFactor(0);

    this.levelText = this.add
      .text(190, 88, 'Level: 1', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '20px',
        color: '#fde68a',
      })
      .setScrollFactor(0);

    this.timerText = this.add
      .text(34, 118, 'Time: 00:00 / 00:00', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '20px',
        color: '#93c5fd',
      })
      .setScrollFactor(0);

    this.goldText = this.add
      .text(298, 118, 'Gold Bank: 0', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '20px',
        color: '#facc15',
      })
      .setScrollFactor(0);

    this.loadoutLabel = this.add
      .text(34, 148, 'KIT', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '13px',
        color: '#d8b4fe',
        backgroundColor: '#312e81',
        padding: { left: 8, right: 8, top: 5, bottom: 5 },
      })
      .setScrollFactor(0);

    for (let index = 0; index < 4; index += 1) {
      const chip = this.add
        .text(88 + index * 108, 148, '--', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '13px',
          color: '#e2e8f0',
          backgroundColor: '#1f2937',
          padding: { left: 8, right: 8, top: 5, bottom: 5 },
        })
        .setScrollFactor(0)
        .setVisible(false);

      this.loadoutChipTexts.push(chip);
    }

    this.xpBarLabel = this.add
      .text(34, 180, 'XP 0/0   Kills 0', {
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

    this.alertText = this.add
      .text(GAME_WIDTH - 30, 52, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '15px',
        color: '#e2e8f0',
        backgroundColor: '#1e293b',
        padding: { left: 12, right: 12, top: 8, bottom: 8 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setVisible(false);

    this.rewardText = this.add
      .text(GAME_WIDTH / 2, 26, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '17px',
        color: '#fef3c7',
        backgroundColor: '#111827',
        padding: { left: 14, right: 14, top: 8, bottom: 8 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(20)
      .setVisible(false);

    const xpBarFrame = this.add.rectangle(34, 206, 420, 20, 0x172554, 0.98).setOrigin(0, 0.5);
    xpBarFrame.setStrokeStyle(2, 0x60a5fa, 0.85);
    xpBarFrame.setScrollFactor(0);

    this.xpBarFill = this.add.rectangle(34, 206, 0, 14, 0x38bdf8, 1).setOrigin(0, 0.5);
    this.xpBarFill.setScrollFactor(0);

    this.hintText = this.add
      .text(34, 226, 'Survive the timer or kill the final boss', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '14px',
        color: '#93c5fd',
        wordWrap: { width: 516 },
      })
      .setScrollFactor(0);

    this.endContainer = this.createEndOverlay();
    this.levelUpContainer = this.createLevelUpOverlay();

    this.input.keyboard?.on('keydown-ENTER', this.handleConfirmInput, this);
    this.input.keyboard?.on('keydown-SPACE', this.handleConfirmInput, this);
    this.input.keyboard?.on('keydown-ONE', this.handleSelectUpgradeOne, this);
    this.input.keyboard?.on('keydown-TWO', this.handleSelectUpgradeTwo, this);
    this.input.keyboard?.on('keydown-THREE', this.handleSelectUpgradeThree, this);
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
    const heroName = String(this.registry.get('run.heroName') ?? '--');
    const heroPassive = String(this.registry.get('run.heroPassive') ?? '');
    const weaponNames = (this.registry.get('run.weaponNames') ?? []) as string[];
    const levelUpRemainingMs = Number(this.registry.get('run.levelUpRemainingMs') ?? 0);
    const endActive = Boolean(this.registry.get('run.endActive'));
    const levelUpActive = Boolean(this.registry.get('run.levelUpActive'));
    const instructions = String(this.registry.get('run.instructions') ?? 'Move with WASD or Arrow Keys');
    const alertKind = String(this.registry.get('run.alertKind') ?? 'objective');
    const alertMessage = String(this.registry.get('run.alertText') ?? '');
    const rewardMessage = String(this.registry.get('run.rewardText') ?? '');
    const rewardColor = String(this.registry.get('run.rewardColor') ?? '#fcd34d');
    const levelUpChoices = (this.registry.get('run.levelUpChoices') ?? []) as UpgradeDefinition[];

    this.setTextIfChanged(this.heroText, this.formatHeroChip(heroName));
    this.setTextIfChanged(this.passiveText, heroPassive ? `PASSIVE ${heroPassive}` : 'PASSIVE --');
    this.setTextIfChanged(this.hpText, `HP: ${currentHp}/${maxHp}`);
    this.setTextIfChanged(this.levelText, `Level: ${level}`);
    this.setTextIfChanged(this.timerText, `Time: ${this.formatTime(elapsedMs)} / ${this.formatTime(targetMs)}`);
    this.setTextIfChanged(this.goldText, `Gold Bank: ${totalGold}`);
    this.refreshLoadoutChips(weaponNames);
    this.setTextIfChanged(this.xpBarLabel, `XP ${xp}/${xpNext}   Kills ${kills}`);
    this.xpBarFill.width = Phaser.Math.Clamp((xp / Math.max(1, xpNext)) * 420, 0, 420);
    this.setTextIfChanged(this.hintText, instructions);
    this.refreshAlert(alertKind, alertMessage);
    this.refreshRewardToast(rewardMessage, rewardColor);
    this.refreshHintPriority(alertKind, alertMessage, rewardMessage);

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
    const backdrop = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x020617, 0.78).setOrigin(0);
    const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 760, 462, 0x0f172a, 0.995);
    panel.setStrokeStyle(3, 0x475569, 1);

    this.endTitleText = this.add
      .text(GAME_WIDTH / 2, 194, 'Victory', {
        fontFamily: 'Georgia, serif',
        fontSize: '48px',
        color: '#f8fafc',
      })
      .setOrigin(0.5);

    this.endSubtitleText = this.add
      .text(GAME_WIDTH / 2, 252, 'Subtitle', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '20px',
        color: '#cbd5e1',
        align: 'center',
        wordWrap: { width: 600 },
      })
      .setOrigin(0.5);

    this.endStatsText = this.add
      .text(GAME_WIDTH / 2, 398, 'Kills: 0\nLevel Reached: 1', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '20px',
        color: '#bfdbfe',
        align: 'center',
        wordWrap: { width: 600 },
        lineSpacing: 4,
      })
      .setOrigin(0.5);

    this.endButton = this.add
      .text(GAME_WIDTH / 2, 578, 'Return to Menu', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '26px',
        color: '#fef3c7',
        backgroundColor: '#1f2937',
        padding: { left: 24, right: 24, top: 12, bottom: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.endButton.on('pointerdown', () => this.returnToMenuIfEnded());
    this.endButton.on('pointerover', () => {
      this.endButton.setStyle({ color: '#ffffff', backgroundColor: '#374151' });
    });
    this.endButton.on('pointerout', () => {
      this.endButton.setStyle({ color: '#fef3c7', backgroundColor: '#1f2937' });
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
      this.endButton,
      helpText,
    ]);
    container.setDepth(100);
    container.setVisible(false);
    container.setScrollFactor(0);

    return container;
  }

  private createLevelUpOverlay(): Phaser.GameObjects.Container {
    const backdrop = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x020617, 0.8).setOrigin(0);
    const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 1000, 468, 0x0f172a, 0.995);
    panel.setStrokeStyle(3, 0x60a5fa, 1);

    const title = this.add
      .text(GAME_WIDTH / 2, 168, 'Power Selection', {
        fontFamily: 'Georgia, serif',
        fontSize: '40px',
        color: '#f8fafc',
      })
      .setOrigin(0.5);

    const subtitle = this.add
      .text(GAME_WIDTH / 2, 214, 'Choose 1 upgrade or let the game auto-pick for you.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '20px',
        color: '#bfdbfe',
      })
      .setOrigin(0.5);

    this.levelUpTimerText = this.add
      .text(GAME_WIDTH / 2, 252, 'Auto-pick in 15.0s', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '20px',
        color: '#fef08a',
      })
      .setOrigin(0.5);

    const children: Phaser.GameObjects.GameObject[] = [backdrop, panel, title, subtitle, this.levelUpTimerText];

    for (let index = 0; index < 3; index += 1) {
      const x = 270 + index * 370;
      const card = this.add.rectangle(x, 392, 284, 202, 0x111827, 0.985);
      card.setStrokeStyle(2, 0x334155, 1);

      const button = this.add
        .text(x, 340, `${index + 1}. Upgrade`, {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '26px',
          color: '#f8fafc',
          align: 'center',
          wordWrap: { width: 234 },
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
        .text(x, 424, 'Description', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '16px',
          color: '#cbd5e1',
          align: 'center',
          wordWrap: { width: 234 },
          lineSpacing: 4,
        })
        .setOrigin(0.5);

      this.levelUpButtons.push(button);
      this.levelUpDescriptions.push(description);
      children.push(card, button, description);
    }

    const helpText = this.add
      .text(GAME_WIDTH / 2, 548, 'Use mouse or press 1, 2, or 3', {
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
    const heroName = String(this.registry.get('run.heroName') ?? '--');
    const weaponNames = (this.registry.get('run.weaponNames') ?? []) as string[];
    const weaponCount = Number(this.registry.get('run.weaponCount') ?? 1);
    const questRewards = (this.registry.get('run.questRewards') ?? []) as string[];
    const questSummary = questRewards.length > 0 ? `\n\nQuest Rewards\n${questRewards.join('\n')}` : '';

    this.setTextIfChanged(this.endTitleText, title);
    this.endTitleText.setColor(victory ? '#fef08a' : '#fca5a5');
    this.setTextIfChanged(this.endSubtitleText, subtitle);
    this.setTextIfChanged(
      this.endStatsText,
      `Hero: ${heroName}\nTime Survived: ${this.formatTime(elapsedMs)}\nEnemies Killed: ${kills}\nLevel Reached: ${level}\nWeapons Online: ${weaponCount}\nLoadout: ${this.formatWeaponSummary(weaponNames)}\nGold Earned: ${goldEarned}\nTotal Gold: ${totalGold}${questSummary}`,
    );
  }

  private refreshLevelUpChoices(choices: UpgradeDefinition[], remainingMs: number): void {
    this.setTextIfChanged(this.levelUpTimerText, `Auto-pick in ${(remainingMs / 1000).toFixed(1)}s`);

    for (let index = 0; index < this.levelUpButtons.length; index += 1) {
      const choice = choices[index];
      const button = this.levelUpButtons[index];
      const description = this.levelUpDescriptions[index];

      if (!choice) {
        this.setTextIfChanged(button, `${index + 1}. --`);
        this.setTextIfChanged(description, '');
        continue;
      }

      this.setTextIfChanged(button, `${index + 1}. ${choice.title}`);
      this.setTextIfChanged(description, choice.description);
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

  private formatWeaponSummary(weaponNames: string[]): string {
    if (weaponNames.length === 0) {
      return '--';
    }

    if (weaponNames.length <= 3) {
      return weaponNames.join(' • ');
    }

    return `${weaponNames.slice(0, 3).join(' • ')} +${weaponNames.length - 3} more`;
  }

  private formatHeroChip(heroName: string): string {
    return heroName ? `[${heroName.toUpperCase()}]` : '[--]';
  }

  private refreshLoadoutChips(weaponNames: string[]): void {
    for (let index = 0; index < this.loadoutChipTexts.length; index += 1) {
      const chip = this.loadoutChipTexts[index];
      const weaponName = weaponNames[index];

      if (!weaponName) {
        chip.setVisible(false);
        continue;
      }

      const style = this.getWeaponChipStyle(weaponName);
      this.setTextIfChanged(chip, this.getWeaponChipLabel(weaponName));
      if (chip.style.color !== style.textColor) {
        chip.setColor(style.textColor);
      }
      if (chip.style.backgroundColor !== style.backgroundColor) {
        chip.setBackgroundColor(style.backgroundColor);
      }
      chip.setVisible(true);
    }
  }

  private refreshAlert(kind: string, message: string): void {
    if (!message) {
      this.alertText.setVisible(false);
      return;
    }

    const palette = this.getAlertPalette(kind);
    this.setTextIfChanged(this.alertText, this.formatAlertChip(kind, message));
    if (this.alertText.style.color !== palette.textColor) {
      this.alertText.setColor(palette.textColor);
    }
    if (this.alertText.style.backgroundColor !== palette.backgroundColor) {
      this.alertText.setBackgroundColor(palette.backgroundColor);
    }
    this.alertText.setVisible(true);
  }

  private refreshRewardToast(message: string, color: string): void {
    if (!message) {
      this.rewardText.setVisible(false);
      return;
    }

    this.setTextIfChanged(this.rewardText, message);
    if (this.rewardText.style.color !== color) {
      this.rewardText.setColor(color);
    }
    if (this.rewardText.style.backgroundColor !== '#111827') {
      this.rewardText.setBackgroundColor('#111827');
    }
    this.rewardText.setVisible(true);
  }

  private refreshHintPriority(alertKind: string, alertMessage: string, rewardMessage: string): void {
    const dangerAlertActive = Boolean(alertMessage) && (alertKind === 'boss' || alertKind === 'miniboss' || alertKind === 'victory' || alertKind === 'defeat');
    const secondaryAlertActive = Boolean(alertMessage) && alertKind === 'elite';
    const rewardVisible = Boolean(rewardMessage);

    if (dangerAlertActive) {
      this.hintText.setAlpha(0.28);
      this.rewardText.setY(58);
      this.rewardText.setAlpha(0.78);
      return;
    }

    if (secondaryAlertActive) {
      this.hintText.setAlpha(0.45);
      this.rewardText.setY(42);
      this.rewardText.setAlpha(0.9);
      return;
    }

    this.hintText.setAlpha(rewardVisible ? 0.72 : 1);
    this.rewardText.setY(26);
    this.rewardText.setAlpha(1);
  }

  private getAlertPalette(kind: string): { textColor: string; backgroundColor: string } {
    switch (kind) {
      case 'hero':
        return { textColor: '#f5d0fe', backgroundColor: '#3b0764' };
      case 'elite':
        return { textColor: '#e9d5ff', backgroundColor: '#4c1d95' };
      case 'miniboss':
        return { textColor: '#fbcfe8', backgroundColor: '#831843' };
      case 'boss':
        return { textColor: '#fecaca', backgroundColor: '#7f1d1d' };
      case 'victory':
        return { textColor: '#fef08a', backgroundColor: '#713f12' };
      case 'defeat':
        return { textColor: '#fecaca', backgroundColor: '#7f1d1d' };
      default:
        return { textColor: '#dbeafe', backgroundColor: '#1e3a8a' };
    }
  }

  private formatAlertChip(kind: string, message: string): string {
    const prefix = (() => {
      switch (kind) {
        case 'hero':
          return 'HERO';
        case 'elite':
          return 'ELITE';
        case 'miniboss':
          return 'MINI';
        case 'boss':
          return 'BOSS';
        case 'victory':
          return 'WIN';
        case 'defeat':
          return 'DOWN';
        default:
          return 'RUN';
      }
    })();

    return `${prefix} | ${message.toUpperCase()}`;
  }

  private getWeaponChipLabel(weaponName: string): string {
    switch (weaponName) {
      case 'Arc Bolt':
        return 'ARC';
      case 'Twin Fangs':
        return 'FANG';
      case 'Ember Lance':
        return 'LANCE';
      case 'Bloom Cannon':
        return 'BLOOM';
      case 'Phase Disc':
        return 'DISC';
      case 'Sunwheel':
        return 'SUN';
      case 'Shatterbell':
        return 'BELL';
      default:
        return weaponName.toUpperCase();
    }
  }

  private getWeaponChipStyle(weaponName: string): { textColor: string; backgroundColor: string } {
    switch (weaponName) {
      case 'Arc Bolt':
        return { textColor: '#fff7ed', backgroundColor: '#a16207' };
      case 'Twin Fangs':
        return { textColor: '#ecfeff', backgroundColor: '#0f766e' };
      case 'Ember Lance':
        return { textColor: '#fff1f2', backgroundColor: '#be123c' };
      case 'Bloom Cannon':
        return { textColor: '#f0fdf4', backgroundColor: '#15803d' };
      case 'Phase Disc':
        return { textColor: '#faf5ff', backgroundColor: '#7e22ce' };
      case 'Sunwheel':
        return { textColor: '#fffbeb', backgroundColor: '#ca8a04' };
      case 'Shatterbell':
        return { textColor: '#ecfeff', backgroundColor: '#0f766e' };
      default:
        return { textColor: '#e2e8f0', backgroundColor: '#1f2937' };
    }
  }

  private setTextIfChanged(target: Phaser.GameObjects.Text, nextText: string): void {
    if (target.text !== nextText) {
      target.setText(nextText);
    }
  }

  private handleShutdown(): void {
    this.input.keyboard?.off('keydown-ENTER', this.handleConfirmInput, this);
    this.input.keyboard?.off('keydown-SPACE', this.handleConfirmInput, this);
    this.input.keyboard?.off('keydown-ONE', this.handleSelectUpgradeOne, this);
    this.input.keyboard?.off('keydown-TWO', this.handleSelectUpgradeTwo, this);
    this.input.keyboard?.off('keydown-THREE', this.handleSelectUpgradeThree, this);
  }
}
