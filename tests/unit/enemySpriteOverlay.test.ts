import { vi } from 'vitest';
import { Enemy } from '../../src/game/entities/Enemy';
import { ENEMY_ARCHETYPES, type EnemyArchetypeId } from '../../src/game/data/enemies';
import { getUprightEnemySpritePresentation } from '../../src/game/data/enemySpritePresentation';

// Presentation-only fixture: no Phaser game loop, combat, or survival simulation.
vi.mock('phaser', () => ({ default: {
  GameObjects: { Rectangle: class { destroy() {} } },
  Scenes: { Events: { POST_UPDATE: 'postupdate' } },
} }));

function makeFixture(id: EnemyArchetypeId, loaded = true) {
  const image = Object.fromEntries([
    'setTexture', 'setPosition', 'setAngle', 'setFlipX', 'setDisplaySize',
    'setDepth', 'setAlpha', 'setVisible', 'setTintFill', 'clearTint', 'destroy',
  ].map((name) => [name, vi.fn().mockReturnThis()]));
  const marker = { setVisible: vi.fn(), destroy: vi.fn() };
  const scene = {
    textures: { exists: vi.fn(() => loaded) },
    add: { image: vi.fn(() => image) },
    events: { on: vi.fn(), off: vi.fn() },
    tweens: { killTweensOf: vi.fn() },
  };
  // Exercise the real overlay methods with only their rendering collaborators mocked.
  const enemy = Object.assign(Object.create(Enemy.prototype), {
    archetype: ENEMY_ARCHETYPES[id], scene,
    x: 120, y: 230, angle: 135, depth: id === 'behemoth' ? 6 : id === 'dreadnought' ? 5.5 : 5,
    scaleX: 1.1, scaleY: 0.9, alpha: 0.6, visible: true, active: true,
    fillColor: ENEMY_ARCHETYPES[id].color, isFilled: true, isStroked: true,
    body: { velocity: { x: -100, y: 20 }, setSize: vi.fn(), setVelocity: vi.fn() },
    roleVisuals: [{ object: marker, forward: 0, side: 0, angleOffset: 0 }],
    spriteOverlay: null, spriteOverlayActive: false, spriteFacesLeft: false,
    eventMarkerColor: null, bossOwned: false, responseScale: { x: 1, y: 1 },
  });
  return { enemy, image, marker, scene };
}

const specials: EnemyArchetypeId[] = ['overlord', 'riftblade', 'dreadnought', 'behemoth'];

describe('special enemy decorative overlays', () => {
  test.each(specials)('%s stays upright, aligned, below warnings, with original cues visible', (id) => {
    const { enemy, image, marker, scene } = makeFixture(id);
    const presentation = getUprightEnemySpritePresentation(id)!;
    enemy.refreshSpriteOverlay(scene);
    expect(image.setPosition).toHaveBeenLastCalledWith(120, 230);
    expect(image.setAngle).toHaveBeenLastCalledWith(0);
    expect(image.setFlipX).toHaveBeenLastCalledWith(presentation.flipsWithMovement);
    expect(image.setDisplaySize).toHaveBeenLastCalledWith(presentation.displaySize * 1.1, presentation.displaySize * 0.9);
    expect(image.setDepth).toHaveBeenLastCalledWith(enemy.depth - 0.1);
    expect(enemy.depth - 0.1).toBeLessThan(7); // projectiles and shockwave halo; warnings use depth 8
    expect(image.setAlpha).toHaveBeenLastCalledWith(0.6);
    expect(marker.setVisible).toHaveBeenLastCalledWith(true);
    expect(enemy.isFilled).toBe(false);
    expect(enemy.isStroked).toBe(true);
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
    expect(image.setDisplaySize).toHaveBeenLastCalledWith(84, 112 * 0.9);
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
