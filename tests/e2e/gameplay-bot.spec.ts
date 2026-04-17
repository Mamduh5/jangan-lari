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
  weaponNames: string[];
  player: {
    x: number;
    y: number;
    moveSpeed: number;
    pickupRange: number;
  };
  enemies: GameplayBotEnemySummary[];
  xpGems: GameplayBotGemSummary[];
  upgradeChoices: GameplayBotUpgradeChoice[];
  combatResponse: {
    hitStopStarts: number;
    hitStopRefreshes: number;
    hitStopSuppressions: number;
    hitStopActive: boolean;
    weaponImpactCounts: Partial<Record<string, number>>;
    enemyImpactCounts: Partial<Record<string, number>>;
  };
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
  hitStopStarts: number;
  hitStopRefreshes: number;
  hitStopSuppressions: number;
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
  'unlock-phase-disc',
  'swiftness',
  'power',
  'rapid-fire',
  'unlock-bloom-cannon',
  'unlock-sunwheel',
  'velocity',
  'reach',
  'unlock-ember-lance',
  'unlock-shatterbell',
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
      const runLabel = `run ${runIndex + 1}/${BOT_RUN_COUNT}`;

      console.log(
        `[gameplay-bot] ${runLabel} | end=${finalRun.endTitle}${finalRun.victory ? ':victory' : ':defeat'} | elapsed=${Math.round(
          result.maxElapsedMs,
        )}ms | kills=${result.maxKills} | level=${result.maxLevel} | minHp=${result.minHp} | upgrades=${result.upgradeSelections}/${result.levelUpScreensSeen} | weapons=${result.maxWeaponCount} | travel=${Math.round(
          result.totalTravelDistance,
        )} | range=${Math.round(result.maxDistanceFromStart)} | loadout=${finalRun.weaponNames.join(',') || '--'} | hitStops=${result.hitStopStarts}/${result.hitStopRefreshes}/${result.hitStopSuppressions} | gold=${finalRun.goldEarned}`,
      );

      expect(finalRun.endActive, `${runLabel}: expected a natural end state`).toBe(true);
      expect(['Victory', 'Defeat'], `${runLabel}: expected endTitle to be Victory or Defeat, got ${finalRun.endTitle}`).toContain(
        finalRun.endTitle,
      );
      if (result.levelUpScreensSeen > 0) {
        expect(
          result.upgradeSelections,
          `${runLabel}: saw ${result.levelUpScreensSeen} level-up screens but selected ${result.upgradeSelections} upgrades`,
        ).toBeGreaterThanOrEqual(1);
      }

      results.push(result);
    }

    const naturallyEndedRuns = results.filter((result) => result.finalSnapshot.run?.endActive).length;
    const meaningfulRuns = results.filter((result) => isMeaningfulProgression(result)).length;
    const finalSceneStates = results.map((result) => result.finalSnapshot.scenes);
    const victoryCount = results.filter((result) => result.finalSnapshot.run?.victory).length;
    const defeatCount = results.length - victoryCount;
    const averageElapsedMs = Math.round(results.reduce((sum, result) => sum + result.maxElapsedMs, 0) / results.length);
    const averageKills = roundToOneDecimal(results.reduce((sum, result) => sum + result.maxKills, 0) / results.length);
    const averageLevel = roundToOneDecimal(results.reduce((sum, result) => sum + result.maxLevel, 0) / results.length);

    console.log(
      `[gameplay-bot] aggregate | runs=${results.length}/${BOT_RUN_COUNT} | avgElapsed=${averageElapsedMs}ms | avgKills=${averageKills} | avgLevel=${averageLevel} | wins=${victoryCount} | defeats=${defeatCount} | meaningful=${meaningfulRuns}/${results.length}`,
    );

    expect(results).toHaveLength(BOT_RUN_COUNT);
    expect(naturallyEndedRuns, `expected all ${BOT_RUN_COUNT} runs to end naturally, got ${naturallyEndedRuns}`).toBe(BOT_RUN_COUNT);
    expect(
      meaningfulRuns,
      `expected all ${results.length} runs to show meaningful progression, got ${meaningfulRuns}`,
    ).toBeGreaterThanOrEqual(BOT_RUN_COUNT);
    expect(
      finalSceneStates.every((scenes) => scenes.runActive && scenes.uiActive),
      'expected RunScene and UIScene to remain active until the natural end state of each run',
    ).toBe(true);
    expect(runtimeErrors, `expected no runtime/page errors, got: ${runtimeErrors.join(' | ')}`).toEqual([]);
  });

  test('bot can run a deterministic Phase Disc loadout without hit-stop instability', async ({ page }) => {
    test.setTimeout(BOT_TIMEOUT_MS + 60_000);

    const runtimeErrors = trackRuntimeErrors(page);

    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));

    await clickStartRun(page);
    await page.waitForFunction(() => {
      const game = window.__JANGAN_LARI_GAME__;
      return Boolean(game?.scene.isActive('RunScene') && game.scene.isActive('UIScene') && !game.scene.isActive('MenuScene'));
    });

    await forceUpgrade(page, 'unlock-phase-disc');
    await page.waitForFunction(() =>
      Boolean(window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run?.weaponNames.includes('Phase Disc')),
    );

    const result = await runGameplayBot(page, BOT_TIMEOUT_MS);
    const finalRun = result.finalSnapshot.run!;

    console.log(
      `[gameplay-bot] phase-disc | end=${finalRun.endTitle}${finalRun.victory ? ':victory' : ':defeat'} | elapsed=${Math.round(
        result.maxElapsedMs,
      )}ms | kills=${result.maxKills} | level=${result.maxLevel} | minHp=${result.minHp} | loadout=${finalRun.weaponNames.join(',') || '--'} | hitStops=${result.hitStopStarts}/${result.hitStopRefreshes}/${result.hitStopSuppressions} | gold=${finalRun.goldEarned}`,
    );

    expect(finalRun.endActive, 'expected the Phase Disc validation run to end naturally').toBe(true);
    expect(finalRun.weaponNames, `expected final loadout to include Phase Disc, got ${finalRun.weaponNames.join(',') || '--'}`).toContain(
      'Phase Disc',
    );
    expect(result.hitStopStarts, 'expected Phase Disc run to produce authored impact hit-stop').toBeGreaterThan(0);
    expect(
      result.hitStopRefreshes,
      `expected hit-stop refreshes to stay low during the Phase Disc run, got ${result.hitStopRefreshes} from ${result.hitStopStarts} starts`,
    ).toBeLessThanOrEqual(3);
    expect(
      finalRun.combatResponse.weaponImpactCounts['phase-disc'] ?? 0,
      `expected runtime authored impact coverage for Phase Disc, got ${finalRun.combatResponse.weaponImpactCounts['phase-disc'] ?? 0}`,
    ).toBeGreaterThan(0);
    expect(runtimeErrors, `expected no runtime/page errors, got: ${runtimeErrors.join(' | ')}`).toEqual([]);
  });

  test('bot can run a deterministic Shatterbell loadout without explosive hit-stop instability', async ({ page }) => {
    test.setTimeout(BOT_TIMEOUT_MS + 60_000);

    const runtimeErrors = trackRuntimeErrors(page);

    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));

    await clickStartRun(page);
    await page.waitForFunction(() => {
      const game = window.__JANGAN_LARI_GAME__;
      return Boolean(game?.scene.isActive('RunScene') && game.scene.isActive('UIScene') && !game.scene.isActive('MenuScene'));
    });

    await forceUpgrade(page, 'unlock-shatterbell');
    await page.waitForFunction(() =>
      Boolean(window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run?.weaponNames.includes('Shatterbell')),
    );

    const result = await runGameplayBot(page, BOT_TIMEOUT_MS);
    const finalRun = result.finalSnapshot.run!;
    const shatterbellImpacts = finalRun.combatResponse.weaponImpactCounts['shatterbell'] ?? 0;

    console.log(
      `[gameplay-bot] shatterbell | end=${finalRun.endTitle}${finalRun.victory ? ':victory' : ':defeat'} | elapsed=${Math.round(
        result.maxElapsedMs,
      )}ms | kills=${result.maxKills} | level=${result.maxLevel} | minHp=${result.minHp} | loadout=${finalRun.weaponNames.join(',') || '--'} | shatterbellImpacts=${shatterbellImpacts} | hitStops=${result.hitStopStarts}/${result.hitStopRefreshes}/${result.hitStopSuppressions} | gold=${finalRun.goldEarned}`,
    );

    expect(finalRun.endActive, 'expected the Shatterbell validation run to end naturally').toBe(true);
    expect(finalRun.weaponNames, `expected final loadout to include Shatterbell, got ${finalRun.weaponNames.join(',') || '--'}`).toContain(
      'Shatterbell',
    );
    expect(shatterbellImpacts, `expected runtime authored impact coverage for Shatterbell, got ${shatterbellImpacts}`).toBeGreaterThan(0);
    expect(result.hitStopStarts, 'expected explosive validation run to produce authored impact hit-stop').toBeGreaterThan(0);
    expect(
      result.hitStopRefreshes,
      `expected hit-stop refreshes to stay low during the Shatterbell run, got ${result.hitStopRefreshes} from ${result.hitStopStarts} starts`,
    ).toBeLessThanOrEqual(3);
    expect(runtimeErrors, `expected no runtime/page errors, got: ${runtimeErrors.join(' | ')}`).toEqual([]);
  });

  test('bot can run a deterministic Sunwheel loadout without radial hit-stop instability', async ({ page }) => {
    test.setTimeout(BOT_TIMEOUT_MS + 60_000);

    const runtimeErrors = trackRuntimeErrors(page);

    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));

    await clickStartRun(page);
    await page.waitForFunction(() => {
      const game = window.__JANGAN_LARI_GAME__;
      return Boolean(game?.scene.isActive('RunScene') && game.scene.isActive('UIScene') && !game.scene.isActive('MenuScene'));
    });

    await forceUpgrade(page, 'unlock-sunwheel');
    await page.waitForFunction(() =>
      Boolean(window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run?.weaponNames.includes('Sunwheel')),
    );

    const result = await runGameplayBot(page, BOT_TIMEOUT_MS);
    const finalRun = result.finalSnapshot.run!;
    const sunwheelImpacts = finalRun.combatResponse.weaponImpactCounts.sunwheel ?? 0;

    console.log(
      `[gameplay-bot] sunwheel | end=${finalRun.endTitle}${finalRun.victory ? ':victory' : ':defeat'} | elapsed=${Math.round(
        result.maxElapsedMs,
      )}ms | kills=${result.maxKills} | level=${result.maxLevel} | minHp=${result.minHp} | loadout=${finalRun.weaponNames.join(',') || '--'} | sunwheelImpacts=${sunwheelImpacts} | hitStops=${result.hitStopStarts}/${result.hitStopRefreshes}/${result.hitStopSuppressions} | gold=${finalRun.goldEarned}`,
    );

    expect(finalRun.endActive, 'expected the Sunwheel validation run to end naturally').toBe(true);
    expect(finalRun.weaponNames, `expected final loadout to include Sunwheel, got ${finalRun.weaponNames.join(',') || '--'}`).toContain(
      'Sunwheel',
    );
    expect(sunwheelImpacts, `expected runtime authored impact coverage for Sunwheel, got ${sunwheelImpacts}`).toBeGreaterThan(0);
    expect(result.hitStopStarts, 'expected radial validation run to produce authored impact hit-stop').toBeGreaterThan(0);
    expect(
      result.hitStopRefreshes,
      `expected hit-stop refreshes to stay low during the Sunwheel run, got ${result.hitStopRefreshes} from ${result.hitStopStarts} starts`,
    ).toBeLessThanOrEqual(3);
    expect(runtimeErrors, `expected no runtime/page errors, got: ${runtimeErrors.join(' | ')}`).toEqual([]);
  });

  test('bot can run a deterministic burst-loadout batch without broad combat-response instability', async ({ page }) => {
    test.setTimeout(BOT_TIMEOUT_MS + 60_000);

    const runtimeErrors = trackRuntimeErrors(page);

    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));

    await clickStartRun(page);
    await page.waitForFunction(() => {
      const game = window.__JANGAN_LARI_GAME__;
      return Boolean(game?.scene.isActive('RunScene') && game.scene.isActive('UIScene') && !game.scene.isActive('MenuScene'));
    });

    await forceUpgrade(page, 'unlock-twin-fangs');
    await forceUpgrade(page, 'unlock-bloom-cannon');
    await page.waitForFunction(() => {
      const weaponNames = window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run?.weaponNames ?? [];
      return weaponNames.includes('Twin Fangs') && weaponNames.includes('Bloom Cannon');
    });

    const result = await runGameplayBot(page, BOT_TIMEOUT_MS);
    const finalRun = result.finalSnapshot.run!;
    const twinFangsImpacts = finalRun.combatResponse.weaponImpactCounts['twin-fangs'] ?? 0;
    const bloomCannonImpacts = finalRun.combatResponse.weaponImpactCounts['bloom-cannon'] ?? 0;
    const authoredRegularEnemyImpacts = ['skimmer', 'harrier', 'mauler', 'crusher', 'bulwark', 'riftblade'].reduce(
      (sum, enemyId) => sum + (finalRun.combatResponse.enemyImpactCounts[enemyId] ?? 0),
      0,
    );

    console.log(
      `[gameplay-bot] rollout-batch | end=${finalRun.endTitle}${finalRun.victory ? ':victory' : ':defeat'} | elapsed=${Math.round(
        result.maxElapsedMs,
      )}ms | kills=${result.maxKills} | level=${result.maxLevel} | minHp=${result.minHp} | loadout=${finalRun.weaponNames.join(',') || '--'} | burstImpacts=${twinFangsImpacts}/${bloomCannonImpacts} | regularEnemyImpacts=${authoredRegularEnemyImpacts} | hitStops=${result.hitStopStarts}/${result.hitStopRefreshes}/${result.hitStopSuppressions} | gold=${finalRun.goldEarned}`,
    );

    expect(finalRun.endActive, 'expected the rollout batch validation run to end naturally').toBe(true);
    expect(finalRun.weaponNames, `expected final loadout to include Twin Fangs, got ${finalRun.weaponNames.join(',') || '--'}`).toContain(
      'Twin Fangs',
    );
    expect(
      finalRun.weaponNames,
      `expected final loadout to include Bloom Cannon, got ${finalRun.weaponNames.join(',') || '--'}`,
    ).toContain('Bloom Cannon');
    expect(twinFangsImpacts, `expected runtime authored impact coverage for Twin Fangs, got ${twinFangsImpacts}`).toBeGreaterThan(
      0,
    );
    expect(
      bloomCannonImpacts,
      `expected runtime authored impact coverage for Bloom Cannon, got ${bloomCannonImpacts}`,
    ).toBeGreaterThan(0);
    expect(
      authoredRegularEnemyImpacts,
      `expected runtime authored enemy impact coverage for the rollout batch, got ${authoredRegularEnemyImpacts}`,
    ).toBeGreaterThan(0);
    expect(result.hitStopStarts, 'expected burst rollout validation run to produce authored impact hit-stop').toBeGreaterThan(0);
    expect(
      result.hitStopRefreshes,
      `expected hit-stop refreshes to stay low during the burst rollout run, got ${result.hitStopRefreshes} from ${result.hitStopStarts} starts`,
    ).toBeLessThanOrEqual(3);
    expect(runtimeErrors, `expected no runtime/page errors, got: ${runtimeErrors.join(' | ')}`).toEqual([]);
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
      const combatResponse = run.combatResponse;

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
          hitStopStarts: combatResponse.hitStopStarts,
          hitStopRefreshes: combatResponse.hitStopRefreshes,
          hitStopSuppressions: combatResponse.hitStopSuppressions,
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

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
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

async function forceUpgrade(
  page: import('@playwright/test').Page,
  upgradeId:
    | 'unlock-phase-disc'
    | 'unlock-shatterbell'
    | 'unlock-sunwheel'
    | 'unlock-twin-fangs'
    | 'unlock-bloom-cannon',
): Promise<void> {
  await page.evaluate((id) => {
    const game = window.__JANGAN_LARI_GAME__;
    if (!game?.scene.isActive('RunScene')) {
      throw new Error('RunScene is not active for forced upgrade validation.');
    }

    const runScene = game.scene.getScene('RunScene') as {
      applyUpgrade?: (nextUpgradeId: string) => void;
      publishHudState?: () => void;
    };

    runScene.applyUpgrade?.(id);
    runScene.publishHudState?.();
  }, upgradeId);
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
