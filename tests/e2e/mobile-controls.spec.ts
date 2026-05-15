import { expect, test } from '@playwright/test';

type ControlGuideMode = 'hidden' | 'subtle' | 'visible';

type HudSnapshot = {
  controlGuideMode: ControlGuideMode;
  controlGuidesVisible: boolean;
  joystickGuidesVisible: boolean;
  movementJoystickKnob: { x: number; y: number };
  aimJoystickKnob: { x: number; y: number };
  controlHintVisible: boolean;
  controlGuideToggleText: string;
  controlGuideToggleVisible: boolean;
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
  test('joystick guides render while movement and aim remain playable', async ({ page }) => {
    test.setTimeout(45_000);
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
    expect(hud.joystickGuidesVisible).toBe(true);
    expect(hud.controlHintVisible).toBe(true);
    expect(hud.controlGuideToggleVisible).toBe(false);
    expect(run.controlGuideMode).toBe('subtle');
    expect(run.controlHintVisible).toBe(true);

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
    hud = await getHudSnapshot(page);
    expect(hud.movementJoystickKnob.x).toBeGreaterThan(360);
    await page.mouse.up();

    const virtualSize = await getVirtualSize(page);
    const aimX = virtualSize.width - 260;
    await movePointer(page, aimX, 300, aimX, 220);
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
    hud = await getHudSnapshot(page);
    expect(hud.aimJoystickKnob.y).toBeLessThan(552);
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
    x: box.x + (gameX / (await getVirtualSize(page)).width) * box.width,
    y: box.y + (gameY / (await getVirtualSize(page)).height) * box.height,
    canvasX: box.x,
    canvasY: box.y,
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
