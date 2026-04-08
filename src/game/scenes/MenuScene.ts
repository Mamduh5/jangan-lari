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
  private heroPanels: Phaser.GameObjects.Rectangle[] = [];

  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.saveData = loadGameSave();
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    this.cameras.main.setBackgroundColor('#0b1020');

    this.add.rectangle(centerX, centerY, 1160, 680, 0x0f172a, 0.86).setStrokeStyle(2, 0x223247, 0.8);

    this.add
      .text(centerX, centerY - 300, 'JANGAN LARI', {
        fontFamily: 'Georgia, serif',
        fontSize: '52px',
        color: '#f8fafc',
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY - 250, 'Survive the arena, stack weapons, and cash out stronger runs.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '20px',
        color: '#93c5fd',
      })
      .setOrigin(0.5);

    this.goldText = this.add
      .text(centerX, centerY - 204, `Total Gold: ${this.saveData.totalGold}`, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '24px',
        color: '#fde68a',
      })
      .setOrigin(0.5);

    const startLabel = this.createMenuButton(centerX - 150, centerY - 138, 'Start Run', () => {
      this.scene.start('RunScene');
      this.scene.launch('UIScene');
    });

    const metaLabel = this.createMenuButton(centerX + 150, centerY - 138, 'Meta Progress', () => {
      this.scene.start('MetaScene');
    });

    this.add
      .text(centerX, centerY - 64, 'Choose Hero', {
        fontFamily: 'Georgia, serif',
        fontSize: '32px',
        color: '#f8fafc',
      })
      .setOrigin(0.5);

    this.statusText = this.add
      .text(centerX, centerY + 252, 'Select a hero, then enter the run.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '18px',
        color: '#93c5fd',
      })
      .setOrigin(0.5);

    const panelPositions = [centerX - 260, centerX + 260];

    for (let index = 0; index < HERO_LIST.length; index += 1) {
      const hero = HERO_LIST[index];
      const x = panelPositions[index];
      const panel = this.add.rectangle(x, centerY + 84, 390, 260, 0x111827, 0.95).setOrigin(0.5);
      panel.setStrokeStyle(2, 0x334155, 1);

      this.add
        .text(x, centerY - 2, hero.name, {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '29px',
          color: '#f8fafc',
        })
        .setOrigin(0.5);

      const infoText = this.add
        .text(x, centerY + 60, '', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '17px',
          color: '#cbd5e1',
          align: 'center',
          wordWrap: { width: 326 },
        })
        .setOrigin(0.5);

      const actionButton = this.createMenuButton(x, centerY + 176, '', () => this.handleHeroAction(hero));
      actionButton.setFontSize('24px');
      actionButton.setPadding(18, 10, 18, 10);

      this.heroPanels.push(panel);
      this.heroInfoTexts.push(infoText);
      this.heroActionButtons.push(actionButton);
    }

    this.add
      .text(centerX, centerY + 292, 'Enter or Space starts a run. M opens meta progression.', {
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
      const panel = this.heroPanels[index];

      infoText.setText(this.buildHeroSummary(hero, unlocked, selected));
      panel.setStrokeStyle(selected ? 3 : 2, selected ? 0xfde68a : unlocked ? 0x334155 : 0x3b2f4a, 1);
      panel.setFillStyle(selected ? 0x172033 : 0x111827, 0.95);

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

  private buildHeroSummary(hero: HeroDefinition, unlocked: boolean, selected: boolean): string {
    const lines = [hero.description, ''];

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

    lines.push('');

    if (selected) {
      lines.push('Status: Selected for next run');
    } else if (unlocked) {
      lines.push('Status: Unlocked');
    } else {
      lines.push(`Status: Locked (${hero.unlockCost ?? 0} gold)`);
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
