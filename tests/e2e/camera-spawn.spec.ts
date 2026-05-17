import { expect, test } from '@playwright/test';

type RunSnapshot = {
  config: {
    gameWidth: number;
    gameHeight: number;
  };
  player: {
    x: number;
    y: number;
  };
  camera: {
    playerScreenX: number;
    playerScreenY: number;
  };
  enemies: Array<{
    distance: number;
    isElite: boolean;
    isBoss: boolean;
  }>;
  spawnSafety: {
    enemySafeRadius: number;
    eliteSafeRadius: number;
    bossSafeRadius: number;
    nearestEnemyDistance: number | null;
  };
};

test.describe('camera centering and spawn safety', () => {
  test('keeps the player centered at arena edges and spawns enemies outside the safe radius', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    const runtimeErrors = trackRuntimeErrors(page);

    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run));

    await forcePlayerPosition(page, 0, 700);
    await page.waitForFunction(() => {
      const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run as RunSnapshot | null;
      return Boolean(run && Math.abs(run.camera.playerScreenX - run.config.gameWidth / 2) <= 2);
    });

    const leftEdgeRun = await getRunSnapshot(page);
    expect(leftEdgeRun.player.x).toBeGreaterThan(0);
    expect(Math.abs(leftEdgeRun.camera.playerScreenX - leftEdgeRun.config.gameWidth / 2)).toBeLessThanOrEqual(1);

    await forcePlayerPosition(page, 2000, 24);
    await page.waitForFunction(() => {
      const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run as RunSnapshot | null;
      return Boolean(
        run &&
          Math.abs(run.camera.playerScreenX - run.config.gameWidth / 2) <= 2 &&
          Math.abs(run.camera.playerScreenY - run.config.gameHeight / 2) <= 2,
      );
    });

    const cornerRun = await getRunSnapshot(page);
    expect(cornerRun.player.x).toBeLessThan(2000);
    expect(cornerRun.player.y).toBeGreaterThan(0);
    expect(Math.abs(cornerRun.camera.playerScreenX - cornerRun.config.gameWidth / 2)).toBeLessThanOrEqual(1);
    expect(Math.abs(cornerRun.camera.playerScreenY - cornerRun.config.gameHeight / 2)).toBeLessThanOrEqual(1);

    await clearEnemies(page);
    await forceEnemyWave(page, 1000);
    await page.waitForFunction(() => {
      const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run as RunSnapshot | null;
      return Boolean(run && run.enemies.length > 0);
    });

    const waveRun = await getRunSnapshot(page);
    expect(waveRun.spawnSafety.nearestEnemyDistance).not.toBeNull();
    expect(waveRun.spawnSafety.nearestEnemyDistance ?? 0).toBeGreaterThanOrEqual(waveRun.spawnSafety.enemySafeRadius);
    for (const enemy of waveRun.enemies) {
      const safeRadius = enemy.isBoss
        ? waveRun.spawnSafety.bossSafeRadius
        : enemy.isElite
          ? waveRun.spawnSafety.eliteSafeRadius
          : waveRun.spawnSafety.enemySafeRadius;
      expect(enemy.distance).toBeGreaterThanOrEqual(safeRadius);
    }

    await clearEnemies(page);
    await forceRunEvent(page, 'reward-target');
    await page.waitForFunction(() => {
      const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run as RunSnapshot | null;
      return Boolean(run && run.enemies.length > 0);
    });

    const eventRun = await getRunSnapshot(page);
    expect(eventRun.spawnSafety.nearestEnemyDistance ?? 0).toBeGreaterThanOrEqual(eventRun.spawnSafety.enemySafeRadius);
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

async function forcePlayerPosition(page: import('@playwright/test').Page, x: number, y: number): Promise<void> {
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

async function forceRunEvent(page: import('@playwright/test').Page, type: 'challenge-wave' | 'reward-target'): Promise<void> {
  await page.evaluate((nextType) => {
    const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as
      | { debugForceRunEvent?: (type: 'challenge-wave' | 'reward-target') => boolean }
      | undefined;
    if (!runScene?.debugForceRunEvent?.(nextType)) {
      throw new Error(`Failed to force run event: ${nextType}`);
    }
  }, type);
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
