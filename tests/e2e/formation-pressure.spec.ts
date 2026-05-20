import { expect, test } from '@playwright/test';

type FormationType = 'ring-breakout' | 'pincer' | 'sweep-wall' | '';

type RunSnapshot = {
  formationPressure: {
    lastFormationType: FormationType;
    spawnCount: number;
    spawnPoints: Array<{ x: number; y: number; distanceFromPlayer: number; angle: number }>;
  };
  enemyPopulation: {
    activeCount: number;
    activeCap: number;
  };
  enemies: Array<{ id: string; distance: number; isBoss: boolean; isElite: boolean }>;
};

test.describe('formation pressure', () => {
  test('spawns fair ring and pincer formations without exceeding the enemy cap', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    const runtimeErrors = trackRuntimeErrors(page);

    await startRun(page);
    await clearEnemies(page);
    await setPlayerPosition(page, 1000, 700);
    await forceFormation(page, 'ring-breakout');

    let run = await getRunSnapshot(page);
    expect(run.formationPressure.lastFormationType).toBe('ring-breakout');
    expect(run.formationPressure.spawnCount).toBeGreaterThanOrEqual(4);
    expect(run.enemyPopulation.activeCount).toBeLessThanOrEqual(run.enemyPopulation.activeCap);
    expect(run.formationPressure.spawnPoints.every((point) => point.distanceFromPlayer >= 340)).toBe(true);
    expect(getLargestAngleGap(run.formationPressure.spawnPoints.map((point) => point.angle))).toBeGreaterThan(1.2);
    expect(run.enemies.every((enemy) => !enemy.isBoss && !enemy.isElite)).toBe(true);

    await clearEnemies(page);
    await forceFormation(page, 'pincer');
    run = await getRunSnapshot(page);
    expect(run.formationPressure.lastFormationType).toBe('pincer');
    expect(run.formationPressure.spawnCount).toBeGreaterThanOrEqual(4);
    expect(run.enemyPopulation.activeCount).toBeLessThanOrEqual(run.enemyPopulation.activeCap);
    expect(run.formationPressure.spawnPoints.every((point) => point.distanceFromPlayer >= 340)).toBe(true);
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

async function forceFormation(page: import('@playwright/test').Page, type: Exclude<FormationType, ''>): Promise<void> {
  await page.evaluate((formationType) => {
    const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as
      | { debugForceFormationPressure?: (type: string) => boolean }
      | undefined;
    if (!runScene?.debugForceFormationPressure?.(formationType)) {
      throw new Error(`Failed to force formation: ${formationType}`);
    }
  }, type);
}

function getLargestAngleGap(angles: number[]): number {
  const sorted = angles
    .map((angle) => (angle < 0 ? angle + Math.PI * 2 : angle))
    .sort((left, right) => left - right);
  if (sorted.length < 2) {
    return 0;
  }

  let largest = 0;
  for (let index = 0; index < sorted.length; index += 1) {
    const current = sorted[index];
    const next = sorted[(index + 1) % sorted.length] + (index === sorted.length - 1 ? Math.PI * 2 : 0);
    largest = Math.max(largest, next - current);
  }
  return largest;
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
