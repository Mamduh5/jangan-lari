import { expect, test } from '@playwright/test';

type EnemyAttackSnapshot = {
  kind: 'miniboss-line-strike' | 'miniboss-volley' | 'boss-shockwave';
  damageRadius: number | null;
  visualRadius: number | null;
  damageWidth: number | null;
  visualWidth: number | null;
  damageActive: boolean;
  effectActive: boolean;
};

type RunSnapshot = {
  stagePhase: 'preBoss' | 'boss' | 'victory' | 'defeat';
  bossActive: boolean;
  bossPhase: 1 | 2;
  bossPhaseTwoTriggered: boolean;
  bossHp: number | null;
  bossMaxHp: number | null;
  activeBossSkill: string;
  bossSkillTelegraphActive: boolean;
  bossSkillDamageActive: boolean;
  activeMinibossSkill: string;
  eventEnemyMultiplier: number;
  enemyAttacks: EnemyAttackSnapshot[];
  enemyProjectiles: Array<{ radius: number; owner: 'enemy' }>;
  endActive: boolean;
  victory: boolean;
};

test.describe('boss phase and skill pass', () => {
  test('boss phase 2 triggers once and boss/miniboss skill metadata stays truthful', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    const runtimeErrors = trackRuntimeErrors(page);

    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run));

    await setRunElapsedMs(page, 900_000);
    await page.waitForFunction(() => {
      const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run as RunSnapshot | null;
      return Boolean(run?.stagePhase === 'boss' && run.bossActive && run.bossPhase === 1);
    });

    await setBossHealthRatio(page, 0.49);
    await page.waitForFunction(() => {
      const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run as RunSnapshot | null;
      return Boolean(run?.bossPhase === 2 && run.bossPhaseTwoTriggered);
    });

    let run = await getRunSnapshot(page);
    expect(run.endActive).toBe(false);
    expect(run.victory).toBe(false);
    expect(run.bossHp ?? 0).toBeLessThanOrEqual((run.bossMaxHp ?? 1) * 0.5);
    expect(run.eventEnemyMultiplier).toBe(5);

    await triggerBossShockwave(page);
    await page.waitForFunction(() => {
      const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run as RunSnapshot | null;
      return Boolean(run?.bossSkillTelegraphActive && run.activeBossSkill === 'shockwave-telegraph');
    });

    run = await getRunSnapshot(page);
    const bossTelegraph = run.enemyAttacks.find((attack) => attack.kind === 'boss-shockwave' && !attack.damageActive);
    expect(bossTelegraph?.effectActive).toBe(true);
    expect(bossTelegraph?.damageRadius).toBe(bossTelegraph?.visualRadius);

    await page.waitForFunction(() => {
      const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run as RunSnapshot | null;
      return Boolean(run?.bossSkillDamageActive && run.enemyAttacks.some((attack) => attack.kind === 'boss-shockwave' && attack.damageActive));
    });

    run = await getRunSnapshot(page);
    const bossActive = run.enemyAttacks.find((attack) => attack.kind === 'boss-shockwave' && attack.damageActive);
    expect(bossActive?.damageRadius).toBe(bossActive?.visualRadius);

    await triggerMinibossVolley(page);
    await page.waitForFunction(() => {
      const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run as RunSnapshot | null;
      return Boolean(run?.activeMinibossSkill === 'volley-telegraph');
    });

    run = await getRunSnapshot(page);
    const volleyTelegraph = run.enemyAttacks.find((attack) => attack.kind === 'miniboss-volley');
    expect(volleyTelegraph?.effectActive).toBe(true);
    expect(volleyTelegraph?.damageRadius).toBe(volleyTelegraph?.visualRadius);

    await page.waitForFunction(() => {
      const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run as RunSnapshot | null;
      return Boolean(run?.enemyAttacks.some((attack) => attack.kind === 'miniboss-volley' && attack.damageActive));
    });

    await defeatBoss(page);
    await page.waitForFunction(() => {
      const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run as RunSnapshot | null;
      return Boolean(run?.endActive && run.victory && run.stagePhase === 'victory');
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

async function setRunElapsedMs(page: import('@playwright/test').Page, elapsedMs: number): Promise<void> {
  await page.evaluate((nextElapsedMs) => {
    const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as
      | { debugSetRunElapsedMs?: (elapsedMs: number) => void }
      | undefined;
    runScene?.debugSetRunElapsedMs?.(nextElapsedMs);
  }, elapsedMs);
}

async function setBossHealthRatio(page: import('@playwright/test').Page, ratio: number): Promise<void> {
  await page.evaluate((nextRatio) => {
    const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as
      | { debugSetBossHealthRatio?: (ratio: number) => boolean }
      | undefined;
    if (!runScene?.debugSetBossHealthRatio?.(nextRatio)) {
      throw new Error('Failed to set boss health ratio.');
    }
  }, ratio);
}

async function triggerBossShockwave(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as
      | { debugTriggerBossShockwaveSkill?: () => boolean }
      | undefined;
    if (!runScene?.debugTriggerBossShockwaveSkill?.()) {
      throw new Error('Failed to trigger boss shockwave.');
    }
  });
}

async function triggerMinibossVolley(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as
      | { debugTriggerMinibossVolley?: () => boolean }
      | undefined;
    if (!runScene?.debugTriggerMinibossVolley?.()) {
      throw new Error('Failed to trigger miniboss volley.');
    }
  });
}

async function defeatBoss(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as
      | { debugDefeatBoss?: () => boolean }
      | undefined;
    if (!runScene?.debugDefeatBoss?.()) {
      throw new Error('Failed to defeat boss through debug hook.');
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
