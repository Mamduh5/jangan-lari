import { expect, test } from '@playwright/test';

type RunSnapshot = {
  levelUpActive: boolean;
  input: {
    movement: { x: number; y: number };
    aim: { x: number; y: number };
    aimSource: string;
    movementSource: string;
    suppressed: boolean;
  };
  player: {
    x: number;
    y: number;
    facingY: number;
  };
  classChoice: {
    active: boolean;
  };
  tankStats: {
    availablePoints: number;
  };
  primaryWeapon: {
    latestProjectileDirection: { x: number; y: number };
  } | null;
};

test.describe('overlay input resume', () => {
  test('controls work immediately after level-up, stat, and class overlays close', async ({ page }) => {
    test.setTimeout(45_000);
    await page.setViewportSize({ width: 844, height: 390 });
    const runtimeErrors = trackRuntimeErrors(page);

    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run));

    await forceLevelUp(page);
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run?.levelUpActive));
    await clickCanvasPoint(page, 258, 372);
    await page.waitForFunction(() => {
      const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run;
      return Boolean(run && !run.levelUpActive && !run.input.suppressed);
    });

    await expectFreshMovementWorks(page);
    await spendFirstStatPoint(page);
    await expectFreshAimWorks(page);

    await forceClassChoice(page);
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run?.classChoice.active));
    await clickCanvasPoint(page, 610, 378);
    await page.waitForFunction(() => {
      const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run;
      return Boolean(run && !run.classChoice.active && !run.input.suppressed);
    });

    await expectFreshMovementWorks(page);
    await expectFreshAimWorks(page);
    expect(runtimeErrors, `expected no runtime/page errors, got: ${runtimeErrors.join(' | ')}`).toEqual([]);
  });
});

async function expectFreshMovementWorks(page: import('@playwright/test').Page): Promise<void> {
  const beforeMove = (await getRunSnapshot(page)).player;
  await dragCanvas(page, 180, 300, 310, 300);
  await page.waitForFunction(
    (start) => {
      const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run;
      return Boolean(run && run.player.x - start.x > 8 && run.input.movementSource === 'pointer');
    },
    beforeMove,
  );

  const movedRun = await getRunSnapshot(page);
  expect(movedRun.input.movement.x).toBeGreaterThan(0.8);
  await page.mouse.up();
}

async function expectFreshAimWorks(page: import('@playwright/test').Page): Promise<void> {
  const virtualSize = await getVirtualSize(page);
  const aimX = virtualSize.width - 280;
  await dragCanvas(page, aimX, 300, aimX, 220);
  await page.waitForFunction(() => {
    const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run;
    return Boolean(run && run.player.facingY < -0.7 && run.input.aimSource === 'pointer');
  });
  await page.waitForFunction(() => {
    const direction = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run?.primaryWeapon?.latestProjectileDirection;
    return Boolean(direction && direction.y < -0.7);
  });

  const aimedRun = await getRunSnapshot(page);
  expect(aimedRun.input.aim.y).toBeLessThan(-0.7);
  expect(aimedRun.primaryWeapon?.latestProjectileDirection.y).toBeLessThan(-0.7);
  await page.mouse.up();
}

async function forceLevelUp(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const game = window.__JANGAN_LARI_GAME__;
    if (!game?.scene.isActive('RunScene')) {
      throw new Error('RunScene is not active for overlay input validation.');
    }

    const runScene = game.scene.getScene('RunScene') as { handlePlayerLevelsGained?: (levels: number) => void };
    runScene.handlePlayerLevelsGained?.(1);
  });
}

async function spendFirstStatPoint(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(() => (window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run?.tankStats.availablePoints ?? 0) > 0);
  await clickCanvasPoint(page, 540, 624);
  await page.waitForFunction(() => (window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run?.tankStats.availablePoints ?? 0) === 0);
}

async function forceClassChoice(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const game = window.__JANGAN_LARI_GAME__;
    if (!game?.scene.isActive('RunScene')) {
      throw new Error('RunScene is not active for overlay input validation.');
    }

    const runScene = game.scene.getScene('RunScene') as { debugUnlockTankClassChoice?: () => void };
    runScene.debugUnlockTankClassChoice?.();
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

async function dragCanvas(
  page: import('@playwright/test').Page,
  startGameX: number,
  startGameY: number,
  endGameX: number,
  endGameY: number,
): Promise<void> {
  const start = await getCanvasAbsolutePoint(page, startGameX, startGameY);
  const end = await getCanvasAbsolutePoint(page, endGameX, endGameY);

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 4 });
  await page.waitForTimeout(220);
}

async function getCanvasAbsolutePoint(
  page: import('@playwright/test').Page,
  gameX: number,
  gameY: number,
): Promise<{ x: number; y: number }> {
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error('Game canvas is not available.');
  }
  const virtualSize = await getVirtualSize(page);

  return {
    x: box.x + (gameX / virtualSize.width) * box.width,
    y: box.y + (gameY / virtualSize.height) * box.height,
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
