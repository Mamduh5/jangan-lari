import Phaser from 'phaser';
import { primeAudioContext } from '../audio/audioCuePlayer';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { ENEMY_ARCHETYPES } from '../data/enemies';
import { HERO_LIST, type HeroDefinition } from '../data/heroes';
import type { UiButtonAssetId } from '../data/assetSlots';
import { WEAPON_DEFINITIONS } from '../data/weapons';
import {
  getHeroIconAssetSlot,
  getUiButtonAssetSlot,
  getUiIconAssetSlot,
  getWeaponIconAssetSlot,
  shouldUseVisualAsset,
} from '../utils/assetResolver';
import {
  CONTROL_GUIDE_MODES,
  loadGameSave,
  updateControlGuideMode,
  type ControlGuideMode,
  type GameSaveData,
  type LocalLeaderboardEntry,
} from '../save/saveData';
import { isHeroUnlocked, selectHero, unlockHero } from '../save/saveHeroes';
import {
  DOODLE_COLORS,
  DOODLE_FONTS,
  DOODLE_HEX,
  DOODLE_OVERLAY_COLORS,
  drawDoodleCard,
  drawDoodleCircle,
  drawDoodleCloseX,
  drawDoodleStar,
  drawDoodleUpgradeGlyph,
} from '../ui/doodleTheme';
import {
  drawCodexJournalShell,
  drawCodexSectionTabChrome,
  drawCodexThreatDoodle,
  drawHeroFallbackMascot,
  drawHeroPortraitMedallion,
  drawJanganLariHeaderLogo,
  drawMenuBottomActionButtonChrome,
  drawMenuIslandBackdrop,
  drawMenuTopPillChrome,
  getHeroThemePalette,
  type CodexThreatKind,
} from '../ui/menuCodexArtwork';

type CodexSection = 'runner' | 'weapon' | 'threats';

export class MenuScene extends Phaser.Scene {
  private saveData!: GameSaveData;
  private menuBackdropGraphics!: Phaser.GameObjects.Graphics;
  private topGuidePillGraphics!: Phaser.GameObjects.Graphics;
  private topGuideVisualKey = '';
  private topGoldIconImage: Phaser.GameObjects.Image | null = null;
  private featuredHeroChromeGraphics!: Phaser.GameObjects.Graphics;
  private featuredHeroVisualKey = '';
  private featuredHeroWeaponIconImage: Phaser.GameObjects.Image | null = null;
  private statusBannerGraphics!: Phaser.GameObjects.Graphics;
  private bottomButtonGraphics: Record<'start' | 'upgrades' | 'codex' | 'lastRun', Phaser.GameObjects.Graphics | null> = {
    start: null,
    upgrades: null,
    codex: null,
    lastRun: null,
  };
  private bottomButtonHover: Record<'start' | 'upgrades' | 'codex', boolean> = {
    start: false,
    upgrades: false,
    codex: false,
  };
  private goldText!: Phaser.GameObjects.Text;
  private bestScoreText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private heroActionButtons: Phaser.GameObjects.Text[] = [];
  private heroActionButtonGraphics: Phaser.GameObjects.Graphics[] = [];
  private heroCardGraphics: Phaser.GameObjects.Graphics[] = [];
  private heroCardVisualKeys: string[] = [];
  private heroButtonVisualKeys: string[] = [];
  private heroButtonHovered: boolean[] = [];
  private heroInfoTexts: Phaser.GameObjects.Text[] = [];
  private heroPanels: Phaser.GameObjects.Rectangle[] = [];
  private startButton!: Phaser.GameObjects.Text;
  private startButtonIcon: Phaser.GameObjects.Image | null = null;
  private metaButton!: Phaser.GameObjects.Text;
  private codexButton!: Phaser.GameObjects.Text;
  private guideButton!: Phaser.GameObjects.Text;
  private codexCloseButton!: Phaser.GameObjects.Text;
  private codexCloseButtonGraphics!: Phaser.GameObjects.Graphics;
  private codexCloseHovered = false;
  private codexCloseButtonIcon: Phaser.GameObjects.Image | null = null;
  private codexBackdrop!: Phaser.GameObjects.Rectangle;
  private codexJournalGraphics!: Phaser.GameObjects.Graphics;
  private codexHeaderGraphics!: Phaser.GameObjects.Graphics;
  private codexHeaderKey = '';
  private codexSectionTabGraphics: Phaser.GameObjects.Graphics[] = [];
  private codexSectionTabVisualKeys: string[] = [];
  private codexSectionHoveredIndex: number | null = null;
  private codexOverlay!: Phaser.GameObjects.Container;
  private codexOverlayVisible = false;
  private activeCodexSection: CodexSection = 'runner';
  private codexSectionFrames: Phaser.GameObjects.Rectangle[] = [];
  private codexSectionTexts: Phaser.GameObjects.Text[] = [];
  private codexSectionEyebrow!: Phaser.GameObjects.Text;
  private codexSectionTitle!: Phaser.GameObjects.Text;
  private codexSectionSubtitle!: Phaser.GameObjects.Text;
  private codexRunnerContainer!: Phaser.GameObjects.Container;
  private codexRunnerGraphics!: Phaser.GameObjects.Graphics;
  private codexRunnerVisualKey = '';
  private codexRunnerPortraitImage: Phaser.GameObjects.Image | null = null;
  private codexHeroNamePlate!: Phaser.GameObjects.Text;
  private codexWeaponContainer!: Phaser.GameObjects.Container;
  private codexWeaponGraphics!: Phaser.GameObjects.Graphics;
  private codexWeaponVisualKey = '';
  private codexWeaponImage: Phaser.GameObjects.Image | null = null;
  private codexThreatContainer!: Phaser.GameObjects.Container;
  private codexThreatGraphics: Phaser.GameObjects.Graphics[] = [];
  private codexThreatRoleTexts: Phaser.GameObjects.Text[] = [];
  private focusedHeroId: HeroDefinition['id'] = 'runner';
  private focusedHeroStatusText!: Phaser.GameObjects.Text;
  private focusedHeroDetailName!: Phaser.GameObjects.Text;
  private focusedHeroDetailDesc!: Phaser.GameObjects.Text;
  private focusedHeroDetailWeapon!: Phaser.GameObjects.Text;
  private focusedHeroDetailPassiveTitle!: Phaser.GameObjects.Text;
  private focusedHeroDetailPassive!: Phaser.GameObjects.Text;
  private focusedHeroPreviewContainer: Phaser.GameObjects.Container | null = null;
  private lastRunText!: Phaser.GameObjects.Text;
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
    this.heroActionButtonGraphics = [];
    this.heroCardGraphics = [];
    this.heroCardVisualKeys = [];
    this.heroButtonVisualKeys = [];
    this.heroButtonHovered = [];
    this.heroInfoTexts = [];
    this.heroPanels = [];
    this.codexSectionFrames = [];
    this.codexSectionTexts = [];
    this.codexSectionTabGraphics = [];
    this.codexSectionTabVisualKeys = [];
    this.codexSectionHoveredIndex = null;
    this.codexCloseHovered = false;
    this.codexHeaderKey = '';
    this.codexRunnerVisualKey = '';
    this.codexWeaponVisualKey = '';
    this.codexRunnerPortraitImage = null;
    this.codexWeaponImage = null;
    this.codexThreatGraphics = [];
    this.codexThreatRoleTexts = [];
    this.codexThreatTitleTexts = [];
    this.codexThreatBodyTexts = [];
    this.focusedHeroPreviewContainer = null;
    this.startButtonIcon = null;
    this.codexCloseButtonIcon = null;
    this.topGoldIconImage = null;
    this.featuredHeroWeaponIconImage = null;
    this.topGuideVisualKey = '';
    this.featuredHeroVisualKey = '';
    this.bottomButtonHover = { start: false, upgrades: false, codex: false };

    this.cameras.main.setBackgroundColor('#21183c');

    // ── Atmospheric twilight meadow backdrop + main cream hero stage ──────
    this.menuBackdropGraphics = this.add.graphics().setDepth(0);
    drawMenuIslandBackdrop(this.menuBackdropGraphics, GAME_WIDTH, GAME_HEIGHT);
    drawJanganLariHeaderLogo(this.menuBackdropGraphics, 272, 74);

    // Main cream hero workbench frame
    drawDoodleCard(this.menuBackdropGraphics, {
      cx: 806,
      cy: 373,
      width: 1178,
      height: 432,
      cornerRadius: 24,
      seed: 101,
      jitter: 1.7,
      fillColor: DOODLE_COLORS.paperWarm,
      strokeColor: DOODLE_COLORS.ink,
      strokeWidth: 3.4,
      shadowOffsetX: 6,
      shadowOffsetY: 7,
      shadowAlpha: 0.45,
    });
    drawDoodleCard(this.menuBackdropGraphics, {
      cx: 800,
      cy: 368,
      width: 1170,
      height: 424,
      cornerRadius: 22,
      seed: 105,
      jitter: 1.5,
      fillColor: DOODLE_COLORS.paper,
      strokeColor: DOODLE_COLORS.ink,
      strokeWidth: 3.2,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      shadowAlpha: 0,
    });
    this.menuBackdropGraphics.lineStyle(2, DOODLE_COLORS.paperWarm, 0.95);
    this.menuBackdropGraphics.lineBetween(668, 186, 668, 554);

    // Logo typography
    this.add
      .text(272, 74, 'Jangan Lari', {
        fontFamily: DOODLE_FONTS.display,
        fontSize: '50px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.add
      .text(272, 128, "SHAPE SURVIVAL • DON'T STOP!", {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '12.5px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
        letterSpacing: 0.9,
      })
      .setOrigin(0.5)
      .setDepth(2);

    // ── Top-right GOLD, BEST, and Guide pills ─────────────────────────────
    const goldSlot = getUiIconAssetSlot('gold');
    const hasGoldTexture = shouldUseVisualAsset(this, 'uiIcons', goldSlot);
    drawMenuTopPillChrome(this.menuBackdropGraphics, 1072, 66, 186, 46, DOODLE_COLORS.paper, 'gold', 211, hasGoldTexture);
    if (hasGoldTexture) {
      this.topGoldIconImage = this.add.image(1003, 66, goldSlot.key).setDisplaySize(22, 22).setDepth(2);
    }
    this.goldText = this.add
      .text(1092, 66, `GOLD ${this.saveData.totalGold}`, {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '17px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
      })
      .setOrigin(0.5)
      .setDepth(2);

    drawMenuTopPillChrome(this.menuBackdropGraphics, 1274, 66, 192, 46, DOODLE_COLORS.paper, 'best', 221, false);
    this.bestScoreText = this.add
      .text(1294, 66, `BEST ${this.saveData.bestScore}`, {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '17px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.topGuidePillGraphics = this.add.graphics().setDepth(1);
    this.guideButton = this.add
      .text(1476, 66, '', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '16px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
        align: 'center',
        fixedWidth: 186,
        fixedHeight: 46,
        padding: { left: 26, top: 13 },
      })
      .setOrigin(0.5)
      .setDepth(2)
      .setInteractive({ useHandCursor: true });
    this.guideButton.on('pointerdown', () => this.cycleControlGuideMode());
    this.guideButton.on('pointerover', () => this.refreshGuideButton(true));
    this.guideButton.on('pointerout', () => this.refreshGuideButton(false));
    this.refreshGuideButton();

    // ── Left Featured Hero Inspector (x: 232..656) ────────────────────────
    this.featuredHeroChromeGraphics = this.add.graphics().setDepth(2);

    this.focusedHeroStatusText = this.add
      .text(588, 190, '', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '11.5px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
        letterSpacing: 0.8,
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.focusedHeroDetailName = this.add
      .text(446, 356, '', {
        fontFamily: DOODLE_FONTS.display,
        fontSize: '26px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
        letterSpacing: 1.2,
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.add
      .text(342, 410, 'STARTER WEAPON', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '12px',
        fontStyle: 'bold',
        color: DOODLE_HEX.inkMuted,
        letterSpacing: 0.7,
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.focusedHeroDetailWeapon = this.add
      .text(556, 410, '', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '15px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.add
      .text(342, 450, 'PASSIVE', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '12px',
        fontStyle: 'bold',
        color: DOODLE_HEX.inkMuted,
        letterSpacing: 0.7,
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.focusedHeroDetailPassiveTitle = this.add
      .text(546, 450, '', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '15px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.focusedHeroDetailPassive = this.add
      .text(446, 498, '', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '14px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
        align: 'center',
        wordWrap: { width: 396 },
        lineSpacing: 3,
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.focusedHeroDetailDesc = this.add
      .text(446, 542, '', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '13px',
        color: DOODLE_HEX.inkMuted,
        align: 'center',
        wordWrap: { width: 396 },
        lineSpacing: 3,
      })
      .setOrigin(0.5)
      .setDepth(3);

    const featuredWeaponPreload = (
      ['arc-bolt', 'ember-lance', 'twin-fangs', 'bloom-cannon'] as const
    )
      .map((id) => getWeaponIconAssetSlot(id))
      .find((slot) => shouldUseVisualAsset(this, 'weaponHudIcons', slot));
    if (featuredWeaponPreload) {
      this.featuredHeroWeaponIconImage = this.add
        .image(464, 410, featuredWeaponPreload.key)
        .setDisplaySize(20, 20)
        .setDepth(3)
        .setVisible(false);
    }

    // ── Right 2x2 Hero Selection Grid (x: 686..1360) ──────────────────────
    const cardW = 324;
    const cardH = 182;
    const colGap = 24;
    const rowGap = 22;
    const col0cx = 686 + cardW / 2;
    const col1cx = col0cx + cardW + colGap;
    const row0cy = 181 + cardH / 2;
    const row1cy = row0cy + cardH + rowGap;

    for (let index = 0; index < HERO_LIST.length; index += 1) {
      const hero = HERO_LIST[index];
      const col = index % 2;
      const row = Math.floor(index / 2);
      const cx = col === 0 ? col0cx : col1cx;
      const cy = row === 0 ? row0cy : row1cy;

      const cardGfx = this.add.graphics().setDepth(2);
      const btnGfx = this.add.graphics().setDepth(3);

      // Transparent interactive hit region matching card area cleanly
      const panel = this.add
        .rectangle(cx, cy, cardW, cardH, DOODLE_COLORS.paper, 0)
        .setOrigin(0.5)
        .setDepth(2)
        .setInteractive({ useHandCursor: true });
      panel.on('pointerover', () => this.setFocusedHero(hero.id));
      panel.on('pointerdown', () => this.setFocusedHero(hero.id));

      this.createCardHeroPreview(hero, cx - 98, cy - 8, cardGfx);

      this.add
        .text(cx + 46, cy - 46, hero.name.toUpperCase(), {
          fontFamily: DOODLE_FONTS.display,
          fontSize: '21px',
          fontStyle: 'bold',
          color: DOODLE_HEX.ink,
          letterSpacing: 0.8,
        })
        .setOrigin(0.5)
        .setDepth(4);

      const infoText = this.add
        .text(cx + 46, cy - 6, '', {
          fontFamily: DOODLE_FONTS.body,
          fontSize: '13.5px',
          fontStyle: 'bold',
          color: DOODLE_HEX.inkMuted,
          align: 'center',
          wordWrap: { width: 196 },
          lineSpacing: 3,
        })
        .setOrigin(0.5)
        .setDepth(4);

      const actionButton = this.add
        .text(cx + 46, cy + 46, '', {
          fontFamily: DOODLE_FONTS.body,
          fontSize: '14.5px',
          fontStyle: 'bold',
          color: DOODLE_HEX.ink,
          align: 'center',
          fixedWidth: 184,
          fixedHeight: 40,
          padding: { top: 10 },
        })
        .setOrigin(0.5)
        .setDepth(4)
        .setInteractive({ useHandCursor: true });

      this.heroCardVisualKeys.push('');
      this.heroButtonVisualKeys.push('');
      this.heroButtonHovered.push(false);
      this.heroCardGraphics.push(cardGfx);
      this.heroActionButtonGraphics.push(btnGfx);
      this.heroPanels.push(panel);
      this.heroInfoTexts.push(infoText);
      this.heroActionButtons.push(actionButton);

      actionButton.on('pointerover', () => {
        this.heroButtonHovered[index] = true;
        this.setFocusedHero(hero.id);
        this.renderSingleHeroCard(index);
      });
      actionButton.on('pointerout', () => {
        this.heroButtonHovered[index] = false;
        this.renderSingleHeroCard(index);
      });
      actionButton.on('pointerdown', () => this.handleHeroAction(hero));
    }

    // ── Complete Illustrated Field Codex Overlay (depth 30) ─────────────────
    this.codexBackdrop = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x120d26, 0.82)
      .setOrigin(0, 0);

    this.codexJournalGraphics = this.add.graphics();
    drawCodexJournalShell(this.codexJournalGraphics, GAME_WIDTH / 2, GAME_HEIGHT / 2);

    const codexJournalTitle = this.add
      .text(308, 132, 'FIELD CODEX', {
        fontFamily: DOODLE_FONTS.display,
        fontSize: '23px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
        letterSpacing: 0.6,
      })
      .setOrigin(0, 0.5);

    const codexSections: Array<{ id: CodexSection; label: string; note: string }> = [
      { id: 'runner', label: 'Runner', note: 'Focused hero' },
      { id: 'weapon', label: 'Weapon', note: 'Starter loadout' },
      { id: 'threats', label: 'Threats', note: 'Field log' },
    ];
    const codexCategoryObjects: Phaser.GameObjects.GameObject[] = [];
    for (let index = 0; index < codexSections.length; index += 1) {
      const section = codexSections[index];
      const tabY = 236 + index * 102;
      const tabGfx = this.add.graphics();

      const frame = this.add
        .rectangle(376, tabY, 218, 78, DOODLE_COLORS.paper, 0)
        .setOrigin(0.5);
      const title = this.add
        .text(342, tabY - 11, section.label, {
          fontFamily: DOODLE_FONTS.display,
          fontSize: '20px',
          fontStyle: 'bold',
          color: DOODLE_HEX.ink,
        })
        .setOrigin(0, 0.5);
      const note = this.add
        .text(342, tabY + 14, section.note, {
          fontFamily: DOODLE_FONTS.body,
          fontSize: '12px',
          fontStyle: 'bold',
          color: DOODLE_HEX.inkMuted,
        })
        .setOrigin(0, 0.5);

      frame.on('pointerdown', () => this.setActiveCodexSection(section.id));
      frame.on('pointerover', () => {
        this.codexSectionHoveredIndex = index;
        this.refreshCodexSectionNav();
      });
      frame.on('pointerout', () => {
        if (this.codexSectionHoveredIndex === index) {
          this.codexSectionHoveredIndex = null;
        }
        this.refreshCodexSectionNav();
      });

      this.codexSectionTabGraphics.push(tabGfx);
      this.codexSectionTabVisualKeys.push('');
      this.codexSectionFrames.push(frame);
      this.codexSectionTexts.push(title);
      codexCategoryObjects.push(tabGfx, frame, title, note);
    }

    this.codexCloseButtonGraphics = this.add.graphics();
    this.codexCloseButton = this.add
      .text(376, 576, 'BACK', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '19px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
        align: 'center',
        fixedWidth: 188,
        fixedHeight: 52,
        padding: { left: 26, top: 14 },
      })
      .setOrigin(0.5);
    this.codexCloseButton.on('pointerdown', () => this.closeCodex());
    this.codexCloseButton.on('pointerover', () => {
      this.codexCloseHovered = true;
      this.renderCodexBackButton();
    });
    this.codexCloseButton.on('pointerout', () => {
      this.codexCloseHovered = false;
      this.renderCodexBackButton();
    });
    this.codexCloseButtonIcon = this.createUiButtonIcon('close', 306, 576, 20);
    if (this.codexCloseButtonIcon) {
      this.codexCloseButtonIcon.setAlpha(1);
    }
    this.renderCodexBackButton();

    this.codexHeaderGraphics = this.add.graphics();
    this.codexSectionEyebrow = this.add
      .text(648, 134, '', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '11.5px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
        letterSpacing: 1.0,
      })
      .setOrigin(0.5);
    this.codexSectionTitle = this.add
      .text(566, 168, '', {
        fontFamily: DOODLE_FONTS.display,
        fontSize: '30px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
      })
      .setOrigin(0, 0.5);
    this.codexSectionSubtitle = this.add
      .text(566, 196, '', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '13.5px',
        color: DOODLE_HEX.inkMuted,
        wordWrap: { width: 750 },
      })
      .setOrigin(0, 0.5);

    // ── Codex Section 1: Runner (focused hero specimen + field brief) ───────
    this.codexRunnerGraphics = this.add.graphics();
    const preloadCodexHero = HERO_LIST.map((h) => getHeroIconAssetSlot(h.id)).find((slot) =>
      shouldUseVisualAsset(this, 'heroMenuIcons', slot),
    );
    if (preloadCodexHero) {
      this.codexRunnerPortraitImage = this.add.image(674, 358, preloadCodexHero.key).setDisplaySize(86, 86).setVisible(false);
    }
    this.codexHeroBadge = this.add
      .text(602, 282, '--', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '12px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
      })
      .setOrigin(0.5);
    this.codexHeroNamePlate = this.add
      .text(674, 466, '', {
        fontFamily: DOODLE_FONTS.display,
        fontSize: '19px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
      })
      .setOrigin(0.5);
    const runnerBriefLabel = this.add
      .text(818, 268, 'HERO BRIEF', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '11.5px',
        fontStyle: 'bold',
        color: DOODLE_HEX.inkMuted,
        letterSpacing: 1,
      })
      .setOrigin(0, 0.5);
    this.codexHeroBody = this.add
      .text(818, 286, '', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '16px',
        color: DOODLE_HEX.ink,
        wordWrap: { width: 484 },
        lineSpacing: 5,
      })
      .setOrigin(0, 0);
    const runnerSpecLabel = this.add
      .text(818, 390, 'PASSIVE & OPENING LOADOUT', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '11.5px',
        fontStyle: 'bold',
        color: DOODLE_HEX.inkMuted,
        letterSpacing: 1,
      })
      .setOrigin(0, 0.5);
    this.codexHeroMeta = this.add
      .text(818, 410, '', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '15px',
        color: DOODLE_HEX.ink,
        wordWrap: { width: 484 },
        lineSpacing: 6,
      })
      .setOrigin(0, 0);
    const runnerChildren: Phaser.GameObjects.GameObject[] = [this.codexRunnerGraphics];
    if (this.codexRunnerPortraitImage) {
      runnerChildren.push(this.codexRunnerPortraitImage);
    }
    runnerChildren.push(
      this.codexHeroBadge,
      this.codexHeroNamePlate,
      runnerBriefLabel,
      this.codexHeroBody,
      runnerSpecLabel,
      this.codexHeroMeta,
    );
    this.codexRunnerContainer = this.add.container(0, 0, runnerChildren);

    // ── Codex Section 2: Weapon (focused hero's starting weapon telemetry) ─
    this.codexWeaponGraphics = this.add.graphics();
    const preloadCodexWeapon = (['arc-bolt', 'ember-lance', 'twin-fangs', 'bloom-cannon'] as const)
      .map((id) => getWeaponIconAssetSlot(id))
      .find((slot) => shouldUseVisualAsset(this, 'weaponHudIcons', slot));
    if (preloadCodexWeapon) {
      this.codexWeaponImage = this.add.image(674, 358, preloadCodexWeapon.key).setDisplaySize(74, 74).setVisible(false);
    }
    this.codexWeaponBadge = this.add
      .text(674, 466, '--', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '15px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
      })
      .setOrigin(0.5);
    const weaponOverviewLabel = this.add
      .text(818, 268, 'STARTER WEAPON BRIEF', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '11.5px',
        fontStyle: 'bold',
        color: DOODLE_HEX.inkMuted,
        letterSpacing: 1,
      })
      .setOrigin(0, 0.5);
    this.codexWeaponBody = this.add
      .text(818, 286, '', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '16px',
        color: DOODLE_HEX.ink,
        wordWrap: { width: 484 },
        lineSpacing: 5,
      })
      .setOrigin(0, 0);
    const weaponStatsLabel = this.add
      .text(818, 390, 'WEAPON TELEMETRY', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '11.5px',
        fontStyle: 'bold',
        color: DOODLE_HEX.inkMuted,
        letterSpacing: 1,
      })
      .setOrigin(0, 0.5);
    this.codexWeaponStats = this.add
      .text(818, 412, '', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '15.5px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
        wordWrap: { width: 484 },
        lineSpacing: 8,
      })
      .setOrigin(0, 0);
    const weaponChildren: Phaser.GameObjects.GameObject[] = [this.codexWeaponGraphics];
    if (this.codexWeaponImage) {
      weaponChildren.push(this.codexWeaponImage);
    }
    weaponChildren.push(
      this.codexWeaponBadge,
      weaponOverviewLabel,
      this.codexWeaponBody,
      weaponStatsLabel,
      this.codexWeaponStats,
    );
    this.codexWeaponContainer = this.add.container(0, 0, weaponChildren);

    // ── Codex Section 3: Threats (3 illustrated encounter field-entry cards)
    const codexThreatObjects: Phaser.GameObjects.GameObject[] = [];
    const threatKinds: CodexThreatKind[] = ['skimmer', 'dreadnought', 'behemoth'];
    const threatCardFills = [0xfff1f2, 0xf5f3ff, 0xfffbeb];
    const threatPillFills = [0xfbcfe8, 0xe9d5ff, 0xfecaca];

    for (let index = 0; index < 3; index += 1) {
      const cy = 286 + index * 128;
      const cardGfx = this.add.graphics();
      drawDoodleCard(cardGfx, {
        cx: 948,
        cy,
        width: 758,
        height: 114,
        cornerRadius: 18,
        seed: 1770 + index * 17,
        jitter: 1.2,
        fillColor: threatCardFills[index],
        strokeColor: DOODLE_COLORS.ink,
        strokeWidth: 2.6,
        shadowOffsetX: 3,
        shadowOffsetY: 3,
        shadowAlpha: 0.28,
      });
      drawCodexThreatDoodle(cardGfx, threatKinds[index], 632, cy, 33);

      // Colored threat name ribbon pill + non-color role badge pill
      drawDoodleCard(cardGfx, {
        cx: 806,
        cy: cy - 24,
        width: 188,
        height: 30,
        cornerRadius: 10,
        seed: 1790 + index * 11,
        jitter: 0.6,
        fillColor: threatPillFills[index],
        strokeColor: DOODLE_COLORS.ink,
        strokeWidth: 2,
        shadowOffsetX: 1,
        shadowOffsetY: 2,
        shadowAlpha: 0.2,
      });
      drawDoodleCard(cardGfx, {
        cx: 984,
        cy: cy - 24,
        width: 144,
        height: 26,
        cornerRadius: 9,
        seed: 1810 + index * 13,
        jitter: 0.5,
        fillColor: DOODLE_COLORS.paper,
        strokeColor: DOODLE_COLORS.ink,
        strokeWidth: 1.8,
        shadowOffsetX: 1,
        shadowOffsetY: 1,
        shadowAlpha: 0.16,
      });

      const threatTitle = this.add
        .text(806, cy - 24, '', {
          fontFamily: DOODLE_FONTS.display,
          fontSize: '17px',
          fontStyle: 'bold',
          color: DOODLE_HEX.ink,
          letterSpacing: 0.8,
        })
        .setOrigin(0.5);
      const threatRole = this.add
        .text(984, cy - 24, '', {
          fontFamily: DOODLE_FONTS.body,
          fontSize: '11.5px',
          fontStyle: 'bold',
          color: DOODLE_HEX.inkMuted,
          letterSpacing: 0.6,
        })
        .setOrigin(0.5);
      const threatBody = this.add
        .text(712, cy + 2, '', {
          fontFamily: DOODLE_FONTS.body,
          fontSize: '15.5px',
          color: DOODLE_HEX.ink,
          wordWrap: { width: 594 },
          lineSpacing: 4,
        })
        .setOrigin(0, 0);

      this.codexThreatGraphics.push(cardGfx);
      this.codexThreatTitleTexts.push(threatTitle);
      this.codexThreatRoleTexts.push(threatRole);
      this.codexThreatBodyTexts.push(threatBody);
      codexThreatObjects.push(cardGfx, threatTitle, threatRole, threatBody);
    }
    this.codexThreatContainer = this.add.container(0, 0, codexThreatObjects);

    const codexOverlayChildren: Phaser.GameObjects.GameObject[] = [
      this.codexBackdrop,
      this.codexJournalGraphics,
      codexJournalTitle,
      ...codexCategoryObjects,
      this.codexCloseButtonGraphics,
      this.codexCloseButton,
      this.codexHeaderGraphics,
      this.codexSectionEyebrow,
      this.codexSectionTitle,
      this.codexSectionSubtitle,
      this.codexRunnerContainer,
      this.codexWeaponContainer,
      this.codexThreatContainer,
    ];
    if (this.codexCloseButtonIcon) {
      codexOverlayChildren.push(this.codexCloseButtonIcon);
    }
    this.codexOverlay = this.add.container(0, 0, codexOverlayChildren);
    this.codexOverlay.setDepth(30);
    this.codexOverlay.setVisible(false);
    this.setCodexControlsInteractive(false);

    // ── Bottom action strip (CODEX, UPGRADES, dominant START RUN, Last Run) ─
    const codexGfx = this.add.graphics().setDepth(2);
    const metaGfx = this.add.graphics().setDepth(2);
    const startGfx = this.add.graphics().setDepth(2);
    const lastRunGfx = this.add.graphics().setDepth(2);
    this.bottomButtonGraphics = { codex: codexGfx, upgrades: metaGfx, start: startGfx, lastRun: lastRunGfx };

    this.codexButton = this.add
      .text(278, 646, 'CODEX', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '20px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
        align: 'center',
        fixedWidth: 184,
        fixedHeight: 54,
        padding: { left: 26, top: 15 },
      })
      .setOrigin(0.5)
      .setDepth(3)
      .setInteractive({ useHandCursor: true });
    this.codexButton.on('pointerover', () => {
      this.bottomButtonHover.codex = true;
      drawMenuBottomActionButtonChrome(codexGfx, 278, 646, 184, 54, 'codex', true);
    });
    this.codexButton.on('pointerout', () => {
      this.bottomButtonHover.codex = false;
      drawMenuBottomActionButtonChrome(codexGfx, 278, 646, 184, 54, 'codex', false);
    });
    this.codexButton.on('pointerdown', () => this.openCodex());

    this.metaButton = this.add
      .text(490, 646, 'UPGRADES', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '20px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
        align: 'center',
        fixedWidth: 204,
        fixedHeight: 54,
        padding: { left: 28, top: 15 },
      })
      .setOrigin(0.5)
      .setDepth(3)
      .setInteractive({ useHandCursor: true });
    this.metaButton.on('pointerover', () => {
      this.bottomButtonHover.upgrades = true;
      drawMenuBottomActionButtonChrome(metaGfx, 490, 646, 204, 54, 'upgrades', true);
    });
    this.metaButton.on('pointerout', () => {
      this.bottomButtonHover.upgrades = false;
      drawMenuBottomActionButtonChrome(metaGfx, 490, 646, 204, 54, 'upgrades', false);
    });
    this.metaButton.on('pointerdown', () => this.openMeta());

    this.startButtonIcon = this.createUiButtonIcon('play', 676, 646, 28);
    if (this.startButtonIcon) {
      this.startButtonIcon.setAlpha(1).setDepth(4);
    }

    this.startButton = this.add
      .text(800, 646, 'START RUN', {
        fontFamily: DOODLE_FONTS.display,
        fontSize: '29px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
        align: 'center',
        fixedWidth: 344,
        fixedHeight: 72,
        padding: { left: 32, top: 19 },
      })
      .setOrigin(0.5)
      .setDepth(3)
      .setInteractive({ useHandCursor: true });
    this.startButton.on('pointerover', () => {
      this.bottomButtonHover.start = true;
      drawMenuBottomActionButtonChrome(startGfx, 800, 646, 344, 72, 'start', true, Boolean(this.startButtonIcon));
    });
    this.startButton.on('pointerout', () => {
      this.bottomButtonHover.start = false;
      drawMenuBottomActionButtonChrome(startGfx, 800, 646, 344, 72, 'start', false, Boolean(this.startButtonIcon));
    });
    this.startButton.on('pointerdown', () => this.startRun());

    drawMenuBottomActionButtonChrome(codexGfx, 278, 646, 184, 54, 'codex', false);
    drawMenuBottomActionButtonChrome(metaGfx, 490, 646, 204, 54, 'upgrades', false);
    drawMenuBottomActionButtonChrome(startGfx, 800, 646, 344, 72, 'start', false, Boolean(this.startButtonIcon));
    drawMenuBottomActionButtonChrome(lastRunGfx, 1236, 646, 434, 50, 'lastRun', false);

    this.lastRunText = this.add
      .text(1254, 646, '', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '14.5px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
        align: 'center',
        wordWrap: { width: 372 },
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.statusBannerGraphics = this.add.graphics().setDepth(4).setVisible(false);
    this.statusText = this.add
      .text(800, 701, '', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '14px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
      })
      .setOrigin(0.5)
      .setDepth(5)
      .setVisible(false);

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
    this.setCodexControlsInteractive(true);
    this.refreshCodexView();
    this.codexOverlay.setVisible(true);
  }

  private closeCodex(): void {
    this.codexOverlayVisible = false;
    this.codexSectionHoveredIndex = null;
    this.codexCloseHovered = false;
    this.codexOverlay.setVisible(false);
    this.setCodexControlsInteractive(false);
  }

  private setCodexControlsInteractive(codexActive: boolean): void {
    if (codexActive) {
      this.codexBackdrop?.setInteractive();
      this.codexCloseButton?.setInteractive({ useHandCursor: true });
      for (const frame of this.codexSectionFrames) {
        frame.setInteractive({ useHandCursor: true });
      }
      this.startButton?.disableInteractive();
      this.metaButton?.disableInteractive();
      this.codexButton?.disableInteractive();
      this.guideButton?.disableInteractive();
      for (const panel of this.heroPanels) {
        panel.disableInteractive();
      }
      for (const btn of this.heroActionButtons) {
        btn.disableInteractive();
      }
      return;
    }

    this.codexBackdrop?.disableInteractive();
    this.codexCloseButton?.disableInteractive();
    for (const frame of this.codexSectionFrames) {
      frame.disableInteractive();
    }
    this.startButton?.setInteractive({ useHandCursor: true });
    this.metaButton?.setInteractive({ useHandCursor: true });
    this.codexButton?.setInteractive({ useHandCursor: true });
    this.guideButton?.setInteractive({ useHandCursor: true });
    for (const panel of this.heroPanels) {
      panel.setInteractive({ useHandCursor: true });
    }
    for (const btn of this.heroActionButtons) {
      btn.setInteractive({ useHandCursor: true });
    }
  }

  public getMenuSnapshot(): {
    gameWidth: number;
    gameHeight: number;
    controlGuideMode: ControlGuideMode;
    guideButtonText: string;
    startButton: { x: number; y: number };
    startButtonIconVisible: boolean;
    guideButton: { x: number; y: number };
  } {
    return {
      gameWidth: GAME_WIDTH,
      gameHeight: GAME_HEIGHT,
      controlGuideMode: this.saveData.controlGuideMode,
      guideButtonText: this.guideButton.text,
      startButton: { x: this.startButton.x, y: this.startButton.y },
      startButtonIconVisible: Boolean(this.startButtonIcon?.visible),
      guideButton: { x: this.guideButton.x, y: this.guideButton.y },
    };
  }

  private handleStartShortcut(): void {
    if (this.codexOverlayVisible) {
      return;
    }

    this.startButton.emit('pointerdown');
  }

  private shouldUseMobileCopy(): boolean {
    const viewportWidth = window.innerWidth || this.scale.displaySize.width;
    const viewportHeight = window.innerHeight || this.scale.displaySize.height;
    return viewportWidth <= 960 || viewportHeight <= 540;
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
      this.focusedHeroId = hero.id;
      this.setStatusMessage(`${hero.name} selected for the next run.`);
      this.refreshHeroView();
      return;
    }

    const nextSave = unlockHero(this.saveData, hero);
    if (!nextSave) {
      this.setStatusMessage(`Need ${hero.unlockCost ?? 0} gold to unlock ${hero.name}.`);
      return;
    }

    this.saveData = nextSave;
    this.focusedHeroId = hero.id;
    this.setStatusMessage(`${hero.name} unlocked and selected.`);
    this.refreshHeroView();
  }

  private cycleControlGuideMode(): void {
    const currentIndex = CONTROL_GUIDE_MODES.indexOf(this.saveData.controlGuideMode);
    const nextMode = CONTROL_GUIDE_MODES[(currentIndex + 1) % CONTROL_GUIDE_MODES.length];
    this.saveData = updateControlGuideMode(this.saveData, nextMode);
    this.setStatusMessage(`Control guide: ${this.getControlGuideModeLabel(nextMode)}.`);
    this.refreshGuideButton(false);
  }

  private setStatusMessage(message: string): void {
    this.statusText.setText(message);
    if (!message) {
      this.statusText.setVisible(false);
      this.statusBannerGraphics?.setVisible(false);
      return;
    }

    const bannerW = Math.min(540, Math.max(260, message.length * 8.5 + 36));
    this.statusBannerGraphics.clear();
    drawDoodleCard(this.statusBannerGraphics, {
      cx: GAME_WIDTH / 2,
      cy: 701,
      width: bannerW,
      height: 28,
      cornerRadius: 10,
      seed: 981,
      jitter: 0.6,
      fillColor: DOODLE_COLORS.paperGold,
      strokeColor: DOODLE_COLORS.ink,
      strokeWidth: 2,
      shadowOffsetX: 2,
      shadowOffsetY: 2,
      shadowAlpha: 0.3,
    });
    this.statusBannerGraphics.setVisible(true);
    this.statusText.setVisible(true);
  }

  private refreshGuideButton(hovered = false): void {
    const mode = this.saveData.controlGuideMode;
    this.guideButton.setText(`Guide ${this.getControlGuideModeLabel(mode)}`);
    this.guideButton.setColor(mode === 'hidden' ? DOODLE_HEX.inkMuted : DOODLE_HEX.ink);

    const key = `${mode}:${hovered ? 1 : 0}`;
    if (this.topGuideVisualKey === key || !this.topGuidePillGraphics) {
      return;
    }
    this.topGuideVisualKey = key;

    const fillColor =
      mode === 'visible'
        ? hovered
          ? 0xdcfce7
          : DOODLE_OVERLAY_COLORS.supportBadge
        : mode === 'hidden'
          ? hovered
            ? DOODLE_COLORS.paperWarm
            : DOODLE_COLORS.paperDisabled
          : hovered
            ? DOODLE_COLORS.paperHover
            : DOODLE_COLORS.paperPurple;

    this.topGuidePillGraphics.clear();
    drawMenuTopPillChrome(this.topGuidePillGraphics, 1476, 66, 186, 46, fillColor, 'guide', 231, false);
  }

  private getControlGuideModeLabel(mode: ControlGuideMode): string {
    switch (mode) {
      case 'hidden':
        return 'Hidden';
      case 'visible':
        return 'Visible';
      case 'subtle':
      default:
        return 'Subtle';
    }
  }

  private getHeroGridCenter(index: number): { cx: number; cy: number } {
    const cardW = 324;
    const cardH = 182;
    const col = index % 2;
    const row = Math.floor(index / 2);
    return {
      cx: (col === 0 ? 686 : 686 + cardW + 24) + cardW / 2,
      cy: (row === 0 ? 181 : 181 + cardH + 22) + cardH / 2,
    };
  }

  private renderSingleHeroCard(index: number): void {
    const hero = HERO_LIST[index];
    if (!hero) {
      return;
    }

    const unlocked = isHeroUnlocked(this.saveData, hero.id);
    const selected = this.saveData.selectedHero === hero.id;
    const focused = hero.id === this.focusedHeroId;
    const hovered = Boolean(this.heroButtonHovered[index]);
    const affordable = unlocked || this.saveData.totalGold >= (hero.unlockCost ?? 0);
    const hasHeroIcon = shouldUseVisualAsset(this, 'heroMenuIcons', getHeroIconAssetSlot(hero.id));

    const button = this.heroActionButtons[index];
    const infoText = this.heroInfoTexts[index];
    const cardGfx = this.heroCardGraphics[index];
    const btnGfx = this.heroActionButtonGraphics[index];
    const { cx, cy } = this.getHeroGridCenter(index);

    infoText.setText(this.buildHeroSummary(hero, unlocked, selected));

    if (selected) {
      button.setText('SELECTED');
    } else if (unlocked) {
      button.setText('SELECT');
    } else {
      button.setText(`UNLOCK ${hero.unlockCost ?? 0}g`);
    }

    const cardKey = `${hero.id}:${selected ? 1 : 0}:${focused ? 1 : 0}:${unlocked ? 1 : 0}:${hasHeroIcon ? 1 : 0}`;
    if (cardGfx && this.heroCardVisualKeys[index] !== cardKey) {
      this.heroCardVisualKeys[index] = cardKey;
      cardGfx.clear();

      const palette = getHeroThemePalette(hero.id);
      if (selected || focused) {
        drawDoodleCard(cardGfx, {
          cx,
          cy,
          width: 334,
          height: 192,
          cornerRadius: 20,
          seed: 310 + index * 17,
          jitter: 1.4,
          fillColor: selected ? DOODLE_COLORS.gold : DOODLE_COLORS.xp,
          strokeColor: DOODLE_COLORS.ink,
          strokeWidth: 2.8,
          shadowOffsetX: 3,
          shadowOffsetY: 4,
          shadowAlpha: 0.35,
        });
      }

      drawDoodleCard(cardGfx, {
        cx,
        cy,
        width: 324,
        height: 182,
        cornerRadius: 18,
        seed: 330 + index * 19,
        jitter: 1.2,
        fillColor: selected ? DOODLE_COLORS.paperHover : focused ? palette.cardTint : unlocked ? DOODLE_COLORS.paper : DOODLE_COLORS.paperWarm,
        strokeColor: DOODLE_COLORS.ink,
        strokeWidth: selected ? 3.2 : 2.6,
        shadowOffsetX: selected || focused ? 0 : 2,
        shadowOffsetY: selected || focused ? 0 : 3,
        shadowAlpha: selected || focused ? 0 : 0.28,
      });

      drawHeroPortraitMedallion(cardGfx, hero.id, cx - 98, cy - 8, 40, false);
      if (!hasHeroIcon) {
        drawHeroFallbackMascot(cardGfx, hero.id, cx - 98, cy - 8, 40);
      }

      if (selected) {
        cardGfx.lineStyle(2.6, DOODLE_COLORS.gold, 1);
        cardGfx.lineBetween(cx + 150, cy + 36, cx + 162, cy + 30);
        cardGfx.lineBetween(cx + 152, cy + 48, cx + 166, cy + 48);
        cardGfx.lineBetween(cx + 150, cy + 60, cx + 162, cy + 66);
      }
    }

    const btnKey = `${selected ? 's' : unlocked ? 'u' : affordable ? 'a' : 'l'}:${hovered ? 1 : 0}`;
    if (btnGfx && this.heroButtonVisualKeys[index] !== btnKey) {
      this.heroButtonVisualKeys[index] = btnKey;
      btnGfx.clear();

      const btnFill = selected
        ? DOODLE_COLORS.mint
        : unlocked
          ? hovered
            ? DOODLE_COLORS.gold
            : DOODLE_COLORS.paperGold
          : affordable
            ? hovered
              ? DOODLE_COLORS.gold
              : 0xfde68a
            : hovered
              ? DOODLE_COLORS.paperWarm
              : DOODLE_COLORS.paperPurple;

      drawDoodleCard(btnGfx, {
        cx: cx + 46,
        cy: cy + 46,
        width: 184,
        height: 40,
        cornerRadius: 13,
        seed: 370 + index * 23,
        jitter: 0.9,
        fillColor: btnFill,
        strokeColor: DOODLE_COLORS.ink,
        strokeWidth: hovered && !selected ? 3 : 2.4,
        shadowOffsetX: 2,
        shadowOffsetY: 2,
        shadowAlpha: 0.3,
      });
    }
  }

  private refreshHeroView(): void {
    this.goldText.setText(`GOLD ${this.saveData.totalGold}`);
    this.bestScoreText.setText(`BEST ${this.saveData.bestScore}`);

    for (let index = 0; index < HERO_LIST.length; index += 1) {
      this.renderSingleHeroCard(index);
    }

    this.refreshCodexView();
    this.refreshFocusedHeroDetail();
    this.refreshLastRunText();
  }

  private refreshFocusedHeroDetail(): void {
    const hero = HERO_LIST.find((h) => h.id === this.focusedHeroId) ?? HERO_LIST[0];
    const weapon = WEAPON_DEFINITIONS[hero.startingWeaponId];
    const unlocked = isHeroUnlocked(this.saveData, hero.id);
    const selected = this.saveData.selectedHero === hero.id;
    const colonIndex = hero.passiveLabel.indexOf(':');
    const passiveTitle = (colonIndex >= 0 ? hero.passiveLabel.slice(0, colonIndex) : hero.passiveLabel).trim();

    this.focusedHeroDetailName.setText(hero.name.toUpperCase());
    this.focusedHeroDetailDesc.setText(hero.description);
    this.focusedHeroDetailWeapon.setText(weapon.name.toUpperCase());
    this.focusedHeroDetailPassiveTitle.setText(passiveTitle.toUpperCase());
    this.focusedHeroDetailPassive.setText(hero.passiveLabel);
    this.focusedHeroStatusText.setText(
      selected ? 'ACTIVE HERO' : unlocked ? 'UNLOCKED' : `LOCKED · ${hero.unlockCost ?? 0}g`,
    );

    const iconSlot = getHeroIconAssetSlot(hero.id);
    const hasHeroIcon = shouldUseVisualAsset(this, 'heroMenuIcons', iconSlot);
    const weaponSlot = getWeaponIconAssetSlot(weapon.id);
    const hasWeaponIcon = Boolean(
      this.featuredHeroWeaponIconImage && shouldUseVisualAsset(this, 'weaponHudIcons', weaponSlot),
    );
    if (hasWeaponIcon && this.featuredHeroWeaponIconImage) {
      this.featuredHeroWeaponIconImage.setTexture(weaponSlot.key).setPosition(464, 410).setVisible(true);
    } else {
      this.featuredHeroWeaponIconImage?.setVisible(false);
    }

    const detailKey = `${hero.id}:${selected ? 1 : 0}:${unlocked ? 1 : 0}:${hasHeroIcon ? 1 : 0}:${hasWeaponIcon ? 1 : 0}`;
    if (this.featuredHeroVisualKey !== detailKey && this.featuredHeroChromeGraphics) {
      this.featuredHeroVisualKey = detailKey;
      const g = this.featuredHeroChromeGraphics;
      const palette = getHeroThemePalette(hero.id);
      g.clear();

      // Portrait medallion + comic rays
      drawHeroPortraitMedallion(g, hero.id, 446, 264, 62, true);
      if (!hasHeroIcon) {
        drawHeroFallbackMascot(g, hero.id, 446, 264, 62);
      }

      // Status pill top-right of showcase
      drawDoodleCard(g, {
        cx: 588,
        cy: 190,
        width: 132,
        height: 28,
        cornerRadius: 10,
        seed: 411,
        jitter: 0.7,
        fillColor: selected ? DOODLE_COLORS.mint : unlocked ? DOODLE_COLORS.paperGold : DOODLE_COLORS.paperPurple,
        strokeColor: DOODLE_COLORS.ink,
        strokeWidth: 2,
        shadowOffsetX: 2,
        shadowOffsetY: 2,
        shadowAlpha: 0.25,
      });

      // Tinted hero name banner ribbon + mini doodle crown
      drawDoodleCard(g, {
        cx: 446,
        cy: 356,
        width: 266,
        height: 44,
        cornerRadius: 14,
        seed: 421,
        jitter: 1.0,
        fillColor: palette.ribbon,
        strokeColor: DOODLE_COLORS.ink,
        strokeWidth: 2.8,
        shadowOffsetX: 2,
        shadowOffsetY: 3,
        shadowAlpha: 0.3,
      });
      const crownPts = [
        { x: 312, y: 344 },
        { x: 308, y: 328 },
        { x: 319, y: 335 },
        { x: 325, y: 322 },
        { x: 333, y: 335 },
        { x: 342, y: 327 },
        { x: 338, y: 344 },
      ];
      g.fillStyle(DOODLE_COLORS.gold, 1);
      g.fillPoints(crownPts, true, true);
      g.lineStyle(2.2, DOODLE_COLORS.ink, 1);
      g.strokePoints(crownPts, true, true);

      // Loadout row 1: [ STARTER WEAPON ] [ icon + WEAPON ]
      drawDoodleCard(g, {
        cx: 342,
        cy: 410,
        width: 162,
        height: 30,
        cornerRadius: 10,
        seed: 431,
        jitter: 0.6,
        fillColor: DOODLE_COLORS.paperWarm,
        strokeColor: DOODLE_COLORS.ink,
        strokeWidth: 2,
        shadowOffsetX: 1,
        shadowOffsetY: 2,
        shadowAlpha: 0.2,
      });
      drawDoodleCard(g, {
        cx: 544,
        cy: 410,
        width: 214,
        height: 30,
        cornerRadius: 10,
        seed: 435,
        jitter: 0.6,
        fillColor: DOODLE_COLORS.paperGold,
        strokeColor: DOODLE_COLORS.ink,
        strokeWidth: 2,
        shadowOffsetX: 1,
        shadowOffsetY: 2,
        shadowAlpha: 0.2,
      });
      if (hasWeaponIcon) {
        drawDoodleCircle(g, {
          cx: 464,
          cy: 410,
          radius: 12,
          fillColor: weapon.id === 'arc-bolt' ? DOODLE_COLORS.weaponWellDark : DOODLE_COLORS.weaponWellLight,
          strokeColor: DOODLE_COLORS.ink,
          strokeWidth: 1.6,
          seed: 437,
          segments: 12,
          jitter: 0.2,
        });
      }

      // Loadout row 2: [ PASSIVE ] [ PASSIVE TITLE ]
      drawDoodleCard(g, {
        cx: 342,
        cy: 450,
        width: 162,
        height: 30,
        cornerRadius: 10,
        seed: 441,
        jitter: 0.6,
        fillColor: DOODLE_COLORS.paperWarm,
        strokeColor: DOODLE_COLORS.ink,
        strokeWidth: 2,
        shadowOffsetX: 1,
        shadowOffsetY: 2,
        shadowAlpha: 0.2,
      });
      drawDoodleCard(g, {
        cx: 544,
        cy: 450,
        width: 214,
        height: 30,
        cornerRadius: 10,
        seed: 445,
        jitter: 0.6,
        fillColor: DOODLE_COLORS.paperSky,
        strokeColor: DOODLE_COLORS.ink,
        strokeWidth: 2,
        shadowOffsetX: 1,
        shadowOffsetY: 2,
        shadowAlpha: 0.2,
      });
    }

    if (this.focusedHeroPreviewContainer) {
      this.focusedHeroPreviewContainer.destroy();
      this.focusedHeroPreviewContainer = null;
    }

    if (hasHeroIcon) {
      const icon = this.add.image(446, 264, iconSlot.key).setDisplaySize(86, 86);
      this.focusedHeroPreviewContainer = this.add.container(0, 0, [icon]).setDepth(3);
    }
  }

  private refreshLastRunText(): void {
    const lb: LocalLeaderboardEntry[] = this.saveData.localLeaderboard;
    if (!lb || lb.length === 0) {
      this.lastRunText.setText('Last Run: No runs yet — go fight.');
      return;
    }
    const e = lb[0];
    const totalSec = Math.floor((e.timeSurvivedMs ?? 0) / 1000);
    const timeStr = `${Math.floor(totalSec / 60)}:${(totalSec % 60).toString().padStart(2, '0')}`;
    this.lastRunText.setText(`Last Run: Score ${e.score} · LV ${e.level} (${e.classTitle}) · ${timeStr}`);
  }

  private buildHeroSummary(hero: HeroDefinition, unlocked: boolean, selected: boolean): string {
    const startingWeapon = WEAPON_DEFINITIONS[hero.startingWeaponId];
    let trait = startingWeapon.name;

    if (hero.maxHealthBonus > 0) {
      trait = `+${hero.maxHealthBonus} HP`;
    } else if (hero.moveSpeedBonus > 0) {
      trait = `+${hero.moveSpeedBonus} speed`;
    } else if (hero.pickupRangeBonus > 0) {
      trait = `+${hero.pickupRangeBonus} pickup`;
    } else if (hero.startingDamageBonus > 0) {
      trait = `+${hero.startingDamageBonus} damage`;
    } else if (hero.fireCooldownReductionMs > 0) {
      trait = `-${hero.fireCooldownReductionMs} ms cooldown`;
    }

    const status = selected ? 'Active' : !unlocked ? `Locked (${hero.unlockCost ?? 0}g)` : 'Ready';
    return `${startingWeapon.name}\n${trait} · ${status}`;
  }

  private createCardHeroPreview(
    hero: HeroDefinition,
    x: number,
    y: number,
    _cardGraphics: Phaser.GameObjects.Graphics,
  ): void {
    const iconSlot = getHeroIconAssetSlot(hero.id);
    if (shouldUseVisualAsset(this, 'heroMenuIcons', iconSlot)) {
      this.add.image(x, y, iconSlot.key).setDisplaySize(56, 56).setDepth(3);
    }
  }

  private createUiButtonIcon(
    buttonId: UiButtonAssetId,
    x: number,
    y: number,
    size: number,
  ): Phaser.GameObjects.Image | null {
    const slot = getUiButtonAssetSlot(buttonId);
    if (!shouldUseVisualAsset(this, 'uiButtons', slot)) {
      return null;
    }

    return this.add.image(x, y, slot.key).setDisplaySize(size, size).setAlpha(0.78);
  }

  private renderCodexBackButton(): void {
    if (!this.codexCloseButtonGraphics) {
      return;
    }

    const g = this.codexCloseButtonGraphics;
    g.clear();
    drawDoodleCard(g, {
      cx: 376,
      cy: 576,
      width: 188,
      height: 52,
      cornerRadius: 15,
      seed: 1681,
      jitter: 0.9,
      fillColor: this.codexCloseHovered ? DOODLE_COLORS.gold : DOODLE_COLORS.paperGold,
      strokeColor: DOODLE_COLORS.ink,
      strokeWidth: this.codexCloseHovered ? 3.2 : 2.6,
      shadowOffsetX: 2,
      shadowOffsetY: 3,
      shadowAlpha: 0.3,
    });
    drawDoodleCircle(g, {
      cx: 306,
      cy: 576,
      radius: 15,
      fillColor: DOODLE_COLORS.paperHover,
      strokeColor: DOODLE_COLORS.ink,
      strokeWidth: 2,
      seed: 1683,
      segments: 14,
      jitter: 0.35,
    });
    if (!this.codexCloseButtonIcon) {
      drawDoodleCloseX(g, 306, 576, 5.5, DOODLE_COLORS.ink);
    }
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
    const unlocked = isHeroUnlocked(this.saveData, hero.id);
    const selected = this.saveData.selectedHero === hero.id;
    const threatEntries = [
      {
        enemy: ENEMY_ARCHETYPES.skimmer,
        label: 'SCOUT THREAT',
        note: 'Strafes wide. Keep a clean lane before closing in.',
      },
      {
        enemy: ENEMY_ARCHETYPES.dreadnought,
        label: 'MINIBOSS',
        note: 'Telegraphs a line charge. Sidestep before release.',
      },
      {
        enemy: ENEMY_ARCHETYPES.behemoth,
        label: 'BOSS',
        note: 'Controls space with a shockwave ring near the end of the run.',
      },
    ];

    this.refreshCodexSectionNav();
    this.renderCodexHeaderBar();

    // Update Section 1: Focused Hero Page
    const heroIconSlot = getHeroIconAssetSlot(hero.id);
    const hasHeroIcon = Boolean(
      this.codexRunnerPortraitImage && shouldUseVisualAsset(this, 'heroMenuIcons', heroIconSlot),
    );
    if (hasHeroIcon && this.codexRunnerPortraitImage) {
      this.codexRunnerPortraitImage.setTexture(heroIconSlot.key).setVisible(true);
    } else {
      this.codexRunnerPortraitImage?.setVisible(false);
    }
    this.codexHeroBadge.setText(this.getHeroBadgeLabel(hero));
    this.codexHeroNamePlate.setText(hero.name.toUpperCase());
    this.codexHeroBody.setText(hero.description);
    const heroStatusNote = selected ? 'Active Runner' : unlocked ? 'Unlocked & Ready' : `Locked (${hero.unlockCost ?? 0}g)`;
    this.codexHeroMeta.setText(
      `Passive: ${hero.passiveLabel}\nLoadout: ${this.getHeroLoadoutSummary(hero, weapon)}\nStatus: ${heroStatusNote}`,
    );

    const runnerKey = `${hero.id}:${hasHeroIcon ? 1 : 0}`;
    if (this.codexRunnerVisualKey !== runnerKey && this.codexRunnerGraphics) {
      this.codexRunnerVisualKey = runnerKey;
      const g = this.codexRunnerGraphics;
      const palette = getHeroThemePalette(hero.id);
      g.clear();

      // Polaroid specimen frame + tape + corner monogram badge
      drawDoodleCard(g, {
        cx: 674,
        cy: 414,
        width: 204,
        height: 316,
        cornerRadius: 18,
        seed: 1841,
        jitter: 1.3,
        fillColor: DOODLE_COLORS.paperHover,
        strokeColor: DOODLE_COLORS.ink,
        strokeWidth: 2.8,
        shadowOffsetX: 3,
        shadowOffsetY: 4,
        shadowAlpha: 0.28,
      });
      drawDoodleCard(g, {
        cx: 674,
        cy: 256,
        width: 66,
        height: 20,
        cornerRadius: 5,
        seed: 1845,
        jitter: 0.5,
        fillColor: DOODLE_COLORS.paperGold,
        strokeColor: DOODLE_COLORS.ink,
        strokeWidth: 2,
        shadowOffsetX: 1,
        shadowOffsetY: 1,
        shadowAlpha: 0.2,
      });
      drawHeroPortraitMedallion(g, hero.id, 674, 358, 60, true);
      if (!hasHeroIcon) {
        drawHeroFallbackMascot(g, hero.id, 674, 358, 60);
      }
      drawDoodleCard(g, {
        cx: 602,
        cy: 282,
        width: 42,
        height: 26,
        cornerRadius: 8,
        seed: 1849,
        jitter: 0.4,
        fillColor: palette.ribbon,
        strokeColor: DOODLE_COLORS.ink,
        strokeWidth: 2,
        shadowOffsetX: 1,
        shadowOffsetY: 2,
        shadowAlpha: 0.2,
      });
      drawDoodleCard(g, {
        cx: 674,
        cy: 466,
        width: 168,
        height: 36,
        cornerRadius: 11,
        seed: 1853,
        jitter: 0.7,
        fillColor: palette.ribbon,
        strokeColor: DOODLE_COLORS.ink,
        strokeWidth: 2.4,
        shadowOffsetX: 2,
        shadowOffsetY: 2,
        shadowAlpha: 0.25,
      });

      // Right dossier boxes
      drawDoodleCard(g, {
        cx: 1062,
        cy: 304,
        width: 524,
        height: 112,
        cornerRadius: 16,
        seed: 1861,
        jitter: 1.1,
        fillColor: DOODLE_COLORS.paperWarm,
        strokeColor: DOODLE_COLORS.ink,
        strokeWidth: 2.4,
        shadowOffsetX: 2,
        shadowOffsetY: 3,
        shadowAlpha: 0.22,
      });
      drawDoodleCard(g, {
        cx: 1062,
        cy: 472,
        width: 524,
        height: 196,
        cornerRadius: 16,
        seed: 1867,
        jitter: 1.1,
        fillColor: DOODLE_COLORS.paperSky,
        strokeColor: DOODLE_COLORS.ink,
        strokeWidth: 2.4,
        shadowOffsetX: 2,
        shadowOffsetY: 3,
        shadowAlpha: 0.22,
      });
    }

    // Update Section 2: Weapon Page
    const weaponIconSlot = getWeaponIconAssetSlot(weapon.id);
    const hasWeaponIcon = Boolean(
      this.codexWeaponImage && shouldUseVisualAsset(this, 'weaponHudIcons', weaponIconSlot),
    );
    if (hasWeaponIcon && this.codexWeaponImage) {
      this.codexWeaponImage.setTexture(weaponIconSlot.key).setVisible(true);
    } else {
      this.codexWeaponImage?.setVisible(false);
    }
    this.codexWeaponBadge.setText(`${weapon.shortLabel} · ${weapon.name.toUpperCase()}`);
    this.codexWeaponBody.setText(`${weapon.name} (${hero.name} Starter)\n\n${weapon.codexSummary}`);
    this.codexWeaponStats.setText(this.getWeaponStatSummary(weapon).split('  |  ').join('\n'));

    const weaponKey = `${weapon.id}:${hasWeaponIcon ? 1 : 0}`;
    if (this.codexWeaponVisualKey !== weaponKey && this.codexWeaponGraphics) {
      this.codexWeaponVisualKey = weaponKey;
      const g = this.codexWeaponGraphics;
      g.clear();

      drawDoodleCard(g, {
        cx: 674,
        cy: 414,
        width: 204,
        height: 316,
        cornerRadius: 18,
        seed: 1901,
        jitter: 1.3,
        fillColor: DOODLE_COLORS.paperHover,
        strokeColor: DOODLE_COLORS.ink,
        strokeWidth: 2.8,
        shadowOffsetX: 3,
        shadowOffsetY: 4,
        shadowAlpha: 0.28,
      });
      drawDoodleCard(g, {
        cx: 674,
        cy: 256,
        width: 66,
        height: 20,
        cornerRadius: 5,
        seed: 1905,
        jitter: 0.5,
        fillColor: DOODLE_COLORS.paperGold,
        strokeColor: DOODLE_COLORS.ink,
        strokeWidth: 2,
        shadowOffsetX: 1,
        shadowOffsetY: 1,
        shadowAlpha: 0.2,
      });
      drawDoodleCircle(g, {
        cx: 674,
        cy: 358,
        radius: 60,
        fillColor: weapon.id === 'arc-bolt' ? DOODLE_COLORS.weaponWellDark : DOODLE_COLORS.weaponWellLight,
        strokeColor: DOODLE_COLORS.ink,
        strokeWidth: 3,
        seed: 1911,
        segments: 20,
        jitter: 0.9,
        shadowOffsetX: 2,
        shadowOffsetY: 3,
        shadowAlpha: 0.26,
      });
      if (!hasWeaponIcon) {
        drawDoodleUpgradeGlyph(g, 'weapon', weapon.id, 674, 358, weapon.projectileColor);
      }
      drawDoodleCard(g, {
        cx: 674,
        cy: 466,
        width: 176,
        height: 36,
        cornerRadius: 11,
        seed: 1917,
        jitter: 0.7,
        fillColor: DOODLE_COLORS.paperGold,
        strokeColor: DOODLE_COLORS.ink,
        strokeWidth: 2.4,
        shadowOffsetX: 2,
        shadowOffsetY: 2,
        shadowAlpha: 0.25,
      });

      drawDoodleCard(g, {
        cx: 1062,
        cy: 304,
        width: 524,
        height: 112,
        cornerRadius: 16,
        seed: 1923,
        jitter: 1.1,
        fillColor: DOODLE_COLORS.paperGold,
        strokeColor: DOODLE_COLORS.ink,
        strokeWidth: 2.4,
        shadowOffsetX: 2,
        shadowOffsetY: 3,
        shadowAlpha: 0.22,
      });
      drawDoodleCard(g, {
        cx: 1062,
        cy: 472,
        width: 524,
        height: 196,
        cornerRadius: 16,
        seed: 1929,
        jitter: 1.1,
        fillColor: DOODLE_COLORS.paperWarm,
        strokeColor: DOODLE_COLORS.ink,
        strokeWidth: 2.4,
        shadowOffsetX: 2,
        shadowOffsetY: 3,
        shadowAlpha: 0.22,
      });
    }

    // Update Section 3: Threats (3 illustrated cards)
    for (let index = 0; index < this.codexThreatTitleTexts.length; index += 1) {
      const entry = threatEntries[index];
      this.codexThreatTitleTexts[index].setText(entry.enemy.name.toUpperCase());
      this.codexThreatRoleTexts[index]?.setText(entry.label);
      this.codexThreatBodyTexts[index].setText(entry.note);
    }

    this.codexRunnerContainer.setVisible(this.activeCodexSection === 'runner');
    this.codexWeaponContainer.setVisible(this.activeCodexSection === 'weapon');
    this.codexThreatContainer.setVisible(this.activeCodexSection === 'threats');

    switch (this.activeCodexSection) {
      case 'runner':
        this.codexSectionEyebrow.setText('RUNNER ENTRY');
        this.codexSectionTitle.setText(hero.name);
        this.codexSectionSubtitle.setText(
          'Focused survivor field sheet, passive note, and starting loadout.',
        );
        break;
      case 'weapon':
        this.codexSectionEyebrow.setText('WEAPON ENTRY');
        this.codexSectionTitle.setText(weapon.name);
        this.codexSectionSubtitle.setText(
          `Starter armament entry for ${hero.name}. Exact computed telemetry below.`,
        );
        break;
      case 'threats':
        this.codexSectionEyebrow.setText('THREAT ARCHIVE');
        this.codexSectionTitle.setText('Field Threats');
        this.codexSectionSubtitle.setText(
          'Illustrated encounter notes for key enemies encountered during each run.',
        );
        break;
    }
  }

  private renderCodexHeaderBar(): void {
    const key = this.activeCodexSection;
    if (this.codexHeaderKey === key || !this.codexHeaderGraphics) {
      return;
    }
    this.codexHeaderKey = key;

    const g = this.codexHeaderGraphics;
    g.clear();
    const pillColor =
      key === 'runner'
        ? 0xdbeafe
        : key === 'weapon'
          ? DOODLE_COLORS.paperGold
          : 0xfce7f3;

    drawDoodleCard(g, {
      cx: 648,
      cy: 134,
      width: 170,
      height: 26,
      cornerRadius: 9,
      seed: 1691,
      jitter: 0.5,
      fillColor: pillColor,
      strokeColor: DOODLE_COLORS.ink,
      strokeWidth: 2,
      shadowOffsetX: 1,
      shadowOffsetY: 2,
      shadowAlpha: 0.2,
    });
    g.lineStyle(2.4, DOODLE_COLORS.ink, 0.24);
    g.lineBetween(562, 214, 1334, 214);
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
      const section = sections[index];
      const active = this.activeCodexSection === section;
      const hovered = this.codexSectionHoveredIndex === index;
      const tabGfx = this.codexSectionTabGraphics[index];
      const title = this.codexSectionTexts[index];
      const tabY = 236 + index * 102;
      const key = `${section}:${active ? 1 : 0}:${hovered ? 1 : 0}`;

      if (tabGfx && this.codexSectionTabVisualKeys[index] !== key) {
        this.codexSectionTabVisualKeys[index] = key;
        tabGfx.clear();
        drawCodexSectionTabChrome(tabGfx, section, 376, tabY, 218, 78, active, hovered);
      }

      if (title) {
        title.setColor(DOODLE_HEX.ink);
      }
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
    this.heroActionButtons = [];
    this.heroActionButtonGraphics = [];
    this.heroCardGraphics = [];
    this.heroCardVisualKeys = [];
    this.heroButtonVisualKeys = [];
    this.heroButtonHovered = [];
    this.heroInfoTexts = [];
    this.heroPanels = [];
    this.codexSectionFrames = [];
    this.codexSectionTexts = [];
    this.codexSectionTabGraphics = [];
    this.codexSectionTabVisualKeys = [];
    this.codexSectionHoveredIndex = null;
    this.codexCloseHovered = false;
    this.codexHeaderKey = '';
    this.codexRunnerVisualKey = '';
    this.codexWeaponVisualKey = '';
    this.codexRunnerPortraitImage = null;
    this.codexWeaponImage = null;
    this.codexThreatGraphics = [];
    this.codexThreatRoleTexts = [];
    this.codexThreatTitleTexts = [];
    this.codexThreatBodyTexts = [];
    this.topGoldIconImage = null;
    this.featuredHeroWeaponIconImage = null;
    this.startButtonIcon = null;
    this.codexCloseButtonIcon = null;
    this.topGuideVisualKey = '';
    this.featuredHeroVisualKey = '';
    this.bottomButtonGraphics = { start: null, upgrades: null, codex: null, lastRun: null };
  }
}
