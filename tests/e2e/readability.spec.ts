import { expect, test } from '@playwright/test';

type RunSnapshot = {
  enemies: Array<{
    id: string;
    behavior: string;
    xpValue: number;
    isRanged: boolean;
    hasRangedWeapon: boolean;
  }>;
  enemyProjectiles: Array<{
    owner: 'enemy';
    fillColor: number;
    dangerColor: number | null;
    containsRed: boolean;
  }>;
  xpGems: Array<{
    value: number;
    tier: string;
    fillColor: number;
    strokeColor: number;
    glowColor: number;
  }>;
};

test.describe('enemy and XP readability', () => {
  test('debug snapshot exposes ranged identity, red enemy projectiles, and XP gem tiers', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    const runtimeErrors = trackRuntimeErrors(page);

    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run));

    await clearEnemies(page);
    await spawnReadabilityEnemy(page, 'hexcaster');
    await page.waitForFunction(() => {
      const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run as RunSnapshot | null;
      return Boolean(run?.enemies.some((enemy) => enemy.id === 'hexcaster' && enemy.isRanged && enemy.hasRangedWeapon));
    });

    const enemyRun = await getRunSnapshot(page);
    const hexcaster = enemyRun.enemies.find((enemy) => enemy.id === 'hexcaster');
    expect(hexcaster).toMatchObject({
      behavior: 'ranged',
      isRanged: true,
      hasRangedWeapon: true,
      xpValue: 12,
    });

    await spawnEnemyProjectile(page);
    await page.waitForFunction(() => {
      const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run as RunSnapshot | null;
      return Boolean(run?.enemyProjectiles.some((projectile) => projectile.owner === 'enemy' && projectile.containsRed));
    });

    const projectileRun = await getRunSnapshot(page);
    const projectile = projectileRun.enemyProjectiles[0];
    expect(projectile.owner).toBe('enemy');
    expect(projectile.containsRed).toBe(true);
    expect(projectile.dangerColor).toBe(0xff3344);
    expect(projectile.fillColor).toBe(0xff3344);

    await dropXpGem(page, 34);
    await page.waitForFunction(() => {
      const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run as RunSnapshot | null;
      return Boolean(run?.xpGems.some((gem) => gem.value === 34 && gem.tier === 'large'));
    });

    const xpRun = await getRunSnapshot(page);
    const gem = xpRun.xpGems.find((nextGem) => nextGem.value === 34);
    expect(gem).toMatchObject({
      value: 34,
      tier: 'large',
      fillColor: 0xc084fc,
      strokeColor: 0xf3e8ff,
      glowColor: 0xa855f7,
    });

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

async function clearEnemies(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as { debugClearEnemies?: () => void } | undefined;
    runScene?.debugClearEnemies?.();
  });
}

async function spawnReadabilityEnemy(page: import('@playwright/test').Page, id: string): Promise<void> {
  await page.evaluate((archetypeId) => {
    const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as
      | { debugSpawnEnemyForReadability?: (id: string) => void }
      | undefined;
    runScene?.debugSpawnEnemyForReadability?.(archetypeId);
  }, id);
}

async function spawnEnemyProjectile(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as
      | { debugSpawnEnemyProjectile?: () => void }
      | undefined;
    runScene?.debugSpawnEnemyProjectile?.();
  });
}

async function dropXpGem(page: import('@playwright/test').Page, value: number): Promise<void> {
  await page.evaluate((nextValue) => {
    const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as
      | { debugDropXpGem?: (value: number) => void }
      | undefined;
    runScene?.debugDropXpGem?.(nextValue);
  }, value);
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
