import Phaser from 'phaser';
import type { UpgradeDefinition } from '../data/upgrades';
import type { TankClassDefinition } from '../data/tankClasses';
import { TANK_STAT_DEFINITIONS, TANK_STAT_IDS, type TankStatId, type TankStatLevels } from '../data/tankStats';
import { WEAPON_DEFINITIONS, findWeaponDefinitionByName, type WeaponDefinition } from '../data/weapons';
import type { LocalLeaderboardEntry } from '../save/saveData';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { RunScene } from './RunScene';

export class UIScene extends Phaser.Scene {
  private heroText!: Phaser.GameObjects.Text;
  private hpValueText!: Phaser.GameObjects.Text;
  private hpBarFill!: Phaser.GameObjects.Rectangle;
  private levelValueText!: Phaser.GameObjects.Text;
  private classStatusText!: Phaser.GameObjects.Text;
  private statSummaryText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private killsText!: Phaser.GameObjects.Text;
  private alertText!: Phaser.GameObjects.Text;
  private rewardText!: Phaser.GameObjects.Text;
  private instructionText!: Phaser.GameObjects.Text;
  private orientationHintContainer!: Phaser.GameObjects.Container;
  private orientationHintText!: Phaser.GameObjects.Text;
  private eventPanel!: Phaser.GameObjects.Rectangle;
  private eventTitleText!: Phaser.GameObjects.Text;
  private eventBodyText!: Phaser.GameObjects.Text;
  private eventTimerText!: Phaser.GameObjects.Text;
  private weaponIconFrames: Phaser.GameObjects.Rectangle[] = [];
  private weaponIconTexts: Phaser.GameObjects.Text[] = [];
  private weaponSummaryText!: Phaser.GameObjects.Text;
  private xpBarFill!: Phaser.GameObjects.Rectangle;
  private xpBarLabel!: Phaser.GameObjects.Text;
  private endContainer!: Phaser.GameObjects.Container;
  private endTitleText!: Phaser.GameObjects.Text;
  private endSubtitleText!: Phaser.GameObjects.Text;
  private endStatsText!: Phaser.GameObjects.Text;
  private endLeaderboardText!: Phaser.GameObjects.Text;
  private endButton!: Phaser.GameObjects.Text;
  private levelUpContainer!: Phaser.GameObjects.Container;
  private levelUpHeadingText!: Phaser.GameObjects.Text;
  private levelUpSubheadingText!: Phaser.GameObjects.Text;
  private levelUpTimerText!: Phaser.GameObjects.Text;
  private levelUpCards: Phaser.GameObjects.Rectangle[] = [];
  private levelUpButtons: Phaser.GameObjects.Text[] = [];
  private levelUpDescriptions: Phaser.GameObjects.Text[] = [];
  private levelUpBadges: Phaser.GameObjects.Text[] = [];
  private classChoiceContainer!: Phaser.GameObjects.Container;
  private classChoiceCards: Phaser.GameObjects.Rectangle[] = [];
  private classChoiceTitles: Phaser.GameObjects.Text[] = [];
  private classChoiceDescriptions: Phaser.GameObjects.Text[] = [];
  private classChoiceActionLabels: Phaser.GameObjects.Text[] = [];
  private statAllocationContainer!: Phaser.GameObjects.Container;
  private statPointText!: Phaser.GameObjects.Text;
  private statHelpText!: Phaser.GameObjects.Text;
  private statButtons: Partial<Record<TankStatId, Phaser.GameObjects.Rectangle>> = {};
  private statButtonLabels: Partial<Record<TankStatId, Phaser.GameObjects.Text>> = {};

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
    const viewWidth = GAME_WIDTH;
    const viewHeight = GAME_HEIGHT;
    this.weaponIconFrames = [];
    this.weaponIconTexts = [];
    this.levelUpCards = [];
    this.levelUpButtons = [];
    this.levelUpDescriptions = [];
    this.levelUpBadges = [];
    this.classChoiceCards = [];
    this.classChoiceTitles = [];
    this.classChoiceDescriptions = [];
    this.classChoiceActionLabels = [];
    this.statButtons = {};
    this.statButtonLabels = {};

    const topLeftPanel = this.add.rectangle(20, 16, 390, 148, 0x102033, 0.86).setOrigin(0);
    topLeftPanel.setStrokeStyle(1, 0x4b6b8a, 0.84);
    topLeftPanel.setScrollFactor(0);

    this.heroText = this.add
      .text(38, 28, '--', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '23px',
        color: '#f8fafc',
        wordWrap: { width: 336 },
      })
      .setScrollFactor(0);

    const hpBarFrame = this.add.rectangle(38, 72, 320, 24, 0x1b2f46, 0.98).setOrigin(0, 0.5);
    hpBarFrame.setStrokeStyle(1, 0x6b8bae, 0.88);
    hpBarFrame.setScrollFactor(0);

    this.hpBarFill = this.add.rectangle(38, 72, 0, 18, 0xf87171, 1).setOrigin(0, 0.5);
    this.hpBarFill.setScrollFactor(0);

    this.hpValueText = this.add
      .text(38, 92, 'HP --/--', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '17px',
        color: '#fecaca',
      })
      .setScrollFactor(0);

    this.levelValueText = this.add
      .text(176, 92, 'LV 1  XP 0/0', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '17px',
        color: '#bfdbfe',
      })
      .setScrollFactor(0);

    this.classStatusText = this.add
      .text(38, 120, 'Class Basic', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '17px',
        color: '#bae6fd',
      })
      .setScrollFactor(0);

    this.statSummaryText = this.add
      .text(176, 120, 'Stats DMG0 RLD0 SPD0 HP0', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '16px',
        color: '#cbd5e1',
        wordWrap: { width: 210 },
      })
      .setScrollFactor(0);

    this.timerText = this.add
      .text(viewWidth / 2, 34, '00:00', {
        fontFamily: 'Georgia, serif',
        fontSize: '36px',
        color: '#e0f2fe',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0);

    this.alertText = this.add
      .text(viewWidth / 2, 76, '', {
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
      .text(viewWidth / 2, 112, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '14px',
        color: '#fef3c7',
        backgroundColor: '#111827',
        padding: { left: 12, right: 12, top: 6, bottom: 6 },
        wordWrap: { width: 640 },
        align: 'center',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setVisible(false);

    this.instructionText = this.add
      .text(viewWidth / 2, 156, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '13px',
        color: '#cbd5e1',
        backgroundColor: '#0f172a',
        padding: { left: 14, right: 14, top: 6, bottom: 6 },
        wordWrap: { width: 760 },
        align: 'center',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setVisible(false);

    this.eventPanel = this.add.rectangle(viewWidth / 2, 206, 520, 68, 0x111827, 0.9).setScrollFactor(0).setVisible(false);
    this.eventPanel.setStrokeStyle(1, 0xfbbf24, 0.9);

    this.eventTitleText = this.add
      .text(viewWidth / 2 - 240, 182, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '14px',
        color: '#fde68a',
      })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setVisible(false);

    this.eventBodyText = this.add
      .text(viewWidth / 2 - 240, 202, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '13px',
        color: '#f8fafc',
        wordWrap: { width: 400 },
      })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setVisible(false);

    this.eventTimerText = this.add
      .text(viewWidth / 2 + 224, 182, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '24px',
        color: '#fde68a',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setVisible(false);

    const topRightPanel = this.add.rectangle(viewWidth - 320, 16, 300, 148, 0x102033, 0.86).setOrigin(0);
    topRightPanel.setStrokeStyle(1, 0x4b6b8a, 0.84);
    topRightPanel.setScrollFactor(0);

    this.scoreText = this.add
      .text(viewWidth - 44, 30, 'Score 0', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '22px',
        color: '#fef08a',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);

    this.goldText = this.add
      .text(viewWidth - 44, 68, 'Run Gold 0', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '20px',
        color: '#fde68a',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);

    this.killsText = this.add
      .text(viewWidth - 44, 104, 'Kills 0', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '19px',
        color: '#d7e2ef',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);

    this.weaponSummaryText = this.add
      .text(38, viewHeight - 116, 'Weapon --', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '14px',
        color: '#e0f2fe',
        backgroundColor: '#111827',
        padding: { left: 8, right: 8, top: 4, bottom: 4 },
      })
      .setScrollFactor(0);

    for (let index = 0; index < 4; index += 1) {
      const frame = this.add.rectangle(38 + index * 52, viewHeight - 88, 40, 40, 0x172033, 0.98).setOrigin(0);
      frame.setStrokeStyle(1, 0x334155, 0.92);
      frame.setScrollFactor(0);

      const icon = this.add
        .text(58 + index * 52, viewHeight - 68, '--', {
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

    const xpBarFrame = this.add.rectangle(38, viewHeight - 38, 312, 20, 0x172554, 0.98).setOrigin(0, 0.5);
    xpBarFrame.setStrokeStyle(1, 0x60a5fa, 0.9);
    xpBarFrame.setScrollFactor(0);

    this.xpBarFill = this.add.rectangle(38, viewHeight - 38, 0, 14, 0x38bdf8, 1).setOrigin(0, 0.5);
    this.xpBarFill.setScrollFactor(0);

    this.xpBarLabel = this.add
      .text(38, viewHeight - 18, 'LV 1  XP 0/0', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '14px',
        color: '#bfdbfe',
      })
      .setScrollFactor(0);

    this.add
      .text(viewWidth - 30, viewHeight - 28, 'ESC: Return to Menu', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '15px',
        color: '#cbd5e1',
      })
      .setOrigin(1, 1)
      .setScrollFactor(0);

    this.endContainer = this.createEndOverlay();
    this.levelUpContainer = this.createLevelUpOverlay();
    this.classChoiceContainer = this.createClassChoiceOverlay();
    this.statAllocationContainer = this.createStatAllocationPanel();
    this.orientationHintContainer = this.createOrientationHintOverlay();

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
    const score = Number(this.registry.get('run.score') ?? 0);
    const bestScore = Number(this.registry.get('run.bestScore') ?? 0);
    const finalScore = Number(this.registry.get('run.finalScore') ?? 0);
    const newBestScore = Boolean(this.registry.get('run.newBestScore'));
    const localLeaderboard = (this.registry.get('run.localLeaderboard') ?? []) as LocalLeaderboardEntry[];
    const runGold = Number(this.registry.get('run.goldEarned') ?? 0);
    const heroName = String(this.registry.get('run.heroName') ?? '--');
    const weaponNames = (this.registry.get('run.weaponNames') ?? []) as string[];
    const levelUpRemainingMs = Number(this.registry.get('run.levelUpRemainingMs') ?? 0);
    const endActive = Boolean(this.registry.get('run.endActive'));
    const levelUpActive = Boolean(this.registry.get('run.levelUpActive'));
    const alertKind = String(this.registry.get('run.alertKind') ?? 'objective');
    const alertMessage = String(this.registry.get('run.alertText') ?? '');
    const rewardMessage = String(this.registry.get('run.rewardText') ?? '');
    const rewardColor = String(this.registry.get('run.rewardColor') ?? '#fcd34d');
    const instructionMessage = String(this.registry.get('run.instructions') ?? '');
    const eventActive = Boolean(this.registry.get('run.eventActive'));
    const eventTitle = String(this.registry.get('run.eventTitle') ?? '');
    const eventText = String(this.registry.get('run.eventText') ?? '');
    const eventRemainingMs = Number(this.registry.get('run.eventRemainingMs') ?? 0);
    const levelUpMode = String(this.registry.get('run.levelUpMode') ?? 'normal');
    const levelUpChoices = (this.registry.get('run.levelUpChoices') ?? []) as UpgradeDefinition[];
    const tankClass = (this.registry.get('run.tankClass') ?? { title: 'Basic' }) as { title?: string };
    const classChoiceActive = Boolean(this.registry.get('run.classChoiceActive'));
    const classChoiceChoices = (this.registry.get('run.classChoiceChoices') ?? []) as TankClassDefinition[];
    const statPoints = Number(this.registry.get('run.statPoints') ?? 0);
    const tankStatLevels = (this.registry.get('run.tankStatLevels') ?? {
      bulletDamage: 0,
      reload: 0,
      moveSpeed: 0,
      maxHealth: 0,
    }) as TankStatLevels;

    const classTitle = tankClass.title ?? 'Basic';
    const xpLabel = `LV ${level}  XP ${xp}/${xpNext}`;
    const statSummary = this.formatStatSummary(tankStatLevels);

    this.setTextIfChanged(this.heroText, heroName || '--');
    this.setTextIfChanged(this.hpValueText, `HP ${currentHp}/${maxHp}`);
    this.hpBarFill.width = Phaser.Math.Clamp((currentHp / Math.max(1, maxHp)) * 320, 0, 320);
    this.setTextIfChanged(this.levelValueText, xpLabel);
    this.setTextIfChanged(this.classStatusText, `Class ${classTitle}${classChoiceActive ? ' - Choose now' : ''}`);
    this.classStatusText.setColor(classChoiceActive ? '#fef08a' : '#bae6fd');
    this.setTextIfChanged(this.statSummaryText, `Stats ${statSummary}${statPoints > 0 ? `  +${statPoints}` : ''}`);
    this.statSummaryText.setColor(statPoints > 0 ? '#fef08a' : '#cbd5e1');
    this.setTextIfChanged(this.timerText, this.formatTime(Math.max(0, targetMs - elapsedMs)));
    this.setTextIfChanged(this.goldText, `Run Gold ${runGold}`);
    this.setTextIfChanged(this.killsText, `Kills ${kills}`);
    this.setTextIfChanged(this.scoreText, `Score ${score}`);
    this.setTextIfChanged(this.weaponSummaryText, this.formatWeaponSummary(weaponNames, classTitle));
    this.setTextIfChanged(this.xpBarLabel, xpLabel);
    this.xpBarFill.width = Phaser.Math.Clamp((xp / Math.max(1, xpNext)) * 312, 0, 312);
    this.refreshWeaponIcons(weaponNames);
    this.refreshAlert(alertKind, alertMessage);
    this.refreshRewardToast(rewardMessage, rewardColor);
    this.refreshInstruction(instructionMessage, levelUpActive || classChoiceActive, endActive);
    this.refreshEventHud(eventActive, eventTitle, eventText, eventRemainingMs, levelUpActive || classChoiceActive, endActive);
    this.refreshStatAllocationPanel(statPoints, tankStatLevels, levelUpActive, classChoiceActive, endActive);
    this.refreshOrientationHint();

    this.endContainer.setVisible(endActive);
    this.levelUpContainer.setVisible(levelUpActive && !classChoiceActive && !endActive);
    this.classChoiceContainer.setVisible(classChoiceActive && !endActive);

    if (endActive) {
      this.refreshEndOverlay(kills, elapsedMs, finalScore, bestScore, newBestScore, localLeaderboard);
    }

    if (levelUpActive && !endActive) {
      this.refreshLevelUpChoices(levelUpChoices, levelUpRemainingMs, levelUpMode === 'breakthrough' ? 'breakthrough' : 'normal');
    }

    if (classChoiceActive && !endActive) {
      this.refreshClassChoiceCards(classChoiceChoices);
    }
  }

  public getHudSnapshot(): {
    hero: string;
    hp: string;
    level: string;
    classStatus: string;
    statSummary: string;
    weaponSummary: string;
    xp: string;
    gold: string;
    kills: string;
    score: string;
    statPanelVisible: boolean;
    classChoiceVisible: boolean;
    endStats: string;
    leaderboard: string;
    orientationHintVisible: boolean;
  } {
    return {
      hero: this.heroText.text,
      hp: this.hpValueText.text,
      level: this.levelValueText.text,
      classStatus: this.classStatusText.text,
      statSummary: this.statSummaryText.text,
      weaponSummary: this.weaponSummaryText.text,
      xp: this.xpBarLabel.text,
      gold: this.goldText.text,
      kills: this.killsText.text,
      score: this.scoreText.text,
      statPanelVisible: this.statAllocationContainer.visible,
      classChoiceVisible: this.classChoiceContainer.visible,
      endStats: this.endStatsText.text,
      leaderboard: this.endLeaderboardText.text,
      orientationHintVisible: this.orientationHintContainer.visible,
    };
  }

  private createEndOverlay(): Phaser.GameObjects.Container {
    const viewWidth = GAME_WIDTH;
    const viewHeight = GAME_HEIGHT;

    const backdrop = this.add.rectangle(0, 0, viewWidth, viewHeight, 0x020617, 0.78)
    const panel = this.add.rectangle(viewWidth / 2, viewHeight / 2, 640, 500, 0x0f172a, 0.995).setScrollFactor(0);
    panel.setStrokeStyle(2, 0x475569, 1);

    this.endTitleText = this.add
      .text(viewWidth / 2, 150, 'Victory', {
        fontFamily: 'Georgia, serif',
        fontSize: '46px',
        color: '#f8fafc',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.endSubtitleText = this.add
      .text(viewWidth / 2, 196, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '18px',
        color: '#cbd5e1',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.endStatsText = this.add
      .text(viewWidth / 2, 266, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '19px',
        color: '#bfdbfe',
        align: 'center',
        lineSpacing: 6,
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.endLeaderboardText = this.add
      .text(viewWidth / 2, 348, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '16px',
        color: '#dbeafe',
        align: 'center',
        lineSpacing: 5,
        wordWrap: { width: 560 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0);

    this.endButton = this.add
      .text(viewWidth / 2, 562, 'Return to Menu', {
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
      .text(viewWidth / 2, 606, 'Enter or Space continues', {
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
      this.endLeaderboardText,
      this.endButton,
      helpText,
    ]);
    container.setDepth(100);
    container.setVisible(false);
    container.setScrollFactor(0);

    return container;
  }

  private createLevelUpOverlay(): Phaser.GameObjects.Container {
    const viewWidth = GAME_WIDTH;
    const viewHeight = GAME_HEIGHT;

    const backdrop = this.add.rectangle(0, 0, viewWidth, viewHeight, 0x020617, 0.8)
    this.levelUpHeadingText = this.add
      .text(viewWidth / 2, 112, 'BONUS PICK', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '24px',
        color: '#bfdbfe',
        letterSpacing: 2,
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    this.levelUpSubheadingText = this.add
      .text(viewWidth / 2, 154, 'Legacy bonus choice. Stat points are spent from the bottom bar after this pick.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '17px',
        color: '#d7e2ef',
        align: 'center',
        wordWrap: { width: 720 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    this.levelUpTimerText = this.add
      .text(viewWidth / 2, 198, '15.0', {
        fontFamily: 'Georgia, serif',
        fontSize: '38px',
        color: '#fef08a',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    const children: Phaser.GameObjects.GameObject[] = [backdrop, this.levelUpHeadingText, this.levelUpSubheadingText, this.levelUpTimerText];

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

  private createClassChoiceOverlay(): Phaser.GameObjects.Container {
    const viewWidth = GAME_WIDTH;
    const viewHeight = GAME_HEIGHT;

    const backdrop = this.add.rectangle(0, 0, viewWidth, viewHeight, 0x020617, 0.78)
    const heading = this.add
      .text(viewWidth / 2, 138, 'EVOLUTION', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '25px',
        color: '#bae6fd',
        letterSpacing: 2,
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    const subheading = this.add
      .text(viewWidth / 2, 184, 'Choose a class branch', {
        fontFamily: 'Georgia, serif',
        fontSize: '34px',
        color: '#eff6ff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    const children: Phaser.GameObjects.GameObject[] = [backdrop, heading, subheading];

    for (let index = 0; index < 2; index += 1) {
      const x = viewWidth / 2 - 190 + index * 380;
      const card = this.add.rectangle(x, 378, 310, 170, 0x101827, 0.99).setScrollFactor(0);
      card.setStrokeStyle(2, 0x38bdf8, 0.9);
      card.setInteractive({ useHandCursor: true });
      card.on('pointerdown', () => this.selectTankClass(index));
      card.on('pointerover', () => this.applyClassChoiceCardHover(index, true));
      card.on('pointerout', () => this.applyClassChoiceCardHover(index, false));

      const title = this.add
        .text(x - 118, 326, '', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '28px',
          color: '#f8fafc',
        })
        .setOrigin(0, 0.5)
        .setScrollFactor(0);

      const description = this.add
        .text(x - 118, 362, '', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '15px',
          color: '#cbd5e1',
          wordWrap: { width: 236 },
          lineSpacing: 5,
        })
        .setOrigin(0, 0)
        .setScrollFactor(0);

      const action = this.add
        .text(x, 438, 'TAP TO EVOLVE', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '13px',
          color: '#fef08a',
          backgroundColor: '#1e293b',
          padding: { left: 10, right: 10, top: 5, bottom: 5 },
        })
        .setOrigin(0.5)
        .setScrollFactor(0);

      this.classChoiceCards.push(card);
      this.classChoiceTitles.push(title);
      this.classChoiceDescriptions.push(description);
      this.classChoiceActionLabels.push(action);
      children.push(card, title, description, action);
    }

    const container = this.add.container(0, 0, children);
    container.setDepth(96);
    container.setVisible(false);
    container.setScrollFactor(0);

    return container;
  }

  private createStatAllocationPanel(): Phaser.GameObjects.Container {
    const viewWidth = GAME_WIDTH;
    const viewHeight = GAME_HEIGHT;

    const panel = this.add.rectangle(viewWidth / 2, viewHeight - 106, 760, 96, 0x08111f, 0.96)
    panel.setStrokeStyle(1, 0x38bdf8, 0.86);

    this.statPointText = this.add
      .text(viewWidth / 2 - 354, viewHeight - 144, 'STAT POINTS 0', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '16px',
        color: '#bae6fd',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0);

    this.statHelpText = this.add
      .text(viewWidth / 2 + 354, viewHeight - 144, 'Tap a stat to spend', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '13px',
        color: '#cbd5e1',
      })
      .setOrigin(1, 0.5)
      .setScrollFactor(0);

    const children: Phaser.GameObjects.GameObject[] = [panel, this.statPointText, this.statHelpText];
    const startX = viewWidth / 2 - 260;

    TANK_STAT_IDS.forEach((statId, index) => {
      const definition = TANK_STAT_DEFINITIONS[statId];
      const x = startX + index * 174;
      const button = this.add.rectangle(x, viewHeight - 96, 162, 62, 0x132033, 0.98).setScrollFactor(0);
      button.setStrokeStyle(1, 0x334155, 0.95);
      button.setInteractive({ useHandCursor: true });
      button.on('pointerdown', () => this.allocateTankStat(statId));
      button.on('pointerover', () => this.applyStatButtonHover(statId, true));
      button.on('pointerout', () => this.applyStatButtonHover(statId, false));

      const label = this.add
        .text(x, viewHeight - 96, `${definition.shortLabel} 0/${definition.maxLevel}\n${definition.summary}`, {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '14px',
          color: '#e0f2fe',
          align: 'center',
          lineSpacing: 3,
        })
        .setOrigin(0.5)
        .setScrollFactor(0);

      this.statButtons[statId] = button;
      this.statButtonLabels[statId] = label;
      children.push(button, label);
    });

    const container = this.add.container(0, 0, children);
    container.setDepth(95);
    container.setVisible(false);
    container.setScrollFactor(0);

    return container;
  }

  private createOrientationHintOverlay(): Phaser.GameObjects.Container {
    const viewWidth = GAME_WIDTH;
    const viewHeight = GAME_HEIGHT;

    const panel = this.add.rectangle(viewWidth / 2, viewHeight / 2, 620, 170, 0x102033, 0.94)
    panel.setStrokeStyle(2, 0xfacc15, 0.95);

    this.orientationHintText = this.add
      .text(viewWidth / 2, viewHeight / 2, 'Rotate for landscape play\nThe arena and HUD are tuned for horizontal mobile screens.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '24px',
        color: '#f8fafc',
        align: 'center',
        lineSpacing: 10,
        wordWrap: { width: 540 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    const container = this.add.container(0, 0, [panel, this.orientationHintText]);
    container.setDepth(120);
    container.setScrollFactor(0);
    container.setVisible(false);

    return container;
  }

  private refreshEndOverlay(
    kills: number,
    elapsedMs: number,
    finalScore: number,
    bestScore: number,
    newBestScore: boolean,
    leaderboard: LocalLeaderboardEntry[],
  ): void {
    const victory = Boolean(this.registry.get('run.victory'));
    const title = String(this.registry.get('run.endTitle') ?? (victory ? 'Victory' : 'Defeat'));
    const subtitle = String(this.registry.get('run.endSubtitle') ?? '');
    const goldEarned = Number(this.registry.get('run.goldEarned') ?? 0);

    this.setTextIfChanged(this.endTitleText, title);
    this.endTitleText.setColor(victory ? '#fef08a' : '#fca5a5');
    this.setTextIfChanged(this.endSubtitleText, subtitle);
    this.setTextIfChanged(
      this.endStatsText,
      `Score ${finalScore}${newBestScore ? '  NEW BEST' : ''}\nBest ${bestScore}\nTime ${this.formatTime(elapsedMs)}  Kills ${kills}  Gold +${goldEarned}`,
    );
    this.endStatsText.setColor(newBestScore ? '#fef08a' : '#bfdbfe');
    this.setTextIfChanged(this.endLeaderboardText, this.formatLeaderboard(leaderboard));
  }

  private refreshLevelUpChoices(
    choices: UpgradeDefinition[],
    remainingMs: number,
    mode: 'normal' | 'breakthrough',
  ): void {
    this.setTextIfChanged(this.levelUpHeadingText, mode === 'breakthrough' ? 'BREAKTHROUGH BONUS' : 'BONUS PICK');
    this.setTextIfChanged(
      this.levelUpSubheadingText,
      mode === 'breakthrough'
        ? 'Pick a rare weapon bonus, then continue with stat/class progression.'
        : 'Legacy bonus choice. Stat points are spent from the bottom bar after this pick.',
    );
    this.levelUpHeadingText.setColor(mode === 'breakthrough' ? '#f9a8d4' : '#bfdbfe');
    this.levelUpTimerText.setColor(mode === 'breakthrough' ? '#f9a8d4' : '#fef08a');
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

  private refreshStatAllocationPanel(
    statPoints: number,
    levels: TankStatLevels,
    levelUpActive: boolean,
    classChoiceActive: boolean,
    endActive: boolean,
  ): void {
    const shouldShow = !endActive && !levelUpActive && !classChoiceActive && statPoints > 0;
    this.statAllocationContainer.setVisible(shouldShow);

    if (!shouldShow) {
      return;
    }

    this.setTextIfChanged(this.statPointText, `STAT POINTS ${statPoints}`);
    this.setTextIfChanged(this.statHelpText, statPoints > 0 ? 'Tap a stat to spend' : 'Current run stat levels');
    this.statHelpText.setColor(statPoints > 0 ? '#fef08a' : '#94a3b8');

    for (const statId of TANK_STAT_IDS) {
      const definition = TANK_STAT_DEFINITIONS[statId];
      const level = levels[statId] ?? 0;
      const button = this.statButtons[statId];
      const label = this.statButtonLabels[statId];
      const canSpend = statPoints > 0 && level < definition.maxLevel;

      if (!button || !label) {
        continue;
      }

      button.setData('canSpend', canSpend);
      button.setFillStyle(canSpend ? 0x132033 : 0x0f172a, canSpend ? 0.98 : 0.72);
      button.setStrokeStyle(1, canSpend ? 0x38bdf8 : 0x334155, canSpend ? 0.95 : 0.72);
      this.setTextIfChanged(label, `${definition.shortLabel} ${level}/${definition.maxLevel}\n${definition.summary}`);
      label.setColor(canSpend ? '#e0f2fe' : '#94a3b8');
    }
  }

  private refreshClassChoiceCards(choices: TankClassDefinition[]): void {
    for (let index = 0; index < this.classChoiceCards.length; index += 1) {
      const choice = choices[index];
      const card = this.classChoiceCards[index];
      const title = this.classChoiceTitles[index];
      const description = this.classChoiceDescriptions[index];
      const action = this.classChoiceActionLabels[index];

      if (!choice) {
        card.setVisible(false);
        title.setVisible(false);
        description.setVisible(false);
        action.setVisible(false);
        continue;
      }

      card.setVisible(true);
      title.setVisible(true);
      description.setVisible(true);
      action.setVisible(true);
      card.setData('classId', choice.id);
      card.setData('baseColor', choice.id === 'twin' ? 0x0d2536 : 0x101b35);
      this.setTextIfChanged(title, choice.title);
      this.setTextIfChanged(description, choice.description);
      this.applyClassChoiceCardHover(index, false);
    }
  }

  private selectUpgrade(index: number): void {
    if (!this.registry.get('run.levelUpActive') || this.registry.get('run.endActive') || !this.scene.isActive('RunScene')) {
      return;
    }

    const runScene = this.scene.get('RunScene') as RunScene;
    runScene.selectLevelUp(index);
  }

  private allocateTankStat(statId: TankStatId): void {
    if (this.registry.get('run.endActive') || !this.scene.isActive('RunScene')) {
      return;
    }

    const runScene = this.scene.get('RunScene') as RunScene;
    runScene.allocateTankStat(statId);
  }

  private selectTankClass(index: number): void {
    if (!this.registry.get('run.classChoiceActive') || this.registry.get('run.endActive') || !this.scene.isActive('RunScene')) {
      return;
    }

    const choices = (this.registry.get('run.classChoiceChoices') ?? []) as TankClassDefinition[];
    const choice = choices[index];
    if (!choice) {
      return;
    }

    const runScene = this.scene.get('RunScene') as RunScene;
    runScene.selectTankClass(choice.id);
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

  private formatLeaderboard(entries: LocalLeaderboardEntry[]): string {
    if (entries.length === 0) {
      return 'Local Top 5\nNo local runs recorded yet.';
    }

    const rows = entries.slice(0, 5).map((entry, index) => {
      const date = new Date(entry.timestamp);
      const dateLabel = Number.isNaN(date.getTime()) ? 'local run' : date.toLocaleDateString();
      return `${index + 1}. ${entry.score}  ${entry.classTitle}  LV ${entry.level}  K ${entry.kills}  ${this.formatTime(entry.timeSurvivedMs)}  ${dateLabel}`;
    });

    return ['Local Top 5', ...rows].join('\n');
  }

  private formatStatSummary(levels: TankStatLevels): string {
    return `DMG${levels.bulletDamage ?? 0} RLD${levels.reload ?? 0} SPD${levels.moveSpeed ?? 0} HP${levels.maxHealth ?? 0}`;
  }

  private formatWeaponSummary(weaponNames: string[], classTitle: string): string {
    const primaryWeapon = weaponNames[0] ?? '--';
    const extraCount = Math.max(0, weaponNames.length - 1);
    return `Weapon ${primaryWeapon}${extraCount > 0 ? ` +${extraCount}` : ''} / ${classTitle}`;
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

  private refreshInstruction(message: string, levelUpActive: boolean, endActive: boolean): void {
    if (!message || levelUpActive || endActive) {
      this.instructionText.setVisible(false);
      return;
    }

    this.setTextIfChanged(this.instructionText, message);
    this.instructionText.setVisible(true);
  }

  private refreshEventHud(
    active: boolean,
    title: string,
    objective: string,
    remainingMs: number,
    levelUpActive: boolean,
    endActive: boolean,
  ): void {
    const visible = active && !levelUpActive && !endActive;
    this.eventPanel.setVisible(visible);
    this.eventTitleText.setVisible(visible);
    this.eventBodyText.setVisible(visible);
    this.eventTimerText.setVisible(visible);

    if (!visible) {
      return;
    }

    this.setTextIfChanged(this.eventTitleText, title.toUpperCase());
    this.setTextIfChanged(this.eventBodyText, objective);
    this.setTextIfChanged(this.eventTimerText, `${Math.max(0, remainingMs / 1000).toFixed(1)}s`);
  }

  private refreshOrientationHint(): void {
    const viewportWidth = window.innerWidth || this.scale.displaySize.width;
    const viewportHeight = window.innerHeight || this.scale.displaySize.height;
    const shouldShow = viewportWidth < viewportHeight || viewportWidth < 620;

    this.orientationHintContainer.setVisible(shouldShow);
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
        badgeText: 'SIGNATURE',
        badgeColor: `#${weapon.projectileColor.toString(16).padStart(6, '0')}`,
        cardColor: 0x1a2235,
        title: choice.title,
        summary: `${weapon.name}: ${choice.description}`,
      };
    }

    if (choice.kind === 'branch' && choice.requiresWeaponId) {
      const weapon = WEAPON_DEFINITIONS[choice.requiresWeaponId];
      return {
        badgeText: 'BRANCH',
        badgeColor: `#${weapon.projectileColor.toString(16).padStart(6, '0')}`,
        cardColor: 0x162033,
        title: choice.title,
        summary: `${weapon.name}: ${choice.description}`,
      };
    }

    const weapon = this.getWeaponUpgrade(choice.id);
    if (weapon) {
      return {
        badgeText: 'WEAPON',
        badgeColor: `#${weapon.projectileColor.toString(16).padStart(6, '0')}`,
        cardColor: 0x132033,
        title: weapon.name,
        summary: weapon.codexSummary,
      };
    }

    switch (choice.id) {
      case 'vitality':
        return {
          badgeText: 'SUPPORT',
          badgeColor: '#991b1b',
          cardColor: 0x1a1623,
          title: 'Vitality',
          summary: '+25 max HP',
        };
      case 'swiftness':
        return {
          badgeText: 'SUPPORT',
          badgeColor: '#1d4ed8',
          cardColor: 0x132033,
          title: 'Swiftness',
          summary: '+22 move speed',
        };
      case 'power':
        return {
          badgeText: 'SUPPORT',
          badgeColor: '#92400e',
          cardColor: 0x211915,
          title: 'Power',
          summary: '+5 damage to all weapons',
        };
      case 'rapid-fire':
        return {
          badgeText: 'SUPPORT',
          badgeColor: '#0f766e',
          cardColor: 0x122225,
          title: 'Rapid Fire',
          summary: '-40 ms cooldown',
        };
      case 'velocity':
        return {
          badgeText: 'SUPPORT',
          badgeColor: '#7c3aed',
          cardColor: 0x171a2e,
          title: 'Velocity',
          summary: '+90 projectile speed',
        };
      case 'magnet':
        return {
          badgeText: 'SUPPORT',
          badgeColor: '#15803d',
          cardColor: 0x13251c,
          title: 'Magnet',
          summary: '+35 pickup range',
        };
      case 'reach':
        return {
          badgeText: 'SUPPORT',
          badgeColor: '#1d4ed8',
          cardColor: 0x132033,
          title: 'Reach',
          summary: '+55 weapon range',
        };
      default:
        return {
          badgeText: 'SUPPORT',
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

  private applyStatButtonHover(statId: TankStatId, hovered: boolean): void {
    const button = this.statButtons[statId];
    if (!button?.visible || !button.getData('canSpend')) {
      return;
    }

    button.setFillStyle(hovered ? 0x1e3a5f : 0x132033, 0.98);
    button.setStrokeStyle(1, hovered ? 0x7dd3fc : 0x38bdf8, 0.98);
  }

  private applyClassChoiceCardHover(index: number, hovered: boolean): void {
    const card = this.classChoiceCards[index];
    if (!card?.visible) {
      return;
    }

    const baseColor = Number(card.getData('baseColor') ?? 0x101827);
    card.setFillStyle(baseColor, hovered ? 1 : 0.99);
    card.setStrokeStyle(2, hovered ? 0xfef08a : 0x38bdf8, hovered ? 1 : 0.9);
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
    this.classChoiceCards = [];
    this.classChoiceTitles = [];
    this.classChoiceDescriptions = [];
    this.classChoiceActionLabels = [];
    this.statButtons = {};
    this.statButtonLabels = {};
  }
}
