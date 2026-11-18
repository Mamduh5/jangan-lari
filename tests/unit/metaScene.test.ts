import { afterEach, describe, expect, test, vi } from 'vitest';
import { HEROES } from '../../src/game/data/heroes';
import { PERMANENT_UPGRADES } from '../../src/game/data/permanentUpgrades';
import { QUESTS } from '../../src/game/data/quests';
import {
  createDefaultSaveData,
  loadGameSave,
  writeGameSave,
  type GameSaveData,
} from '../../src/game/save/saveData';

vi.mock('phaser', () => {
  class MockRectangle {
    x: number;
    y: number;
    width: number;
    height: number;
    fillColor = 0;
    strokeColor = 0;
    scene: unknown = {};

    constructor(x: number, y: number, w: number, h: number) {
      this.x = x;
      this.y = y;
      this.width = w;
      this.height = h;
    }

    setOrigin() { return this; }
    setStrokeStyle(width: number, color: number) {
      this.strokeColor = color;
      return this;
    }
    setFillStyle(color: number) {
      this.fillColor = color;
      return this;
    }
  }

  class MockText {
    text: string;
    x: number;
    y: number;
    width = 160;
    displayWidth = 160;
    style: Record<string, unknown>;
    scene: unknown = {};
    input: { enabled: boolean } | null = null;
    private listeners = new Map<string, Array<(...args: unknown[]) => void>>();

    constructor(x: number, y: number, text: string, style: Record<string, unknown> = {}) {
      this.x = x;
      this.y = y;
      this.text = text;
      this.style = { ...style };
    }

    setOrigin() { return this; }
    setText(next: string) { this.text = next; return this; }
    setColor(color: string) { this.style.color = color; return this; }
    setStyle(next: Record<string, unknown>) { this.style = { ...this.style, ...next }; return this; }
    setInteractive() {
      if (!this.scene) throw new TypeError("Cannot read properties of undefined (reading 'sys')");
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

  class MockImage {
    x: number;
    y: number;
    textureKey: string;
    scene: unknown = {};
    constructor(x: number, y: number, key: string) {
      this.x = x;
      this.y = y;
      this.textureKey = key;
    }
    setDisplaySize() { return this; }
    setAlpha() { return this; }
  }

  class MockScene {
    createdObjects: Array<{ scene?: unknown }> = [];
    cameras = { main: { setBackgroundColor: vi.fn() } };
    textures = { exists: vi.fn(() => true) };
    scene = { start: vi.fn() };
    private shutdownListeners: Array<{ cb: () => void; ctx: unknown }> = [];
    private keyboardListeners = new Map<string, Array<{ cb: () => void; ctx: unknown }>>();
    events = {
      once: vi.fn((event: string, cb: () => void, ctx?: unknown) => {
        if (event === 'shutdown') {
          this.shutdownListeners.push({ cb, ctx });
        }
      }),
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
      rectangle: vi.fn((x: number, y: number, w: number, h: number) => {
        const rect = new MockRectangle(x, y, w, h);
        this.createdObjects.push(rect);
        return rect;
      }),
      text: vi.fn((x: number, y: number, text: string, style?: Record<string, unknown>) => {
        const txt = new MockText(x, y, text, style);
        this.createdObjects.push(txt);
        return txt;
      }),
      image: vi.fn((x: number, y: number, key: string) => {
        const img = new MockImage(x, y, key);
        this.createdObjects.push(img);
        return img;
      }),
    };
  }

  return {
    default: {
      Scene: MockScene,
      Scenes: { Events: { SHUTDOWN: 'shutdown' } },
    },
  };
});

import { MetaScene } from '../../src/game/scenes/MetaScene';

function createMetaFixture(saveOverride?: Partial<GameSaveData>) {
  window.localStorage.clear();
  const base = createDefaultSaveData();
  writeGameSave({ ...base, ...saveOverride });
  const scene = new MetaScene();
  scene.create();
  return scene;
}

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('MetaScene R3G-D3-A crash repair and regression protection', () => {
  test('initializes all 5 upgrade rows and all 5 quest rows and reflects locked, affordable, unaffordable, and maxed states', () => {
    const scene = createMetaFixture({
      totalGold: 22,
      selectedHero: 'runner',
      purchasedPermanentUpgrades: {
        'max-hp': 5, // maxed
        'move-speed': 0, // affordable (cost 20 <= 22)
        'pickup-range': 1, // unaffordable (cost 18 + 16 = 34 > 22)
        'starting-damage': 0, // locked
        'hp-regen': 0, // unaffordable (cost 24 > 22)
      },
      unlockedPermanentUpgrades: ['max-hp', 'move-speed', 'pickup-range', 'hp-regen'],
      completedQuests: ['kill-100-enemies'],
      progressStats: {
        totalKills: 120,
        totalSurvivalMs: 90_000,
        maxLevelReached: 6,
        totalGoldCollected: 250,
        eliteKills: 0,
      },
    });

    const internals = scene as unknown as {
      goldText: { text: string };
      headerText: { text: string };
      upgradeFrames: unknown[];
      upgradeButtons: Array<{ text: string; emit: (e: string) => void }>;
      upgradeDetails: Array<{ text: string }>;
      questFrames: unknown[];
      questTexts: Array<{ text: string }>;
    };

    expect(internals.upgradeFrames).toHaveLength(PERMANENT_UPGRADES.length);
    expect(internals.upgradeButtons).toHaveLength(PERMANENT_UPGRADES.length);
    expect(internals.upgradeDetails).toHaveLength(PERMANENT_UPGRADES.length);
    expect(internals.questFrames).toHaveLength(QUESTS.length);
    expect(internals.questTexts).toHaveLength(QUESTS.length);

    expect(internals.goldText.text).toBe('Gold 22');
    expect(internals.headerText.text).toBe(`Selected Hero: ${HEROES.runner.name}`);

    expect(internals.upgradeButtons[0].text).toBe('Max');
    expect(internals.upgradeDetails[0].text).toContain('Maxed');
    expect(internals.upgradeButtons[1].text).toBe('Buy 20g');
    expect(internals.upgradeDetails[1].text).toContain('Available');
    expect(internals.upgradeButtons[2].text).toBe('Buy 34g');
    expect(internals.upgradeDetails[2].text).toContain('Need More Gold');
    expect(internals.upgradeButtons[3].text).toBe('Quest');
    expect(internals.upgradeDetails[3].text).toContain('Quest Locked');

    expect(internals.questTexts[0].text).toContain('Complete');
    expect(internals.questTexts[1].text).toContain('90s / 300s');
  });

  test('supports repeated scene entry/shutdown, ESC and Back button navigation without duplicate listeners or stale destroyed refs', () => {
    const scene = createMetaFixture({ totalGold: 100 });
    const mockEvents = scene.events as unknown as { emitShutdown: () => void };
    const keyboard = scene.input.keyboard as unknown as {
      emit: (e: string) => void;
      listenerCount: (e: string) => number;
    };

    for (let cycle = 0; cycle < 10; cycle += 1) {
      expect(keyboard.listenerCount('keydown-ESC')).toBe(1);
      const internals = scene as unknown as {
        upgradeButtons: Array<{ emit: (e: string) => void }>;
        backButton: { emit: (e: string) => void };
      };
      const staleButton = internals.upgradeButtons[0];

      if (cycle % 2 === 0) {
        internals.backButton.emit('pointerdown');
      } else {
        keyboard.emit('keydown-ESC');
      }
      expect(scene.scene.start).toHaveBeenCalledTimes(cycle + 1);
      expect(scene.scene.start).toHaveBeenLastCalledWith('MenuScene');

      // Double Back/ESC in same transition frame does not double-start MenuScene
      keyboard.emit('keydown-ESC');
      expect(scene.scene.start).toHaveBeenCalledTimes(cycle + 1);

      mockEvents.emitShutdown();
      expect(keyboard.listenerCount('keydown-ESC')).toBe(0);

      // Late pointerout fired on destroyed object must not throw
      expect(() => staleButton.emit('pointerout')).not.toThrow();

      scene.create();
    }
  });

  test('handles purchase success, failure, persistence across re-entry, and legacy/corrupted save sanitization', () => {
    window.localStorage.clear();
    // Inject legacy & corrupted save structure cleanly
    window.localStorage.setItem(
      'jangan-lari-save-v1',
      JSON.stringify({
        version: 1,
        totalGold: 'bad',
        selectedHero: 'removed-hero',
        purchasedPermanentUpgrades: { 'max-hp': 'NaN', 'move-speed': Infinity },
        progressStats: { totalKills: 'oops' },
      }),
    );

    const sanitized = loadGameSave();
    expect(Number.isNaN(sanitized.totalGold)).toBe(false);
    expect(sanitized.totalGold).toBe(0);
    expect(sanitized.purchasedPermanentUpgrades['max-hp']).toBe(0);
    expect(sanitized.purchasedPermanentUpgrades['move-speed']).toBe(0);

    // Purchase failure & success
    const scene = createMetaFixture({ totalGold: 25 });
    const internals = scene as unknown as {
      upgradeButtons: Array<{ emit: (e: string) => void }>;
      statusText: { text: string };
      goldText: { text: string };
    };

    // Locked Sharpened Core -> rejected
    internals.upgradeButtons[3].emit('pointerdown');
    expect(internals.statusText.text).toContain('locked behind a quest');

    // Affordable Field Rations (25g) -> succeeds, persists across reload
    internals.upgradeButtons[0].emit('pointerdown');
    expect(internals.goldText.text).toBe('Gold 0');
    expect(internals.statusText.text).toContain('Field Rations purchased');
    expect(loadGameSave().purchasedPermanentUpgrades['max-hp']).toBe(1);

    // Next rank costs 45g with 0g -> rejected gracefully
    internals.upgradeButtons[0].emit('pointerdown');
    expect(internals.statusText.text).toContain('Not enough gold');
  });
});
