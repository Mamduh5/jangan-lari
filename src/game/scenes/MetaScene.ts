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
  private upgradeButtons: Phaser.GameObjects.Text[] = [];
  private upgradeDetails: Phaser.GameObjects.Text[] = [];
  private questTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('MetaScene');
  }

  create(): void {
    this.saveData = loadGameSave();
    const centerX = GAME_WIDTH / 2;

    this.cameras.main.setBackgroundColor('#0b1020');

    this.add
      .text(centerX, 52, 'Meta Progression', {
        fontFamily: 'Georgia, serif',
        fontSize: '40px',
        color: '#f8fafc',
      })
      .setOrigin(0.5);

    this.goldText = this.add
      .text(centerX, 94, `Total Gold: ${this.saveData.totalGold}`, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '24px',
        color: '#fde68a',
      })
      .setOrigin(0.5);

    this.headerText = this.add
      .text(centerX, 126, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '18px',
        color: '#93c5fd',
      })
      .setOrigin(0.5);

    this.statusText = this.add
      .text(centerX, 154, 'Buy permanent boosts and clear quests for long-term power.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '17px',
        color: '#cbd5e1',
      })
      .setOrigin(0.5);

    const leftPanel = this.add.rectangle(360, 394, 560, 492, 0x111827, 0.94).setOrigin(0.5);
    leftPanel.setStrokeStyle(2, 0x334155, 1);
    const rightPanel = this.add.rectangle(930, 394, 500, 492, 0x111827, 0.94).setOrigin(0.5);
    rightPanel.setStrokeStyle(2, 0x334155, 1);

    this.add
      .text(130, 194, 'Permanent Upgrades', {
        fontFamily: 'Georgia, serif',
        fontSize: '30px',
        color: '#f8fafc',
      })
      .setOrigin(0, 0.5);

    this.add
      .text(710, 194, 'Quest Board', {
        fontFamily: 'Georgia, serif',
        fontSize: '30px',
        color: '#f8fafc',
      })
      .setOrigin(0, 0.5);

    let upgradeY = 256;
    for (const upgrade of PERMANENT_UPGRADES) {
      const button = this.add
        .text(110, upgradeY, upgrade.title, {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '22px',
          color: '#fef3c7',
          backgroundColor: '#1f2937',
          padding: { left: 16, right: 16, top: 8, bottom: 8 },
        })
        .setOrigin(0, 0.5)
        .setInteractive({ useHandCursor: true });

      button.on('pointerover', () => {
        button.setStyle({ color: '#ffffff', backgroundColor: '#374151' });
      });
      button.on('pointerout', () => this.refreshView());
      button.on('pointerdown', () => this.handlePurchase(upgrade));

      const detail = this.add.text(290, upgradeY, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '16px',
        color: '#cbd5e1',
        wordWrap: { width: 320 },
      });
      detail.setOrigin(0, 0.5);

      this.upgradeButtons.push(button);
      this.upgradeDetails.push(detail);
      upgradeY += 100;
    }

    let questY = 232;
    for (const quest of QUESTS) {
      const questText = this.add.text(700, questY, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '16px',
        color: '#cbd5e1',
        wordWrap: { width: 430 },
      });
      questText.setOrigin(0, 0);
      this.questTexts.push(questText);
      questY += 88;
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

    backButton.on('pointerdown', () => this.scene.start('MenuScene'));
    backButton.on('pointerover', () => {
      backButton.setStyle({ color: '#ffffff', backgroundColor: '#374151' });
    });
    backButton.on('pointerout', () => {
      backButton.setStyle({ color: '#fef3c7', backgroundColor: '#1f2937' });
    });

    this.input.keyboard?.once('keydown-ESC', () => this.scene.start('MenuScene'));
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
    this.goldText.setText(`Total Gold: ${this.saveData.totalGold}`);
    this.headerText.setText(`Selected Hero: ${HEROES[this.saveData.selectedHero].name}`);

    for (let index = 0; index < PERMANENT_UPGRADES.length; index += 1) {
      const upgrade = PERMANENT_UPGRADES[index];
      const level = getPermanentUpgradeLevel(this.saveData, upgrade.id);
      const cost = getPermanentUpgradeCost(upgrade, level);
      const unlocked = isPermanentUpgradeUnlocked(this.saveData, upgrade.id);
      const canBuy = canPurchasePermanentUpgrade(this.saveData, upgrade);
      const maxed = level >= upgrade.maxLevel;
      const state = !unlocked ? 'Quest Locked' : maxed ? 'Maxed' : canBuy ? 'Available' : 'Need More Gold';

      this.upgradeButtons[index].setText(`${upgrade.title} ${level}/${upgrade.maxLevel}`);
      this.upgradeButtons[index].setStyle({
        color: !unlocked ? '#94a3b8' : maxed ? '#111827' : canBuy ? '#fef3c7' : '#cbd5e1',
        backgroundColor: !unlocked ? '#233044' : maxed ? '#86efac' : canBuy ? '#1f2937' : '#374151',
      });
      this.upgradeDetails[index].setText(
        `${upgrade.description}\nState: ${state}\nCost: ${maxed ? 'MAX' : cost}`,
      );
    }

    for (let index = 0; index < QUESTS.length; index += 1) {
      const quest = QUESTS[index];
      const completed = this.saveData.completedQuests.includes(quest.id);
      const progress = this.getQuestProgress(quest.metric, quest.target);
      const rewardLabel = this.getQuestRewardLabel(quest);

      this.questTexts[index].setText(
        `${completed ? '[Complete]' : '[Active]'} ${quest.title}\n${quest.description}\nProgress: ${progress}\nReward: ${rewardLabel}`,
      );
      this.questTexts[index].setColor(completed ? '#86efac' : '#cbd5e1');
    }
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
