import { expect, test } from '@playwright/test';

type RoyaleSnapshot = {
  active: boolean;
  elapsedMs: number;
  playerAlive: boolean;
  endActive: boolean;
  victory: boolean;
  endTitle: string;
  survivors: number;
  rank: number;
  botCount: number;
  aliveBotCount: number;
  lootCount: number;
  currentWeaponName: string;
  zone: {
    radius: number;
    nextRadius: number;
    status: string;
  };
};

type MenuSnapshot = {
  gameWidth: number;
  gameHeight: number;
  royaleButton: { x: number; y: number };
};

test.describe('royale prototype smoke', () => {
  test('starts from menu, plays core prototype paths, ends, and restarts', async ({ page }) => {
    const runtimeErrors = trackRuntimeErrors(page);

    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));

    const menu = await getMenuSnapshot(page);
    await clickCanvasPoint(page, menu.royaleButton.x, menu.royaleButton.y);
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('RoyaleScene')));

    let royale = await getRoyaleSnapshot(page);
    expect(royale.active).toBe(true);
    expect(royale.playerAlive).toBe(true);
    expect(royale.botCount).toBeGreaterThanOrEqual(12);
    expect(royale.botCount).toBeLessThanOrEqual(20);
    expect(royale.aliveBotCount).toBe(royale.botCount);
    expect(royale.lootCount).toBeGreaterThanOrEqual(1);
    expect(royale.currentWeaponName).toBe('Arc Bolt');
    expect(royale.zone.radius).toBeGreaterThan(royale.zone.nextRadius);

    await page.waitForFunction(() => Number(window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().royale?.elapsedMs ?? 0) > 300);
    const collected = await page.evaluate(() => {
      const royaleScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RoyaleScene') as {
        debugCollectNearestLoot?: () => boolean;
      };
      return royaleScene.debugCollectNearestLoot?.() ?? false;
    });
    expect(collected).toBe(true);

    royale = await getRoyaleSnapshot(page);
    expect(royale.currentWeaponName).not.toBe('Arc Bolt');
    expect(royale.lootCount).toBeGreaterThanOrEqual(0);

    const damaged = await page.evaluate(() => {
      const royaleScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RoyaleScene') as {
        debugDamageFirstBot?: (amount?: number) => boolean;
      };
      return royaleScene.debugDamageFirstBot?.() ?? false;
    });
    expect(damaged).toBe(true);

    await page.waitForFunction(() => {
      const snapshot = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().royale;
      return Boolean(snapshot && snapshot.aliveBotCount < snapshot.botCount);
    });

    await page.evaluate(() => {
      const royaleScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RoyaleScene') as {
        debugEndMatch?: (victory: boolean) => void;
      };
      royaleScene.debugEndMatch?.(false);
    });
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().royale?.endActive));

    royale = await getRoyaleSnapshot(page);
    expect(royale.endActive).toBe(true);
    expect(royale.victory).toBe(false);
    expect(royale.endTitle).toBe('Defeat');

    await clickCanvasPoint(page, menu.gameWidth / 2, menu.gameHeight / 2 + 92);
    await page.waitForFunction(() => {
      const snapshot = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().royale;
      return Boolean(snapshot && snapshot.active && !snapshot.endActive && snapshot.playerAlive && snapshot.elapsedMs < 1500);
    });

    const victoryForced = await page.evaluate(() => {
      const royaleScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RoyaleScene') as {
        debugEliminateRemainingBots?: () => boolean;
      };
      return royaleScene.debugEliminateRemainingBots?.() ?? false;
    });
    expect(victoryForced).toBe(true);
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().royale?.victory));

    royale = await getRoyaleSnapshot(page);
    expect(royale.endActive).toBe(true);
    expect(royale.victory).toBe(true);
    expect(royale.endTitle).toBe('Victory');
    expect(runtimeErrors).toEqual([]);
  });
});

async function getMenuSnapshot(page: import('@playwright/test').Page): Promise<MenuSnapshot> {
  return page.evaluate(() => {
    const menuScene = window.__JANGAN_LARI_GAME__?.scene.getScene('MenuScene') as { getMenuSnapshot?: () => MenuSnapshot } | undefined;
    const snapshot = menuScene?.getMenuSnapshot?.();
    if (!snapshot) {
      throw new Error('Menu snapshot is not available.');
    }

    return snapshot;
  });
}

async function getRoyaleSnapshot(page: import('@playwright/test').Page): Promise<RoyaleSnapshot> {
  return page.evaluate(() => {
    const snapshot = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().royale as RoyaleSnapshot | null | undefined;
    if (!snapshot) {
      throw new Error('Royale snapshot is not available.');
    }

    return snapshot;
  });
}

async function clickCanvasPoint(page: import('@playwright/test').Page, gameX: number, gameY: number): Promise<void> {
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error('Game canvas is not available.');
  }

  const virtualSize = await page.evaluate(() => ({
    width: Number(window.__JANGAN_LARI_GAME__?.scale.width ?? 1600),
    height: Number(window.__JANGAN_LARI_GAME__?.scale.height ?? 720),
  }));

  await canvas.click({
    position: {
      x: (gameX / virtualSize.width) * box.width,
      y: (gameY / virtualSize.height) * box.height,
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
