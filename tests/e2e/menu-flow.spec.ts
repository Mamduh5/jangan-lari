import { expect, test } from '@playwright/test';

async function clickCanvasPosition(page: import('@playwright/test').Page, x: number, y: number): Promise<void> {
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error('Game canvas is not available.');
  }

  await canvas.click({
    position: {
      x: (x / 1280) * box.width,
      y: (y / 720) * box.height,
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

test.describe('milestone 1 menu flow', () => {
  test('menu can switch heroes, open meta, and start a run', async ({ page }) => {
    const runtimeErrors = trackRuntimeErrors(page);

    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));

    await clickCanvasPosition(page, 860, 382);
    await page.waitForTimeout(150);

    let selectedHero = await page.evaluate(() => window.localStorage.getItem('jangan-lari-save-v1') ?? '');
    expect(selectedHero).toContain('shade');

    await clickCanvasPosition(page, 726, 82);
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MetaScene')));
    expect(await page.evaluate(() => window.__JANGAN_LARI_GAME__?.scene.isActive('MetaScene'))).toBe(true);

    await page.evaluate(() => {
      const game = window.__JANGAN_LARI_GAME__!;
      const metaScene = game.scene.getScene('MetaScene') as {
        children: { list: Array<{ text?: string; emit?: (eventName: string) => void }> };
      };
      const backButton = metaScene.children.list.find((child) => child.text === 'Back to Menu');
      backButton?.emit?.('pointerdown');
    });
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));

    await clickCanvasPosition(page, 560, 82);
    await page.waitForFunction(() => {
      const game = window.__JANGAN_LARI_GAME__;
      return Boolean(game?.scene.isActive('RunScene') && game.scene.isActive('UIScene'));
    });

    const snapshot = await page.evaluate(() => window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot());
    expect(snapshot?.run?.weaponNames).toEqual(['Seeker Burst', 'Hunter Sweep']);
    expect(runtimeErrors).toEqual([]);
  });

  test('ESC returns from an active run back to the menu cleanly', async ({ page }) => {
    const runtimeErrors = trackRuntimeErrors(page);

    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));

    await clickCanvasPosition(page, 560, 82);
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('RunScene')));
    await page.keyboard.press('Escape');

    await page.waitForFunction(() => {
      const game = window.__JANGAN_LARI_GAME__;
      return Boolean(game?.scene.isActive('MenuScene') && !game.scene.isActive('RunScene') && !game.scene.isActive('UIScene'));
    });

    expect(runtimeErrors).toEqual([]);
  });
});
