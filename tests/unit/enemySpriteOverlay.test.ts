import { afterEach, vi } from 'vitest';
import * as assetResolver from '../../src/game/utils/assetResolver';
import { createBossShockwaveContract, createMinibossLineAttackContract, createMinibossVolleyContract } from '../../src/game/systems/dangerousEffectContracts';
import { Enemy } from '../../src/game/entities/Enemy';
import { ENEMY_ARCHETYPES, type EnemyArchetypeId } from '../../src/game/data/enemies';
import { getUprightEnemySpritePresentation } from '../../src/game/data/enemySpritePresentation';

// Presentation-only fixture: no Phaser game loop, combat, or survival simulation.
vi.mock('phaser', () => ({ default: {
  GameObjects: { Rectangle: class {
    isFilled = true; isStroked = true; fillColor = 0;
    setFillStyle(color?: number) { this.fillColor = color ?? 0; this.isFilled = color !== undefined; return this; }
    setStrokeStyle(width?: number) { this.isStroked = width !== undefined; return this; }
    destroy() {}
  } },
  Math: { DegToRad: (angle: number) => angle * Math.PI / 180, RadToDeg: (angle: number) => angle * 180 / Math.PI,
    Clamp: (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)) },
  Scenes: { Events: { POST_UPDATE: 'postupdate' } },
} }));

function makeFixture(id: EnemyArchetypeId, loaded = true) {
  const image = Object.fromEntries([
    'setTexture', 'setPosition', 'setAngle', 'setFlipX', 'setDisplaySize',
    'setDepth', 'setAlpha', 'setVisible', 'setTintFill', 'clearTint', 'destroy',
  ].map((name) => [name, vi.fn().mockReturnThis()]));
  const marker = Object.fromEntries(['setVisible', 'setPosition', 'setAngle', 'setAlpha', 'destroy'].map((name) => [name, vi.fn().mockReturnThis()]));
  const label = Object.fromEntries(['setOrigin', 'setText', 'setColor', 'setPosition', 'setDepth', 'setAlpha', 'setVisible', 'destroy'].map((name) => [name, vi.fn().mockReturnThis()]));
  const scene = {
    textures: { exists: vi.fn(() => loaded) },
    add: { image: vi.fn(() => image), text: vi.fn(() => label) },
    time: { now: 500 },
    events: { on: vi.fn(), off: vi.fn() },
    tweens: { killTweensOf: vi.fn() },
  };
  // Exercise the real overlay methods with only their rendering collaborators mocked.
  const enemy = Object.assign(Object.create(Enemy.prototype), {
    archetype: ENEMY_ARCHETYPES[id], scene,
    x: 120, y: 230, angle: 135, depth: id === 'behemoth' ? 6 : id === 'dreadnought' ? 5.5 : 5,
    scaleX: 1.1, scaleY: 0.9, alpha: 0.6, visible: true, active: true,
    fillColor: ENEMY_ARCHETYPES[id].color, isFilled: true, isStroked: true,
    body: { velocity: { x: -100, y: 20, lengthSq: () => 10400 }, setSize: vi.fn(), setVelocity: vi.fn() },
    roleVisuals: [{ object: marker, forward: 0, side: 0, angleOffset: 0 }],
    spriteOverlay: null, spriteOverlayActive: false, spriteFacesLeft: false,
    eventMarkerColor: null, bossOwned: false, responseScale: { x: 1, y: 1 },
    spriteStatusLabel: null, baseStrokeWidth: 4, dashUntil: 0, nextDashAt: 1000,
    primedMinibossCharge: null, minibossVolleyQueued: false, shockwaveQueued: false,
    hitReactionUntil: 0, deathPresentationActive: false, health: 100,
    setAngle(angle: number) { this.angle = angle; return this; },
    setScale(x: number, y = x) { this.scaleX = x; this.scaleY = y; return this; },
    setAlpha(alpha: number) { this.alpha = alpha; return this; },
  });
  return { enemy, image, marker, scene, label };
}

afterEach(() => vi.restoreAllMocks());

const specials: EnemyArchetypeId[] = ['overlord', 'riftblade', 'dreadnought', 'behemoth'];

describe('special enemy decorative overlays', () => {
  test.each(specials)('%s stays upright, aligned, below warnings, with legacy body decorations hidden', (id) => {
    const { enemy, image, marker, scene } = makeFixture(id);
    const presentation = getUprightEnemySpritePresentation(id)!;
    enemy.refreshSpriteOverlay(scene);
    expect(image.setPosition).toHaveBeenLastCalledWith(120, 230);
    expect(image.setAngle).toHaveBeenLastCalledWith(0);
    expect(image.setFlipX).toHaveBeenLastCalledWith(presentation.flipsWithMovement);
    expect(image.setDisplaySize).toHaveBeenLastCalledWith(presentation.displaySize * 1.1, presentation.displaySize * 0.9);
    expect(image.setDepth).toHaveBeenLastCalledWith(enemy.depth + 0.35);
    expect(enemy.depth + 0.35).toBeLessThan(7); // projectiles and shockwave halo; warnings use depth 8
    expect(image.setAlpha).toHaveBeenLastCalledWith(0.6);
    expect(marker.setVisible).toHaveBeenLastCalledWith(false);
    expect(enemy.isFilled).toBe(false);
    expect(enemy.isStroked).toBe(false);
    expect(enemy.body.setSize).not.toHaveBeenCalled();
    expect(enemy.body.setVelocity).not.toHaveBeenCalled();
    expect(scene.events.on).toHaveBeenCalledWith('postupdate', enemy.syncSpriteOverlay, enemy);
  });

  test.each(specials)('%s retains fallback at startup and restores it if a texture disappears', (id) => {
    const missing = makeFixture(id, false);
    missing.enemy.refreshSpriteOverlay(missing.scene);
    expect(missing.scene.add.image).not.toHaveBeenCalled();
    expect(missing.scene.events.on).not.toHaveBeenCalled();
    expect(missing.enemy.isFilled).toBe(true);
    expect(missing.enemy.isStroked).toBe(true);

    const { enemy, scene, image, marker } = makeFixture(id);
    enemy.refreshSpriteOverlay(scene);
    scene.textures.exists.mockReturnValue(false);
    enemy.syncSpriteOverlay();
    expect(image.setVisible).toHaveBeenLastCalledWith(false);
    expect(enemy.isFilled).toBe(true);
    expect(enemy.isStroked).toBe(true);
    expect(marker.setVisible).toHaveBeenLastCalledWith(true);
  });

  test('mirrors only directional artwork and retains the previous facing while stationary', () => {
    const { enemy, scene, image } = makeFixture('dreadnought');
    enemy.refreshSpriteOverlay(scene);
    expect(image.setFlipX).toHaveBeenLastCalledWith(true);
    enemy.body.velocity.x = 0;
    enemy.syncSpriteOverlay();
    expect(image.setFlipX).toHaveBeenLastCalledWith(true);
    enemy.body.velocity.x = 100;
    enemy.syncSpriteOverlay();
    expect(image.setFlipX).toHaveBeenLastCalledWith(false);
  });

  test('copies hit/death feedback and visibility, then removes images, cues and listeners', () => {
    const { enemy, scene, image, marker } = makeFixture('behemoth');
    enemy.refreshSpriteOverlay(scene);
    enemy.fillColor = 0xffffff;
    enemy.alpha = 0.2;
    enemy.scaleX = 0.75;
    enemy.syncSpriteOverlay();
    expect(image.setTintFill).toHaveBeenLastCalledWith(0xffffff);
    expect(image.setAlpha).toHaveBeenLastCalledWith(0.2);
    const behemothSize = getUprightEnemySpritePresentation('behemoth')!.displaySize;
    expect(image.setDisplaySize).toHaveBeenLastCalledWith(behemothSize * 0.75, behemothSize * 0.9);
    enemy.fillColor = enemy.archetype.color;
    enemy.visible = false;
    enemy.syncSpriteOverlay();
    expect(image.clearTint).toHaveBeenCalled();
    expect(image.setVisible).toHaveBeenLastCalledWith(false);
    expect(marker.setVisible).toHaveBeenLastCalledWith(false);
    enemy.destroy();
    expect(image.destroy).toHaveBeenCalledOnce();
    expect(marker.destroy).toHaveBeenCalledOnce();
    expect(scene.events.off).toHaveBeenCalledWith('postupdate', enemy.syncSpriteOverlay, enemy);
    expect(enemy.spriteOverlay).toBeNull();
  });
});


describe('special sprite update and warning isolation', () => {
  test.each(specials)('%s never re-enables geometry through presentation, role or style updates', (id) => {
    const { enemy, scene, marker } = makeFixture(id);
    enemy.refreshSpriteOverlay(scene);
    const originalBody = enemy.body;
    for (const now of [500, 740, 900, 1000]) {
      scene.time.now = now;
      enemy.updatePresentation(now);
      expect(enemy.isFilled).toBe(false);
      expect(enemy.isStroked).toBe(false);
      expect(marker.setVisible).toHaveBeenLastCalledWith(false);
      // Hit flash and delayed reset callbacks use these same real setters.
      enemy.setFillStyle(0xffffff);
      enemy.setStrokeStyle(5, 0xffffff, 1);
      enemy.syncRoleVisuals();
      expect(enemy.isFilled).toBe(false);
      expect(enemy.isStroked).toBe(false);
      expect(marker.setVisible).toHaveBeenLastCalledWith(false);
      enemy.syncSpriteOverlay();
    }
    expect(enemy.body).toBe(originalBody);
    expect(enemy.body.setSize).not.toHaveBeenCalled();
    expect(enemy.body.setVelocity).not.toHaveBeenCalled();
    expect(enemy.body.velocity.x).toBe(-100);
    expect(enemy.body.velocity.y).toBe(20);
  });

  test.each(specials)('%s restores full fallback when approval is disabled', (id) => {
    const { enemy, scene, image, marker, label } = makeFixture(id);
    enemy.refreshSpriteOverlay(scene);
    vi.spyOn(assetResolver, 'shouldUseVisualAsset').mockReturnValue(false);
    enemy.syncSpriteOverlay();
    enemy.updatePresentation(800);
    enemy.syncRoleVisuals();
    expect(enemy.isFilled).toBe(true);
    expect(enemy.isStroked).toBe(true);
    expect(marker.setVisible).toHaveBeenLastCalledWith(true);
    expect(image.setVisible).toHaveBeenLastCalledWith(false);
    expect(label.setVisible).not.toHaveBeenCalledWith(true);
  });

  test.each(['overlord', 'riftblade'] as const)('%s retains the exact charge warning window as text', (id) => {
    const { enemy, scene, label } = makeFixture(id);
    enemy.refreshSpriteOverlay(scene);
    scene.time.now = 739;
    enemy.syncSpriteOverlay();
    expect(scene.add.text).not.toHaveBeenCalled();
    for (const now of [740, 999]) {
      scene.time.now = now;
      enemy.syncSpriteOverlay();
      expect(label.setText).toHaveBeenLastCalledWith('CHARGE');
      expect(label.setVisible).toHaveBeenLastCalledWith(true);
      expect(enemy.isStroked).toBe(false);
    }
    scene.time.now = 1000;
    enemy.syncSpriteOverlay();
    expect(label.setVisible).toHaveBeenLastCalledWith(false);
    expect(enemy.nextDashAt).toBe(1000);
  });

  test.each([
    ['dreadnought', 'miniboss-line-telegraph', 'CHARGE'],
    ['dreadnought', 'miniboss-volley-telegraph', 'VOLLEY'],
    ['behemoth', 'boss-shockwave-telegraph', 'SHOCKWAVE'],
  ] as const)('%s preserves %s signals and contracts while hiding its body', (id, type, text) => {
    const { enemy, scene, label } = makeFixture(id);
    const contracts = () => [createMinibossLineAttackContract(), createMinibossVolleyContract(), createBossShockwaveContract(1), createBossShockwaveContract(2)];
    const before = contracts();
    const signal = { type, x: 120, y: 230, direction: { x: 1, y: 0 }, length: 610, radius: 300 };
    enemy.pendingAttackSignal = signal;
    enemy.primedMinibossCharge = text === 'CHARGE' ? { x: 1, y: 0 } : null;
    enemy.minibossVolleyQueued = text === 'VOLLEY';
    enemy.minibossVolleyWindupUntil = 1000;
    enemy.shockwaveQueued = text === 'SHOCKWAVE';
    enemy.shockwaveWindupUntil = 1000;
    enemy.refreshSpriteOverlay(scene);
    enemy.updatePresentation(500);
    enemy.syncSpriteOverlay();
    expect(label.setText).toHaveBeenLastCalledWith(text);
    expect(enemy.consumePendingAttackSignal()).toBe(signal);
    expect(contracts()).toEqual(before);
    expect(enemy.nextDashAt).toBe(1000);
    expect(enemy.minibossVolleyWindupUntil).toBe(1000);
    expect(enemy.shockwaveWindupUntil).toBe(1000);
    expect(enemy.isStroked).toBe(false);
  });

  test('retains event/summon identification as text and cleans up the separate label', () => {
    const { enemy, scene, label } = makeFixture('overlord');
    enemy.setEventMarker(0xfbbf24);
    enemy.setBossOwned(true);
    enemy.refreshSpriteOverlay(scene);
    expect(label.setText).toHaveBeenLastCalledWith('EVENT / SUMMON');
    expect(label.setColor).toHaveBeenLastCalledWith('#fbbf24');
    expect(enemy.isStroked).toBe(false);
    enemy.deathPresentationActive = true;
    enemy.syncSpriteOverlay();
    expect(label.setVisible).toHaveBeenLastCalledWith(false);
    enemy.destroy();
    expect(label.destroy).toHaveBeenCalledOnce();
  });

  test('leaves common-enemy event strokes and status presentation unchanged', () => {
    const { enemy, scene } = makeFixture('scuttler');
    enemy.setEventMarker(0xfbbf24);
    enemy.refreshSpriteOverlay(scene);
    expect(enemy.isStroked).toBe(true);
    expect(scene.add.text).not.toHaveBeenCalled();
  });
});

describe('R3H-B enemy silhouette readability and hierarchy', () => {
  const allEnemies: EnemyArchetypeId[] = [
    'scuttler',
    'mauler',
    'hexcaster',
    'harrier',
    'skimmer',
    'crusher',
    'bulwark',
    'riftblade',
    'overlord',
    'dreadnought',
    'behemoth',
  ];

  function createGraphicsStub() {
    const stub = {
      x: 0,
      y: 0,
      angle: 0,
      scaleX: 1,
      scaleY: 1,
      depth: 0,
      alpha: 1,
      visible: true,
      clear: vi.fn().mockReturnThis(),
      fillStyle: vi.fn().mockReturnThis(),
      fillEllipse: vi.fn().mockReturnThis(),
      fillCircle: vi.fn().mockReturnThis(),
      lineStyle: vi.fn().mockReturnThis(),
      strokeCircle: vi.fn().mockReturnThis(),
      beginPath: vi.fn().mockReturnThis(),
      moveTo: vi.fn().mockReturnThis(),
      lineTo: vi.fn().mockReturnThis(),
      closePath: vi.fn().mockReturnThis(),
      fillPath: vi.fn().mockReturnThis(),
      strokePath: vi.fn().mockReturnThis(),
      setPosition: vi.fn((x: number, y: number) => {
        stub.x = x;
        stub.y = y;
        return stub;
      }),
      setAngle: vi.fn((angle: number) => {
        stub.angle = angle;
        return stub;
      }),
      setScale: vi.fn((sx: number, sy = sx) => {
        stub.scaleX = sx;
        stub.scaleY = sy;
        return stub;
      }),
      setDepth: vi.fn((d: number) => {
        stub.depth = d;
        return stub;
      }),
      setAlpha: vi.fn((a: number) => {
        stub.alpha = a;
        return stub;
      }),
      setVisible: vi.fn((v: boolean) => {
        stub.visible = v;
        return stub;
      }),
      destroy: vi.fn(),
    };
    return stub;
  }

  test('preserves exact ENEMY_ARCHETYPES sizes and enforces readable mobile tier hierarchy', () => {
    const expectedArchetypeSizes: Record<EnemyArchetypeId, number> = {
      scuttler: 22,
      skimmer: 36,
      harrier: 34,
      mauler: 30,
      crusher: 34,
      bulwark: 40,
      hexcaster: 28,
      overlord: 48,
      riftblade: 42,
      dreadnought: 58,
      behemoth: 72,
    };

    for (const id of allEnemies) {
      expect(ENEMY_ARCHETYPES[id].size).toBe(expectedArchetypeSizes[id]);
      expect(getUprightEnemySpritePresentation(id)).not.toBeNull();
    }

    const sizeOf = (id: EnemyArchetypeId) => getUprightEnemySpritePresentation(id)!.displaySize;
    expect(sizeOf('scuttler')).toBe(52);
    expect(sizeOf('mauler')).toBe(54);
    expect(sizeOf('hexcaster')).toBe(56);
    expect(sizeOf('harrier')).toBe(58);
    expect(sizeOf('skimmer')).toBe(60);
    expect(sizeOf('crusher')).toBe(66);
    expect(sizeOf('bulwark')).toBe(68);
    expect(sizeOf('riftblade')).toBe(78);
    expect(sizeOf('overlord')).toBe(88);
    expect(sizeOf('dreadnought')).toBe(112);
    expect(sizeOf('behemoth')).toBe(138);

    // Clear visual progression: small < larger regulars < elites < miniboss < boss
    expect(sizeOf('scuttler')).toBeLessThan(sizeOf('bulwark'));
    expect(sizeOf('bulwark')).toBeLessThan(sizeOf('riftblade'));
    expect(sizeOf('overlord')).toBeLessThan(sizeOf('dreadnought'));
    expect(sizeOf('dreadnought')).toBeLessThan(sizeOf('behemoth'));
  });

  test.each(allEnemies)('%s builds cached silhouette graphics strictly below warnings/projectiles and cleans them up', (id) => {
    const fixture = makeFixture(id, true);
    const createdGraphics: ReturnType<typeof createGraphicsStub>[] = [];
    (fixture.scene.add as unknown as { graphics: ReturnType<typeof vi.fn> }).graphics = vi.fn(() => {
      const g = createGraphicsStub();
      createdGraphics.push(g);
      return g;
    });

    (fixture.enemy as unknown as { refreshSpriteOverlay: (s: unknown) => void }).refreshSpriteOverlay(fixture.scene);

    // Every sprite builds back silhouette graphics; cropped/crowned enemies also keep front crest/caps
    const expectsFront = id === 'crusher' || id === 'dreadnought' || id === 'overlord' || id === 'riftblade' || id === 'behemoth';
    const [back, frontAttempt] = createdGraphics;
    expect(back).toBeDefined();
    expect(back.depth).toBeLessThan(fixture.enemy.depth);
    expect(back.visible).toBe(true);

    const presentation = getUprightEnemySpritePresentation(id)!;
    expect(back.scaleX).toBeCloseTo((presentation.flipsWithMovement ? -1 : 1) * 1.1, 4);

    if (expectsFront) {
      expect(frontAttempt.destroy).not.toHaveBeenCalled();
      expect(frontAttempt.depth).toBeLessThan(7);
      expect(frontAttempt.visible).toBe(true);
    } else {
      expect(frontAttempt.destroy).toHaveBeenCalledOnce();
    }

    // Revoking texture hides both silhouette graphics cleanly alongside sprite
    fixture.scene.textures.exists.mockReturnValue(false);
    (fixture.enemy as unknown as { syncSpriteOverlay: () => void }).syncSpriteOverlay();
    expect(back.visible).toBe(false);
    if (expectsFront) {
      expect(frontAttempt.visible).toBe(false);
    }

    // Destroy cleans up all created graphics
    (fixture.enemy as unknown as { destroy: () => void }).destroy();
    expect(back.destroy).toHaveBeenCalledOnce();
    if (expectsFront) {
      expect(frontAttempt.destroy).toHaveBeenCalledOnce();
    }
  });
});
