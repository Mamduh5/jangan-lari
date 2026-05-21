import { expect, test } from '@playwright/test';

type RunSnapshot = {
  waveTemplate: {
    id: string;
    label: string;
  };
  enemies: Array<{
    id: string;
    isBoss: boolean;
    isElite: boolean;
    isRanged: boolean;
  }>;
  enemyPopulation: {
    activeCount: number;
    activeCap: number;
  };
};

test.describe('wave director role progression', () => {
  test('starts simple, then unlocks ranged pressure later without exceeding cap', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    const runtimeErrors = trackRuntimeErrors(page);

    await startRun(page);
    await clearEnemies(page);
    await forceEnemyWave(page, 1_000);

    let run = await getRunSnapshot(page);
    expect(run.waveTemplate.id).toBe('scuttler-basics');
    expect(run.enemies.every((enemy) => enemy.id === 'scuttler')).toBe(true);
    expect(run.enemyPopulation.activeCount).toBeLessThanOrEqual(run.enemyPopulation.activeCap);

    await clearEnemies(page);
    await forceEnemyWave(page, 190_000);
    run = await getRunSnapshot(page);
    expect(run.enemies.some((enemy) => enemy.isRanged)).toBe(true);
    expect(run.enemies.filter((enemy) => enemy.isRanged)).toHaveLength(1);

    await clearEnemies(page);
    await forceEnemyWave(page, 500_000);
    run = await getRunSnapshot(page);
    expect(run.enemies.length).toBeGreaterThanOrEqual(5);
    expect(run.enemies.some((enemy) => enemy.id === 'hexcaster')).toBe(true);
    expect(run.enemies.some((enemy) => enemy.id === 'bulwark' || enemy.id === 'mauler')).toBe(true);
    expect(run.enemyPopulation.activeCount).toBeLessThanOrEqual(run.enemyPopulation.activeCap);
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

async function clearEnemies(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as { debugClearEnemies?: () => void } | undefined;
    runScene?.debugClearEnemies?.();
  });
}

async function forceEnemyWave(page: import('@playwright/test').Page, elapsedMs: number): Promise<void> {
  await page.evaluate((nextElapsedMs) => {
    const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as
      | { debugSpawnEnemyWaveAt?: (elapsedMs: number) => void }
      | undefined;
    runScene?.debugSpawnEnemyWaveAt?.(nextElapsedMs);
  }, elapsedMs);
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
