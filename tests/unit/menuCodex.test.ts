import { afterEach, describe, expect, test, vi } from 'vitest';
import { ENEMY_ARCHETYPES } from '../../src/game/data/enemies';
import { HEROES, HERO_LIST } from '../../src/game/data/heroes';
import { WEAPON_DEFINITIONS } from '../../src/game/data/weapons';
import { createDefaultSaveData, writeGameSave, type GameSaveData } from '../../src/game/save/saveData';

vi.mock('../../src/game/audio/audioCuePlayer', () => ({
  primeAudioContext: vi.fn(),
}));

vi.mock('phaser', () => {
  class MockGraphics {
    visible = true;
    depth = 0;
    setInteractive = vi.fn().mockReturnThis();
    setDepth(depth: number) { this.depth = depth; return this; }
    setVisible(visible: boolean) { this.visible = visible; return this; }
    clear() { return this; }
    fillStyle() { return this; }
    fillRect() { return this; }
    fillPoints() { return this; }
    lineStyle() { return this; }
    strokePoints() { return this; }
    lineBetween() { return this; }
  }

  class MockText {
    text: string;
    x: number;
    y: number;
    width = 180;
    height = 44;
    displayWidth = 180;
    displayHeight = 44;
    visible = true;
    depth = 0;
    style: Record<string, unknown>;
    scene: unknown = {};
    input: { enabled: boolean } | null = null;
    private listeners = new Map<string, Array<(...args: unknown[]) => void>>();

    constructor(x: number, y: number, text: string, style: Record<string, unknown> = {}) {
      this.x = x;
      this.y = y;
      this.text = text;
      this.style = { ...style };
      if (typeof style.fixedWidth === 'number') {
        this.width = style.fixedWidth;
        this.displayWidth = style.fixedWidth;
      }
      if (typeof style.fixedHeight === 'number') {
        this.height = style.fixedHeight;
        this.displayHeight = style.fixedHeight;
      }
    }

    setOrigin() { return this; }
    setDepth(depth: number) { this.depth = depth; return this; }
    setVisible(visible: boolean) { this.visible = visible; return this; }
    setText(next: string) { this.text = next; return this; }
    setColor(color: string) { this.style.color = color; return this; }
    setInteractive() {
      if (!this.scene) throw new TypeError("Cannot read properties of undefined (reading 'sys')");
      this.input = { enabled: true };
      return this;
    }
    disableInteractive() { if (this.input) this.input.enabled = false; return this; }
    on(event: string, cb: (...args: unknown[]) => void) {
      const list = this.listeners.get(event) ?? [];
      list.push(cb);
      this.listeners.set(event, list);
      return this;
    }
    emit(event: string, ...args: unknown[]) {
      for (const cb of this.listeners.get(event) ?? []) {
        cb(...args);
      }
      return true;
    }
  }

  class MockShape {
    x: number;
    y: number;
    width: number;
    height: number;
    visible = true;
    depth = 0;
    scene: unknown = {};
    input: { enabled: boolean } | null = null;
    setInteractive = vi.fn(() => {
      if (!this.scene) throw new TypeError("Cannot read properties of undefined (reading 'sys')");
      this.input = { enabled: true };
      return this;
    });
    private listeners = new Map<string, Array<(...args: unknown[]) => void>>();

    constructor(x: number, y: number, width: number, height: number) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
    }

    setOrigin() { return this; }
    setDepth(depth: number) { this.depth = depth; return this; }
    setVisible(visible: boolean) { this.visible = visible; return this; }
    disableInteractive() { if (this.input) this.input.enabled = false; return this; }
    on(event: string, cb: (...args: unknown[]) => void) {
      const list = this.listeners.get(event) ?? [];
      list.push(cb);
      this.listeners.set(event, list);
      return this;
    }
    emit(event: string, ...args: unknown[]) {
      for (const cb of this.listeners.get(event) ?? []) {
        cb(...args);
      }
      return true;
    }
  }

  class MockImage {
    x: number;
    y: number;
    textureKey: string;
    visible = true;
    alpha = 1;
    depth = 0;
    setInteractive = vi.fn().mockReturnThis();

    constructor(x: number, y: number, textureKey: string) {
      this.x = x;
      this.y = y;
      this.textureKey = textureKey;
    }

    setDisplaySize() { return this; }
    setAlpha(alpha: number) { this.alpha = alpha; return this; }
    setDepth(depth: number) { this.depth = depth; return this; }
    setPosition(x: number, y: number) { this.x = x; this.y = y; return this; }
    setVisible(visible: boolean) { this.visible = visible; return this; }
    setTexture(key: string) { this.textureKey = key; return this; }
  }

  class MockContainer {
    x: number;
    y: number;
    visible = true;
    depth = 0;
    children: unknown[];

    constructor(x: number, y: number, children: unknown[] = []) {
      this.x = x;
      this.y = y;
      this.children = children;
    }

    setDepth(depth: number) { this.depth = depth; return this; }
    setVisible(visible: boolean) { this.visible = visible; return this; }
    destroy() { this.children = []; }
  }

  class MockScene {
    createdObjects: Array<{ scene?: unknown }> = [];
    cameras = { main: { setBackgroundColor: vi.fn() } };
    textures = { exists: vi.fn(() => true) };
    scale = { displaySize: { width: 1600, height: 720 } };
    private shutdownListeners: Array<{ cb: () => void; ctx: unknown }> = [];
    events = {
      once: vi.fn((event: string, cb: () => void, ctx?: unknown) => {
        if (event === 'shutdown') {
          this.shutdownListeners.push({ cb, ctx });
        }
      }),
      off: vi.fn(),
      emitShutdown: () => {
        const list = [...this.shutdownListeners];
        this.shutdownListeners = [];
        for (const obj of this.createdObjects) {
          obj.scene = undefined;
        }
        for (const entry of list) {
          entry.cb.call(entry.ctx);
        }
      },
    };
    scene = {
      isActive: vi.fn(() => false),
      stop: vi.fn(),
      start: vi.fn(),
      launch: vi.fn(),
    };
    private keyboardListeners = new Map<string, Array<{ cb: () => void; ctx: unknown }>>();
    input = {
      keyboard: {
        on: vi.fn((event: string, cb: () => void, ctx?: unknown) => {
          const list = this.keyboardListeners.get(event) ?? [];
          list.push({ cb, ctx });
          this.keyboardListeners.set(event, list);
        }),
        off: vi.fn((event: string, cb: () => void, ctx?: unknown) => {
          const list = this.keyboardListeners.get(event) ?? [];
          this.keyboardListeners.set(
            event,
            list.filter((entry) => entry.cb !== cb || entry.ctx !== ctx),
          );
        }),
        emit: (event: string) => {
          for (const entry of [...(this.keyboardListeners.get(event) ?? [])]) {
            entry.cb.call(entry.ctx);
          }
        },
        listenerCount: (event: string) => (this.keyboardListeners.get(event) ?? []).length,
      },
    };
    add = {
      graphics: vi.fn(() => new MockGraphics()),
      text: vi.fn((x: number, y: number, text: string, style?: Record<string, unknown>) => {
        const txt = new MockText(x, y, text, style);
        this.createdObjects.push(txt);
        return txt;
      }),
      rectangle: vi.fn((x: number, y: number, w: number, h: number) => {
        const rect = new MockShape(x, y, w, h);
        this.createdObjects.push(rect);
        return rect;
      }),
      image: vi.fn((x: number, y: number, key: string) => new MockImage(x, y, key)),
      container: vi.fn((x: number, y: number, children?: unknown[]) => new MockContainer(x, y, children)),
    };
  }

  return {
    default: {
      Scene: MockScene,
      Scenes: { Events: { SHUTDOWN: 'shutdown' } },
      GameObjects: {
        Graphics: MockGraphics,
        Text: MockText,
        Rectangle: MockShape,
        Image: MockImage,
        Container: MockContainer,
      },
    },
  };
});

import { MenuScene } from '../../src/game/scenes/MenuScene';

function createMenuFixture(options: { save?: Partial<GameSaveData>; texturesExist?: boolean } = {}) {
  window.localStorage.clear();
  const baseSave = createDefaultSaveData();
  writeGameSave({
    ...baseSave,
    totalGold: 150,
    bestScore: 2800,
    ...options.save,
  });

  const scene = new MenuScene();
  const texturesExist = options.texturesExist ?? true;
  (scene.textures.exists as ReturnType<typeof vi.fn>).mockImplementation(() => texturesExist);
  scene.create();
  return scene;
}

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('MenuScene R3G-D1 main menu and hero selection', () => {
  test('renders all four real heroes, preserves distinct focus vs selected state, and reflects save data counters', () => {
    const scene = createMenuFixture({
      save: {
        totalGold: 150,
        bestScore: 2800,
        selectedHero: 'runner',
        unlockedHeroes: ['runner', 'vanguard'],
        localLeaderboard: [
          { id: 'r1', score: 2450, level: 7, classId: 'twin', classTitle: 'Twin', kills: 60, timeSurvivedMs: 194_000, timestamp: 1700000000000 },
        ],
      },
    });

    const internals = scene as unknown as {
      goldText: { text: string };
      bestScoreText: { text: string };
      lastRunText: { text: string };
      focusedHeroDetailName: { text: string };
      focusedHeroDetailWeapon: { text: string };
      focusedHeroDetailPassive: { text: string };
      focusedHeroStatusText: { text: string };
      heroPanels: Array<{ emit: (e: string) => void }>;
      heroActionButtons: Array<{ text: string; emit: (e: string) => void }>;
      heroInfoTexts: Array<{ text: string }>;
      heroCardVisualKeys: string[];
      saveData: GameSaveData;
    };

    expect(internals.goldText.text).toBe('GOLD 150');
    expect(internals.bestScoreText.text).toBe('BEST 2800');
    expect(internals.lastRunText.text).toBe('Last Run: Score 2450 · LV 7 (Twin) · 3:14');

    expect(internals.heroActionButtons.map((b) => b.text)).toEqual([
      'SELECTED',
      'SELECT',
      `UNLOCK ${HEROES.shade.unlockCost}g`,
      `UNLOCK ${HEROES.verdant.unlockCost}g`,
    ]);
    expect(internals.heroInfoTexts[1].text).toContain('Ember Lance');
    expect(internals.heroInfoTexts[1].text).toContain('+35 HP');

    // Focusing Vanguard updates left showcase without changing saved selectedHero
    internals.heroPanels[1].emit('pointerdown');
    expect(internals.focusedHeroDetailName.text).toBe('VANGUARD');
    expect(internals.focusedHeroDetailWeapon.text).toBe('EMBER LANCE');
    expect(internals.focusedHeroDetailPassive.text).toBe(HEROES.vanguard.passiveLabel);
    expect(internals.focusedHeroStatusText.text).toBe('UNLOCKED');
    expect(internals.saveData.selectedHero).toBe('runner');
    expect(internals.heroActionButtons[0].text).toBe('SELECTED');

    // Focus Shade (locked) and confirm START RUN keeps selectedHero === 'runner'
    internals.heroPanels[2].emit('pointerdown');
    expect(internals.focusedHeroDetailName.text).toBe('SHADE');
    expect(internals.focusedHeroStatusText.text).toBe('LOCKED · 180g');
    const startBtn = (scene as unknown as { startButton: { emit: (e: string) => void } }).startButton;
    startBtn.emit('pointerdown');
    expect(JSON.parse(window.localStorage.getItem('jangan-lari-save-v1')!).selectedHero).toBe('runner');
    expect(scene.scene.start).toHaveBeenCalledWith('RunScene');
    expect(scene.scene.launch).toHaveBeenCalledWith('UIScene');
  });

  test('handles hero unlock failure/success, unlocked hero selection, guide cycling, upgrades navigation, and empty last run', () => {
    const scene = createMenuFixture({
      save: {
        totalGold: 150,
        unlockedHeroes: ['runner'],
        selectedHero: 'runner',
        localLeaderboard: [],
      },
    });

    const internals = scene as unknown as {
      goldText: { text: string };
      lastRunText: { text: string };
      statusText: { text: string; visible: boolean };
      heroActionButtons: Array<{ text: string; emit: (e: string) => void }>;
      guideButton: { emit: (e: string) => void };
      metaButton: { emit: (e: string) => void };
      saveData: GameSaveData;
    };

    expect(internals.lastRunText.text).toBe('Last Run: No runs yet — go fight.');

    // Attempt unlocking Shade (180g) with 150g fails cleanly
    internals.heroActionButtons[2].emit('pointerdown');
    expect(internals.saveData.totalGold).toBe(150);
    expect(internals.saveData.selectedHero).toBe('runner');
    expect(internals.statusText.text).toBe('Need 180 gold to unlock Shade.');
    expect(internals.statusText.visible).toBe(true);

    // Unlocking Vanguard (120g) with 150g succeeds and selects Vanguard
    internals.heroActionButtons[1].emit('pointerdown');
    expect(internals.saveData.totalGold).toBe(30);
    expect(internals.saveData.selectedHero).toBe('vanguard');
    expect(internals.goldText.text).toBe('GOLD 30');
    expect(internals.heroActionButtons[1].text).toBe('SELECTED');
    expect(internals.heroActionButtons[0].text).toBe('SELECT');

    // Selecting Runner back persists selectedHero === 'runner'
    internals.heroActionButtons[0].emit('pointerdown');
    expect(internals.saveData.selectedHero).toBe('runner');
    expect(internals.heroActionButtons[0].text).toBe('SELECTED');

    // Guide cycles Subtle -> Visible -> Hidden -> Subtle
    expect(scene.getMenuSnapshot().guideButtonText).toBe('Guide Subtle');
    internals.guideButton.emit('pointerdown');
    expect(scene.getMenuSnapshot().guideButtonText).toBe('Guide Visible');
    internals.guideButton.emit('pointerdown');
    expect(scene.getMenuSnapshot().guideButtonText).toBe('Guide Hidden');
    internals.guideButton.emit('pointerdown');
    expect(scene.getMenuSnapshot().guideButtonText).toBe('Guide Subtle');

    // UPGRADES navigates to MetaScene
    internals.metaButton.emit('pointerdown');
    expect(scene.scene.start).toHaveBeenCalledWith('MetaScene');
  });
});

describe('MenuScene R3G-D2B complete Field Codex library', () => {
  test('browses all 4 heroes, 7 weapons, and 11 enemies via Category -> Library Index -> Entry Detail without mutating menu selection or save state', () => {
    const scene = createMenuFixture({
      save: {
        totalGold: 220,
        selectedHero: 'runner',
        unlockedHeroes: ['runner', 'vanguard'],
      },
    });

    const internals = scene as unknown as {
      codexButton: { emit: (e: string) => void };
      codexCloseButton: { text: string; input: { enabled: boolean } | null; emit: (e: string) => void };
      codexBackdrop: { setInteractive: ReturnType<typeof vi.fn>; input: { enabled: boolean } | null };
      codexOverlay: { visible: boolean };
      codexOverlayVisible: boolean;
      activeCodexSection: string;
      codexViewMode: string;
      codexSectionEyebrow: { text: string };
      codexSectionTitle: { text: string };
      codexSectionTexts: Array<{ text: string }>;
      codexSectionFrames: Array<{ input: { enabled: boolean } | null; emit: (e: string) => void }>;
      codexIndexContainer: { visible: boolean };
      codexDetailContainer: { visible: boolean };
      codexIndexTileHits: Array<{ visible: boolean; input: { enabled: boolean } | null; emit: (e: string) => void }>;
      codexIndexTileTitleTexts: Array<{ text: string; visible: boolean }>;
      codexIndexTileTagTexts: Array<{ text: string; visible: boolean }>;
      codexPrevPageButton: { input: { enabled: boolean } | null; emit: (e: string) => void };
      codexNextPageButton: { input: { enabled: boolean } | null; emit: (e: string) => void };
      codexPageIndicatorText: { text: string };
      codexBackToIndexButton: { visible: boolean; input: { enabled: boolean } | null; emit: (e: string) => void };
      codexPrevEntryButton: { input: { enabled: boolean } | null; emit: (e: string) => void };
      codexNextEntryButton: { input: { enabled: boolean } | null; emit: (e: string) => void };
      codexEntryIndicatorText: { text: string };
      codexDetailSpecimenName: { text: string };
      codexDetailSpecimenTag: { text: string };
      codexDetailSpecimenImage: { textureKey: string; visible: boolean } | null;
      codexDetailCardLabels: Array<{ text: string; visible: boolean }>;
      codexDetailCardBodies: Array<{ text: string; visible: boolean }>;
      codexDetailUpgradePrimaryTitle: { text: string; visible: boolean };
      codexDetailUpgradePrimaryBody: { text: string; visible: boolean };
      codexDetailUpgradeSecondaryTitle: { text: string; visible: boolean };
      codexDetailUpgradeSecondaryBody: { text: string; visible: boolean };
      startButton: { input: { enabled: boolean } | null };
      metaButton: { input: { enabled: boolean } | null };
      heroPanels: Array<{ input: { enabled: boolean } | null; emit: (e: string) => void }>;
      focusedHeroId: string;
      saveData: GameSaveData;
    };
    const keyboard = (scene.input as unknown as { keyboard: { emit: (e: string) => void } }).keyboard;

    expect(internals.codexOverlayVisible).toBe(false);
    expect(internals.codexOverlay.visible).toBe(false);
    expect(internals.startButton.input?.enabled).toBe(true);
    expect(internals.codexSectionTexts.map((t) => t.text)).toEqual(['HEROES', 'WEAPONS', 'ENEMIES']);

    // Focus Vanguard on menu (Runner remains saved selectedHero), then open Codex
    internals.heroPanels[1].emit('pointerdown');
    internals.codexButton.emit('pointerdown');

    expect(internals.codexOverlayVisible).toBe(true);
    expect(internals.codexOverlay.visible).toBe(true);
    expect(internals.codexViewMode).toBe('index');
    expect(internals.codexIndexContainer.visible).toBe(true);
    expect(internals.codexDetailContainer.visible).toBe(false);
    expect(internals.codexBackToIndexButton.visible).toBe(false);
    expect(Boolean(internals.codexBackToIndexButton.input?.enabled)).toBe(false);
    expect(Boolean(internals.codexPrevEntryButton.input?.enabled)).toBe(false);

    // While Codex is open, backdrop blocks underlying menu controls and Enter/Space/M cannot trigger
    expect(internals.codexBackdrop.input?.enabled).toBe(true);
    expect(internals.startButton.input?.enabled).toBe(false);
    expect(internals.metaButton.input?.enabled).toBe(false);
    expect(internals.heroPanels[0].input?.enabled).toBe(false);
    keyboard.emit('keydown-ENTER');
    keyboard.emit('keydown-SPACE');
    keyboard.emit('keydown-M');
    expect(scene.scene.start).not.toHaveBeenCalled();

    // Heroes library shows all 4 heroes regardless of unlock state on Page 1 / 1
    expect(internals.codexSectionTitle.text).toBe('Heroes (4)');
    expect(internals.codexPageIndicatorText.text).toBe('Page 1 / 1');
    expect(Boolean(internals.codexPrevPageButton.input?.enabled)).toBe(false);
    expect(Boolean(internals.codexNextPageButton.input?.enabled)).toBe(false);
    expect(internals.codexIndexTileTitleTexts.map((t) => t.text)).toEqual(HERO_LIST.map((h) => h.name));

    // Open locked Verdant hero detail (tile index 3) -> readable passive/status, menu state unchanged
    internals.codexIndexTileHits[3].emit('pointerdown');
    expect(internals.codexViewMode).toBe('detail');
    expect(internals.codexDetailContainer.visible).toBe(true);
    expect(internals.codexIndexContainer.visible).toBe(false);
    expect(internals.codexBackToIndexButton.visible).toBe(true);
    expect(internals.codexBackToIndexButton.input?.enabled).toBe(true);
    expect(Boolean(internals.codexIndexTileHits[0].input?.enabled)).toBe(false);
    expect(internals.codexEntryIndicatorText.text).toBe('Entry 4 / 4');
    expect(internals.codexDetailSpecimenName.text).toBe('VERDANT');
    expect(internals.codexDetailCardBodies[1].text).toContain('Wider pickup range and sturdier support fire.');
    expect(internals.codexDetailCardBodies[2].text).toContain('Bloom Cannon');
    expect(internals.codexDetailCardBodies[2].text).toContain('Locked (210g to unlock)');
    expect(internals.codexDetailSpecimenImage?.textureKey).toBe('hero-verdant');
    expect(internals.codexDetailSpecimenImage?.visible).toBe(true);
    // Viewing Verdant inside Codex must NEVER alter active run selection, gold, unlocks, or menu focus
    expect(internals.saveData.selectedHero).toBe('runner');
    expect(internals.saveData.totalGold).toBe(220);
    expect(internals.focusedHeroId).toBe('vanguard');

    // Step Next Entry wraps cleanly to Runner (Entry 1 / 4), then Back to Index
    internals.codexNextEntryButton.emit('pointerdown');
    expect(internals.codexEntryIndicatorText.text).toBe('Entry 1 / 4');
    expect(internals.codexDetailSpecimenName.text).toBe('RUNNER');
    internals.codexBackToIndexButton.emit('pointerdown');
    expect(internals.codexViewMode).toBe('index');
    expect(internals.codexIndexContainer.visible).toBe(true);

    // Switch to WEAPONS (7) -> Page 1 (4) and Page 2 (3, 4th tile hidden/disabled)
    internals.codexSectionFrames[1].emit('pointerdown');
    expect(internals.codexSectionTitle.text).toBe('Weapons (7)');
    expect(internals.codexPageIndicatorText.text).toBe('Page 1 / 2');
    expect(internals.codexNextPageButton.input?.enabled).toBe(true);
    expect(internals.codexIndexTileTitleTexts.map((t) => t.text)).toEqual([
      'Arc Bolt',
      'Twin Fangs',
      'Ember Lance',
      'Bloom Cannon',
    ]);
    // Open Arc Bolt detail -> exact stats + Signature (Volt Volley) + Branch (Lanebreaker)
    internals.codexIndexTileHits[0].emit('pointerdown');
    expect(internals.codexDetailSpecimenName.text).toBe('ARC BOLT');
    expect(internals.codexDetailSpecimenImage?.textureKey).toBe('weapon-arc-bolt');
    expect(internals.codexDetailCardBodies[1].text).toContain(`Damage: ${WEAPON_DEFINITIONS['arc-bolt'].damage}`);
    expect(internals.codexDetailUpgradePrimaryTitle.visible).toBe(true);
    expect(internals.codexDetailUpgradePrimaryTitle.text).toBe('Volt Volley');
    expect(internals.codexDetailUpgradeSecondaryTitle.text).toContain('Lanebreaker');

    // Open Ember Lance (has Signature, no Branch) via Next/Next -> honest fallback note
    internals.codexNextEntryButton.emit('pointerdown');
    internals.codexNextEntryButton.emit('pointerdown');
    expect(internals.codexDetailSpecimenName.text).toBe('EMBER LANCE');
    expect(internals.codexDetailUpgradePrimaryTitle.text).toBe('Sundering Tip');
    expect(internals.codexDetailUpgradeSecondaryTitle.text).toBe('No branch upgrade in current pool');

    // Back to Index, step to Weapons Page 2 -> 3 items (Phase Disc, Sunwheel, Shatterbell), 4th disabled
    internals.codexBackToIndexButton.emit('pointerdown');
    internals.codexNextPageButton.emit('pointerdown');
    expect(internals.codexPageIndicatorText.text).toBe('Page 2 / 2');
    expect(internals.codexIndexTileTitleTexts.slice(0, 3).map((t) => t.text)).toEqual([
      'Phase Disc',
      'Sunwheel',
      'Shatterbell',
    ]);
    expect(internals.codexIndexTileHits[3].visible).toBe(false);
    expect(Boolean(internals.codexIndexTileHits[3].input?.enabled)).toBe(false);

    // Switch to ENEMIES (11) across 3 pages: 4 + 4 + 3 (ending at Overlord, Riftblade, Dreadnought, Behemoth)
    internals.codexSectionFrames[2].emit('pointerdown');
    expect(internals.codexSectionTitle.text).toBe('Enemies (11)');
    expect(internals.codexPageIndicatorText.text).toBe('Page 1 / 3');
    expect(internals.codexIndexTileTitleTexts.map((t) => t.text)).toEqual([
      ENEMY_ARCHETYPES.scuttler.name,
      ENEMY_ARCHETYPES.skimmer.name,
      ENEMY_ARCHETYPES.harrier.name,
      ENEMY_ARCHETYPES.mauler.name,
    ]);
    internals.codexNextPageButton.emit('pointerdown');
    expect(internals.codexPageIndicatorText.text).toBe('Page 2 / 3');
    expect(internals.codexIndexTileTitleTexts.map((t) => t.text)).toEqual([
      ENEMY_ARCHETYPES.crusher.name,
      ENEMY_ARCHETYPES.bulwark.name,
      ENEMY_ARCHETYPES.hexcaster.name,
      ENEMY_ARCHETYPES.overlord.name,
    ]);
    internals.codexNextPageButton.emit('pointerdown');
    expect(internals.codexPageIndicatorText.text).toBe('Page 3 / 3');
    expect(internals.codexIndexTileTitleTexts.slice(0, 3).map((t) => t.text)).toEqual([
      ENEMY_ARCHETYPES.riftblade.name,
      ENEMY_ARCHETYPES.dreadnought.name,
      ENEMY_ARCHETYPES.behemoth.name,
    ]);
    expect(internals.codexIndexTileHits[3].visible).toBe(false);
    expect(Boolean(internals.codexIndexTileHits[3].input?.enabled)).toBe(false);

    // Open Dreadnought (index 1 on page 3) -> procedural specimen, exact stats & line-charge/volley note
    internals.codexIndexTileHits[1].emit('pointerdown');
    expect(internals.codexDetailSpecimenName.text).toBe('DREADNOUGHT');
    expect(internals.codexDetailSpecimenImage?.visible).toBe(false);
    expect(internals.codexDetailCardBodies[1].text).toContain(`Base HP: ${ENEMY_ARCHETYPES.dreadnought.maxHealth}`);
    expect(internals.codexDetailCardBodies[2].text).toContain('line charges');

    // Step Next Entry -> Behemoth (Entry 11 / 11)
    internals.codexNextEntryButton.emit('pointerdown');
    expect(internals.codexEntryIndicatorText.text).toBe('Entry 11 / 11');
    expect(internals.codexDetailSpecimenName.text).toBe('BEHEMOTH');
    expect(internals.codexDetailCardBodies[2].text).toContain('shockwave rings');

    // Escape closes Codex cleanly and restores main menu interactivity
    keyboard.emit('keydown-ESC');
    expect(internals.codexOverlayVisible).toBe(false);
    expect(internals.codexOverlay.visible).toBe(false);
    expect(internals.startButton.input?.enabled).toBe(true);

    // Re-opening resets cleanly to Heroes index without touching saved selection, then BACK button closes Codex
    internals.codexButton.emit('pointerdown');
    expect(internals.codexOverlayVisible).toBe(true);
    expect(internals.activeCodexSection).toBe('heroes');
    expect(internals.codexViewMode).toBe('index');
    internals.codexCloseButton.emit('pointerdown');
    expect(internals.codexOverlayVisible).toBe(false);

    // Decorative Graphics across MenuScene & Codex never call setInteractive()
    const createdGraphics = (scene.add.graphics as ReturnType<typeof vi.fn>).mock.results.map((r) => r.value);
    expect(createdGraphics.length).toBeGreaterThan(0);
    for (const g of createdGraphics) {
      expect(g.setInteractive).not.toHaveBeenCalled();
    }
  });

  test('renders safely with procedural fallbacks when textures are unavailable', () => {
    const noTex = createMenuFixture({ texturesExist: false });
    const snap = noTex.getMenuSnapshot();
    expect(snap.startButtonIconVisible).toBe(false);
    expect((snap as Record<string, unknown>).heroCount).toBeUndefined();

    const internals = noTex as unknown as {
      codexButton: { emit: (e: string) => void };
      codexIndexTileImages: unknown[];
      codexIndexTileHits: Array<{ emit: (e: string) => void }>;
      codexDetailSpecimenImage: unknown;
      codexCloseButtonIcon: unknown;
      codexOverlayVisible: boolean;
    };
    internals.codexButton.emit('pointerdown');
    expect(internals.codexOverlayVisible).toBe(true);
    expect(internals.codexDetailSpecimenImage).toBeNull();
    expect(internals.codexCloseButtonIcon).toBeNull();
    expect(internals.codexIndexTileImages.every((img) => img === null)).toBe(true);
    internals.codexIndexTileHits[0].emit('pointerdown');
    expect(internals.codexDetailSpecimenImage).toBeNull();
  });

  test('survives repeated Menu -> MetaScene shutdown -> MenuScene re-entry cycles without stale destroyed sys references', () => {
    const scene = createMenuFixture();
    const mockEvents = scene.events as unknown as { emitShutdown: () => void };
    const keyboard = scene.input.keyboard as unknown as { listenerCount: (e: string) => number };

    for (let cycle = 0; cycle < 10; cycle += 1) {
      const internals = scene as unknown as {
        metaButton: { emit: (e: string) => void };
        startButton: { input: { enabled: boolean } | null; emit: (e: string) => void };
        codexButton: { emit: (e: string) => void };
        codexCloseButton: { emit: (e: string) => void };
      };
      internals.codexButton.emit('pointerdown');
      internals.codexCloseButton.emit('pointerdown');
      internals.metaButton.emit('pointerdown');
      expect(scene.scene.start).toHaveBeenLastCalledWith('MetaScene');

      mockEvents.emitShutdown();
      expect(keyboard.listenerCount('keydown-M')).toBe(0);
      expect(() => scene.create()).not.toThrow();
    }

    const finalInternals = scene as unknown as {
      startButton: { input: { enabled: boolean } | null; emit: (e: string) => void };
    };
    expect(finalInternals.startButton.input?.enabled).toBe(true);
    finalInternals.startButton.emit('pointerdown');
    expect(scene.scene.start).toHaveBeenLastCalledWith('RunScene');
  });
});
