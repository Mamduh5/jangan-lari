import { expect, test, type Page, type TestInfo } from '@playwright/test';
import type Phaser from 'phaser';
import type { Enemy } from '../../src/game/entities/Enemy';
import type { Player } from '../../src/game/entities/Player';

type VisualPlayer = Omit<Player, never> & { skinOverlay: Phaser.GameObjects.Image | null };
type VisualEnemy = Omit<Enemy, never> & {
  spriteOverlay: Phaser.GameObjects.Image | null;
  deathPresentationActive: boolean;
};
type VisualRun = Phaser.Scene & {
  player: VisualPlayer;
  enemies: Phaser.Physics.Arcade.Group;
  debugClearEnemies(): void;
  debugSpawnEnemyNearPlayer(id: string, x: number, y: number): boolean;
};
type EvidenceWindow = Window & {
  __r3aEnemy?: VisualEnemy;
  __r3aOldImages?: Phaser.GameObjects.Image[];
  __r3aLoaderErrors?: string[];
};

const targetPaths = ['/assets/heroes/skin-runner.png', '/assets/enemies/sprite-enemy-scuttler.png'];

test.describe('Runner and Scuttler reviewed sprite integration', () => {
  test.use({ viewport: { width: 844, height: 390 } });

  test('mobile movement and Scuttler spawn, chase, hit and death keep overlays aligned', async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    const errors = monitorErrors(page);
    await startRun(page);
    const alive = await snapshot(page);
    expect(alive.player.image?.key).toBe('skin-runner');
    expect(alive.player.type).toBe('Rectangle');
    expect(alive.player.bodySize).toEqual([23, 23]);
    assertAligned(alive.player);
    await screenshot(page, testInfo, 'runner-alive');

    await moveRunner(page);
    const moving = await snapshot(page);
    expect(Math.hypot(moving.player.x - alive.player.x, moving.player.y - alive.player.y)).toBeGreaterThan(8);
    expect(moving.movementSource).toBe('pointer');
    assertAligned(moving.player);
    await screenshot(page, testInfo, 'runner-moving');
    await page.mouse.up();

    await spawnTrackedScuttler(page);
    const spawned = await snapshot(page);
    expect(spawned.enemy?.image?.key).toBe('sprite-enemy-scuttler');
    expect(spawned.enemy?.type).toBe('Rectangle');
    expect(spawned.enemy?.bodySize).toEqual([16, 16]);
    assertAligned(spawned.enemy!);
    await screenshot(page, testInfo, 'scuttler-spawn');
    await resumeRun(page);
    await page.waitForFunction((start) => {
      const enemy = (window as EvidenceWindow).__r3aEnemy;
      return Boolean(enemy?.active && Math.hypot(enemy.x - start.x, enemy.y - start.y) > 10);
    }, { x: spawned.enemy!.x, y: spawned.enemy!.y });
    await pauseAfterPresentation(page);
    const chasing = await snapshot(page);
    assertAligned(chasing.enemy!);
    const facing = Math.atan2(chasing.enemy!.velocity.y, chasing.enemy!.velocity.x) * 180 / Math.PI;
    expect(angleDistance(chasing.enemy!.image!.angle, facing)).toBeLessThan(0.01);
    await screenshot(page, testInfo, 'scuttler-chasing');

    await damageAndPause(page, false);
    const hit = await snapshot(page);
    expect(hit.enemy!.health).toBeLessThan(chasing.enemy!.health);
    expect(hit.enemy!.image!.tintFill).toBe(true);
    assertAligned(hit.enemy!);
    await screenshot(page, testInfo, 'scuttler-hit-flash');

    await damageAndPause(page, true);
    const dying = await snapshot(page);
    expect(dying.enemy!.deathPresentationActive).toBe(true);
    expect(dying.enemy!.bodyEnabled).toBe(false);
    expect(dying.enemy!.image!.visible).toBe(true);
    assertAligned(dying.enemy!);
    await screenshot(page, testInfo, 'scuttler-dying');
    await resumeRun(page);
    await page.waitForFunction(() => !(window as EvidenceWindow).__r3aEnemy?.active);
    expect(await page.evaluate(() => (window as EvidenceWindow).__r3aEnemy?.spriteOverlay ?? null)).toBeNull();
    await screenshot(page, testInfo, 'scuttler-death-cleanup');
    expect(errors).toEqual([]);
  });

  test('dense mobile scene and two UI restarts keep only reviewed sprites and clean old images', async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    const errors = monitorErrors(page);
    await startRun(page);
    await page.evaluate(() => {
      const run = window.__JANGAN_LARI_GAME__!.scene.getScene('RunScene') as VisualRun;
      run.debugClearEnemies();
      for (let index = 0; index < 18; index += 1) {
        const angle = index * Math.PI * 2 / 18;
        run.debugSpawnEnemyNearPlayer('scuttler', Math.cos(angle) * 190, Math.sin(angle) * 125);
      }
    });
    await pauseAfterPresentation(page);
    const density = await page.evaluate(() => {
      const run = window.__JANGAN_LARI_GAME__!.scene.getScene('RunScene') as VisualRun;
      return (run.enemies.getChildren() as unknown as VisualEnemy[]).filter((enemy) => enemy.spriteOverlay?.visible).length;
    });
    expect(density).toBeGreaterThanOrEqual(15);
    await screenshot(page, testInfo, 'dense-mobile-wave');
    await resumeRun(page);

    for (let cycle = 1; cycle <= 2; cycle += 1) {
      await page.evaluate(() => {
        const run = window.__JANGAN_LARI_GAME__!.scene.getScene('RunScene') as VisualRun;
        (window as EvidenceWindow).__r3aOldImages = run.children.list.filter((child) =>
          child.type === 'Image' && ['skin-runner', 'sprite-enemy-scuttler'].includes((child as Phaser.GameObjects.Image).texture.key),
        ) as Phaser.GameObjects.Image[];
      });
      await restartUsingUi(page);
      await page.waitForFunction(() => (window as EvidenceWindow).__r3aOldImages!.every((image) => !image.active));
      await spawnTrackedScuttler(page);
      const restarted = await snapshot(page);
      assertAligned(restarted.player);
      assertAligned(restarted.enemy!);
      const counts = await page.evaluate(() => {
        const game = window.__JANGAN_LARI_GAME__!;
        const run = game.scene.getScene('RunScene') as VisualRun;
        return {
          runner: run.children.list.filter((child) => child.type === 'Image' && (child as Phaser.GameObjects.Image).texture.key === 'skin-runner').length,
          unreviewed: ['skin-vanguard', 'skin-shade', 'skin-verdant', 'sprite-enemy-skimmer', 'sprite-enemy-miniboss-dreadnought', 'sprite-enemy-boss-behemoth'].filter((key) => game.textures.exists(key)),
        };
      });
      expect(counts).toEqual({ runner: 1, unreviewed: [] });
      await screenshot(page, testInfo, `restart-${cycle}`);
      await resumeRun(page);
    }
    expect(errors).toEqual([]);
  });

  test('unavailable target PNGs keep playable shape fallback without Phaser loader errors', async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    const errors = monitorErrors(page, true);
    const failedTargets: string[] = [];
    await page.addInitScript(() => {
      const evidence = window as EvidenceWindow;
      evidence.__r3aLoaderErrors = [];
      let currentGame: Phaser.Game | undefined;
      const observed = new WeakSet<Phaser.Scene>();
      const attach = () => {
        for (const scene of currentGame?.scene.scenes ?? []) {
          if (!scene.load || observed.has(scene)) continue;
          observed.add(scene);
          scene.load.on('loaderror', (file: { key: string }) => evidence.__r3aLoaderErrors!.push(file.key));
        }
      };
      Object.defineProperty(window, '__JANGAN_LARI_GAME__', {
        configurable: true,
        get: () => currentGame,
        set: (game: Phaser.Game) => {
          currentGame = game;
          attach();
          game.events.on('ready', attach);
          game.events.on('prestep', attach);
        },
      });
    });
    for (const path of targetPaths) {
      await page.route(`**${path}`, async (route) => {
        failedTargets.push(path);
        await route.fulfill({ status: 404, contentType: 'text/plain', body: 'Intentional R3A missing-asset test' });
      });
    }
    await startRun(page);
    expect([...new Set(failedTargets)].sort()).toEqual([...targetPaths].sort());
    await spawnTrackedScuttler(page);
    const fallback = await snapshot(page);
    expect(fallback.player.image).toBeNull();
    expect(fallback.enemy!.image).toBeNull();
    expect(fallback.player.visible).toBe(true);
    expect(fallback.enemy!.visible).toBe(true);
    expect(fallback.player.isFilled).toBe(true);
    expect(fallback.player.isStroked).toBe(true);
    expect(fallback.enemy!.isFilled).toBe(true);
    expect(fallback.enemy!.isStroked).toBe(true);
    expect(fallback.player.bodyEnabled).toBe(true);
    expect(fallback.enemy!.bodyEnabled).toBe(true);
    await screenshot(page, testInfo, 'missing-texture-fallback');
    await resumeRun(page);
    await moveRunner(page);
    const moved = await snapshot(page);
    expect(Math.hypot(moved.player.x - fallback.player.x, moved.player.y - fallback.player.y)).toBeGreaterThan(8);
    expect(moved.player.image).toBeNull();
    expect(moved.enemy).not.toBeNull();
    expect(Math.hypot(moved.enemy!.x - fallback.enemy!.x, moved.enemy!.y - fallback.enemy!.y)).toBeGreaterThan(10);
    expect(moved.enemy!.image).toBeNull();
    await page.mouse.up();
    expect(await page.evaluate(() => (window as EvidenceWindow).__r3aLoaderErrors)).toEqual([]);
    expect(errors).toEqual([]);
  });
});

async function startRun(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => window.__JANGAN_LARI_GAME__?.scene.isActive('MenuScene'));
  const start = await page.evaluate(() => {
    const menu = window.__JANGAN_LARI_GAME__!.scene.getScene('MenuScene') as Phaser.Scene & { getMenuSnapshot(): { startButton: { x: number; y: number } } };
    return menu.getMenuSnapshot().startButton;
  });
  await clickCanvas(page, start.x, start.y);
  await page.waitForFunction(() => window.__JANGAN_LARI_GAME__?.scene.isActive('RunScene') && window.__JANGAN_LARI_GAME__?.scene.isActive('UIScene'));
}

async function moveRunner(page: Page): Promise<void> {
  const start = await canvasPoint(page, 140, 300);
  const end = await canvasPoint(page, 240, 300);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 4 });
  await page.waitForTimeout(240);
}

async function spawnTrackedScuttler(page: Page): Promise<void> {
  await page.evaluate(() => {
    const run = window.__JANGAN_LARI_GAME__!.scene.getScene('RunScene') as VisualRun;
    run.debugClearEnemies();
    if (!run.debugSpawnEnemyNearPlayer('scuttler', -200, 55)) throw new Error('Scuttler spawn rejected');
    (window as EvidenceWindow).__r3aEnemy = (run.enemies.getChildren() as unknown as VisualEnemy[]).find((enemy) => enemy.archetype.id === 'scuttler');
  });
  await pauseAfterPresentation(page);
}

async function pauseAfterPresentation(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((resolve) => {
    const run = window.__JANGAN_LARI_GAME__!.scene.getScene('RunScene');
    // Existing overlay post-update listeners run first; pausing keeps this real frame available for evidence.
    run.events.once('postupdate', () => { run.scene.pause(); resolve(); });
  }));
}

async function resumeRun(page: Page): Promise<void> {
  await page.evaluate(() => window.__JANGAN_LARI_GAME__!.scene.resume('RunScene'));
}

async function damageAndPause(page: Page, lethal: boolean): Promise<void> {
  await page.evaluate((kill) => new Promise<void>((resolve) => {
    const run = window.__JANGAN_LARI_GAME__!.scene.getScene('RunScene') as VisualRun;
    const enemy = (window as EvidenceWindow).__r3aEnemy!;
    if (!enemy?.isAlive()) throw new Error('Tracked Scuttler is not alive');
    run.scene.resume();
    enemy.takeDamage(kill ? enemy.getCurrentHealth() : 1, { x: enemy.x - 10, y: enemy.y });
    run.events.once('postupdate', () => { run.scene.pause(); resolve(); });
  }), lethal);
}

async function restartUsingUi(page: Page): Promise<void> {
  const pause = await page.evaluate(() => {
    const ui = window.__JANGAN_LARI_GAME__!.scene.getScene('UIScene') as Phaser.Scene & { getHudSnapshot(): { pauseButton: { x: number; y: number } } };
    return ui.getHudSnapshot().pauseButton;
  });
  await clickCanvas(page, pause.x, pause.y);
  await page.waitForFunction(() => window.__JANGAN_LARI_GAME__!.registry.get('run.pauseMenuActive'));
  const restart = await page.evaluate(() => {
    const ui = window.__JANGAN_LARI_GAME__!.scene.getScene('UIScene') as Phaser.Scene & { getHudSnapshot(): { pauseMenuButtonBounds: Array<{ text: string; x: number; y: number }> } };
    const button = ui.getHudSnapshot().pauseMenuButtonBounds.find((entry) => entry.text === 'Restart Run');
    if (!button) throw new Error('Restart button missing');
    return button;
  });
  await clickCanvas(page, restart.x, restart.y);
  await page.waitForFunction(() => window.__JANGAN_LARI_GAME__!.scene.isActive('RunScene') && !window.__JANGAN_LARI_GAME__!.registry.get('run.pauseMenuActive'));
}

async function snapshot(page: Page) {
  return page.evaluate(() => {
    const game = window.__JANGAN_LARI_GAME__!;
    const run = game.scene.getScene('RunScene') as VisualRun;
    const describe = (entity: VisualPlayer | VisualEnemy, image: Phaser.GameObjects.Image | null) => ({
      x: entity.x, y: entity.y, angle: entity.angle, alpha: entity.alpha, visible: entity.visible,
      type: entity.type, depth: entity.depth, scaleX: entity.scaleX, scaleY: entity.scaleY,
      baseDisplaySize: 'archetype' in entity ? entity.archetype.size * 1.24 : 32 * 1.35,
      expectedImageAngle: 'archetype' in entity ? entity.angle - 90 : entity.angle,
      isFilled: entity.isFilled, isStroked: entity.isStroked,
      bodySize: [entity.body.width, entity.body.height], bodyEnabled: entity.body.enable,
      velocity: { x: entity.body.velocity.x, y: entity.body.velocity.y }, health: entity.getCurrentHealth(),
      image: image ? {
        key: image.texture.key, x: image.x, y: image.y, angle: image.angle, alpha: image.alpha,
        visible: image.visible, depth: image.depth, width: image.displayWidth, height: image.displayHeight,
        tintFill: image.tintFill,
      } : null,
    });
    const enemy = (window as EvidenceWindow).__r3aEnemy;
    return {
      player: describe(run.player, run.player.skinOverlay),
      enemy: enemy?.active ? { ...describe(enemy, enemy.spriteOverlay), deathPresentationActive: enemy.deathPresentationActive } : null,
      movementSource: window.__JANGAN_LARI_DEBUG__?.getGameplaySnapshot().run?.input.movementSource,
    };
  });
}

type EntitySnapshot = Awaited<ReturnType<typeof snapshot>>['player'];
function assertAligned(entity: EntitySnapshot): void {
  expect(entity.image).not.toBeNull();
  expect(entity.image!.x).toBeCloseTo(entity.x, 4);
  expect(entity.image!.y).toBeCloseTo(entity.y, 4);
  expect(entity.image!.alpha).toBeCloseTo(entity.alpha, 4);
  expect(entity.image!.visible).toBe(entity.visible);
  expect(entity.image!.depth).toBeGreaterThan(entity.depth);
  expect(entity.image!.width / entity.baseDisplaySize).toBeCloseTo(entity.scaleX, 4);
  expect(entity.image!.height / entity.baseDisplaySize).toBeCloseTo(entity.scaleY, 4);
  expect(angleDistance(entity.image!.angle, entity.expectedImageAngle)).toBeLessThan(0.01);
}

function angleDistance(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180);
}

async function screenshot(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

async function canvasPoint(page: Page, x: number, y: number) {
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('Canvas missing');
  const size = await page.evaluate(() => ({ width: window.__JANGAN_LARI_GAME__!.scale.width, height: window.__JANGAN_LARI_GAME__!.scale.height }));
  return { x: box.x + x * box.width / size.width, y: box.y + y * box.height / size.height };
}

async function clickCanvas(page: Page, x: number, y: number): Promise<void> {
  const point = await canvasPoint(page, x, y);
  await page.mouse.click(point.x, point.y);
}

function monitorErrors(page: Page, expectedMissing = false): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const targetRequest = targetPaths.some((path) => message.location().url.endsWith(path));
    if (expectedMissing && targetRequest && message.text().includes('404')) return;
    errors.push(message.text());
  });
  return errors;
}
