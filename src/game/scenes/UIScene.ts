import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import type { RewardDefinition } from '../data/rewards';
import { RunScene } from './RunScene';

export class UIScene extends Phaser.Scene {
  private heroText!: Phaser.GameObjects.Text;
  private heroBadgeText!: Phaser.GameObjects.Text;
  private hpText!: Phaser.GameObjects.Text;
  private hpBarFill!: Phaser.GameObjects.Rectangle;
  private hpBarFrame!: Phaser.GameObjects.Rectangle;
  private guardText!: Phaser.GameObjects.Text;
  private guardBarFill!: Phaser.GameObjects.Rectangle;
  private guardBarFrame!: Phaser.GameObjects.Rectangle;
  private timerText!: Phaser.GameObjects.Text;
  private killsText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private xpText!: Phaser.GameObjects.Text;
  private xpBarFill!: Phaser.GameObjects.Rectangle;
  private xpBarFrame!: Phaser.GameObjects.Rectangle;
  private hpBarRatio = 0;
  private guardBarRatio = 0;
  private xpBarRatio = 0;
  private traitText!: Phaser.GameObjects.Text;
  private supportText!: Phaser.GameObjects.Text;
  private stateText!: Phaser.GameObjects.Text;
  private evolutionText!: Phaser.GameObjects.Text;
  private objectiveText!: Phaser.GameObjects.Text;
  private abilityTexts: Phaser.GameObjects.Text[] = [];
  private levelUpContainer!: Phaser.GameObjects.Container;
  private levelUpSubtitle!: Phaser.GameObjects.Text;
  private levelUpHint!: Phaser.GameObjects.Text;
  private levelUpCards: Phaser.GameObjects.Rectangle[] = [];
  private levelUpTitles: Phaser.GameObjects.Text[] = [];
  private levelUpBodies: Phaser.GameObjects.Text[] = [];
  private levelUpLaneTags: Phaser.GameObjects.Text[] = [];
  private endContainer!: Phaser.GameObjects.Container;
  private endTitleText!: Phaser.GameObjects.Text;
  private endBodyText!: Phaser.GameObjects.Text;
  private endHintText!: Phaser.GameObjects.Text;
  private selectedLevelUpIndex = 0;

  private readonly handleChoiceOne = (): void => this.selectChoice(0);
  private readonly handleChoiceTwo = (): void => this.selectChoice(1);
  private readonly handleChoiceThree = (): void => this.selectChoice(2);
  private readonly handleChoiceLeft = (): void => this.moveChoice(-1);
  private readonly handleChoiceRight = (): void => this.moveChoice(1);

  constructor() {
    super('UIScene');
  }

  create(): void {
    this.abilityTexts = [];
    this.levelUpCards = [];
    this.levelUpTitles = [];
    this.levelUpBodies = [];
    this.levelUpLaneTags = [];
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

    this.add
      .rectangle(28, 18, 332, 176, 0x030712, 0.92)
      .setOrigin(0)
      .setScrollFactor(0)
      .setStrokeStyle(1, 0x334155, 0.95);
    this.heroText = this.add
      .text(42, 30, '--', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '24px',
        color: '#f8fafc',
      })
      .setScrollFactor(0);
    this.heroBadgeText = this.add
      .text(42, 58, 'CHASSIS', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '12px',
        color: '#e2e8f0',
        backgroundColor: '#172036',
        padding: { left: 8, right: 8, top: 4, bottom: 4 },
      })
      .setScrollFactor(0);

    this.hpBarFrame = this.add
      .rectangle(42, 92, 248, 18, 0x172033, 0.98)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setStrokeStyle(1, 0x475569, 0.95);
    this.hpBarFill = this.add.rectangle(42, 92, 0, 12, 0xf87171, 1).setOrigin(0, 0.5).setScrollFactor(0);
    this.hpText = this.add
      .text(42, 104, 'HP --/--', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '13px',
        color: '#fecaca',
      })
      .setScrollFactor(0);

    this.guardBarFrame = this.add
      .rectangle(42, 126, 248, 16, 0x241b0c, 0.98)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setStrokeStyle(1, 0x7c5c1f, 0.95);
    this.guardBarFill = this.add.rectangle(42, 126, 0, 10, 0xfbbf24, 1).setOrigin(0, 0.5).setScrollFactor(0);
    this.guardText = this.add
      .text(42, 136, 'Guard --/--', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '13px',
        color: '#fde68a',
      })
      .setScrollFactor(0);

    this.xpBarFrame = this.add
      .rectangle(42, 158, 248, 16, 0x10233f, 0.98)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setStrokeStyle(1, 0x60a5fa, 0.95);
    this.xpBarFill = this.add.rectangle(42, 158, 0, 10, 0x38bdf8, 1).setOrigin(0, 0.5).setScrollFactor(0);
    this.xpText = this.add
      .text(42, 168, 'XP 0/0', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '13px',
        color: '#bfdbfe',
      })
      .setScrollFactor(0);

    this.hpBarFrame.setDepth(10);
    this.hpBarFill.setDepth(11);
    this.guardBarFrame.setDepth(10);
    this.guardBarFill.setDepth(11);
    this.xpBarFrame.setDepth(10);
    this.xpBarFill.setDepth(11);

    this.timerText = this.add
      .text(GAME_WIDTH / 2, 28, '00:00', {
        fontFamily: 'Georgia, serif',
        fontSize: '34px',
        color: '#e0f2fe',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0);

    this.killsText = this.add
      .text(GAME_WIDTH - 34, 24, 'Kills 0', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '18px',
        color: '#cbd5e1',
        backgroundColor: '#172036',
        padding: { left: 12, right: 12, top: 8, bottom: 8 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);

    this.levelText = this.add
      .text(GAME_WIDTH - 34, 64, 'LV 1', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '18px',
        color: '#bfdbfe',
        backgroundColor: '#172036',
        padding: { left: 12, right: 12, top: 8, bottom: 8 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);

    this.stateText = this.add
      .text(GAME_WIDTH / 2, 72, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '14px',
        color: '#dbeafe',
        backgroundColor: '#10233f',
        padding: { left: 12, right: 12, top: 6, bottom: 6 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0);

    this.objectiveText = this.add
      .text(GAME_WIDTH / 2, 104, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '14px',
        color: '#fde68a',
        backgroundColor: '#2a1a0f',
        padding: { left: 12, right: 12, top: 6, bottom: 6 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0);

    this.traitText = this.add
      .text(38, GAME_HEIGHT - 74, 'Traits: --', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '14px',
        color: '#cbd5e1',
        backgroundColor: '#0f172a',
        padding: { left: 12, right: 12, top: 8, bottom: 8 },
        wordWrap: { width: 700 },
      })
      .setOrigin(0, 0)
      .setScrollFactor(0);

    this.supportText = this.add
      .text(760, GAME_HEIGHT - 108, 'Support Slot: Locked', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '14px',
        color: '#a5f3fc',
        backgroundColor: '#0f172a',
        padding: { left: 12, right: 12, top: 8, bottom: 8 },
        wordWrap: { width: 470 },
      })
      .setOrigin(0, 0)
      .setScrollFactor(0);

    this.evolutionText = this.add
      .text(760, GAME_HEIGHT - 74, 'Evolution: --', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '14px',
        color: '#fde68a',
        backgroundColor: '#0f172a',
        padding: { left: 12, right: 12, top: 8, bottom: 8 },
        wordWrap: { width: 470 },
      })
      .setOrigin(0, 0)
      .setScrollFactor(0);

    const labels = ['Primary', 'Signature', 'Support'];
    labels.forEach((label, index) => {
      const x = 38 + index * 168;
      this.add
        .rectangle(x, GAME_HEIGHT - 128, 148, 42, 0x172033, 0.98)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setStrokeStyle(1, 0x334155, 0.92);
      this.abilityTexts.push(
        this.add
          .text(x + 10, GAME_HEIGHT - 117, `${label}: --`, {
            fontFamily: 'Trebuchet MS, sans-serif',
            fontSize: '13px',
            color: '#eff6ff',
          })
          .setScrollFactor(0),
      );
    });

    this.levelUpContainer = this.createLevelUpOverlay();
    this.endContainer = this.createEndOverlay();

    this.input.keyboard?.on('keydown-ONE', this.handleChoiceOne, this);
    this.input.keyboard?.on('keydown-TWO', this.handleChoiceTwo, this);
    this.input.keyboard?.on('keydown-THREE', this.handleChoiceThree, this);
    this.input.keyboard?.on('keydown-LEFT', this.handleChoiceLeft, this);
    this.input.keyboard?.on('keydown-A', this.handleChoiceLeft, this);
    this.input.keyboard?.on('keydown-RIGHT', this.handleChoiceRight, this);
    this.input.keyboard?.on('keydown-D', this.handleChoiceRight, this);
    this.input.keyboard?.on('keydown-ENTER', this.handleEnter, this);
    this.input.keyboard?.on('keydown-SPACE', this.handleEnter, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
  }

  update(): void {
    const hp = Number(this.registry.get('run.hp') ?? 0);
    const maxHp = Math.max(1, Number(this.registry.get('run.maxHp') ?? 1));
    const guard = Number(this.registry.get('run.guard') ?? 0);
    const maxGuard = Math.max(1, Number(this.registry.get('run.maxGuard') ?? 1));
    const elapsedMs = Number(this.registry.get('run.elapsedMs') ?? 0);
    const targetMs = Math.max(1, Number(this.registry.get('run.targetMs') ?? 1));
    const kills = Number(this.registry.get('run.kills') ?? 0);
    const level = Number(this.registry.get('run.level') ?? 1);
    const xp = Number(this.registry.get('run.xp') ?? 0);
    const xpNext = Math.max(1, Number(this.registry.get('run.xpNext') ?? 1));
    const heroName = String(this.registry.get('run.heroName') ?? '--');
    const heroAffinity = String(this.registry.get('run.heroAffinity') ?? 'guard');
    const markedEnemies = Number(this.registry.get('run.markedEnemies') ?? 0);
    const stateLabel = String(this.registry.get('run.stateLabel') ?? '');
    const evolutionTitle = String(this.registry.get('run.evolutionTitle') ?? '');
    const supportName = String(this.registry.get('run.supportName') ?? 'Locked');
    const bossActive = Boolean(this.registry.get('run.bossActive'));
    const bossObjective = String(this.registry.get('run.bossObjective') ?? '');
    const bossName = String(this.registry.get('run.bossName') ?? '');
    const pressureBeatActive = Boolean(this.registry.get('run.pressureBeatActive'));
    const pressureBeatLabel = String(this.registry.get('run.pressureBeatLabel') ?? '');
    const pressureBeatObjective = String(this.registry.get('run.pressureBeatObjective') ?? '');
    const bossHp = Number(this.registry.get('run.bossHp') ?? 0);
    const bossMaxHp = Number(this.registry.get('run.bossMaxHp') ?? 0);
    const bossProtectors = Number(this.registry.get('run.bossProtectors') ?? 0);
    const bossProtected = Boolean(this.registry.get('run.bossProtected'));
    const traits = (this.registry.get('run.traits') ?? []) as string[];
    const abilityLabels = (this.registry.get('run.abilityLabels') ?? []) as string[];
    const endActive = Boolean(this.registry.get('run.endActive'));
    const levelUpActive = Boolean(this.registry.get('run.levelUpActive'));
    const rewards = (this.registry.get('run.levelUpChoices') ?? []) as RewardDefinition[];

    this.heroText.setText(heroName);
    this.heroBadgeText.setText(this.getAffinityBadge(heroAffinity));
    this.heroBadgeText.setStyle(this.getAffinityBadgeStyle(heroAffinity));

    this.hpBarRatio = Phaser.Math.Clamp(hp / maxHp, 0, 1);
    this.guardBarRatio = Phaser.Math.Clamp(guard / maxGuard, 0, 1);
    this.xpBarRatio = Phaser.Math.Clamp(xp / xpNext, 0, 1);
    this.hpBarFill.setSize(248 * this.hpBarRatio, 12);
    this.hpText.setText(`HP ${Math.max(0, Math.round(hp))}/${Math.round(maxHp)}`);
    this.guardBarFill.setSize(248 * this.guardBarRatio, 10);
    this.guardText.setText(`Guard ${Math.max(0, Math.round(guard))}/${Math.round(maxGuard)}`);
    this.xpBarFill.setSize(248 * this.xpBarRatio, 10);
    this.xpText.setText(`XP ${Math.round(xp)}/${Math.round(xpNext)}`);
    this.timerText.setText(`${this.formatTime(elapsedMs)} / ${this.formatTime(targetMs)}`);
    this.killsText.setText(`Kills ${kills}`);
    this.levelText.setText(`LV ${level}`);
    this.stateText.setText(stateLabel || `Marked Enemies ${markedEnemies}`);
    this.stateText.setStyle(this.getStateBadgeStyle(heroAffinity));

    this.objectiveText.setText(
      bossActive
        ? `${bossName} ${Math.max(0, Math.round(bossHp))}/${Math.max(1, Math.round(bossMaxHp))} | Escorts ${bossProtectors} | ${bossProtected ? 'Protected' : 'Vulnerable'}`
        : pressureBeatActive
          ? `${pressureBeatLabel}: ${pressureBeatObjective}`
          : bossObjective || 'Gather XP, shape a lane, and lock in before the boss.',
    );
    this.objectiveText.setStyle(this.getObjectiveStyle({ bossActive, bossProtected, pressureBeatActive }));

    this.traitText.setText(`Traits: ${traits.length > 0 ? traits.join(' | ') : 'None yet'}`);
    this.supportText.setText(`Support Slot: ${supportName === 'Locked' ? 'Locked' : supportName}`);
    this.supportText.setStyle(this.getSupportStyle(supportName));
    this.evolutionText.setText(`Evolution: ${evolutionTitle || 'Not chosen yet'}`);
    this.evolutionText.setStyle(this.getEvolutionStyle(Boolean(evolutionTitle)));
    this.abilityTexts.forEach((text, index) => {
      text.setText(abilityLabels[index] ?? '--');
      if (index === 1) {
        text.setStyle({ color: '#fde68a' });
      } else if (index === 2) {
        text.setStyle({ color: supportName === 'Locked' ? '#94a3b8' : '#a5f3fc' });
      } else {
        text.setStyle({ color: '#eff6ff' });
      }
    });

    this.syncLevelUpOverlay(levelUpActive, rewards);
    this.syncEndOverlay(endActive);
  }

  private createLevelUpOverlay(): Phaser.GameObjects.Container {
    const objects: Phaser.GameObjects.GameObject[] = [];
    objects.push(this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x020617, 0.8).setScrollFactor(0));
    objects.push(
      this.add
        .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 1140, 320, 0x0f172a, 0.98)
        .setStrokeStyle(2, 0x334155, 0.95)
        .setScrollFactor(0),
    );
    objects.push(
      this.add
        .text(GAME_WIDTH / 2, 218, 'Choose A Reward', {
          fontFamily: 'Georgia, serif',
          fontSize: '34px',
          color: '#f8fafc',
        })
        .setOrigin(0.5)
        .setScrollFactor(0),
    );
    this.levelUpSubtitle = this.add
      .text(GAME_WIDTH / 2, 252, 'Combat is frozen. Deepen, bridge, or stabilize your run.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '15px',
        color: '#cbd5e1',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    this.levelUpHint = this.add
      .text(GAME_WIDTH / 2, 506, '1 / 2 / 3 choose • Left / Right move focus • Enter confirms highlighted reward', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '14px',
        color: '#93c5fd',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    objects.push(this.levelUpSubtitle, this.levelUpHint);

    for (let index = 0; index < 3; index += 1) {
      const x = 258 + index * 382;
      const card = this.add
        .rectangle(x, 378, 318, 196, 0x172033, 0.98)
        .setScrollFactor(0)
        .setStrokeStyle(2, 0x334155, 0.92);
      card.setInteractive({ useHandCursor: true });
      card.on('pointerdown', () => this.selectChoice(index));
      card.on('pointerover', () => {
        this.selectedLevelUpIndex = index;
        this.syncLevelUpCardVisuals((this.registry.get('run.levelUpChoices') ?? []) as RewardDefinition[]);
      });

      const laneTag = this.add
        .text(x - 136, 304, '', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '12px',
          color: '#0f172a',
          backgroundColor: '#f8fafc',
          padding: { left: 8, right: 8, top: 4, bottom: 4 },
        })
        .setOrigin(0, 0)
        .setScrollFactor(0);
      const title = this.add
        .text(x - 136, 334, '', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '20px',
          color: '#f8fafc',
          wordWrap: { width: 272 },
        })
        .setOrigin(0, 0)
        .setScrollFactor(0);
      const body = this.add
        .text(x - 136, 372, '', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '14px',
          color: '#cbd5e1',
          wordWrap: { width: 272 },
          lineSpacing: 5,
        })
        .setOrigin(0, 0)
        .setScrollFactor(0);

      this.levelUpCards.push(card);
      this.levelUpLaneTags.push(laneTag);
      this.levelUpTitles.push(title);
      this.levelUpBodies.push(body);
      objects.push(card, laneTag, title, body);
    }

    return this.add.container(0, 0, objects).setDepth(30).setVisible(false);
  }

  private createEndOverlay(): Phaser.GameObjects.Container {
    const panel = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 560, 276, 0x0f172a, 0.98)
      .setScrollFactor(0)
      .setStrokeStyle(2, 0x334155, 0.95);
    const title = this.add
      .text(GAME_WIDTH / 2, 270, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '38px',
        color: '#f8fafc',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    const body = this.add
      .text(GAME_WIDTH / 2, 324, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '16px',
        color: '#cbd5e1',
        align: 'center',
        wordWrap: { width: 440 },
        lineSpacing: 5,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0);
    const hint = this.add
      .text(GAME_WIDTH / 2, 464, 'Press Enter or Space to return to menu', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '16px',
        color: '#93c5fd',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.endTitleText = title;
    this.endBodyText = body;
    this.endHintText = hint;
    return this.add
      .container(0, 0, [
        this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x020617, 0.78).setScrollFactor(0),
        panel,
        title,
        body,
        hint,
      ])
      .setDepth(40)
      .setVisible(false);
  }

  private syncLevelUpOverlay(active: boolean, rewards: RewardDefinition[]): void {
    this.levelUpContainer.setVisible(active);
    if (!active) {
      this.selectedLevelUpIndex = 0;
      return;
    }

    const firstAvailableIndex = rewards.findIndex((reward) => Boolean(reward));
    if (firstAvailableIndex >= 0 && !rewards[this.selectedLevelUpIndex]) {
      this.selectedLevelUpIndex = firstAvailableIndex;
    }

    for (let index = 0; index < 3; index += 1) {
      const reward = rewards[index];
      if (!reward) {
        this.levelUpCards[index].setVisible(false);
        this.levelUpCards[index].disableInteractive();
        this.levelUpLaneTags[index].setVisible(false).setText('');
        this.levelUpTitles[index].setVisible(false).setText('');
        this.levelUpBodies[index].setVisible(false).setText('');
        continue;
      }

      this.levelUpCards[index].setVisible(true);
      this.levelUpCards[index].setInteractive({ useHandCursor: true });
      this.levelUpLaneTags[index].setVisible(true).setText(`${this.getLaneLabel(reward.lane)} • ${this.getCategoryLabel(reward.category)}`);
      this.levelUpLaneTags[index].setStyle({
        color: reward.lane === 'stabilize' ? '#052e16' : '#0f172a',
        backgroundColor: this.getLaneHex(reward.lane),
      });
      this.levelUpTitles[index].setVisible(true).setText(`${index + 1}. ${reward.title}`);
      this.levelUpBodies[index].setVisible(true).setText(reward.description);
    }

    this.syncLevelUpCardVisuals(rewards);
  }

  private syncEndOverlay(active: boolean): void {
    this.endContainer.setVisible(active);
    if (!active) {
      return;
    }

    this.endTitleText.setText(String(this.registry.get('run.endTitle') ?? 'Run Over'));
    this.endTitleText.setColor(Boolean(this.registry.get('run.victory')) ? '#fde68a' : '#fecaca');
    this.endBodyText.setText(
      `${String(this.registry.get('run.heroName') ?? '--')}\n${String(this.registry.get('run.endSubtitle') ?? '')}`,
    );
    this.endHintText.setText('Press Enter or Space to return to menu');
  }

  private selectChoice(index: number): void {
    if (!this.registry.get('run.levelUpActive') || this.registry.get('run.endActive') || !this.scene.isActive('RunScene')) {
      return;
    }

    const runScene = this.scene.get('RunScene') as RunScene;
    runScene.selectReward(index);
  }

  private handleEnter(): void {
    if (this.registry.get('run.levelUpActive') && !this.registry.get('run.endActive')) {
      this.selectChoice(this.selectedLevelUpIndex);
      return;
    }

    if (this.registry.get('run.endActive') && this.scene.isActive('RunScene')) {
      const runScene = this.scene.get('RunScene') as RunScene;
      runScene.returnToMenu();
    }
  }

  private moveChoice(direction: -1 | 1): void {
    if (!this.registry.get('run.levelUpActive')) {
      return;
    }

    const rewards = (this.registry.get('run.levelUpChoices') ?? []) as RewardDefinition[];
    const availableIndices = rewards.flatMap((reward, index) => (reward ? [index] : []));
    if (availableIndices.length === 0) {
      return;
    }

    const currentPosition = Math.max(0, availableIndices.indexOf(this.selectedLevelUpIndex));
    const nextPosition = (currentPosition + direction + availableIndices.length) % availableIndices.length;
    this.selectedLevelUpIndex = availableIndices[nextPosition] ?? availableIndices[0] ?? 0;
    this.syncLevelUpCardVisuals(rewards);
  }

  private syncLevelUpCardVisuals(rewards: RewardDefinition[]): void {
    for (let index = 0; index < 3; index += 1) {
      const reward = rewards[index];
      const selected = Boolean(reward) && index === this.selectedLevelUpIndex;
      const laneColor = reward ? this.getLaneColor(reward.lane) : 0x334155;
      this.levelUpCards[index].setFillStyle(selected ? laneColor : 0x172033, selected ? 0.26 : 0.98);
      this.levelUpCards[index].setStrokeStyle(selected ? 4 : 2, laneColor, selected ? 1 : 0.95);
      this.levelUpTitles[index].setStyle({ color: selected ? '#ffffff' : '#f8fafc' });
    }
  }

  private getLaneColor(lane: RewardDefinition['lane']): number {
    switch (lane) {
      case 'deepen':
        return 0xf59e0b;
      case 'bridge':
        return 0x60a5fa;
      case 'stabilize':
      default:
        return 0x4ade80;
    }
  }

  private getLaneHex(lane: RewardDefinition['lane']): string {
    switch (lane) {
      case 'deepen':
        return '#f59e0b';
      case 'bridge':
        return '#60a5fa';
      case 'stabilize':
      default:
        return '#4ade80';
    }
  }

  private getLaneLabel(lane: RewardDefinition['lane']): string {
    switch (lane) {
      case 'deepen':
        return 'Deepen';
      case 'bridge':
        return 'Bridge';
      case 'stabilize':
      default:
        return 'Stabilize';
    }
  }

  private getCategoryLabel(category: RewardDefinition['category']): string {
    switch (category) {
      case 'trait':
        return 'Trait';
      case 'support':
        return 'Support';
      case 'evolution':
        return 'Evolution';
      case 'stabilizer':
      default:
        return 'Stabilizer';
    }
  }

  private getAffinityBadge(affinity: string): string {
    switch (affinity) {
      case 'guard':
        return 'GUARD CHASSIS';
      case 'mark':
        return 'MARK CHASSIS';
      case 'ailment':
      default:
        return 'AILMENT CHASSIS';
    }
  }

  private getAffinityBadgeStyle(affinity: string): Phaser.Types.GameObjects.Text.TextStyle {
    switch (affinity) {
      case 'guard':
        return { color: '#fff7ed', backgroundColor: '#9a3412' };
      case 'mark':
        return { color: '#eff6ff', backgroundColor: '#1d4ed8' };
      case 'ailment':
      default:
        return { color: '#fff1f2', backgroundColor: '#9f1239' };
    }
  }

  private getStateBadgeStyle(affinity: string): Phaser.Types.GameObjects.Text.TextStyle {
    switch (affinity) {
      case 'guard':
        return { color: '#ffedd5', backgroundColor: '#7c2d12' };
      case 'mark':
        return { color: '#dbeafe', backgroundColor: '#1d4ed8' };
      case 'ailment':
      default:
        return { color: '#ffe4e6', backgroundColor: '#881337' };
    }
  }

  private getObjectiveStyle(options: { bossActive: boolean; bossProtected: boolean; pressureBeatActive: boolean }): Phaser.Types.GameObjects.Text.TextStyle {
    if (options.bossActive) {
      return options.bossProtected
        ? { color: '#dbeafe', backgroundColor: '#1e3a8a' }
        : { color: '#dcfce7', backgroundColor: '#14532d' };
    }
    if (options.pressureBeatActive) {
      return { color: '#fef3c7', backgroundColor: '#78350f' };
    }
    return { color: '#fde68a', backgroundColor: '#2a1a0f' };
  }

  private getSupportStyle(supportName: string): Phaser.Types.GameObjects.Text.TextStyle {
    if (supportName === 'Locked') {
      return { color: '#94a3b8', backgroundColor: '#0f172a' };
    }
    return { color: '#a5f3fc', backgroundColor: '#083344' };
  }

  private getEvolutionStyle(chosen: boolean): Phaser.Types.GameObjects.Text.TextStyle {
    return chosen
      ? { color: '#fde68a', backgroundColor: '#422006' }
      : { color: '#cbd5e1', backgroundColor: '#0f172a' };
  }

  private formatTime(ms: number): string {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  private handleShutdown(): void {
    this.input.keyboard?.off('keydown-ONE', this.handleChoiceOne, this);
    this.input.keyboard?.off('keydown-TWO', this.handleChoiceTwo, this);
    this.input.keyboard?.off('keydown-THREE', this.handleChoiceThree, this);
    this.input.keyboard?.off('keydown-LEFT', this.handleChoiceLeft, this);
    this.input.keyboard?.off('keydown-A', this.handleChoiceLeft, this);
    this.input.keyboard?.off('keydown-RIGHT', this.handleChoiceRight, this);
    this.input.keyboard?.off('keydown-D', this.handleChoiceRight, this);
    this.input.keyboard?.off('keydown-ENTER', this.handleEnter, this);
    this.input.keyboard?.off('keydown-SPACE', this.handleEnter, this);
  }

  getDebugHudSnapshot(): {
    hpBarWidth: number;
    guardBarWidth: number;
    xpBarWidth: number;
    hpBarRatio: number;
    guardBarRatio: number;
    xpBarRatio: number;
    hpBarFrameDepth: number;
    hpBarFillDepth: number;
    guardBarFrameDepth: number;
    guardBarFillDepth: number;
    xpBarFrameDepth: number;
    xpBarFillDepth: number;
    hpText: string;
    guardText: string;
    xpText: string;
  } {
    return {
      hpBarWidth: this.hpBarFill.displayWidth,
      guardBarWidth: this.guardBarFill.displayWidth,
      xpBarWidth: this.xpBarFill.displayWidth,
      hpBarRatio: this.hpBarRatio,
      guardBarRatio: this.guardBarRatio,
      xpBarRatio: this.xpBarRatio,
      hpBarFrameDepth: this.hpBarFrame.depth,
      hpBarFillDepth: this.hpBarFill.depth,
      guardBarFrameDepth: this.guardBarFrame.depth,
      guardBarFillDepth: this.guardBarFill.depth,
      xpBarFrameDepth: this.xpBarFrame.depth,
      xpBarFillDepth: this.xpBarFill.depth,
      hpText: this.hpText.text,
      guardText: this.guardText.text,
      xpText: this.xpText.text,
    };
  }
}
