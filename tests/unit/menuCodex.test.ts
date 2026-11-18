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
    setInteractive() { this.input = { enabled: true }; return this; }
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
    input: { enabled: boolean } | null = null;
    setInteractive = vi.fn(() => {
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
    cameras = { main: { setBackgroundColor: vi.fn() } };
    textures = { exists: vi.fn(() => true) };
    scale = { displaySize: { width: 1600, height: 720 } };
    events = { once: vi.fn(), off: vi.fn() };
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
        off: vi.fn(),
        emit: (event: string) => {
          for (const entry of this.keyboardListeners.get(event) ?? []) {
            entry.cb.call(entry.ctx);
          }
        },
      },
    };
    add = {
      graphics: vi.fn(() => new MockGraphics()),
      text: vi.fn((x: number, y: number, text: string, style?: Record<string, unknown>) => new MockText(x, y, text, style)),
      rectangle: vi.fn((x: number, y: number, w: number, h: number) => new MockShape(x, y, w, h)),
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

describe('MenuScene R3G-D2 full Field Codex rebuild', () => {
  test('opens on focused hero, switches Runner/Weapon/Threats with real data, blocks shortcuts/menu input behind backdrop, and closes on Back or Escape', () => {
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
      codexSectionEyebrow: { text: string };
      codexSectionTitle: { text: string };
      codexHeroNamePlate: { text: string };
      codexHeroBody: { text: string };
      codexHeroMeta: { text: string };
      codexWeaponBody: { text: string };
      codexWeaponStats: { text: string };
      codexWeaponImage: { textureKey: string; visible: boolean } | null;
      codexThreatTitleTexts: Array<{ text: string }>;
      codexThreatRoleTexts: Array<{ text: string }>;
      codexThreatBodyTexts: Array<{ text: string }>;
      codexSectionFrames: Array<{ input: { enabled: boolean } | null; emit: (e: string) => void }>;
      codexRunnerContainer: { visible: boolean };
      codexWeaponContainer: { visible: boolean };
      codexThreatContainer: { visible: boolean };
      startButton: { input: { enabled: boolean } | null };
      metaButton: { input: { enabled: boolean } | null };
      heroPanels: Array<{ input: { enabled: boolean } | null; emit: (e: string) => void }>;
    };
    const keyboard = (scene.input as unknown as { keyboard: { emit: (e: string) => void } }).keyboard;

    expect(internals.codexOverlayVisible).toBe(false);
    expect(internals.codexOverlay.visible).toBe(false);
    expect(internals.startButton.input?.enabled).toBe(true);

    // Focus Vanguard before opening Codex
    internals.heroPanels[1].emit('pointerdown');
    internals.codexButton.emit('pointerdown');

    expect(internals.codexOverlayVisible).toBe(true);
    expect(internals.codexOverlay.visible).toBe(true);
    expect(internals.codexSectionEyebrow.text).toBe('RUNNER ENTRY');
    expect(internals.codexHeroNamePlate.text).toBe('VANGUARD');
    expect(internals.codexHeroBody.text).toBe(HEROES.vanguard.description);
    expect(internals.codexHeroMeta.text).toContain(HEROES.vanguard.passiveLabel);
    expect(internals.codexRunnerContainer.visible).toBe(true);
    expect(internals.codexWeaponContainer.visible).toBe(false);
    expect(internals.codexThreatContainer.visible).toBe(false);

    // While Codex is open, backdrop blocks underlying menu controls and Enter/Space/M cannot trigger
    expect(internals.codexBackdrop.input?.enabled).toBe(true);
    expect(internals.startButton.input?.enabled).toBe(false);
    expect(internals.metaButton.input?.enabled).toBe(false);
    expect(internals.heroPanels[0].input?.enabled).toBe(false);
    keyboard.emit('keydown-ENTER');
    keyboard.emit('keydown-SPACE');
    keyboard.emit('keydown-M');
    expect(scene.scene.start).not.toHaveBeenCalled();

    // Switch to Weapon tab -> Ember Lance stats & image for Vanguard
    internals.codexSectionFrames[1].emit('pointerdown');
    expect(internals.codexSectionEyebrow.text).toBe('WEAPON ENTRY');
    expect(internals.codexSectionTitle.text).toBe('Ember Lance');
    expect(internals.codexWeaponContainer.visible).toBe(true);
    expect(internals.codexRunnerContainer.visible).toBe(false);
    expect(internals.codexWeaponBody.text).toContain(WEAPON_DEFINITIONS['ember-lance'].codexSummary);
    expect(internals.codexWeaponStats.text).toContain(`Damage ${WEAPON_DEFINITIONS['ember-lance'].damage}`);
    expect(internals.codexWeaponStats.text).toContain(`Cadence ${WEAPON_DEFINITIONS['ember-lance'].fireCooldownMs} ms`);
    expect(internals.codexWeaponImage?.textureKey).toBe('weapon-ember-lance');
    expect(internals.codexWeaponImage?.visible).toBe(true);

    // Switch to Threats tab -> real Skimmer, Dreadnought, Behemoth archetypes & notes
    internals.codexSectionFrames[2].emit('pointerdown');
    expect(internals.codexSectionEyebrow.text).toBe('THREAT ARCHIVE');
    expect(internals.codexThreatContainer.visible).toBe(true);
    expect(internals.codexThreatTitleTexts.map((t) => t.text)).toEqual([
      ENEMY_ARCHETYPES.skimmer.name.toUpperCase(),
      ENEMY_ARCHETYPES.dreadnought.name.toUpperCase(),
      ENEMY_ARCHETYPES.behemoth.name.toUpperCase(),
    ]);
    expect(internals.codexThreatRoleTexts.map((r) => r.text)).toEqual(['SCOUT THREAT', 'MINIBOSS', 'BOSS']);
    expect(internals.codexThreatBodyTexts[0].text).toContain('Strafes wide');
    expect(internals.codexThreatBodyTexts[1].text).toContain('Telegraphs a line charge');
    expect(internals.codexThreatBodyTexts[2].text).toContain('shockwave ring');

    // Escape closes Codex cleanly and restores main menu interactivity
    keyboard.emit('keydown-ESC');
    expect(internals.codexOverlayVisible).toBe(false);
    expect(internals.codexOverlay.visible).toBe(false);
    expect(internals.startButton.input?.enabled).toBe(true);

    // Re-open, switch back via BACK button, focus Runner, check Runner/Arc Bolt update
    internals.heroPanels[0].emit('pointerdown');
    internals.codexButton.emit('pointerdown');
    expect(internals.codexHeroNamePlate.text).toBe('RUNNER');
    internals.codexSectionFrames[1].emit('pointerdown');
    expect(internals.codexSectionTitle.text).toBe('Arc Bolt');
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
    expect(snap.heroCount).toBeUndefined(); // getMenuSnapshot retains strict original fields cleanly

    const internals = noTex as unknown as {
      codexButton: { emit: (e: string) => void };
      codexRunnerPortraitImage: unknown;
      codexWeaponImage: unknown;
      codexCloseButtonIcon: unknown;
      codexOverlayVisible: boolean;
    };
    internals.codexButton.emit('pointerdown');
    expect(internals.codexOverlayVisible).toBe(true);
    expect(internals.codexRunnerPortraitImage).toBeNull();
    expect(internals.codexWeaponImage).toBeNull();
    expect(internals.codexCloseButtonIcon).toBeNull();
  });
});
