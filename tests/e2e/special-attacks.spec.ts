import { expect, test } from '@playwright/test';

async function clickStartRun(page: import('@playwright/test').Page): Promise<void> {
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error('Game canvas is not available for Start Run click.');
  }

  const virtualSize = await getVirtualSize(page);
  const startButton = await page.evaluate(() => {
    const menuScene = window.__JANGAN_LARI_GAME__?.scene.getScene('MenuScene') as
      | { getMenuSnapshot?: () => { startButton?: { x: number; y: number } } }
      | undefined;
    return menuScene?.getMenuSnapshot?.().startButton ?? null;
  });
  const startButtonX = startButton?.x ?? virtualSize.width / 2 - 250;
  const startButtonY = startButton?.y ?? 82;

  await canvas.click({
    position: {
      x: (startButtonX / virtualSize.width) * box.width,
      y: (startButtonY / virtualSize.height) * box.height,
    },
  });
}

async function getVirtualSize(page: import('@playwright/test').Page): Promise<{ width: number; height: number }> {
  return page.evaluate(() => ({
    width: Number(window.__JANGAN_LARI_GAME__?.scale.width ?? 1600),
    height: Number(window.__JANGAN_LARI_GAME__?.scale.height ?? 720),
  }));
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

type DebugHandle = {
  getGameplaySnapshot: () => {
    run: {
      enemyAttacks: Array<{
        kind: string;
        phase: string;
        warningOnly: boolean;
        damageActive: boolean;
        effectActive: boolean;
        damageRange: number;
        visualRange: number;
        damageWidth: number | null;
        visualWidth: number | null;
        damageRadius: number | null;
        visualRadius: number | null;
        remainingMs: number;
      }>;
    } | null;
  };
};

type RunSceneDebug = {
  player: { x: number; y: number };
  executeMinibossLineStrike: (
    enemy: { contactDamage: number },
    x: number,
    y: number,
    direction: { x: number; y: number },
    length: number,
  ) => void;
  debugShowMinibossLineTelegraph: () => void;
  debugShowMinibossVolleyTelegraph: () => void;
  debugExecuteMinibossVolley: () => void;
  spawnBossShockwave: (x: number, y: number, radius: number, damage: number, durationMs: number) => void;
};

async function startRun(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));
  await clickStartRun(page);
  await page.waitForFunction(() => {
    const game = window.__JANGAN_LARI_GAME__;
    return Boolean(game?.scene.isActive('RunScene') && game.scene.isActive('UIScene'));
  });
}

test.describe('miniboss skill snapshot labeling', () => {
  test('line strike telegraph is labeled warning-only in snapshot and does not damage the player', async ({ page }) => {
    const runtimeErrors = trackRuntimeErrors(page);
    await startRun(page);

    const startingHp = await page.evaluate(() => Number(window.__JANGAN_LARI_GAME__?.registry.get('run.hp') ?? -1));
    expect(startingHp).toBeGreaterThan(0);

    await page.evaluate(() => {
      const game = window.__JANGAN_LARI_GAME__!;
      const runScene = game.scene.getScene('RunScene') as unknown as { debugShowMinibossLineTelegraph: () => void };
      runScene.debugShowMinibossLineTelegraph();
    });

    await page.waitForFunction(() => {
      const debug = (window as unknown as { __JANGAN_LARI_DEBUG__?: DebugHandle }).__JANGAN_LARI_DEBUG__;
      const attacks = debug?.getGameplaySnapshot().run?.enemyAttacks ?? [];
      return attacks.some((a) => a.kind === 'miniboss-line-strike' && a.warningOnly === true && a.phase === 'warning');
    });

    const snapshot = await page.evaluate(() => {
      const debug = (window as unknown as { __JANGAN_LARI_DEBUG__?: DebugHandle }).__JANGAN_LARI_DEBUG__;
      return debug?.getGameplaySnapshot().run?.enemyAttacks ?? [];
    });

    const telegraphEntry = snapshot.find((a) => a.kind === 'miniboss-line-strike' && a.warningOnly);
    expect(telegraphEntry).toBeDefined();
    expect(telegraphEntry?.phase).toBe('warning');
    expect(telegraphEntry?.warningOnly).toBe(true);
    expect(telegraphEntry?.damageActive).toBe(false);
    expect(telegraphEntry?.effectActive).toBe(true);
    expect(telegraphEntry?.damageWidth).toBeGreaterThan(0);
    expect(telegraphEntry?.visualWidth).toBeGreaterThan(0);

    await page.waitForTimeout(500);

    const hpAfterTelegraph = await page.evaluate(() => Number(window.__JANGAN_LARI_GAME__?.registry.get('run.hp') ?? -1));
    expect(hpAfterTelegraph).toBe(startingHp);
    expect(runtimeErrors).toEqual([]);
  });

  test('volley telegraph is labeled warning-only in snapshot and does not damage the player during telegraph phase', async ({ page }) => {
    const runtimeErrors = trackRuntimeErrors(page);
    await startRun(page);

    const startingHp = await page.evaluate(() => Number(window.__JANGAN_LARI_GAME__?.registry.get('run.hp') ?? -1));
    expect(startingHp).toBeGreaterThan(0);

    await page.evaluate(() => {
      const game = window.__JANGAN_LARI_GAME__!;
      const runScene = game.scene.getScene('RunScene') as unknown as { debugShowMinibossVolleyTelegraph: () => void };
      runScene.debugShowMinibossVolleyTelegraph();
    });

    await page.waitForFunction(() => {
      const debug = (window as unknown as { __JANGAN_LARI_DEBUG__?: DebugHandle }).__JANGAN_LARI_DEBUG__;
      const attacks = debug?.getGameplaySnapshot().run?.enemyAttacks ?? [];
      return attacks.some((a) => a.kind === 'miniboss-volley' && a.warningOnly === true && a.phase === 'warning');
    });

    const snapshot = await page.evaluate(() => {
      const debug = (window as unknown as { __JANGAN_LARI_DEBUG__?: DebugHandle }).__JANGAN_LARI_DEBUG__;
      return debug?.getGameplaySnapshot().run?.enemyAttacks ?? [];
    });

    const telegraphEntry = snapshot.find((a) => a.kind === 'miniboss-volley' && a.warningOnly);
    expect(telegraphEntry).toBeDefined();
    expect(telegraphEntry?.phase).toBe('warning');
    expect(telegraphEntry?.warningOnly).toBe(true);
    expect(telegraphEntry?.damageActive).toBe(false);
    expect(telegraphEntry?.effectActive).toBe(true);
    expect(telegraphEntry?.damageRadius).toBeNull();
    expect(telegraphEntry?.visualRange).toBeGreaterThan(0);
    expect(telegraphEntry?.visualWidth).toBeGreaterThan(0);

    await page.waitForTimeout(600);

    const hpAfterTelegraph = await page.evaluate(() => Number(window.__JANGAN_LARI_GAME__?.registry.get('run.hp') ?? -1));
    expect(hpAfterTelegraph).toBe(startingHp);
    expect(runtimeErrors).toEqual([]);
  });

  test('line strike execute is labeled active in snapshot and damages the player in the lane', async ({ page }) => {
    const runtimeErrors = trackRuntimeErrors(page);
    await startRun(page);

    const startingHp = await page.evaluate(() => Number(window.__JANGAN_LARI_GAME__?.registry.get('run.hp') ?? -1));
    expect(startingHp).toBeGreaterThan(0);

    await page.evaluate(() => {
      const game = window.__JANGAN_LARI_GAME__!;
      const runScene = game.scene.getScene('RunScene') as unknown as RunSceneDebug;
      runScene.executeMinibossLineStrike({ contactDamage: 26 }, runScene.player.x - 180, runScene.player.y, { x: 1, y: 0 }, 260);
    });

    await page.waitForFunction(() => {
      const debug = (window as unknown as { __JANGAN_LARI_DEBUG__?: DebugHandle }).__JANGAN_LARI_DEBUG__;
      const attacks = debug?.getGameplaySnapshot().run?.enemyAttacks ?? [];
      return attacks.some((a) => a.kind === 'miniboss-line-strike' && a.warningOnly === false && a.phase === 'active');
    });

    const snapshotDuringActive = await page.evaluate(() => {
      const debug = (window as unknown as { __JANGAN_LARI_DEBUG__?: DebugHandle }).__JANGAN_LARI_DEBUG__;
      return debug?.getGameplaySnapshot().run?.enemyAttacks ?? [];
    });

    const activeEntry = snapshotDuringActive.find((a) => a.kind === 'miniboss-line-strike' && !a.warningOnly);
    expect(activeEntry).toBeDefined();
    expect(activeEntry?.phase).toBe('active');
    expect(activeEntry?.warningOnly).toBe(false);
    expect(activeEntry?.damageActive).toBe(true);

    await page.waitForFunction(
      (baselineHp) => Number(window.__JANGAN_LARI_GAME__?.registry.get('run.hp') ?? -1) < baselineHp,
      startingHp,
    );

    const hpAfterStrike = await page.evaluate(() => Number(window.__JANGAN_LARI_GAME__?.registry.get('run.hp') ?? -1));
    expect(hpAfterStrike).toBeLessThan(startingHp);
    expect(runtimeErrors).toEqual([]);
  });

  test('line strike with dynamic length for 500px range covers and damages the player', async ({ page }) => {
    const runtimeErrors = trackRuntimeErrors(page);
    await startRun(page);

    const startingHp = await page.evaluate(() => Number(window.__JANGAN_LARI_GAME__?.registry.get('run.hp') ?? -1));
    expect(startingHp).toBeGreaterThan(0);

    await page.evaluate(() => {
      const game = window.__JANGAN_LARI_GAME__!;
      const runScene = game.scene.getScene('RunScene') as unknown as RunSceneDebug;
      const dynamicLength = 610;
      runScene.executeMinibossLineStrike({ contactDamage: 26 }, runScene.player.x - 500, runScene.player.y, { x: 1, y: 0 }, dynamicLength);
    });

    await page.waitForFunction(() => {
      const debug = (window as unknown as { __JANGAN_LARI_DEBUG__?: DebugHandle }).__JANGAN_LARI_DEBUG__;
      const attacks = debug?.getGameplaySnapshot().run?.enemyAttacks ?? [];
      return attacks.some((a) => a.kind === 'miniboss-line-strike' && !a.warningOnly && (a.damageRange ?? 0) >= 500);
    });

    const snapshot = await page.evaluate(() => {
      const debug = (window as unknown as { __JANGAN_LARI_DEBUG__?: DebugHandle }).__JANGAN_LARI_DEBUG__;
      return debug?.getGameplaySnapshot().run?.enemyAttacks ?? [];
    });
    const activeEntry = snapshot.find((a) => a.kind === 'miniboss-line-strike' && !a.warningOnly);
    expect(activeEntry?.damageRange).toBeGreaterThanOrEqual(500);

    await page.waitForFunction(
      (baselineHp) => Number(window.__JANGAN_LARI_GAME__?.registry.get('run.hp') ?? -1) < baselineHp,
      startingHp,
    );

    const hpAfterStrike = await page.evaluate(() => Number(window.__JANGAN_LARI_GAME__?.registry.get('run.hp') ?? -1));
    expect(hpAfterStrike).toBeLessThan(startingHp);
    expect(runtimeErrors).toEqual([]);
  });

  test('line strike sideways dodge: perpendicular offset avoids damage', async ({ page }) => {
    const runtimeErrors = trackRuntimeErrors(page);
    await startRun(page);

    const startingHp = await page.evaluate(() => Number(window.__JANGAN_LARI_GAME__?.registry.get('run.hp') ?? -1));
    expect(startingHp).toBeGreaterThan(0);

    await page.evaluate(() => {
      const game = window.__JANGAN_LARI_GAME__!;
      const runScene = game.scene.getScene('RunScene') as unknown as RunSceneDebug;
      runScene.executeMinibossLineStrike(
        { contactDamage: 26 },
        runScene.player.x - 200,
        runScene.player.y + 200,
        { x: 1, y: 0 },
        500,
      );
    });

    await page.waitForTimeout(400);

    const hpAfterMiss = await page.evaluate(() => Number(window.__JANGAN_LARI_GAME__?.registry.get('run.hp') ?? -1));
    expect(hpAfterMiss).toBe(startingHp);
    expect(runtimeErrors).toEqual([]);
  });

  test('volley execute is labeled active in snapshot and damages the player inside a lane', async ({ page }) => {
    const runtimeErrors = trackRuntimeErrors(page);
    await startRun(page);

    const startingHp = await page.evaluate(() => Number(window.__JANGAN_LARI_GAME__?.registry.get('run.hp') ?? -1));
    expect(startingHp).toBeGreaterThan(0);

    await page.evaluate(() => {
      const game = window.__JANGAN_LARI_GAME__!;
      const runScene = game.scene.getScene('RunScene') as unknown as RunSceneDebug;
      runScene.debugExecuteMinibossVolley();
    });

    await page.waitForFunction(() => {
      const debug = (window as unknown as { __JANGAN_LARI_DEBUG__?: DebugHandle }).__JANGAN_LARI_DEBUG__;
      const attacks = debug?.getGameplaySnapshot().run?.enemyAttacks ?? [];
      return attacks.some((a) => a.kind === 'miniboss-volley' && a.warningOnly === false && a.phase === 'active');
    });

    const snapshotDuringActive = await page.evaluate(() => {
      const debug = (window as unknown as { __JANGAN_LARI_DEBUG__?: DebugHandle }).__JANGAN_LARI_DEBUG__;
      return debug?.getGameplaySnapshot().run?.enemyAttacks ?? [];
    });

    const activeEntry = snapshotDuringActive.find((a) => a.kind === 'miniboss-volley' && !a.warningOnly);
    expect(activeEntry).toBeDefined();
    expect(activeEntry?.phase).toBe('active');
    expect(activeEntry?.warningOnly).toBe(false);
    expect(activeEntry?.damageActive).toBe(true);
    expect(activeEntry?.damageWidth).toBeGreaterThan(0);
    expect(activeEntry?.visualRange).toBeGreaterThan(0);

    await page.waitForFunction(
      (baselineHp) => Number(window.__JANGAN_LARI_GAME__?.registry.get('run.hp') ?? -1) < baselineHp,
      startingHp,
    );

    const hpAfterVolley = await page.evaluate(() => Number(window.__JANGAN_LARI_GAME__?.registry.get('run.hp') ?? -1));
    expect(hpAfterVolley).toBeLessThan(startingHp);
    expect(hpAfterVolley).toBe(startingHp - 13);
    expect(runtimeErrors).toEqual([]);
  });

  test('shockwave execute is labeled active in snapshot and damages the player in the lane', async ({ page }) => {
    const runtimeErrors = trackRuntimeErrors(page);
    await startRun(page);

    const startingHp = await page.evaluate(() => Number(window.__JANGAN_LARI_GAME__?.registry.get('run.hp') ?? -1));
    expect(startingHp).toBeGreaterThan(0);

    await page.evaluate(() => {
      const game = window.__JANGAN_LARI_GAME__!;
      const runScene = game.scene.getScene('RunScene') as unknown as RunSceneDebug;
      runScene.spawnBossShockwave(runScene.player.x - 140, runScene.player.y, 220, 20, 180);
    });

    await page.waitForFunction(() => {
      const debug = (window as unknown as { __JANGAN_LARI_DEBUG__?: DebugHandle }).__JANGAN_LARI_DEBUG__;
      const attacks = debug?.getGameplaySnapshot().run?.enemyAttacks ?? [];
      return attacks.some((a) => a.kind === 'boss-shockwave' && a.warningOnly === false && a.phase === 'active');
    });

    const snapshotDuringActive = await page.evaluate(() => {
      const debug = (window as unknown as { __JANGAN_LARI_DEBUG__?: DebugHandle }).__JANGAN_LARI_DEBUG__;
      return debug?.getGameplaySnapshot().run?.enemyAttacks ?? [];
    });

    const activeEntry = snapshotDuringActive.find((a) => a.kind === 'boss-shockwave' && !a.warningOnly);
    expect(activeEntry).toBeDefined();
    expect(activeEntry?.phase).toBe('active');
    expect(activeEntry?.warningOnly).toBe(false);
    expect(activeEntry?.damageActive).toBe(true);

    await page.waitForFunction(
      (baselineHp) => Number(window.__JANGAN_LARI_GAME__?.registry.get('run.hp') ?? -1) < baselineHp,
      startingHp,
    );

    const hpAfterStrike = await page.evaluate(() => Number(window.__JANGAN_LARI_GAME__?.registry.get('run.hp') ?? -1));
    expect(hpAfterStrike).toBeLessThan(startingHp);
    expect(runtimeErrors).toEqual([]);
  });
});

test.describe('special attack damage', () => {
  test('miniboss line strike and boss shockwave both remove hp when their visuals intersect the player', async ({ page }) => {
    const runtimeErrors = trackRuntimeErrors(page);

    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));

    await clickStartRun(page);
    await page.waitForFunction(() => {
      const game = window.__JANGAN_LARI_GAME__;
      return Boolean(game?.scene.isActive('RunScene') && game.scene.isActive('UIScene'));
    });

    const startingHp = await page.evaluate(() => Number(window.__JANGAN_LARI_GAME__?.registry.get('run.hp') ?? -1));
    expect(startingHp).toBeGreaterThan(0);

    await page.evaluate(() => {
      const game = window.__JANGAN_LARI_GAME__!;
      const runScene = game.scene.getScene('RunScene') as {
        player: { x: number; y: number };
        executeMinibossLineStrike: (
          enemy: { contactDamage: number },
          x: number,
          y: number,
          direction: { x: number; y: number },
          length: number,
        ) => void;
      };

      runScene.executeMinibossLineStrike({ contactDamage: 26 }, runScene.player.x - 180, runScene.player.y, { x: 1, y: 0 }, 260);
    });

    await page.waitForFunction(
      (baselineHp) => Number(window.__JANGAN_LARI_GAME__?.registry.get('run.hp') ?? -1) < baselineHp,
      startingHp,
    );

    const hpAfterLineStrike = await page.evaluate(() => Number(window.__JANGAN_LARI_GAME__?.registry.get('run.hp') ?? -1));
    expect(hpAfterLineStrike).toBeLessThan(startingHp);

    await page.waitForTimeout(800);

    await page.evaluate(() => {
      const game = window.__JANGAN_LARI_GAME__!;
      const runScene = game.scene.getScene('RunScene') as {
        player: { x: number; y: number };
        spawnBossShockwave: (x: number, y: number, radius: number, damage: number, durationMs: number) => void;
      };

      runScene.spawnBossShockwave(runScene.player.x - 140, runScene.player.y, 220, 20, 180);
    });

    await page.waitForFunction(
      (baselineHp) => Number(window.__JANGAN_LARI_GAME__?.registry.get('run.hp') ?? -1) < baselineHp,
      hpAfterLineStrike,
    );

    const hpAfterShockwave = await page.evaluate(() => Number(window.__JANGAN_LARI_GAME__?.registry.get('run.hp') ?? -1));
    expect(hpAfterShockwave).toBeLessThan(hpAfterLineStrike);
    expect(runtimeErrors).toEqual([]);
  });
});
