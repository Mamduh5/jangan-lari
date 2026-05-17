import { expect, test } from '@playwright/test';

type EnemyAttackSnapshot = {
  kind: 'miniboss-line-strike' | 'miniboss-volley' | 'boss-shockwave';
  damageRange: number;
  visualRange: number;
  damageWidth: number | null;
  visualWidth: number | null;
  damageActive: boolean;
  effectActive: boolean;
  remainingMs: number;
};

type RunSnapshot = {
  enemyAttacks: EnemyAttackSnapshot[];
  enemyPopulation: {
    enemyEnemyPhysicalCollision: boolean;
  };
};

test.describe('hitbox and effect truth', () => {
  test('miniboss line active visual matches damage geometry and enemies do not physically collide', async ({ page }) => {
    const runtimeErrors = trackRuntimeErrors(page);

    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run));

    await page.evaluate(() => {
      const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as
        | { debugTriggerMinibossLineStrike?: (length?: number) => void }
        | undefined;
      runScene?.debugTriggerMinibossLineStrike?.(300);
    });

    await page.waitForFunction(() =>
      Boolean(
        window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run?.enemyAttacks.some(
          (attack) => attack.kind === 'miniboss-line-strike' && attack.damageActive,
        ),
      ),
    );

    const run = await getRunSnapshot(page);
    const attack = run.enemyAttacks.find((entry) => entry.kind === 'miniboss-line-strike');
    expect(attack).toBeTruthy();
    expect(attack?.damageRange).toBe(300);
    expect(attack?.visualRange).toBe(attack?.damageRange);
    expect(attack?.damageWidth).toBe(attack?.visualWidth);
    expect(attack?.damageActive).toBe(true);
    expect(attack?.effectActive).toBe(true);
    expect(attack?.remainingMs ?? 0).toBeGreaterThan(0);
    expect(run.enemyPopulation.enemyEnemyPhysicalCollision).toBe(false);
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
