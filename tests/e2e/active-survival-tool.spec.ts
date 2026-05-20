import { expect, test } from '@playwright/test';

type HudSnapshot = {
  activeAbilityButtonVisible: boolean;
  activeAbilityButtonText: string;
};

type RunSnapshot = {
  activeAbility: {
    ready: boolean;
    cooldownMs: number;
    activationCount: number;
  };
  enemies: Array<{ id: string; distance: number; isBoss: boolean }>;
  levelUpActive: boolean;
  endActive: boolean;
};

test.describe('active survival tool', () => {
  test('shows a compact pulse button, starts cooldown, and pushes nearby enemies away', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    const runtimeErrors = trackRuntimeErrors(page);

    await startRun(page);
    let hud = await getHudSnapshot(page);
    expect(hud.activeAbilityButtonVisible).toBe(true);
    expect(hud.activeAbilityButtonText).toBe('P');

    await clearEnemies(page);
    await setPlayerPosition(page, 1000, 700);
    await spawnEnemyNearPlayer(page);
    let run = await getRunSnapshot(page);
    const initialDistance = run.enemies[0]?.distance ?? 0;
    expect(initialDistance).toBeGreaterThan(0);
    expect(initialDistance).toBeLessThan(185);

    await activatePulse(page);
    run = await getRunSnapshot(page);
    expect(run.activeAbility.ready).toBe(false);
    expect(run.activeAbility.cooldownMs).toBeGreaterThan(0);
    expect(run.activeAbility.activationCount).toBe(1);
    expect(run.enemies[0].distance).toBeGreaterThan(initialDistance);

    await activatePulse(page);
    run = await getRunSnapshot(page);
    expect(run.activeAbility.activationCount).toBe(1);

    await openPauseMenu(page);
    hud = await getHudSnapshot(page);
    expect(hud.activeAbilityButtonVisible).toBe(false);
    await closePauseMenu(page);

    await forceLevelUpOverlay(page);
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run?.levelUpActive));
    hud = await getHudSnapshot(page);
    expect(hud.activeAbilityButtonVisible).toBe(false);

    await endRun(page);
    hud = await getHudSnapshot(page);
    expect(hud.activeAbilityButtonVisible).toBe(false);
    expect(runtimeErrors, `expected no runtime/page errors, got: ${runtimeErrors.join(' | ')}`).toEqual([]);
  });
});

async function startRun(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run));
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

async function clearEnemies(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as { debugClearEnemies?: () => void } | undefined;
    runScene?.debugClearEnemies?.();
  });
}

async function setPlayerPosition(page: import('@playwright/test').Page, x: number, y: number): Promise<void> {
  await page.evaluate(
    ([nextX, nextY]) => {
      const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as
        | { debugSetPlayerPosition?: (x: number, y: number) => void }
        | undefined;
      runScene?.debugSetPlayerPosition?.(nextX, nextY);
    },
    [x, y],
  );
}

async function spawnEnemyNearPlayer(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as
      | { debugSpawnEnemyNearPlayer?: (id?: string, offsetX?: number, offsetY?: number) => boolean }
      | undefined;
    if (!runScene?.debugSpawnEnemyNearPlayer?.('bulwark', 92, 0)) {
      throw new Error('Failed to spawn nearby enemy.');
    }
  });
}

async function activatePulse(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as { activateBreakoutPulse?: () => boolean } | undefined;
    runScene?.activateBreakoutPulse?.();
  });
}

async function openPauseMenu(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as { openManualPauseMenu?: () => void } | undefined;
    runScene?.openManualPauseMenu?.();
  });
  await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.registry.get('run.pauseMenuActive')));
}

async function closePauseMenu(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as { closeManualPauseMenu?: () => void } | undefined;
    runScene?.closeManualPauseMenu?.();
  });
  await page.waitForFunction(() => !window.__JANGAN_LARI_GAME__?.registry.get('run.pauseMenuActive'));
}

async function forceLevelUpOverlay(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as { debugForceRewardVisibilityChoices?: () => void } | undefined;
    runScene?.debugForceRewardVisibilityChoices?.();
  });
}

async function endRun(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as { debugEndRun?: (victory?: boolean) => void } | undefined;
    runScene?.debugEndRun?.(false);
  });
  await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run?.endActive));
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
