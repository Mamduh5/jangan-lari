import { expect, test } from '@playwright/test';

async function clickCanvasPosition(page: import('@playwright/test').Page, x: number, y: number): Promise<void> {
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error('Game canvas is not available.');
  }

  await canvas.click({
    position: {
      x: (x / 1280) * box.width,
      y: (y / 720) * box.height,
    },
  });
}

async function startRun(page: import('@playwright/test').Page, hero: 'runner' | 'shade'): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));
  await clickCanvasPosition(page, hero === 'runner' ? 420 : 860, 382);
  await clickCanvasPosition(page, 560, 82);
  await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('RunScene')));
}

test.describe('milestone 1 signature behavior', () => {
  test('Bulwark Slam spends Guard and damages nearby enemies', async ({ page }) => {
    await startRun(page, 'runner');

    const result = await page.evaluate(() => {
      const game = window.__JANGAN_LARI_GAME__!;
      const runScene = game.scene.getScene('RunScene') as {
        player: { x: number; y: number };
        combatStates: { gainGuard: (amount: number) => void; getGuard: () => number };
        abilityResolver: {
          tryUseAbility: (slot: 'signature', ability: unknown, currentTime: number) => { used: boolean };
        };
        abilityLoadout: { getAbility: (slot: 'signature') => unknown };
        debugSpawnEnemy: (enemyId: 'anchor') => boolean;
        enemies: { getChildren: () => Array<{ x: number; y: number; active: boolean; health?: number; body?: { reset?: (x: number, y: number) => void } }> };
      };

      runScene.debugSpawnEnemy('anchor');
      const enemies = runScene.enemies.getChildren();
      const enemy = enemies[enemies.length - 1];
      const nextX = runScene.player.x + 40;
      const nextY = runScene.player.y + 20;
      enemy.x = nextX;
      enemy.y = nextY;
      enemy.body?.reset?.(nextX, nextY);
      runScene.combatStates.gainGuard(12);
      const beforeGuard = runScene.combatStates.getGuard();
      const used = runScene.abilityResolver.tryUseAbility('signature', runScene.abilityLoadout.getAbility('signature'), game.loop.time);
      return {
        beforeGuard,
        afterGuard: runScene.combatStates.getGuard(),
        used: used.used,
      };
    });

    expect(result.used).toBe(true);
    expect(result.afterGuard).toBeLessThan(result.beforeGuard);
  });

  test('Hunter Sweep consumes Mark on a tagged target', async ({ page }) => {
    await startRun(page, 'shade');

    const result = await page.evaluate(() => {
      const game = window.__JANGAN_LARI_GAME__!;
      const runScene = game.scene.getScene('RunScene') as {
        player: { x: number; y: number };
        combatStates: {
          applyMark: (enemy: { applyMark: (currentTime: number, durationMs: number) => void }, currentTime: number, durationMs: number) => void;
        };
        abilityResolver: {
          tryUseAbility: (
            slot: 'signature',
            ability: unknown,
            currentTime: number,
          ) => { used: boolean; signatureHit?: { consumedMark: boolean } };
        };
        abilityLoadout: { getAbility: (slot: 'signature') => unknown };
        debugSpawnEnemy: (enemyId: 'anchor') => boolean;
        enemies: { getChildren: () => Array<{ x: number; y: number; isMarked: (time: number) => boolean; body?: { reset?: (x: number, y: number) => void } }> };
      };

      runScene.debugSpawnEnemy('shooter');
      const enemies = runScene.enemies.getChildren();
      const enemy = enemies[enemies.length - 1];
      const nextX = runScene.player.x + 140;
      const nextY = runScene.player.y;
      enemy.x = nextX;
      enemy.y = nextY;
      enemy.body?.reset?.(nextX, nextY);
      runScene.combatStates.applyMark(enemy as never, game.loop.time, 2000);
      const markedBefore = enemy.isMarked(game.loop.time);
      const result = runScene.abilityResolver.tryUseAbility('signature', runScene.abilityLoadout.getAbility('signature'), game.loop.time);
      return {
        markedBefore,
        consumedMark: Boolean(result.signatureHit?.consumedMark),
        markedAfter: enemy.isMarked(game.loop.time),
      };
    });

    expect(result.markedBefore).toBe(true);
    expect(result.consumedMark).toBe(true);
    expect(result.markedAfter).toBe(false);
  });

  test('Shock Lattice equips into the support slot and disrupts nearby enemies', async ({ page }) => {
    await startRun(page, 'runner');

    const result = await page.evaluate(() => {
      const game = window.__JANGAN_LARI_GAME__!;
      const runScene = game.scene.getScene('RunScene') as {
        player: { x: number; y: number };
        debugForceReward: (rewardId: 'shock-lattice') => boolean;
        debugSpawnEnemy: (enemyId: 'shooter') => boolean;
        enemies: { getChildren: () => Array<{ x: number; y: number; isDisrupted: (time: number) => boolean; body?: { reset?: (x: number, y: number) => void } }> };
        abilityResolver: {
          tryUseAbility: (slot: 'support', ability: unknown, currentTime: number) => { used: boolean };
        };
        abilityLoadout: { getAbility: (slot: 'support') => unknown; getAbilityId: (slot: 'support') => string | null };
      };

      runScene.debugForceReward('shock-lattice');
      runScene.debugSpawnEnemy('shooter');
      const enemies = runScene.enemies.getChildren();
      const enemy = enemies[enemies.length - 1]!;
      const nextX = runScene.player.x + 60;
      const nextY = runScene.player.y + 20;
      enemy.x = nextX;
      enemy.y = nextY;
      enemy.body?.reset?.(nextX, nextY);
      const used = runScene.abilityResolver.tryUseAbility('support', runScene.abilityLoadout.getAbility('support'), game.loop.time);

      return {
        supportAbilityId: runScene.abilityLoadout.getAbilityId('support'),
        used: used.used,
        disrupted: enemy.isDisrupted(game.loop.time),
      };
    });

    expect(result.supportAbilityId).toBe('shock-lattice');
    expect(result.used).toBe(true);
    expect(result.disrupted).toBe(true);
  });

  test('Bulwark Slam hits disrupted enemies harder than normal targets', async ({ page }) => {
    await startRun(page, 'runner');

    const result = await page.evaluate(() => {
      const game = window.__JANGAN_LARI_GAME__!;
      const runScene = game.scene.getScene('RunScene') as {
        player: { x: number; y: number };
        combatStates: {
          gainGuard: (amount: number) => void;
          applyDisrupted: (enemy: { applyDisrupted: (currentTime: number, durationMs: number) => void }, currentTime: number, durationMs: number) => void;
        };
        abilityResolver: {
          tryUseAbility: (
            slot: 'signature',
            ability: unknown,
            currentTime: number,
          ) => { used: boolean };
        };
        abilityLoadout: { getAbility: (slot: 'signature') => unknown };
        debugSpawnEnemy: (enemyId: 'anchor') => boolean;
        enemies: {
          getChildren: () => Array<{
            x: number;
            y: number;
            getCurrentHealth: () => number;
            body?: { reset?: (x: number, y: number) => void };
          }>;
        };
      };

      const spawnAndPositionEnemy = (): { getCurrentHealth: () => number; body?: { reset?: (x: number, y: number) => void }; x: number; y: number } => {
        runScene.debugSpawnEnemy('anchor');
        const enemies = runScene.enemies.getChildren();
        const enemy = enemies[enemies.length - 1]!;
        const nextX = runScene.player.x + 40;
        const nextY = runScene.player.y + 20;
        enemy.x = nextX;
        enemy.y = nextY;
        enemy.body?.reset?.(nextX, nextY);
        return enemy;
      };

      const normalEnemy = spawnAndPositionEnemy();
      const normalBefore = normalEnemy.getCurrentHealth();
      runScene.combatStates.gainGuard(12);
      runScene.abilityResolver.tryUseAbility('signature', runScene.abilityLoadout.getAbility('signature'), game.loop.time);
      const normalDamage = normalBefore - normalEnemy.getCurrentHealth();

      const disruptedEnemy = spawnAndPositionEnemy();
      const disruptedBefore = disruptedEnemy.getCurrentHealth();
      runScene.combatStates.gainGuard(12);
      runScene.combatStates.applyDisrupted(disruptedEnemy as never, game.loop.time, 2400);
      runScene.abilityResolver.tryUseAbility('signature', runScene.abilityLoadout.getAbility('signature'), game.loop.time);
      const disruptedDamage = disruptedBefore - disruptedEnemy.getCurrentHealth();

      return { normalDamage, disruptedDamage };
    });

    expect(result.disruptedDamage).toBeGreaterThan(result.normalDamage);
  });

  test('Hunter Sweep hits marked and disrupted enemies harder than marked targets alone', async ({ page }) => {
    await startRun(page, 'shade');

    const result = await page.evaluate(() => {
      const game = window.__JANGAN_LARI_GAME__!;
      const runScene = game.scene.getScene('RunScene') as {
        player: { x: number; y: number };
        combatStates: {
          applyMark: (enemy: { applyMark: (currentTime: number, durationMs: number) => void }, currentTime: number, durationMs: number) => void;
          applyDisrupted: (enemy: { applyDisrupted: (currentTime: number, durationMs: number) => void }, currentTime: number, durationMs: number) => void;
        };
        abilityResolver: {
          tryUseAbility: (
            slot: 'signature',
            ability: unknown,
            currentTime: number,
          ) => { used: boolean };
        };
        abilityLoadout: { getAbility: (slot: 'signature') => unknown };
        debugSpawnEnemy: (enemyId: 'shooter') => boolean;
        enemies: {
          getChildren: () => Array<{
            x: number;
            y: number;
            getCurrentHealth: () => number;
            body?: { reset?: (x: number, y: number) => void };
          }>;
        };
      };

      const spawnAndPositionEnemy = (): { getCurrentHealth: () => number; body?: { reset?: (x: number, y: number) => void }; x: number; y: number } => {
        runScene.debugSpawnEnemy('anchor');
        const enemies = runScene.enemies.getChildren();
        const enemy = enemies[enemies.length - 1]!;
        const nextX = runScene.player.x + 160;
        const nextY = runScene.player.y;
        enemy.x = nextX;
        enemy.y = nextY;
        enemy.body?.reset?.(nextX, nextY);
        return enemy;
      };

      const markedEnemy = spawnAndPositionEnemy();
      const markedBefore = markedEnemy.getCurrentHealth();
      runScene.combatStates.applyMark(markedEnemy as never, game.loop.time, 2000);
      runScene.abilityResolver.tryUseAbility('signature', runScene.abilityLoadout.getAbility('signature'), game.loop.time);
      const markedDamage = markedBefore - markedEnemy.getCurrentHealth();

      const disruptedEnemy = spawnAndPositionEnemy();
      const disruptedBefore = disruptedEnemy.getCurrentHealth();
      runScene.combatStates.applyMark(disruptedEnemy as never, game.loop.time, 2000);
      runScene.combatStates.applyDisrupted(disruptedEnemy as never, game.loop.time, 2400);
      runScene.abilityResolver.tryUseAbility('signature', runScene.abilityLoadout.getAbility('signature'), game.loop.time);
      const disruptedDamage = disruptedBefore - disruptedEnemy.getCurrentHealth();

      return { markedDamage, disruptedDamage };
    });

    expect(result.disruptedDamage).toBeGreaterThan(result.markedDamage);
  });
});
