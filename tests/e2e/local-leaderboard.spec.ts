import { expect, test } from '@playwright/test';

type HudSnapshot = {
  score: string;
  endStats: string;
  leaderboard: string;
};

type RunSnapshot = {
  score: number;
  bestScore: number;
  finalScore: number;
  newBestScore: boolean;
  localLeaderboardEntryCount: number;
  neutralShapesDestroyed: number;
  endActive: boolean;
};

test.describe('local leaderboard pressure', () => {
  test('records a local best score and shows the local top list after a run', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.clear());
    const runtimeErrors = trackRuntimeErrors(page);

    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));
    await clickCanvasPoint(page, 560, 82);
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run));

    const initialRun = await getRunSnapshot(page);
    const initialHud = await getHudSnapshot(page);
    expect(initialHud.score).toMatch(/^Score \d+$/);

    await addScoreProgress(page, { neutralShapesDestroyed: 2, enemyKills: 1, elapsedMs: 4000 });
    await page.waitForFunction(
      (startingScore) => (window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run?.score ?? 0) > startingScore,
      initialRun.score,
    );

    const scoredRun = await getRunSnapshot(page);
    expect(scoredRun.neutralShapesDestroyed).toBeGreaterThanOrEqual(2);
    expect(scoredRun.score).toBeGreaterThan(initialRun.score);

    await forceRunEnd(page);
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run?.endActive));

    const endedRun = await getRunSnapshot(page);
    expect(endedRun.finalScore).toBeGreaterThan(0);
    expect(endedRun.bestScore).toBe(endedRun.finalScore);
    expect(endedRun.newBestScore).toBe(true);
    expect(endedRun.localLeaderboardEntryCount).toBe(1);

    const endedHud = await getHudSnapshot(page);
    expect(endedHud.endStats).toContain(`Score ${endedRun.finalScore}`);
    expect(endedHud.endStats).toContain('NEW BEST');
    expect(endedHud.leaderboard).toContain('Local Top 5');
    expect(endedHud.leaderboard).toContain(String(endedRun.finalScore));

    const persistedSave = await page.evaluate(() => JSON.parse(window.localStorage.getItem('jangan-lari-save-v1') ?? '{}'));
    expect(persistedSave.bestScore).toBe(endedRun.finalScore);
    expect(persistedSave.localLeaderboard).toHaveLength(1);
    expect(runtimeErrors, `expected no runtime/page errors, got: ${runtimeErrors.join(' | ')}`).toEqual([]);
  });
});

async function addScoreProgress(
  page: import('@playwright/test').Page,
  progress: { neutralShapesDestroyed?: number; enemyKills?: number; elapsedMs?: number },
): Promise<void> {
  await page.evaluate((nextProgress) => {
    const game = window.__JANGAN_LARI_GAME__;
    if (!game?.scene.isActive('RunScene')) {
      throw new Error('RunScene is not active for leaderboard score validation.');
    }

    const runScene = game.scene.getScene('RunScene') as {
      debugAddScoreProgress?: (options: { neutralShapesDestroyed?: number; enemyKills?: number; elapsedMs?: number }) => void;
    };
    runScene.debugAddScoreProgress?.(nextProgress);
  }, progress);
}

async function forceRunEnd(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const game = window.__JANGAN_LARI_GAME__;
    if (!game?.scene.isActive('RunScene')) {
      throw new Error('RunScene is not active for leaderboard end validation.');
    }

    const runScene = game.scene.getScene('RunScene') as { debugEndRun?: (victory?: boolean) => void };
    runScene.debugEndRun?.(false);
  });
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

async function clickCanvasPoint(page: import('@playwright/test').Page, gameX: number, gameY: number): Promise<void> {
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error('Game canvas is not available.');
  }

  await canvas.click({
    position: {
      x: (gameX / 1280) * box.width,
      y: (gameY / 720) * box.height,
    },
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
