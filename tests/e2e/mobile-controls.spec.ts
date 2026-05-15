import { expect, test } from '@playwright/test';

type ControlGuideMode = 'hidden' | 'subtle' | 'visible';

type HudSnapshot = {
  controlGuideMode: ControlGuideMode;
  controlGuidesVisible: boolean;
  controlHintVisible: boolean;
  controlGuideToggleText: string;
};

type RunSnapshot = {
  player: {
    x: number;
    y: number;
    facingY: number;
  };
  input: {
    movement: { x: number; y: number };
    aim: { x: number; y: number };
    aimActive: boolean;
    aimSource: string;
    movementSource: string;
  };
  controlGuideMode: ControlGuideMode;
  controlHintVisible: boolean;
  primaryWeapon: {
    latestProjectileDirection: { x: number; y: number };
  } | null;
};

test.describe('mobile control guides', () => {
  test('guides can be toggled while movement and aim remain playable', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    const runtimeErrors = trackRuntimeErrors(page);

    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run));

    await page.waitForFunction(() => {
      const uiScene = window.__JANGAN_LARI_GAME__?.scene.getScene('UIScene') as { getHudSnapshot?: () => HudSnapshot } | undefined;
      return Boolean(uiScene?.getHudSnapshot?.().controlGuidesVisible);
    });

    let hud = await getHudSnapshot(page);
    let run = await getRunSnapshot(page);
    expect(hud.controlGuideMode).toBe('subtle');
    expect(hud.controlGuidesVisible).toBe(true);
    expect(hud.controlHintVisible).toBe(true);
    expect(run.controlGuideMode).toBe('subtle');
    expect(run.controlHintVisible).toBe(true);

    await clickCanvasPoint(page, 1190, 194);
    await page.waitForFunction(() => {
      const uiScene = window.__JANGAN_LARI_GAME__?.scene.getScene('UIScene') as { getHudSnapshot?: () => HudSnapshot } | undefined;
      return uiScene?.getHudSnapshot?.().controlGuideMode === 'visible';
    });
    hud = await getHudSnapshot(page);
    expect(hud.controlGuidesVisible).toBe(true);
    expect(hud.controlGuideToggleText).toBe('Guide: Visible');

    await clickCanvasPoint(page, 1190, 194);
    await page.waitForFunction(() => {
      const uiScene = window.__JANGAN_LARI_GAME__?.scene.getScene('UIScene') as { getHudSnapshot?: () => HudSnapshot } | undefined;
      return uiScene?.getHudSnapshot?.().controlGuideMode === 'hidden';
    });
    hud = await getHudSnapshot(page);
    run = await getRunSnapshot(page);
    expect(hud.controlGuidesVisible).toBe(false);
    expect(hud.controlHintVisible).toBe(false);
    expect(run.controlGuideMode).toBe('hidden');

    const persistedMode = await page.evaluate(() => {
      const save = JSON.parse(window.localStorage.getItem('jangan-lari-save-v1') ?? '{}') as { controlGuideMode?: string };
      return save.controlGuideMode;
    });
    expect(persistedMode).toBe('hidden');

    const beforeMove = (await getRunSnapshot(page)).player;
    await movePointer(page, 140, 300, 240, 300);
    await page.waitForFunction(
      (start) => {
        const snapshot = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run;
        return Boolean(snapshot && snapshot.player.x - start.x > 8);
      },
      beforeMove,
    );

    const movedRun = await getRunSnapshot(page);
    expect(movedRun.input.movementSource).toBe('pointer');
    expect(movedRun.input.movement.x).toBeGreaterThan(0.8);
    await page.mouse.up();

    await movePointer(page, 690, 300, 690, 220);
    await page.waitForFunction(() => {
      const snapshot = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run;
      return Boolean(snapshot && snapshot.player.facingY < -0.7 && snapshot.input.aimSource === 'pointer');
    });
    await page.waitForFunction(() => {
      const direction = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run?.primaryWeapon?.latestProjectileDirection;
      return Boolean(direction && direction.y < -0.7);
    });

    const aimedRun = await getRunSnapshot(page);
    expect(aimedRun.input.aim.y).toBeLessThan(-0.7);
    expect(aimedRun.primaryWeapon?.latestProjectileDirection.y).toBeLessThan(-0.7);
    await page.mouse.up();
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

async function clickCanvasPoint(page: import('@playwright/test').Page, gameX: number, gameY: number): Promise<void> {
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  const position = await getCanvasAbsolutePoint(page, gameX, gameY);
  await canvas.click({ position: { x: position.x - position.canvasX, y: position.y - position.canvasY } });
}

async function movePointer(
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
): Promise<{ x: number; y: number; canvasX: number; canvasY: number }> {
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error('Game canvas is not available.');
  }

  return {
    x: box.x + (gameX / 1280) * box.width,
    y: box.y + (gameY / 720) * box.height,
    canvasX: box.x,
    canvasY: box.y,
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
