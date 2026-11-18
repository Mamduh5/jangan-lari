import { afterEach, describe, expect, test, vi } from 'vitest';
import { HEROES, HERO_IDS, type HeroId } from '../../src/game/data/heroes';
import { getHeroSpritePresentation } from '../../src/game/data/heroSpritePresentation';

vi.mock('phaser', () => {
  class MockGraphics {
    depth = 0;
    alpha = 1;
    rotation = 0;
    visible = true;
    x = 0;
    y = 0;
    scaleX = 1;
    scaleY = 1;
    clear = vi.fn().mockReturnThis();
    fillStyle = vi.fn().mockReturnThis();
    fillEllipse = vi.fn().mockReturnThis();
    fillCircle = vi.fn().mockReturnThis();
    lineStyle = vi.fn().mockReturnThis();
    strokeCircle = vi.fn().mockReturnThis();
    beginPath = vi.fn().mockReturnThis();
    moveTo = vi.fn().mockReturnThis();
    lineTo = vi.fn().mockReturnThis();
    closePath = vi.fn().mockReturnThis();
    fillPath = vi.fn().mockReturnThis();
    strokePath = vi.fn().mockReturnThis();
    setDepth = vi.fn((d: number) => {
      this.depth = d;
      return this;
    });
    setPosition = vi.fn((x: number, y: number) => {
      this.x = x;
      this.y = y;
      return this;
    });
    setScale = vi.fn((x: number, y = x) => {
      this.scaleX = x;
      this.scaleY = y;
      return this;
    });
    setRotation = vi.fn((rad: number) => {
      this.rotation = rad;
      return this;
    });
    setAlpha = vi.fn((a: number) => {
      this.alpha = a;
      return this;
    });
    setVisible = vi.fn((v: boolean) => {
      this.visible = v;
      return this;
    });
    destroy = vi.fn();
  }

  class MockImage {
    depth = 0;
    alpha = 1;
    visible = true;
    x = 0;
    y = 0;
    displayWidth = 0;
    displayHeight = 0;
    flipX = false;
    angle = 0;
    tintFill = 0;
    textureKey = '';
    setTexture = vi.fn((key: string) => {
      this.textureKey = key;
      return this;
    });
    setPosition = vi.fn((x: number, y: number) => {
      this.x = x;
      this.y = y;
      return this;
    });
    setAngle = vi.fn((angle: number) => {
      this.angle = angle;
      return this;
    });
    setFlipX = vi.fn((flip: boolean) => {
      this.flipX = flip;
      return this;
    });
    setDisplaySize = vi.fn((w: number, h: number) => {
      this.displayWidth = w;
      this.displayHeight = h;
      return this;
    });
    setDepth = vi.fn((d: number) => {
      this.depth = d;
      return this;
    });
    setAlpha = vi.fn((a: number) => {
      this.alpha = a;
      return this;
    });
    setVisible = vi.fn((v: boolean) => {
      this.visible = v;
      return this;
    });
    setTint = vi.fn((color: number) => {
      this.tintFill = color;
      return this;
    });
    setTintFill = vi.fn((color: number) => {
      this.tintFill = color;
      return this;
    });
    clearTint = vi.fn(() => {
      this.tintFill = 0;
      return this;
    });
    destroy = vi.fn();
  }

  class MockShape {
    scene: any;
    x = 0;
    y = 0;
    width = 0;
    height = 0;
    depth = 0;
    alpha = 1;
    angle = 0;
    scaleX = 1;
    scaleY = 1;
    visible = true;
    active = true;
    isFilled = true;
    isStroked = true;
    fillColor = 0;
    constructor(scene?: any, x = 0, y = 0) {
      this.scene = scene;
      this.x = x;
      this.y = y;
    }
    body = {
      setCollideWorldBounds: vi.fn(),
      setDrag: vi.fn(),
      setMaxVelocity: vi.fn(),
      setSize: vi.fn(),
      setVelocity: vi.fn(),
      setAcceleration: vi.fn(),
    };
    setOrigin = vi.fn().mockReturnThis();
    setDepth = vi.fn((d: number) => {
      this.depth = d;
      return this;
    });
    setBlendMode = vi.fn().mockReturnThis();
    setStrokeStyle = vi.fn().mockReturnThis();
    setFillStyle = vi.fn((color?: number) => {
      this.fillColor = color ?? 0;
      return this;
    });
    setPosition = vi.fn((x: number, y: number) => {
      this.x = x;
      this.y = y;
      return this;
    });
    setScale = vi.fn((x: number, y = x) => {
      this.scaleX = x;
      this.scaleY = y;
      return this;
    });
    setSize = vi.fn().mockReturnThis();
    setAngle = vi.fn((a: number) => {
      this.angle = a;
      return this;
    });
    setAlpha = vi.fn((a: number) => {
      this.alpha = a;
      return this;
    });
    setVisible = vi.fn((v: boolean) => {
      this.visible = v;
      return this;
    });
    destroy(_fromScene?: boolean) {}
  }

  class MockVector2 {
    x: number;
    y: number;
    constructor(x = 0, y = 0) {
      this.x = x;
      this.y = y;
    }
    setToPolar(angleRad: number, mag = 1) {
      this.x = Math.cos(angleRad) * mag;
      this.y = Math.sin(angleRad) * mag;
      return this;
    }
    copy(other: { x: number; y: number }) {
      this.x = other.x;
      this.y = other.y;
      return this;
    }
    lengthSq() {
      return this.x * this.x + this.y * this.y;
    }
    normalize() {
      const len = Math.hypot(this.x, this.y) || 1;
      this.x /= len;
      this.y /= len;
      return this;
    }
    angle() {
      return Math.atan2(this.y, this.x);
    }
  }

  return {
    default: {
      GameObjects: {
        Rectangle: MockShape,
        Arc: MockShape,
        Graphics: MockGraphics,
        Image: MockImage,
        Shape: MockShape,
      },
      Math: {
        Vector2: MockVector2,
        DegToRad: (deg: number) => (deg * Math.PI) / 180,
        RadToDeg: (rad: number) => (rad * 180) / Math.PI,
        Clamp: (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)),
      },
      BlendModes: { ADD: 1, NORMAL: 0 },
      Scenes: { Events: { POST_UPDATE: 'postupdate' } },
    },
  };
});

import Phaser from 'phaser';
import { Player } from '../../src/game/entities/Player';

function createPlayerFixture(heroId: HeroId, loaded = true) {
  const createdGraphics: any[] = [];
  const createdImages: any[] = [];
  const listeners = new Map<string, Array<{ fn: (...args: unknown[]) => void; ctx: unknown }>>();
  const scene = {
    textures: { exists: vi.fn(() => loaded) },
    time: { now: 1_000, delayedCall: vi.fn() },
    events: {
      on: vi.fn((event: string, fn: (...args: unknown[]) => void, ctx?: unknown) => {
        const list = listeners.get(event) ?? [];
        list.push({ fn, ctx });
        listeners.set(event, list);
      }),
      off: vi.fn(),
    },
    physics: {
      add: {
        existing: vi.fn(),
      },
    },
    add: {
      existing: vi.fn(),
      circle: vi.fn(() => new (Phaser.GameObjects as any).Arc()),
      rectangle: vi.fn(() => new (Phaser.GameObjects as any).Rectangle()),
      graphics: vi.fn(() => {
        const g = new (Phaser.GameObjects as any).Graphics();
        createdGraphics.push(g);
        return g;
      }),
      image: vi.fn(() => {
        const img = new (Phaser.GameObjects as any).Image();
        createdImages.push(img);
        return img;
      }),
    },
  };

  const player = new Player(scene as unknown as Phaser.Scene, 400, 300, HEROES[heroId]);
  return { player, scene, createdGraphics, createdImages };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('R3H-B Player sprite readability presentation', () => {
  test.each(HERO_IDS)('%s enlarges render-only display size to target mobile range while keeping gameplay appearance.size and Arcade body intact', (heroId) => {
    const hero = HEROES[heroId];
    const expectedSizes: Record<HeroId, number> = {
      runner: 32,
      vanguard: 40,
      shade: 30,
      verdant: 34,
    };
    expect(hero.appearance.size).toBe(expectedSizes[heroId]);

    const { player, createdImages, createdGraphics } = createPlayerFixture(heroId, true);
    const presentation = getHeroSpritePresentation(heroId);
    const mobileFitScale = Math.min(844 / 1600, 390 / 720);
    const mobileDisplayed = presentation.displaySize * mobileFitScale;
    expect(mobileDisplayed).toBeGreaterThanOrEqual(30);
    expect(mobileDisplayed).toBeLessThanOrEqual(37);

    // Arcade body remains completely unchanged: Math.max(20, Math.round(appearance.size * 0.72))
    const expectedBodySize = Math.max(20, Math.round(hero.appearance.size * 0.72));
    expect(player.body.setSize).toHaveBeenCalledWith(expectedBodySize, expectedBodySize, true);

    const skinImg = createdImages[0];
    expect(skinImg.displayWidth).toBe(presentation.displaySize);
    expect(skinImg.displayHeight).toBe(presentation.displaySize);
    expect(skinImg.depth).toBeGreaterThan(player.depth);
    // Player sits above boss overlays (6.35) yet strictly below projectiles (7) and telegraphs (>= 7.2)
    expect(skinImg.depth).toBeGreaterThan(6.35);
    expect(skinImg.depth).toBeLessThan(7);

    // Footing disc and directional aim chevron are created once cleanly below Projectile depth (7)
    expect(createdGraphics).toHaveLength(2);
    const [footing, chevron] = createdGraphics;
    expect(footing.depth).toBeLessThan(skinImg.depth);
    expect(chevron.depth).toBeGreaterThan(skinImg.depth);
    expect(chevron.depth).toBeLessThan(7);
  });

  test('rotates directional aim chevron 360deg, flips skin left/right cleanly, and copies hit/death states', () => {
    const { player, scene, createdImages, createdGraphics } = createPlayerFixture('runner', true);
    const skinImg = createdImages[0];
    const [footing, chevron] = createdGraphics;
    const postUpdate = (player as unknown as { syncSkinOverlay: () => void }).syncSkinOverlay.bind(player);

    // Aim up-left (-1, -1)
    player.setFacingDirection(new Phaser.Math.Vector2(-1, -1));
    postUpdate();
    expect(skinImg.flipX).toBe(true);
    expect(chevron.rotation).toBeCloseTo((-3 * Math.PI) / 4, 4);
    expect(chevron.x).toBeLessThan(player.x);
    expect(chevron.y).toBeLessThan(player.y);

    // Hit flash + death tint
    player.takeDamage(10, 2000);
    postUpdate();
    expect(skinImg.setTintFill).toHaveBeenCalledWith(0xf87171);

    player.takeDamage(200, 5000);
    player.updateVisualState(5000);
    postUpdate();
    expect(skinImg.setTint).toHaveBeenCalledWith(0x64748b);
    expect(chevron.visible).toBe(false);
    expect(footing.alpha).toBeCloseTo(0.32, 2);

    // Cleanup on destroy removes graphics and event listener cleanly
    player.destroy();
    expect(footing.destroy).toHaveBeenCalledOnce();
    expect(chevron.destroy).toHaveBeenCalledOnce();
    expect(skinImg.destroy).toHaveBeenCalledOnce();
    expect(scene.events.off).toHaveBeenCalledWith('postupdate', expect.any(Function), player);
  });

  test('retains fallback tank shapes when hero texture is missing or revoked dynamically', () => {
    const missing = createPlayerFixture('shade', false);
    expect(missing.createdImages).toHaveLength(0);
    expect(missing.player.isFilled).toBe(true);
    expect(missing.player.isStroked).toBe(true);

    const { player, scene, createdImages, createdGraphics } = createPlayerFixture('verdant', true);
    const skinImg = createdImages[0];
    const [footing, chevron] = createdGraphics;
    scene.textures.exists.mockReturnValue(false);
    (player as unknown as { syncSkinOverlay: () => void }).syncSkinOverlay();

    expect(skinImg.visible).toBe(false);
    expect(footing.visible).toBe(false);
    expect(chevron.visible).toBe(false);
    expect(player.isFilled).toBe(true);
    expect(player.isStroked).toBe(true);
  });
});
