import { expect, test } from '@playwright/test';

type RunSnapshot = {
  stagePhase: 'preBoss' | 'boss' | 'victory' | 'defeat';
  bossActive: boolean;
  bossPhase: 1 | 2;
  bossSummonActiveCount: number;
  bossSummonCap: number;
  bossTargetFastKillMs: number;
  bossOwnedEnemyCount: number;
  bossPhasePressure: string;
  normalSpawnsSuppressed: boolean;
  endActive: boolean;
  victory: boolean;
  enemies: Array<{
    id: string;
    isBoss: boolean;
    isBossOwned: boolean;
    xpValue: number;
  }>;
  enemyPopulation: {
    activeCount: number;
    normalSpawnSlots: number;
  };
};

test.describe('boss balance and boss-owned summons', () => {
  test('phase 2 summons are capped, boss-owned, and cleared by boss victory', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    const runtimeErrors = trackRuntimeErrors(page);

    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run));

    await setRunElapsedMs(page, 900_000);
    await page.waitForFunction(() => {
      const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run as RunSnapshot | null;
      return Boolean(run?.stagePhase === 'boss' && run.bossActive && run.normalSpawnsSuppressed);
    });

    await setBossHealthRatio(page, 0.49);
    await page.waitForFunction(() => {
      const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run as RunSnapshot | null;
      return Boolean(run?.bossPhase === 2 && run.bossPhasePressure === 'phase2-summons');
    });

    await forceBossSummons(page);
    await page.waitForFunction(() => {
      const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run as RunSnapshot | null;
      return Boolean(run && run.bossSummonActiveCount > 0 && run.bossOwnedEnemyCount > 0);
    });

    let run = await getRunSnapshot(page);
    expect(run.bossTargetFastKillMs).toBe(60_000);
    expect(run.bossSummonCap).toBeGreaterThanOrEqual(run.bossSummonActiveCount);
    expect(run.bossSummonActiveCount).toBeLessThanOrEqual(6);
    expect(run.enemyPopulation.normalSpawnSlots).toBe(0);
    expect(run.enemies.filter((enemy) => enemy.isBossOwned)).toHaveLength(run.bossSummonActiveCount);
    expect(run.enemies.filter((enemy) => !enemy.isBoss && !enemy.isBossOwned)).toHaveLength(0);
    expect(run.enemies.filter((enemy) => enemy.isBossOwned).every((enemy) => enemy.xpValue <= 1)).toBe(true);

    await forceEnemyWave(page, 901_000);
    run = await getRunSnapshot(page);
    expect(run.normalSpawnsSuppressed).toBe(true);
    expect(run.enemyPopulation.normalSpawnSlots).toBe(0);
    expect(run.enemies.filter((enemy) => !enemy.isBoss && !enemy.isBossOwned)).toHaveLength(0);
    expect(run.bossSummonActiveCount).toBeLessThanOrEqual(run.bossSummonCap);

    await defeatBoss(page);
    await page.waitForFunction(() => {
      const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run as RunSnapshot | null;
      return Boolean(run?.endActive && run.victory && run.stagePhase === 'victory' && run.bossOwnedEnemyCount === 0);
    });

    run = await getRunSnapshot(page);
    expect(run.enemies.some((enemy) => enemy.isBossOwned)).toBe(false);
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

async function setRunElapsedMs(page: import('@playwright/test').Page, elapsedMs: number): Promise<void> {
  await page.evaluate((nextElapsedMs) => {
    const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as
      | { debugSetRunElapsedMs?: (elapsedMs: number) => void }
      | undefined;
    runScene?.debugSetRunElapsedMs?.(nextElapsedMs);
  }, elapsedMs);
}

async function setBossHealthRatio(page: import('@playwright/test').Page, ratio: number): Promise<void> {
  await page.evaluate((nextRatio) => {
    const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as
      | { debugSetBossHealthRatio?: (ratio: number) => boolean }
      | undefined;
    if (!runScene?.debugSetBossHealthRatio?.(nextRatio)) {
      throw new Error('Failed to set boss health ratio.');
    }
  }, ratio);
}

async function forceBossSummons(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as
      | { debugForceBossSummons?: () => boolean }
      | undefined;
    if (!runScene?.debugForceBossSummons?.()) {
      throw new Error('Failed to force boss summons.');
    }
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

async function defeatBoss(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as
      | { debugDefeatBoss?: () => boolean }
      | undefined;
    if (!runScene?.debugDefeatBoss?.()) {
      throw new Error('Failed to defeat boss through debug hook.');
    }
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
