import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { HEROES } from '../data/heroes';
import {
  PERMANENT_UPGRADES,
  getPermanentUpgradeCost,
  type PermanentUpgradeDefinition,
} from '../data/permanentUpgrades';
import { QUESTS, type QuestDefinition } from '../data/quests';
import { loadGameSave, type GameSaveData } from '../save/saveData';
import {
  canPurchasePermanentUpgrade,
  getPermanentUpgradeLevel,
  isPermanentUpgradeUnlocked,
  purchasePermanentUpgrade,
} from '../save/saveUpgrades';
import { DOODLE_COLORS, DOODLE_FONTS, DOODLE_HEX } from '../ui/doodleTheme';
import { drawMenuTopPillChrome } from '../ui/menuCodexArtwork';
import {
  drawMetaBackButtonChrome,
  drawMetaProgressionBoardChrome,
  drawMetaUpgradeRowChrome,
  drawQuestBoardRowChrome,
  type MetaUpgradeVisualState,
} from '../ui/metaProgressionArtwork';
import { getUiButtonAssetSlot, getUiIconAssetSlot, shouldUseVisualAsset } from '../utils/assetResolver';

const UPGRADE_ROW_CX = 486;
const UPGRADE_ROW_W = 594;
const UPGRADE_ROW_H = 66;
const UPGRADE_BTN_CX = UPGRADE_ROW_CX + UPGRADE_ROW_W / 2 - 74;
const UPGRADE_BTN_W = 126;
const UPGRADE_BTN_H = 46;

const QUEST_ROW_CX = 1118;
const QUEST_ROW_W = 576;
const QUEST_ROW_H = 66;

const BACK_BTN_CX = 306;
const BACK_BTN_CY = 632;
const BACK_BTN_W = 236;
const BACK_BTN_H = 48;

export class MetaScene extends Phaser.Scene {
  private saveData!: GameSaveData;
  private boardGraphics: Phaser.GameObjects.Graphics | null = null;
  private upgradeGraphics: Phaser.GameObjects.Graphics | null = null;
  private questGraphics: Phaser.GameObjects.Graphics | null = null;
  private backButtonGraphics: Phaser.GameObjects.Graphics | null = null;
  private goldIconImage: Phaser.GameObjects.Image | null = null;
  private goldText: Phaser.GameObjects.Text | null = null;
  private statusText: Phaser.GameObjects.Text | null = null;
  private headerText: Phaser.GameObjects.Text | null = null;
  private upgradeTitles: Phaser.GameObjects.Text[] = [];
  private upgradeDescs: Phaser.GameObjects.Text[] = [];
  private upgradeStates: Phaser.GameObjects.Text[] = [];
  private upgradeButtons: Phaser.GameObjects.Text[] = [];
  private upgradeHoverIndex: number | null = null;
  private questTitles: Phaser.GameObjects.Text[] = [];
  private questDescs: Phaser.GameObjects.Text[] = [];
  private questRewards: Phaser.GameObjects.Text[] = [];
  private questProgressTexts: Phaser.GameObjects.Text[] = [];
  private questStamps: Phaser.GameObjects.Text[] = [];
  private backButton: Phaser.GameObjects.Text | null = null;
  private backButtonIcon: Phaser.GameObjects.Image | null = null;
  private backButtonHovered = false;
  private isExitingToMenu = false;

  private readonly handleExitToMenu = (): void => {
    if (this.isExitingToMenu) {
      return;
    }
    this.isExitingToMenu = true;
    this.scene.start('MenuScene');
  };

  constructor() {
    super('MetaScene');
  }

  create(): void {
    this.saveData = loadGameSave();
    this.isExitingToMenu = false;
    this.boardGraphics = null;
    this.upgradeGraphics = null;
    this.questGraphics = null;
    this.backButtonGraphics = null;
    this.goldIconImage = null;
    this.goldText = null;
    this.statusText = null;
    this.headerText = null;
    this.upgradeTitles = [];
    this.upgradeDescs = [];
    this.upgradeStates = [];
    this.upgradeButtons = [];
    this.upgradeHoverIndex = null;
    this.questTitles = [];
    this.questDescs = [];
    this.questRewards = [];
    this.questProgressTexts = [];
    this.questStamps = [];
    this.backButton = null;
    this.backButtonIcon = null;
    this.backButtonHovered = false;

    this.cameras.main.setBackgroundColor('#21183c');

    this.boardGraphics = this.add.graphics().setDepth(0);
    drawMetaProgressionBoardChrome(this.boardGraphics, GAME_WIDTH, GAME_HEIGHT);

    // Header Title & Top-Right Gold Pill
    this.add
      .text(246, 82, 'META PROGRESSION', {
        fontFamily: DOODLE_FONTS.display,
        fontSize: '36px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
        letterSpacing: 0.6,
      })
      .setOrigin(0, 0.5)
      .setDepth(2);

    this.headerText = this.add
      .text(246, 118, '', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '15px',
        fontStyle: 'bold',
        color: DOODLE_HEX.inkMuted,
      })
      .setOrigin(0, 0.5)
      .setDepth(2);

    this.statusText = this.add
      .text(468, 118, 'Spend gold on permanent upgrades. Run quests unlock rewards.', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '14px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
        wordWrap: { width: 716 },
      })
      .setOrigin(0, 0.5)
      .setDepth(2);

    const goldSlot = getUiIconAssetSlot('gold');
    const hasGoldTexture = shouldUseVisualAsset(this, 'uiIcons', goldSlot);
    drawMenuTopPillChrome(
      this.boardGraphics,
      1312,
      92,
      192,
      46,
      DOODLE_COLORS.paperGold,
      'gold',
      3115,
      hasGoldTexture,
    );
    if (hasGoldTexture) {
      this.goldIconImage = this.add.image(1242, 92, goldSlot.key).setDisplaySize(22, 22).setDepth(2);
    }
    this.goldText = this.add
      .text(1332, 92, `GOLD ${this.saveData.totalGold}`, {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '17px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
      })
      .setOrigin(0.5)
      .setDepth(2);

    // Left Section Header: PERMANENT UPGRADES
    this.add
      .text(UPGRADE_ROW_CX, 168, 'PERMANENT UPGRADES', {
        fontFamily: DOODLE_FONTS.display,
        fontSize: '18px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
        letterSpacing: 0.7,
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.add
      .text(UPGRADE_ROW_CX, 195, 'Lasting bonuses active on every run.', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '12.5px',
        fontStyle: 'bold',
        color: DOODLE_HEX.inkMuted,
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.upgradeGraphics = this.add.graphics().setDepth(1);
    for (let index = 0; index < PERMANENT_UPGRADES.length; index += 1) {
      const upgrade = PERMANENT_UPGRADES[index];
      const rowCy = 242 + index * 74;

      const titleText = this.add
        .text(256, rowCy - 14, upgrade.title, {
          fontFamily: DOODLE_FONTS.display,
          fontSize: '16.5px',
          fontStyle: 'bold',
          color: DOODLE_HEX.ink,
        })
        .setOrigin(0, 0.5)
        .setDepth(3);

      const descText = this.add
        .text(256, rowCy + 10, upgrade.description, {
          fontFamily: DOODLE_FONTS.body,
          fontSize: '12.5px',
          color: DOODLE_HEX.inkMuted,
          wordWrap: { width: 256 },
          lineSpacing: 2,
        })
        .setOrigin(0, 0.5)
        .setDepth(3);

      const stateText = this.add
        .text(574, rowCy + 14, '', {
          fontFamily: DOODLE_FONTS.body,
          fontSize: '11.5px',
          fontStyle: 'bold',
          color: DOODLE_HEX.ink,
        })
        .setOrigin(0.5)
        .setDepth(3);

      const actionBtn = this.add
        .text(UPGRADE_BTN_CX, rowCy, '', {
          fontFamily: DOODLE_FONTS.body,
          fontSize: '14px',
          fontStyle: 'bold',
          color: DOODLE_HEX.ink,
          align: 'center',
          fixedWidth: UPGRADE_BTN_W,
          fixedHeight: UPGRADE_BTN_H,
          padding: { top: 13 },
        })
        .setOrigin(0.5)
        .setDepth(3)
        .setInteractive({ useHandCursor: true });

      actionBtn.on('pointerover', () => {
        if (this.isExitingToMenu) {
          return;
        }
        this.upgradeHoverIndex = index;
        this.renderUpgradeRows();
      });
      actionBtn.on('pointerout', () => {
        if (this.upgradeHoverIndex === index) {
          this.upgradeHoverIndex = null;
        }
        this.renderUpgradeRows();
      });
      actionBtn.on('pointerdown', () => this.handlePurchase(upgrade));

      this.upgradeTitles.push(titleText);
      this.upgradeDescs.push(descText);
      this.upgradeStates.push(stateText);
      this.upgradeButtons.push(actionBtn);
    }

    // Right Section Header: QUEST BOARD
    this.add
      .text(QUEST_ROW_CX, 168, 'QUEST BOARD', {
        fontFamily: DOODLE_FONTS.display,
        fontSize: '18px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
        letterSpacing: 0.7,
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.add
      .text(QUEST_ROW_CX, 195, 'Run progress unlocks new upgrades and bonus gold.', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '12.5px',
        fontStyle: 'bold',
        color: DOODLE_HEX.inkMuted,
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.questGraphics = this.add.graphics().setDepth(1);
    for (let index = 0; index < QUESTS.length; index += 1) {
      const quest = QUESTS[index];
      const rowCy = 242 + index * 74;

      const qTitle = this.add
        .text(888, rowCy - 15, quest.title, {
          fontFamily: DOODLE_FONTS.display,
          fontSize: '15.5px',
          fontStyle: 'bold',
          color: DOODLE_HEX.ink,
        })
        .setOrigin(0, 0.5)
        .setDepth(3);

      const qReward = this.add
        .text(1320, rowCy - 15, this.getQuestRewardLabel(quest), {
          fontFamily: DOODLE_FONTS.body,
          fontSize: '11px',
          fontStyle: 'bold',
          color: DOODLE_HEX.ink,
        })
        .setOrigin(0.5)
        .setDepth(3);

      const qDesc = this.add
        .text(888, rowCy + 2, quest.description, {
          fontFamily: DOODLE_FONTS.body,
          fontSize: '12.5px',
          color: DOODLE_HEX.inkMuted,
        })
        .setOrigin(0, 0.5)
        .setDepth(3);

      const qStamp = this.add
        .text(1396, rowCy + 2, '', {
          fontFamily: DOODLE_FONTS.body,
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#15803d',
        })
        .setOrigin(1, 0.5)
        .setDepth(3)
        .setVisible(false);

      const qProgress = this.add
        .text(1396, rowCy + 19, '', {
          fontFamily: DOODLE_FONTS.body,
          fontSize: '12.5px',
          fontStyle: 'bold',
          color: DOODLE_HEX.ink,
        })
        .setOrigin(1, 0.5)
        .setDepth(3);

      this.questTitles.push(qTitle);
      this.questDescs.push(qDesc);
      this.questRewards.push(qReward);
      this.questStamps.push(qStamp);
      this.questProgressTexts.push(qProgress);
    }

    // Bottom Navigation: BACK TO MENU
    this.backButtonGraphics = this.add.graphics().setDepth(2);
    this.backButtonIcon = this.createCloseButtonIcon(BACK_BTN_CX - BACK_BTN_W / 2 + 28, BACK_BTN_CY);
    if (this.backButtonIcon) {
      this.backButtonIcon.setDepth(4).setAlpha(1);
    }
    this.renderBackButtonChrome();

    const backButton = this.add
      .text(BACK_BTN_CX, BACK_BTN_CY, 'BACK TO MENU', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '18px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
        align: 'center',
        fixedWidth: BACK_BTN_W,
        fixedHeight: BACK_BTN_H,
        padding: { left: 26, top: 13 },
      })
      .setOrigin(0.5)
      .setDepth(3)
      .setInteractive({ useHandCursor: true });

    backButton.on('pointerdown', this.handleExitToMenu);
    backButton.on('pointerover', () => {
      if (this.isExitingToMenu) {
        return;
      }
      this.backButtonHovered = true;
      this.renderBackButtonChrome();
    });
    backButton.on('pointerout', () => {
      this.backButtonHovered = false;
      this.renderBackButtonChrome();
    });
    this.backButton = backButton;

    this.add
      .text(468, BACK_BTN_CY, 'Press ESC to return  •  Upgrades apply automatically on your next run.', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '13.5px',
        fontStyle: 'bold',
        color: DOODLE_HEX.inkMuted,
      })
      .setOrigin(0, 0.5)
      .setDepth(2);

    this.input.keyboard?.on('keydown-ESC', this.handleExitToMenu, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    this.refreshView();
  }

  private renderBackButtonChrome(): void {
    if (!this.isObjectLive(this.backButtonGraphics)) {
      return;
    }
    drawMetaBackButtonChrome(
      this.backButtonGraphics!,
      BACK_BTN_CX,
      BACK_BTN_CY,
      BACK_BTN_W,
      BACK_BTN_H,
      this.backButtonHovered,
      Boolean(this.backButtonIcon),
    );
  }

  private handlePurchase(upgrade: PermanentUpgradeDefinition): void {
    if (!this.isObjectLive(this.statusText)) {
      return;
    }

    if (!isPermanentUpgradeUnlocked(this.saveData, upgrade.id)) {
      const gatingQuest = QUESTS.find(
        (q) => q.reward.type === 'unlockPermanentUpgrade' && q.reward.upgradeId === upgrade.id,
      );
      this.statusText!.setText(
        gatingQuest
          ? `${upgrade.title} unlocks after completing Quest: ${gatingQuest.title}.`
          : 'That upgrade is still locked behind a quest reward.',
      );
      this.statusText!.setColor(DOODLE_HEX.inkMuted);
      return;
    }

    const level = this.getClampedUpgradeLevel(upgrade);
    if (level >= upgrade.maxLevel) {
      this.statusText!.setText(`${upgrade.title} is already at max rank.`);
      this.statusText!.setColor('#15803d');
      return;
    }

    const nextSave = purchasePermanentUpgrade(this.saveData, upgrade);
    if (!nextSave) {
      const cost = getPermanentUpgradeCost(upgrade, level);
      this.statusText!.setText(`Need ${cost} gold to upgrade ${upgrade.title}.`);
      this.statusText!.setColor(DOODLE_HEX.danger);
      return;
    }

    this.saveData = nextSave;
    const nextRank = this.getClampedUpgradeLevel(upgrade);
    this.statusText!.setText(
      `${upgrade.title} upgraded to Rank ${nextRank}/${upgrade.maxLevel}.`,
    );
    this.statusText!.setColor('#15803d');
    this.refreshView();
  }

  private isObjectLive(obj: { scene?: unknown } | null | undefined): boolean {
    return Boolean(obj && (!('scene' in obj) || obj.scene));
  }

  private getClampedUpgradeLevel(upgrade: PermanentUpgradeDefinition): number {
    const raw = getPermanentUpgradeLevel(this.saveData, upgrade.id);
    if (!Number.isFinite(raw)) {
      return 0;
    }
    return Math.max(0, Math.min(upgrade.maxLevel, Math.floor(raw)));
  }

  private getUpgradeVisualState(upgrade: PermanentUpgradeDefinition): {
    level: number;
    cost: number;
    visualState: MetaUpgradeVisualState;
  } {
    const level = this.getClampedUpgradeLevel(upgrade);
    const cost = getPermanentUpgradeCost(upgrade, level);
    const unlocked = isPermanentUpgradeUnlocked(this.saveData, upgrade.id);
    const maxed = level >= upgrade.maxLevel;
    const canBuy = canPurchasePermanentUpgrade(this.saveData, upgrade);
    const visualState: MetaUpgradeVisualState = !unlocked
      ? 'locked'
      : maxed
        ? 'maxed'
        : canBuy
          ? 'available'
          : 'unaffordable';
    return { level, cost, visualState };
  }

  private refreshView(): void {
    if (!this.isObjectLive(this.goldText) || !this.isObjectLive(this.headerText)) {
      return;
    }

    this.saveData = loadGameSave();
    this.goldText!.setText(`GOLD ${this.saveData.totalGold}`);
    const heroName = (HEROES[this.saveData.selectedHero] ?? HEROES.runner).name;
    this.headerText!.setText(`Selected Hero: ${heroName}`);

    this.renderUpgradeRows();
    this.renderQuestRows();
  }

  private renderUpgradeRows(): void {
    if (!this.isObjectLive(this.upgradeGraphics)) {
      return;
    }
    const g = this.upgradeGraphics!;
    g.clear();

    for (let index = 0; index < PERMANENT_UPGRADES.length; index += 1) {
      const upgrade = PERMANENT_UPGRADES[index];
      const titleText = this.upgradeTitles[index];
      const descText = this.upgradeDescs[index];
      const stateText = this.upgradeStates[index];
      const button = this.upgradeButtons[index];
      if (
        !this.isObjectLive(titleText) ||
        !this.isObjectLive(descText) ||
        !this.isObjectLive(stateText) ||
        !this.isObjectLive(button)
      ) {
        continue;
      }

      const rowCy = 242 + index * 74;
      const { level, cost, visualState } = this.getUpgradeVisualState(upgrade);
      const hovered = this.upgradeHoverIndex === index;

      drawMetaUpgradeRowChrome(
        g,
        UPGRADE_ROW_CX,
        rowCy,
        UPGRADE_ROW_W,
        UPGRADE_ROW_H,
        upgrade.id,
        level,
        upgrade.maxLevel,
        visualState,
        hovered,
        index,
      );

      titleText.setColor(visualState === 'locked' ? DOODLE_HEX.inkMuted : DOODLE_HEX.ink);
      descText.setColor(DOODLE_HEX.inkMuted);

      switch (visualState) {
        case 'available':
          stateText.setText(`LV ${level}/${upgrade.maxLevel} · AVAILABLE`);
          stateText.setColor('#15803d');
          button.setText(`BUY ${cost}g`);
          button.setColor(DOODLE_HEX.ink);
          break;
        case 'unaffordable':
          stateText.setText(`LV ${level}/${upgrade.maxLevel} · NEED GOLD`);
          stateText.setColor('#b45309');
          button.setText(`NEED ${cost}g`);
          button.setColor(DOODLE_HEX.inkMuted);
          break;
        case 'locked':
          stateText.setText('QUEST LOCKED');
          stateText.setColor(DOODLE_HEX.inkMuted);
          button.setText('  LOCKED');
          button.setColor(DOODLE_HEX.inkMuted);
          break;
        case 'maxed':
          stateText.setText(`LV ${level}/${upgrade.maxLevel} · MAXED`);
          stateText.setColor('#15803d');
          button.setText('  MAXED');
          button.setColor('#14532d');
          break;
      }
    }
  }

  private renderQuestRows(): void {
    if (!this.isObjectLive(this.questGraphics)) {
      return;
    }
    const g = this.questGraphics!;
    g.clear();

    for (let index = 0; index < QUESTS.length; index += 1) {
      const quest = QUESTS[index];
      const qTitle = this.questTitles[index];
      const qDesc = this.questDescs[index];
      const qReward = this.questRewards[index];
      const qStamp = this.questStamps[index];
      const qProgress = this.questProgressTexts[index];
      if (
        !this.isObjectLive(qTitle) ||
        !this.isObjectLive(qDesc) ||
        !this.isObjectLive(qReward) ||
        !this.isObjectLive(qStamp) ||
        !this.isObjectLive(qProgress)
      ) {
        continue;
      }

      const rowCy = 242 + index * 74;
      const completed = this.saveData.completedQuests.includes(quest.id);
      const rawStat = this.saveData.progressStats[quest.metric as keyof typeof this.saveData.progressStats] ?? 0;
      const numericVal = Number.isFinite(Number(rawStat)) ? Math.max(0, Number(rawStat)) : 0;
      const ratio = completed ? 1 : Math.min(1, numericVal / Math.max(1, quest.target));

      drawQuestBoardRowChrome(
        g,
        QUEST_ROW_CX,
        rowCy,
        QUEST_ROW_W,
        QUEST_ROW_H,
        ratio,
        completed,
        index,
      );

      qTitle.setColor(DOODLE_HEX.ink);
      qDesc.setColor(DOODLE_HEX.inkMuted);
      qReward.setText(completed ? 'COMPLETE' : this.getQuestRewardLabel(quest));
      qReward.setColor(completed ? '#14532d' : DOODLE_HEX.ink);
      qStamp.setVisible(completed);
      qStamp.setText(this.getCompletedQuestSummary(quest));
      qStamp.setColor('#15803d');
      qProgress.setText(this.getQuestProgress(quest.metric, quest.target));
      qProgress.setColor(completed ? '#15803d' : DOODLE_HEX.ink);
    }
  }

  private createCloseButtonIcon(x: number, y: number): Phaser.GameObjects.Image | null {
    const slot = getUiButtonAssetSlot('close');
    if (!shouldUseVisualAsset(this, 'uiButtons', slot)) {
      return null;
    }

    return this.add.image(x, y, slot.key).setDisplaySize(20, 20).setAlpha(0.78);
  }

  private handleShutdown(): void {
    this.input?.keyboard?.off('keydown-ESC', this.handleExitToMenu, this);
    this.isExitingToMenu = false;
    this.boardGraphics = null;
    this.upgradeGraphics = null;
    this.questGraphics = null;
    this.backButtonGraphics = null;
    this.goldIconImage = null;
    this.goldText = null;
    this.statusText = null;
    this.headerText = null;
    this.upgradeTitles = [];
    this.upgradeDescs = [];
    this.upgradeStates = [];
    this.upgradeButtons = [];
    this.upgradeHoverIndex = null;
    this.questTitles = [];
    this.questDescs = [];
    this.questRewards = [];
    this.questProgressTexts = [];
    this.questStamps = [];
    this.backButton = null;
    this.backButtonIcon = null;
    this.backButtonHovered = false;
  }

  private getQuestProgress(metric: string, target: number): string {
    const rawValue = this.saveData.progressStats[metric as keyof typeof this.saveData.progressStats] ?? 0;
    const value = Number.isFinite(Number(rawValue)) ? Math.max(0, Number(rawValue)) : 0;

    if (metric === 'totalSurvivalMs') {
      return `${Math.min(target, value) / 1000}s / ${target / 1000}s`;
    }

    return `${Math.min(target, value)} / ${target}`;
  }

  private getQuestRewardLabel(quest: QuestDefinition): string {
    switch (quest.reward.type) {
      case 'gold':
        return `+${quest.reward.amount} gold`;
      case 'unlockHero':
        return `Unlock: ${HEROES[quest.reward.heroId].name}`;
      case 'unlockPermanentUpgrade': {
        const rewardUpgradeId = quest.reward.upgradeId;
        const match = PERMANENT_UPGRADES.find((u) => u.id === rewardUpgradeId);
        return `Unlock: ${match ? match.title : rewardUpgradeId}`;
      }
    }
  }

  private getCompletedQuestSummary(quest: QuestDefinition): string {
    switch (quest.reward.type) {
      case 'gold':
        return `Earned: +${quest.reward.amount} gold`;
      case 'unlockHero':
        return `Earned: ${HEROES[quest.reward.heroId].name}`;
      case 'unlockPermanentUpgrade': {
        const rewardUpgradeId = quest.reward.upgradeId;
        const match = PERMANENT_UPGRADES.find((u) => u.id === rewardUpgradeId);
        return `Earned: ${match ? match.title : rewardUpgradeId}`;
      }
    }
  }
}
