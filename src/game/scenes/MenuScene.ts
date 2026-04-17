import Phaser from 'phaser';
import { primeAudioContext } from '../audio/audioCuePlayer';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { HERO_LIST, type HeroDefinition } from '../data/heroes';
import { WEAPON_DEFINITIONS } from '../data/weapons';
import { loadGameSave, type GameSaveData } from '../save/saveData';
import { isHeroUnlocked, selectHero, unlockHero } from '../save/saveHeroes';

export class MenuScene extends Phaser.Scene {
  private saveData!: GameSaveData;
  private goldText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private heroActionButtons: Phaser.GameObjects.Text[] = [];
  private heroInfoTexts: Phaser.GameObjects.Text[] = [];
  private heroPanels: Phaser.GameObjects.Rectangle[] = [];
  private startButton!: Phaser.GameObjects.Text;
  private metaButton!: Phaser.GameObjects.Text;

  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.saveData = loadGameSave();
    this.heroActionButtons = [];
    this.heroInfoTexts = [];
    this.heroPanels = [];

    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    this.cameras.main.setBackgroundColor('#0b1020');
    this.add.rectangle(centerX, centerY, 1164, 688, 0x0f172a, 0.9).setStrokeStyle(2, 0x223247, 0.88);

    this.add
      .text(centerX, centerY - 302, 'JANGAN LARI', {
        fontFamily: 'Georgia, serif',
        fontSize: '54px',
        color: '#f8fafc',
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY - 248, 'Choose a hero, enter the arena, and survive the swarm.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '21px',
        color: '#93c5fd',
      })
      .setOrigin(0.5);

    this.goldText = this.add
      .text(centerX, centerY - 204, `Gold Bank: ${this.saveData.totalGold}`, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '25px',
        color: '#fde68a',
      })
      .setOrigin(0.5);

    this.startButton = this.createMenuButton(centerX - 162, centerY - 138, 'Start Run', () => this.startRun());
    this.metaButton = this.createMenuButton(centerX + 162, centerY - 138, 'Meta Progress', () => this.openMeta());

    this.add.rectangle(centerX, centerY - 92, 920, 2, 0x223247, 0.9);

    this.add
      .text(centerX, centerY - 48, 'Hero Selection', {
        fontFamily: 'Georgia, serif',
        fontSize: '33px',
        color: '#f8fafc',
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY - 12, 'Each hero begins with a different weapon, passive, and combat silhouette.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '17px',
        color: '#cbd5e1',
      })
      .setOrigin(0.5);

    const panelWidth = 250;
    const panelHeight = 300;
    const panelSpacing = 18;
    const firstPanelX = centerX - ((panelWidth * HERO_LIST.length + panelSpacing * (HERO_LIST.length - 1)) / 2) + panelWidth / 2;
    const panelY = centerY + 100;

    for (let index = 0; index < HERO_LIST.length; index += 1) {
      const hero = HERO_LIST[index];
      const x = firstPanelX + index * (panelWidth + panelSpacing);
      const panel = this.add.rectangle(x, panelY, panelWidth, panelHeight, 0x111827, 0.965).setOrigin(0.5);
      panel.setStrokeStyle(2, 0x334155, 1);

      this.createHeroPreview(hero, x, centerY + 6);

      this.add
        .text(x, centerY + 48, hero.name, {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '24px',
          color: '#f8fafc',
        })
        .setOrigin(0.5);

      const infoText = this.add
        .text(x, centerY + 132, '', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '14px',
          color: '#cbd5e1',
          align: 'center',
          wordWrap: { width: 214 },
          lineSpacing: 3,
        })
        .setOrigin(0.5);

      const actionButton = this.createMenuButton(x, centerY + 226, '', () => this.handleHeroAction(hero));
      actionButton.setFontSize('20px');
      actionButton.setPadding(14, 8, 14, 8);

      this.heroPanels.push(panel);
      this.heroInfoTexts.push(infoText);
      this.heroActionButtons.push(actionButton);
    }

    this.add.rectangle(centerX, centerY + 276, 900, 46, 0x101b2f, 0.92).setStrokeStyle(1, 0x334155, 0.9);
    this.statusText = this.add
      .text(centerX, centerY + 276, 'Select a hero, then enter the run.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '18px',
        color: '#93c5fd',
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY + 314, 'Enter or Space starts a run. M opens meta progression.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '17px',
        color: '#cbd5e1',
      })
      .setOrigin(0.5);

    this.input.keyboard?.on('keydown-ENTER', this.handleStartShortcut, this);
    this.input.keyboard?.on('keydown-SPACE', this.handleStartShortcut, this);
    this.input.keyboard?.on('keydown-M', this.handleMetaShortcut, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);

    this.refreshHeroView();
  }

  private startRun(): void {
    primeAudioContext();

    if (this.scene.isActive('UIScene')) {
      this.scene.stop('UIScene');
    }

    if (this.scene.isActive('RunScene')) {
      this.scene.stop('RunScene');
    }

    this.scene.start('RunScene');
    this.scene.launch('UIScene');
  }

  private openMeta(): void {
    this.scene.start('MetaScene');
  }

  private handleStartShortcut(): void {
    this.startButton.emit('pointerdown');
  }

  private handleMetaShortcut(): void {
    this.metaButton.emit('pointerdown');
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
    this.goldText.setText(`Gold Bank: ${this.saveData.totalGold}`);

    for (let index = 0; index < HERO_LIST.length; index += 1) {
      const hero = HERO_LIST[index];
      const unlocked = isHeroUnlocked(this.saveData, hero.id);
      const selected = this.saveData.selectedHero === hero.id;
      const button = this.heroActionButtons[index];
      const infoText = this.heroInfoTexts[index];
      const panel = this.heroPanels[index];

      infoText.setText(this.buildHeroSummary(hero, unlocked, selected));
      panel.setStrokeStyle(selected ? 3 : 2, selected ? 0xfde68a : hero.appearance.strokeColor, selected ? 1 : 0.8);
      panel.setFillStyle(selected ? 0x172033 : 0x111827, 0.965);

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
    const startingWeapon = WEAPON_DEFINITIONS[hero.startingWeaponId];
    const lines = [hero.description, '', `Starts with: ${startingWeapon.name}`, hero.passiveLabel];

    if (hero.maxHealthBonus !== 0) {
      lines.push(`+${hero.maxHealthBonus} max HP`);
    }

    if (hero.moveSpeedBonus !== 0) {
      lines.push(`+${hero.moveSpeedBonus} move speed`);
    }

    if (hero.pickupRangeBonus !== 0) {
      lines.push(`+${hero.pickupRangeBonus} pickup range`);
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

  private createHeroPreview(hero: HeroDefinition, x: number, y: number): void {
    const { appearance } = hero;

    const aura = this.add.circle(x, y, appearance.size * 0.92, appearance.auraColor, 0.18);
    aura.setBlendMode(Phaser.BlendModes.ADD);

    const body = this.add.rectangle(x, y, appearance.size, appearance.size, appearance.bodyColor);
    body.setAngle(appearance.angle);
    body.setStrokeStyle(3, appearance.strokeColor, 0.95);

    if (appearance.markerShape === 'dot') {
      this.add.circle(x, y - appearance.size * 0.24, Math.max(4, appearance.size * 0.14), appearance.markerColor, 0.95);
      return;
    }

    this.add.rectangle(x, y - appearance.size * 0.24, appearance.size * 0.5, 7, appearance.markerColor, 0.95);
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

    button.on('pointerdown', () => onClick());
    return button;
  }

  private handleShutdown(): void {
    this.input.keyboard?.off('keydown-ENTER', this.handleStartShortcut, this);
    this.input.keyboard?.off('keydown-SPACE', this.handleStartShortcut, this);
    this.input.keyboard?.off('keydown-M', this.handleMetaShortcut, this);
  }
}
