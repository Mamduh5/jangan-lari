import Phaser from 'phaser';
import { primeAudioContext } from '../audio/audioCuePlayer';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { HERO_LIST, type HeroDefinition } from '../data/heroes';
import type { UiButtonAssetId } from '../data/assetSlots';
import { WEAPON_DEFINITIONS, WEAPON_LIST } from '../data/weapons';
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
  CODEX_CATEGORIES,
  CODEX_PAGE_SIZE,
  getCodexCategoryMeta,
  getCodexEnemyEntries,
  getCodexHeroEntries,
  getCodexPageSlice,
  getCodexWeaponEntries,
  stepCodexIndex,
  type CodexCategoryId,
  type CodexEnemyEntry,
  type CodexHeroEntry,
  type CodexStatItem,
  type CodexWeaponEntry,
} from '../ui/codexCatalog';
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
  drawCodexEnemyDoodle,
  drawCodexJournalShell,
  drawCodexPillButtonChrome,
  drawCodexSectionTabChrome,
  drawHeroFallbackMascot,
  drawHeroPortraitMedallion,
  drawJanganLariHeaderLogo,
  drawMenuBottomActionButtonChrome,
  drawMenuIslandBackdrop,
  drawMenuTopPillChrome,
  getHeroThemePalette,
} from '../ui/menuCodexArtwork';

type CodexSection = CodexCategoryId;
type CodexViewMode = 'index' | 'detail';

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
  private activeCodexSection: CodexSection = 'heroes';
  private codexViewMode: CodexViewMode = 'index';
  private codexPageByCategory: Record<CodexSection, number> = {
    heroes: 0,
    weapons: 0,
    enemies: 0,
  };
  private codexSelectedEntryIdByCategory: Record<CodexSection, string> = {
    heroes: 'runner',
    weapons: 'arc-bolt',
    enemies: 'scuttler',
  };
  private codexSectionFrames: Phaser.GameObjects.Rectangle[] = [];
  private codexSectionTexts: Phaser.GameObjects.Text[] = [];
  private codexSectionEyebrow!: Phaser.GameObjects.Text;
  private codexSectionTitle!: Phaser.GameObjects.Text;
  private codexSectionSubtitle!: Phaser.GameObjects.Text;
  private codexBackToIndexGraphics!: Phaser.GameObjects.Graphics;
  private codexBackToIndexButton!: Phaser.GameObjects.Text;
  private codexBackToIndexHovered = false;
  private codexIndexContainer!: Phaser.GameObjects.Container;
  private codexIndexGraphics!: Phaser.GameObjects.Graphics;
  private codexIndexTileHits: Phaser.GameObjects.Rectangle[] = [];
  private codexIndexTileImages: Array<Phaser.GameObjects.Image | null> = [];
  private codexIndexTileTagTexts: Phaser.GameObjects.Text[] = [];
  private codexIndexTileTitleTexts: Phaser.GameObjects.Text[] = [];
  private codexIndexTileSummaryTexts: Phaser.GameObjects.Text[] = [];
  private codexIndexTileMetaTexts: Phaser.GameObjects.Text[] = [];
  private codexIndexTileHovered: number | null = null;
  private codexPrevPageGraphics!: Phaser.GameObjects.Graphics;
  private codexNextPageGraphics!: Phaser.GameObjects.Graphics;
  private codexPrevPageButton!: Phaser.GameObjects.Text;
  private codexNextPageButton!: Phaser.GameObjects.Text;
  private codexPageIndicatorText!: Phaser.GameObjects.Text;
  private codexPrevPageHovered = false;
  private codexNextPageHovered = false;
  private codexDetailContainer!: Phaser.GameObjects.Container;
  private codexDetailGraphics!: Phaser.GameObjects.Graphics;
  private codexDetailSpecimenImage: Phaser.GameObjects.Image | null = null;
  private codexDetailSpecimenBadge!: Phaser.GameObjects.Text;
  private codexDetailSpecimenName!: Phaser.GameObjects.Text;
  private codexDetailSpecimenTag!: Phaser.GameObjects.Text;
  private codexDetailCardLabels: Phaser.GameObjects.Text[] = [];
  private codexDetailCardBodies: Phaser.GameObjects.Text[] = [];
  private codexDetailUpgradePrimaryBadge!: Phaser.GameObjects.Text;
  private codexDetailUpgradePrimaryTitle!: Phaser.GameObjects.Text;
  private codexDetailUpgradePrimaryBody!: Phaser.GameObjects.Text;
  private codexDetailUpgradeSecondaryBadge!: Phaser.GameObjects.Text;
  private codexDetailUpgradeSecondaryTitle!: Phaser.GameObjects.Text;
  private codexDetailUpgradeSecondaryBody!: Phaser.GameObjects.Text;
  private codexPrevEntryGraphics!: Phaser.GameObjects.Graphics;
  private codexNextEntryGraphics!: Phaser.GameObjects.Graphics;
  private codexPrevEntryButton!: Phaser.GameObjects.Text;
  private codexNextEntryButton!: Phaser.GameObjects.Text;
  private codexEntryIndicatorText!: Phaser.GameObjects.Text;
  private codexPrevEntryHovered = false;
  private codexNextEntryHovered = false;
  private focusedHeroId: HeroDefinition['id'] = 'runner';
  private focusedHeroStatusText!: Phaser.GameObjects.Text;
  private focusedHeroDetailName!: Phaser.GameObjects.Text;
  private focusedHeroDetailDesc!: Phaser.GameObjects.Text;
  private focusedHeroDetailWeapon!: Phaser.GameObjects.Text;
  private focusedHeroDetailPassiveTitle!: Phaser.GameObjects.Text;
  private focusedHeroDetailPassive!: Phaser.GameObjects.Text;
  private focusedHeroPreviewContainer: Phaser.GameObjects.Container | null = null;
  private lastRunText!: Phaser.GameObjects.Text;

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
    this.activeCodexSection = 'heroes';
    this.codexViewMode = 'index';
    this.codexPageByCategory = { heroes: 0, weapons: 0, enemies: 0 };
    this.codexSelectedEntryIdByCategory = {
      heroes: this.saveData.selectedHero,
      weapons: 'arc-bolt',
      enemies: 'scuttler',
    };
    this.codexBackToIndexHovered = false;
    this.codexIndexTileHits = [];
    this.codexIndexTileImages = [];
    this.codexIndexTileTagTexts = [];
    this.codexIndexTileTitleTexts = [];
    this.codexIndexTileSummaryTexts = [];
    this.codexIndexTileMetaTexts = [];
    this.codexIndexTileHovered = null;
    this.codexPrevPageHovered = false;
    this.codexNextPageHovered = false;
    this.codexDetailSpecimenImage = null;
    this.codexDetailCardLabels = [];
    this.codexDetailCardBodies = [];
    this.codexPrevEntryHovered = false;
    this.codexNextEntryHovered = false;
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

    const codexCategoryObjects: Phaser.GameObjects.GameObject[] = [];
    for (let index = 0; index < CODEX_CATEGORIES.length; index += 1) {
      const category = CODEX_CATEGORIES[index];
      const tabY = 236 + index * 102;
      const tabGfx = this.add.graphics();

      const frame = this.add
        .rectangle(376, tabY, 218, 78, DOODLE_COLORS.paper, 0)
        .setOrigin(0.5);
      const title = this.add
        .text(342, tabY - 11, category.label, {
          fontFamily: DOODLE_FONTS.display,
          fontSize: '19px',
          fontStyle: 'bold',
          color: DOODLE_HEX.ink,
        })
        .setOrigin(0, 0.5);
      const note = this.add
        .text(342, tabY + 14, `${category.count} Entries`, {
          fontFamily: DOODLE_FONTS.body,
          fontSize: '12.5px',
          fontStyle: 'bold',
          color: DOODLE_HEX.inkMuted,
        })
        .setOrigin(0, 0.5);

      frame.on('pointerdown', () => this.setActiveCodexSection(category.id));
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
      .text(656, 132, '', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '12px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
        letterSpacing: 0.9,
      })
      .setOrigin(0.5);
    this.codexSectionTitle = this.add
      .text(564, 166, '', {
        fontFamily: DOODLE_FONTS.display,
        fontSize: '29px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
      })
      .setOrigin(0, 0.5);
    this.codexSectionSubtitle = this.add
      .text(564, 197, '', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '13.5px',
        color: DOODLE_HEX.inkMuted,
        wordWrap: { width: 556 },
      })
      .setOrigin(0, 0.5);

    this.codexBackToIndexGraphics = this.add.graphics();
    this.codexBackToIndexButton = this.add
      .text(1236, 148, 'BACK TO INDEX', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '14px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
        align: 'center',
        fixedWidth: 180,
        fixedHeight: 42,
        padding: { top: 12 },
      })
      .setOrigin(0.5);
    this.codexBackToIndexButton.on('pointerdown', () => this.returnToCodexIndex());
    this.codexBackToIndexButton.on('pointerover', () => {
      this.codexBackToIndexHovered = true;
      this.renderCodexHeaderBar();
    });
    this.codexBackToIndexButton.on('pointerout', () => {
      this.codexBackToIndexHovered = false;
      this.renderCodexHeaderBar();
    });

    const firstCodexSpecimenKey =
      HERO_LIST.map((hero) => getHeroIconAssetSlot(hero.id)).find((slot) =>
        shouldUseVisualAsset(this, 'heroMenuIcons', slot),
      )?.key ??
      WEAPON_LIST.map((weapon) => getWeaponIconAssetSlot(weapon.id)).find((slot) =>
        shouldUseVisualAsset(this, 'weaponHudIcons', slot),
      )?.key ??
      null;

    // ── Codex Mode A: Library Index (2x2 paginated tiles + Prev/Next) ─────
    this.codexIndexGraphics = this.add.graphics();
    const indexObjects: Phaser.GameObjects.GameObject[] = [this.codexIndexGraphics];

    for (let index = 0; index < CODEX_PAGE_SIZE; index += 1) {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const tileCx = col === 0 ? 748 : 1146;
      const tileCy = row === 0 ? 302 : 464;
      const specimenCx = tileCx - 122;
      const textLeft = tileCx - 64;

      const hit = this.add.rectangle(tileCx, tileCy, 372, 148, DOODLE_COLORS.paper, 0).setOrigin(0.5);
      hit.on('pointerdown', () => this.handleCodexIndexTileSelect(index));
      hit.on('pointerover', () => {
        this.codexIndexTileHovered = index;
        this.renderCodexIndexView();
      });
      hit.on('pointerout', () => {
        if (this.codexIndexTileHovered === index) {
          this.codexIndexTileHovered = null;
        }
        this.renderCodexIndexView();
      });

      const img = firstCodexSpecimenKey
        ? this.add.image(specimenCx, tileCy - 4, firstCodexSpecimenKey).setDisplaySize(54, 54).setVisible(false)
        : null;
      const tag = this.add
        .text(textLeft + 92, tileCy - 48, '', {
          fontFamily: DOODLE_FONTS.body,
          fontSize: '11.5px',
          fontStyle: 'bold',
          color: DOODLE_HEX.ink,
          letterSpacing: 0.5,
        })
        .setOrigin(0.5);
      const tileTitle = this.add
        .text(textLeft, tileCy - 20, '', {
          fontFamily: DOODLE_FONTS.display,
          fontSize: '19.5px',
          fontStyle: 'bold',
          color: DOODLE_HEX.ink,
        })
        .setOrigin(0, 0.5);
      const summary = this.add
        .text(textLeft, tileCy - 2, '', {
          fontFamily: DOODLE_FONTS.body,
          fontSize: '13px',
          color: DOODLE_HEX.ink,
          wordWrap: { width: 236 },
          lineSpacing: 2,
        })
        .setOrigin(0, 0);
      const meta = this.add
        .text(textLeft, tileCy + 54, '', {
          fontFamily: DOODLE_FONTS.body,
          fontSize: '12px',
          fontStyle: 'bold',
          color: DOODLE_HEX.inkMuted,
        })
        .setOrigin(0, 0.5);

      this.codexIndexTileHits.push(hit);
      this.codexIndexTileImages.push(img);
      this.codexIndexTileTagTexts.push(tag);
      this.codexIndexTileTitleTexts.push(tileTitle);
      this.codexIndexTileSummaryTexts.push(summary);
      this.codexIndexTileMetaTexts.push(meta);
      indexObjects.push(hit);
      if (img) {
        indexObjects.push(img);
      }
      indexObjects.push(tag, tileTitle, summary, meta);
    }

    this.codexPrevPageGraphics = this.add.graphics();
    this.codexNextPageGraphics = this.add.graphics();
    this.codexPrevPageButton = this.add
      .text(656, 584, 'PREVIOUS', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '15px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
        align: 'center',
        fixedWidth: 164,
        fixedHeight: 42,
        padding: { top: 11 },
      })
      .setOrigin(0.5);
    this.codexPrevPageButton.on('pointerdown', () => this.stepCodexPage(-1));
    this.codexPrevPageButton.on('pointerover', () => {
      this.codexPrevPageHovered = true;
      this.renderCodexIndexFooter();
    });
    this.codexPrevPageButton.on('pointerout', () => {
      this.codexPrevPageHovered = false;
      this.renderCodexIndexFooter();
    });

    this.codexPageIndicatorText = this.add
      .text(948, 584, 'Page 1 / 1', {
        fontFamily: DOODLE_FONTS.display,
        fontSize: '16px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
      })
      .setOrigin(0.5);

    this.codexNextPageButton = this.add
      .text(1240, 584, 'NEXT', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '15px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
        align: 'center',
        fixedWidth: 164,
        fixedHeight: 42,
        padding: { top: 11 },
      })
      .setOrigin(0.5);
    this.codexNextPageButton.on('pointerdown', () => this.stepCodexPage(1));
    this.codexNextPageButton.on('pointerover', () => {
      this.codexNextPageHovered = true;
      this.renderCodexIndexFooter();
    });
    this.codexNextPageButton.on('pointerout', () => {
      this.codexNextPageHovered = false;
      this.renderCodexIndexFooter();
    });

    indexObjects.push(
      this.codexPrevPageGraphics,
      this.codexNextPageGraphics,
      this.codexPrevPageButton,
      this.codexPageIndicatorText,
      this.codexNextPageButton,
    );
    this.codexIndexContainer = this.add.container(0, 0, indexObjects);

    // ── Codex Mode B: Entry Detail View (specimen + info cards + Prev/Next Entry)
    this.codexDetailGraphics = this.add.graphics();
    if (firstCodexSpecimenKey) {
      this.codexDetailSpecimenImage = this.add
        .image(668, 338, firstCodexSpecimenKey)
        .setDisplaySize(82, 82)
        .setVisible(false);
    }
    this.codexDetailSpecimenBadge = this.add
      .text(602, 260, '--', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '11.5px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
      })
      .setOrigin(0.5);
    this.codexDetailSpecimenName = this.add
      .text(668, 434, '', {
        fontFamily: DOODLE_FONTS.display,
        fontSize: '18.5px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
      })
      .setOrigin(0.5);
    this.codexDetailSpecimenTag = this.add
      .text(668, 480, '', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '12px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
      })
      .setOrigin(0.5);

    const cardLabelYs = [237, 314, 396];
    const cardBodyYs = [254, 332, 415];
    const detailCardObjects: Phaser.GameObjects.GameObject[] = [];
    for (let cardIndex = 0; cardIndex < 3; cardIndex += 1) {
      const lbl = this.add
        .text(804, cardLabelYs[cardIndex], '', {
          fontFamily: DOODLE_FONTS.body,
          fontSize: '11.5px',
          fontStyle: 'bold',
          color: DOODLE_HEX.inkMuted,
          letterSpacing: 0.9,
        })
        .setOrigin(0, 0.5);
      const body = this.add
        .text(804, cardBodyYs[cardIndex], '', {
          fontFamily: DOODLE_FONTS.body,
          fontSize: cardIndex === 1 ? '14px' : '14.5px',
          fontStyle: cardIndex === 1 ? 'bold' : 'normal',
          color: DOODLE_HEX.ink,
          wordWrap: { width: 512 },
          lineSpacing: 4,
        })
        .setOrigin(0, 0);
      this.codexDetailCardLabels.push(lbl);
      this.codexDetailCardBodies.push(body);
      detailCardObjects.push(lbl, body);
    }

    this.codexDetailUpgradePrimaryBadge = this.add
      .text(854, 399, 'SIGNATURE', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '11px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
        letterSpacing: 0.6,
      })
      .setOrigin(0.5);
    this.codexDetailUpgradePrimaryTitle = this.add
      .text(916, 399, '', {
        fontFamily: DOODLE_FONTS.display,
        fontSize: '14.5px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
      })
      .setOrigin(0, 0.5);
    this.codexDetailUpgradePrimaryBody = this.add
      .text(806, 415, '', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '13.5px',
        color: DOODLE_HEX.ink,
        wordWrap: { width: 506 },
        lineSpacing: 2,
      })
      .setOrigin(0, 0);

    this.codexDetailUpgradeSecondaryBadge = this.add
      .text(854, 469, 'BRANCH', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '11px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
        letterSpacing: 0.6,
      })
      .setOrigin(0.5);
    this.codexDetailUpgradeSecondaryTitle = this.add
      .text(916, 469, '', {
        fontFamily: DOODLE_FONTS.display,
        fontSize: '14px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
      })
      .setOrigin(0, 0.5);
    this.codexDetailUpgradeSecondaryBody = this.add
      .text(806, 485, '', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '13.5px',
        color: DOODLE_HEX.ink,
        wordWrap: { width: 506 },
        lineSpacing: 2,
      })
      .setOrigin(0, 0);

    this.codexPrevEntryGraphics = this.add.graphics();
    this.codexNextEntryGraphics = this.add.graphics();
    this.codexPrevEntryButton = this.add
      .text(674, 584, 'PREVIOUS ENTRY', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '14.5px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
        align: 'center',
        fixedWidth: 200,
        fixedHeight: 42,
        padding: { top: 12 },
      })
      .setOrigin(0.5);
    this.codexPrevEntryButton.on('pointerdown', () => this.stepCodexDetailEntry(-1));
    this.codexPrevEntryButton.on('pointerover', () => {
      this.codexPrevEntryHovered = true;
      this.renderCodexDetailFooter();
    });
    this.codexPrevEntryButton.on('pointerout', () => {
      this.codexPrevEntryHovered = false;
      this.renderCodexDetailFooter();
    });

    this.codexEntryIndicatorText = this.add
      .text(948, 584, 'Entry 1 / 4', {
        fontFamily: DOODLE_FONTS.display,
        fontSize: '16px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
      })
      .setOrigin(0.5);

    this.codexNextEntryButton = this.add
      .text(1222, 584, 'NEXT ENTRY', {
        fontFamily: DOODLE_FONTS.body,
        fontSize: '14.5px',
        fontStyle: 'bold',
        color: DOODLE_HEX.ink,
        align: 'center',
        fixedWidth: 200,
        fixedHeight: 42,
        padding: { top: 12 },
      })
      .setOrigin(0.5);
    this.codexNextEntryButton.on('pointerdown', () => this.stepCodexDetailEntry(1));
    this.codexNextEntryButton.on('pointerover', () => {
      this.codexNextEntryHovered = true;
      this.renderCodexDetailFooter();
    });
    this.codexNextEntryButton.on('pointerout', () => {
      this.codexNextEntryHovered = false;
      this.renderCodexDetailFooter();
    });

    const detailObjects: Phaser.GameObjects.GameObject[] = [this.codexDetailGraphics];
    if (this.codexDetailSpecimenImage) {
      detailObjects.push(this.codexDetailSpecimenImage);
    }
    detailObjects.push(
      this.codexDetailSpecimenBadge,
      this.codexDetailSpecimenName,
      this.codexDetailSpecimenTag,
      ...detailCardObjects,
      this.codexDetailUpgradePrimaryBadge,
      this.codexDetailUpgradePrimaryTitle,
      this.codexDetailUpgradePrimaryBody,
      this.codexDetailUpgradeSecondaryBadge,
      this.codexDetailUpgradeSecondaryTitle,
      this.codexDetailUpgradeSecondaryBody,
      this.codexPrevEntryGraphics,
      this.codexNextEntryGraphics,
      this.codexPrevEntryButton,
      this.codexEntryIndicatorText,
      this.codexNextEntryButton,
    );
    this.codexDetailContainer = this.add.container(0, 0, detailObjects);
    this.codexDetailContainer.setVisible(false);

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
      this.codexBackToIndexGraphics,
      this.codexBackToIndexButton,
      this.codexIndexContainer,
      this.codexDetailContainer,
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
    this.activeCodexSection = 'heroes';
    this.codexViewMode = 'index';
    this.codexPageByCategory = { heroes: 0, weapons: 0, enemies: 0 };
    this.codexSelectedEntryIdByCategory = {
      heroes: this.saveData.selectedHero,
      weapons: 'arc-bolt',
      enemies: 'scuttler',
    };
    this.codexIndexTileHovered = null;
    this.codexBackToIndexHovered = false;
    this.codexPrevPageHovered = false;
    this.codexNextPageHovered = false;
    this.codexPrevEntryHovered = false;
    this.codexNextEntryHovered = false;
    this.setCodexControlsInteractive(true);
    this.refreshCodexView();
    this.codexOverlay.setVisible(true);
  }

  private closeCodex(): void {
    this.codexOverlayVisible = false;
    this.codexSectionHoveredIndex = null;
    this.codexCloseHovered = false;
    this.codexIndexTileHovered = null;
    this.codexBackToIndexHovered = false;
    this.codexPrevPageHovered = false;
    this.codexNextPageHovered = false;
    this.codexPrevEntryHovered = false;
    this.codexNextEntryHovered = false;
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
      this.syncCodexSubviewInteractivity();
      return;
    }

    this.codexBackdrop?.disableInteractive();
    this.codexCloseButton?.disableInteractive();
    for (const frame of this.codexSectionFrames) {
      frame.disableInteractive();
    }
    this.disableAllCodexSubviewControls();
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

  private getCurrentCodexEntries(): Array<CodexHeroEntry | CodexWeaponEntry | CodexEnemyEntry> {
    switch (this.activeCodexSection) {
      case 'heroes':
        return getCodexHeroEntries(this.saveData);
      case 'weapons':
        return getCodexWeaponEntries();
      case 'enemies':
        return getCodexEnemyEntries();
    }
  }

  private disableAllCodexSubviewControls(): void {
    this.codexBackToIndexButton?.disableInteractive();
    this.codexPrevPageButton?.disableInteractive();
    this.codexNextPageButton?.disableInteractive();
    this.codexPrevEntryButton?.disableInteractive();
    this.codexNextEntryButton?.disableInteractive();
    for (const hit of this.codexIndexTileHits) {
      hit.disableInteractive();
    }
  }

  private syncCodexSubviewInteractivity(): void {
    if (!this.codexOverlayVisible) {
      this.disableAllCodexSubviewControls();
      return;
    }

    if (this.codexViewMode === 'index') {
      const entries = this.getCurrentCodexEntries();
      const slice = getCodexPageSlice(
        entries,
        this.codexPageByCategory[this.activeCodexSection],
        CODEX_PAGE_SIZE,
      );
      this.codexBackToIndexButton?.disableInteractive();
      this.codexPrevEntryButton?.disableInteractive();
      this.codexNextEntryButton?.disableInteractive();

      for (let i = 0; i < this.codexIndexTileHits.length; i += 1) {
        const hit = this.codexIndexTileHits[i];
        if (i < slice.items.length) {
          hit.setInteractive({ useHandCursor: true });
        } else {
          hit.disableInteractive();
        }
      }
      if (slice.pageIndex > 0) {
        this.codexPrevPageButton?.setInteractive({ useHandCursor: true });
      } else {
        this.codexPrevPageButton?.disableInteractive();
      }
      if (slice.pageIndex < slice.pageCount - 1) {
        this.codexNextPageButton?.setInteractive({ useHandCursor: true });
      } else {
        this.codexNextPageButton?.disableInteractive();
      }
      return;
    }

    for (const hit of this.codexIndexTileHits) {
      hit.disableInteractive();
    }
    this.codexPrevPageButton?.disableInteractive();
    this.codexNextPageButton?.disableInteractive();
    this.codexBackToIndexButton?.setInteractive({ useHandCursor: true });
    this.codexPrevEntryButton?.setInteractive({ useHandCursor: true });
    this.codexNextEntryButton?.setInteractive({ useHandCursor: true });
  }

  private refreshCodexView(): void {
    this.refreshCodexSectionNav();
    this.codexIndexContainer.setVisible(this.codexViewMode === 'index');
    this.codexDetailContainer.setVisible(this.codexViewMode === 'detail');

    this.renderCodexHeaderBar();
    if (this.codexViewMode === 'index') {
      this.renderCodexIndexView();
    } else {
      this.renderCodexDetailView();
    }
    if (this.codexOverlayVisible) {
      this.syncCodexSubviewInteractivity();
    }
  }

  private renderCodexHeaderBar(): void {
    const meta = getCodexCategoryMeta(this.activeCodexSection);
    const isDetail = this.codexViewMode === 'detail';
    this.codexBackToIndexButton?.setVisible(isDetail);
    this.codexBackToIndexGraphics?.setVisible(isDetail);

    if (this.codexViewMode === 'index') {
      this.codexSectionEyebrow.setText(meta.eyebrow);
      this.codexSectionTitle.setText(meta.indexTitle);
      this.codexSectionSubtitle.setText(meta.indexSubtitle);
    }

    const g = this.codexHeaderGraphics;
    if (!g) {
      return;
    }
    const pillColor =
      this.activeCodexSection === 'heroes'
        ? 0xdbeafe
        : this.activeCodexSection === 'weapons'
          ? DOODLE_COLORS.paperGold
          : 0xfce7f3;

    const headerKey = `${this.activeCodexSection}:${this.codexViewMode}:${this.codexBackToIndexHovered ? 1 : 0}`;
    if (this.codexHeaderKey !== headerKey) {
      this.codexHeaderKey = headerKey;
      g.clear();
      drawDoodleCard(g, {
        cx: 656,
        cy: 132,
        width: 196,
        height: 28,
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

      if (this.codexBackToIndexGraphics) {
        this.codexBackToIndexGraphics.clear();
        if (isDetail) {
          drawCodexPillButtonChrome(
            this.codexBackToIndexGraphics,
            1236,
            148,
            180,
            42,
            DOODLE_COLORS.paperGold,
            { hovered: this.codexBackToIndexHovered, seed: 1695 },
          );
        }
      }
    }
  }

  private renderCodexIndexView(): void {
    const entries = this.getCurrentCodexEntries();
    const slice = getCodexPageSlice(
      entries,
      this.codexPageByCategory[this.activeCodexSection],
      CODEX_PAGE_SIZE,
    );
    this.codexPageByCategory[this.activeCodexSection] = slice.pageIndex;

    const g = this.codexIndexGraphics;
    g?.clear();

    for (let index = 0; index < CODEX_PAGE_SIZE; index += 1) {
      const entry = slice.items[index];
      const hit = this.codexIndexTileHits[index];
      const img = this.codexIndexTileImages[index];
      const tagText = this.codexIndexTileTagTexts[index];
      const titleText = this.codexIndexTileTitleTexts[index];
      const summaryText = this.codexIndexTileSummaryTexts[index];
      const metaText = this.codexIndexTileMetaTexts[index];

      if (!entry) {
        hit?.setVisible(false);
        img?.setVisible(false);
        tagText?.setVisible(false);
        titleText?.setVisible(false);
        summaryText?.setVisible(false);
        metaText?.setVisible(false);
        continue;
      }

      const col = index % 2;
      const row = Math.floor(index / 2);
      const tileCx = col === 0 ? 748 : 1146;
      const tileCy = row === 0 ? 302 : 464;
      const specimenCx = tileCx - 122;
      const specimenCy = tileCy - 4;
      const textLeft = tileCx - 64;
      const hovered = this.codexIndexTileHovered === index;

      hit?.setVisible(true);
      tagText?.setVisible(true);
      titleText?.setVisible(true);
      summaryText?.setVisible(true);
      metaText?.setVisible(true);

      const isSelectedHero = entry.kind === 'heroes' && entry.selected;
      const cardFill = hovered
        ? DOODLE_COLORS.paperHover
        : isSelectedHero
          ? DOODLE_COLORS.paperGold
          : DOODLE_COLORS.paper;

      if (g) {
        drawDoodleCard(g, {
          cx: tileCx,
          cy: hovered ? tileCy - 2 : tileCy,
          width: 372,
          height: 148,
          cornerRadius: 16,
          seed: 2101 + index * 19 + slice.pageIndex * 7,
          jitter: 1.0,
          fillColor: cardFill,
          strokeColor: DOODLE_COLORS.ink,
          strokeWidth: hovered || isSelectedHero ? 3 : 2.3,
          shadowOffsetX: hovered ? 3 : 2,
          shadowOffsetY: hovered ? 4 : 3,
          shadowAlpha: hovered ? 0.32 : 0.22,
        });
      }

      if (entry.kind === 'heroes') {
        const slot = getHeroIconAssetSlot(entry.id);
        const hasTex = Boolean(img && shouldUseVisualAsset(this, 'heroMenuIcons', slot));
        if (g) {
          drawHeroPortraitMedallion(g, entry.id, specimenCx, specimenCy, 38, true);
          if (!hasTex) {
            drawHeroFallbackMascot(g, entry.id, specimenCx, specimenCy, 38);
          }
          drawDoodleCard(g, {
            cx: textLeft + 92,
            cy: tileCy - 48,
            width: 184,
            height: 24,
            cornerRadius: 8,
            seed: 2141 + index * 11,
            jitter: 0.4,
            fillColor: getHeroThemePalette(entry.id).ribbon,
            strokeColor: DOODLE_COLORS.ink,
            strokeWidth: 1.8,
            shadowOffsetX: 1,
            shadowOffsetY: 1,
            shadowAlpha: 0.16,
          });
        }
        if (hasTex && img) {
          img.setTexture(slot.key).setPosition(specimenCx, specimenCy).setDisplaySize(56, 56).setVisible(true);
        } else {
          img?.setVisible(false);
        }
        tagText?.setText(entry.unlockChipLabel);
      } else if (entry.kind === 'weapons') {
        const slot = getWeaponIconAssetSlot(entry.id);
        const hasTex = Boolean(img && shouldUseVisualAsset(this, 'weaponHudIcons', slot));
        if (g) {
          drawDoodleCircle(g, {
            cx: specimenCx,
            cy: specimenCy,
            radius: 38,
            fillColor:
              entry.id === 'arc-bolt' ? DOODLE_COLORS.weaponWellDark : DOODLE_COLORS.weaponWellLight,
            strokeColor: DOODLE_COLORS.ink,
            strokeWidth: 2.5,
            seed: 2161 + index * 13,
            segments: 16,
            jitter: 0.7,
            shadowOffsetX: 2,
            shadowOffsetY: 2,
            shadowAlpha: 0.2,
          });
          if (!hasTex) {
            drawDoodleUpgradeGlyph(g, 'weapon', entry.id, specimenCx, specimenCy, entry.weapon.projectileColor);
          }
          drawDoodleCard(g, {
            cx: textLeft + 92,
            cy: tileCy - 48,
            width: 184,
            height: 24,
            cornerRadius: 8,
            seed: 2171 + index * 11,
            jitter: 0.4,
            fillColor: DOODLE_COLORS.paperGold,
            strokeColor: DOODLE_COLORS.ink,
            strokeWidth: 1.8,
            shadowOffsetX: 1,
            shadowOffsetY: 1,
            shadowAlpha: 0.16,
          });
        }
        if (hasTex && img) {
          img.setTexture(slot.key).setPosition(specimenCx, specimenCy).setDisplaySize(50, 50).setVisible(true);
        } else {
          img?.setVisible(false);
        }
        tagText?.setText(entry.originTag);
      } else {
        img?.setVisible(false);
        if (g) {
          drawCodexEnemyDoodle(g, entry.id, specimenCx, specimenCy, 32);
          const pillFill =
            entry.tier === 'Boss'
              ? 0xfecaca
              : entry.tier === 'Miniboss'
                ? 0xfbcfe8
                : entry.tier === 'Elite'
                  ? 0xe9d5ff
                  : DOODLE_COLORS.paperWarm;
          drawDoodleCard(g, {
            cx: textLeft + 92,
            cy: tileCy - 48,
            width: 184,
            height: 24,
            cornerRadius: 8,
            seed: 2191 + index * 11,
            jitter: 0.4,
            fillColor: pillFill,
            strokeColor: DOODLE_COLORS.ink,
            strokeWidth: 1.8,
            shadowOffsetX: 1,
            shadowOffsetY: 1,
            shadowAlpha: 0.16,
          });
        }
        tagText?.setText(entry.roleTag);
      }

      titleText?.setText(entry.name);
      summaryText?.setText(this.truncateCodexSnippet(entry.tileSummary, 64));
      metaText?.setText(entry.tileStats);
    }

    this.codexPageIndicatorText?.setText(`Page ${slice.pageIndex + 1} / ${slice.pageCount}`);
    this.renderCodexIndexFooter();
  }

  private renderCodexIndexFooter(): void {
    const entries = this.getCurrentCodexEntries();
    const slice = getCodexPageSlice(
      entries,
      this.codexPageByCategory[this.activeCodexSection],
      CODEX_PAGE_SIZE,
    );
    const canPrev = slice.pageIndex > 0;
    const canNext = slice.pageIndex < slice.pageCount - 1;

    if (this.codexPrevPageGraphics) {
      this.codexPrevPageGraphics.clear();
      drawCodexPillButtonChrome(this.codexPrevPageGraphics, 656, 584, 164, 42, DOODLE_COLORS.paper, {
        hovered: canPrev && this.codexPrevPageHovered,
        disabled: !canPrev,
        hoverFillColor: DOODLE_COLORS.paperGold,
        seed: 2211,
      });
    }
    if (this.codexNextPageGraphics) {
      this.codexNextPageGraphics.clear();
      drawCodexPillButtonChrome(this.codexNextPageGraphics, 1240, 584, 164, 42, DOODLE_COLORS.paper, {
        hovered: canNext && this.codexNextPageHovered,
        disabled: !canNext,
        hoverFillColor: DOODLE_COLORS.paperGold,
        seed: 2219,
      });
    }
    this.codexPrevPageButton?.setColor(canPrev ? DOODLE_HEX.ink : DOODLE_HEX.inkMuted);
    this.codexNextPageButton?.setColor(canNext ? DOODLE_HEX.ink : DOODLE_HEX.inkMuted);
  }

  private renderCodexDetailView(): void {
    const entries = this.getCurrentCodexEntries();
    const selectedId = this.codexSelectedEntryIdByCategory[this.activeCodexSection];
    let entryIndex = entries.findIndex((entry) => entry.id === selectedId);
    if (entryIndex < 0) {
      entryIndex = 0;
    }
    const entry = entries[entryIndex];
    this.codexSelectedEntryIdByCategory[this.activeCodexSection] = entry.id;

    const g = this.codexDetailGraphics;
    g?.clear();

    // Left Polaroid Specimen Frame (x: 565..771, cy = 382)
    if (g) {
      drawDoodleCard(g, {
        cx: 668,
        cy: 382,
        width: 206,
        height: 304,
        cornerRadius: 18,
        seed: 2301,
        jitter: 1.2,
        fillColor: DOODLE_COLORS.paperHover,
        strokeColor: DOODLE_COLORS.ink,
        strokeWidth: 2.8,
        shadowOffsetX: 3,
        shadowOffsetY: 4,
        shadowAlpha: 0.28,
      });
      drawDoodleCard(g, {
        cx: 668,
        cy: 230,
        width: 68,
        height: 20,
        cornerRadius: 5,
        seed: 2305,
        jitter: 0.5,
        fillColor: DOODLE_COLORS.paperGold,
        strokeColor: DOODLE_COLORS.ink,
        strokeWidth: 2,
        shadowOffsetX: 1,
        shadowOffsetY: 1,
        shadowAlpha: 0.2,
      });
    }

    let badgeRibbonFill: number = DOODLE_COLORS.paperGold;
    let badgeText = '--';
    let tagPillText = '';

    if (entry.kind === 'heroes') {
      const palette = getHeroThemePalette(entry.id);
      badgeRibbonFill = palette.ribbon;
      badgeText = entry.badgeLabel;
      tagPillText = entry.unlockChipLabel;

      const slot = getHeroIconAssetSlot(entry.id);
      const hasTex = Boolean(
        this.codexDetailSpecimenImage && shouldUseVisualAsset(this, 'heroMenuIcons', slot),
      );
      if (g) {
        drawHeroPortraitMedallion(g, entry.id, 668, 338, 56, true);
        if (!hasTex) {
          drawHeroFallbackMascot(g, entry.id, 668, 338, 56);
        }
      }
      if (hasTex && this.codexDetailSpecimenImage) {
        this.codexDetailSpecimenImage
          .setTexture(slot.key)
          .setPosition(668, 338)
          .setDisplaySize(82, 82)
          .setVisible(true);
      } else {
        this.codexDetailSpecimenImage?.setVisible(false);
      }

      this.codexSectionEyebrow.setText('HERO ENTRY');
      this.codexSectionTitle.setText(entry.name);
      this.codexSectionSubtitle.setText(
        `Playable runner profile — ${entry.startingWeaponName} starter loadout.`,
      );

      if (g) {
        this.drawDetailRightCards(g, DOODLE_COLORS.paperGold, 0xecfdf5, DOODLE_COLORS.paperWarm);
      }

      this.setWeaponUpgradesVisible(false);
      this.codexDetailCardLabels[0]?.setText('HERO OVERVIEW');
      this.codexDetailCardBodies[0]?.setText(entry.description);
      this.codexDetailCardLabels[1]?.setText(`PASSIVE TRAIT · ${entry.passiveTitle.toUpperCase()}`);
      this.codexDetailCardBodies[1]?.setText(entry.passiveDetail);
      this.codexDetailCardLabels[2]?.setText('STARTING LOADOUT & UNLOCK STATUS');
      const modifierSummary =
        entry.statModifiers.length > 0
          ? entry.statModifiers.map((m) => `${m.label}: ${m.value}`).join('  |  ')
          : 'No passive stat overrides.';
      this.codexDetailCardBodies[2]?.setText(
        `Starter Weapon: ${entry.startingWeaponName}\nModifiers: ${modifierSummary}\nUnlock Status: ${entry.unlockStatusText}`,
      );
    } else if (entry.kind === 'weapons') {
      badgeRibbonFill = DOODLE_COLORS.paperGold;
      badgeText = entry.shortLabel;
      tagPillText = entry.originTag;

      const slot = getWeaponIconAssetSlot(entry.id);
      const hasTex = Boolean(
        this.codexDetailSpecimenImage && shouldUseVisualAsset(this, 'weaponHudIcons', slot),
      );
      if (g) {
        drawDoodleCircle(g, {
          cx: 668,
          cy: 338,
          radius: 56,
          fillColor:
            entry.id === 'arc-bolt' ? DOODLE_COLORS.weaponWellDark : DOODLE_COLORS.weaponWellLight,
          strokeColor: DOODLE_COLORS.ink,
          strokeWidth: 3,
          seed: 2321,
          segments: 20,
          jitter: 0.9,
          shadowOffsetX: 2,
          shadowOffsetY: 3,
          shadowAlpha: 0.25,
        });
        if (!hasTex) {
          drawDoodleUpgradeGlyph(g, 'weapon', entry.id, 668, 338, entry.weapon.projectileColor);
        }
      }
      if (hasTex && this.codexDetailSpecimenImage) {
        this.codexDetailSpecimenImage
          .setTexture(slot.key)
          .setPosition(668, 338)
          .setDisplaySize(72, 72)
          .setVisible(true);
      } else {
        this.codexDetailSpecimenImage?.setVisible(false);
      }

      this.codexSectionEyebrow.setText('WEAPON ENTRY');
      this.codexSectionTitle.setText(entry.name);
      this.codexSectionSubtitle.setText(entry.originNote);

      if (g) {
        this.drawDetailRightCards(g, DOODLE_COLORS.paperGold, DOODLE_COLORS.paperHover, DOODLE_COLORS.paperWarm);
        // Sub-panels inside Card 2 for Signature & Branch upgrades
        drawDoodleCard(g, {
          cx: 1059,
          cy: 420,
          width: 522,
          height: 62,
          cornerRadius: 11,
          seed: 2351,
          jitter: 0.7,
          fillColor: 0xdbeafe,
          strokeColor: DOODLE_COLORS.ink,
          strokeWidth: 2,
          shadowOffsetX: 1,
          shadowOffsetY: 2,
          shadowAlpha: 0.16,
        });
        drawDoodleCard(g, {
          cx: 854,
          cy: 399,
          width: 104,
          height: 21,
          cornerRadius: 7,
          seed: 2353,
          jitter: 0.35,
          fillColor: DOODLE_COLORS.paperGold,
          strokeColor: DOODLE_COLORS.ink,
          strokeWidth: 1.7,
          shadowOffsetX: 0,
          shadowOffsetY: 0,
          shadowAlpha: 0,
        });

        drawDoodleCard(g, {
          cx: 1059,
          cy: 491,
          width: 522,
          height: 64,
          cornerRadius: 11,
          seed: 2357,
          jitter: 0.7,
          fillColor: entry.branchUpgrades.length > 0 ? 0xf3e8ff : DOODLE_COLORS.paper,
          strokeColor: DOODLE_COLORS.ink,
          strokeWidth: 2,
          shadowOffsetX: 1,
          shadowOffsetY: 2,
          shadowAlpha: 0.16,
        });
        drawDoodleCard(g, {
          cx: 854,
          cy: 469,
          width: 104,
          height: 21,
          cornerRadius: 7,
          seed: 2359,
          jitter: 0.35,
          fillColor: 0xe9d5ff,
          strokeColor: DOODLE_COLORS.ink,
          strokeWidth: 1.7,
          shadowOffsetX: 0,
          shadowOffsetY: 0,
          shadowAlpha: 0,
        });
      }

      this.codexDetailCardLabels[0]?.setText('WEAPON BRIEF');
      this.codexDetailCardBodies[0]?.setText(entry.codexSummary);
      this.codexDetailCardLabels[1]?.setText('BASE WEAPON STATS');
      this.codexDetailCardBodies[1]?.setText(this.formatStatGrid(entry.baseStats, 4));
      this.setWeaponUpgradesVisible(true);

      const sig = entry.signatureUpgrades[0];
      if (sig) {
        this.codexDetailUpgradePrimaryTitle.setText(sig.title);
        this.codexDetailUpgradePrimaryBody.setText(sig.description);
      } else {
        this.codexDetailUpgradePrimaryTitle.setText('None available');
        this.codexDetailUpgradePrimaryBody.setText('No signature upgrade defined for this weapon.');
      }

      const branch = entry.branchUpgrades[0];
      if (branch) {
        const prereq = branch.prerequisiteLabel ? ` (${branch.prerequisiteLabel})` : '';
        this.codexDetailUpgradeSecondaryTitle.setText(`${branch.title}${prereq}`);
        this.codexDetailUpgradeSecondaryBody.setText(branch.description);
        this.codexDetailUpgradeSecondaryBody.setColor(DOODLE_HEX.ink);
      } else {
        this.codexDetailUpgradeSecondaryTitle.setText('No branch upgrade in current pool');
        this.codexDetailUpgradeSecondaryBody.setText(
          'Only signature upgrades exist for this weapon in the current upgrade pool.',
        );
        this.codexDetailUpgradeSecondaryBody.setColor(DOODLE_HEX.inkMuted);
      }
    } else {
      badgeRibbonFill =
        entry.tier === 'Boss'
          ? 0xfecaca
          : entry.tier === 'Miniboss'
            ? 0xfbcfe8
            : entry.tier === 'Elite'
              ? 0xe9d5ff
              : 0xe0f2fe;
      badgeText =
        entry.tier === 'Miniboss' ? 'MINI' : entry.tier === 'Boss' ? 'BOSS' : entry.tierUpper;
      tagPillText = entry.roleTag;

      this.codexDetailSpecimenImage?.setVisible(false);
      if (g) {
        drawCodexEnemyDoodle(g, entry.id, 668, 338, 45);
      }

      this.codexSectionEyebrow.setText('ENEMY ENTRY');
      this.codexSectionTitle.setText(entry.name);
      this.codexSectionSubtitle.setText(
        `${entry.tier} threat — ${entry.behaviorLabel}. Base stats scale over time.`,
      );

      if (g) {
        this.drawDetailRightCards(g, 0xfff1f2, DOODLE_COLORS.paperWarm, DOODLE_COLORS.paperHover);
      }

      this.setWeaponUpgradesVisible(false);
      this.codexDetailCardLabels[0]?.setText(`${entry.tierUpper} ARCHETYPE · ${entry.behaviorLabel.toUpperCase()}`);
      this.codexDetailCardBodies[0]?.setText(entry.summary);
      this.codexDetailCardLabels[1]?.setText('BASE COMBAT STATS (SCALE WITH RUN TIME)');
      const baseLine = this.formatStatGrid(entry.baseStats, 4);
      const specialLine =
        entry.specialStats.length > 0 ? `\n${this.formatStatGrid(entry.specialStats, 3)}` : '';
      this.codexDetailCardBodies[1]?.setText(`${baseLine}${specialLine}`);
      this.codexDetailCardLabels[2]?.setText('COMBAT BEHAVIOR & NOTES');
      this.codexDetailCardBodies[2]?.setText(`${entry.mechanicsNote}\n\n${entry.scalingNote}`);
    }

    if (g) {
      drawDoodleCard(g, {
        cx: 602,
        cy: 260,
        width: 58,
        height: 24,
        cornerRadius: 8,
        seed: 2331,
        jitter: 0.4,
        fillColor: badgeRibbonFill,
        strokeColor: DOODLE_COLORS.ink,
        strokeWidth: 2,
        shadowOffsetX: 1,
        shadowOffsetY: 2,
        shadowAlpha: 0.2,
      });
      drawDoodleCard(g, {
        cx: 668,
        cy: 480,
        width: 180,
        height: 34,
        cornerRadius: 11,
        seed: 2335,
        jitter: 0.7,
        fillColor: badgeRibbonFill,
        strokeColor: DOODLE_COLORS.ink,
        strokeWidth: 2.3,
        shadowOffsetX: 2,
        shadowOffsetY: 2,
        shadowAlpha: 0.24,
      });
    }

    this.codexDetailSpecimenBadge.setText(badgeText);
    this.codexDetailSpecimenName.setText(entry.name.toUpperCase());
    this.codexDetailSpecimenTag.setText(tagPillText);
    this.codexEntryIndicatorText.setText(`Entry ${entryIndex + 1} / ${entries.length}`);
    this.renderCodexDetailFooter();
  }

  private drawDetailRightCards(
    g: Phaser.GameObjects.Graphics,
    topFill: number,
    midFill: number,
    bottomFill: number,
  ): void {
    drawDoodleCard(g, {
      cx: 1059,
      cy: 259,
      width: 546,
      height: 70,
      cornerRadius: 15,
      seed: 2341,
      jitter: 1.0,
      fillColor: topFill,
      strokeColor: DOODLE_COLORS.ink,
      strokeWidth: 2.3,
      shadowOffsetX: 2,
      shadowOffsetY: 2,
      shadowAlpha: 0.2,
    });
    drawDoodleCard(g, {
      cx: 1059,
      cy: 337,
      width: 546,
      height: 74,
      cornerRadius: 15,
      seed: 2345,
      jitter: 1.0,
      fillColor: midFill,
      strokeColor: DOODLE_COLORS.ink,
      strokeWidth: 2.3,
      shadowOffsetX: 2,
      shadowOffsetY: 2,
      shadowAlpha: 0.2,
    });
    drawDoodleCard(g, {
      cx: 1059,
      cy: 456,
      width: 546,
      height: 152,
      cornerRadius: 15,
      seed: 2349,
      jitter: 1.0,
      fillColor: bottomFill,
      strokeColor: DOODLE_COLORS.ink,
      strokeWidth: 2.3,
      shadowOffsetX: 2,
      shadowOffsetY: 3,
      shadowAlpha: 0.2,
    });
  }

  private setWeaponUpgradesVisible(isWeapon: boolean): void {
    this.codexDetailCardLabels[2]?.setVisible(!isWeapon);
    this.codexDetailCardBodies[2]?.setVisible(!isWeapon);
    this.codexDetailUpgradePrimaryBadge?.setVisible(isWeapon);
    this.codexDetailUpgradePrimaryTitle?.setVisible(isWeapon);
    this.codexDetailUpgradePrimaryBody?.setVisible(isWeapon);
    this.codexDetailUpgradeSecondaryBadge?.setVisible(isWeapon);
    this.codexDetailUpgradeSecondaryTitle?.setVisible(isWeapon);
    this.codexDetailUpgradeSecondaryBody?.setVisible(isWeapon);
  }

  private renderCodexDetailFooter(): void {
    if (this.codexPrevEntryGraphics) {
      this.codexPrevEntryGraphics.clear();
      drawCodexPillButtonChrome(this.codexPrevEntryGraphics, 674, 584, 200, 42, DOODLE_COLORS.paper, {
        hovered: this.codexPrevEntryHovered,
        hoverFillColor: DOODLE_COLORS.paperGold,
        seed: 2381,
      });
    }
    if (this.codexNextEntryGraphics) {
      this.codexNextEntryGraphics.clear();
      drawCodexPillButtonChrome(this.codexNextEntryGraphics, 1222, 584, 200, 42, DOODLE_COLORS.paper, {
        hovered: this.codexNextEntryHovered,
        hoverFillColor: DOODLE_COLORS.paperGold,
        seed: 2389,
      });
    }
  }

  private setActiveCodexSection(section: CodexSection): void {
    if (this.activeCodexSection === section && this.codexViewMode === 'index') {
      return;
    }

    this.activeCodexSection = section;
    this.codexViewMode = 'index';
    this.codexIndexTileHovered = null;
    this.refreshCodexView();
  }

  private handleCodexIndexTileSelect(slotIndex: number): void {
    const entries = this.getCurrentCodexEntries();
    const slice = getCodexPageSlice(
      entries,
      this.codexPageByCategory[this.activeCodexSection],
      CODEX_PAGE_SIZE,
    );
    const chosen = slice.items[slotIndex];
    if (!chosen) {
      return;
    }
    this.codexSelectedEntryIdByCategory[this.activeCodexSection] = chosen.id;
    this.codexViewMode = 'detail';
    this.codexIndexTileHovered = null;
    this.refreshCodexView();
  }

  private returnToCodexIndex(): void {
    if (this.codexViewMode === 'index') {
      return;
    }
    this.codexViewMode = 'index';
    this.codexBackToIndexHovered = false;
    this.codexPrevEntryHovered = false;
    this.codexNextEntryHovered = false;
    this.refreshCodexView();
  }

  private stepCodexPage(delta: -1 | 1): void {
    const entries = this.getCurrentCodexEntries();
    const pageCount = getCodexPageSlice(entries, 0, CODEX_PAGE_SIZE).pageCount;
    const currentPage = this.codexPageByCategory[this.activeCodexSection];
    const nextPage = Math.max(0, Math.min(pageCount - 1, currentPage + delta));
    if (nextPage === currentPage) {
      return;
    }
    this.codexPageByCategory[this.activeCodexSection] = nextPage;
    this.codexIndexTileHovered = null;
    this.refreshCodexView();
  }

  private stepCodexDetailEntry(delta: -1 | 1): void {
    const entries = this.getCurrentCodexEntries();
    if (entries.length === 0) {
      return;
    }
    const currentId = this.codexSelectedEntryIdByCategory[this.activeCodexSection];
    const currentIndex = Math.max(
      0,
      entries.findIndex((entry) => entry.id === currentId),
    );
    const nextIndex = stepCodexIndex(currentIndex, delta, entries.length);
    this.codexSelectedEntryIdByCategory[this.activeCodexSection] = entries[nextIndex].id;
    this.codexPageByCategory[this.activeCodexSection] = Math.floor(nextIndex / CODEX_PAGE_SIZE);
    this.refreshCodexView();
  }

  private truncateCodexSnippet(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    const sliced = text.slice(0, maxLength - 3);
    const lastSpace = sliced.lastIndexOf(' ');
    const base = lastSpace > maxLength * 0.55 ? sliced.slice(0, lastSpace) : sliced;
    return `${base}...`;
  }

  private formatStatGrid(stats: CodexStatItem[], perRow: number): string {
    const lines: string[] = [];
    for (let i = 0; i < stats.length; i += perRow) {
      lines.push(
        stats
          .slice(i, i + perRow)
          .map((item) => `${item.label}: ${item.value}`)
          .join('  |  '),
      );
    }
    return lines.join('\n');
  }

  private refreshCodexSectionNav(): void {
    for (let index = 0; index < CODEX_CATEGORIES.length; index += 1) {
      const section = CODEX_CATEGORIES[index].id;
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
    this.codexBackToIndexHovered = false;
    this.codexIndexTileHits = [];
    this.codexIndexTileImages = [];
    this.codexIndexTileTagTexts = [];
    this.codexIndexTileTitleTexts = [];
    this.codexIndexTileSummaryTexts = [];
    this.codexIndexTileMetaTexts = [];
    this.codexIndexTileHovered = null;
    this.codexPrevPageHovered = false;
    this.codexNextPageHovered = false;
    this.codexDetailSpecimenImage = null;
    this.codexDetailCardLabels = [];
    this.codexDetailCardBodies = [];
    this.codexPrevEntryHovered = false;
    this.codexNextEntryHovered = false;
    this.topGoldIconImage = null;
    this.featuredHeroWeaponIconImage = null;
    this.startButtonIcon = null;
    this.codexCloseButtonIcon = null;
    this.topGuideVisualKey = '';
    this.featuredHeroVisualKey = '';
    this.bottomButtonGraphics = { start: null, upgrades: null, codex: null, lastRun: null };
  }
}
