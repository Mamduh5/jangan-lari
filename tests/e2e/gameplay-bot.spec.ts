import { expect, test } from '@playwright/test';

type Snapshot = {
  scenes: {
    menuActive: boolean;
    runActive: boolean;
    uiActive: boolean;
  };
  run: null | {
    elapsedMs: number;
    hp: number;
    maxHp: number;
    level: number;
    xp: number;
    xpNext: number;
    kills: number;
    levelUpActive: boolean;
    endActive: boolean;
    weaponNames: string[];
    traits: string[];
    player: { x: number; y: number; guard: number; maxGuard: number };
    cooldowns: { primaryRemainingMs: number; signatureRemainingMs: number; supportRemainingMs: number };
    markedEnemies: number;
    disruptedEnemies: number;
    ailmentedEnemies: number;
    markApplyCount: number;
    markConsumeCount: number;
    disruptedApplyCount: number;
    disruptedSignatureHitCount: number;
    ailmentApplyCount: number;
    ailmentConsumeCount: number;
    supportAbilityId: 'shock-lattice' | 'spotter-drone' | 'echo-turret' | 'recovery-field' | 'contagion-node' | null;
    supportUseCount: number;
    evolutionId: string | null;
    evolutionTitle: string;
    xpGemSpawnCount: number;
    xpGemCollectCount: number;
    bossActive: boolean;
    bossHp: number;
    bossMaxHp: number;
    bossProtectors: number;
    bossProtected: boolean;
    bossName: string;
    bossObjective: string;
    pressureBeat: { active: boolean; id: string; label: string; objective: string; remainingMs: number };
    event: {
      active: boolean;
      type: 'challenge-wave' | 'reward-target' | 'state-break' | '';
      title: string;
      objective: string;
      remainingMs: number;
      targetStatus: 'inactive' | 'active' | 'broken' | 'failed';
      rewardTargetSuccesses: number;
      rewardTargetFailures: number;
    };
    enemies: Array<{
      id?: string;
      distance: number;
      x: number;
      y: number;
      isEventTarget?: boolean;
      isMarked?: boolean;
      isDisrupted?: boolean;
      isAilmented?: boolean;
    }>;
    xpGems: Array<{ distance: number; x: number; y: number }>;
    rewardChoices: Array<{ id: string; title: string; lane: 'deepen' | 'bridge' | 'stabilize' }>;
    hud?: {
      hpBarWidth: number;
      guardBarWidth: number;
      xpBarWidth: number;
      hpBarRatio: number;
      guardBarRatio: number;
      xpBarRatio: number;
      hpBarFrameDepth: number;
      hpBarFillDepth: number;
      guardBarFrameDepth: number;
      guardBarFillDepth: number;
      xpBarFrameDepth: number;
      xpBarFillDepth: number;
      hpText: string;
      guardText: string;
      xpText: string;
    };
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

async function getSnapshot(page: import('@playwright/test').Page): Promise<Snapshot> {
  try {
    return page.evaluate(() => window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot() ?? null) as Promise<Snapshot>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('Execution context was destroyed')) {
      throw error;
    }

    await page.waitForTimeout(120);
    return page.evaluate(() => window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot() ?? null) as Promise<Snapshot>;
  }
}

async function selectRewardByIndex(page: import('@playwright/test').Page, index: number): Promise<void> {
  await page.evaluate((rewardIndex) => {
    const game = window.__JANGAN_LARI_GAME__;
    const runScene = game?.scene.getScene('RunScene') as { selectReward?: (index: number) => void } | undefined;
    runScene?.selectReward?.(rewardIndex);
  }, index);
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

function determineMovementKeys(
  run: NonNullable<Snapshot['run']>,
  hero: 'runner' | 'shade' | 'weaver',
): string[] {
  const move = { x: 0, y: 0 };
  const nearestEnemy = run.enemies[0];

  if (nearestEnemy) {
    const dx = nearestEnemy.x - run.player.x;
    const dy = nearestEnemy.y - run.player.y;
    const distance = Math.max(24, nearestEnemy.distance);
    const approachBias = hero === 'runner' ? 1.2 : hero === 'weaver' ? 0.74 : 0.45;
    const retreatBias = hero === 'runner' ? 0.2 : hero === 'weaver' ? 0.82 : 1.1;

    if (distance > (hero === 'runner' ? 110 : hero === 'weaver' ? 150 : 180)) {
      move.x += (dx / distance) * approachBias;
      move.y += (dy / distance) * approachBias;
    } else {
      move.x -= (dx / distance) * retreatBias;
      move.y -= (dy / distance) * retreatBias;
    }

    const tangent = hero === 'runner' ? 0.22 : hero === 'weaver' ? 0.42 : 0.55;
    move.x += (-dy / distance) * tangent;
    move.y += (dx / distance) * tangent;
  }

  if (run.xpGems[0] && (!nearestEnemy || nearestEnemy.distance > 140)) {
    const gem = run.xpGems[0];
    const dx = gem.x - run.player.x;
    const dy = gem.y - run.player.y;
    const distance = Math.max(24, gem.distance);
    move.x += (dx / distance) * 1.25;
    move.y += (dy / distance) * 1.25;
  }

  if (Math.abs(move.x) < 0.15 && Math.abs(move.y) < 0.15) {
    move.x = hero === 'runner' ? 0.7 : hero === 'weaver' ? 0.5 : 0.35;
    move.y = 0.45;
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

async function runNaturalValidation(page: import('@playwright/test').Page, hero: 'runner' | 'shade' | 'weaver'): Promise<void> {
  const pressed = new Set<string>();
  const runtimeErrors = trackRuntimeErrors(page);

  try {
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));
    await clickCanvasPosition(page, getHeroCardX(hero), 382);
    await clickCanvasPosition(page, 560, 82);
    await page.waitForFunction(() => {
      const game = window.__JANGAN_LARI_GAME__;
      return Boolean(game?.scene.isActive('RunScene') && game.scene.isActive('UIScene'));
    });

    let sawGuardGain = false;
    let sawSignatureUse = false;
    let sawMark = false;
    let sawXpGem = false;
    let sawXpGain = false;
    let sawHpChange = false;
    let sawNaturalLevelUp = false;
    let sawSupportReward = false;
    let sawSupportUse = false;
    let sawDisrupted = false;
    let sawAilment = false;
    let sawAilmentConsume = false;
    let previousGuard = 0;
    let initialHpBarWidth = 0;
    let minHpBarWidth = Number.POSITIVE_INFINITY;

    const startedAt = Date.now();
    while (Date.now() - startedAt < 40_000) {
      const snapshot = await getSnapshot(page);
      const run = snapshot.run;
      if (!run) {
        throw new Error('Gameplay snapshot lost the active run.');
      }

      expect(snapshot.scenes.runActive).toBe(true);
      expect(snapshot.scenes.uiActive).toBe(true);
      expect(run.endActive).toBe(false);
      expect(run.hud).toBeTruthy();

      const hud = run.hud!;
      expect(hud.hpBarFillDepth).toBeGreaterThan(hud.hpBarFrameDepth);
      expect(hud.guardBarFillDepth).toBeGreaterThan(hud.guardBarFrameDepth);
      expect(hud.xpBarFillDepth).toBeGreaterThan(hud.xpBarFrameDepth);
      if (initialHpBarWidth === 0) {
        initialHpBarWidth = hud.hpBarWidth;
      }
      minHpBarWidth = Math.min(minHpBarWidth, hud.hpBarWidth);

      if (run.hp < run.maxHp) {
        sawHpChange = true;
      }
      if (run.player.guard > 0) {
        sawGuardGain = true;
      }
      if (previousGuard > run.player.guard + 2) {
        sawSignatureUse = true;
      }
      previousGuard = run.player.guard;
      if (run.cooldowns.signatureRemainingMs > 150) {
        sawSignatureUse = true;
      }
      if (run.markedEnemies > 0 || run.markApplyCount > 0 || run.markConsumeCount > 0 || run.enemies.some((enemy) => enemy.isMarked)) {
        sawMark = true;
      }
      if (run.xpGems.length > 0 || run.xpGemSpawnCount > 0) {
        sawXpGem = true;
      }
      if (run.xp > 0 || run.level > 1) {
        sawXpGain = true;
      }
      if (run.levelUpActive || run.level > 1) {
        sawNaturalLevelUp = true;
      }
      if (
        run.disruptedEnemies > 0 ||
        run.disruptedApplyCount > 0 ||
        run.enemies.some((enemy) => enemy.isDisrupted)
      ) {
        sawDisrupted = true;
      }
      if (
        run.ailmentedEnemies > 0 ||
        run.ailmentApplyCount > 0 ||
        run.ailmentConsumeCount > 0 ||
        run.enemies.some((enemy) => enemy.isAilmented)
      ) {
        sawAilment = true;
      }
      if (run.ailmentConsumeCount > 0) {
        sawAilmentConsume = true;
      }

      if (run.levelUpActive) {
        break;
      }

      await syncKeys(page, pressed, determineMovementKeys(run, hero));
      await page.waitForTimeout(120);
    }

    await releaseKeys(page, pressed);

    const snapshot = await getSnapshot(page);
    const run = snapshot.run;
    expect(run).toBeTruthy();
    expect(runtimeErrors, `runtime errors detected: ${runtimeErrors.join(' | ')}`).toEqual([]);
    expect(run!.kills, 'expected at least one natural kill').toBeGreaterThanOrEqual(1);
    expect(sawXpGem, 'expected to see a natural XP gem drop in the real run').toBe(true);
    expect(run!.xpGemSpawnCount, 'expected at least one natural XP gem spawn').toBeGreaterThanOrEqual(1);
    expect(sawXpGain, 'expected XP to increase during the real run').toBe(true);
    expect(sawNaturalLevelUp, 'expected to naturally reach the first level-up').toBe(true);
    expect(initialHpBarWidth, 'expected HP bar to start visibly filled').toBeGreaterThan(200);
    if (sawHpChange) {
      expect(minHpBarWidth, 'expected HP bar width to shrink after taking damage').toBeLessThan(initialHpBarWidth - 0.75);
    }
    expect(run!.levelUpActive, 'expected the real run to still be sitting on the natural level-up prompt').toBe(true);
    const supportChoiceIndex = run!.rewardChoices.findIndex(
      (choice) =>
        choice.id === 'shock-lattice' ||
        choice.id === 'spotter-drone' ||
        choice.id === 'echo-turret' ||
        choice.id === 'recovery-field' ||
        choice.id === 'contagion-node',
    );
    expect(supportChoiceIndex, 'expected the first natural reward set to include a support reward while the slot is empty').toBeGreaterThanOrEqual(0);
    sawSupportReward = supportChoiceIndex >= 0;
    await selectRewardByIndex(page, supportChoiceIndex);
    const supportEquipStartedAt = Date.now();
    let afterChoice: Snapshot['run'] = null;
    while (Date.now() - supportEquipStartedAt < 6_000) {
      const supportChoiceSnapshot = await getSnapshot(page);
      afterChoice = supportChoiceSnapshot.run;
      if (afterChoice?.supportAbilityId) {
        break;
      }
      await page.waitForTimeout(100);
    }
    expect(afterChoice?.supportAbilityId, 'expected the chosen reward to equip the support slot').toBeTruthy();

    const supportStartedAt = Date.now();
    while (Date.now() - supportStartedAt < 30_000) {
      const supportSnapshot = await getSnapshot(page);
      const supportRun = supportSnapshot.run;
      if (!supportRun) {
        throw new Error('Gameplay snapshot lost the active run after equipping support.');
      }

      expect(supportRun.endActive).toBe(false);
      if (supportRun.levelUpActive) {
        await selectRewardByIndex(page, 0);
        await page.waitForTimeout(100);
        continue;
      }

      await syncKeys(page, pressed, determineMovementKeys(supportRun, hero));

      if (supportRun.supportUseCount > 0) {
        sawSupportUse = true;
      }
      if (supportRun.cooldowns.signatureRemainingMs > 150) {
        sawSignatureUse = true;
      }
      if (
        supportRun.markedEnemies > 0 ||
        supportRun.markApplyCount > 0 ||
        supportRun.markConsumeCount > 0 ||
        supportRun.enemies.some((enemy) => enemy.isMarked)
      ) {
        sawMark = true;
      }
      if (
        supportRun.disruptedEnemies > 0 ||
        supportRun.disruptedApplyCount > 0 ||
        supportRun.enemies.some((enemy) => enemy.isDisrupted)
      ) {
        sawDisrupted = true;
      }
      if (
        supportRun.ailmentedEnemies > 0 ||
        supportRun.ailmentApplyCount > 0 ||
        supportRun.ailmentConsumeCount > 0 ||
        supportRun.enemies.some((enemy) => enemy.isAilmented)
      ) {
        sawAilment = true;
      }
      if (supportRun.ailmentConsumeCount > 0) {
        sawAilmentConsume = true;
      }
      if (sawSupportUse && (hero === 'runner' ? sawSignatureUse : hero === 'shade' ? sawMark : sawAilmentConsume)) {
        break;
      }

      await page.waitForTimeout(120);
    }

    await releaseKeys(page, pressed);

    const finalSnapshot = await getSnapshot(page);
    expect(runtimeErrors, `runtime errors detected: ${runtimeErrors.join(' | ')}`).toEqual([]);
    expect(finalSnapshot.run?.supportAbilityId, 'expected the support slot to remain equipped').toBeTruthy();
    expect(sawSupportReward, 'expected to see a support reward in the real level-up flow').toBe(true);
    expect(sawSupportUse, 'expected the equipped support to auto-fire in the real run').toBe(true);
    if (hero === 'runner') {
      expect(sawGuardGain, 'expected Iron Warden to build some Guard during the run').toBe(true);
      expect(sawSignatureUse, 'expected Iron Warden to naturally fire Bulwark Slam during the run').toBe(true);
    } else if (hero === 'shade') {
      expect(sawMark, 'expected Raptor Frame to visibly mark enemies').toBe(true);
    } else {
      expect(sawAilment, 'expected Ash Weaver to visibly apply Ailment during the run').toBe(true);
      expect(sawAilmentConsume, 'expected Ash Weaver to naturally consume Ailment with Hex Detonation').toBe(true);
    }

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => {
      const game = window.__JANGAN_LARI_GAME__;
      return Boolean(game?.scene.isActive('MenuScene') && !game.scene.isActive('RunScene') && !game.scene.isActive('UIScene'));
    });
  } finally {
    await releaseKeys(page, pressed);
  }
}

test.describe('milestone 2 real-scene gameplay bot', () => {
  test('Iron Warden reaches a natural support branch and cashes in Disrupted during a real run', async ({ page }) => {
    test.setTimeout(90_000);
    await runNaturalValidation(page, 'runner');
  });

  test('Raptor Frame reaches a natural support branch and cashes in Disrupted during a real run', async ({ page }) => {
    test.setTimeout(90_000);
    await runNaturalValidation(page, 'shade');
  });

  test('Ash Weaver reaches a natural reward branch and proves the Ailment apply-consume loop in a real run', async ({ page }) => {
    test.setTimeout(90_000);
    await runNaturalValidation(page, 'weaver');
  });

  test('late mixed-wave templates surface the added Ailment-pressure roles on the real run scene', async ({ page }) => {
    test.setTimeout(30_000);
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));
    await clickCanvasPosition(page, getHeroCardX('weaver'), 382);
    await clickCanvasPosition(page, 560, 82);
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('RunScene')));

    const seen = await page.evaluate(() => {
      const game = window.__JANGAN_LARI_GAME__!;
      const runScene = game.scene.getScene('RunScene') as {
        runElapsedMs: number;
        spawnEnemyWave: () => void;
        enemies: { getChildren: () => Array<{ archetype: { id: string } }> };
      };

      runScene.runElapsedMs = 330_000;
      const ids = new Set<string>();
      for (let index = 0; index < 20; index += 1) {
        runScene.spawnEnemyWave();
        for (const enemy of runScene.enemies.getChildren()) {
          ids.add(enemy.archetype.id);
        }
      }

      return Array.from(ids);
    });

    expect(seen).toContain('harrier');
    expect(seen).toContain('bulwark');
  });

  test('pressure beats surface on the real snapshot path before the boss window', async ({ page }) => {
    test.setTimeout(30_000);
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));
    await clickCanvasPosition(page, getHeroCardX('runner'), 382);
    await clickCanvasPosition(page, 560, 82);
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('RunScene')));

    const pressureBeat = await page.evaluate(() => {
      const game = window.__JANGAN_LARI_GAME__!;
      const runScene = game.scene.getScene('RunScene') as {
        runElapsedMs: number;
        spawnEnemyWave: () => void;
        getGameplayBotSnapshot: () => { pressureBeat: { active: boolean; id: string; label: string } };
      };

      runScene.runElapsedMs = 182_000;
      runScene.spawnEnemyWave();
      return runScene.getGameplayBotSnapshot().pressureBeat;
    });

    expect(pressureBeat.active).toBe(true);
    expect(pressureBeat.id).toBe('mid-siege-crossfire');
    expect(pressureBeat.label).toBe('Siege Crossfire');
  });

  test('authored encounter-response beats stay visible on the live run path and mark the execution target', async ({ page }) => {
    test.setTimeout(30_000);
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));
    await clickCanvasPosition(page, getHeroCardX('runner'), 382);
    await clickCanvasPosition(page, 560, 82);
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('RunScene')));

    const beats = await page.evaluate(() => {
      const game = window.__JANGAN_LARI_GAME__!;
      const runScene = game.scene.getScene('RunScene') as {
        runElapsedMs: number;
        spawnEnemyWave: () => void;
        getGameplayBotSnapshot: () => {
          pressureBeat: { active: boolean; id: string; label: string };
          waveTemplate: { id: string; label: string; highlight: boolean };
          enemies: Array<{ id?: string; isEventTarget?: boolean }>;
        };
      };

      const checkpoints = [102_000, 156_000, 180_000, 222_000, 264_000];
      return checkpoints.map((elapsedMs) => {
        runScene.runElapsedMs = elapsedMs;
        runScene.spawnEnemyWave();
        const snapshot = runScene.getGameplayBotSnapshot();
        return {
          elapsedMs,
          pressureId: snapshot.pressureBeat.id,
          templateId: snapshot.waveTemplate.id,
          highlight: snapshot.waveTemplate.highlight,
          eventTargetCount: snapshot.enemies.filter((enemy) => enemy.isEventTarget).length,
        };
      });
    });

    expect(beats).toEqual([
      {
        elapsedMs: 102_000,
        pressureId: 'ramp-check',
        templateId: 'ramp-check',
        highlight: true,
        eventTargetCount: 0,
      },
      {
        elapsedMs: 156_000,
        pressureId: 'stabilize-pocket',
        templateId: 'stabilize-pocket',
        highlight: true,
        eventTargetCount: 0,
      },
      {
        elapsedMs: 180_000,
        pressureId: 'mid-siege-crossfire',
        templateId: 'mid-siege-crossfire',
        highlight: true,
        eventTargetCount: 0,
      },
      {
        elapsedMs: 222_000,
        pressureId: 'bunker-break',
        templateId: 'bunker-break',
        highlight: true,
        eventTargetCount: 0,
      },
      {
        elapsedMs: 264_000,
        pressureId: 'execution-window',
        templateId: 'execution-window',
        highlight: true,
        eventTargetCount: 1,
      },
    ]);
  });

  test('state-break execution target resolves from each hero payoff path', async ({ page }) => {
    test.setTimeout(45_000);

    for (const hero of ['runner', 'shade', 'weaver'] as const) {
      await page.goto('/');
      await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));
      await clickCanvasPosition(page, getHeroCardX(hero), 382);
      await clickCanvasPosition(page, 560, 82);
      await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('RunScene')));

      const event = await page.evaluate((selectedHero) => {
        const game = window.__JANGAN_LARI_GAME__!;
        const runScene = game.scene.getScene('RunScene') as {
          runElapsedMs: number;
          player: { x: number; y: number };
          spawnEnemyWave: () => void;
          attemptAbilityUse: (time: number) => void;
          combatStates: {
            gainGuard: (amount: number) => void;
            applyMark: (enemy: { applyMark: (currentTime: number, durationMs: number) => void }, currentTime: number, durationMs: number) => void;
            applyDisrupted: (enemy: { applyDisrupted: (currentTime: number, durationMs: number) => void }, currentTime: number, durationMs: number) => void;
            applyAilment: (enemy: { applyAilment: (currentTime: number, durationMs: number) => void }, currentTime: number, durationMs: number) => void;
          };
          enemies: {
            getChildren: () => Array<{
              x: number;
              y: number;
              isEventMarked: () => boolean;
              body?: { reset?: (x: number, y: number) => void };
            }>;
          };
          getGameplayBotSnapshot: () => NonNullable<Snapshot['run']>;
        };

        [180_000, 222_000, 264_000].forEach((elapsedMs) => {
          runScene.runElapsedMs = elapsedMs;
          runScene.spawnEnemyWave();
        });
        const target = runScene.enemies.getChildren().find((enemy) => enemy.isEventMarked());
        if (!target) {
          throw new Error('State-break target did not spawn.');
        }

        const offsetX = selectedHero === 'runner' ? 92 : selectedHero === 'shade' ? 165 : 112;
        target.x = runScene.player.x + offsetX;
        target.y = runScene.player.y;
        target.body?.reset?.(target.x, target.y);

        if (selectedHero === 'runner') {
          runScene.combatStates.gainGuard(16);
          runScene.combatStates.applyDisrupted(target as never, game.loop.time, 2400);
        } else if (selectedHero === 'shade') {
          runScene.combatStates.applyMark(target as never, game.loop.time, 2400);
        } else {
          runScene.combatStates.applyAilment(target as never, game.loop.time, 2400);
        }

        runScene.attemptAbilityUse(game.loop.time);
        return runScene.getGameplayBotSnapshot().event;
      }, hero);

      expect(event.type).toBe('state-break');
      expect(event.active).toBe(false);
      expect(event.targetStatus, `${hero} should break the state target`).toBe('broken');
      expect(event.rewardTargetSuccesses).toBeGreaterThanOrEqual(1);
      expect(event.rewardTargetFailures).toBe(0);
    }
  });

  test('forced late-run evolution and Behemoth encounter appear together on the live snapshot path', async ({ page }) => {
    test.setTimeout(30_000);
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));
    await clickCanvasPosition(page, getHeroCardX('runner'), 382);
    await clickCanvasPosition(page, 560, 82);
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('RunScene')));

    await page.evaluate(() => {
      const game = window.__JANGAN_LARI_GAME__!;
      const runScene = game.scene.getScene('RunScene') as {
        debugForceReward: (rewardId: 'close-guard' | 'steadfast-posture' | 'citadel-core') => boolean;
        debugForceBossEncounter: () => void;
      };

      runScene.debugForceReward('close-guard');
      runScene.debugForceReward('steadfast-posture');
      runScene.debugForceReward('citadel-core');
      runScene.debugForceBossEncounter();
    });

    const snapshot = await getSnapshot(page);
    expect(snapshot.run?.evolutionId).toBe('citadel-core');
    expect(snapshot.run?.bossActive).toBe(true);
    expect(snapshot.run?.bossName).toBe('Behemoth');
    expect(snapshot.run?.bossProtectors).toBeGreaterThan(0);
    expect(snapshot.run?.bossProtected).toBe(true);
  });

  test('forced alternate late-run branch reaches a second evolution and keeps boss pressure visible', async ({ page }) => {
    test.setTimeout(30_000);
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene')));
    await clickCanvasPosition(page, getHeroCardX('runner'), 382);
    await clickCanvasPosition(page, 560, 82);
    await page.waitForFunction(() => Boolean(window.__JANGAN_LARI_GAME__?.scene.isActive('RunScene')));

    await page.evaluate(() => {
      const game = window.__JANGAN_LARI_GAME__!;
      const runScene = game.scene.getScene('RunScene') as {
        debugForceReward: (rewardId: 'iron-reserve' | 'pressure-lenses' | 'echo-turret' | 'reckoner-drive') => boolean;
        debugForceBossEncounter: () => void;
      };

      runScene.debugForceReward('iron-reserve');
      runScene.debugForceReward('pressure-lenses');
      runScene.debugForceReward('echo-turret');
      runScene.debugForceReward('reckoner-drive');
      runScene.debugForceBossEncounter();
    });

    const snapshot = await getSnapshot(page);
    expect(snapshot.run?.supportAbilityId).toBe('echo-turret');
    expect(snapshot.run?.evolutionId).toBe('reckoner-drive');
    expect(snapshot.run?.bossActive).toBe(true);
    expect(snapshot.run?.bossName).toBe('Behemoth');
  });
});
