import Phaser from 'phaser';
import { primeAudioContext } from '../audio/audioCuePlayer';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { ENEMY_ARCHETYPES } from '../data/enemies';
import { HERO_LIST, type HeroDefinition } from '../data/heroes';
import { WEAPON_DEFINITIONS } from '../data/weapons';
import { loadGameSave, type GameSaveData } from '../save/saveData';
import { isHeroUnlocked, selectHero, unlockHero } from '../save/saveHeroes';

type CodexSection = 'runner' | 'weapon' | 'threats';

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
  private activeCodexSection: CodexSection = 'runner';
  private codexSectionFrames: Phaser.GameObjects.Rectangle[] = [];
  private codexSectionTexts: Phaser.GameObjects.Text[] = [];
  private codexSectionEyebrow!: Phaser.GameObjects.Text;
  private codexSectionTitle!: Phaser.GameObjects.Text;
  private codexSectionSubtitle!: Phaser.GameObjects.Text;
  private codexRunnerContainer!: Phaser.GameObjects.Container;
  private codexWeaponContainer!: Phaser.GameObjects.Container;
  private codexThreatContainer!: Phaser.GameObjects.Container;
  private focusedHeroId: HeroDefinition['id'] = 'runner';
  private codexHeroBadge!: Phaser.GameObjects.Text;
  private codexHeroBody!: Phaser.GameObjects.Text;
  private codexHeroMeta!: Phaser.GameObjects.Text;
  private codexWeaponBadge!: Phaser.GameObjects.Text;
  private codexWeaponBody!: Phaser.GameObjects.Text;
  private codexWeaponStats!: Phaser.GameObjects.Text;
  private codexThreatTitleTexts: Phaser.GameObjects.Text[] = [];
  private codexThreatBodyTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.saveData = loadGameSave();
    this.heroActionButtons = [];
    this.heroInfoTexts = [];
    this.heroPanels = [];
    this.codexSectionFrames = [];
    this.codexSectionTexts = [];
    this.codexThreatTitleTexts = [];
    this.codexThreatBodyTexts = [];

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
      .rectangle(centerX, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x020617, 0.9)
      .setInteractive({ useHandCursor: true });
    codexBackdrop.on('pointerdown', () => this.closeCodex());

    const codexPanel = this.add
      .rectangle(centerX, GAME_HEIGHT / 2, 1128, 632, 0x0b1220, 0.995)
      .setStrokeStyle(2, 0x334155, 0.95);
    const codexHeader = this.add.rectangle(centerX, 98, 1128, 96, 0x0f172a, 0.98).setStrokeStyle(0, 0, 0);
    const codexRail = this.add.rectangle(220, 410, 228, 504, 0x0e1728, 0.94).setStrokeStyle(0, 0, 0);
    const codexDivider = this.add.rectangle(336, 410, 2, 504, 0x223247, 0.92);
    const codexContentShade = this.add.rectangle(792, 410, 736, 504, 0x0d1626, 0.4).setStrokeStyle(0, 0, 0);

    const codexEyebrow = this.add
      .text(166, 66, 'FIELD ARCHIVE', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '14px',
        color: '#93c5fd',
        letterSpacing: 1.8,
      })
      .setOrigin(0, 0.5);

    const codexTitle = this.add
      .text(164, 98, 'Field Codex', {
        fontFamily: 'Georgia, serif',
        fontSize: '36px',
        color: '#f8fafc',
      })
      .setOrigin(0, 0.5);

    const codexSubtitle = this.add
      .text(164, 130, 'Archive briefings for the focused runner. Choose one track and read it cleanly.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '15px',
        color: '#94a3b8',
      })
      .setOrigin(0, 0.5);

    const codexRailTitle = this.add
      .text(152, 182, 'Sections', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '14px',
        color: '#94a3b8',
        letterSpacing: 1.2,
      })
      .setOrigin(0, 0.5);
    const codexSections: Array<{ id: CodexSection; label: string; note: string }> = [
      { id: 'runner', label: 'Runner', note: 'Hero identity and passive' },
      { id: 'weapon', label: 'Weapon', note: 'Starter loadout briefing' },
      { id: 'threats', label: 'Threats', note: 'Known encounter notes' },
    ];
    const codexCategoryObjects: Phaser.GameObjects.GameObject[] = [];
    for (let index = 0; index < codexSections.length; index += 1) {
      const section = codexSections[index];
      const y = 246 + index * 92;
      const frame = this.add
        .rectangle(220, y, 168, 72, 0x132033, 0.78)
        .setStrokeStyle(1, 0x223247, 0.86)
        .setInteractive({ useHandCursor: true });
      const title = this.add
        .text(164, y - 12, section.label, {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '20px',
          color: '#e2e8f0',
        })
        .setOrigin(0, 0.5)
        .setInteractive({ useHandCursor: true });
      const note = this.add
        .text(164, y + 14, section.note, {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '12px',
          color: '#7c93ae',
          wordWrap: { width: 112 },
        })
        .setOrigin(0, 0.5)
        .setInteractive({ useHandCursor: true });

      frame.on('pointerdown', () => this.setActiveCodexSection(section.id));
      frame.on('pointerover', () => {
        if (this.activeCodexSection !== section.id) {
          frame.setFillStyle(0x17283d, 0.9);
        }
      });
      frame.on('pointerout', () => this.refreshCodexSectionNav());
      title.on('pointerdown', () => this.setActiveCodexSection(section.id));
      note.on('pointerdown', () => this.setActiveCodexSection(section.id));

      this.codexSectionFrames.push(frame);
      this.codexSectionTexts.push(title);
      codexCategoryObjects.push(frame, title, note);
    }
    const codexRailHint = this.add
      .text(152, 504, 'One focused entry at a time. This layout can grow into fuller archives later without turning into another popup.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '13px',
        color: '#7c93ae',
        wordWrap: { width: 136 },
        lineSpacing: 5,
      })
      .setOrigin(0, 0);

    this.codexCloseButton = this.createMenuButton(1042, 96, 'Back', () => this.closeCodex());
    this.codexCloseButton.setFontSize('20px');
    this.codexCloseButton.setPadding(18, 10, 18, 10);

    this.codexSectionEyebrow = this.add
      .text(394, 186, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '14px',
        color: '#93c5fd',
        letterSpacing: 1.8,
      })
      .setOrigin(0, 0.5);
    this.codexSectionTitle = this.add
      .text(392, 226, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '36px',
        color: '#f8fafc',
      })
      .setOrigin(0, 0.5);
    this.codexSectionSubtitle = this.add
      .text(394, 264, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '16px',
        color: '#94a3b8',
        wordWrap: { width: 620 },
      })
      .setOrigin(0, 0.5);

    const runnerAccent = this.add.rectangle(444, 362, 110, 110, 0x132033, 0.92).setStrokeStyle(1, 0x223247, 0.9);
    this.codexHeroBadge = this.add
      .text(444, 362, '--', {
        fontFamily: 'Georgia, serif',
        fontSize: '38px',
        color: '#eff6ff',
        backgroundColor: '#334155',
        padding: { left: 24, right: 24, top: 20, bottom: 20 },
      })
      .setOrigin(0.5);
    this.codexHeroBody = this.add
      .text(536, 328, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '16px',
        color: '#cbd5e1',
        wordWrap: { width: 438 },
        lineSpacing: 6,
      })
      .setOrigin(0, 0);
    this.codexHeroMeta = this.add
      .text(536, 416, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '14px',
        color: '#93c5fd',
        wordWrap: { width: 438 },
        lineSpacing: 5,
      })
      .setOrigin(0, 0);
    this.codexRunnerContainer = this.add.container(0, 0, [runnerAccent, this.codexHeroBadge, this.codexHeroBody, this.codexHeroMeta]);

    const weaponAccent = this.add.rectangle(450, 350, 126, 126, 0x132033, 0.92).setStrokeStyle(1, 0x223247, 0.9);
    this.codexWeaponBadge = this.add
      .text(450, 350, '--', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '34px',
        color: '#eff6ff',
        backgroundColor: '#475569',
        padding: { left: 22, right: 22, top: 18, bottom: 18 },
      })
      .setOrigin(0.5);
    this.codexWeaponBody = this.add
      .text(548, 314, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '16px',
        color: '#cbd5e1',
        wordWrap: { width: 426 },
        lineSpacing: 5,
      })
      .setOrigin(0, 0);
    this.codexWeaponStats = this.add
      .text(548, 406, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '14px',
        color: '#93c5fd',
        wordWrap: { width: 426 },
        lineSpacing: 5,
      })
      .setOrigin(0, 0);
    this.codexWeaponContainer = this.add.container(0, 0, [weaponAccent, this.codexWeaponBadge, this.codexWeaponBody, this.codexWeaponStats]);

    const codexThreatObjects: Phaser.GameObjects.GameObject[] = [];
    for (let index = 0; index < 3; index += 1) {
      const threatFrame = this.add
        .rectangle(720, 314 + index * 110, 628, 88, 0x122033, 0.8)
        .setStrokeStyle(1, 0x223247, 0.86);
      const threatTitle = this.add
        .text(438, 282 + index * 110, '', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '22px',
          color: '#f8fafc',
        })
        .setOrigin(0, 0.5);
      const threatBody = this.add
        .text(438, 306 + index * 110, '', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '15px',
          color: '#cbd5e1',
          wordWrap: { width: 548 },
          lineSpacing: 4,
        })
        .setOrigin(0, 0);
      this.codexThreatTitleTexts.push(threatTitle);
      this.codexThreatBodyTexts.push(threatBody);
      codexThreatObjects.push(threatFrame, threatTitle, threatBody);
    }
    this.codexThreatContainer = this.add.container(0, 0, codexThreatObjects);

    this.codexOverlay = this.add.container(0, 0, [
      codexBackdrop,
      codexPanel,
      codexHeader,
      codexRail,
      codexDivider,
      codexContentShade,
      codexEyebrow,
      codexTitle,
      codexSubtitle,
      codexRailTitle,
      ...codexCategoryObjects,
      codexRailHint,
      this.codexCloseButton,
      this.codexSectionEyebrow,
      this.codexSectionTitle,
      this.codexSectionSubtitle,
      this.codexRunnerContainer,
      this.codexWeaponContainer,
      this.codexThreatContainer,
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
    this.activeCodexSection = 'runner';
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
        label: 'Scout Threat',
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

    this.refreshCodexSectionNav();

    this.codexHeroBadge.setText(this.getHeroBadgeLabel(hero));
    this.codexHeroBadge.setBackgroundColor(`#${hero.appearance.auraColor.toString(16).padStart(6, '0')}`);
    this.codexHeroBody.setText(hero.description);
    this.codexHeroMeta.setText(`Passive  ${hero.passiveLabel}\nLoadout  ${this.getHeroLoadoutSummary(hero, weapon)}`);
    this.codexWeaponBadge.setText(weapon.shortLabel);
    this.codexWeaponBadge.setBackgroundColor(`#${weapon.projectileColor.toString(16).padStart(6, '0')}`);
    this.codexWeaponBody.setText(`${weapon.name}\n\n${weapon.codexSummary}`);
    this.codexWeaponStats.setText(this.getWeaponStatSummary(weapon));

    for (let index = 0; index < this.codexThreatTitleTexts.length; index += 1) {
      const entry = threatEntries[index];
      this.codexThreatTitleTexts[index].setText(`${entry.label}  ${entry.enemy.name}`);
      this.codexThreatBodyTexts[index].setText(entry.note);
      this.codexThreatTitleTexts[index].setColor(index === 0 ? '#bae6fd' : index === 1 ? '#fbcfe8' : '#fecaca');
    }

    this.codexRunnerContainer.setVisible(this.activeCodexSection === 'runner');
    this.codexWeaponContainer.setVisible(this.activeCodexSection === 'weapon');
    this.codexThreatContainer.setVisible(this.activeCodexSection === 'threats');

    switch (this.activeCodexSection) {
      case 'runner':
        this.codexSectionEyebrow.setText('RUNNER ENTRY');
        this.codexSectionTitle.setText(hero.name);
        this.codexSectionSubtitle.setText(
          'Read the focused hero brief, passive, and opening loadout without the rest of the archive competing for space.',
        );
        break;
      case 'weapon':
        this.codexSectionEyebrow.setText('WEAPON ENTRY');
        this.codexSectionTitle.setText(weapon.name);
        this.codexSectionSubtitle.setText(
          `Starter weapon record for ${hero.name}. Compact stats stay visible; the long explanation stays out of the menu.`,
        );
        break;
      case 'threats':
        this.codexSectionEyebrow.setText('THREAT ARCHIVE');
        this.codexSectionTitle.setText('Field Threats');
        this.codexSectionSubtitle.setText(
          'Known encounter entries tied to the current roster and run flow. Read them as archive notes, not loose menu tips.',
        );
        break;
    }
  }

  private setActiveCodexSection(section: CodexSection): void {
    if (this.activeCodexSection === section) {
      return;
    }

    this.activeCodexSection = section;
    this.refreshCodexView();
  }

  private refreshCodexSectionNav(): void {
    const sections: CodexSection[] = ['runner', 'weapon', 'threats'];

    for (let index = 0; index < sections.length; index += 1) {
      const active = this.activeCodexSection === sections[index];
      this.codexSectionFrames[index].setFillStyle(active ? 0x1d3553 : 0x132033, active ? 0.98 : 0.78);
      this.codexSectionFrames[index].setStrokeStyle(1, active ? 0x60a5fa : 0x223247, active ? 1 : 0.86);
      this.codexSectionTexts[index].setColor(active ? '#eff6ff' : '#e2e8f0');
    }
  }

  private getHeroBadgeLabel(hero: HeroDefinition): string {
    return hero.name.slice(0, 2).toUpperCase();
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

    return traits.join('  |  ');
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

    return traits.join('  |  ');
  }

  private handleShutdown(): void {
    this.input.keyboard?.off('keydown-ENTER', this.handleStartShortcut, this);
    this.input.keyboard?.off('keydown-SPACE', this.handleStartShortcut, this);
    this.input.keyboard?.off('keydown-M', this.handleMetaShortcut, this);
    this.input.keyboard?.off('keydown-ESC', this.handleEscapeShortcut, this);
  }
}
