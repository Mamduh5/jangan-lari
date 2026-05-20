import { expect, test } from '@playwright/test';

type RunSnapshot = {
  hp: number;
  dangerZones: {
    activeCount: number;
    warningCount: number;
    damageActiveCount: number;
    zones: Array<{ phase: 'warning' | 'active'; remainingMs: number; elapsedMs: number }>;
  };
};

test.describe('danger zone movement pressure', () => {
  test('warns before damaging and stops progressing while paused', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    const runtimeErrors = trackRuntimeErrors(page);

    await startRun(page);
    await setPlayerPosition(page, 1000, 700);
    await setPlayerHealth(page, 100);
    await triggerDangerZone(page);

    let run = await getRunSnapshot(page);
    const startingHp = run.hp;
    expect(run.dangerZones.activeCount).toBe(1);
    expect(run.dangerZones.warningCount).toBe(1);
    expect(run.dangerZones.damageActiveCount).toBe(0);

    await tickDangerZones(page, 500);
    run = await getRunSnapshot(page);
    expect(run.hp).toBe(startingHp);
    expect(run.dangerZones.warningCount).toBe(1);

    await tickDangerZones(page, 500);
    run = await getRunSnapshot(page);
    expect(run.dangerZones.damageActiveCount).toBe(1);
    expect(run.hp).toBeLessThan(startingHp);

    await triggerDangerZone(page);
    await openPauseMenu(page);
    run = await getRunSnapshot(page);
    const remainingBeforePause = run.dangerZones.zones[0]?.remainingMs ?? 0;
    await page.waitForTimeout(650);
    run = await getRunSnapshot(page);
    expect(run.dangerZones.zones[0]?.remainingMs ?? 0).toBe(remainingBeforePause);
    expect(runtimeErrors, `expected no runtime/page errors, got: ${runtimeErrors.join(' | ')}`).toEqual([]);
  });
});

async function startRun(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run));
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

async function setPlayerHealth(page: import('@playwright/test').Page, health: number): Promise<void> {
  await page.evaluate((nextHealth) => {
    const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as
      | { debugSetPlayerHealth?: (health: number) => void }
      | undefined;
    runScene?.debugSetPlayerHealth?.(nextHealth);
  }, health);
}

async function triggerDangerZone(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as
      | { debugTriggerDangerZone?: (atPlayer?: boolean) => boolean }
      | undefined;
    if (!runScene?.debugTriggerDangerZone?.(true)) {
      throw new Error('Failed to trigger danger zone.');
    }
  });
}

async function tickDangerZones(page: import('@playwright/test').Page, deltaMs: number): Promise<void> {
  await page.evaluate((nextDeltaMs) => {
    const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as
      | { debugTickDangerZones?: (deltaMs: number) => void }
      | undefined;
    runScene?.debugTickDangerZones?.(nextDeltaMs);
  }, deltaMs);
}

async function openPauseMenu(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as { openManualPauseMenu?: () => void } | undefined;
    runScene?.openManualPauseMenu?.();
  });
  await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.registry.get('run.pauseMenuActive')));
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
