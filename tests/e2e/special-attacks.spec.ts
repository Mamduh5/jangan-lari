import { expect, test } from '@playwright/test';

async function clickStartRun(page: import('@playwright/test').Page): Promise<void> {
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error('Game canvas is not available for Start Run click.');
  }

  const gameWidth = 1280;
  const gameHeight = 720;
  const startButtonX = 560;
  const startButtonY = 82;

  await canvas.click({
    position: {
      x: (startButtonX / gameWidth) * box.width,
      y: (startButtonY / gameHeight) * box.height,
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

test.describe('special attack damage', () => {
  test('miniboss line strike and boss shockwave both remove hp when their visuals intersect the player', async ({ page }) => {
    const runtimeErrors = trackRuntimeErrors(page);

    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));

    await clickStartRun(page);
    await page.waitForFunction(() => {
      const game = window.__JANGAN_LARI_GAME__;
      return Boolean(game?.scene.isActive('RunScene') && game.scene.isActive('UIScene'));
    });

    const startingHp = await page.evaluate(() => Number(window.__JANGAN_LARI_GAME__?.registry.get('run.hp') ?? -1));
    expect(startingHp).toBeGreaterThan(0);

    await page.evaluate(() => {
      const game = window.__JANGAN_LARI_GAME__!;
      const runScene = game.scene.getScene('RunScene') as {
        player: { x: number; y: number };
        executeMinibossLineStrike: (
          enemy: { contactDamage: number },
          x: number,
          y: number,
          direction: { x: number; y: number },
          length: number,
        ) => void;
      };

      runScene.executeMinibossLineStrike({ contactDamage: 26 }, runScene.player.x - 180, runScene.player.y, { x: 1, y: 0 }, 260);
    });

    await page.waitForFunction(
      (baselineHp) => Number(window.__JANGAN_LARI_GAME__?.registry.get('run.hp') ?? -1) < baselineHp,
      startingHp,
    );

    const hpAfterLineStrike = await page.evaluate(() => Number(window.__JANGAN_LARI_GAME__?.registry.get('run.hp') ?? -1));
    expect(hpAfterLineStrike).toBeLessThan(startingHp);

    await page.waitForTimeout(800);

    await page.evaluate(() => {
      const game = window.__JANGAN_LARI_GAME__!;
      const runScene = game.scene.getScene('RunScene') as {
        player: { x: number; y: number };
        spawnBossShockwave: (x: number, y: number, radius: number, damage: number, durationMs: number) => void;
      };

      runScene.spawnBossShockwave(runScene.player.x - 140, runScene.player.y, 220, 20, 180);
    });

    await page.waitForFunction(
      (baselineHp) => Number(window.__JANGAN_LARI_GAME__?.registry.get('run.hp') ?? -1) < baselineHp,
      hpAfterLineStrike,
    );

    const hpAfterShockwave = await page.evaluate(() => Number(window.__JANGAN_LARI_GAME__?.registry.get('run.hp') ?? -1));
    expect(hpAfterShockwave).toBeLessThan(hpAfterLineStrike);
    expect(runtimeErrors).toEqual([]);
  });
});
