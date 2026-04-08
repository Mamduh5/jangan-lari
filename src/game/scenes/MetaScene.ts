import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import {
  PERMANENT_UPGRADES,
  getPermanentUpgradeCost,
  type PermanentUpgradeDefinition,
} from '../data/permanentUpgrades';
import { loadGameSave, type GameSaveData } from '../save/saveData';
import {
  canPurchasePermanentUpgrade,
  getPermanentUpgradeLevel,
  purchasePermanentUpgrade,
} from '../save/saveUpgrades';

export class MetaScene extends Phaser.Scene {
  private saveData!: GameSaveData;
  private goldText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private upgradeButtons: Phaser.GameObjects.Text[] = [];
  private upgradeDetails: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('MetaScene');
  }

  create(): void {
    this.saveData = loadGameSave();
    const centerX = GAME_WIDTH / 2;

    this.add
      .text(centerX, 72, 'Meta Upgrades', {
        fontFamily: 'Georgia, serif',
        fontSize: '42px',
        color: '#f8fafc',
      })
      .setOrigin(0.5);

    this.goldText = this.add
      .text(centerX, 120, `Total Gold: ${this.saveData.totalGold}`, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '24px',
        color: '#fde68a',
      })
      .setOrigin(0.5);

    this.statusText = this.add
      .text(centerX, 158, 'Buy permanent upgrades for future runs.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '18px',
        color: '#93c5fd',
      })
      .setOrigin(0.5);

    const panel = this.add.rectangle(centerX, 405, 1020, 470, 0x111827, 0.94).setOrigin(0.5);
    panel.setStrokeStyle(2, 0x334155, 1);

    let currentY = 250;
    for (const upgrade of PERMANENT_UPGRADES) {
      const button = this.add
        .text(210, currentY, upgrade.title, {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '24px',
          color: '#fef3c7',
          backgroundColor: '#1f2937',
          padding: { left: 18, right: 18, top: 10, bottom: 10 },
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

      const detail = this.add.text(470, currentY, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '18px',
        color: '#cbd5e1',
        wordWrap: { width: 500 },
      });
      detail.setOrigin(0, 0.5);

      this.upgradeButtons.push(button);
      this.upgradeDetails.push(detail);
      currentY += 95;
    }

    const backButton = this.add
      .text(centerX, GAME_HEIGHT - 64, 'Back to Menu', {
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
    this.goldText.setText(`Total Gold: ${this.saveData.totalGold}`);

    for (let index = 0; index < PERMANENT_UPGRADES.length; index += 1) {
      const upgrade = PERMANENT_UPGRADES[index];
      const level = getPermanentUpgradeLevel(this.saveData, upgrade.id);
      const cost = getPermanentUpgradeCost(upgrade, level);
      const canBuy = canPurchasePermanentUpgrade(this.saveData, upgrade);

      this.upgradeButtons[index].setText(`${upgrade.title} ${level}/${upgrade.maxLevel}`);
      this.upgradeDetails[index].setText(
        `${upgrade.description}\nCost: ${level >= upgrade.maxLevel ? 'MAX' : cost}  |  ${canBuy ? 'Available' : 'Locked'}`,
      );
    }
  }
}
