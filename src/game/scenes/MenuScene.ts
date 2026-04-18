import Phaser from 'phaser';
import { primeAudioContext } from '../audio/audioCuePlayer';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { ENEMY_ARCHETYPES } from '../data/enemies';
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
  private focusedHeroId: HeroDefinition['id'] = 'runner';
  private codexHeroName!: Phaser.GameObjects.Text;
  private codexHeroBody!: Phaser.GameObjects.Text;
  private codexWeaponBadge!: Phaser.GameObjects.Text;
  private codexWeaponName!: Phaser.GameObjects.Text;
  private codexWeaponBody!: Phaser.GameObjects.Text;
  private codexThreatTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.saveData = loadGameSave();
    this.heroActionButtons = [];
    this.heroInfoTexts = [];
    this.heroPanels = [];
    this.codexThreatTexts = [];

    const centerX = GAME_WIDTH / 2;
    const contentTop = 136;

    this.cameras.main.setBackgroundColor('#0b1020');
    this.add.rectangle(centerX, 62, 1160, 92, 0x0f172a, 0.94).setStrokeStyle(2, 0x223247, 0.88);
    this.add.rectangle(400, 428, 724, 512, 0x101827, 0.97).setStrokeStyle(2, 0x2a3b55, 0.92);
    this.add.rectangle(996, 428, 332, 512, 0x111827, 0.97).setStrokeStyle(2, 0x2a3b55, 0.92);

    this.add
      .text(102, 44, 'JANGAN LARI', {
        fontFamily: 'Georgia, serif',
        fontSize: '42px',
        color: '#f8fafc',
      })
      .setOrigin(0, 0.5);

    this.add
      .text(104, 82, 'Pick a runner, then enter the arena.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '17px',
        color: '#9fb8d3',
      })
      .setOrigin(0, 0.5);

    this.goldText = this.add
      .text(GAME_WIDTH - 106, 48, `Gold ${this.saveData.totalGold}`, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '24px',
        color: '#fde68a',
        backgroundColor: '#172036',
        padding: { left: 14, right: 14, top: 8, bottom: 8 },
      })
      .setOrigin(1, 0.5);

    this.startButton = this.createMenuButton(560, 82, 'Start Run', () => this.startRun());
    this.metaButton = this.createMenuButton(726, 82, 'Meta', () => this.openMeta());

    this.add
      .text(86, 162, 'Roster', {
        fontFamily: 'Georgia, serif',
        fontSize: '28px',
        color: '#f8fafc',
      })
      .setOrigin(0, 0.5);

    this.add
      .text(86, 194, 'Hero cards stay short. Full notes live in the codex panel.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '15px',
        color: '#8ea6c1',
      })
      .setOrigin(0, 0.5);

    this.add
      .text(848, 162, 'Field Codex', {
        fontFamily: 'Georgia, serif',
        fontSize: '28px',
        color: '#f8fafc',
      })
      .setOrigin(0, 0.5);

    this.add
      .text(848, 194, 'Focused notes for the selected runner, weapon, and threats.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '15px',
        color: '#8ea6c1',
      })
      .setOrigin(0, 0.5);

    const panelWidth = 332;
    const panelHeight = 172;
    const panelSpacing = 20;
    const firstPanelX = 86 + panelWidth / 2;
    const panelYStart = contentTop + 124;

    for (let index = 0; index < HERO_LIST.length; index += 1) {
      const hero = HERO_LIST[index];
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = firstPanelX + column * (panelWidth + panelSpacing);
      const y = panelYStart + row * (panelHeight + 22);
      const panel = this.add.rectangle(x, y, panelWidth, panelHeight, 0x182233, 0.98).setOrigin(0.5);
      panel.setStrokeStyle(2, 0x334155, 1);
      panel.setInteractive({ useHandCursor: true });
      panel.on('pointerover', () => this.setFocusedHero(hero.id));
      panel.on('pointerdown', () => this.setFocusedHero(hero.id));

      this.createHeroPreview(hero, x - 116, y - 8);

      this.add
        .text(x - 44, y - 54, hero.name, {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '26px',
          color: '#f8fafc',
        })
        .setOrigin(0, 0.5);

      const infoText = this.add
        .text(x - 44, y - 8, '', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '14px',
          color: '#cbd5e1',
          wordWrap: { width: 184 },
          lineSpacing: 4,
        })
        .setOrigin(0, 0.5);

      const actionButton = this.createMenuButton(x + 72, y + 52, '', () => this.handleHeroAction(hero));
      actionButton.setFontSize('18px');
      actionButton.setPadding(14, 8, 14, 8);
      actionButton.on('pointerover', () => this.setFocusedHero(hero.id));

      this.heroPanels.push(panel);
      this.heroInfoTexts.push(infoText);
      this.heroActionButtons.push(actionButton);
    }

    this.codexHeroName = this.add
      .text(870, 262, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '30px',
        color: '#f8fafc',
      })
      .setOrigin(0, 0.5);

    this.codexHeroBody = this.add
      .text(870, 300, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '15px',
        color: '#cbd5e1',
        wordWrap: { width: 252 },
        lineSpacing: 5,
      })
      .setOrigin(0, 0);

    this.add.rectangle(996, 420, 266, 108, 0x172033, 0.96).setStrokeStyle(1, 0x334155, 0.9);
    this.codexWeaponBadge = this.add
      .text(882, 388, '--', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '16px',
        color: '#eff6ff',
        backgroundColor: '#475569',
        padding: { left: 10, right: 10, top: 8, bottom: 8 },
      })
      .setOrigin(0.5);
    this.codexWeaponName = this.add
      .text(926, 382, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '22px',
        color: '#f8fafc',
      })
      .setOrigin(0, 0.5);
    this.codexWeaponBody = this.add
      .text(882, 416, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '14px',
        color: '#cbd5e1',
        wordWrap: { width: 232 },
        lineSpacing: 4,
      })
      .setOrigin(0, 0);

    this.add
      .text(870, 500, 'Threats', {
        fontFamily: 'Georgia, serif',
        fontSize: '24px',
        color: '#f8fafc',
      })
      .setOrigin(0, 0.5);

    for (let index = 0; index < 3; index += 1) {
      this.add.rectangle(996, 560 + index * 74, 266, 60, 0x172033, 0.96).setStrokeStyle(1, 0x334155, 0.88);
      const threatText = this.add
        .text(872, 544 + index * 74, '', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '14px',
          color: '#cbd5e1',
          wordWrap: { width: 240 },
          lineSpacing: 3,
        })
        .setOrigin(0, 0);
      this.codexThreatTexts.push(threatText);
    }

    this.add.rectangle(centerX, GAME_HEIGHT - 46, 896, 44, 0x101b2f, 0.92).setStrokeStyle(1, 0x334155, 0.9);
    this.statusText = this.add
      .text(centerX, GAME_HEIGHT - 46, 'Select a hero, then start the run.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '17px',
        color: '#93c5fd',
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, GAME_HEIGHT - 18, 'Enter or Space starts. M opens meta.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '15px',
        color: '#94a3b8',
      })
      .setOrigin(0.5);

    this.input.keyboard?.on('keydown-ENTER', this.handleStartShortcut, this);
    this.input.keyboard?.on('keydown-SPACE', this.handleStartShortcut, this);
    this.input.keyboard?.on('keydown-M', this.handleMetaShortcut, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);

    this.focusedHeroId = this.saveData.selectedHero;
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
    this.goldText.setText(`Gold ${this.saveData.totalGold}`);

    for (let index = 0; index < HERO_LIST.length; index += 1) {
      const hero = HERO_LIST[index];
      const unlocked = isHeroUnlocked(this.saveData, hero.id);
      const selected = this.saveData.selectedHero === hero.id;
      const button = this.heroActionButtons[index];
      const infoText = this.heroInfoTexts[index];
      const panel = this.heroPanels[index];

      infoText.setText(this.buildHeroSummary(hero, unlocked, selected));
      const focused = hero.id === this.focusedHeroId;
      panel.setStrokeStyle(
        selected ? 3 : focused ? 2 : 2,
        selected ? 0xfde68a : focused ? 0x93c5fd : hero.appearance.strokeColor,
        selected ? 1 : focused ? 0.95 : 0.8,
      );
      panel.setFillStyle(selected ? 0x1b2a3e : focused ? 0x18253a : 0x182233, 0.98);

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

    this.refreshCodexView();
  }

  private buildHeroSummary(hero: HeroDefinition, unlocked: boolean, selected: boolean): string {
    const startingWeapon = WEAPON_DEFINITIONS[hero.startingWeaponId];
    const traits: string[] = [`${startingWeapon.shortLabel} ${startingWeapon.name}`];

    if (hero.maxHealthBonus > 0) {
      traits.push(`+${hero.maxHealthBonus} HP`);
    } else if (hero.moveSpeedBonus > 0) {
      traits.push(`+${hero.moveSpeedBonus} speed`);
    } else if (hero.pickupRangeBonus > 0) {
      traits.push(`+${hero.pickupRangeBonus} pickup`);
    } else if (hero.startingDamageBonus > 0) {
      traits.push(`+${hero.startingDamageBonus} damage`);
    } else if (hero.fireCooldownReductionMs > 0) {
      traits.push(`-${hero.fireCooldownReductionMs} ms cooldown`);
    }

    if (selected) {
      traits.push('Ready');
    } else if (!unlocked) {
      traits.push(`Locked ${hero.unlockCost ?? 0}g`);
    } else {
      traits.push('Available');
    }

    return traits.join('\n');
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

  private setFocusedHero(heroId: HeroDefinition['id']): void {
    if (this.focusedHeroId === heroId) {
      return;
    }

    this.focusedHeroId = heroId;
    this.refreshHeroView();
  }

  private refreshCodexView(): void {
    const hero = HERO_LIST.find((entry) => entry.id === this.focusedHeroId) ?? HERO_LIST[0];
    const weapon = WEAPON_DEFINITIONS[hero.startingWeaponId];
    const threatEntries = [
      {
        enemy: ENEMY_ARCHETYPES.skimmer,
        note: 'Strafes wide. Keep a clean lane before closing in.',
      },
      {
        enemy: ENEMY_ARCHETYPES.dreadnought,
        note: 'Telegraphs a line charge. Sidestep before release.',
      },
      {
        enemy: ENEMY_ARCHETYPES.behemoth,
        note: 'Controls space with a shockwave ring near the end of the run.',
      },
    ];

    this.codexHeroName.setText(hero.name);
    this.codexHeroBody.setText(`${hero.description}\n\n${hero.passiveLabel}`);
    this.codexWeaponBadge.setText(weapon.shortLabel);
    this.codexWeaponBadge.setBackgroundColor(`#${weapon.projectileColor.toString(16).padStart(6, '0')}`);
    this.codexWeaponName.setText(weapon.name);
    this.codexWeaponBody.setText(weapon.codexSummary);

    for (let index = 0; index < this.codexThreatTexts.length; index += 1) {
      const entry = threatEntries[index];
      this.codexThreatTexts[index].setText(`${entry.enemy.name}\n${entry.note}`);
      this.codexThreatTexts[index].setColor(index === 0 ? '#bae6fd' : index === 1 ? '#fbcfe8' : '#fecaca');
    }
  }

  private handleShutdown(): void {
    this.input.keyboard?.off('keydown-ENTER', this.handleStartShortcut, this);
    this.input.keyboard?.off('keydown-SPACE', this.handleStartShortcut, this);
    this.input.keyboard?.off('keydown-M', this.handleMetaShortcut, this);
  }
}
