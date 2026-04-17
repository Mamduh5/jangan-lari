import { expect, test } from '@playwright/test';

type GameplayBotEnemySummary = {
  x: number;
  y: number;
  distance: number;
  contactDamage: number;
  isElite: boolean;
  isBoss: boolean;
};

type GameplayBotGemSummary = {
  x: number;
  y: number;
  distance: number;
  value: number;
};

type GameplayBotUpgradeChoice = {
  id: string;
  title: string;
};

type GameplayBotRunSnapshot = {
  elapsedMs: number;
  targetMs: number;
  hp: number;
  maxHp: number;
  level: number;
  kills: number;
  weaponCount: number;
  goldEarned: number;
  totalGold: number;
  instructions: string;
  levelUpActive: boolean;
  levelUpRemainingMs: number;
  endActive: boolean;
  victory: boolean;
  endTitle: string;
  player: {
    x: number;
    y: number;
    moveSpeed: number;
    pickupRange: number;
  };
  enemies: GameplayBotEnemySummary[];
  xpGems: GameplayBotGemSummary[];
  upgradeChoices: GameplayBotUpgradeChoice[];
};

type GameplayBotSnapshot = {
  timestampMs: number;
  scenes: {
    menuActive: boolean;
    metaActive: boolean;
    runActive: boolean;
    uiActive: boolean;
  };
  run: GameplayBotRunSnapshot | null;
};

type BotResult = {
  finalSnapshot: GameplayBotSnapshot;
  maxElapsedMs: number;
  maxLevel: number;
  maxKills: number;
};

const BOT_TIMEOUT_MS = 90_000;
const BOT_TICK_MS = 120;
const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 1400;
const UPGRADE_PRIORITY = [
  'vitality',
  'magnet',
  'unlock-twin-fangs',
  'swiftness',
  'power',
  'rapid-fire',
  'unlock-bloom-cannon',
  'velocity',
  'reach',
  'unlock-ember-lance',
] as const;

test.describe('gameplay bot smoke', () => {
  test.setTimeout(BOT_TIMEOUT_MS + 30_000);

  test('bot can drive a real run to a natural ending without hanging', async ({ page }) => {
    const runtimeErrors = trackRuntimeErrors(page);

    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));

    await clickStartRun(page);
    await page.waitForFunction(() => {
      const game = window.__JANGAN_LARI_GAME__;
      return Boolean(game?.scene.isActive('RunScene') && game.scene.isActive('UIScene') && !game.scene.isActive('MenuScene'));
    });

    const result = await runGameplayBot(page, BOT_TIMEOUT_MS);

    expect(result.finalSnapshot.run).not.toBeNull();
    expect(result.finalSnapshot.run?.endActive).toBe(true);
    expect(result.maxElapsedMs).toBeGreaterThanOrEqual(10_000);
    expect(result.maxLevel).toBeGreaterThanOrEqual(2);
    expect(result.maxKills).toBeGreaterThanOrEqual(10);
    expect(result.finalSnapshot.scenes.runActive).toBe(true);
    expect(result.finalSnapshot.scenes.uiActive).toBe(true);
    expect(runtimeErrors).toEqual([]);
  });
});

async function runGameplayBot(page: import('@playwright/test').Page, timeoutMs: number): Promise<BotResult> {
  const pressedKeys = new Set<string>();
  let maxElapsedMs = 0;
  let maxLevel = 0;
  let maxKills = 0;

  try {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const snapshot = await getGameplaySnapshot(page);
      const run = snapshot.run;
      if (!run) {
        throw new Error('Gameplay bot lost access to the active run snapshot.');
      }

      maxElapsedMs = Math.max(maxElapsedMs, run.elapsedMs);
      maxLevel = Math.max(maxLevel, run.level);
      maxKills = Math.max(maxKills, run.kills);

      if (run.endActive) {
        await releaseMovementKeys(page, pressedKeys);
        return {
          finalSnapshot: snapshot,
          maxElapsedMs,
          maxLevel,
          maxKills,
        };
      }

      if (run.levelUpActive && run.upgradeChoices.length > 0) {
        const choiceIndex = chooseUpgradeIndex(run.upgradeChoices);
        await releaseMovementKeys(page, pressedKeys);
        await page.keyboard.press((choiceIndex + 1).toString());
      } else {
        const movementKeys = determineMovementKeys(run);
        await syncMovementKeys(page, pressedKeys, movementKeys);
      }

      await page.waitForTimeout(BOT_TICK_MS);
    }
  } finally {
    await releaseMovementKeys(page, pressedKeys);
  }

  throw new Error(`Gameplay bot timed out after ${timeoutMs} ms without a natural end state.`);
}

async function getGameplaySnapshot(page: import('@playwright/test').Page): Promise<GameplayBotSnapshot> {
  return page.evaluate(() => window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot() ?? null) as Promise<GameplayBotSnapshot>;
}

function chooseUpgradeIndex(choices: GameplayBotUpgradeChoice[]): number {
  let bestIndex = 0;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let index = 0; index < choices.length; index += 1) {
    const priorityIndex = UPGRADE_PRIORITY.indexOf(choices[index].id as (typeof UPGRADE_PRIORITY)[number]);
    const score = priorityIndex === -1 ? UPGRADE_PRIORITY.length + index : priorityIndex;

    if (score < bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  return bestIndex;
}

function determineMovementKeys(run: GameplayBotRunSnapshot): string[] {
  const { player } = run;
  let moveX = 0;
  let moveY = 0;

  for (const enemy of run.enemies) {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.max(24, enemy.distance);
    const threatRadius = enemy.isBoss ? 380 : enemy.isElite ? 300 : 220;

    if (distance > threatRadius) {
      continue;
    }

    const weight = ((threatRadius - distance) / threatRadius) * (enemy.isBoss ? 3.2 : enemy.isElite ? 2.2 : 1.2);
    moveX += (dx / distance) * weight;
    moveY += (dy / distance) * weight;

    // Keep a tangent bias so movement remains smooth instead of backing into packs.
    moveX += (-dy / distance) * 0.55;
    moveY += (dx / distance) * 0.55;
  }

  const nearestEnemy = run.enemies[0];
  const nearestGem = run.xpGems[0];
  if (nearestGem && (!nearestEnemy || nearestEnemy.distance > 150)) {
    const dx = nearestGem.x - player.x;
    const dy = nearestGem.y - player.y;
    const distance = Math.max(24, nearestGem.distance);

    moveX += (dx / distance) * 0.9;
    moveY += (dy / distance) * 0.9;
  }

  const boundaryMargin = 220;
  if (player.x < boundaryMargin) {
    moveX += 1.4;
  } else if (player.x > WORLD_WIDTH - boundaryMargin) {
    moveX -= 1.4;
  }

  if (player.y < boundaryMargin) {
    moveY += 1.4;
  } else if (player.y > WORLD_HEIGHT - boundaryMargin) {
    moveY -= 1.4;
  }

  if (Math.abs(moveX) < 0.15 && Math.abs(moveY) < 0.15) {
    moveX = Math.sin(run.elapsedMs / 1500);
    moveY = Math.cos(run.elapsedMs / 1800);
  }

  const keys: string[] = [];
  if (moveX > 0.2) {
    keys.push('KeyD');
  } else if (moveX < -0.2) {
    keys.push('KeyA');
  }

  if (moveY > 0.2) {
    keys.push('KeyS');
  } else if (moveY < -0.2) {
    keys.push('KeyW');
  }

  return keys;
}

async function syncMovementKeys(
  page: import('@playwright/test').Page,
  pressedKeys: Set<string>,
  nextKeys: string[],
): Promise<void> {
  for (const key of [...pressedKeys]) {
    if (!nextKeys.includes(key)) {
      await page.keyboard.up(key);
      pressedKeys.delete(key);
    }
  }

  for (const key of nextKeys) {
    if (!pressedKeys.has(key)) {
      await page.keyboard.down(key);
      pressedKeys.add(key);
    }
  }
}

async function releaseMovementKeys(page: import('@playwright/test').Page, pressedKeys: Set<string>): Promise<void> {
  for (const key of [...pressedKeys]) {
    await page.keyboard.up(key);
    pressedKeys.delete(key);
  }
}

async function clickStartRun(page: import('@playwright/test').Page): Promise<void> {
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error('Game canvas is not available for Start Run click.');
  }

  const gameWidth = 1280;
  const gameHeight = 720;
  const startButtonX = gameWidth / 2 - 162;
  const startButtonY = gameHeight / 2 - 138;

  await canvas.click({
    position: {
      x: (startButtonX / gameWidth) * box.width,
      y: (startButtonY / gameHeight) * box.height,
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
