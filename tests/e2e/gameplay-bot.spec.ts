import { expect, test } from '@playwright/test';

type Snapshot = {
  scenes: {
    menuActive: boolean;
    runActive: boolean;
    uiActive: boolean;
  };
  run: null | {
    elapsedMs: number;
    level: number;
    kills: number;
    hp: number;
    endActive: boolean;
    weaponNames: string[];
    traits: string[];
    rewardChoices: Array<{ id: string; title: string; lane: string }>;
    player: { x: number; y: number; guard: number; maxGuard: number };
    enemies: Array<{ distance: number; x: number; y: number; isMarked?: boolean }>;
    xpGems: Array<{ distance: number; x: number; y: number }>;
  };
};

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

async function getSnapshot(page: import('@playwright/test').Page): Promise<Snapshot> {
  return page.evaluate(() => window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot() ?? null) as Promise<Snapshot>;
}

function determineMovementKeys(snapshot: NonNullable<Snapshot['run']>): string[] {
  const move = { x: 0, y: 0 };
  const nearestEnemy = snapshot.enemies[0];

  snapshot.enemies.slice(0, 4).forEach((enemy) => {
    const threatDistance = Math.max(32, enemy.distance);
    const dx = snapshot.player.x - enemy.x;
    const dy = snapshot.player.y - enemy.y;
    const threatWeight = threatDistance < 160 ? 1.4 : 0.5;
    move.x += (dx / threatDistance) * threatWeight;
    move.y += (dy / threatDistance) * threatWeight;
    move.x += (-dy / threatDistance) * 0.35;
    move.y += (dx / threatDistance) * 0.35;
  });

  if (snapshot.xpGems[0] && (!nearestEnemy || nearestEnemy.distance > 120)) {
    const gem = snapshot.xpGems[0];
    const dx = gem.x - snapshot.player.x;
    const dy = gem.y - snapshot.player.y;
    const distance = Math.max(24, gem.distance);
    move.x += (dx / distance) * 0.8;
    move.y += (dy / distance) * 0.8;
  }

  if (Math.abs(move.x) < 0.15 && Math.abs(move.y) < 0.15) {
    move.x = 0.8;
    move.y = 0.3;
  }

  const keys: string[] = [];
  if (move.x > 0.2) keys.push('KeyD');
  if (move.x < -0.2) keys.push('KeyA');
  if (move.y > 0.2) keys.push('KeyS');
  if (move.y < -0.2) keys.push('KeyW');
  return keys;
}

async function syncKeys(
  page: import('@playwright/test').Page,
  pressed: Set<string>,
  nextKeys: string[],
): Promise<void> {
  for (const key of [...pressed]) {
    if (!nextKeys.includes(key)) {
      await page.keyboard.up(key);
      pressed.delete(key);
    }
  }

  for (const key of nextKeys) {
    if (!pressed.has(key)) {
      await page.keyboard.down(key);
      pressed.add(key);
    }
  }
}

async function releaseKeys(page: import('@playwright/test').Page, pressed: Set<string>): Promise<void> {
  for (const key of [...pressed]) {
    await page.keyboard.up(key);
    pressed.delete(key);
  }
}

async function selectHero(page: import('@playwright/test').Page, hero: 'runner' | 'shade'): Promise<void> {
  await clickCanvasPosition(page, hero === 'runner' ? 420 : 860, 382);
}

async function runHeroValidation(page: import('@playwright/test').Page, hero: 'runner' | 'shade'): Promise<void> {
  const pressed = new Set<string>();

  try {
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));
    await selectHero(page, hero);
    await clickCanvasPosition(page, 560, 82);
    await page.waitForFunction(() => {
      const game = window.__JANGAN_LARI_GAME__;
      return Boolean(game?.scene.isActive('RunScene') && game.scene.isActive('UIScene'));
    });

    await page.evaluate((selectedHero) => {
      const game = window.__JANGAN_LARI_GAME__!;
      const runScene = game.scene.getScene('RunScene') as {
        player: { x: number; y: number };
        debugSpawnEnemy?: (enemyId: 'anchor' | 'shooter') => boolean;
        enemies: {
          getChildren: () => Array<{ x: number; y: number; active: boolean }>;
        };
      };

      runScene.debugSpawnEnemy?.(selectedHero === 'runner' ? 'anchor' : 'shooter');
      const enemies = runScene.enemies.getChildren();
      const enemy = enemies[enemies.length - 1] as
        | { x: number; y: number; active: boolean; body?: { reset?: (x: number, y: number) => void } }
        | undefined;
      if (enemy) {
        const nextX = runScene.player.x + (selectedHero === 'runner' ? 72 : 180);
        const nextY = runScene.player.y;
        enemy.x = nextX;
        enemy.y = nextY;
        enemy.body?.reset?.(nextX, nextY);
      }
    }, hero);

    const start = Date.now();
    let sawStateLoop = false;

    if (hero === 'runner') {
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const snapshot = await getSnapshot(page);
        if (snapshot.run?.player.guard && snapshot.run.player.guard > 0) {
          sawStateLoop = true;
          break;
        }
        await page.waitForTimeout(120);
      }
    }

    while (Date.now() - start < 12_000) {
      const snapshot = await getSnapshot(page);
      const run = snapshot.run;
      if (!run) {
        throw new Error('No active run snapshot.');
      }

      if (hero === 'runner' && run.player.guard > 0) {
        sawStateLoop = true;
      }
      if (hero === 'shade' && run.enemies.some((enemy) => enemy.isMarked)) {
        sawStateLoop = true;
      }

      if (sawStateLoop) {
        break;
      }

      await syncKeys(page, pressed, determineMovementKeys(run));
      await page.waitForTimeout(120);
    }

    await releaseKeys(page, pressed);
    expect(sawStateLoop, `${hero} did not surface its core state loop early`).toBe(true);

    await page.evaluate(() => {
      const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as {
        debugForceLevelUp?: () => void;
      };
      runScene.debugForceLevelUp?.();
    });

    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.registry.get('run.levelUpActive')));
    const levelUpSnapshot = await getSnapshot(page);
    expect(levelUpSnapshot.run?.rewardChoices).toHaveLength(3);
    expect(levelUpSnapshot.run?.rewardChoices.some((choice) => choice.lane === 'deepen')).toBe(true);
    expect(levelUpSnapshot.run?.rewardChoices.some((choice) => choice.lane === 'stabilize')).toBe(true);
    const chosenRewardId = levelUpSnapshot.run?.rewardChoices[0]?.id;

    await page.evaluate(() => {
      const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as {
        selectReward?: (index: number) => void;
      };
      runScene.selectReward?.(0);
    });
    await page.waitForFunction(() => !window.__JANGAN_LARI_GAME__?.registry.get('run.levelUpActive'));

    const resumedSnapshot = await getSnapshot(page);
    expect(resumedSnapshot.run?.endActive).toBe(false);
    if (chosenRewardId === 'field-repairs') {
      expect(resumedSnapshot.run?.maxHp).toBeGreaterThan(levelUpSnapshot.run?.maxHp ?? 0);
    } else if (chosenRewardId === 'reflex-boots') {
      expect(resumedSnapshot.run?.player).toBeTruthy();
    } else {
      expect((resumedSnapshot.run?.traits.length ?? 0) >= 1).toBe(true);
    }

    await page.evaluate(() => {
      const runScene = window.__JANGAN_LARI_GAME__?.scene.getScene('RunScene') as {
        debugForceEndRun?: (victory?: boolean) => void;
      };
      runScene.debugForceEndRun?.(true);
    });
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.registry.get('run.endActive')));

    const finalSnapshot = await getSnapshot(page);
    expect(finalSnapshot.run?.endActive).toBe(true);
    expect(finalSnapshot.run?.weaponNames).toHaveLength(2);
  } finally {
    await releaseKeys(page, pressed);
  }
}

test.describe('milestone 1 gameplay bot', () => {
  test('Iron Warden surfaces Guard and directional rewards early', async ({ page }) => {
    await runHeroValidation(page, 'runner');
  });

  test('Raptor Frame surfaces Mark and directional rewards early', async ({ page }) => {
    await runHeroValidation(page, 'shade');
  });
});
