import { afterEach, describe, expect, test, vi } from 'vitest';

const audioMocks = vi.hoisted(() => ({
  playCue: vi.fn(),
  playHeroIntroCue: vi.fn(),
}));

vi.mock('../../src/game/audio/audioCuePlayer', () => ({
  playCue: audioMocks.playCue,
  playHeroIntroCue: audioMocks.playHeroIntroCue,
}));

vi.mock('phaser', () => {
  class MockDisplayObject {
    x = 0;
    y = 0;
    alpha = 1;
    depth = 0;
    radius = 0;
    active = true;
    visible = true;
    setOrigin() { return this; }
    setDepth(depth: number) { this.depth = depth; return this; }
    setScrollFactor() { return this; }
    setStrokeStyle() { return this; }
    setAlpha(alpha: number) { this.alpha = alpha; return this; }
    setVisible(visible: boolean) { this.visible = visible; return this; }
    destroy() { this.active = false; }
  }

  class MockText extends MockDisplayObject {
    text: string;
    constructor(x = 0, y = 0, text = '') {
      super();
      this.x = x;
      this.y = y;
      this.text = text;
    }
  }

  class MockVector2 {
    x: number;
    y: number;
    constructor(x = 0, y = 0) {
      this.x = x;
      this.y = y;
    }
    lengthSq() { return this.x * this.x + this.y * this.y; }
    normalize() {
      const len = Math.hypot(this.x, this.y) || 1;
      this.x /= len;
      this.y /= len;
      return this;
    }
    scale(s: number) {
      this.x *= s;
      this.y *= s;
      return this;
    }
  }

  class MockScene {
    registry = new Map<string, unknown>();
  }

  return {
    default: {
      Scene: MockScene,
      GameObjects: {
        Rectangle: MockDisplayObject,
        Arc: MockDisplayObject,
        Polygon: MockDisplayObject,
        Text: MockText,
        Graphics: MockDisplayObject,
        Image: MockDisplayObject,
        Container: MockDisplayObject,
      },
      Math: {
        Vector2: MockVector2,
        Clamp: (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)),
        Between: (min: number, max: number) => Math.floor((min + max) / 2),
        FloatBetween: (min: number, max: number) => (min + max) / 2,
        Angle: {
          Wrap: (angle: number) => angle,
          Between: (x1: number, y1: number, x2: number, y2: number) => Math.atan2(y2 - y1, x2 - x1),
        },
        Distance: {
          Between: (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1),
        },
      },
      Display: {
        Color: {
          IntegerToColor: (value: number) => ({
            rgba: `#${(value & 0xffffff).toString(16).padStart(6, '0')}`,
          }),
        },
      },
      Input: {
        Keyboard: {
          JustDown: () => false,
        },
      },
      Scenes: {
        Events: {
          SHUTDOWN: 'shutdown',
        },
      },
    },
  };
});

import { BOSS_PHASE_TWO_HEALTH_RATIO } from '../../src/game/config/bossBalance';
import { ENEMY_ARCHETYPES } from '../../src/game/data/enemies';
import { HEROES } from '../../src/game/data/heroes';
import { RunScene } from '../../src/game/scenes/RunScene';

interface ScheduledTimer {
  delay: number;
  callback: () => void;
  fired: boolean;
}

function createRunNotificationHarness() {
  const scheduledTimers: ScheduledTimer[] = [];
  const createdRectangles: Array<{ x: number; y: number; w: number; h: number; fill?: number }> = [];
  const floatingTexts: Array<{ x: number; y: number; text: string; color: string }> = [];
  const registry = new Map<string, unknown>();

  const scene = Object.create(RunScene.prototype) as RunScene & Record<string, any>;
  scene.registry = registry;
  scene.time = {
    now: 1_000,
    delayedCall: vi.fn((delay: number, callback: () => void) => {
      const entry: ScheduledTimer = { delay, callback, fired: false };
      scheduledTimers.push(entry);
      return entry;
    }),
  };
  scene.add = {
    circle: vi.fn(() => ({
      setDepth: vi.fn().mockReturnThis(),
      setStrokeStyle: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
    })),
    rectangle: vi.fn((x: number, y: number, w: number, h: number, fill?: number) => {
      const rect = {
        x,
        y,
        w,
        h,
        fill,
        setDepth: vi.fn().mockReturnThis(),
        setStrokeStyle: vi.fn().mockReturnThis(),
        setAlpha: vi.fn().mockReturnThis(),
        destroy: vi.fn(),
      };
      createdRectangles.push({ x, y, w, h, fill });
      return rect;
    }),
    text: vi.fn((x: number, y: number, text: string, style?: { color?: string }) => {
      floatingTexts.push({ x, y, text, color: style?.color ?? '' });
      return {
        x,
        y,
        text,
        setOrigin: vi.fn().mockReturnThis(),
        setDepth: vi.fn().mockReturnThis(),
        setScrollFactor: vi.fn().mockReturnThis(),
        setAlpha: vi.fn().mockReturnThis(),
        destroy: vi.fn(),
      };
    }),
  };
  scene.tweens = {
    add: vi.fn(),
    pauseAll: vi.fn(),
    resumeAll: vi.fn(),
  };
  scene.cameras = {
    main: {
      shake: vi.fn(),
      flash: vi.fn(),
    },
  };
  scene.input = {
    keyboard: {
      off: vi.fn(),
    },
  };
  scene.physics = {
    pause: vi.fn(),
    resume: vi.fn(),
  };
  scene.sys = {
    isActive: () => true,
  };
  scene.movementInput = { destroy: vi.fn() };
  scene.combatResponse = { clear: vi.fn() };
  scene.colliders = [];
  scene.weapons = [];
  scene.shockwaveAttacks = [];
  scene.enemyBolts = [];
  scene.lineStrikeAttacks = [];
  scene.dangerZones = [];
  scene.lineTelegraphTracking = [];
  scene.skillTelegraphs = [];
  scene.enemies = { active: true, getChildren: () => [], destroy: vi.fn() };
  scene.neutralShapes = { active: true, getChildren: () => [], destroy: vi.fn() };
  scene.xpGems = { active: true, getChildren: () => [], destroy: vi.fn() };
  scene.player = {
    x: 900,
    y: 900,
    active: true,
    destroy: vi.fn(),
    extendInvulnerability: vi.fn(),
    getCurrentLevel: () => 5,
    getCurrentHealth: () => 90,
    getMaxHealth: () => 100,
  };
  scene.isEnded = false;
  scene.isLevelingUp = false;
  scene.isChoosingTankClass = false;
  scene.isSystemPaused = false;
  scene.isTransitioningToMenu = false;
  scene.runElapsedMs = 30_000;
  scene.alertToken = 0;
  scene.rewardToastToken = 0;
  scene.activeAlertPriority = 0;
  scene.activeAlertKind = 'objective';
  scene.activeAlertUntil = 0;
  scene.queuedRewardToasts = [];
  scene.activeRunEvent = null;
  scene.bossEnemy = null;
  scene.bossPhase = 1;
  scene.bossPhaseTwoTriggered = false;
  scene.bossStateSequence = [];
  scene.breakoutPulseCooldownRemainingMs = 0;
  scene.breakoutPulseProtectionRemainingMs = 0;
  scene.breakoutPulseActivationCount = 0;
  scene.stagePhase = 'preBoss';
  scene.lastFormationType = '';
  scene.nextFormationAtMs = 0;
  scene.formationWaveCount = 0;

  scene.shouldUseMobileCopy = vi.fn(() => false);
  scene.publishHudState = vi.fn();
  scene.resumeGameplaySystems = vi.fn();
  scene.clearBossPhaseClutter = vi.fn();
  scene.clearDangerZones = vi.fn();
  scene.destroyRewardTargetMarker = vi.fn();
  scene.applyBreakoutPulseKnockback = vi.fn();
  scene.createBreakoutPulseVisual = vi.fn();
  scene.showLineAttackTelegraph = vi.fn();
  scene.executeMinibossLineStrike = vi.fn();
  scene.showBossShockwaveTelegraph = vi.fn();
  scene.spawnBossShockwave = vi.fn();
  scene.showMinibossVolleyTelegraph = vi.fn();
  scene.executeMinibossVolley = vi.fn();
  scene.getSpawnPoint = vi.fn(() => ({ x: 1120, y: 920 }));
  scene.getEnemySpawnSafeRadius = vi.fn(() => 24);
  scene.getActiveEnemyCount = vi.fn(() => 0);
  scene.canSpawnFormationPressure = vi.fn(() => true);
  scene.getActiveBossEnemy = vi.fn(() => scene.bossEnemy);
  scene.beginBossStateSequence = vi.fn();
  scene.clearActiveRunEvent = vi.fn();

  const advanceBy = (deltaMs: number) => {
    scene.time.now += deltaMs;
    let progress = true;
    while (progress) {
      progress = false;
      for (const entry of scheduledTimers) {
        if (!entry.fired && entry.delay <= deltaMs) {
          entry.fired = true;
          entry.callback();
          progress = true;
        }
      }
    }
  };

  return {
    scene,
    registry,
    scheduledTimers,
    createdRectangles,
    floatingTexts,
    advanceBy,
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('RunScene consolidated combat notifications', () => {
  test('removes legacy showEncounterBanner and keeps hero intro silent on HUD banners/alerts while preserving audio', () => {
    expect('showEncounterBanner' in RunScene.prototype).toBe(false);

    const { scene, registry, createdRectangles } = createRunNotificationHarness();
    scene.presentHeroIntro(HEROES.vanguard);

    expect(registry.get('run.heroName')).toBe(HEROES.vanguard.name);
    expect(registry.get('run.heroPassive')).toBe(HEROES.vanguard.passiveLabel);
    expect(registry.get('run.alertText')).toBeUndefined();
    expect(createdRectangles).toHaveLength(0);
    expect(audioMocks.playHeroIntroCue).toHaveBeenCalledTimes(1);
  });

  test('emits single canonical encounter alerts for elite, miniboss, boss arrival, and boss phase 2', () => {
    const { scene, registry, createdRectangles, floatingTexts } = createRunNotificationHarness();

    scene.presentEncounterSpawn(ENEMY_ARCHETYPES.overlord, { x: 1100, y: 800 });
    expect(registry.get('run.alertKind')).toBe('elite');
    expect(registry.get('run.alertText')).toBe('ELITE · OVERLORD');
    expect(floatingTexts.some((t) => t.text === 'ELITE')).toBe(true);
    expect(audioMocks.playCue).toHaveBeenCalledWith('elite-arrival');

    scene.presentEncounterSpawn(ENEMY_ARCHETYPES.dreadnought, { x: 1120, y: 820 });
    expect(registry.get('run.alertKind')).toBe('miniboss');
    expect(registry.get('run.alertText')).toBe('MINIBOSS · DREADNOUGHT');
    expect(floatingTexts.some((t) => t.text === 'MINIBOSS')).toBe(true);
    expect(audioMocks.playCue).toHaveBeenCalledWith('miniboss-arrival');

    const mockBoss = {
      active: true,
      isAlive: () => true,
      isBoss: () => true,
      setBossPhase: vi.fn(),
      getCurrentHealth: () => 1000 * BOSS_PHASE_TWO_HEALTH_RATIO - 5,
      getMaxHealth: () => 1000,
    };
    scene.spawnDirector = { markBossSpawned: vi.fn() };
    scene.spawnEnemyFromArchetype = vi.fn(() => {
      scene.bossEnemy = mockBoss;
      return mockBoss;
    });

    scene.enterBossPhase();
    expect(registry.get('run.alertKind')).toBe('boss');
    expect(registry.get('run.alertText')).toBe('BOSS · BEHEMOTH');
    expect(floatingTexts.some((t) => t.text === 'BOSS')).toBe(true);
    expect(audioMocks.playCue).toHaveBeenCalledWith('boss-arrival');

    // Immediate opening shockwave telegraph on spawn does not clobber the BOSS · BEHEMOTH arrival notice
    scene.handleEnemyAttackSignal({}, {
      type: 'boss-shockwave-telegraph',
      x: 1120,
      y: 920,
      radius: 180,
      telegraphMs: 900,
    });
    expect(registry.get('run.alertText')).toBe('BOSS · BEHEMOTH');
    expect(scene.showBossShockwaveTelegraph).toHaveBeenCalledTimes(1);

    scene.syncBossPhaseState();
    expect(registry.get('run.alertKind')).toBe('boss');
    expect(registry.get('run.alertText')).toBe('BOSS · PHASE 2');
    expect(scene.cameras.main.shake).toHaveBeenCalled();
    expect(scene.cameras.main.flash).toHaveBeenCalled();
    expect(createdRectangles).toHaveLength(0);
  });

  test('suppresses repetitive objective/wave/back-in/pulse-readying alerts without disrupting wave or pulse state', () => {
    const { scene, registry } = createRunNotificationHarness();
    scene.spawnDirector = {
      nextWave: vi.fn(() => ({
        wave: [ENEMY_ARCHETYPES.scuttler],
        templateLabel: 'Swarm',
        templateHighlight: true,
      })),
    };
    scene.spawnEnemyFromArchetype = vi.fn(() => ({}));
    scene.buildFormationPlan = vi.fn(() => [{ archetype: ENEMY_ARCHETYPES.scuttler, point: { x: 1000, y: 880 } }]);
    scene.formationSpawnCount = 0;

    scene.spawnEnemyWave();
    const spawnedFormation = scene.spawnFormationPressure('pincer', false);
    scene.activateBreakoutPulse();
    scene.finishLevelUpSelection();

    expect(registry.get('run.alertText')).toBeUndefined();
    expect(scene.spawnDirector.nextWave).toHaveBeenCalledTimes(1);
    expect(spawnedFormation).toBe(true);
    expect(scene.formationWaveCount).toBe(1);
    expect(scene.formationSpawnCount).toBe(1);
    expect(scene.breakoutPulseActivationCount).toBe(1);
    expect(registry.get('run.levelUpActive')).toBe(false);
  });

  test('preserves miniboss/boss attack telegraphs, alert priority, FIFO reward queuing, and shutdown cleanup', () => {
    const { scene, registry, scheduledTimers, advanceBy } = createRunNotificationHarness();

    // 1. Boss attack telegraph remains crisp and preserves priority over lower objective alerts
    scene.handleEnemyAttackSignal({}, {
      type: 'boss-shockwave-telegraph',
      x: 920,
      y: 920,
      radius: 180,
      telegraphMs: 900,
    });
    expect(registry.get('run.alertKind')).toBe('boss');
    expect(registry.get('run.alertText')).toBe('Shockwave charging');
    expect(scene.showBossShockwaveTelegraph).toHaveBeenCalledTimes(1);
    expect(audioMocks.playCue).toHaveBeenCalledWith('dash-warning');

    scene.setAlert('objective', 'Low priority notice', 800);
    expect(registry.get('run.alertText')).toBe('Shockwave charging');

    // 2. Rewards queued behind miniboss/boss alerts flush sequentially in FIFO order without dropping items
    scene.showRewardToast('Reward target secured: +18 gold | +24 XP', '#fde68a');
    scene.showRewardToast('Stats maxed', '#fde68a');
    expect(registry.get('run.rewardText')).toBeUndefined();

    advanceBy(1_000);
    expect(registry.get('run.alertText')).toBe('');
    expect(registry.get('run.rewardText')).toBe('Reward target secured: +18 gold | +24 XP');

    // Fire the 2400ms timer for the first reward toast to flush the second queued toast
    const rewardTimer1 = scheduledTimers[scheduledTimers.length - 1];
    rewardTimer1.fired = true;
    rewardTimer1.callback();
    expect(registry.get('run.rewardText')).toBe('Stats maxed');

    // Immediate toast when no miniboss/boss alert blocks updates synchronously
    advanceBy(2_400);
    scene.showRewardToast('Direct toast', '#fde68a');
    expect(registry.get('run.rewardText')).toBe('Direct toast');

    // 3. Shutdown clears pending queues and invalidates stale timers cleanly
    scene.setAlert('miniboss', 'MINIBOSS · DREADNOUGHT', 1500);
    scene.showRewardToast('Stale reward', '#fde68a');
    const pendingStaleTimers = scheduledTimers.filter((t) => !t.fired);
    scene.handleShutdown();
    for (const timer of pendingStaleTimers) {
      timer.fired = true;
      timer.callback();
    }
    expect(scene.queuedRewardToasts).toEqual([]);
    expect(registry.get('run.rewardText')).toBe('Direct toast');
  });
});
