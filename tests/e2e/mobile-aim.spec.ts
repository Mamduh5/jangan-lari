import { expect, test } from '@playwright/test';

type RunSnapshot = {
  player: {
    x: number;
    y: number;
    facingX: number;
    facingY: number;
  };
  input: {
    movement: { x: number; y: number };
    aim: { x: number; y: number };
    aimActive: boolean;
    aimSource: string;
    movementSource: string;
    hasExplicitAim: boolean;
  };
  primaryWeapon: {
    latestProjectileDirection: { x: number; y: number };
  } | null;
};

test.describe('mobile dual-stick aim', () => {
  test('left side moves while right side aims and auto-fire follows facing', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    const runtimeErrors = trackRuntimeErrors(page);

    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));
    await clickCanvasPoint(page, 560, 82);
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run));

    const initialRun = await getRunSnapshot(page);
    const moveStart = await getCanvasAbsolutePoint(page, 220, 360);
    const moveEnd = await getCanvasAbsolutePoint(page, 320, 360);
    await page.mouse.move(moveStart.x, moveStart.y);
    await page.mouse.down();
    await page.mouse.move(moveEnd.x, moveEnd.y, { steps: 4 });
    await page.waitForFunction(
      (start) => {
        const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run;
        return Boolean(run && run.player.x - start.x > 8);
      },
      initialRun.player,
    );

    const movedRun = await getRunSnapshot(page);
    expect(movedRun.input.movementSource).toBe('pointer');
    expect(movedRun.input.movement.x).toBeGreaterThan(0.8);
    await page.mouse.up();

    const aimStart = await getCanvasAbsolutePoint(page, 980, 300);
    const aimEnd = await getCanvasAbsolutePoint(page, 980, 220);
    await page.mouse.move(aimStart.x, aimStart.y);
    await page.mouse.down();
    await page.mouse.move(aimEnd.x, aimEnd.y, { steps: 4 });
    await page.waitForFunction(() => {
      const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run;
      return Boolean(run && run.player.facingY < -0.7 && run.input.aimActive && run.input.aimSource === 'pointer');
    });

    const aimedRun = await getRunSnapshot(page);
    expect(aimedRun.input.hasExplicitAim).toBe(true);
    expect(aimedRun.input.aim.y).toBeLessThan(-0.7);

    await page.waitForFunction(() => {
      const direction = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run?.primaryWeapon?.latestProjectileDirection;
      return Boolean(direction && direction.y < -0.7);
    });

    const firedRun = await getRunSnapshot(page);
    expect(firedRun.primaryWeapon?.latestProjectileDirection.y).toBeLessThan(-0.7);
    await page.mouse.up();

    await page.waitForTimeout(180);
    const afterReleaseRun = await getRunSnapshot(page);
    expect(afterReleaseRun.input.aimActive).toBe(false);
    expect(afterReleaseRun.input.hasExplicitAim).toBe(true);
    expect(afterReleaseRun.player.facingY).toBeLessThan(-0.7);
    expect(afterReleaseRun.input.aim.y).toBeLessThan(-0.7);

    const beforeKeyboardMove = afterReleaseRun.player;
    await page.keyboard.down('KeyD');
    await page.waitForFunction(
      (start) => {
        const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run;
        return Boolean(run && run.player.x - start.x > 8);
      },
      beforeKeyboardMove,
    );

    const keyboardRun = await getRunSnapshot(page);
    await page.keyboard.up('KeyD');
    expect(keyboardRun.input.movementSource).toBe('keyboard');
    expect(keyboardRun.player.facingY).toBeLessThan(-0.7);
    expect(runtimeErrors, `expected no runtime/page errors, got: ${runtimeErrors.join(' | ')}`).toEqual([]);
  });
});

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

  const position = await getCanvasPosition(page, gameX, gameY);
  await canvas.click({ position });
}

async function getCanvasPosition(page: import('@playwright/test').Page, gameX: number, gameY: number): Promise<{ x: number; y: number }> {
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error('Game canvas is not available.');
  }

  return {
    x: (gameX / 1280) * box.width,
    y: (gameY / 720) * box.height,
  };
}

async function getCanvasAbsolutePoint(page: import('@playwright/test').Page, gameX: number, gameY: number): Promise<{ x: number; y: number }> {
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error('Game canvas is not available.');
  }

  return {
    x: box.x + (gameX / 1280) * box.width,
    y: box.y + (gameY / 720) * box.height,
  };
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
