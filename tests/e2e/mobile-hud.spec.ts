import { expect, test } from '@playwright/test';

type HudSnapshot = {
  hero: string;
  hp: string;
  level: string;
  classStatus: string;
  statSummary: string;
  weaponSummary: string;
  xp: string;
  gold: string;
  kills: string;
  score: string;
  statPanelVisible: boolean;
  classChoiceVisible: boolean;
  orientationHintVisible: boolean;
};

type RunSnapshot = {
  player: { x: number; y: number };
  tankStats: {
    availablePoints: number;
    levels: { bulletDamage: number; reload: number; moveSpeed: number; maxHealth: number };
  };
  tankClass: { id: string; title: string };
};

test.describe('mobile HUD readability', () => {
  test('HUD shows core run state and overlays remain tap usable', async ({ page }) => {
    test.setTimeout(45_000);
    await page.setViewportSize({ width: 390, height: 844 });

    const runtimeErrors = trackRuntimeErrors(page);

    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));

    const virtualSize = await getVirtualSize(page);
    await clickCanvasPoint(page, virtualSize.width / 2 - 250, 82);
    await page.waitForFunction(() => {
      const game = window.__JANGAN_LARI_GAME__;
      return Boolean(game?.scene.isActive('RunScene') && game.scene.isActive('UIScene') && !game.scene.isActive('MenuScene'));
    });

    await page.waitForFunction(() => Boolean((window.__JANGAN_LARI_GAME__?.scene.getScene('UIScene') as { getHudSnapshot?: () => unknown }).getHudSnapshot?.()));

    const initialHud = await getHudSnapshot(page);
    expect(initialHud.hp).toMatch(/^HP \d+\/\d+$/);
    expect(initialHud.level).toMatch(/^LV 1  XP \d+\/\d+$/);
    expect(initialHud.xp).toBe(initialHud.level);
    expect(initialHud.classStatus).toContain('Class Basic');
    expect(initialHud.statSummary).toContain('DMG0 RLD0 SPD0 HP0');
    expect(initialHud.weaponSummary).toContain('Weapon');
    expect(initialHud.gold).toMatch(/^Run Gold \d+$/);
    expect(initialHud.kills).toBe('Kills 0');
    expect(initialHud.score).toMatch(/^Score \d+$/);
    expect(initialHud.orientationHintVisible).toBe(true);

    await grantStatPoints(page, 1);
    await page.waitForFunction(() => {
      const uiScene = window.__JANGAN_LARI_GAME__?.scene.getScene('UIScene') as { getHudSnapshot?: () => HudSnapshot } | undefined;
      return Boolean(uiScene?.getHudSnapshot?.().statPanelVisible);
    });

    const statReadyHud = await getHudSnapshot(page);
    expect(statReadyHud.statPanelVisible).toBe(true);
    expect(statReadyHud.statSummary).toContain('+1');

    await clickCanvasPoint(page, virtualSize.width / 2 + 88, 624);
    await page.waitForFunction(() => {
      const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run;
      return Boolean(run?.tankStats.availablePoints === 0 && run.tankStats.levels.moveSpeed === 1);
    });

    const afterStatHud = await getHudSnapshot(page);
    expect(afterStatHud.statSummary).toContain('SPD1');

    await forceClassChoice(page);
    await page.waitForFunction(() => {
      const uiScene = window.__JANGAN_LARI_GAME__?.scene.getScene('UIScene') as { getHudSnapshot?: () => HudSnapshot } | undefined;
      return Boolean(uiScene?.getHudSnapshot?.().classChoiceVisible);
    });

    const classReadyHud = await getHudSnapshot(page);
    expect(classReadyHud.classChoiceVisible).toBe(true);
    expect(classReadyHud.classStatus).toContain('Choose now');

    await clickCanvasPoint(page, virtualSize.width / 2 - 190, 438);
    await page.waitForFunction(() => {
      const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run;
      return Boolean(run?.tankClass.id === 'twin');
    });

    const afterClassHud = await getHudSnapshot(page);
    expect(afterClassHud.classStatus).toContain('Class Twin');
    expect(afterClassHud.classChoiceVisible).toBe(false);
    expect(afterClassHud.weaponSummary).toContain('Twin');

    const beforeKeyboardMove = (await getRunSnapshot(page)).player;
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(260);
    await page.keyboard.up('KeyD');
    await page.waitForFunction(
      (start) => {
        const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run;
        return Boolean(run && Math.hypot(run.player.x - start.x, run.player.y - start.y) > 8);
      },
      beforeKeyboardMove,
    );

    const beforeMove = (await getRunSnapshot(page)).player;
    await dragCanvas(page, 220, 360, 320, 360, 320);
    await page.waitForFunction(
      (start) => {
        const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run;
        return Boolean(run && Math.hypot(run.player.x - start.x, run.player.y - start.y) > 8);
      },
      beforeMove,
    );

    const finalRun = await getRunSnapshot(page);
    expect(finalRun.tankStats.levels.moveSpeed).toBe(1);
    expect(finalRun.tankClass.id).toBe('twin');
    expect(runtimeErrors, `expected no runtime/page errors, got: ${runtimeErrors.join(' | ')}`).toEqual([]);
  });
});

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
      throw new Error('RunScene is not active for HUD stat validation.');
    }

    const runScene = game.scene.getScene('RunScene') as { debugGrantStatPoints?: (value: number) => void };
    runScene.debugGrantStatPoints?.(nextPoints);
  }, points);
}

async function forceClassChoice(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const game = window.__JANGAN_LARI_GAME__;
    if (!game?.scene.isActive('RunScene')) {
      throw new Error('RunScene is not active for HUD class validation.');
    }

    const runScene = game.scene.getScene('RunScene') as { debugUnlockTankClassChoice?: () => void };
    runScene.debugUnlockTankClassChoice?.();
  });
}

async function clickCanvasPoint(page: import('@playwright/test').Page, gameX: number, gameY: number): Promise<void> {
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  const position = await getCanvasPosition(page, gameX, gameY);
  await canvas.click({ position });
}

async function dragCanvas(
  page: import('@playwright/test').Page,
  startGameX: number,
  startGameY: number,
  endGameX: number,
  endGameY: number,
  holdMs: number,
): Promise<void> {
  const start = await getCanvasAbsolutePoint(page, startGameX, startGameY);
  const end = await getCanvasAbsolutePoint(page, endGameX, endGameY);

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 4 });
  await page.waitForTimeout(holdMs);
  await page.mouse.up();
}

async function getCanvasPosition(page: import('@playwright/test').Page, gameX: number, gameY: number): Promise<{ x: number; y: number }> {
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error('Game canvas is not available.');
  }

  return {
    x: (gameX / (await getVirtualSize(page)).width) * box.width,
    y: (gameY / (await getVirtualSize(page)).height) * box.height,
  };
}

async function getCanvasAbsolutePoint(page: import('@playwright/test').Page, gameX: number, gameY: number): Promise<{ x: number; y: number }> {
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error('Game canvas is not available.');
  }

  return {
    x: box.x + (gameX / (await getVirtualSize(page)).width) * box.width,
    y: box.y + (gameY / (await getVirtualSize(page)).height) * box.height,
  };
}

async function getVirtualSize(page: import('@playwright/test').Page): Promise<{ width: number; height: number }> {
  return page.evaluate(() => ({
    width: Number(window.__JANGAN_LARI_GAME__?.scale.width ?? 1600),
    height: Number(window.__JANGAN_LARI_GAME__?.scale.height ?? 720),
  }));
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
