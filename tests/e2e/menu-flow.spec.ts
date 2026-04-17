import { expect, test } from '@playwright/test';

type GameState = {
  menuActive: boolean;
  metaActive: boolean;
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
      metaActive: game?.scene.isActive('MetaScene') ?? false,
      runActive: game?.scene.isActive('RunScene') ?? false,
      uiActive: game?.scene.isActive('UIScene') ?? false,
      endActive: Boolean(game?.registry.get('run.endActive')),
      elapsedMs: Number(game?.registry.get('run.elapsedMs') ?? -1),
    };
  });
}

async function clickMenuButton(
  page: import('@playwright/test').Page,
  buttonKey: 'startButton' | 'metaButton',
): Promise<void> {
  if (buttonKey === 'startButton') {
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    if (!box) {
      throw new Error('Game canvas is not available for Start Run click.');
    }

    const gameWidth = 1280;
    const gameHeight = 720;
    const startButtonX = gameWidth / 2 - 162;
    const startButtonY = gameHeight / 2 - 138;

    await canvas.click({
      position: {
        x: (startButtonX / gameWidth) * box.width,
        y: (startButtonY / gameHeight) * box.height,
      },
    });
    return;
  }

  await page.evaluate((key) => {
    const game = window.__JANGAN_LARI_GAME__!;
    const menuScene = game.scene.getScene('MenuScene') as Record<string, { emit: (eventName: string) => void }>;
    menuScene[key].emit('pointerdown');
  }, buttonKey);
}

async function clickMetaBackButton(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const game = window.__JANGAN_LARI_GAME__!;
    const metaScene = game.scene.getScene('MetaScene') as {
      children: { list: Array<{ text?: string; emit: (eventName: string) => void }> };
    };
    const button = metaScene.children.list.find((child) => child.text === 'Back to Menu');
    button?.emit('pointerdown');
  });
}

async function clickEndReturnButton(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const game = window.__JANGAN_LARI_GAME__!;
    const uiScene = game.scene.getScene('UIScene') as Record<string, { emit: (eventName: string) => void }>;
    uiScene.endButton.emit('pointerdown');
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

function expectNoBrokenSceneApiErrors(runtimeErrors: string[]): void {
  const brokenSceneApiErrors = runtimeErrors.filter(
    (error) =>
      error.includes('this.scene.isActive is not a function') || error.includes('this.scene.start is not a function'),
  );

  expect(brokenSceneApiErrors).toEqual([]);
}

test.describe('menu and run scene flow', () => {
  test('menu buttons can open meta, start a run, return to menu, and start another run', async ({ page }) => {
    const runtimeErrors = trackRuntimeErrors(page);

    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));

    await clickMenuButton(page, 'metaButton');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MetaScene')));

    let state = await getGameState(page);
    expect(state.menuActive).toBe(false);
    expect(state.metaActive).toBe(true);
    expectNoBrokenSceneApiErrors(runtimeErrors);

    await clickMetaBackButton(page);
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));

    state = await getGameState(page);
    expect(state.menuActive).toBe(true);
    expect(state.metaActive).toBe(false);

    await clickMenuButton(page, 'startButton');
    await page.waitForFunction(() => {
      const game = window.__JANGAN_LARI_GAME__;
      return Boolean(game?.scene.isActive('RunScene') && game.scene.isActive('UIScene') && !game.scene.isActive('MenuScene'));
    });

    state = await getGameState(page);
    expect(state.runActive).toBe(true);
    expect(state.uiActive).toBe(true);
    expect(state.elapsedMs).toBeGreaterThanOrEqual(0);

    await page.evaluate(() => {
      const runScene = window.__JANGAN_LARI_GAME__!.scene.getScene('RunScene') as any;
      runScene.endRun(false, 'Defeat', 'Playwright defeat check');
    });
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.registry.get('run.endActive')));

    await clickEndReturnButton(page);
    await page.waitForFunction(() => {
      const game = window.__JANGAN_LARI_GAME__;
      return Boolean(game?.scene.isActive('MenuScene') && !game.scene.isActive('RunScene') && !game.scene.isActive('UIScene'));
    });

    state = await getGameState(page);
    expect(state.menuActive).toBe(true);
    expect(state.runActive).toBe(false);
    expect(state.uiActive).toBe(false);
    expect(state.endActive).toBe(false);

    await clickMenuButton(page, 'startButton');
    await page.waitForFunction(() => {
      const game = window.__JANGAN_LARI_GAME__;
      return Boolean(game?.scene.isActive('RunScene') && game.scene.isActive('UIScene') && !game.scene.isActive('MenuScene'));
    });
    await page.waitForFunction(() => Number(window.__JANGAN_LARI_GAME__?.registry.get('run.elapsedMs') ?? -1) >= 0);

    state = await getGameState(page);
    expect(state.runActive).toBe(true);
    expect(state.uiActive).toBe(true);
    expect(state.elapsedMs).toBeLessThan(500);
    expectNoBrokenSceneApiErrors(runtimeErrors);
    expect(runtimeErrors).toEqual([]);
  });

  test('ESC flow returns to menu cleanly after starting from the actual Start Run button', async ({ page }) => {
    const runtimeErrors = trackRuntimeErrors(page);

    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));

    await clickMenuButton(page, 'startButton');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('RunScene')));
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
    expectNoBrokenSceneApiErrors(runtimeErrors);
    expect(runtimeErrors).toEqual([]);
  });
});
