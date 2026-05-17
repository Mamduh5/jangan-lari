import { expect, test } from '@playwright/test';

type HudSnapshot = {
  timer: string;
  instructionText: string;
};

type RunSnapshot = {
  stagePhase: 'preBoss' | 'boss' | 'victory' | 'defeat';
  elapsedMs: number;
  bossSpawnTimeMs: number;
  bossActive: boolean;
  bossHp: number | null;
  bossMaxHp: number | null;
  normalSpawnsSuppressed: boolean;
  victoryCondition: string;
  endActive: boolean;
  victory: boolean;
  endTitle: string;
  localLeaderboardEntryCount: number;
  goldEarned: number;
  enemies: Array<{
    id: string;
    isBoss: boolean;
  }>;
  neutralShapeCount: number;
  enemyPopulation: {
    activeCount: number;
    normalSpawnSlots: number;
  };
};

test.describe('boss stage win condition', () => {
  test('spawns boss at stage time, suppresses normal enemies, and wins only after boss death', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    const runtimeErrors = trackRuntimeErrors(page);

    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run));

    await clearEnemies(page);
    await forceEnemyWave(page, 1_000);
    await page.waitForFunction(() => {
      const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run as RunSnapshot | null;
      return Boolean(run && run.enemies.length > 0 && run.stagePhase === 'preBoss');
    });

    const preBossHud = await getHudSnapshot(page);
    expect(preBossHud.timer).toContain('Boss in');
    expect(preBossHud.timer.toLowerCase()).not.toContain('survive');

    await setRunElapsedMs(page, 900_000);
    await page.waitForFunction(() => {
      const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run as RunSnapshot | null;
      return Boolean(run?.stagePhase === 'boss' && run.bossActive && run.normalSpawnsSuppressed);
    });

    let run = await getRunSnapshot(page);
    expect(run.elapsedMs).toBeGreaterThanOrEqual(run.bossSpawnTimeMs);
    expect(run.endActive).toBe(false);
    expect(run.victory).toBe(false);
    expect(run.victoryCondition).toBe('bossActive');
    expect(run.enemies).toHaveLength(1);
    expect(run.enemies[0]).toMatchObject({ id: 'behemoth', isBoss: true });
    expect(run.enemyPopulation.activeCount).toBe(1);
    expect(run.enemyPopulation.normalSpawnSlots).toBe(0);
    expect(run.neutralShapeCount).toBe(0);
    expect(run.bossMaxHp ?? 0).toBeGreaterThan(10_000);

    const bossHud = await getHudSnapshot(page);
    expect(bossHud.timer).toContain('Boss HP');
    expect(bossHud.instructionText).toContain('Defeat');

    await forceEnemyWave(page, 901_000);
    run = await getRunSnapshot(page);
    expect(run.enemies).toHaveLength(1);
    expect(run.enemies[0].isBoss).toBe(true);

    await defeatBoss(page);
    await page.waitForFunction(() => {
      const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run as RunSnapshot | null;
      return Boolean(run?.endActive && run.victory && run.stagePhase === 'victory');
    });

    run = await getRunSnapshot(page);
    expect(run.victoryCondition).toBe('bossDefeated');
    expect(run.endTitle).toBe('Victory');
    expect(run.localLeaderboardEntryCount).toBeGreaterThanOrEqual(1);
    expect(run.goldEarned).toBeGreaterThan(0);
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

async function setRunElapsedMs(page: import('@playwright/test').Page, elapsedMs: number): Promise<void> {
  await page.evaluate((nextElapsedMs) => {
    const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as
      | { debugSetRunElapsedMs?: (elapsedMs: number) => void }
      | undefined;
    runScene?.debugSetRunElapsedMs?.(nextElapsedMs);
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
