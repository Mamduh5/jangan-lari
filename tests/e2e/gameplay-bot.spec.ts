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
  hp: number;
  maxHp: number;
  level: number;
  kills: number;
  weaponCount: number;
  goldEarned: number;
  levelUpActive: boolean;
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
  minHp: number;
  maxWeaponCount: number;
  levelUpScreensSeen: number;
  upgradeSelections: number;
  totalTravelDistance: number;
  maxDistanceFromStart: number;
};

const BOT_TIMEOUT_MS = 90_000;
const BOT_RUN_COUNT = 2;
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
  test.setTimeout(BOT_RUN_COUNT * BOT_TIMEOUT_MS + 60_000);

  test('bot can drive repeated real runs to natural endings without hanging', async ({ page }) => {
    const runtimeErrors = trackRuntimeErrors(page);
    const results: BotResult[] = [];

    for (let runIndex = 0; runIndex < BOT_RUN_COUNT; runIndex += 1) {
      await page.goto('/');
      await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));

      await clickStartRun(page);
      await page.waitForFunction(() => {
        const game = window.__JANGAN_LARI_GAME__;
        return Boolean(game?.scene.isActive('RunScene') && game.scene.isActive('UIScene') && !game.scene.isActive('MenuScene'));
      });

      const result = await runGameplayBot(page, BOT_TIMEOUT_MS);
      const finalRun = result.finalSnapshot.run!;

      console.log(
        `[gameplay-bot run ${runIndex + 1}/${BOT_RUN_COUNT}] ${JSON.stringify({
          elapsedMs: result.maxElapsedMs,
          kills: result.maxKills,
          maxLevel: result.maxLevel,
          upgradeSelections: result.upgradeSelections,
          levelUpScreensSeen: result.levelUpScreensSeen,
          maxWeaponCount: result.maxWeaponCount,
          minHp: result.minHp,
          totalTravelDistance: Math.round(result.totalTravelDistance),
          maxDistanceFromStart: Math.round(result.maxDistanceFromStart),
          endTitle: finalRun.endTitle,
          victory: finalRun.victory,
          goldEarned: finalRun.goldEarned,
        })}`,
      );

      expect(finalRun.endActive).toBe(true);
      expect(['Victory', 'Defeat']).toContain(finalRun.endTitle);
      if (result.levelUpScreensSeen > 0) {
        expect(result.upgradeSelections).toBeGreaterThanOrEqual(1);
      }

      results.push(result);
    }

    const naturallyEndedRuns = results.filter((result) => result.finalSnapshot.run?.endActive).length;
    const meaningfulRuns = results.filter((result) => isMeaningfulProgression(result)).length;
    const finalSceneStates = results.map((result) => result.finalSnapshot.scenes);

    expect(results).toHaveLength(BOT_RUN_COUNT);
    expect(naturallyEndedRuns).toBe(BOT_RUN_COUNT);
    expect(meaningfulRuns).toBeGreaterThanOrEqual(BOT_RUN_COUNT);
    expect(finalSceneStates.every((scenes) => scenes.runActive && scenes.uiActive)).toBe(true);
    expect(runtimeErrors).toEqual([]);
  });
});

async function runGameplayBot(page: import('@playwright/test').Page, timeoutMs: number): Promise<BotResult> {
  const pressedKeys = new Set<string>();
  let maxElapsedMs = 0;
  let maxLevel = 0;
  let maxKills = 0;
  let minHp = Number.POSITIVE_INFINITY;
  let maxWeaponCount = 0;
  let levelUpScreensSeen = 0;
  let upgradeSelections = 0;
  let totalTravelDistance = 0;
  let maxDistanceFromStart = 0;
  let initialPosition: { x: number; y: number } | null = null;
  let previousPosition: { x: number; y: number } | null = null;

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
      minHp = Math.min(minHp, run.hp);
      maxWeaponCount = Math.max(maxWeaponCount, run.weaponCount);

      if (!initialPosition) {
        initialPosition = { x: run.player.x, y: run.player.y };
      }

      const currentPosition = { x: run.player.x, y: run.player.y };
      if (previousPosition) {
        totalTravelDistance += distanceBetween(previousPosition, currentPosition);
      }
      previousPosition = currentPosition;

      if (initialPosition) {
        maxDistanceFromStart = Math.max(maxDistanceFromStart, distanceBetween(initialPosition, currentPosition));
      }

      if (run.endActive) {
        await releaseMovementKeys(page, pressedKeys);
        return {
          finalSnapshot: snapshot,
          maxElapsedMs,
          maxLevel,
          maxKills,
          minHp,
          maxWeaponCount,
          levelUpScreensSeen,
          upgradeSelections,
          totalTravelDistance,
          maxDistanceFromStart,
        };
      }

      if (run.levelUpActive && run.upgradeChoices.length > 0) {
        levelUpScreensSeen += 1;
        const choiceIndex = chooseUpgradeIndex(run.upgradeChoices);
        await releaseMovementKeys(page, pressedKeys);
        await clickLevelUpChoice(page, choiceIndex);
        upgradeSelections += 1;
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

function distanceBetween(left: { x: number; y: number }, right: { x: number; y: number }): number {
  return Math.hypot(right.x - left.x, right.y - left.y);
}

async function getGameplaySnapshot(page: import('@playwright/test').Page): Promise<GameplayBotSnapshot> {
  return page.evaluate(() => window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot() ?? null) as Promise<GameplayBotSnapshot>;
}

function isMeaningfulProgression(result: BotResult): boolean {
  return (
    result.maxElapsedMs >= 6_000 &&
    result.totalTravelDistance >= 600 &&
    result.maxDistanceFromStart >= 120 &&
    (result.maxKills >= 2 || result.maxLevel >= 2 || result.upgradeSelections >= 1)
  );
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

async function clickLevelUpChoice(page: import('@playwright/test').Page, choiceIndex: number): Promise<void> {
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error('Game canvas is not available for level-up choice click.');
  }

  const gameWidth = 1280;
  const gameHeight = 720;
  const buttonX = 270 + choiceIndex * 370;
  const buttonY = 340;

  await canvas.click({
    position: {
      x: (buttonX / gameWidth) * box.width,
      y: (buttonY / gameHeight) * box.height,
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
