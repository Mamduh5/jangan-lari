import { expect, test } from '@playwright/test';

type HudSnapshot = {
  statPanelVisible: boolean;
  levelUpVisible: boolean;
  levelUpChoiceCount: number;
  rewardText: string;
  instructionText: string;
  returnHintVisible: boolean;
  returnHintText: string;
};

type RunSnapshot = {
  elapsedMs: number;
  levelUpActive: boolean;
  levelUpChoiceCount: number;
  upgradePoolExhausted: boolean;
  rewardText: string;
  tankStats: {
    availablePoints: number;
    canSpend: boolean;
    statsMaxed: boolean;
    levels: { bulletDamage: number; reload: number; moveSpeed: number; hpRegen: number };
  };
};

test.describe('mobile upgrade exhaustion', () => {
  test('maxed stats with leftover points do not show a blocking stat panel', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    const runtimeErrors = trackRuntimeErrors(page);

    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run));

    const initialHud = await getHudSnapshot(page);
    expect(initialHud.returnHintVisible).toBe(false);
    expect(initialHud.returnHintText).toBe('ESC: Return to Menu');
    expect(initialHud.instructionText).not.toMatch(/\b(Enter|Space|ESC)\b/);

    await maxAllStatsWithLeftoverPoints(page);
    await page.waitForFunction(() => {
      const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run;
      const hud = (window.__JANGAN_LARI_GAME__?.scene.getScene('UIScene') as { getHudSnapshot?: () => HudSnapshot } | undefined)
        ?.getHudSnapshot?.();
      return Boolean(run?.tankStats.statsMaxed && !run.tankStats.canSpend && hud && !hud.statPanelVisible);
    });

    const exhaustedRun = await getRunSnapshot(page);
    expect(exhaustedRun.tankStats.availablePoints).toBe(7);
    expect(exhaustedRun.tankStats.canSpend).toBe(false);
    expect(exhaustedRun.tankStats.statsMaxed).toBe(true);
    expect(exhaustedRun.tankStats.levels).toEqual({
      bulletDamage: 5,
      reload: 5,
      moveSpeed: 5,
      hpRegen: 5,
    });

    const exhaustedHud = await getHudSnapshot(page);
    expect(exhaustedHud.statPanelVisible).toBe(false);
    expect(exhaustedHud.levelUpVisible).toBe(false);
    expect(exhaustedHud.levelUpChoiceCount).toBe(0);
    expect(exhaustedHud.rewardText).toBe('Stats maxed');

    const startElapsedMs = exhaustedRun.elapsedMs;
    await page.waitForFunction(
      (start) => (window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run?.elapsedMs ?? 0) > start + 250,
      startElapsedMs,
    );

    const afterDelayRun = await getRunSnapshot(page);
    expect(afterDelayRun.levelUpActive).toBe(false);
    expect(afterDelayRun.levelUpChoiceCount).toBe(0);
    expect(afterDelayRun.upgradePoolExhausted).toBe(false);
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

async function maxAllStatsWithLeftoverPoints(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const game = window.__JANGAN_LARI_GAME__;
    if (!game?.scene.isActive('RunScene')) {
      throw new Error('RunScene is not active for upgrade exhaustion validation.');
    }

    const runScene = game.scene.getScene('RunScene') as {
      debugGrantStatPoints?: (value: number) => void;
      allocateTankStat?: (statId: 'bulletDamage' | 'reload' | 'moveSpeed' | 'hpRegen') => boolean;
    };
    runScene.debugGrantStatPoints?.(27);

    for (const statId of ['bulletDamage', 'reload', 'moveSpeed', 'hpRegen'] as const) {
      for (let index = 0; index < 5; index += 1) {
        runScene.allocateTankStat?.(statId);
      }
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
