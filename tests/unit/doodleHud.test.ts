import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  DOODLE_COLORS,
  DOODLE_HEX,
  createWobblyCirclePoints,
  createWobblyRectPoints,
  formatCoreShieldLabel,
} from '../../src/game/ui/doodleTheme';

vi.mock('../../src/game/scenes/RunScene', () => ({
  RunScene: class {},
}));

vi.mock('phaser', () => {
  class MockGraphics {
    visible = true;
    depth = 0;
    scrollFactor = 1;
    setInteractive = vi.fn().mockReturnThis();
    setScrollFactor(factor: number) { this.scrollFactor = factor; return this; }
    setDepth(depth: number) { this.depth = depth; return this; }
    setVisible(visible: boolean) { this.visible = visible; return this; }
    clear() { return this; }
    fillStyle() { return this; }
    fillPoints() { return this; }
    lineStyle() { return this; }
    strokePoints() { return this; }
    lineBetween() { return this; }
  }

  class MockText {
    text: string;
    x: number;
    y: number;
    width = 96;
    height = 20;
    displayWidth = 96;
    displayHeight = 20;
    visible = true;
    alpha = 1;
    depth = 0;
    style: Record<string, unknown>;
    input: { enabled: boolean } | null = null;
    private listeners = new Map<string, Array<(...args: unknown[]) => void>>();
    private data = new Map<string, unknown>();

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
    setScrollFactor() { return this; }
    setDepth(depth: number) { this.depth = depth; return this; }
    setVisible(visible: boolean) { this.visible = visible; return this; }
    setAlpha(alpha: number) { this.alpha = alpha; return this; }
    setPosition(x: number, y: number) { this.x = x; this.y = y; return this; }
    setText(next: string) { this.text = next; return this; }
    setColor(color: string) { this.style.color = color; return this; }
    setStyle(next: Record<string, unknown>) { Object.assign(this.style, next); return this; }
    setFontSize() { return this; }
    setPadding() { return this; }
    setBackgroundColor() { return this; }
    setData(key: string, value: unknown) { this.data.set(key, value); return this; }
    getData(key: string) { return this.data.get(key); }
    getBounds() {
      return { left: this.x - this.width, centerY: this.y };
    }
    setInteractive() {
      this.input = { enabled: true };
      return this;
    }
    disableInteractive() {
      if (this.input) this.input.enabled = false;
      return this;
    }
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
    alpha = 1;
    depth = 0;
    fillColor: number;
    fillAlpha: number;
    strokeColor = 0;
    strokeWidth = 0;
    input: { enabled: boolean } | null = null;
    setInteractive = vi.fn(() => {
      this.input = { enabled: true };
      return this;
    });
    private listeners = new Map<string, Array<(...args: unknown[]) => void>>();
    private data = new Map<string, unknown>();

    constructor(x: number, y: number, width: number, height: number, fillColor = 0, fillAlpha = 1) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
      this.fillColor = fillColor;
      this.fillAlpha = fillAlpha;
    }

    setOrigin() { return this; }
    setScrollFactor() { return this; }
    setDepth(depth: number) { this.depth = depth; return this; }
    setVisible(visible: boolean) { this.visible = visible; return this; }
    setPosition(x: number, y: number) { this.x = x; this.y = y; return this; }
    setFillStyle(color: number, alpha = 1) { this.fillColor = color; this.fillAlpha = alpha; return this; }
    setStrokeStyle(width: number, color: number) { this.strokeWidth = width; this.strokeColor = color; return this; }
    setData(key: string, value: unknown) { this.data.set(key, value); return this; }
    getData(key: string) { return this.data.get(key); }
    disableInteractive() {
      if (this.input) this.input.enabled = false;
      return this;
    }
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
    setScrollFactor() { return this; }
    setVisible(visible: boolean) { this.visible = visible; return this; }
    setPosition(x: number, y: number) { this.x = x; this.y = y; return this; }
    setTexture(key: string) { this.textureKey = key; return this; }
  }

  class MockContainer {
    x: number;
    y: number;
    visible = true;
    depth = 0;
    children: unknown[];
    private data = new Map<string, unknown>();

    constructor(x: number, y: number, children: unknown[] = []) {
      this.x = x;
      this.y = y;
      this.children = children;
    }

    setDepth(depth: number) { this.depth = depth; return this; }
    setScrollFactor() { return this; }
    setVisible(visible: boolean) { this.visible = visible; return this; }
    setData(key: string, value: unknown) { this.data.set(key, value); return this; }
    getData(key: string) { return this.data.get(key); }
  }

  class MockScene {
    registry = new Map<string, unknown>();
    textures = { exists: vi.fn(() => true) };
    input = { keyboard: { on: vi.fn(), off: vi.fn() } };
    events = { once: vi.fn(), off: vi.fn() };
    scale = { displaySize: { width: 1600, height: 720 } };
    scene = {
      isActive: vi.fn(() => true),
      get: vi.fn(),
      stop: vi.fn(),
      start: vi.fn(),
    };
    add = {
      graphics: vi.fn(() => new MockGraphics()),
      text: vi.fn((x: number, y: number, text: string, style?: Record<string, unknown>) => new MockText(x, y, text, style)),
      rectangle: vi.fn((x: number, y: number, w: number, h: number, c?: number, a?: number) => new MockShape(x, y, w, h, c, a)),
      circle: vi.fn((x: number, y: number, r: number, c?: number, a?: number) => new MockShape(x, y, r * 2, r * 2, c, a)),
      image: vi.fn((x: number, y: number, key: string) => new MockImage(x, y, key)),
      container: vi.fn((x: number, y: number, children?: unknown[]) => new MockContainer(x, y, children)),
    };
  }

  return {
    default: {
      Scene: MockScene,
      Math: {
        Clamp: (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)),
      },
      Scenes: { Events: { SHUTDOWN: 'shutdown' } },
      GameObjects: {
        Graphics: MockGraphics,
        Text: MockText,
        Rectangle: MockShape,
        Arc: MockShape,
        Image: MockImage,
        Container: MockContainer,
      },
    },
  };
});

import { UIScene } from '../../src/game/scenes/UIScene';

function createUiFixture(options: { texturesExist?: boolean; viewportWidth?: number; viewportHeight?: number } = {}) {
  const originalWidth = window.innerWidth;
  const originalHeight = window.innerHeight;
  Object.defineProperty(window, 'innerWidth', { value: options.viewportWidth ?? 1280, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: options.viewportHeight ?? 720, configurable: true });

  const ui = new UIScene();
  const texturesExist = options.texturesExist ?? true;
  (ui.textures.exists as ReturnType<typeof vi.fn>).mockImplementation(() => texturesExist);

  const runSceneStub = {
    openManualPauseMenu: vi.fn(),
    activateBreakoutPulse: vi.fn(),
    setControlGuideMode: vi.fn((mode: string) => {
      ui.registry.set('run.controlGuideMode', mode);
    }),
  };
  (ui.scene.get as ReturnType<typeof vi.fn>).mockReturnValue(runSceneStub);

  ui.registry.set('run.hp', 84);
  ui.registry.set('run.maxHp', 100);
  ui.registry.set('run.level', 7);
  ui.registry.set('run.xp', 40);
  ui.registry.set('run.xpNext', 100);
  ui.registry.set('run.kills', 12);
  ui.registry.set('run.goldEarned', 45);
  ui.registry.set('run.heroName', 'Runner');
  ui.registry.set('run.tankClass', { title: 'Basic' });
  ui.registry.set('run.weaponNames', ['Arc Bolt', 'Twin Fangs']);
  ui.registry.set('run.elapsedMs', 120_000);
  ui.registry.set('run.targetMs', 900_000);
  ui.registry.set('run.bossSpawnTimeMs', 900_000);
  ui.registry.set('run.stagePhase', 'preBoss');
  ui.registry.set('run.activeAbilityReady', true);
  ui.registry.set('run.activeAbilityCooldownMs', 0);
  ui.registry.set('run.activeAbilityCooldownTotalMs', 18_000);
  ui.registry.set('run.activeAbilityLabel', 'Pulse');
  ui.registry.set('run.controlGuideMode', 'subtle');

  ui.create();
  ui.update();

  const restoreViewport = () => {
    Object.defineProperty(window, 'innerWidth', { value: originalWidth, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: originalHeight, configurable: true });
  };

  return { ui, runSceneStub, restoreViewport };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('doodleTheme helpers', () => {
  test('exposes exact approved cream-paper doodle palette tokens', () => {
    expect(DOODLE_COLORS.paper).toBe(0xfdf7e7);
    expect(DOODLE_COLORS.paperWarm).toBe(0xf4e7c8);
    expect(DOODLE_COLORS.ink).toBe(0x1b1a22);
    expect(DOODLE_COLORS.hp).toBe(0xef5b6c);
    expect(DOODLE_COLORS.xp).toBe(0x38bdf8);
    expect(DOODLE_COLORS.gold).toBe(0xf5c84b);
    expect(DOODLE_COLORS.mint).toBe(0x6ee787);
    expect(DOODLE_HEX.paper).toBe('#fdf7e7');
    expect(DOODLE_HEX.ink).toBe('#1b1a22');
  });

  test('produces deterministic, bounded wobbly polygons for cards and circles', () => {
    const a = createWobblyRectPoints(200, 50, 320, 80, 12, 101, 1.25);
    const b = createWobblyRectPoints(200, 50, 320, 80, 12, 101, 1.25);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(16);
    for (const p of a) {
      expect(p.x).toBeGreaterThanOrEqual(200 - 160 - 2);
      expect(p.x).toBeLessThanOrEqual(200 + 160 + 2);
      expect(p.y).toBeGreaterThanOrEqual(50 - 40 - 2);
      expect(p.y).toBeLessThanOrEqual(50 + 40 + 2);
    }

    const c1 = createWobblyCirclePoints(0, 0, 32, 180, 24, 1.15);
    const c2 = createWobblyCirclePoints(0, 0, 32, 180, 24, 1.15);
    expect(c1).toEqual(c2);
    expect(c1).toHaveLength(24);
    for (const p of c1) {
      const r = Math.hypot(p.x, p.y);
      expect(r).toBeGreaterThan(30);
      expect(r).toBeLessThan(34);
    }
  });

  test('formats Core Shield pill label from active shield-pulse milliseconds', () => {
    expect(formatCoreShieldLabel('', 8000)).toBeNull();
    expect(formatCoreShieldLabel('other-buff', 8000)).toBeNull();
    expect(formatCoreShieldLabel('shield-pulse', 0)).toBeNull();
    expect(formatCoreShieldLabel('shield-pulse', -500)).toBeNull();
    expect(formatCoreShieldLabel('shield-pulse', Number.NaN)).toBeNull();
    expect(formatCoreShieldLabel('shield-pulse', 8000)).toBe('CORE SHIELD 8s');
    expect(formatCoreShieldLabel('shield-pulse', 4200)).toBe('CORE SHIELD 5s');
    expect(formatCoreShieldLabel('shield-pulse', 250)).toBe('CORE SHIELD 1s');
  });
});

describe('UIScene R3G-B doodle combat HUD', () => {
  test('preserves getHudSnapshot contract, weapon slots, and live registry counters', () => {
    const { ui, restoreViewport } = createUiFixture();
    try {
      const snap = ui.getHudSnapshot();
      expect(snap.hero).toBe('Runner • Basic');
      expect(snap.hp).toBe('HP 84/100');
      expect(snap.level).toBe('LV 7');
      expect(snap.gold).toBe('Run Gold 45');
      expect(snap.kills).toBe('Kills 12');
      expect(snap.timer).toBe('Boss in 13:00');
      expect(snap.hudIconVisible).toEqual({ gold: true, hp: true, xp: true, pause: true });
      expect(snap.weaponSlots[0]).toEqual({ visible: true, label: 'AB', x: 82, y: 124, width: 24, height: 24 });
      expect(snap.weaponSlots[1]).toEqual({ visible: true, label: 'TF', x: 116, y: 124, width: 24, height: 24 });
      expect(snap.weaponSlots[2].visible).toBe(false);
      expect(snap.weaponSlots[3].visible).toBe(false);
      expect(snap.activeAbilityButton).toMatchObject({ x: 1244, y: 400, radius: 32 });

      // Arc Bolt gets dark contrast backing; Twin Fangs gets warm cream backing
      const frames = (ui as unknown as { weaponIconFrames: Array<{ fillColor: number }> }).weaponIconFrames;
      expect(frames[0].fillColor).toBe(DOODLE_COLORS.weaponWellDark);
      expect(frames[1].fillColor).toBe(DOODLE_COLORS.weaponWellLight);

      // Boss phase switches timer text cleanly
      ui.registry.set('run.stagePhase', 'boss');
      ui.registry.set('run.bossPhase', 2);
      ui.registry.set('run.bossHp', 5400);
      ui.registry.set('run.bossMaxHp', 12000);
      ui.update();
      expect(ui.getHudSnapshot().timer).toBe('Boss HP P2 5400/12000');
    } finally {
      restoreViewport();
    }
  });

  test('renders ui-pause without overlapping II glyph when texture exists and falls back to II when missing', () => {
    const withTex = createUiFixture({ texturesExist: true });
    try {
      const pauseBtn = (withTex.ui as unknown as { pauseButton: { text: string; emit: (e: string) => void } }).pauseButton;
      const pauseIcon = (withTex.ui as unknown as { pauseIconImage: { alpha: number; visible: boolean } | null }).pauseIconImage;
      expect(pauseBtn.text).toBe('');
      expect(pauseIcon?.alpha).toBe(1);
      expect(pauseIcon?.visible).toBe(true);
      expect(withTex.ui.getHudSnapshot().hudIconVisible.pause).toBe(true);

      pauseBtn.emit('pointerdown');
      expect(withTex.runSceneStub.openManualPauseMenu).toHaveBeenCalledTimes(1);
    } finally {
      withTex.restoreViewport();
    }

    const noTex = createUiFixture({ texturesExist: false });
    try {
      const pauseBtn = (noTex.ui as unknown as { pauseButton: { text: string; emit: (e: string) => void } }).pauseButton;
      expect(pauseBtn.text).toBe('II');
      const snap = noTex.ui.getHudSnapshot();
      expect(snap.hudIconVisible).toEqual({ gold: false, hp: false, xp: false, pause: false });
      expect(snap.weaponSlots[0].visible).toBe(true);

      pauseBtn.emit('pointerdown');
      expect(noTex.runSceneStub.openManualPauseMenu).toHaveBeenCalledTimes(1);
    } finally {
      noTex.restoreViewport();
    }
  });

  test('tracks Core Shield pill from registry duration and hides when expired or no buff active', () => {
    const { ui, restoreViewport } = createUiFixture();
    try {
      expect(ui.getHudSnapshot().coreShieldVisible).toBe(false);
      expect(ui.getHudSnapshot().coreShieldText).toBe('');

      ui.registry.set('run.mapBuffType', 'shield-pulse');
      ui.registry.set('run.mapBuffRemainingMs', 8000);
      ui.update();
      expect(ui.getHudSnapshot().coreShieldVisible).toBe(true);
      expect(ui.getHudSnapshot().coreShieldText).toBe('CORE SHIELD 8s');

      ui.registry.set('run.mapBuffRemainingMs', 2400);
      ui.update();
      expect(ui.getHudSnapshot().coreShieldText).toBe('CORE SHIELD 3s');

      ui.registry.set('run.mapBuffRemainingMs', 0);
      ui.update();
      expect(ui.getHudSnapshot().coreShieldVisible).toBe(false);
      expect(ui.getHudSnapshot().coreShieldText).toBe('');
    } finally {
      restoreViewport();
    }
  });

  test('tracks Pulse ready/cooldown states, touch guide modes, and never makes decorative HUD artwork interactive', () => {
    const { ui, runSceneStub, restoreViewport } = createUiFixture({ viewportWidth: 844, viewportHeight: 390 });
    try {
      let snap = ui.getHudSnapshot();
      expect(snap.activeAbilityReady).toBe(true);
      expect(snap.activeAbilityButtonText).toBe('P');
      expect(snap.controlGuidesVisible).toBe(true);

      const hitArea = (ui as unknown as { activeAbilityButtonHitArea: { emit: (e: string) => void } }).activeAbilityButtonHitArea;
      hitArea.emit('pointerdown');
      expect(runSceneStub.activateBreakoutPulse).toHaveBeenCalledTimes(1);

      ui.registry.set('run.activeAbilityReady', false);
      ui.registry.set('run.activeAbilityCooldownMs', 4300);
      ui.update();
      snap = ui.getHudSnapshot();
      expect(snap.activeAbilityReady).toBe(false);
      expect(snap.activeAbilityButtonText).toBe('5');

      ui.registry.set('run.controlGuideMode', 'hidden');
      ui.update();
      expect(ui.getHudSnapshot().controlGuidesVisible).toBe(false);

      ui.registry.set('run.controlGuideMode', 'visible');
      ui.update();
      expect(ui.getHudSnapshot().controlGuidesVisible).toBe(true);

      // Decorative HUD graphics, guide circles, and icons must never intercept touch input
      const createdGraphics = (ui.add.graphics as ReturnType<typeof vi.fn>).mock.results.map((r) => r.value);
      expect(createdGraphics.length).toBeGreaterThan(0);
      for (const g of createdGraphics) {
        expect(g.setInteractive).not.toHaveBeenCalled();
      }
      const guideZones = (ui as unknown as { controlGuideZones: Array<{ setInteractive: ReturnType<typeof vi.fn> }> }).controlGuideZones;
      for (const z of guideZones) {
        expect(z.setInteractive).not.toHaveBeenCalled();
      }
    } finally {
      restoreViewport();
    }
  });
});
