import { expect, test } from '@playwright/test';

type HudSnapshot = {
  hp: string;
  level: string;
  classStatus: string;
  statSummary: string;
  gold: string;
  score: string;
  statPanelVisible: boolean;
  classChoiceVisible: boolean;
  orientationHintVisible: boolean;
};

type RunSnapshot = {
  goldEarned: number;
  totalGold: number;
  tankStats: {
    availablePoints: number;
    levels: { bulletDamage: number; reload: number; moveSpeed: number; maxHealth: number };
  };
  tankClass: { id: string; title: string };
};

test.describe('mobile landscape layout', () => {
  test('landscape viewport fills height and exposes readable run HUD state', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await seedSave(page, 123);
    const runtimeErrors = trackRuntimeErrors(page);

    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    const menuCanvasBox = await canvas.boundingBox();
    expect(menuCanvasBox?.height ?? 0).toBeGreaterThanOrEqual(380);

    await page.keyboard.press('Enter');
    await page.waitForFunction(() => {
      const game = window.__JANGAN_LARI_GAME__;
      return Boolean(game?.scene.isActive('RunScene') && game.scene.isActive('UIScene') && !game.scene.isActive('MenuScene'));
    });

    const runCanvasBox = await canvas.boundingBox();
    expect(runCanvasBox?.height ?? 0).toBeGreaterThanOrEqual(380);

    const initialHud = await getHudSnapshot(page);
    expect(initialHud.hp).toMatch(/^HP \d+\/\d+$/);
    expect(initialHud.level).toMatch(/^LV 1  XP \d+\/\d+$/);
    expect(initialHud.classStatus).toContain('Class Basic');
    expect(initialHud.statSummary).toContain('DMG0 RLD0 SPD0 HP0');
    expect(initialHud.gold).toBe('Run Gold 0');
    expect(initialHud.score).toMatch(/^Score \d+$/);
    expect(initialHud.orientationHintVisible).toBe(false);

    const run = await getRunSnapshot(page);
    expect(run.goldEarned).toBe(0);
    expect(run.totalGold).toBe(123);

    await grantStatPoints(page, 1);
    await page.waitForFunction(() => {
      const uiScene = window.__JANGAN_LARI_GAME__?.scene.getScene('UIScene') as { getHudSnapshot?: () => HudSnapshot } | undefined;
      return Boolean(uiScene?.getHudSnapshot?.().statPanelVisible);
    });
    expect((await getHudSnapshot(page)).statPanelVisible).toBe(true);

    await forceClassChoice(page);
    await page.waitForFunction(() => {
      const uiScene = window.__JANGAN_LARI_GAME__?.scene.getScene('UIScene') as { getHudSnapshot?: () => HudSnapshot } | undefined;
      return Boolean(uiScene?.getHudSnapshot?.().classChoiceVisible);
    });
    const classHud = await getHudSnapshot(page);
    expect(classHud.classChoiceVisible).toBe(true);
    expect(classHud.statPanelVisible).toBe(false);

    expect(runtimeErrors, `expected no runtime/page errors, got: ${runtimeErrors.join(' | ')}`).toEqual([]);
  });
});

async function seedSave(page: import('@playwright/test').Page, totalGold: number): Promise<void> {
  await page.addInitScript((gold) => {
    window.localStorage.setItem(
      'jangan-lari-save-v1',
      JSON.stringify({
        version: 4,
        totalGold: gold,
        selectedHero: 'runner',
        unlockedHeroes: ['runner'],
        unlockedPermanentUpgrades: ['max-hp', 'move-speed', 'pickup-range'],
        purchasedPermanentUpgrades: {
          'max-hp': 0,
          'move-speed': 0,
          'pickup-range': 0,
          'starting-damage': 0,
        },
        completedQuests: [],
        progressStats: {
          totalKills: 0,
          totalSurvivalMs: 0,
          maxLevelReached: 0,
          totalGoldCollected: 0,
          eliteKills: 0,
        },
        bestScore: 0,
        localLeaderboard: [],
      }),
    );
  }, totalGold);
}

async function getHudSnapshot(page: import('@playwright/test').Page): Promise<HudSnapshot> {
  return page.evaluate(() => {
    const uiScene = window.__JANGAN_LARI_GAME__?.scene.getScene('UIScene') as { getHudSnapshot?: () => HudSnapshot } | undefined;
    const snapshot = uiScene?.getHudSnapshot?.();
    if (!snapshot) {
      throw new Error('UIScene HUD snapshot is not available.');
    }

    return snapshot;
  });
}

async function getRunSnapshot(page: import('@playwright/test').Page): Promise<RunSnapshot> {
  return page.evaluate(() => {
    const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run as RunSnapshot | null;
    if (!run) {
      throw new Error('Run snapshot is not available.');
    }

    return run;
  });
}

async function grantStatPoints(page: import('@playwright/test').Page, points: number): Promise<void> {
  await page.evaluate((nextPoints) => {
    const game = window.__JANGAN_LARI_GAME__;
    if (!game?.scene.isActive('RunScene')) {
      throw new Error('RunScene is not active for mobile layout stat validation.');
    }

    const runScene = game.scene.getScene('RunScene') as { debugGrantStatPoints?: (value: number) => void };
    runScene.debugGrantStatPoints?.(nextPoints);
  }, points);
}

async function forceClassChoice(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const game = window.__JANGAN_LARI_GAME__;
    if (!game?.scene.isActive('RunScene')) {
      throw new Error('RunScene is not active for mobile layout class validation.');
    }

    const runScene = game.scene.getScene('RunScene') as { debugUnlockTankClassChoice?: () => void };
    runScene.debugUnlockTankClassChoice?.();
  });
}

async function clickCanvasPoint(page: import('@playwright/test').Page, x: number, y: number): Promise<void> {
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error('Game canvas is not available.');
  }

  await canvas.click({
    position: {
      x: Math.max(1, Math.min(box.width - 1, x)),
      y: Math.max(1, Math.min(box.height - 1, y)),
    },
  });
}

function trackRuntimeErrors(page: import('@playwright/test').Page): string[] {
  const runtimeErrors: string[] = [];

  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      runtimeErrors.push(message.text());
    }
  });

  return runtimeErrors;
}
