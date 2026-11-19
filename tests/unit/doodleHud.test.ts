import { afterEach, describe, expect, test, vi } from 'vitest';
import { VITALITY_REGEN_PER_SECOND } from '../../src/game/config/playerBalance';
import { TANK_CLASS_DEFINITIONS } from '../../src/game/data/tankClasses';
import { TANK_STAT_DEFINITIONS, TANK_STAT_IDS } from '../../src/game/data/tankStats';
import { UPGRADE_POOL, type UpgradeDefinition } from '../../src/game/data/upgrades';
import { getDualJoystickLayout } from '../../src/game/input/joystickLayout';
import {
  DOODLE_COLORS,
  DOODLE_HEX,
  DOODLE_OVERLAY_COLORS,
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
    setPosition(x: number, y: number) { this.x = x; this.y = y; return this; }
    setData(key: string, value: unknown) { this.data.set(key, value); return this; }
    getData(key: string) { return this.data.get(key); }
  }

  class MockScene {
    registry = new Map<string, unknown>();
    textures = { exists: vi.fn(() => true) };
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
    closeManualPauseMenu: vi.fn(),
    restartRun: vi.fn(),
    exitToMenu: vi.fn(),
    allocateTankStat: vi.fn(),
    activateBreakoutPulse: vi.fn(),
    selectLevelUp: vi.fn(),
    selectTankClass: vi.fn(),
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
      const guideHitRings = (ui as unknown as { controlGuideHitRings: Array<{ setInteractive: ReturnType<typeof vi.fn> }> }).controlGuideHitRings;
      expect(guideHitRings).toHaveLength(2);
      for (const ring of guideHitRings) {
        expect(ring.setInteractive).not.toHaveBeenCalled();
      }
    } finally {
      restoreViewport();
    }
  });

  test('aligns visible MOVE/AIM joystick circles and knob clamping with shared joystickLayout and forwards HUD button pointers', () => {
    const { ui, runSceneStub, restoreViewport } = createUiFixture({ viewportWidth: 844, viewportHeight: 390 });
    try {
      const expectedLayout = getDualJoystickLayout(1600, 720);
      const initialSnap = ui.getHudSnapshot();
      expect(initialSnap.joystickLayout).toEqual(expectedLayout);
      expect(initialSnap.movementJoystickKnob).toEqual({ x: expectedLayout.movement.x, y: expectedLayout.movement.y });
      expect(initialSnap.aimJoystickKnob).toEqual({ x: expectedLayout.aim.x, y: expectedLayout.aim.y });

      const internals = ui as unknown as {
        controlGuideHitRings: Array<{ x: number; y: number; width: number }>;
        controlGuideZones: Array<{ x: number; y: number; width: number }>;
        pauseButton: { emit: (event: string, ...args: unknown[]) => void };
        activeAbilityButtonHitArea: { emit: (event: string, ...args: unknown[]) => void };
      };
      expect(internals.controlGuideHitRings[0]).toMatchObject({
        x: expectedLayout.movement.x,
        y: expectedLayout.movement.y,
        width: expectedLayout.movement.hitRadius * 2,
      });
      expect(internals.controlGuideHitRings[1]).toMatchObject({
        x: expectedLayout.aim.x,
        y: expectedLayout.aim.y,
        width: expectedLayout.aim.hitRadius * 2,
      });
      expect(internals.controlGuideZones[0]).toMatchObject({
        x: expectedLayout.movement.x,
        y: expectedLayout.movement.y,
        width: expectedLayout.movement.baseRadius * 2,
      });
      expect(internals.controlGuideZones[1]).toMatchObject({
        x: expectedLayout.aim.x,
        y: expectedLayout.aim.y,
        width: expectedLayout.aim.baseRadius * 2,
      });

      // Vector inside deadzone keeps knob centered; vector beyond maxKnobTravel clamps to maxKnobTravel along exact angle
      ui.registry.set('run.controlJoysticks', {
        movement: {
          active: true,
          start: { x: expectedLayout.movement.x, y: expectedLayout.movement.y },
          current: { x: expectedLayout.movement.x + 4, y: expectedLayout.movement.y + 3 },
          vector: { x: 4, y: 3 },
        },
        aim: {
          active: true,
          start: { x: expectedLayout.aim.x, y: expectedLayout.aim.y },
          current: { x: expectedLayout.aim.x + 150, y: expectedLayout.aim.y - 200 },
          vector: { x: 150, y: -200 },
        },
      });
      ui.update();

      const activeSnap = ui.getHudSnapshot();
      expect(activeSnap.movementJoystickKnob).toEqual({ x: expectedLayout.movement.x, y: expectedLayout.movement.y });
      expect(activeSnap.aimJoystickKnob.x).toBeCloseTo(expectedLayout.aim.x + 0.6 * expectedLayout.aim.maxKnobTravel);
      expect(activeSnap.aimJoystickKnob.y).toBeCloseTo(expectedLayout.aim.y - 0.8 * expectedLayout.aim.maxKnobTravel);

      // Releasing returns both knobs to exact joystick centers
      ui.registry.set('run.controlJoysticks', {
        movement: { active: false, start: { x: expectedLayout.movement.x, y: expectedLayout.movement.y }, current: { x: expectedLayout.movement.x, y: expectedLayout.movement.y }, vector: { x: 0, y: 0 } },
        aim: { active: false, start: { x: expectedLayout.aim.x, y: expectedLayout.aim.y }, current: { x: expectedLayout.aim.x, y: expectedLayout.aim.y }, vector: { x: 0, y: 0 } },
      });
      ui.update();
      const idleSnap = ui.getHudSnapshot();
      expect(idleSnap.movementJoystickKnob).toEqual({ x: expectedLayout.movement.x, y: expectedLayout.movement.y });
      expect(idleSnap.aimJoystickKnob).toEqual({ x: expectedLayout.aim.x, y: expectedLayout.aim.y });

      // PULSE and Pause forward pointer payload so RunScene can clear/ignore UI button touches
      const pulsePointer = { id: 5, x: 1244, y: 400, isDown: true, downTime: 50 };
      const pausePointer = { id: 6, x: 1556, y: 39, isDown: true, downTime: 60 };
      internals.activeAbilityButtonHitArea.emit('pointerdown', pulsePointer);
      internals.pauseButton.emit('pointerdown', pausePointer);
      expect(runSceneStub.activateBreakoutPulse).toHaveBeenCalledWith(pulsePointer);
      expect(runSceneStub.openManualPauseMenu).toHaveBeenCalledWith(pausePointer);
    } finally {
      restoreViewport();
    }
  });
});

function pickUpgrade(id: UpgradeDefinition['id']): UpgradeDefinition {
  const found = UPGRADE_POOL.find((entry) => entry.id === id);
  if (!found) {
    throw new Error(`Missing upgrade definition for test: ${id}`);
  }
  return found;
}

describe('UIScene R3G-C1 distinct level-up and class evolution overlays', () => {
  test('renders BONUS PICK with real UPGRADE_POOL content, live countdown, dynamic card counts, and safe non-interactive cleanup', () => {
    const { ui, runSceneStub, restoreViewport } = createUiFixture();
    try {
      const vitality = pickUpgrade('vitality');
      const twinFangs = pickUpgrade('unlock-twin-fangs');
      const rapidFire = pickUpgrade('rapid-fire');

      ui.registry.set('run.levelUpActive', true);
      ui.registry.set('run.levelUpMode', 'normal');
      ui.registry.set('run.levelUpRemainingMs', 12_300);
      ui.registry.set('run.levelUpChoices', [vitality, twinFangs, rapidFire]);
      ui.registry.set('run.levelUpChoiceCount', 3);
      ui.update();

      const snap = ui.getHudSnapshot();
      expect(snap.levelUpVisible).toBe(true);
      expect(snap.levelUpChoiceCount).toBe(3);
      expect(snap.classChoiceVisible).toBe(false);

      const internals = ui as unknown as {
        levelUpHeadingText: { text: string };
        levelUpSubheadingText: { text: string; alpha: number };
        levelUpTimerText: { text: string };
        levelUpFooterText: { text: string };
        levelUpCards: Array<{
          x: number;
          y: number;
          width: number;
          height: number;
          visible: boolean;
          input: { enabled: boolean } | null;
          getData: (k: string) => unknown;
          emit: (e: string, ...args: unknown[]) => void;
        }>;
        levelUpBadges: Array<{ text: string; visible: boolean }>;
        levelUpButtons: Array<{ text: string; visible: boolean }>;
        levelUpDescriptions: Array<{ text: string; visible: boolean }>;
        levelUpCardImages: Array<{ visible: boolean; textureKey: string } | null>;
        levelUpWeaponTagIcons: Array<{ container: { visible: boolean } }>;
      };

      expect(internals.levelUpHeadingText.text).toBe('BONUS PICK');
      expect(internals.levelUpSubheadingText.text).toBe('CHOOSE ONE UPGRADE');
      expect(internals.levelUpSubheadingText.alpha).toBe(1);
      expect(internals.levelUpTimerText.text).toBe('12.3s');
      expect(internals.levelUpFooterText.text).toBe('PICK ONE TO CONTINUE');

      expect(internals.levelUpBadges.map((b) => b.text)).toEqual(['SUPPORT', 'WEAPON', 'SUPPORT']);
      expect(internals.levelUpButtons.map((b) => b.text)).toEqual(['Vitality', 'Twin Fangs', 'Rapid Fire']);
      expect(internals.levelUpDescriptions[0].text).toBe(`+${VITALITY_REGEN_PER_SECOND} HP/sec regen`);
      expect(internals.levelUpCardImages[1]?.visible).toBe(true);
      expect(internals.levelUpCardImages[1]?.textureKey).toBe('weapon-twin-fangs');
      expect(internals.levelUpCardImages[0]?.visible).toBe(false);
      expect(internals.levelUpWeaponTagIcons[1].container.visible).toBe(true);
      expect(internals.levelUpWeaponTagIcons[0].container.visible).toBe(false);

      // Card 0 encloses legacy overlay-input E2E click coordinate (258, 372)
      const card0 = internals.levelUpCards[0];
      expect(258).toBeGreaterThanOrEqual(card0.x - card0.width / 2);
      expect(258).toBeLessThanOrEqual(card0.x + card0.width / 2);
      expect(372).toBeGreaterThanOrEqual(card0.y - card0.height / 2);
      expect(372).toBeLessThanOrEqual(card0.y + card0.height / 2);

      // Click each card forwards index & pointer cleanly
      const fakePointer = { id: 7 };
      internals.levelUpCards[1].emit('pointerdown', fakePointer);
      expect(runSceneStub.selectLevelUp).toHaveBeenCalledWith(1, fakePointer);

      // Verify 2 choices hides slot 2 and disables input on it
      ui.registry.set('run.levelUpChoices', [vitality, rapidFire]);
      ui.registry.set('run.levelUpChoiceCount', 2);
      ui.update();
      expect(internals.levelUpCards[0].visible).toBe(true);
      expect(internals.levelUpCards[1].visible).toBe(true);
      expect(internals.levelUpCards[0].input?.enabled).toBe(true);
      expect(internals.levelUpCards[1].input?.enabled).toBe(true);
      expect(internals.levelUpCards[2].visible).toBe(false);
      expect(internals.levelUpCards[2].input?.enabled).toBe(false);
      expect(internals.levelUpCards[0].x).toBe(600);
      expect(internals.levelUpCards[1].x).toBe(1000);

      // Verify 1 choice centers card 0 and disables slots 1 & 2
      ui.registry.set('run.levelUpChoices', [twinFangs]);
      ui.registry.set('run.levelUpChoiceCount', 1);
      ui.update();
      expect(internals.levelUpCards[0].visible).toBe(true);
      expect(internals.levelUpCards[0].x).toBe(800);
      expect(internals.levelUpCards[1].visible).toBe(false);
      expect(internals.levelUpCards[1].input?.enabled).toBe(false);
      expect(internals.levelUpCards[2].visible).toBe(false);
      expect(internals.levelUpCards[2].input?.enabled).toBe(false);
    } finally {
      restoreViewport();
    }
  });

  test('distinguishes BREAKTHROUGH BONUS, SIGNATURE, BRANCH badges and safely falls back when weapon PNG is absent', () => {
    const noTex = createUiFixture({ texturesExist: false });
    try {
      const emberUnlock = pickUpgrade('unlock-ember-lance');
      const signature = UPGRADE_POOL.find((entry) => entry.kind === 'signature');
      const branch = UPGRADE_POOL.find((entry) => entry.kind === 'branch');
      expect(signature).toBeTruthy();
      expect(branch).toBeTruthy();
      if (!signature || !branch) return;

      noTex.ui.registry.set('run.levelUpActive', true);
      noTex.ui.registry.set('run.levelUpMode', 'breakthrough');
      noTex.ui.registry.set('run.levelUpRemainingMs', 2400);
      noTex.ui.registry.set('run.levelUpChoices', [emberUnlock, signature, branch]);
      noTex.ui.registry.set('run.levelUpChoiceCount', 3);
      noTex.ui.update();

      const internals = noTex.ui as unknown as {
        levelUpHeadingText: { text: string };
        levelUpSubheadingText: { text: string };
        levelUpTimerText: { text: string; style: { color: string } };
        levelUpOverlayVisualKey: string;
        levelUpBadges: Array<{ text: string }>;
        levelUpCards: Array<{ getData: (k: string) => unknown }>;
        levelUpCardImages: Array<unknown>;
        levelUpGlyphGraphics: Array<{ visible: boolean }>;
      };

      expect(internals.levelUpHeadingText.text).toBe('BREAKTHROUGH BONUS');
      expect(internals.levelUpSubheadingText.text).toBe('CHOOSE ONE UPGRADE · RARE WEAPON BONUS');
      expect(internals.levelUpOverlayVisualKey).toBe('breakthrough');
      expect(internals.levelUpTimerText.text).toBe('2.4s');
      expect(internals.levelUpTimerText.style.color).toBe('#dc2626');
      expect(internals.levelUpBadges.map((b) => b.text)).toEqual(['WEAPON', 'SIGNATURE', 'BRANCH']);
      // Disabled PNG categories remain disabled & missing weapon textures fall back cleanly to procedural glyphs
      expect(internals.levelUpCards[0].getData('assetIconReady')).toBe(false);
      expect(internals.levelUpCards[0].getData('weaponUnlockIconReady')).toBe(false);
      expect(internals.levelUpCards[1].getData('assetIconReady')).toBe(false);
      expect(internals.levelUpCards[2].getData('assetIconReady')).toBe(false);
      expect(internals.levelUpCardImages[0]).toBeNull();
      expect(internals.levelUpGlyphGraphics[0].visible).toBe(true);
    } finally {
      noTex.restoreViewport();
    }
  });

  test('renders dramatically distinct EVOLUTION screen with Twin and Sniper class definitions, zero timer, and clean click selection', () => {
    const { ui, runSceneStub, restoreViewport } = createUiFixture({ viewportWidth: 844, viewportHeight: 390 });
    try {
      ui.registry.set('run.levelUpActive', false);
      ui.registry.set('run.classChoiceActive', true);
      ui.registry.set('run.classChoiceChoices', [TANK_CLASS_DEFINITIONS.twin, TANK_CLASS_DEFINITIONS.sniper]);
      ui.update();

      const snap = ui.getHudSnapshot();
      expect(snap.classChoiceVisible).toBe(true);
      expect(snap.levelUpVisible).toBe(false);

      const internals = ui as unknown as {
        classChoiceContainer: { children: unknown[] };
        classChoiceHeadingText: { text: string };
        classChoiceSubheadingText: { text: string };
        classChoiceNoteText: { text: string };
        classChoiceTitles: Array<{ text: string; visible: boolean }>;
        classChoiceDescriptions: Array<{ text: string; visible: boolean }>;
        classChoiceActionLabels: Array<{ text: string; visible: boolean }>;
        classChoiceCards: Array<{
          x: number;
          y: number;
          width: number;
          height: number;
          getData: (k: string) => unknown;
          emit: (e: string, ...args: unknown[]) => void;
        }>;
        levelUpTimerText: unknown;
      };

      expect(internals.classChoiceHeadingText.text).toBe('EVOLUTION');
      expect(internals.classChoiceSubheadingText.text).toBe('CHOOSE YOUR CLASS');
      expect(internals.classChoiceNoteText.text).toBe('LEVEL 4 · ONE-TIME CLASS CHOICE');
      expect(internals.classChoiceTitles.map((t) => t.text)).toEqual(['TWIN', 'SNIPER']);
      expect(internals.classChoiceDescriptions.map((d) => d.text)).toEqual([
        'Two-shot spread for close shape farming.',
        'Longer, harder shots for precision pressure.',
      ]);
      expect(internals.classChoiceActionLabels.map((a) => a.text)).toEqual(['EVOLVE', 'EVOLVE']);
      expect(internals.classChoiceCards[0].getData('assetIconReady')).toBe(false);
      expect(internals.classChoiceCards[1].getData('assetIconReady')).toBe(false);

      // Evolution overlay has no countdown timer inside it
      expect(internals.classChoiceContainer.children).not.toContain(internals.levelUpTimerText);

      // Card 0 preserves both legacy E2E click coordinates (610, 378) and (610, 438)
      const twinCard = internals.classChoiceCards[0];
      expect(610).toBeGreaterThanOrEqual(twinCard.x - twinCard.width / 2);
      expect(610).toBeLessThanOrEqual(twinCard.x + twinCard.width / 2);
      expect(378).toBeGreaterThanOrEqual(twinCard.y - twinCard.height / 2);
      expect(438).toBeLessThanOrEqual(twinCard.y + twinCard.height / 2);

      // Distinct visual tokens exist in overlay theme
      expect(DOODLE_OVERLAY_COLORS.archStone).not.toBe(DOODLE_COLORS.paperGold);

      const ptr = { id: 9 };
      internals.classChoiceCards[0].emit('pointerdown', ptr);
      internals.classChoiceCards[1].emit('pointerdown', ptr);
      expect(runSceneStub.selectTankClass).toHaveBeenNthCalledWith(1, 'twin', ptr);
      expect(runSceneStub.selectTankClass).toHaveBeenNthCalledWith(2, 'sniper', ptr);

      // All decorative Graphics created for overlays never intercept pointer input
      const createdGraphics = (ui.add.graphics as ReturnType<typeof vi.fn>).mock.results.map((r) => r.value);
      for (const g of createdGraphics) {
        expect(g.setInteractive).not.toHaveBeenCalled();
      }
    } finally {
      restoreViewport();
    }
  });
});

describe('UIScene R3G-C2 stat allocation, pause menu, and run results', () => {
  test('renders stat workbench with real TANK_STAT_DEFINITIONS, immediate tap spend, disabled maxed tiles, and overlay hiding', () => {
    const { ui, runSceneStub, restoreViewport } = createUiFixture({ viewportWidth: 844, viewportHeight: 390 });
    try {
      ui.registry.set('run.statPoints', 2);
      ui.registry.set('run.tankStatLevels', {
        bulletDamage: 2,
        reload: 5,
        moveSpeed: 1,
        hpRegen: 0,
      });
      ui.update();

      const snap = ui.getHudSnapshot();
      expect(snap.statPanelVisible).toBe(true);

      const internals = ui as unknown as {
        statPointText: { text: string };
        statButtons: Record<string, {
          x: number;
          y: number;
          width: number;
          height: number;
          input: { enabled: boolean } | null;
          getData: (k: string) => unknown;
          emit: (e: string, ...args: unknown[]) => void;
        }>;
        statButtonLabels: Record<string, { text: string; style: { color: string } }>;
        statButtonVisualKeys: Record<string, string>;
      };

      expect(internals.statPointText.text).toBe('STAT POINTS 2');
      expect(Object.keys(internals.statButtons)).toEqual(TANK_STAT_IDS);
      expect(internals.statButtonLabels.bulletDamage.text).toBe(
        `${TANK_STAT_DEFINITIONS.bulletDamage.shortLabel} 2/${TANK_STAT_DEFINITIONS.bulletDamage.maxLevel}\n${TANK_STAT_DEFINITIONS.bulletDamage.summary}`,
      );
      expect(internals.statButtonLabels.reload.text).toBe(
        `${TANK_STAT_DEFINITIONS.reload.shortLabel} 5/${TANK_STAT_DEFINITIONS.reload.maxLevel}\n${TANK_STAT_DEFINITIONS.reload.summary}`,
      );
      expect(internals.statButtonLabels.moveSpeed.text).toBe(
        `${TANK_STAT_DEFINITIONS.moveSpeed.shortLabel} 1/${TANK_STAT_DEFINITIONS.moveSpeed.maxLevel}\n${TANK_STAT_DEFINITIONS.moveSpeed.summary}`,
      );
      expect(internals.statButtonLabels.hpRegen.text).toBe(
        `${TANK_STAT_DEFINITIONS.hpRegen.shortLabel} 0/${TANK_STAT_DEFINITIONS.hpRegen.maxLevel}\n${TANK_STAT_DEFINITIONS.hpRegen.summary}`,
      );

      // Spendable stats stay visually active & interactive; maxed stats (reload 5/5) are disabled
      expect(internals.statButtons.bulletDamage.getData('canSpend')).toBe(true);
      expect(internals.statButtons.bulletDamage.input?.enabled).toBe(true);
      expect(internals.statButtons.reload.getData('canSpend')).toBe(false);
      expect(internals.statButtons.reload.input?.enabled).toBe(false);
      expect(internals.statButtonLabels.reload.style.color).toBe(DOODLE_HEX.inkMuted);
      expect(internals.statButtonVisualKeys.reload).toBe('5:0:0');

      // Preserves existing E2E tap coordinates (540, 624) for DMG and (888, 624) for SPD
      const dmgBtn = internals.statButtons.bulletDamage;
      const spdBtn = internals.statButtons.moveSpeed;
      expect(540).toBeGreaterThanOrEqual(dmgBtn.x - dmgBtn.width / 2);
      expect(540).toBeLessThanOrEqual(dmgBtn.x + dmgBtn.width / 2);
      expect(624).toBeGreaterThanOrEqual(dmgBtn.y - dmgBtn.height / 2);
      expect(624).toBeLessThanOrEqual(dmgBtn.y + dmgBtn.height / 2);
      expect(888).toBeGreaterThanOrEqual(spdBtn.x - spdBtn.width / 2);
      expect(888).toBeLessThanOrEqual(spdBtn.x + spdBtn.width / 2);

      // Workbench panel does not overlap MOVE (right <= 382), AIM (left >= 1218), or PULSE (bottom <= 444)
      expect(dmgBtn.x - dmgBtn.width / 2).toBeGreaterThan(382);
      expect(internals.statButtons.hpRegen.x + internals.statButtons.hpRegen.width / 2).toBeLessThan(1218);
      expect(dmgBtn.y - dmgBtn.height / 2).toBeGreaterThan(444);

      const ptr = { id: 12 };
      dmgBtn.emit('pointerdown', ptr);
      spdBtn.emit('pointerdown', ptr);
      expect(runSceneStub.allocateTankStat).toHaveBeenNthCalledWith(1, 'bulletDamage', ptr);
      expect(runSceneStub.allocateTankStat).toHaveBeenNthCalledWith(2, 'moveSpeed', ptr);

      // Hides cleanly under conflicting overlays
      ui.registry.set('run.levelUpActive', true);
      ui.registry.set('run.levelUpChoices', [pickUpgrade('vitality')]);
      ui.update();
      expect(ui.getHudSnapshot().statPanelVisible).toBe(false);
      expect(internals.statButtons.bulletDamage.input?.enabled).toBe(false);

      ui.registry.set('run.levelUpActive', false);
      ui.registry.set('run.classChoiceActive', true);
      ui.registry.set('run.classChoiceChoices', [TANK_CLASS_DEFINITIONS.twin, TANK_CLASS_DEFINITIONS.sniper]);
      ui.update();
      expect(ui.getHudSnapshot().statPanelVisible).toBe(false);

      ui.registry.set('run.classChoiceActive', false);
      ui.registry.set('run.endActive', true);
      ui.update();
      expect(ui.getHudSnapshot().statPanelVisible).toBe(false);
    } finally {
      restoreViewport();
    }
  });

  test('renders field-notebook pause menu with live summary, semantic button icons, input blocking, and fallback graphics', () => {
    const { ui, runSceneStub, restoreViewport } = createUiFixture({ viewportWidth: 844, viewportHeight: 390 });
    try {
      ui.registry.set('run.score', 3450);
      ui.registry.set('run.goldEarned', 78);
      ui.registry.set('run.stagePhase', 'boss');
      ui.registry.set('run.tankClass', { title: 'Sniper' });
      ui.registry.set('run.pauseMenuActive', true);
      ui.update();

      const snap = ui.getHudSnapshot();
      expect(snap.pauseMenuVisible).toBe(true);
      expect(snap.pauseButtonVisible).toBe(false);
      expect(snap.activeAbilityButtonVisible).toBe(false);
      expect(snap.pauseMenuButtons).toEqual(['Resume', 'Restart Run', 'Return to Main Menu']);
      expect(snap.pauseMenuButtonBounds).toHaveLength(3);
      expect(snap.uiButtonIconVisible).toEqual({ close: true, retry: true });

      const internals = ui as unknown as {
        pauseMenuBackdrop: { setInteractive: ReturnType<typeof vi.fn>; input: { enabled: boolean } | null };
        pauseMenuSummaryText: { text: string };
        pauseMenuButtons: Array<{ emit: (e: string, ...args: unknown[]) => void }>;
        pauseMenuPlayIcon: { textureKey: string; alpha: number; visible: boolean; y: number } | null;
        pauseMenuButtonIcons: {
          retry?: { textureKey: string; alpha: number; y: number };
          close?: { textureKey: string; alpha: number; y: number };
        };
      };

      expect(internals.pauseMenuBackdrop.setInteractive).toHaveBeenCalled();
      expect(internals.pauseMenuBackdrop.input?.enabled).toBe(true);
      expect(internals.pauseMenuSummaryText.text).toBe('LV 7 Sniper  |  02:00  |  Score 3450\nRun Gold 78  |  Boss active');

      // Resume pairs with play icon rather than close; Return to Main Menu uses close
      expect(internals.pauseMenuPlayIcon?.textureKey).toBe('ui-button-play');
      expect(internals.pauseMenuPlayIcon?.alpha).toBe(1);
      expect(internals.pauseMenuButtonIcons.retry?.textureKey).toBe('ui-button-retry');
      expect(internals.pauseMenuButtonIcons.close?.textureKey).toBe('ui-button-close');
      expect(internals.pauseMenuButtonIcons.close?.y).toBeGreaterThan(internals.pauseMenuButtonIcons.retry?.y ?? 0);

      const ptr = { id: 3 };
      internals.pauseMenuButtons[0].emit('pointerdown', ptr);
      internals.pauseMenuButtons[1].emit('pointerdown', ptr);
      internals.pauseMenuButtons[2].emit('pointerdown', ptr);
      expect(runSceneStub.closeManualPauseMenu).toHaveBeenCalledWith(ptr);
      expect(runSceneStub.restartRun).toHaveBeenCalledTimes(1);
      expect(runSceneStub.exitToMenu).toHaveBeenCalledTimes(1);

      // Missing textures cleanly omit PNG images and rely on procedural fallbacks
      const noTex = createUiFixture({ texturesExist: false });
      try {
        noTex.ui.registry.set('run.pauseMenuActive', true);
        noTex.ui.update();
        const noTexSnap = noTex.ui.getHudSnapshot();
        expect(noTexSnap.pauseMenuVisible).toBe(true);
        expect(noTexSnap.uiButtonIconVisible).toEqual({ close: false, retry: false });
      } finally {
        noTex.restoreViewport();
      }
    } finally {
      restoreViewport();
    }
  });

  test('renders distinct Victory and Defeat posters, real stats/NEW BEST/leaderboard, empty leaderboard fallback, and Enter/Space/click exit', () => {
    const { ui, runSceneStub, restoreViewport } = createUiFixture({ viewportWidth: 1280, viewportHeight: 720 });
    try {
      const internals = ui as unknown as {
        endTitleText: { text: string; style: { color: string } };
        endSubtitleText: { text: string };
        endButton: { text: string; input: { enabled: boolean } | null; emit: (e: string) => void };
        endVisualStateKey: string;
      };
      const keyboard = (ui.input as unknown as { keyboard: { emit: (e: string) => void } }).keyboard;

      // Confirm hidden end overlay does not respond to Enter/Space or consume pointer input
      keyboard.emit('keydown-ENTER');
      expect(runSceneStub.exitToMenu).not.toHaveBeenCalled();

      // 1. Defeat state with empty leaderboard and newBestScore = false
      ui.registry.set('run.endActive', true);
      ui.registry.set('run.victory', false);
      ui.registry.set('run.endTitle', 'Run Ended');
      ui.registry.set('run.endSubtitle', 'Overwhelmed in sector 2');
      ui.registry.set('run.finalScore', 420);
      ui.registry.set('run.bestScore', 900);
      ui.registry.set('run.newBestScore', false);
      ui.registry.set('run.kills', 18);
      ui.registry.set('run.goldEarned', 35);
      ui.registry.set('run.elapsedMs', 95_000);
      ui.registry.set('run.localLeaderboard', []);
      ui.update();

      let snap = ui.getHudSnapshot();
      expect(internals.endTitleText.text).toBe('Run Ended');
      expect(internals.endTitleText.style.color).toBe('#7f1d1d');
      expect(internals.endSubtitleText.text).toBe('Overwhelmed in sector 2');
      expect(internals.endVisualStateKey).toBe('0:0');
      expect(snap.endStats).toBe('Score 420\nBest 900\nTime 01:35  Kills 18  Gold +35');
      expect(snap.endStats).not.toContain('NEW BEST');
      expect(snap.leaderboard).toBe('Local Top 5\nNo local runs recorded yet.');

      // 2. Victory state with newBestScore = true and populated leaderboard
      ui.registry.set('run.victory', true);
      ui.registry.set('run.endTitle', 'Victory');
      ui.registry.set('run.endSubtitle', 'Guardian core cleared');
      ui.registry.set('run.finalScore', 5400);
      ui.registry.set('run.bestScore', 5400);
      ui.registry.set('run.newBestScore', true);
      ui.registry.set('run.kills', 142);
      ui.registry.set('run.goldEarned', 310);
      ui.registry.set('run.elapsedMs', 900_000);
      ui.registry.set('run.localLeaderboard', [
        { score: 5400, classTitle: 'Sniper', level: 12, kills: 142, timeSurvivedMs: 900_000, timestamp: 1700000000000 },
      ]);
      ui.update();

      snap = ui.getHudSnapshot();
      expect(internals.endTitleText.text).toBe('Victory');
      expect(internals.endTitleText.style.color).toBe(DOODLE_HEX.ink);
      expect(internals.endVisualStateKey).toBe('1:1');
      expect(snap.endStats).toBe('Score 5400  NEW BEST\nBest 5400\nTime 15:00  Kills 142  Gold +310');
      expect(snap.leaderboard).toContain('Local Top 5');
      expect(snap.leaderboard).toContain('1. 5400  Sniper  LV 12  K 142  15:00');
      expect(internals.endButton.text).toBe('Return to Menu');
      expect(internals.endButton.input?.enabled).toBe(true);

      internals.endButton.emit('pointerdown');
      keyboard.emit('keydown-ENTER');
      keyboard.emit('keydown-SPACE');
      expect(runSceneStub.exitToMenu).toHaveBeenCalledTimes(3);

      // Decorative Graphics across all three R3G-C2 surfaces remain strictly non-interactive
      const createdGraphics = (ui.add.graphics as ReturnType<typeof vi.fn>).mock.results.map((r) => r.value);
      for (const g of createdGraphics) {
        expect(g.setInteractive).not.toHaveBeenCalled();
      }
    } finally {
      restoreViewport();
    }
  });

  test('consolidates top-center doodle alerts, reward toasts, and events without overlap, isolates modals, and resets cleanly on shutdown', () => {
    const { ui, restoreViewport } = createUiFixture({ viewportWidth: 1280, viewportHeight: 720 });
    try {
      const internals = ui as unknown as {
        timerText: { y: number };
        alertPillGraphics: { visible: boolean; setInteractive: ReturnType<typeof vi.fn> };
        alertText: { y: number; text: string; height: number; visible: boolean; input: { enabled: boolean } | null };
        rewardPillGraphics: { visible: boolean; setInteractive: ReturnType<typeof vi.fn> };
        rewardText: { y: number; text: string; height: number; visible: boolean; input: { enabled: boolean } | null };
        eventPillGraphics: { visible: boolean; setInteractive: ReturnType<typeof vi.fn> };
        eventTitleText: { y: number; text: string; height: number; visible: boolean };
        eventBodyText: { y: number; text: string; visible: boolean };
        timerSubtitleText: { visible: boolean };
        alertPillStateKey: string;
        rewardPillStateKey: string;
        eventPillStateKey: string;
      };

      // 1. Standalone encounter alert stacks cleanly under the timer pill (timer bottom = 47)
      ui.registry.set('run.alertKind', 'miniboss');
      ui.registry.set('run.alertText', 'MINIBOSS · DREADNOUGHT');
      ui.registry.set('run.rewardText', '');
      ui.registry.set('run.eventActive', false);
      ui.update();

      expect(internals.alertPillGraphics.visible).toBe(true);
      expect(internals.alertText.visible).toBe(true);
      expect(internals.alertText.text).toBe('MINIBOSS · DREADNOUGHT');
      const alertHalfH = Math.max(26, Math.ceil(internals.alertText.height + 10)) / 2;
      expect(internals.alertText.y - alertHalfH).toBeGreaterThanOrEqual(54);
      expect(internals.alertText.y).toBeGreaterThan(internals.timerText.y + 19);

      // 2. Simultaneous alert + reward + active event stacks strictly downwards without overlap
      ui.registry.set('run.alertKind', 'boss');
      ui.registry.set('run.alertText', 'BOSS · BEHEMOTH');
      ui.registry.set('run.rewardText', 'Stats maxed');
      ui.registry.set('run.rewardColor', '#fde68a');
      ui.registry.set('run.eventActive', true);
      ui.registry.set('run.eventTitle', 'Challenge Wave');
      ui.registry.set('run.eventText', 'Hold out for 12s');
      ui.registry.set('run.eventRemainingMs', 12_000);
      ui.update();

      const snapActive = ui.getHudSnapshot();
      expect(snapActive.rewardText).toBe('Stats maxed');
      const alertBottom = internals.alertText.y + Math.max(26, Math.ceil(internals.alertText.height + 10)) / 2;
      const rewardHalfH = Math.max(26, Math.ceil(internals.rewardText.height + 10)) / 2;
      expect(internals.rewardText.y - rewardHalfH).toBeGreaterThan(alertBottom);
      const rewardBottom = internals.rewardText.y + rewardHalfH;
      expect(internals.eventTitleText.y - internals.eventTitleText.height / 2).toBeGreaterThan(rewardBottom);

      // 3. Clearing alert pulls standalone reward toast up to the compact top notification slot
      ui.registry.set('run.alertText', '');
      ui.registry.set('run.eventActive', false);
      ui.update();
      const singleToastTop = internals.rewardText.y - rewardHalfH;
      expect(singleToastTop).toBeGreaterThanOrEqual(54);
      expect(singleToastTop).toBeLessThan(70);

      // 4. All top-center notification visuals remain strictly non-interactive
      expect(internals.alertPillGraphics.setInteractive).not.toHaveBeenCalled();
      expect(internals.rewardPillGraphics.setInteractive).not.toHaveBeenCalled();
      expect(internals.eventPillGraphics.setInteractive).not.toHaveBeenCalled();
      expect(internals.alertText.input).toBeNull();
      expect(internals.rewardText.input).toBeNull();

      // 5. Modals (level-up BONUS PICK, class evolution, pause, end results, portrait hint) hide notifications
      ui.registry.set('run.alertKind', 'elite');
      ui.registry.set('run.alertText', 'ELITE · OVERLORD');
      ui.registry.set('run.rewardText', 'Reward target secured: +18 gold | +24 XP');
      ui.registry.set('run.eventActive', true);

      for (const modalKey of [
        'run.levelUpActive',
        'run.classChoiceActive',
        'run.pauseMenuActive',
        'run.endActive',
      ] as const) {
        ui.registry.set(modalKey, true);
        ui.update();
        expect(internals.alertPillGraphics.visible).toBe(false);
        expect(internals.alertText.visible).toBe(false);
        expect(internals.rewardPillGraphics.visible).toBe(false);
        expect(internals.rewardText.visible).toBe(false);
        expect(internals.eventPillGraphics.visible).toBe(false);
        expect(internals.eventTitleText.visible).toBe(false);
        expect(internals.eventBodyText.visible).toBe(false);
        expect(internals.timerSubtitleText.visible).toBe(false);
        ui.registry.set(modalKey, false);
      }

      // Portrait orientation hint also suppresses notifications and exposes active reward in combat
      Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 844, configurable: true });
      ui.update();
      expect(internals.alertPillGraphics.visible).toBe(false);
      expect(internals.rewardPillGraphics.visible).toBe(false);
      expect(internals.eventPillGraphics.visible).toBe(false);

      // Restoring landscape desktop brings notifications cleanly back
      Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 720, configurable: true });
      ui.update();
      expect(internals.alertPillGraphics.visible).toBe(true);
      expect(internals.rewardPillGraphics.visible).toBe(true);
      expect(internals.eventPillGraphics.visible).toBe(true);

      // 6. Shutdown clears cached notification state keys cleanly for scene re-entry
      const shutdownCalls = (ui.events.once as ReturnType<typeof vi.fn>).mock.calls.filter(
        ([eventName]) => eventName === 'shutdown',
      );
      expect(shutdownCalls.length).toBeGreaterThan(0);
      const [, shutdownHandler, shutdownContext] = shutdownCalls[shutdownCalls.length - 1];
      (shutdownHandler as () => void).call(shutdownContext);
      expect(internals.alertPillStateKey).toBe('');
      expect(internals.rewardPillStateKey).toBe('');
      expect(internals.eventPillStateKey).toBe('');
    } finally {
      restoreViewport();
    }
  });
});
