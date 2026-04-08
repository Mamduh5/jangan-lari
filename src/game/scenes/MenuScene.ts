import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { HERO_LIST, type HeroDefinition } from '../data/heroes';
import { loadGameSave, type GameSaveData } from '../save/saveData';
import { isHeroUnlocked, selectHero, unlockHero } from '../save/saveHeroes';

export class MenuScene extends Phaser.Scene {
  private saveData!: GameSaveData;
  private goldText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private heroActionButtons: Phaser.GameObjects.Text[] = [];
  private heroInfoTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.saveData = loadGameSave();
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    this.add
      .text(centerX, centerY - 290, 'JANGAN LARI', {
        fontFamily: 'Georgia, serif',
        fontSize: '48px',
        color: '#f8fafc',
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY - 238, 'Phase 7 Hero Selection', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '20px',
        color: '#93c5fd',
      })
      .setOrigin(0.5);

    this.goldText = this.add
      .text(centerX, centerY - 194, `Total Gold: ${this.saveData.totalGold}`, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '24px',
        color: '#fde68a',
      })
      .setOrigin(0.5);

    const startLabel = this.createMenuButton(centerX - 140, centerY - 128, 'Start Run', () => {
      this.scene.start('RunScene');
      this.scene.launch('UIScene');
    });

    const metaLabel = this.createMenuButton(centerX + 140, centerY - 128, 'Meta Upgrades', () => {
      this.scene.start('MetaScene');
    });

    this.statusText = this.add
      .text(centerX, centerY + 244, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '18px',
        color: '#93c5fd',
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY - 54, 'Choose Hero', {
        fontFamily: 'Georgia, serif',
        fontSize: '32px',
        color: '#f8fafc',
      })
      .setOrigin(0.5);

    const panelPositions = [centerX - 260, centerX + 260];

    for (let index = 0; index < HERO_LIST.length; index += 1) {
      const hero = HERO_LIST[index];
      const x = panelPositions[index];
      const panel = this.add.rectangle(x, centerY + 78, 380, 240, 0x111827, 0.95).setOrigin(0.5);
      panel.setStrokeStyle(2, 0x334155, 1);

      this.add
        .text(x, centerY - 6, hero.name, {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '28px',
          color: '#f8fafc',
        })
        .setOrigin(0.5);

      const infoText = this.add
        .text(x, centerY + 52, this.buildHeroSummary(hero), {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '17px',
          color: '#cbd5e1',
          align: 'center',
          wordWrap: { width: 320 },
        })
        .setOrigin(0.5);

      const actionButton = this.createMenuButton(x, centerY + 162, '', () => this.handleHeroAction(hero));
      actionButton.setFontSize('24px');
      actionButton.setPadding(18, 10, 18, 10);

      this.heroInfoTexts.push(infoText);
      this.heroActionButtons.push(actionButton);
    }

    this.add
      .text(centerX, centerY + 284, 'Runner is unlocked by default. Vanguard unlocks with gold.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '17px',
        color: '#cbd5e1',
      })
      .setOrigin(0.5);

    this.input.keyboard?.once('keydown-ENTER', () => startLabel.emit('pointerdown'));
    this.input.keyboard?.once('keydown-SPACE', () => startLabel.emit('pointerdown'));
    this.input.keyboard?.once('keydown-M', () => metaLabel.emit('pointerdown'));

    this.refreshHeroView();
  }

  private handleHeroAction(hero: HeroDefinition): void {
    if (isHeroUnlocked(this.saveData, hero.id)) {
      const nextSave = selectHero(this.saveData, hero.id);
      if (!nextSave) {
        return;
      }

      this.saveData = nextSave;
      this.statusText.setText(`${hero.name} selected for the next run.`);
      this.refreshHeroView();
      return;
    }

    const nextSave = unlockHero(this.saveData, hero);
    if (!nextSave) {
      this.statusText.setText(`Need ${hero.unlockCost ?? 0} gold to unlock ${hero.name}.`);
      return;
    }

    this.saveData = nextSave;
    this.statusText.setText(`${hero.name} unlocked and selected.`);
    this.refreshHeroView();
  }

  private refreshHeroView(): void {
    this.goldText.setText(`Total Gold: ${this.saveData.totalGold}`);

    for (let index = 0; index < HERO_LIST.length; index += 1) {
      const hero = HERO_LIST[index];
      const unlocked = isHeroUnlocked(this.saveData, hero.id);
      const selected = this.saveData.selectedHero === hero.id;
      const button = this.heroActionButtons[index];
      const infoText = this.heroInfoTexts[index];

      infoText.setText(this.buildHeroSummary(hero));

      if (selected) {
        button.setText('Selected');
        button.setStyle({ color: '#111827', backgroundColor: '#fde68a' });
        continue;
      }

      if (unlocked) {
        button.setText('Select');
        button.setStyle({ color: '#fef3c7', backgroundColor: '#1f2937' });
        continue;
      }

      button.setText(`Unlock ${hero.unlockCost ?? 0}g`);
      button.setStyle({ color: '#bfdbfe', backgroundColor: '#1e3a5f' });
    }
  }

  private buildHeroSummary(hero: HeroDefinition): string {
    const lines = [hero.description];

    if (hero.maxHealthBonus !== 0) {
      lines.push(`+${hero.maxHealthBonus} max HP`);
    }

    if (hero.moveSpeedBonus !== 0) {
      lines.push(`+${hero.moveSpeedBonus} move speed`);
    }

    if (hero.startingDamageBonus !== 0) {
      lines.push(`+${hero.startingDamageBonus} starting damage`);
    }

    if (hero.fireCooldownReductionMs !== 0) {
      lines.push(`-${hero.fireCooldownReductionMs} ms fire cooldown`);
    }

    if (hero.unlockCost) {
      lines.push(`Unlock Cost: ${hero.unlockCost} gold`);
    } else {
      lines.push('Available from the start');
    }

    return lines.join('\n');
  }

  private createMenuButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Text {
    const button = this.add
      .text(x, y, label, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '28px',
        color: '#fef3c7',
        backgroundColor: '#1f2937',
        padding: { left: 24, right: 24, top: 12, bottom: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    button.on('pointerover', () => {
      if (button.text === 'Selected') {
        return;
      }

      button.setStyle({ color: '#ffffff', backgroundColor: '#374151' });
    });

    button.on('pointerout', () => {
      button.setStyle({ color: '#fef3c7', backgroundColor: '#1f2937' });

      if (this.heroActionButtons.includes(button)) {
        this.refreshHeroView();
      }
    });

    button.on('pointerdown', onClick);
    return button;
  }
}

