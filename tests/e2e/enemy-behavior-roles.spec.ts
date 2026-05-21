import { expect, test } from '@playwright/test';

type EnemySummary = {
  id: string;
  behavior: string;
  behaviorState: string;
  isPriorityThreat: boolean;
  isBlockingRoute: boolean;
  isRanged: boolean;
  isElite: boolean;
  isBoss: boolean;
};

type RunSnapshot = {
  waveTemplate: { id: string };
  enemies: EnemySummary[];
  enemyPopulation: {
    activeCount: number;
    activeCap: number;
  };
};

test.describe('enemy behavior roles', () => {
  test('early spawns are fodder-only with chase behavior', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    const runtimeErrors = trackRuntimeErrors(page);

    await startRun(page);
    await clearEnemies(page);
    await forceEnemyWave(page, 1_000);

    const run = await getRunSnapshot(page);
    expect(run.waveTemplate.id).toBe('scuttler-basics');
    expect(run.enemies.every((e) => e.id === 'scuttler')).toBe(true);
    expect(run.enemies.every((e) => e.behavior === 'chase')).toBe(true);
    expect(run.enemies.every((e) => !e.isPriorityThreat)).toBe(true);
    expect(run.enemies.every((e) => !e.isBlockingRoute)).toBe(true);
    expect(runtimeErrors, `errors: ${runtimeErrors.join(' | ')}`).toEqual([]);
  });

  test('interceptors appear at 1-2 min and expose behaviorState field', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    const runtimeErrors = trackRuntimeErrors(page);

    await startRun(page);
    await clearEnemies(page);
    await forceEnemyWave(page, 75_000);

    const run = await getRunSnapshot(page);
    const interceptors = run.enemies.filter((e) => e.behavior === 'intercept');
    expect(interceptors.length).toBeGreaterThan(0);

    for (const e of interceptors) {
      expect(e.id === 'skimmer' || e.id === 'harrier').toBe(true);
      expect(e.behaviorState).toBeTruthy();
      expect(typeof e.behaviorState).toBe('string');
    }
    expect(runtimeErrors, `errors: ${runtimeErrors.join(' | ')}`).toEqual([]);
  });

  test('charger role enters windup, dash, and recovery states', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    const runtimeErrors = trackRuntimeErrors(page);

    await startRun(page);
    await clearEnemies(page);
    await setRunElapsed(page, 145_000);
    await spawnEnemyNearPlayer(page, 'crusher', 250, 0);

    const states = await collectBehaviorStates(page, 'charger', ['windup', 'dashing', 'recovering'], 6_000);
    expect(states).toEqual(expect.arrayContaining(['windup', 'dashing', 'recovering']));
    expect(runtimeErrors, `errors: ${runtimeErrors.join(' | ')}`).toEqual([]);
  });

  test('blockers appear at 2-3 min with chasing or bracing behaviorState', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    const runtimeErrors = trackRuntimeErrors(page);

    await startRun(page);
    await clearEnemies(page);
    await forceEnemyWave(page, 145_000);

    const run = await getRunSnapshot(page);
    const blockers = run.enemies.filter((e) => e.behavior === 'blocker');
    expect(blockers.length).toBeGreaterThan(0);

    for (const blocker of blockers) {
      expect(blocker.id === 'mauler' || blocker.id === 'bulwark').toBe(true);
      const validStates = ['chasing', 'bracing'];
      expect(validStates).toContain(blocker.behaviorState);
    }
    expect(runtimeErrors, `errors: ${runtimeErrors.join(' | ')}`).toEqual([]);
  });

  test('ranged enemies are always isPriorityThreat and never isBlockingRoute', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    const runtimeErrors = trackRuntimeErrors(page);

    await startRun(page);
    await clearEnemies(page);
    await forceEnemyWave(page, 200_000);

    const run = await getRunSnapshot(page);
    const ranged = run.enemies.filter((e) => e.behavior === 'ranged');
    expect(ranged.length).toBeGreaterThan(0);

    for (const caster of ranged) {
      expect(caster.isPriorityThreat).toBe(true);
      expect(caster.isBlockingRoute).toBe(false);
    }
    expect(runtimeErrors, `errors: ${runtimeErrors.join(' | ')}`).toEqual([]);
  });

  test('blocker role enters brace state and exposes isBlockingRoute', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    const runtimeErrors = trackRuntimeErrors(page);

    await startRun(page);
    await clearEnemies(page);
    await setRunElapsed(page, 145_000);
    await spawnEnemyNearPlayer(page, 'bulwark', 200, 0);

    const blocker = await waitForEnemyState(page, 'blocker', 'bracing', 4_000);
    expect(blocker.id).toBe('bulwark');
    expect(blocker.isBlockingRoute).toBe(true);
    expect(runtimeErrors, `errors: ${runtimeErrors.join(' | ')}`).toEqual([]);
  });

  test('late waves mix all non-fodder roles and respect population cap', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    const runtimeErrors = trackRuntimeErrors(page);

    await startRun(page);
    await clearEnemies(page);
    await forceEnemyWave(page, 500_000);

    const run = await getRunSnapshot(page);
    const behaviors = new Set(run.enemies.map((e) => e.behavior));
    expect(behaviors.size).toBeGreaterThanOrEqual(2);
    expect(run.enemyPopulation.activeCount).toBeLessThanOrEqual(run.enemyPopulation.activeCap);
    expect(runtimeErrors, `errors: ${runtimeErrors.join(' | ')}`).toEqual([]);
  });

  test('no runtime errors across the entire behavior sweep', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    const runtimeErrors = trackRuntimeErrors(page);

    await startRun(page);

    const timestamps = [1_000, 75_000, 145_000, 200_000, 350_000, 500_000];
    for (const ts of timestamps) {
      await clearEnemies(page);
      await forceEnemyWave(page, ts);
      const run = await getRunSnapshot(page);
      for (const enemy of run.enemies) {
        expect(typeof enemy.behaviorState).toBe('string');
        expect(enemy.behaviorState.length).toBeGreaterThan(0);
      }
    }

    expect(runtimeErrors, `errors: ${runtimeErrors.join(' | ')}`).toEqual([]);
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
    const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as
      | { debugClearEnemies?: () => void }
      | undefined;
    runScene?.debugClearEnemies?.();
  });
}

async function setRunElapsed(page: import('@playwright/test').Page, elapsedMs: number): Promise<void> {
  await page.evaluate((nextElapsedMs) => {
    const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as
      | { debugSetRunElapsedMs?: (elapsedMs: number) => void }
      | undefined;
    runScene?.debugSetRunElapsedMs?.(nextElapsedMs);
  }, elapsedMs);
}

async function forceEnemyWave(page: import('@playwright/test').Page, elapsedMs: number): Promise<void> {
  await page.evaluate((nextElapsedMs) => {
    const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as
      | { debugSpawnEnemyWaveAt?: (elapsedMs: number) => void }
      | undefined;
    runScene?.debugSpawnEnemyWaveAt?.(nextElapsedMs);
  }, elapsedMs);
}

async function spawnEnemyNearPlayer(
  page: import('@playwright/test').Page,
  archetypeId: string,
  offsetX: number,
  offsetY: number,
): Promise<void> {
  const spawned = await page.evaluate(({ id, x, y }) => {
    const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as
      | { debugSpawnEnemyNearPlayer?: (archetypeId: string, offsetX: number, offsetY: number) => boolean }
      | undefined;
    return runScene?.debugSpawnEnemyNearPlayer?.(id, x, y) ?? false;
  }, { id: archetypeId, x: offsetX, y: offsetY });

  expect(spawned).toBe(true);
}

async function collectBehaviorStates(
  page: import('@playwright/test').Page,
  behavior: string,
  requiredStates: string[],
  timeoutMs: number,
): Promise<string[]> {
  return page.evaluate(
    ({ targetBehavior, required, timeout }) =>
      new Promise<string[]>((resolve) => {
        const seen = new Set<string>();
        const deadline = performance.now() + timeout;

        const tick = () => {
          const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run;
          for (const enemy of run?.enemies ?? []) {
            if (enemy.behavior === targetBehavior) {
              seen.add(enemy.behaviorState);
            }
          }

          if (required.every((state) => seen.has(state)) || performance.now() >= deadline) {
            resolve([...seen]);
            return;
          }

          requestAnimationFrame(tick);
        };

        tick();
      }),
    { targetBehavior: behavior, required: requiredStates, timeout: timeoutMs },
  );
}

async function waitForEnemyState(
  page: import('@playwright/test').Page,
  behavior: string,
  state: string,
  timeoutMs: number,
): Promise<EnemySummary> {
  const match = await page.waitForFunction(
    ({ targetBehavior, targetState }) => {
      const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run;
      return run?.enemies.find((enemy) => enemy.behavior === targetBehavior && enemy.behaviorState === targetState)
        ?? null;
    },
    { targetBehavior: behavior, targetState: state },
    { timeout: timeoutMs },
  );

  return match.jsonValue() as Promise<EnemySummary>;
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
