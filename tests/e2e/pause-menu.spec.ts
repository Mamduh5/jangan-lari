import { expect, test } from '@playwright/test';

type HudSnapshot = {
  pauseButtonVisible: boolean;
  pauseButton: { x: number; y: number; width: number; height: number };
  hudIconVisible: { pause: boolean };
  uiButtonIconVisible: { close: boolean; retry: boolean };
  pauseMenuVisible: boolean;
  pauseMenuButtons: string[];
  pauseMenuButtonBounds: Array<{ text: string; x: number; y: number; width: number; height: number }>;
};

type MenuSnapshot = {
  startButton: { x: number; y: number };
};

type CanvasTransform = {
  x: number;
  y: number;
  width: number;
  height: number;
  virtualWidth: number;
  virtualHeight: number;
};

test.describe('pause menu', () => {
  test('pauses, resumes, restarts, and returns to menu without ending the run', async ({ page }) => {
    test.setTimeout(45_000);
    await page.setViewportSize({ width: 1280, height: 720 });
    const runtimeErrors = trackRuntimeErrors(page);

    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));

    const transform = await getCanvasTransform(page);
    const menu = await getMenuSnapshot(page);
    await clickCanvasPoint(page, transform, menu.startButton.x, menu.startButton.y);
    await waitForRun(page);
    const initialLeaderboardEntries = await getLeaderboardEntryCount(page);

    await page.waitForFunction(() => Number(window.__JANGAN_LARI_GAME__?.registry.get('run.elapsedMs') ?? 0) >= 250);
    let hud = await getHudSnapshot(page);
    expect(hud.pauseButtonVisible).toBe(true);
    expect(hud.hudIconVisible.pause).toBe(true);

    await clickCanvasPoint(page, transform, hud.pauseButton.x, hud.pauseButton.y);
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.registry.get('run.pauseMenuActive')));

    hud = await getHudSnapshot(page);
    expect(hud.pauseMenuVisible).toBe(true);
    expect(hud.pauseMenuButtons).toEqual(['Resume', 'Restart Run', 'Return to Main Menu']);
    expect(hud.uiButtonIconVisible.close).toBe(true);
    expect(hud.uiButtonIconVisible.retry).toBe(true);

    const pausedElapsedMs = await getRunElapsedMs(page);
    await page.waitForTimeout(650);
    expect(await getRunElapsedMs(page)).toBe(pausedElapsedMs);

    await clickPauseMenuButton(page, transform, 'Resume');
    await page.waitForFunction(() => !window.__JANGAN_LARI_GAME__?.registry.get('run.pauseMenuActive'));
    await page.waitForFunction((previous) => Number(window.__JANGAN_LARI_GAME__?.registry.get('run.elapsedMs') ?? 0) > previous, pausedElapsedMs);

    hud = await getHudSnapshot(page);
    await clickCanvasPoint(page, transform, hud.pauseButton.x, hud.pauseButton.y);
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.registry.get('run.pauseMenuActive')));
    const elapsedBeforeRestart = await getRunElapsedMs(page);
    await clickPauseMenuButton(page, transform, 'Restart Run');
    await waitForRun(page);
    await page.waitForFunction(
      (previous) =>
        !window.__JANGAN_LARI_GAME__?.registry.get('run.pauseMenuActive') &&
        Number(window.__JANGAN_LARI_GAME__?.registry.get('run.elapsedMs') ?? 0) < previous,
      elapsedBeforeRestart,
    );

    expect(await getRunGold(page)).toBe(0);
    expect(await getEndActive(page)).toBe(false);
    expect(await getLeaderboardEntryCount(page)).toBe(initialLeaderboardEntries);

    hud = await getHudSnapshot(page);
    expect(hud.pauseButtonVisible).toBe(true);
    await clickCanvasPoint(page, transform, hud.pauseButton.x, hud.pauseButton.y);
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.registry.get('run.pauseMenuActive')));
    await clickPauseMenuButton(page, transform, 'Return to Main Menu');

    await page.waitForFunction(() => {
      const game = window.__JANGAN_LARI_GAME__;
      return Boolean(game?.scene.isActive('MenuScene') && !game.scene.isActive('RunScene') && !game.scene.isActive('UIScene'));
    });
    expect(await getEndActive(page)).toBe(false);
    expect(await getRunGold(page)).toBe(0);
    expect(await getLeaderboardEntryCount(page)).toBe(initialLeaderboardEntries);
    expect(runtimeErrors, `expected no runtime/page errors, got: ${runtimeErrors.join(' | ')}`).toEqual([]);
  });
});

async function waitForRun(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(() => {
    const game = window.__JANGAN_LARI_GAME__;
    return Boolean(game?.scene.isActive('RunScene') && game.scene.isActive('UIScene') && !game.scene.isActive('MenuScene'));
  });
}

async function clickPauseMenuButton(page: import('@playwright/test').Page, transform: CanvasTransform, text: string): Promise<void> {
  const hud = await getHudSnapshot(page);
  const button = hud.pauseMenuButtonBounds.find((entry) => entry.text === text);
  if (!button) {
    throw new Error(`Pause menu button is not visible: ${text}`);
  }

  await clickCanvasPoint(page, transform, button.x, button.y);
}

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

async function getCanvasTransform(page: import('@playwright/test').Page): Promise<CanvasTransform> {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const rect = canvas?.getBoundingClientRect();
    if (!rect) {
      throw new Error('Canvas is not available.');
    }

    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      virtualWidth: Number(window.__JANGAN_LARI_GAME__?.scale.width ?? 1600),
      virtualHeight: Number(window.__JANGAN_LARI_GAME__?.scale.height ?? 720),
    };
  });
}

async function clickCanvasPoint(page: import('@playwright/test').Page, transform: CanvasTransform, virtualX: number, virtualY: number): Promise<void> {
  await page.mouse.click(
    transform.x + (virtualX / transform.virtualWidth) * transform.width,
    transform.y + (virtualY / transform.virtualHeight) * transform.height,
  );
}

async function getRunElapsedMs(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(() => Number(window.__JANGAN_LARI_GAME__?.registry.get('run.elapsedMs') ?? 0));
}

async function getRunGold(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(() => Number(window.__JANGAN_LARI_GAME__?.registry.get('run.goldEarned') ?? 0));
}

async function getEndActive(page: import('@playwright/test').Page): Promise<boolean> {
  return page.evaluate(() => Boolean(window.__JANGAN_LARI_GAME__?.registry.get('run.endActive')));
}

async function getLeaderboardEntryCount(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(() => Number(window.__JANGAN_LARI_GAME__?.registry.get('run.localLeaderboardEntryCount') ?? 0));
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
