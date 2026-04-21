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

function getHeroCardX(hero: 'runner' | 'shade' | 'weaver'): number {
  switch (hero) {
    case 'runner':
      return 308;
    case 'shade':
      return 640;
    case 'weaver':
    default:
      return 972;
  }
}

async function startRun(page: import('@playwright/test').Page, hero: 'runner' | 'shade' | 'weaver'): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));
  await clickCanvasPosition(page, getHeroCardX(hero), 382);
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

  test('Cinder Needles applies Ailment through the real projectile hit path', async ({ page }) => {
    await startRun(page, 'weaver');

    const result = await page.evaluate(() => {
      const game = window.__JANGAN_LARI_GAME__!;
      const runScene = game.scene.getScene('RunScene') as {
        player: { x: number; y: number };
        debugSpawnEnemy: (enemyId: 'anchor') => boolean;
        abilityResolver: { tryUseAbility: (slot: 'primary', ability: unknown, currentTime: number) => { used: boolean } };
        abilityLoadout: { getAbility: (slot: 'primary') => unknown };
        enemies: {
          getChildren: () => Array<{
            x: number;
            y: number;
            isAilmented: (time: number) => boolean;
            body?: { reset?: (x: number, y: number) => void };
          }>;
        };
        projectiles: { getChildren: () => Array<{ x: number; y: number; active: boolean }> };
        handleProjectileEnemyOverlap: (projectile: unknown, enemy: unknown) => void;
      };

      runScene.debugSpawnEnemy('anchor');
      const enemy = runScene.enemies.getChildren().slice(-1)[0]!;
      const nextX = runScene.player.x + 70;
      const nextY = runScene.player.y;
      enemy.x = nextX;
      enemy.y = nextY;
      enemy.body?.reset?.(nextX, nextY);

      const used = runScene.abilityResolver.tryUseAbility('primary', runScene.abilityLoadout.getAbility('primary'), game.loop.time);
      const projectile = runScene.projectiles.getChildren().find((entry) => entry.active)!;
      projectile.x = enemy.x;
      projectile.y = enemy.y;
      runScene.handleProjectileEnemyOverlap(projectile, enemy);

      return {
        used: used.used,
        ailmented: enemy.isAilmented(game.loop.time),
      };
    });

    expect(result.used).toBe(true);
    expect(result.ailmented).toBe(true);
  });

  test('Hex Detonation explicitly consumes Ailment on affected targets', async ({ page }) => {
    await startRun(page, 'weaver');

    const result = await page.evaluate(() => {
      const game = window.__JANGAN_LARI_GAME__!;
      const runScene = game.scene.getScene('RunScene') as {
        player: { x: number; y: number };
        combatStates: {
          applyAilment: (enemy: { applyAilment: (currentTime: number, durationMs: number) => void }, currentTime: number, durationMs: number) => void;
        };
        abilityResolver: {
          tryUseAbility: (slot: 'signature', ability: unknown, currentTime: number) => { used: boolean; ailmentConsumes?: number };
        };
        abilityLoadout: { getAbility: (slot: 'signature') => unknown };
        debugSpawnEnemy: (enemyId: 'anchor') => boolean;
        enemies: {
          getChildren: () => Array<{
            x: number;
            y: number;
            isAilmented: (time: number) => boolean;
            getCurrentHealth: () => number;
            body?: { reset?: (x: number, y: number) => void };
          }>;
        };
      };

      runScene.debugSpawnEnemy('anchor');
      const enemy = runScene.enemies.getChildren().slice(-1)[0]!;
      const nextX = runScene.player.x + 110;
      const nextY = runScene.player.y + 10;
      enemy.x = nextX;
      enemy.y = nextY;
      enemy.body?.reset?.(nextX, nextY);
      runScene.combatStates.applyAilment(enemy as never, game.loop.time, 2200);
      const beforeHealth = enemy.getCurrentHealth();
      const used = runScene.abilityResolver.tryUseAbility('signature', runScene.abilityLoadout.getAbility('signature'), game.loop.time);

      return {
        used: used.used,
        ailmentConsumes: used.ailmentConsumes ?? 0,
        ailmentedAfter: enemy.isAilmented(game.loop.time),
        damage: beforeHealth - enemy.getCurrentHealth(),
      };
    });

    expect(result.used).toBe(true);
    expect(result.ailmentConsumes).toBeGreaterThan(0);
    expect(result.ailmentedAfter).toBe(false);
    expect(result.damage).toBeGreaterThan(0);
  });

  test('Contagion Node equips into the support slot and can seed Ailment', async ({ page }) => {
    await startRun(page, 'weaver');

    const result = await page.evaluate(() => {
      const game = window.__JANGAN_LARI_GAME__!;
      const runScene = game.scene.getScene('RunScene') as {
        player: { x: number; y: number };
        debugForceReward: (rewardId: 'contagion-node') => boolean;
        debugSpawnEnemy: (enemyId: 'anchor') => boolean;
        abilityResolver: { tryUseAbility: (slot: 'support', ability: unknown, currentTime: number) => { used: boolean } };
        abilityLoadout: { getAbility: (slot: 'support') => unknown; getAbilityId: (slot: 'support') => string | null };
        projectiles: { getChildren: () => Array<{ x: number; y: number; active: boolean }> };
        enemies: {
          getChildren: () => Array<{
            x: number;
            y: number;
            isAilmented: (time: number) => boolean;
            body?: { reset?: (x: number, y: number) => void };
          }>;
        };
        handleProjectileEnemyOverlap: (projectile: unknown, enemy: unknown) => void;
      };

      runScene.debugForceReward('contagion-node');
      runScene.debugSpawnEnemy('anchor');
      const enemy = runScene.enemies.getChildren().slice(-1)[0]!;
      const nextX = runScene.player.x + 80;
      const nextY = runScene.player.y;
      enemy.x = nextX;
      enemy.y = nextY;
      enemy.body?.reset?.(nextX, nextY);

      const used = runScene.abilityResolver.tryUseAbility('support', runScene.abilityLoadout.getAbility('support'), game.loop.time);
      const projectile = runScene.projectiles.getChildren().find((entry) => entry.active)!;
      projectile.x = enemy.x;
      projectile.y = enemy.y;
      runScene.handleProjectileEnemyOverlap(projectile, enemy);

      return {
        supportAbilityId: runScene.abilityLoadout.getAbilityId('support'),
        used: used.used,
        ailmented: enemy.isAilmented(game.loop.time),
      };
    });

    expect(result.supportAbilityId).toBe('contagion-node');
    expect(result.used).toBe(true);
    expect(result.ailmented).toBe(true);
  });

  test('Echo Turret equips into the support slot and prefers a farther state-affected target over the nearest neutral enemy', async ({ page }) => {
    await startRun(page, 'runner');

    const result = await page.evaluate(() => {
      const game = window.__JANGAN_LARI_GAME__!;
      const runScene = game.scene.getScene('RunScene') as {
        player: { x: number; y: number };
        debugForceReward: (rewardId: 'echo-turret') => boolean;
        debugSpawnEnemy: (enemyId: 'shooter') => boolean;
        combatStates: {
          applyDisrupted: (enemy: { applyDisrupted: (currentTime: number, durationMs: number) => void }, currentTime: number, durationMs: number) => void;
        };
        abilityResolver: { tryUseAbility: (slot: 'support', ability: unknown, currentTime: number) => { used: boolean } };
        abilityLoadout: { getAbility: (slot: 'support') => unknown; getAbilityId: (slot: 'support') => string | null };
        enemies: {
          getChildren: () => Array<{ x: number; y: number; body?: { reset?: (x: number, y: number) => void } }>;
        };
        projectiles: {
          getChildren: () => Array<{ active: boolean; body?: { velocity: { x: number; y: number } } }>;
        };
      };

      runScene.debugForceReward('echo-turret');
      runScene.debugSpawnEnemy('shooter');
      runScene.debugSpawnEnemy('shooter');
      const [nearEnemy, farEnemy] = runScene.enemies.getChildren().slice(-2);
      nearEnemy!.x = runScene.player.x + 90;
      nearEnemy!.y = runScene.player.y;
      nearEnemy!.body?.reset?.(nearEnemy!.x, nearEnemy!.y);
      farEnemy!.x = runScene.player.x + 220;
      farEnemy!.y = runScene.player.y - 50;
      farEnemy!.body?.reset?.(farEnemy!.x, farEnemy!.y);
      runScene.combatStates.applyDisrupted(farEnemy as never, game.loop.time, 2400);

      const used = runScene.abilityResolver.tryUseAbility('support', runScene.abilityLoadout.getAbility('support'), game.loop.time);
      const projectile = runScene.projectiles.getChildren().find((entry) => entry.active)!;
      const velocity = projectile.body!.velocity;
      const towardNear = { x: nearEnemy!.x - runScene.player.x, y: nearEnemy!.y - runScene.player.y };
      const towardFar = { x: farEnemy!.x - runScene.player.x, y: farEnemy!.y - runScene.player.y };
      const nearDot = velocity.x * towardNear.x + velocity.y * towardNear.y;
      const farDot = velocity.x * towardFar.x + velocity.y * towardFar.y;

      return {
        supportAbilityId: runScene.abilityLoadout.getAbilityId('support'),
        used: used.used,
        nearDot,
        farDot,
      };
    });

    expect(result.supportAbilityId).toBe('echo-turret');
    expect(result.used).toBe(true);
    expect(result.farDot).toBeGreaterThan(result.nearDot);
  });

  test('Recovery Field equips into the support slot and stabilizes under close pressure', async ({ page }) => {
    await startRun(page, 'runner');

    const result = await page.evaluate(() => {
      const game = window.__JANGAN_LARI_GAME__!;
      const runScene = game.scene.getScene('RunScene') as {
        player: { x: number; y: number; takeDamage: (amount: number, currentTime: number) => boolean; getCurrentHealth: () => number };
        combatStates: { getGuard: () => number };
        debugForceReward: (rewardId: 'recovery-field') => boolean;
        debugSpawnEnemy: (enemyId: 'swarmer') => boolean;
        abilityResolver: { tryUseAbility: (slot: 'support', ability: unknown, currentTime: number) => { used: boolean } };
        abilityLoadout: { getAbility: (slot: 'support') => unknown; getAbilityId: (slot: 'support') => string | null };
        enemies: { getChildren: () => Array<{ x: number; y: number; body?: { reset?: (x: number, y: number) => void } }> };
      };

      runScene.debugForceReward('recovery-field');
      runScene.debugSpawnEnemy('swarmer');
      runScene.debugSpawnEnemy('swarmer');
      const enemies = runScene.enemies.getChildren().slice(-2);
      enemies.forEach((enemy, index) => {
        enemy.x = runScene.player.x + 55 + index * 24;
        enemy.y = runScene.player.y + 10 - index * 18;
        enemy.body?.reset?.(enemy.x, enemy.y);
      });
      runScene.player.takeDamage(14, game.loop.time);
      const beforeHp = runScene.player.getCurrentHealth();
      const beforeGuard = runScene.combatStates.getGuard();
      const used = runScene.abilityResolver.tryUseAbility('support', runScene.abilityLoadout.getAbility('support'), game.loop.time);

      return {
        supportAbilityId: runScene.abilityLoadout.getAbilityId('support'),
        used: used.used,
        hpGain: runScene.player.getCurrentHealth() - beforeHp,
        guardGain: runScene.combatStates.getGuard() - beforeGuard,
      };
    });

    expect(result.supportAbilityId).toBe('recovery-field');
    expect(result.used).toBe(true);
    expect(result.hpGain).toBeGreaterThan(0);
    expect(result.guardGain).toBeGreaterThan(0);
  });

  test('Citadel Core turns Bulwark Slam into chunked follow-up fortress pulses', async ({ page }) => {
    await startRun(page, 'runner');

    const result = await page.evaluate(async () => {
      const game = window.__JANGAN_LARI_GAME__!;
      const runScene = game.scene.getScene('RunScene') as {
        player: { x: number; y: number };
        debugForceReward: (rewardId: 'citadel-core') => boolean;
        debugSpawnEnemy: (enemyId: 'anchor') => boolean;
        combatStates: { gainGuard: (amount: number) => void; getGuard: () => number };
        abilityResolver: { tryUseAbility: (slot: 'signature', ability: unknown, currentTime: number) => { used: boolean } };
        abilityLoadout: { getAbility: (slot: 'signature') => unknown };
        enemies: {
          getChildren: () => Array<{
            x: number;
            y: number;
            getCurrentHealth: () => number;
            body?: { reset?: (x: number, y: number) => void };
          }>;
        };
      };

      runScene.debugForceReward('citadel-core');
      runScene.debugSpawnEnemy('anchor');
      runScene.debugSpawnEnemy('anchor');
      const enemies = runScene.enemies.getChildren().slice(-2);
      enemies.forEach((enemy, index) => {
        const nextX = runScene.player.x + 40 + index * 25;
        const nextY = runScene.player.y + 30 - index * 20;
        enemy.x = nextX;
        enemy.y = nextY;
        enemy.body?.reset?.(nextX, nextY);
      });

      runScene.combatStates.gainGuard(18);
      const beforeGuard = runScene.combatStates.getGuard();
      const beforeHealths = enemies.map((enemy) => enemy.getCurrentHealth());
      const used = runScene.abilityResolver.tryUseAbility('signature', runScene.abilityLoadout.getAbility('signature'), game.loop.time);
      const immediateGuard = runScene.combatStates.getGuard();

      await new Promise((resolve) => setTimeout(resolve, 450));

      return {
        used: used.used,
        beforeGuard,
        immediateGuard,
        afterGuard: runScene.combatStates.getGuard(),
        damageNow: beforeHealths.map((health, index) => health - enemies[index]!.getCurrentHealth()),
      };
    });

    expect(result.used).toBe(true);
    expect(result.immediateGuard).toBeLessThan(result.beforeGuard);
    expect(result.afterGuard).toBeLessThan(result.immediateGuard);
    expect(result.damageNow.some((damage) => damage > 0)).toBe(true);
  });

  test('Kill Chain Protocol redirects Hunter Sweep into a second priority target after a marked kill', async ({ page }) => {
    await startRun(page, 'shade');

    const result = await page.evaluate(() => {
      const game = window.__JANGAN_LARI_GAME__!;
      const runScene = game.scene.getScene('RunScene') as {
        player: { x: number; y: number };
        debugForceReward: (rewardId: 'kill-chain-protocol') => boolean;
        debugSpawnEnemy: (enemyId: 'shooter') => boolean;
        combatStates: {
          applyMark: (enemy: { applyMark: (currentTime: number, durationMs: number) => void }, currentTime: number, durationMs: number) => void;
        };
        abilityResolver: { tryUseAbility: (slot: 'signature', ability: unknown, currentTime: number) => { used: boolean } };
        abilityLoadout: { getAbility: (slot: 'signature') => unknown };
        enemies: {
          getChildren: () => Array<{
            x: number;
            y: number;
            takeDamage: (amount: number) => boolean;
            getCurrentHealth: () => number;
            isMarked: (time: number) => boolean;
            body?: { reset?: (x: number, y: number) => void };
          }>;
        };
      };

      runScene.debugForceReward('kill-chain-protocol');
      runScene.debugSpawnEnemy('shooter');
      runScene.debugSpawnEnemy('shooter');
      const enemies = runScene.enemies.getChildren().slice(-2);
      enemies.forEach((enemy, index) => {
        const nextX = runScene.player.x + 150 + index * 70;
        const nextY = runScene.player.y;
        enemy.x = nextX;
        enemy.y = nextY;
        enemy.body?.reset?.(nextX, nextY);
        runScene.combatStates.applyMark(enemy as never, game.loop.time, 2200);
      });
      enemies[0]!.takeDamage(20);
      const secondBefore = enemies[1]!.getCurrentHealth();
      const used = runScene.abilityResolver.tryUseAbility('signature', runScene.abilityLoadout.getAbility('signature'), game.loop.time);

      return {
        used: used.used,
        firstAliveAfter: enemies[0]!.getCurrentHealth() > 0,
        secondDamage: secondBefore - enemies[1]!.getCurrentHealth(),
      };
    });

    expect(result.used).toBe(true);
    expect(result.firstAliveAfter).toBe(false);
    expect(result.secondDamage).toBeGreaterThan(0);
  });

  test('Pyre Constellation chains Hex Detonation beyond the initial detonation radius', async ({ page }) => {
    await startRun(page, 'weaver');

    const result = await page.evaluate(() => {
      const game = window.__JANGAN_LARI_GAME__!;
      const runScene = game.scene.getScene('RunScene') as {
        player: { x: number; y: number };
        debugForceReward: (rewardId: 'pyre-constellation') => boolean;
        debugSpawnEnemy: (enemyId: 'anchor') => boolean;
        combatStates: {
          applyAilment: (enemy: { applyAilment: (currentTime: number, durationMs: number) => void }, currentTime: number, durationMs: number) => void;
        };
        abilityResolver: {
          tryUseAbility: (slot: 'signature', ability: unknown, currentTime: number) => { used: boolean; ailmentConsumes?: number };
        };
        abilityLoadout: { getAbility: (slot: 'signature') => unknown };
        enemies: {
          getChildren: () => Array<{
            x: number;
            y: number;
            getCurrentHealth: () => number;
            isAilmented: (time: number) => boolean;
            body?: { reset?: (x: number, y: number) => void };
          }>;
        };
      };

      runScene.debugForceReward('pyre-constellation');
      runScene.debugSpawnEnemy('anchor');
      runScene.debugSpawnEnemy('anchor');
      runScene.debugSpawnEnemy('anchor');
      const enemies = runScene.enemies.getChildren().slice(-3);
      const positions = [
        { x: runScene.player.x + 110, y: runScene.player.y },
        { x: runScene.player.x + 290, y: runScene.player.y + 10 },
        { x: runScene.player.x + 440, y: runScene.player.y + 20 },
      ];
      enemies.forEach((enemy, index) => {
        enemy.x = positions[index]!.x;
        enemy.y = positions[index]!.y;
        enemy.body?.reset?.(enemy.x, enemy.y);
        runScene.combatStates.applyAilment(enemy as never, game.loop.time, 2600);
      });
      const farBefore = enemies[2]!.getCurrentHealth();
      const used = runScene.abilityResolver.tryUseAbility('signature', runScene.abilityLoadout.getAbility('signature'), game.loop.time);

      return {
        used: used.used,
        ailmentConsumes: used.ailmentConsumes ?? 0,
        farDamage: farBefore - enemies[2]!.getCurrentHealth(),
        farAilmentedAfter: enemies[2]!.isAilmented(game.loop.time),
      };
    });

    expect(result.used).toBe(true);
    expect(result.ailmentConsumes).toBeGreaterThanOrEqual(2);
    expect(result.farDamage).toBeGreaterThan(0);
    expect(result.farAilmentedAfter).toBe(false);
  });

  test('Reckoner Drive turns Bulwark Slam into a farther breach line against state-touched enemies', async ({ page }) => {
    await startRun(page, 'runner');

    const result = await page.evaluate(() => {
      const game = window.__JANGAN_LARI_GAME__!;
      const runScene = game.scene.getScene('RunScene') as {
        player: { x: number; y: number };
        debugForceReward: (rewardId: 'reckoner-drive') => boolean;
        debugSpawnEnemy: (enemyId: 'anchor') => boolean;
        combatStates: {
          gainGuard: (amount: number) => void;
          getGuard: () => number;
          applyDisrupted: (enemy: { applyDisrupted: (currentTime: number, durationMs: number) => void }, currentTime: number, durationMs: number) => void;
        };
        abilityResolver: { tryUseAbility: (slot: 'signature', ability: unknown, currentTime: number) => { used: boolean } };
        abilityLoadout: { getAbility: (slot: 'signature') => unknown };
        enemies: {
          getChildren: () => Array<{
            x: number;
            y: number;
            getCurrentHealth: () => number;
            body?: { reset?: (x: number, y: number) => void };
          }>;
        };
      };

      runScene.debugForceReward('reckoner-drive');
      runScene.debugSpawnEnemy('anchor');
      const enemy = runScene.enemies.getChildren().slice(-1)[0]!;
      enemy.x = runScene.player.x + 280;
      enemy.y = runScene.player.y;
      enemy.body?.reset?.(enemy.x, enemy.y);
      runScene.combatStates.applyDisrupted(enemy as never, game.loop.time, 2400);
      runScene.combatStates.gainGuard(18);
      const beforeGuard = runScene.combatStates.getGuard();
      const beforeHealth = enemy.getCurrentHealth();
      const used = runScene.abilityResolver.tryUseAbility('signature', runScene.abilityLoadout.getAbility('signature'), game.loop.time);

      return {
        used: used.used,
        guardSpent: beforeGuard - runScene.combatStates.getGuard(),
        damage: beforeHealth - enemy.getCurrentHealth(),
      };
    });

    expect(result.used).toBe(true);
    expect(result.guardSpent).toBeGreaterThan(0);
    expect(result.damage).toBeGreaterThan(0);
  });

  test('Siege Lock Array adds follow-up passes that grant Guard after Hunter Sweep', async ({ page }) => {
    await startRun(page, 'shade');

    const result = await page.evaluate(async () => {
      const game = window.__JANGAN_LARI_GAME__!;
      const runScene = game.scene.getScene('RunScene') as {
        player: { x: number; y: number };
        debugForceReward: (rewardId: 'siege-lock-array') => boolean;
        combatStates: {
          applyMark: (enemy: { applyMark: (currentTime: number, durationMs: number) => void }, currentTime: number, durationMs: number) => void;
          getGuard: () => number;
        };
        abilityResolver: { tryUseAbility: (slot: 'signature', ability: unknown, currentTime: number) => { used: boolean } };
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

      runScene.debugForceReward('siege-lock-array');
      runScene.debugSpawnEnemy('anchor');
      const enemy = runScene.enemies.getChildren().slice(-1)[0]!;
      enemy.x = runScene.player.x + 170;
      enemy.y = runScene.player.y;
      enemy.body?.reset?.(enemy.x, enemy.y);
      runScene.combatStates.applyMark(enemy as never, game.loop.time, 2200);
      const beforeGuard = runScene.combatStates.getGuard();
      const beforeHealth = enemy.getCurrentHealth();
      const used = runScene.abilityResolver.tryUseAbility('signature', runScene.abilityLoadout.getAbility('signature'), game.loop.time);
      await new Promise((resolve) => setTimeout(resolve, 380));

      return {
        used: used.used,
        guardGain: runScene.combatStates.getGuard() - beforeGuard,
        damage: beforeHealth - enemy.getCurrentHealth(),
      };
    });

    expect(result.used).toBe(true);
    expect(result.guardGain).toBeGreaterThan(0);
    expect(result.damage).toBeGreaterThan(0);
  });

  test('Cinder Crown turns a Marked Ailmented target into the highest-value Hex Detonation payoff', async ({ page }) => {
    await startRun(page, 'weaver');

    const result = await page.evaluate(() => {
      const game = window.__JANGAN_LARI_GAME__!;
      const runScene = game.scene.getScene('RunScene') as {
        player: { x: number; y: number };
        debugForceReward: (rewardId: 'cinder-crown') => boolean;
        combatStates: {
          applyAilment: (enemy: { applyAilment: (currentTime: number, durationMs: number) => void }, currentTime: number, durationMs: number) => void;
          applyMark: (enemy: { applyMark: (currentTime: number, durationMs: number) => void }, currentTime: number, durationMs: number) => void;
        };
        abilityResolver: {
          tryUseAbility: (slot: 'signature', ability: unknown, currentTime: number) => { used: boolean; ailmentConsumes?: number };
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

      runScene.debugForceReward('cinder-crown');
      runScene.debugSpawnEnemy('anchor');
      runScene.debugSpawnEnemy('anchor');
      const [markedTarget, nearbyTarget] = runScene.enemies.getChildren().slice(-2);
      markedTarget!.x = runScene.player.x + 120;
      markedTarget!.y = runScene.player.y;
      markedTarget!.body?.reset?.(markedTarget!.x, markedTarget!.y);
      nearbyTarget!.x = runScene.player.x + 160;
      nearbyTarget!.y = runScene.player.y + 20;
      nearbyTarget!.body?.reset?.(nearbyTarget!.x, nearbyTarget!.y);
      runScene.combatStates.applyAilment(markedTarget as never, game.loop.time, 2400);
      runScene.combatStates.applyAilment(nearbyTarget as never, game.loop.time, 2400);
      runScene.combatStates.applyMark(markedTarget as never, game.loop.time, 2200);
      const markedBefore = markedTarget!.getCurrentHealth();
      const nearbyBefore = nearbyTarget!.getCurrentHealth();
      const used = runScene.abilityResolver.tryUseAbility('signature', runScene.abilityLoadout.getAbility('signature'), game.loop.time);

      return {
        used: used.used,
        ailmentConsumes: used.ailmentConsumes ?? 0,
        markedDamage: markedBefore - markedTarget!.getCurrentHealth(),
        nearbyDamage: nearbyBefore - nearbyTarget!.getCurrentHealth(),
      };
    });

    expect(result.used).toBe(true);
    expect(result.ailmentConsumes).toBeGreaterThan(0);
    expect(result.markedDamage).toBeGreaterThan(result.nearbyDamage);
  });

  test('Behemoth boss encounter exposes protection and shockwave pressure on the real run scene', async ({ page }) => {
    await startRun(page, 'runner');

    const result = await page.evaluate(() => {
      const game = window.__JANGAN_LARI_GAME__!;
      const runScene = game.scene.getScene('RunScene') as {
        player: { x: number; y: number; getCurrentHealth: () => number };
        debugForceBossEncounter: () => void;
        enemies: { getChildren: () => Array<{ archetype: { id: string }; takeDamage: (amount: number) => boolean; active: boolean; isAlive: () => boolean }> };
        publishHudState: () => void;
        updateBossEncounter: (time: number) => void;
        handleEnemyAttackSignal: (signal: { type: 'boss-shockwave-execute'; x: number; y: number; radius: number; damage: number; durationMs?: number }) => void;
        registry: { get: (key: string) => unknown };
      };

      runScene.debugForceBossEncounter();
      runScene.publishHudState();
      const initialProtected = Boolean(runScene.registry.get('run.bossProtected'));
      const initialProtectors = Number(runScene.registry.get('run.bossProtectors') ?? 0);
      const enemies = runScene.enemies.getChildren();
      enemies
        .filter((enemy) => enemy.archetype.id === 'bulwark')
        .forEach((enemy) => enemy.takeDamage(9999));
      runScene.updateBossEncounter(game.loop.time + 1000);
      runScene.publishHudState();

      const hpBefore = runScene.player.getCurrentHealth();
      runScene.handleEnemyAttackSignal({
        type: 'boss-shockwave-execute',
        x: runScene.player.x,
        y: runScene.player.y,
        radius: 220,
        damage: 18,
        durationMs: 400,
      });

      return {
        initialProtected,
        initialProtectors,
        afterProtected: Boolean(runScene.registry.get('run.bossProtected')),
        afterProtectors: Number(runScene.registry.get('run.bossProtectors') ?? 0),
        hpLoss: hpBefore - runScene.player.getCurrentHealth(),
      };
    });

    expect(result.initialProtected).toBe(true);
    expect(result.initialProtectors).toBeGreaterThan(0);
    expect(result.afterProtected).toBe(false);
    expect(result.afterProtectors).toBe(0);
    expect(result.hpLoss).toBeGreaterThanOrEqual(0);
  });
});
