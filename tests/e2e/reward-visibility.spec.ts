import { expect, test } from '@playwright/test';

type UpgradeChoiceSnapshot = {
  id: string;
  title: string;
  rewardType: 'weapon' | 'stat' | 'passive' | 'utility';
  hasWeaponTag: boolean;
};

type RunSnapshot = {
  levelUpActive: boolean;
  weaponCount: number;
  upgradeChoices: UpgradeChoiceSnapshot[];
};

test.describe('reward visibility', () => {
  test('weapon reward choices expose compact weapon tag metadata and still select correctly', async ({ page }) => {
    const runtimeErrors = trackRuntimeErrors(page);

    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run));

    await page.evaluate(() => {
      const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as
        | { debugForceRewardVisibilityChoices?: () => void }
        | undefined;
      runScene?.debugForceRewardVisibilityChoices?.();
    });

    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run?.levelUpActive));

    const rewardRun = await getRunSnapshot(page);
    const weaponChoice = rewardRun.upgradeChoices.find((choice) => choice.rewardType === 'weapon');
    const nonWeaponChoice = rewardRun.upgradeChoices.find((choice) => choice.rewardType !== 'weapon');
    expect(weaponChoice).toBeTruthy();
    expect(weaponChoice?.hasWeaponTag).toBe(true);
    expect(nonWeaponChoice).toBeTruthy();
    expect(nonWeaponChoice?.hasWeaponTag).toBe(false);

    const weaponChoiceIndex = rewardRun.upgradeChoices.findIndex((choice) => choice.id === weaponChoice?.id);
    expect(weaponChoiceIndex).toBeGreaterThanOrEqual(0);

    await page.evaluate((choiceIndex) => {
      const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as
        | { selectLevelUp?: (index: number) => void }
        | undefined;
      runScene?.selectLevelUp?.(choiceIndex);
    }, weaponChoiceIndex);

    await page.waitForFunction(() => {
      const run = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run as RunSnapshot | null;
      return Boolean(run && !run.levelUpActive && run.weaponCount >= 2);
    });

    const afterSelection = await getRunSnapshot(page);
    expect(afterSelection.weaponCount).toBeGreaterThanOrEqual(2);
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
