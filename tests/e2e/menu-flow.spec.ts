import { expect, test } from '@playwright/test';

type GameState = {
  menuActive: boolean;
  runActive: boolean;
  uiActive: boolean;
  endActive: boolean;
  elapsedMs: number;
};

async function getGameState(page: import('@playwright/test').Page): Promise<GameState> {
  return page.evaluate(() => {
    const game = window.__JANGAN_LARI_GAME__;
    return {
      menuActive: game?.scene.isActive('MenuScene') ?? false,
      runActive: game?.scene.isActive('RunScene') ?? false,
      uiActive: game?.scene.isActive('UIScene') ?? false,
      endActive: Boolean(game?.registry.get('run.endActive')),
      elapsedMs: Number(game?.registry.get('run.elapsedMs') ?? -1),
    };
  });
}

async function startRunFromMenu(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const game = window.__JANGAN_LARI_GAME__!;
    const menuScene = game.scene.getScene('MenuScene') as { startRun?: () => void };
    menuScene.startRun?.();
  });

  await page.waitForFunction(() => {
    const game = window.__JANGAN_LARI_GAME__;
    return Boolean(game?.scene.isActive('RunScene') && game.scene.isActive('UIScene') && !game.scene.isActive('MenuScene'));
  });
}

test.describe('menu and run scene flow', () => {
  test('can start a run, return to menu, and start a fresh run again', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));

    await startRunFromMenu(page);

    const firstRunState = await getGameState(page);
    expect(firstRunState.menuActive).toBe(false);
    expect(firstRunState.runActive).toBe(true);
    expect(firstRunState.uiActive).toBe(true);
    expect(firstRunState.elapsedMs).toBeGreaterThanOrEqual(0);

    await page.evaluate(() => {
      const runScene = window.__JANGAN_LARI_GAME__!.scene.getScene('RunScene') as any;
      runScene.endRun(false, 'Defeat', 'Playwright defeat check');
    });

    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.registry.get('run.endActive')));

    await page.evaluate(() => {
      const uiScene = window.__JANGAN_LARI_GAME__!.scene.getScene('UIScene') as any;
      uiScene.returnToMenuIfEnded();
    });

    await page.waitForFunction(() => {
      const game = window.__JANGAN_LARI_GAME__;
      return Boolean(game?.scene.isActive('MenuScene') && !game.scene.isActive('RunScene') && !game.scene.isActive('UIScene'));
    });

    const returnedState = await getGameState(page);
    expect(returnedState.menuActive).toBe(true);
    expect(returnedState.runActive).toBe(false);
    expect(returnedState.uiActive).toBe(false);
    expect(returnedState.endActive).toBe(false);

    await startRunFromMenu(page);

    await page.waitForFunction(() => Number(window.__JANGAN_LARI_GAME__?.registry.get('run.elapsedMs') ?? -1) >= 0);
    const secondRunState = await getGameState(page);
    expect(secondRunState.elapsedMs).toBeLessThan(500);
    expect(consoleErrors).toEqual([]);
  });

  test('ESC flow can return to menu without leaving a stale run scene', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));

    await startRunFromMenu(page);
    await page.keyboard.press('Escape');

    await page.waitForFunction(() => {
      const game = window.__JANGAN_LARI_GAME__;
      return Boolean(game?.scene.isActive('MenuScene') && !game.scene.isActive('RunScene') && !game.scene.isActive('UIScene'));
    });

    const state = await getGameState(page);
    expect(state.menuActive).toBe(true);
    expect(state.runActive).toBe(false);
    expect(state.uiActive).toBe(false);
    expect(state.endActive).toBe(false);
    expect(consoleErrors).toEqual([]);
  });
});