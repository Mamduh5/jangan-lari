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
  private codexButton!: Phaser.GameObjects.Text;
  private codexCloseButton!: Phaser.GameObjects.Text;
  private codexOverlay!: Phaser.GameObjects.Container;
  private codexOverlayVisible = false;
  private focusedHeroId: HeroDefinition['id'] = 'runner';
  private codexHeroName!: Phaser.GameObjects.Text;
  private codexHeroBody!: Phaser.GameObjects.Text;
  private codexHeroMeta!: Phaser.GameObjects.Text;
  private codexWeaponBadge!: Phaser.GameObjects.Text;
  private codexWeaponName!: Phaser.GameObjects.Text;
  private codexWeaponBody!: Phaser.GameObjects.Text;
  private codexWeaponStats!: Phaser.GameObjects.Text;
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
    const rosterWidth = 1056;
    const rosterLeft = centerX - rosterWidth / 2 + 42;

    this.cameras.main.setBackgroundColor('#0b1020');
    this.add.rectangle(centerX, 62, 1160, 92, 0x0f172a, 0.94).setStrokeStyle(2, 0x223247, 0.88);
    this.add.rectangle(centerX, 428, rosterWidth, 512, 0x101827, 0.97).setStrokeStyle(2, 0x2a3b55, 0.92);

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
      .text(GAME_WIDTH - 72, 48, `Gold ${this.saveData.totalGold}`, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '24px',
        color: '#fde68a',
        backgroundColor: '#172036',
        padding: { left: 14, right: 14, top: 8, bottom: 8 },
      })
      .setOrigin(1, 0.5);

    this.startButton = this.createMenuButton(560, 82, 'Start Run', () => this.startRun());
    this.metaButton = this.createMenuButton(726, 82, 'Meta', () => this.openMeta());
    this.codexButton = this.createMenuButton(892, 82, 'Codex', () => this.openCodex());
    this.codexButton.setFontSize('24px');
    this.codexButton.setPadding(20, 10, 20, 10);

    this.add
      .text(rosterLeft, 162, 'Roster', {
        fontFamily: 'Georgia, serif',
        fontSize: '28px',
        color: '#f8fafc',
      })
      .setOrigin(0, 0.5);

    this.add
      .text(rosterLeft, 194, 'Hero cards stay short. Open Codex for deeper notes.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '15px',
        color: '#8ea6c1',
      })
      .setOrigin(0, 0.5);

    const panelWidth = 332;
    const panelHeight = 172;
    const panelSpacing = 20;
    const firstPanelX = centerX - panelWidth / 2 - panelSpacing / 2;
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

    const codexBackdrop = this.add
      .rectangle(centerX, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x020617, 0.74)
      .setInteractive({ useHandCursor: true });
    codexBackdrop.on('pointerdown', () => this.closeCodex());

    const codexPanel = this.add
      .rectangle(centerX, GAME_HEIGHT / 2, 900, 564, 0x111827, 0.99)
      .setStrokeStyle(2, 0x334155, 0.95);
    const codexHeader = this.add.rectangle(centerX, 118, 900, 86, 0x0f172a, 0.96).setStrokeStyle(0, 0, 0);
    const codexRail = this.add.rectangle(238, 380, 156, 426, 0x0c1424, 0.92).setStrokeStyle(1, 0x223247, 0.95);
    const codexContentFrame = this.add.rectangle(688, 392, 646, 454, 0x101b2f, 0.38).setStrokeStyle(1, 0x223247, 0.8);
    const codexProfilePanel = this.add.rectangle(470, 274, 304, 190, 0x172033, 0.98).setStrokeStyle(1, 0x334155, 0.92);
    const codexWeaponPanel = this.add.rectangle(788, 274, 328, 190, 0x172033, 0.98).setStrokeStyle(1, 0x334155, 0.92);
    const codexThreatStrip = this.add.rectangle(630, 472, 598, 44, 0x0f172a, 0.86).setStrokeStyle(1, 0x223247, 0.9);

    const codexEyebrow = this.add
      .text(270, 88, 'ARCHIVE / FIELD BRIEF', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '14px',
        color: '#93c5fd',
        letterSpacing: 1.8,
      })
      .setOrigin(0, 0.5);

    const codexTitle = this.add
      .text(270, 122, 'Field Codex', {
        fontFamily: 'Georgia, serif',
        fontSize: '36px',
        color: '#f8fafc',
      })
      .setOrigin(0, 0.5);

    const codexSubtitle = this.add
      .text(270, 154, 'Selected runner briefings now. Weapon and threat archives can grow into this layout later.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '15px',
        color: '#94a3b8',
      })
      .setOrigin(0, 0.5);

    const codexRailTitle = this.add
      .text(188, 194, 'Browse', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '15px',
        color: '#94a3b8',
        letterSpacing: 1.2,
      })
      .setOrigin(0, 0.5);
    const codexCategories = [
      { label: 'Runner', active: true },
      { label: 'Weapon', active: true },
      { label: 'Threats', active: true },
      { label: 'Archive', active: false },
    ];
    const codexCategoryObjects: Phaser.GameObjects.GameObject[] = [];
    for (let index = 0; index < codexCategories.length; index += 1) {
      const category = codexCategories[index];
      const y = 236 + index * 62;
      const capsule = this.add.rectangle(238, y, 112, 40, category.active ? 0x1e3a5f : 0x172033, 0.96).setStrokeStyle(
        1,
        category.active ? 0x60a5fa : 0x334155,
        0.95,
      );
      const label = this.add
        .text(238, y, category.label, {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '16px',
          color: category.active ? '#eff6ff' : '#94a3b8',
        })
        .setOrigin(0.5);
      codexCategoryObjects.push(capsule, label);
    }
    const codexRailHint = this.add
      .text(186, 446, 'This pass keeps one clean runner briefing view, with room for more codex categories later.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '13px',
        color: '#7c93ae',
        wordWrap: { width: 104 },
        lineSpacing: 5,
      })
      .setOrigin(0, 0);

    this.codexCloseButton = this.createMenuButton(972, 118, 'Back', () => this.closeCodex());
    this.codexCloseButton.setFontSize('20px');
    this.codexCloseButton.setPadding(18, 10, 18, 10);

    const codexProfileLabel = this.add
      .text(334, 202, 'RUNNER PROFILE', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '14px',
        color: '#93c5fd',
        letterSpacing: 1.8,
      })
      .setOrigin(0, 0.5);

    this.codexHeroName = this.add
      .text(334, 244, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '30px',
        color: '#f8fafc',
      })
      .setOrigin(0, 0.5);

    this.codexHeroBody = this.add
      .text(334, 284, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '15px',
        color: '#cbd5e1',
        wordWrap: { width: 248 },
        lineSpacing: 6,
      })
      .setOrigin(0, 0);

    this.codexHeroMeta = this.add
      .text(334, 384, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '14px',
        color: '#93c5fd',
        wordWrap: { width: 248 },
        lineSpacing: 5,
      })
      .setOrigin(0, 0);

    const codexWeaponLabel = this.add
      .text(636, 202, 'STARTER WEAPON', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '14px',
        color: '#93c5fd',
        letterSpacing: 1.8,
      })
      .setOrigin(0, 0.5);
    this.codexWeaponBadge = this.add
      .text(664, 248, '--', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '16px',
        color: '#eff6ff',
        backgroundColor: '#475569',
        padding: { left: 10, right: 10, top: 8, bottom: 8 },
      })
      .setOrigin(0.5);
    this.codexWeaponName = this.add
      .text(708, 242, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '24px',
        color: '#f8fafc',
      })
      .setOrigin(0, 0.5);
    this.codexWeaponBody = this.add
      .text(636, 280, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '14px',
        color: '#cbd5e1',
        wordWrap: { width: 274 },
        lineSpacing: 5,
      })
      .setOrigin(0, 0);

    this.codexWeaponStats = this.add
      .text(636, 358, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '13px',
        color: '#93c5fd',
        wordWrap: { width: 274 },
        lineSpacing: 4,
      })
      .setOrigin(0, 0);

    const codexThreatTitle = this.add
      .text(332, 472, 'Threat Brief', {
        fontFamily: 'Georgia, serif',
        fontSize: '24px',
        color: '#f8fafc',
      })
      .setOrigin(0, 0.5);
    const codexThreatSubtitle = this.add
      .text(476, 472, 'Three encounter notes to keep the selected runner alive.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '14px',
        color: '#94a3b8',
      })
      .setOrigin(0, 0.5);

    const codexThreatFrames: Phaser.GameObjects.Rectangle[] = [];
    for (let index = 0; index < 3; index += 1) {
      const threatFrame = this.add
        .rectangle(630, 534 + index * 74, 596, 58, 0x172033, 0.98)
        .setStrokeStyle(1, 0x334155, 0.88);
      const threatText = this.add
        .text(352, 516 + index * 74, '', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '14px',
          color: '#cbd5e1',
          wordWrap: { width: 524 },
          lineSpacing: 4,
        })
        .setOrigin(0, 0);
      this.codexThreatTexts.push(threatText);
      codexThreatFrames.push(threatFrame);
    }

    this.codexOverlay = this.add.container(0, 0, [
      codexBackdrop,
      codexPanel,
      codexHeader,
      codexRail,
      codexContentFrame,
      codexThreatStrip,
      codexProfilePanel,
      codexWeaponPanel,
      codexEyebrow,
      codexTitle,
      codexSubtitle,
      codexRailTitle,
      ...codexCategoryObjects,
      codexRailHint,
      this.codexCloseButton,
      codexProfileLabel,
      this.codexHeroName,
      this.codexHeroBody,
      this.codexHeroMeta,
      codexWeaponLabel,
      this.codexWeaponBadge,
      this.codexWeaponName,
      this.codexWeaponBody,
      this.codexWeaponStats,
      codexThreatTitle,
      codexThreatSubtitle,
      ...codexThreatFrames,
      ...this.codexThreatTexts,
    ]);
    this.codexOverlay.setDepth(30);
    this.codexOverlay.setVisible(false);

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
      .text(centerX, GAME_HEIGHT - 18, 'Enter or Space starts. M opens meta. Codex opens from the menu.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '15px',
        color: '#94a3b8',
      })
      .setOrigin(0.5);

    this.input.keyboard?.on('keydown-ENTER', this.handleStartShortcut, this);
    this.input.keyboard?.on('keydown-SPACE', this.handleStartShortcut, this);
    this.input.keyboard?.on('keydown-M', this.handleMetaShortcut, this);
    this.input.keyboard?.on('keydown-ESC', this.handleEscapeShortcut, this);
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

  private openCodex(): void {
    this.codexOverlayVisible = true;
    this.refreshCodexView();
    this.codexOverlay.setVisible(true);
  }

  private closeCodex(): void {
    this.codexOverlayVisible = false;
    this.codexOverlay.setVisible(false);
  }

  private handleStartShortcut(): void {
    if (this.codexOverlayVisible) {
      return;
    }

    this.startButton.emit('pointerdown');
  }

  private handleMetaShortcut(): void {
    if (this.codexOverlayVisible) {
      return;
    }

    this.metaButton.emit('pointerdown');
  }

  private handleEscapeShortcut(): void {
    if (!this.codexOverlayVisible) {
      return;
    }

    this.closeCodex();
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
        label: 'Scout',
        note: 'Strafes wide. Keep a clean lane before closing in.',
      },
      {
        enemy: ENEMY_ARCHETYPES.dreadnought,
        label: 'Miniboss',
        note: 'Telegraphs a line charge. Sidestep before release.',
      },
      {
        enemy: ENEMY_ARCHETYPES.behemoth,
        label: 'Boss',
        note: 'Controls space with a shockwave ring near the end of the run.',
      },
    ];

    this.codexHeroName.setText(hero.name);
    this.codexHeroBody.setText(hero.description);
    this.codexHeroMeta.setText(`Passive  ${hero.passiveLabel}\nLoadout  ${this.getHeroLoadoutSummary(hero, weapon)}`);
    this.codexWeaponBadge.setText(weapon.shortLabel);
    this.codexWeaponBadge.setBackgroundColor(`#${weapon.projectileColor.toString(16).padStart(6, '0')}`);
    this.codexWeaponName.setText(weapon.name);
    this.codexWeaponBody.setText(weapon.codexSummary);
    this.codexWeaponStats.setText(this.getWeaponStatSummary(weapon));

    for (let index = 0; index < this.codexThreatTexts.length; index += 1) {
      const entry = threatEntries[index];
      this.codexThreatTexts[index].setText(`${entry.label}  ${entry.enemy.name}\n${entry.note}`);
      this.codexThreatTexts[index].setColor(index === 0 ? '#bae6fd' : index === 1 ? '#fbcfe8' : '#fecaca');
    }
  }

  private getHeroLoadoutSummary(hero: HeroDefinition, weapon: (typeof WEAPON_DEFINITIONS)[keyof typeof WEAPON_DEFINITIONS]): string {
    const traits: string[] = [weapon.name];

    if (hero.maxHealthBonus > 0) {
      traits.push(`+${hero.maxHealthBonus} HP`);
    }

    if (hero.moveSpeedBonus > 0) {
      traits.push(`+${hero.moveSpeedBonus} speed`);
    }

    if (hero.pickupRangeBonus > 0) {
      traits.push(`+${hero.pickupRangeBonus} pickup`);
    }

    if (hero.startingDamageBonus > 0) {
      traits.push(`+${hero.startingDamageBonus} damage`);
    }

    if (hero.fireCooldownReductionMs > 0) {
      traits.push(`-${hero.fireCooldownReductionMs} ms cadence`);
    }

    return traits.join('  •  ');
  }

  private getWeaponStatSummary(weapon: (typeof WEAPON_DEFINITIONS)[keyof typeof WEAPON_DEFINITIONS]): string {
    const traits = [`Damage ${weapon.damage}`, `Cadence ${weapon.fireCooldownMs} ms`, `Reach ${weapon.range}`];

    if (weapon.burstCount) {
      traits.push(`Burst ${weapon.burstCount}`);
    }

    if (weapon.pierceCount) {
      traits.push(`Pierce ${weapon.pierceCount}`);
    }

    if (weapon.radialCount) {
      traits.push(`Radial ${weapon.radialCount}`);
    }

    if (weapon.explosionRadius) {
      traits.push(`Blast ${weapon.explosionRadius}`);
    }

    return traits.join('  •  ');
  }

  private handleShutdown(): void {
    this.input.keyboard?.off('keydown-ENTER', this.handleStartShortcut, this);
    this.input.keyboard?.off('keydown-SPACE', this.handleStartShortcut, this);
    this.input.keyboard?.off('keydown-M', this.handleMetaShortcut, this);
    this.input.keyboard?.off('keydown-ESC', this.handleEscapeShortcut, this);
  }
}
