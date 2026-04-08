import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { PERMANENT_UPGRADES, getPermanentUpgradeCost, type PermanentUpgradeDefinition } from '../data/permanentUpgrades';
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
  private upgradeButtons: Phaser.GameObjects.Text[] = [];
  private upgradeDetails: Phaser.GameObjects.Text[] = [];
  private questTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('MetaScene');
  }

  create(): void {
    this.saveData = loadGameSave();
    const centerX = GAME_WIDTH / 2;

    this.add
      .text(centerX, 54, 'Meta Progression', {
        fontFamily: 'Georgia, serif',
        fontSize: '40px',
        color: '#f8fafc',
      })
      .setOrigin(0.5);

    this.goldText = this.add
      .text(centerX, 96, `Total Gold: ${this.saveData.totalGold}`, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '24px',
        color: '#fde68a',
      })
      .setOrigin(0.5);

    this.statusText = this.add
      .text(centerX, 132, 'Buy permanent upgrades and clear quests for long-term progress.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '17px',
        color: '#93c5fd',
      })
      .setOrigin(0.5);

    const leftPanel = this.add.rectangle(360, 380, 560, 470, 0x111827, 0.94).setOrigin(0.5);
    leftPanel.setStrokeStyle(2, 0x334155, 1);
    const rightPanel = this.add.rectangle(930, 380, 500, 470, 0x111827, 0.94).setOrigin(0.5);
    rightPanel.setStrokeStyle(2, 0x334155, 1);

    this.add
      .text(130, 178, 'Permanent Upgrades', {
        fontFamily: 'Georgia, serif',
        fontSize: '30px',
        color: '#f8fafc',
      })
      .setOrigin(0, 0.5);

    this.add
      .text(710, 178, 'Quest Board', {
        fontFamily: 'Georgia, serif',
        fontSize: '30px',
        color: '#f8fafc',
      })
      .setOrigin(0, 0.5);

    let upgradeY = 240;
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
      button.on('pointerout', () => {
        button.setStyle({ color: '#fef3c7', backgroundColor: '#1f2937' });
      });
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
      upgradeY += 96;
    }

    let questY = 218;
    for (const quest of QUESTS) {
      const questText = this.add.text(700, questY, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '16px',
        color: '#cbd5e1',
        wordWrap: { width: 430 },
      });
      questText.setOrigin(0, 0);
      this.questTexts.push(questText);
      questY += 82;
    }

    const backButton = this.add
      .text(centerX, GAME_HEIGHT - 46, 'Back to Menu', {
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
      this.statusText.setText('Not enough gold or upgrade already at max rank.');
      return;
    }

    this.saveData = nextSave;
    this.statusText.setText(`${upgrade.title} purchased. Future runs are stronger.`);
    this.refreshView();
  }

  private refreshView(): void {
    this.saveData = loadGameSave();
    this.goldText.setText(`Total Gold: ${this.saveData.totalGold}`);

    for (let index = 0; index < PERMANENT_UPGRADES.length; index += 1) {
      const upgrade = PERMANENT_UPGRADES[index];
      const level = getPermanentUpgradeLevel(this.saveData, upgrade.id);
      const cost = getPermanentUpgradeCost(upgrade, level);
      const unlocked = isPermanentUpgradeUnlocked(this.saveData, upgrade.id);
      const canBuy = canPurchasePermanentUpgrade(this.saveData, upgrade);

      this.upgradeButtons[index].setText(`${upgrade.title} ${level}/${upgrade.maxLevel}`);
      this.upgradeDetails[index].setText(
        `${upgrade.description}\nState: ${!unlocked ? 'Quest Locked' : level >= upgrade.maxLevel ? 'Maxed' : canBuy ? 'Available' : 'Need More Gold'}\nCost: ${level >= upgrade.maxLevel ? 'MAX' : cost}`,
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
        return `Unlock hero: ${quest.reward.heroId}`;
      case 'unlockPermanentUpgrade':
        return `Unlock meta upgrade: ${quest.reward.upgradeId}`;
    }
  }
}
