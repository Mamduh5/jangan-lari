import { expect, test } from '@playwright/test';

type HudSnapshot = {
  statSummary: string;
};

type RunSnapshot = {
  hp: number;
  maxHp: number;
  tankStats: {
    availablePoints: number;
    levels: { bulletDamage: number; reload: number; moveSpeed: number; hpRegen: number };
    effects: { hpRegenPerSecond: number };
    effectiveHpRegenPerSecond: number;
    runHpRegenPerSecond: number;
    hpRegenActive: boolean;
  };
};

test.describe('hp regen', () => {
  test('run stat regen heals over time without exceeding max hp', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    const runtimeErrors = trackRuntimeErrors(page);

    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run));

    await page.evaluate(() => {
      const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as
        | {
            debugClearEnemies?: () => void;
            debugGrantStatPoints?: (points: number) => void;
            debugSetPlayerHealth?: (health: number) => void;
            allocateTankStat?: (statId: 'hpRegen') => boolean;
          }
        | undefined;

      runScene?.debugClearEnemies?.();
      runScene?.debugSetPlayerHealth?.(70);
      runScene?.debugGrantStatPoints?.(5);
      for (let index = 0; index < 5; index += 1) {
        runScene?.allocateTankStat?.('hpRegen');
      }
    });

    await page.waitForFunction(() => {
      const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run as RunSnapshot | null;
      return Boolean(run && run.tankStats.levels.hpRegen === 5);
    });
    await page.evaluate(() => {
      const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as
        | { debugSetPlayerHealth?: (health: number) => void }
        | undefined;
      runScene?.debugSetPlayerHealth?.(70);
    });

    const afterSpend = await getRunSnapshot(page);
    expect(afterSpend.hp).toBe(70);
    expect(afterSpend.tankStats.levels.hpRegen).toBe(5);
    expect(afterSpend.tankStats.availablePoints).toBe(0);
    expect(afterSpend.tankStats.effects.hpRegenPerSecond).toBeCloseTo(1.75);
    expect(afterSpend.tankStats.effectiveHpRegenPerSecond).toBeCloseTo(1.75);
    expect(afterSpend.tankStats.runHpRegenPerSecond).toBeCloseTo(1.75);

    const hud = await getHudSnapshot(page);
    expect(hud.statSummary).toContain('REG5');
    expect(hud.statSummary).not.toContain('HP5');

    await page.evaluate(() => {
      const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as
        | { debugTickHpRegen?: (deltaMs: number) => void }
        | undefined;

      for (let index = 0; index < 24; index += 1) {
        runScene?.debugTickHpRegen?.(250);
      }
    });

    const afterRegen = await getRunSnapshot(page);
    expect(afterRegen.hp).toBeGreaterThan(afterSpend.hp);
    expect(afterRegen.hp).toBeLessThanOrEqual(afterRegen.maxHp);
    expect(afterRegen.tankStats.hpRegenActive).toBe(true);

    await page.evaluate(() => {
      const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as
        | {
            debugSetPlayerHealth?: (health: number) => void;
            debugTickHpRegen?: (deltaMs: number) => void;
          }
        | undefined;

      runScene?.debugSetPlayerHealth?.(99);
      for (let index = 0; index < 16; index += 1) {
        runScene?.debugTickHpRegen?.(250);
      }
    });

    const capped = await getRunSnapshot(page);
    expect(capped.hp).toBe(capped.maxHp);
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
