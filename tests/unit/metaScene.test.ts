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
  class MockGraphics {
    depth = 0;
    scene: unknown = {};
    setInteractive = vi.fn().mockReturnThis();
    setDepth(depth: number) { this.depth = depth; return this; }
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
    displayWidth = 180;
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
    }

    setOrigin() { return this; }
    setDepth(depth: number) { this.depth = depth; return this; }
    setVisible(visible: boolean) { this.visible = visible; return this; }
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
    depth = 0;
    alpha = 1;
    scene: unknown = {};
    constructor(x: number, y: number, key: string) {
      this.x = x;
      this.y = y;
      this.textureKey = key;
    }
    setDisplaySize() { return this; }
    setDepth(depth: number) { this.depth = depth; return this; }
    setAlpha(alpha: number) { this.alpha = alpha; return this; }
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
      graphics: vi.fn(() => {
        const gfx = new MockGraphics();
        this.createdObjects.push(gfx);
        return gfx;
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

describe('MetaScene R3G-D3 doodle Meta Progression and crash protection', () => {
  test('renders all 5 upgrades and 5 quests in doodle UI with distinct available, unaffordable, locked, maxed, and quest states', () => {
    const scene = createMetaFixture({
      totalGold: 22,
      selectedHero: 'runner',
      purchasedPermanentUpgrades: {
        'max-hp': 5, // maxed
        'move-speed': 0, // affordable (cost 20 <= 22)
        'pickup-range': 1, // unaffordable (cost 34 > 22)
        'starting-damage': 0, // quest locked
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
      upgradeTitles: Array<{ text: string }>;
      upgradeDescs: Array<{ text: string }>;
      upgradeStates: Array<{ text: string }>;
      upgradeButtons: Array<{ text: string; emit: (e: string) => void }>;
      questTitles: Array<{ text: string }>;
      questDescs: Array<{ text: string }>;
      questRewards: Array<{ text: string }>;
      questStamps: Array<{ text: string; visible: boolean }>;
      questProgressTexts: Array<{ text: string }>;
    };

    expect(internals.upgradeTitles.map((t) => t.text)).toEqual(PERMANENT_UPGRADES.map((u) => u.title));
    expect(internals.upgradeDescs.map((d) => d.text)).toEqual(PERMANENT_UPGRADES.map((u) => u.description));
    expect(internals.questTitles.map((q) => q.text)).toEqual(QUESTS.map((q) => q.title));
    expect(internals.questDescs.map((q) => q.text)).toEqual(QUESTS.map((q) => q.description));

    expect(internals.goldText.text).toBe('GOLD 22');
    expect(internals.headerText.text).toBe(`Selected Hero: ${HEROES.runner.name}`);

    // Maxed
    expect(internals.upgradeButtons[0].text.trim()).toBe('MAXED');
    expect(internals.upgradeStates[0].text).toBe('LV 5/5 · MAXED');
    // Affordable
    expect(internals.upgradeButtons[1].text).toBe('BUY 20g');
    expect(internals.upgradeStates[1].text).toBe('LV 0/5 · AVAILABLE');
    // Unaffordable
    expect(internals.upgradeButtons[2].text).toBe('NEED 34g');
    expect(internals.upgradeStates[2].text).toBe('LV 1/5 · NEED GOLD');
    // Quest locked
    expect(internals.upgradeButtons[3].text.trim()).toBe('LOCKED');
    expect(internals.upgradeStates[3].text).toBe('QUEST LOCKED');

    // Quests: completed vs active progress & accurate reward titles
    expect(internals.questRewards[0].text).toBe('COMPLETE');
    expect(internals.questStamps[0].visible).toBe(true);
    expect(internals.questStamps[0].text).toBe('Earned: +80 gold');
    expect(internals.questProgressTexts[0].text).toBe('100 / 100');

    expect(internals.questRewards[1].text).toBe('+100 gold');
    expect(internals.questStamps[1].visible).toBe(false);
    expect(internals.questProgressTexts[1].text).toBe('90s / 300s');
    expect(internals.questRewards[2].text).toBe('Unlock: Sharpened Core');
    expect(internals.questRewards[4].text).toBe('Unlock: Vanguard');

    // Decorative graphics never call setInteractive()
    const createdGraphics = (scene.add.graphics as ReturnType<typeof vi.fn>).mock.results.map((r) => r.value);
    expect(createdGraphics.length).toBeGreaterThan(0);
    for (const gfx of createdGraphics) {
      expect(gfx.setInteractive).not.toHaveBeenCalled();
    }
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
        backButton: { text: string; emit: (e: string) => void };
      };
      expect(internals.backButton.text).toBe('BACK TO MENU');
      const staleButton = internals.upgradeButtons[0];

      if (cycle % 2 === 0) {
        internals.backButton.emit('pointerdown');
      } else {
        keyboard.emit('keydown-ESC');
      }
      expect(scene.scene.start).toHaveBeenCalledTimes(cycle + 1);
      expect(scene.scene.start).toHaveBeenLastCalledWith('MenuScene');

      keyboard.emit('keydown-ESC');
      expect(scene.scene.start).toHaveBeenCalledTimes(cycle + 1);

      mockEvents.emitShutdown();
      expect(keyboard.listenerCount('keydown-ESC')).toBe(0);
      expect(() => staleButton.emit('pointerout')).not.toThrow();

      scene.create();
    }
  });

  test('handles purchase success, failure, persistence across re-entry, and legacy/corrupted save sanitization', () => {
    window.localStorage.clear();
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

    const scene = createMetaFixture({ totalGold: 25 });
    const internals = scene as unknown as {
      upgradeButtons: Array<{ text: string; emit: (e: string) => void }>;
      statusText: { text: string };
      goldText: { text: string };
    };

    // Locked Sharpened Core -> rejected with unlocking quest hint
    internals.upgradeButtons[3].emit('pointerdown');
    expect(internals.statusText.text).toContain('Power Spike');

    // Affordable Field Rations (25g) -> succeeds, persists across reload
    internals.upgradeButtons[0].emit('pointerdown');
    expect(internals.goldText.text).toBe('GOLD 0');
    expect(internals.statusText.text).toContain('Field Rations upgraded to Rank 1/5');
    expect(loadGameSave().purchasedPermanentUpgrades['max-hp']).toBe(1);
    expect(internals.upgradeButtons[0].text).toBe('NEED 45g');

    // Next rank costs 45g with 0g -> rejected gracefully
    internals.upgradeButtons[0].emit('pointerdown');
    expect(internals.statusText.text).toContain('Need 45 gold');
  });
});
