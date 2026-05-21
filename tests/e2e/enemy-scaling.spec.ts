import { expect, test } from '@playwright/test';

type RunSnapshot = {
  enemies: Array<{
    id: string;
    maxHp: number;
    moveSpeed: number;
    contactDamage: number;
    shotDamage: number | null;
    shotCooldownMs: number | null;
    shotSpeed: number | null;
  }>;
  enemyPopulation: {
    activeCount: number;
    activeCap: number;
    normalSpawnSlots: number;
  };
  enemyScaling: {
    stack: number;
    maxStack: number;
    intervalMs: number;
    multipliers: {
      hp: number;
      speed: number;
      damage: number;
      projectileCooldown: number;
      projectileSpeed: number;
    };
  };
};

test.describe('enemy population and scaling', () => {
  test('scaling stack advances, new enemies receive scaled stats, and normal spawns respect cap', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    const runtimeErrors = trackRuntimeErrors(page);

    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run));

    let run = await getRunSnapshot(page);
    expect(run.enemyScaling.stack).toBe(0);
    expect(run.enemyPopulation.activeCap).toBe(28);

    await clearEnemies(page);
    await setRunElapsedMs(page, 180_000);
    run = await getRunSnapshot(page);
    expect(run.enemyScaling.stack).toBe(2);
    expect(run.enemyScaling.multipliers.hp).toBeCloseTo(1.68);
    expect(run.enemyScaling.multipliers).toMatchObject({
      speed: 1.09,
      damage: 1.16,
      projectileCooldown: 0.944,
      projectileSpeed: 1.07,
    });

    await spawnReadabilityEnemy(page, 'hexcaster');
    await page.waitForFunction(() => {
      const snapshot = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run as RunSnapshot | null;
      return Boolean(snapshot?.enemies.some((enemy) => enemy.id === 'hexcaster' && enemy.maxHp > 42));
    });

    run = await getRunSnapshot(page);
    const hexcaster = run.enemies.find((enemy) => enemy.id === 'hexcaster');
    expect(hexcaster).toMatchObject({
      maxHp: 161,
      moveSpeed: 116,
      contactDamage: 12,
      shotDamage: 19,
      shotCooldownMs: 1558,
      shotSpeed: 375,
    });

    await clearEnemies(page);
    await setRunElapsedMs(page, 1_000);
    for (let index = 0; index < 14; index += 1) {
      await forceEnemyWave(page, 1_000);
    }

    run = await getRunSnapshot(page);
    expect(run.enemyPopulation.activeCount).toBeLessThanOrEqual(run.enemyPopulation.activeCap);
    expect(run.enemyPopulation.activeCount + run.enemyPopulation.normalSpawnSlots).toBe(run.enemyPopulation.activeCap);
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

async function clearEnemies(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as { debugClearEnemies?: () => void } | undefined;
    runScene?.debugClearEnemies?.();
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

async function spawnReadabilityEnemy(page: import('@playwright/test').Page, id: string): Promise<void> {
  await page.evaluate((archetypeId) => {
    const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as
      | { debugSpawnEnemyForReadability?: (id: string) => void }
      | undefined;
    runScene?.debugSpawnEnemyForReadability?.(archetypeId);
  }, id);
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
