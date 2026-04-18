import Phaser from 'phaser';
import type { UpgradeDefinition } from '../data/upgrades';
import { WEAPON_DEFINITIONS, findWeaponDefinitionByName, type WeaponDefinition } from '../data/weapons';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { RunScene } from './RunScene';

export class UIScene extends Phaser.Scene {
  private heroText!: Phaser.GameObjects.Text;
  private hpValueText!: Phaser.GameObjects.Text;
  private hpBarFill!: Phaser.GameObjects.Rectangle;
  private timerText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private killsText!: Phaser.GameObjects.Text;
  private alertText!: Phaser.GameObjects.Text;
  private rewardText!: Phaser.GameObjects.Text;
  private weaponIconFrames: Phaser.GameObjects.Rectangle[] = [];
  private weaponIconTexts: Phaser.GameObjects.Text[] = [];
  private xpBarFill!: Phaser.GameObjects.Rectangle;
  private xpBarLabel!: Phaser.GameObjects.Text;
  private endContainer!: Phaser.GameObjects.Container;
  private endTitleText!: Phaser.GameObjects.Text;
  private endSubtitleText!: Phaser.GameObjects.Text;
  private endStatsText!: Phaser.GameObjects.Text;
  private endButton!: Phaser.GameObjects.Text;
  private levelUpContainer!: Phaser.GameObjects.Container;
  private levelUpTimerText!: Phaser.GameObjects.Text;
  private levelUpCards: Phaser.GameObjects.Rectangle[] = [];
  private levelUpButtons: Phaser.GameObjects.Text[] = [];
  private levelUpDescriptions: Phaser.GameObjects.Text[] = [];
  private levelUpBadges: Phaser.GameObjects.Text[] = [];

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
    this.weaponIconFrames = [];
    this.weaponIconTexts = [];
    this.levelUpCards = [];
    this.levelUpButtons = [];
    this.levelUpDescriptions = [];
    this.levelUpBadges = [];

    const topLeftPanel = this.add.rectangle(24, 18, 274, 86, 0x030712, 0.88).setOrigin(0);
    topLeftPanel.setStrokeStyle(1, 0x334155, 0.96);
    topLeftPanel.setScrollFactor(0);

    this.heroText = this.add
      .text(38, 30, '--', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '24px',
        color: '#f8fafc',
      })
      .setScrollFactor(0);

    const hpBarFrame = this.add.rectangle(38, 68, 220, 18, 0x172033, 0.98).setOrigin(0, 0.5);
    hpBarFrame.setStrokeStyle(1, 0x475569, 0.95);
    hpBarFrame.setScrollFactor(0);

    this.hpBarFill = this.add.rectangle(38, 68, 0, 12, 0xf87171, 1).setOrigin(0, 0.5);
    this.hpBarFill.setScrollFactor(0);

    this.hpValueText = this.add
      .text(38, 82, 'HP --/--', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '13px',
        color: '#fecaca',
      })
      .setScrollFactor(0);

    this.timerText = this.add
      .text(GAME_WIDTH / 2, 34, '00:00', {
        fontFamily: 'Georgia, serif',
        fontSize: '36px',
        color: '#e0f2fe',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0);

    this.alertText = this.add
      .text(GAME_WIDTH / 2, 76, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '14px',
        color: '#dbeafe',
        backgroundColor: '#1e3a8a',
        padding: { left: 12, right: 12, top: 6, bottom: 6 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setVisible(false);

    this.rewardText = this.add
      .text(GAME_WIDTH / 2, 112, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '14px',
        color: '#fef3c7',
        backgroundColor: '#111827',
        padding: { left: 12, right: 12, top: 6, bottom: 6 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setVisible(false);

    this.goldText = this.add
      .text(GAME_WIDTH - 34, 24, 'Gold 0', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '18px',
        color: '#fde68a',
        backgroundColor: '#172036',
        padding: { left: 12, right: 12, top: 8, bottom: 8 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);

    this.killsText = this.add
      .text(GAME_WIDTH - 34, 64, 'Kills 0', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '18px',
        color: '#cbd5e1',
        backgroundColor: '#172036',
        padding: { left: 12, right: 12, top: 8, bottom: 8 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);

    for (let index = 0; index < 4; index += 1) {
      const frame = this.add.rectangle(38 + index * 52, GAME_HEIGHT - 88, 40, 40, 0x172033, 0.98).setOrigin(0);
      frame.setStrokeStyle(1, 0x334155, 0.92);
      frame.setScrollFactor(0);

      const icon = this.add
        .text(58 + index * 52, GAME_HEIGHT - 68, '--', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '13px',
          color: '#eff6ff',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setVisible(false);

      this.weaponIconFrames.push(frame);
      this.weaponIconTexts.push(icon);
    }

    const xpBarFrame = this.add.rectangle(38, GAME_HEIGHT - 38, 272, 18, 0x172554, 0.98).setOrigin(0, 0.5);
    xpBarFrame.setStrokeStyle(1, 0x60a5fa, 0.9);
    xpBarFrame.setScrollFactor(0);

    this.xpBarFill = this.add.rectangle(38, GAME_HEIGHT - 38, 0, 12, 0x38bdf8, 1).setOrigin(0, 0.5);
    this.xpBarFill.setScrollFactor(0);

    this.xpBarLabel = this.add
      .text(38, GAME_HEIGHT - 18, 'LV 1  XP 0/0', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '13px',
        color: '#bfdbfe',
      })
      .setScrollFactor(0);

    this.add
      .text(GAME_WIDTH - 30, GAME_HEIGHT - 28, 'ESC: Return to Menu', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '15px',
        color: '#cbd5e1',
      })
      .setOrigin(1, 1)
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
    const weaponNames = (this.registry.get('run.weaponNames') ?? []) as string[];
    const levelUpRemainingMs = Number(this.registry.get('run.levelUpRemainingMs') ?? 0);
    const endActive = Boolean(this.registry.get('run.endActive'));
    const levelUpActive = Boolean(this.registry.get('run.levelUpActive'));
    const alertKind = String(this.registry.get('run.alertKind') ?? 'objective');
    const alertMessage = String(this.registry.get('run.alertText') ?? '');
    const rewardMessage = String(this.registry.get('run.rewardText') ?? '');
    const rewardColor = String(this.registry.get('run.rewardColor') ?? '#fcd34d');
    const levelUpChoices = (this.registry.get('run.levelUpChoices') ?? []) as UpgradeDefinition[];

    this.setTextIfChanged(this.heroText, heroName || '--');
    this.setTextIfChanged(this.hpValueText, `HP ${currentHp}/${maxHp}`);
    this.hpBarFill.width = Phaser.Math.Clamp((currentHp / Math.max(1, maxHp)) * 220, 0, 220);
    this.setTextIfChanged(this.timerText, this.formatTime(Math.max(0, targetMs - elapsedMs)));
    this.setTextIfChanged(this.goldText, `Gold ${totalGold}`);
    this.setTextIfChanged(this.killsText, `Kills ${kills}`);
    this.setTextIfChanged(this.xpBarLabel, `LV ${level}  XP ${xp}/${xpNext}`);
    this.xpBarFill.width = Phaser.Math.Clamp((xp / Math.max(1, xpNext)) * 272, 0, 272);
    this.refreshWeaponIcons(weaponNames);
    this.refreshAlert(alertKind, alertMessage);
    this.refreshRewardToast(rewardMessage, rewardColor);

    this.endContainer.setVisible(endActive);
    this.levelUpContainer.setVisible(levelUpActive && !endActive);

    if (endActive) {
      this.refreshEndOverlay(kills, elapsedMs);
    }

    if (levelUpActive && !endActive) {
      this.refreshLevelUpChoices(levelUpChoices, levelUpRemainingMs);
    }
  }

  private createEndOverlay(): Phaser.GameObjects.Container {
    const backdrop = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x020617, 0.78).setOrigin(0).setScrollFactor(0);
    const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 520, 314, 0x0f172a, 0.995).setScrollFactor(0);
    panel.setStrokeStyle(2, 0x475569, 1);

    this.endTitleText = this.add
      .text(GAME_WIDTH / 2, 246, 'Victory', {
        fontFamily: 'Georgia, serif',
        fontSize: '46px',
        color: '#f8fafc',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.endSubtitleText = this.add
      .text(GAME_WIDTH / 2, 294, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '18px',
        color: '#cbd5e1',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.endStatsText = this.add
      .text(GAME_WIDTH / 2, 366, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '20px',
        color: '#bfdbfe',
        align: 'center',
        lineSpacing: 6,
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.endButton = this.add
      .text(GAME_WIDTH / 2, 466, 'Return to Menu', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '24px',
        color: '#fef3c7',
        backgroundColor: '#1f2937',
        padding: { left: 24, right: 24, top: 12, bottom: 12 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    this.endButton.on('pointerdown', () => this.returnToMenuIfEnded());
    this.endButton.on('pointerover', () => {
      this.endButton.setStyle({ color: '#ffffff', backgroundColor: '#374151' });
    });
    this.endButton.on('pointerout', () => {
      this.endButton.setStyle({ color: '#fef3c7', backgroundColor: '#1f2937' });
    });

    const helpText = this.add
      .text(GAME_WIDTH / 2, 514, 'Enter or Space continues', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '15px',
        color: '#93c5fd',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

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
    const backdrop = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x020617, 0.8).setOrigin(0).setScrollFactor(0);
    this.levelUpTimerText = this.add
      .text(GAME_WIDTH / 2, 184, '15.0', {
        fontFamily: 'Georgia, serif',
        fontSize: '42px',
        color: '#fef08a',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    const children: Phaser.GameObjects.GameObject[] = [backdrop, this.levelUpTimerText];

    for (let index = 0; index < 3; index += 1) {
      const x = 258 + index * 382;
      const card = this.add.rectangle(x, 372, 286, 166, 0x111827, 0.99).setOrigin(0.5).setScrollFactor(0);
      card.setStrokeStyle(2, 0x334155, 1);
      card.setInteractive({ useHandCursor: true });
      card.on('pointerdown', () => this.selectUpgrade(index));
      card.on('pointerover', () => this.applyLevelUpCardHover(index, true));
      card.on('pointerout', () => this.applyLevelUpCardHover(index, false));

      const badge = this.add
        .text(x - 106, 320, '--', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '14px',
          color: '#eff6ff',
          backgroundColor: '#334155',
          padding: { left: 8, right: 8, top: 5, bottom: 5 },
        })
        .setOrigin(0, 0.5)
        .setScrollFactor(0);

      const button = this.add
        .text(x - 106, 348, '', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '24px',
          color: '#f8fafc',
          wordWrap: { width: 214 },
        })
        .setOrigin(0, 0.5)
        .setScrollFactor(0);

      const description = this.add
        .text(x - 106, 384, '', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '14px',
          color: '#cbd5e1',
          wordWrap: { width: 214 },
          lineSpacing: 4,
        })
        .setOrigin(0, 0)
        .setScrollFactor(0);

      this.levelUpCards.push(card);
      this.levelUpBadges.push(badge);
      this.levelUpButtons.push(button);
      this.levelUpDescriptions.push(description);
      children.push(card, badge, button, description);
    }

    const container = this.add.container(0, 0, children);
    container.setDepth(90);
    container.setVisible(false);
    container.setScrollFactor(0);

    return container;
  }

  private refreshEndOverlay(kills: number, elapsedMs: number): void {
    const victory = Boolean(this.registry.get('run.victory'));
    const title = String(this.registry.get('run.endTitle') ?? (victory ? 'Victory' : 'Defeat'));
    const subtitle = String(this.registry.get('run.endSubtitle') ?? '');
    const goldEarned = Number(this.registry.get('run.goldEarned') ?? 0);

    this.setTextIfChanged(this.endTitleText, title);
    this.endTitleText.setColor(victory ? '#fef08a' : '#fca5a5');
    this.setTextIfChanged(this.endSubtitleText, subtitle);
    this.setTextIfChanged(
      this.endStatsText,
      `Time ${this.formatTime(elapsedMs)}\nGold +${goldEarned}\nKills ${kills}`,
    );
  }

  private refreshLevelUpChoices(choices: UpgradeDefinition[], remainingMs: number): void {
    this.setTextIfChanged(this.levelUpTimerText, `${(remainingMs / 1000).toFixed(1)}`);

    for (let index = 0; index < this.levelUpButtons.length; index += 1) {
      const choice = choices[index];
      const card = this.levelUpCards[index];
      const badge = this.levelUpBadges[index];
      const button = this.levelUpButtons[index];
      const description = this.levelUpDescriptions[index];

      if (!choice) {
        card.setVisible(false);
        badge.setVisible(false);
        button.setVisible(false);
        description.setVisible(false);
        continue;
      }

      const presentation = this.getUpgradePresentation(choice);
      card.setVisible(true);
      badge.setVisible(true);
      button.setVisible(true);
      description.setVisible(true);
      card.setData('baseColor', presentation.cardColor);
      badge.setBackgroundColor(presentation.badgeColor);
      this.setTextIfChanged(badge, presentation.badgeText);
      this.setTextIfChanged(button, presentation.title);
      this.setTextIfChanged(description, presentation.summary);
      this.applyLevelUpCardHover(index, false);
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

  private refreshWeaponIcons(weaponNames: string[]): void {
    for (let index = 0; index < this.weaponIconTexts.length; index += 1) {
      const frame = this.weaponIconFrames[index];
      const label = this.weaponIconTexts[index];
      const weaponName = weaponNames[index];
      const definition = weaponName ? findWeaponDefinitionByName(weaponName) : undefined;

      if (!definition) {
        frame.setFillStyle(0x172033, 0.98);
        frame.setStrokeStyle(1, 0x334155, 0.92);
        label.setVisible(false);
        continue;
      }

      frame.setFillStyle(definition.projectileColor, 0.28);
      frame.setStrokeStyle(1, definition.projectileStrokeColor, 0.98);
      this.setTextIfChanged(label, definition.shortLabel);
      label.setVisible(true);
    }
  }

  private refreshAlert(kind: string, message: string): void {
    if (!message) {
      this.alertText.setVisible(false);
      return;
    }

    const palette = this.getAlertPalette(kind);
    this.setTextIfChanged(this.alertText, message.toUpperCase());
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
    this.rewardText.setVisible(true);
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

  private getUpgradePresentation(choice: UpgradeDefinition): {
    badgeText: string;
    badgeColor: string;
    cardColor: number;
    title: string;
    summary: string;
  } {
    if (choice.kind === 'signature' && choice.requiresWeaponId) {
      const weapon = WEAPON_DEFINITIONS[choice.requiresWeaponId];
      return {
        badgeText: `${weapon.shortLabel}+`,
        badgeColor: `#${weapon.projectileColor.toString(16).padStart(6, '0')}`,
        cardColor: 0x1a2235,
        title: choice.title,
        summary: choice.description,
      };
    }

    const weapon = this.getWeaponUpgrade(choice.id);
    if (weapon) {
      return {
        badgeText: weapon.shortLabel,
        badgeColor: `#${weapon.projectileColor.toString(16).padStart(6, '0')}`,
        cardColor: 0x132033,
        title: weapon.name,
        summary: weapon.codexSummary,
      };
    }

    switch (choice.id) {
      case 'vitality':
        return { badgeText: 'HP', badgeColor: '#991b1b', cardColor: 0x1a1623, title: 'Vitality', summary: '+25 max HP' };
      case 'swiftness':
        return { badgeText: 'SPD', badgeColor: '#1d4ed8', cardColor: 0x132033, title: 'Swiftness', summary: '+22 move speed' };
      case 'power':
        return { badgeText: 'DMG', badgeColor: '#92400e', cardColor: 0x211915, title: 'Power', summary: '+5 damage to all weapons' };
      case 'rapid-fire':
        return { badgeText: 'RPM', badgeColor: '#0f766e', cardColor: 0x122225, title: 'Rapid Fire', summary: '-40 ms cooldown' };
      case 'velocity':
        return { badgeText: 'VEL', badgeColor: '#7c3aed', cardColor: 0x171a2e, title: 'Velocity', summary: '+90 projectile speed' };
      case 'magnet':
        return { badgeText: 'MAG', badgeColor: '#15803d', cardColor: 0x13251c, title: 'Magnet', summary: '+35 pickup range' };
      case 'reach':
        return { badgeText: 'RNG', badgeColor: '#1d4ed8', cardColor: 0x132033, title: 'Reach', summary: '+55 weapon range' };
      default:
        return {
          badgeText: 'UP',
          badgeColor: '#334155',
          cardColor: 0x111827,
          title: choice.title,
          summary: choice.description,
        };
    }
  }

  private getWeaponUpgrade(upgradeId: UpgradeDefinition['id']): WeaponDefinition | null {
    switch (upgradeId) {
      case 'unlock-twin-fangs':
        return WEAPON_DEFINITIONS['twin-fangs'];
      case 'unlock-ember-lance':
        return WEAPON_DEFINITIONS['ember-lance'];
      case 'unlock-bloom-cannon':
        return WEAPON_DEFINITIONS['bloom-cannon'];
      case 'unlock-phase-disc':
        return WEAPON_DEFINITIONS['phase-disc'];
      case 'unlock-sunwheel':
        return WEAPON_DEFINITIONS.sunwheel;
      case 'unlock-shatterbell':
        return WEAPON_DEFINITIONS.shatterbell;
      default:
        return null;
    }
  }

  private applyLevelUpCardHover(index: number, hovered: boolean): void {
    const card = this.levelUpCards[index];
    if (!card.visible) {
      return;
    }

    const baseColor = Number(card.getData('baseColor') ?? 0x111827);
    card.setFillStyle(baseColor, hovered ? 1 : 0.99);
    card.setStrokeStyle(2, hovered ? 0x93c5fd : 0x334155, 1);
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
    this.weaponIconFrames = [];
    this.weaponIconTexts = [];
    this.levelUpCards = [];
    this.levelUpButtons = [];
    this.levelUpDescriptions = [];
    this.levelUpBadges = [];
  }
}
