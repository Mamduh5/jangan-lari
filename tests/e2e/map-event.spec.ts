import { expect, test } from '@playwright/test';

type RunSnapshot = {
  player: {
    x: number;
    y: number;
  };
  activeAbility: {
    cooldownMs: number;
    protectionRemainingMs: number;
  };
  event: {
    active: boolean;
    type: 'buff-shrine' | '';
    title: string;
    remainingMs: number;
    x: number | null;
    y: number | null;
    claimRadius: number | null;
    buffType: string;
    buffRemainingMs: number;
    buffShrineSuccesses: number;
    buffShrineFailures: number;
  };
  enemies: Array<{
    id: string;
    isEventTarget: boolean;
  }>;
};

test.describe('power core map event', () => {
  test('spawns a contestable buff shrine and claims a shield/pulse reward', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    const runtimeErrors = trackRuntimeErrors(page);

    await startRun(page);
    await clearEnemies(page);
    await setPlayerPosition(page, 1000, 700);
    await setPulseCooldown(page, 12_000);
    await forceRunEvent(page, 'buff-shrine');

    let run = await getRunSnapshot(page);
    expect(run.event.active).toBe(true);
    expect(run.event.type).toBe('buff-shrine');
    expect(run.event.title).toBe('Power Core');
    expect(run.event.x).not.toBeNull();
    expect(run.event.y).not.toBeNull();
    expect(run.event.claimRadius).toBeGreaterThan(0);
    expect(run.enemies.filter((enemy) => enemy.isEventTarget).length).toBeGreaterThan(0);

    await setPlayerPosition(page, run.event.x!, run.event.y!);
    await page.waitForFunction(() => {
      const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run as RunSnapshot | null;
      return Boolean(run && !run.event.active && run.event.buffShrineSuccesses === 1 && run.event.buffType === 'shield-pulse');
    });

    run = await getRunSnapshot(page);
    expect(run.activeAbility.cooldownMs).toBeLessThan(12_000);
    expect(run.activeAbility.protectionRemainingMs).toBeGreaterThan(0);
    expect(run.event.buffRemainingMs).toBeGreaterThan(0);
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

async function setPulseCooldown(page: import('@playwright/test').Page, cooldownMs: number): Promise<void> {
  await page.evaluate((nextCooldownMs) => {
    const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as
      | { debugSetBreakoutPulseCooldown?: (cooldownMs: number) => void }
      | undefined;
    runScene?.debugSetBreakoutPulseCooldown?.(nextCooldownMs);
  }, cooldownMs);
}

async function forceRunEvent(page: import('@playwright/test').Page, type: 'buff-shrine'): Promise<void> {
  await page.evaluate((nextType) => {
    const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as
      | { debugForceRunEvent?: (type: 'buff-shrine') => boolean }
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
