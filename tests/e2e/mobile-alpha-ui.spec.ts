import { expect, test } from '@playwright/test';

type ControlGuideMode = 'hidden' | 'subtle' | 'visible';

type MenuSnapshot = {
  gameWidth: number;
  gameHeight: number;
  controlGuideMode: ControlGuideMode;
  guideButtonText: string;
  startButton: { x: number; y: number };
  guideButton: { x: number; y: number };
};

type HudSnapshot = {
  controlGuideMode: ControlGuideMode;
  controlGuidesVisible: boolean;
  joystickGuidesVisible: boolean;
  controlGuideToggleVisible: boolean;
};

type RunSnapshot = {
  config: { gameWidth: number; gameHeight: number; scaleMode: 'FIT' };
  controlGuideMode: ControlGuideMode;
};

test.describe('mobile alpha UI', () => {
  test('wider fixed layout keeps menu playable and moves guide setting to menu', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    const runtimeErrors = trackRuntimeErrors(page);

    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox?.width ?? 0).toBeGreaterThanOrEqual(830);
    expect(canvasBox?.height ?? 0).toBeGreaterThanOrEqual(370);

    let menu = await getMenuSnapshot(page);
    expect(menu.gameWidth).toBe(1600);
    expect(menu.gameHeight).toBe(720);
    expect(menu.controlGuideMode).toBe('subtle');
    expect(menu.guideButtonText).toBe('Guide Subtle');

    await clickCanvasPoint(page, menu.guideButton.x, menu.guideButton.y);
    await page.waitForFunction(() => {
      const menuScene = window.__JANGAN_LARI_GAME__?.scene.getScene('MenuScene') as { getMenuSnapshot?: () => MenuSnapshot } | undefined;
      return menuScene?.getMenuSnapshot?.().controlGuideMode === 'visible';
    });
    menu = await getMenuSnapshot(page);
    expect(menu.guideButtonText).toBe('Guide Visible');

    await clickCanvasPoint(page, menu.guideButton.x, menu.guideButton.y);
    await page.waitForFunction(() => {
      const menuScene = window.__JANGAN_LARI_GAME__?.scene.getScene('MenuScene') as { getMenuSnapshot?: () => MenuSnapshot } | undefined;
      return menuScene?.getMenuSnapshot?.().controlGuideMode === 'hidden';
    });
    menu = await getMenuSnapshot(page);
    expect(menu.guideButtonText).toBe('Guide Hidden');

    const persistedMode = await page.evaluate(() => {
      const save = JSON.parse(window.localStorage.getItem('jangan-lari-save-v1') ?? '{}') as { controlGuideMode?: string };
      return save.controlGuideMode;
    });
    expect(persistedMode).toBe('hidden');

    await clickCanvasPoint(page, menu.startButton.x, menu.startButton.y);
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run));

    const run = await getRunSnapshot(page);
    expect(run.config).toEqual({ gameWidth: 1600, gameHeight: 720, scaleMode: 'FIT' });
    expect(run.controlGuideMode).toBe('hidden');

    const hud = await getHudSnapshot(page);
    expect(hud.controlGuideMode).toBe('hidden');
    expect(hud.controlGuidesVisible).toBe(false);
    expect(hud.joystickGuidesVisible).toBe(false);
    expect(hud.controlGuideToggleVisible).toBe(false);
    expect(runtimeErrors, `expected no runtime/page errors, got: ${runtimeErrors.join(' | ')}`).toEqual([]);
  });
});

async function getMenuSnapshot(page: import('@playwright/test').Page): Promise<MenuSnapshot> {
  return page.evaluate(() => {
    const menuScene = window.__JANGAN_LARI_GAME__?.scene.getScene('MenuScene') as { getMenuSnapshot?: () => MenuSnapshot } | undefined;
    const snapshot = menuScene?.getMenuSnapshot?.();
    if (!snapshot) {
      throw new Error('Menu snapshot is not available.');
    }

    return snapshot;
  });
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

async function clickCanvasPoint(page: import('@playwright/test').Page, gameX: number, gameY: number): Promise<void> {
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error('Game canvas is not available.');
  }
  const virtualSize = await getVirtualSize(page);

  await canvas.click({
    position: {
      x: (gameX / virtualSize.width) * box.width,
      y: (gameY / virtualSize.height) * box.height,
    },
  });
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
