import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { HEROES } from '../data/heroes';
import {
  PERMANENT_UPGRADES,
  getPermanentUpgradeCost,
  type PermanentUpgradeDefinition,
} from '../data/permanentUpgrades';
import { QUESTS } from '../data/quests';
import { loadGameSave, type GameSaveData } from '../save/saveData';
import {
  canPurchasePermanentUpgrade,
  getPermanentUpgradeLevel,
  isPermanentUpgradeUnlocked,
  purchasePermanentUpgrade,
} from '../save/saveUpgrades';

export class MetaScene extends Phaser.Scene {
  private saveData!: GameSaveData;
  private goldText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private headerText!: Phaser.GameObjects.Text;
  private upgradeFrames: Phaser.GameObjects.Rectangle[] = [];
  private upgradeButtons: Phaser.GameObjects.Text[] = [];
  private upgradeDetails: Phaser.GameObjects.Text[] = [];
  private questFrames: Phaser.GameObjects.Rectangle[] = [];
  private questTexts: Phaser.GameObjects.Text[] = [];
  private readonly handleExitToMenu = (): void => {
    this.scene.start('MenuScene');
  };

  constructor() {
    super('MetaScene');
  }

  create(): void {
    this.saveData = loadGameSave();
    this.upgradeFrames = [];
    this.upgradeButtons = [];
    this.upgradeDetails = [];
    this.questFrames = [];
    this.questTexts = [];
    const centerX = GAME_WIDTH / 2;

    this.cameras.main.setBackgroundColor('#0b1020');
    this.add.rectangle(centerX, 70, 1120, 104, 0x0f172a, 0.95).setStrokeStyle(2, 0x334155, 0.9);
    this.add.rectangle(350, 412, 548, 486, 0x111827, 0.96).setStrokeStyle(2, 0x334155, 1);
    this.add.rectangle(940, 412, 520, 486, 0x111827, 0.96).setStrokeStyle(2, 0x334155, 1);

    this.add
      .text(98, 52, 'Meta Progression', {
        fontFamily: 'Georgia, serif',
        fontSize: '40px',
        color: '#f8fafc',
      })
      .setOrigin(0, 0.5);

    this.goldText = this.add
      .text(GAME_WIDTH - 104, 52, `Gold ${this.saveData.totalGold}`, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '24px',
        color: '#fde68a',
        backgroundColor: '#172036',
        padding: { left: 14, right: 14, top: 8, bottom: 8 },
      })
      .setOrigin(1, 0.5);

    this.headerText = this.add
      .text(100, 90, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '18px',
        color: '#93c5fd',
      })
      .setOrigin(0, 0.5);

    this.statusText = this.add
      .text(100, 116, 'Long-term upgrades on the left. Quest rewards on the right.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '16px',
        color: '#94a3b8',
      })
      .setOrigin(0, 0.5);

    this.add
      .text(94, 186, 'Permanent Upgrades', {
        fontFamily: 'Georgia, serif',
        fontSize: '30px',
        color: '#f8fafc',
      })
      .setOrigin(0, 0.5);

    this.add
      .text(710, 186, 'Quest Board', {
        fontFamily: 'Georgia, serif',
        fontSize: '30px',
        color: '#f8fafc',
      })
      .setOrigin(0, 0.5);

    this.add
      .text(96, 216, 'Spend gold here. Quest unlocks gate later rows.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '15px',
        color: '#8ea6c1',
      })
      .setOrigin(0, 0.5);

    this.add
      .text(710, 216, 'Quest progress and rewards stay separate from upgrade spend.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '15px',
        color: '#8ea6c1',
      })
      .setOrigin(0, 0.5);

    let upgradeY = 278;
    for (const upgrade of PERMANENT_UPGRADES) {
      const frame = this.add.rectangle(350, upgradeY, 492, 82, 0x172033, 0.98).setOrigin(0.5);
      frame.setStrokeStyle(1, 0x334155, 0.9);
      const button = this.add
        .text(506, upgradeY, upgrade.title, {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '17px',
          color: '#fef3c7',
          backgroundColor: '#1f2937',
          padding: { left: 14, right: 14, top: 8, bottom: 8 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      button.on('pointerover', () => {
        button.setStyle({ color: '#ffffff', backgroundColor: '#374151' });
      });
      button.on('pointerout', () => this.refreshView());
      button.on('pointerdown', () => this.handlePurchase(upgrade));

      const detail = this.add.text(132, upgradeY - 18, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '15px',
        color: '#cbd5e1',
        wordWrap: { width: 292 },
        lineSpacing: 3,
      });
      detail.setOrigin(0, 0);

      this.upgradeFrames.push(frame);
      this.upgradeButtons.push(button);
      this.upgradeDetails.push(detail);
      upgradeY += 92;
    }

    let questY = 270;
    for (const quest of QUESTS) {
      const frame = this.add.rectangle(940, questY, 444, 78, 0x172033, 0.98).setOrigin(0.5);
      frame.setStrokeStyle(1, 0x334155, 0.9);
      const questText = this.add.text(732, questY - 24, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '15px',
        color: '#cbd5e1',
        wordWrap: { width: 410 },
        lineSpacing: 3,
      });
      questText.setOrigin(0, 0);
      this.questFrames.push(frame);
      this.questTexts.push(questText);
      questY += 86;
    }

    const backButton = this.add
      .text(centerX, GAME_HEIGHT - 44, 'Back to Menu', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '24px',
        color: '#fef3c7',
        backgroundColor: '#1f2937',
        padding: { left: 20, right: 20, top: 10, bottom: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    backButton.on('pointerdown', this.handleExitToMenu);
    backButton.on('pointerover', () => {
      backButton.setStyle({ color: '#ffffff', backgroundColor: '#374151' });
    });
    backButton.on('pointerout', () => {
      backButton.setStyle({ color: '#fef3c7', backgroundColor: '#1f2937' });
    });

    this.input.keyboard?.on('keydown-ESC', this.handleExitToMenu, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    this.refreshView();
  }

  private handlePurchase(upgrade: PermanentUpgradeDefinition): void {
    if (!isPermanentUpgradeUnlocked(this.saveData, upgrade.id)) {
      this.statusText.setText('That upgrade is still locked behind a quest reward.');
      return;
    }

    const nextSave = purchasePermanentUpgrade(this.saveData, upgrade);

    if (!nextSave) {
      this.statusText.setText('Not enough gold or that upgrade is already maxed.');
      return;
    }

    this.saveData = nextSave;
    this.statusText.setText(`${upgrade.title} purchased. Future runs are stronger.`);
    this.refreshView();
  }

  private refreshView(): void {
    this.saveData = loadGameSave();
    this.goldText.setText(`Gold ${this.saveData.totalGold}`);
    this.headerText.setText(`Selected Hero: ${HEROES[this.saveData.selectedHero].name}`);

    for (let index = 0; index < PERMANENT_UPGRADES.length; index += 1) {
      const upgrade = PERMANENT_UPGRADES[index];
      const level = getPermanentUpgradeLevel(this.saveData, upgrade.id);
      const cost = getPermanentUpgradeCost(upgrade, level);
      const unlocked = isPermanentUpgradeUnlocked(this.saveData, upgrade.id);
      const canBuy = canPurchasePermanentUpgrade(this.saveData, upgrade);
      const maxed = level >= upgrade.maxLevel;
      const state = !unlocked ? 'Quest Locked' : maxed ? 'Maxed' : canBuy ? 'Available' : 'Need More Gold';

      this.upgradeFrames[index].setFillStyle(!unlocked ? 0x172234 : maxed ? 0x1c3b2c : 0x172033, 0.98);
      this.upgradeFrames[index].setStrokeStyle(1, !unlocked ? 0x334155 : maxed ? 0x4ade80 : 0x334155, 0.95);
      this.upgradeButtons[index].setText(!unlocked ? 'Quest' : maxed ? 'Max' : `Buy ${cost}g`);
      this.upgradeButtons[index].setStyle({
        color: !unlocked ? '#94a3b8' : maxed ? '#111827' : canBuy ? '#fef3c7' : '#cbd5e1',
        backgroundColor: !unlocked ? '#233044' : maxed ? '#86efac' : canBuy ? '#1f2937' : '#374151',
      });
      this.upgradeDetails[index].setText(
        `${upgrade.title} ${level}/${upgrade.maxLevel}\n${upgrade.description}\n${state}`,
      );
    }

    for (let index = 0; index < QUESTS.length; index += 1) {
      const quest = QUESTS[index];
      const completed = this.saveData.completedQuests.includes(quest.id);
      const progress = this.getQuestProgress(quest.metric, quest.target);
      const rewardLabel = this.getQuestRewardLabel(quest);

      this.questFrames[index].setFillStyle(completed ? 0x173126 : 0x172033, 0.98);
      this.questFrames[index].setStrokeStyle(1, completed ? 0x4ade80 : 0x334155, completed ? 0.95 : 0.9);
      this.questTexts[index].setText(
        `${completed ? 'Complete' : 'Active'}  ${quest.title}\n${quest.description}\n${progress}  |  ${rewardLabel}`,
      );
      this.questTexts[index].setColor(completed ? '#86efac' : '#cbd5e1');
    }
  }

  private handleShutdown(): void {
    this.input.keyboard?.off('keydown-ESC', this.handleExitToMenu, this);
  }

  private getQuestProgress(metric: string, target: number): string {
    const value = this.saveData.progressStats[metric as keyof typeof this.saveData.progressStats] ?? 0;

    if (metric === 'totalSurvivalMs') {
      return `${Math.min(target, Number(value)) / 1000}s / ${target / 1000}s`;
    }

    return `${Math.min(target, Number(value))} / ${target}`;
  }

  private getQuestRewardLabel(quest: (typeof QUESTS)[number]): string {
    switch (quest.reward.type) {
      case 'gold':
        return `+${quest.reward.amount} gold`;
      case 'unlockHero':
        return `Unlock hero: ${HEROES[quest.reward.heroId].name}`;
      case 'unlockPermanentUpgrade':
        return `Unlock meta upgrade: ${quest.reward.upgradeId}`;
    }
  }
}
