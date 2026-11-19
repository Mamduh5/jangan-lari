import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const firedProjectiles: Array<{
  x: number;
  y: number;
  direction: { x: number; y: number };
  stats: Record<string, unknown>;
}> = [];
const updatedProjectiles: number[] = [];

vi.mock('../../src/game/audio/audioCuePlayer', () => ({
  playWeaponFireCue: vi.fn(),
}));

vi.mock('../../src/game/entities/Projectile', () => {
  class MockProjectile {
    active = false;
    destroyed = false;

    fire(x: number, y: number, direction: { x: number; y: number }, stats: Record<string, unknown>) {
      this.active = true;
      firedProjectiles.push({
        x,
        y,
        direction: { x: direction.x, y: direction.y },
        stats: { ...stats },
      });
    }

    update(deltaMs: number) {
      if (this.active) {
        updatedProjectiles.push(deltaMs);
      }
    }

    destroy() {
      this.active = false;
      this.destroyed = true;
    }
  }

  return { Projectile: MockProjectile };
});

vi.mock('phaser', () => {
  class Vector2 {
    x: number;
    y: number;
    constructor(x = 0, y = 0) {
      this.x = x;
      this.y = y;
    }
    lengthSq() {
      return this.x * this.x + this.y * this.y;
    }
    clone() {
      return new Vector2(this.x, this.y);
    }
    normalize() {
      const len = Math.hypot(this.x, this.y);
      if (len > 0) {
        this.x /= len;
        this.y /= len;
      }
      return this;
    }
    rotate(rad: number) {
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const nx = this.x * cos - this.y * sin;
      const ny = this.x * sin + this.y * cos;
      this.x = nx;
      this.y = ny;
      return this;
    }
  }

  return {
    default: {
      BlendModes: { ADD: 1 },
      Math: {
        Vector2,
        Distance: {
          Squared: (x1: number, y1: number, x2: number, y2: number) => (x2 - x1) ** 2 + (y2 - y1) ** 2,
        },
        Linear: (a: number, b: number, t: number) => a + (b - a) * t,
        DegToRad: (deg: number) => (deg * Math.PI) / 180,
      },
    },
  };
});

import { WEAPON_DEFINITIONS, WEAPON_LIST } from '../../src/game/data/weapons';
import {
  DEFAULT_ATTACK_CONTROL_MODE,
  getAttackControlModeMetadata,
  getSessionAttackControlMode,
  resetSessionAttackControlMode,
  sanitizeAttackControlMode,
  setSessionAttackControlMode,
  toggleSessionAttackControlMode,
} from '../../src/game/input/attackControlMode';
import {
  getDualJoystickLayout,
  getManualAttackControlLayout,
  isPointInsideManualAttackButton,
  isPointInsideManualCancelZone,
} from '../../src/game/input/joystickLayout';
import { ManualAttackController } from '../../src/game/input/ManualAttackController';
import { MovementInputController, type ActivePointerLike } from '../../src/game/input/MovementInputController';
import { AutoFireWeapon } from '../../src/game/systems/AutoFireWeapon';
import {
  dispatchManualAttackCommand,
  summarizeManualAttackReadiness,
} from '../../src/game/systems/manualAttackResolver';

beforeEach(() => {
  firedProjectiles.length = 0;
  updatedProjectiles.length = 0;
  resetSessionAttackControlMode();
});

afterEach(() => {
  resetSessionAttackControlMode();
});

describe('R3I-A2 EXP session-only control mode selection', () => {
  test('defaults to Auto-Fire — Original on fresh launch and never mutates localStorage', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    try {
      expect(DEFAULT_ATTACK_CONTROL_MODE).toBe('auto-fire');
      expect(getSessionAttackControlMode()).toBe('auto-fire');
      expect(getAttackControlModeMetadata('auto-fire').label).toBe('Auto-Fire — Original');
      expect(getAttackControlModeMetadata('manual-attack').label).toBe('Manual Attack — Experimental');

      expect(toggleSessionAttackControlMode()).toBe('manual-attack');
      expect(getSessionAttackControlMode()).toBe('manual-attack');
      expect(setItemSpy).not.toHaveBeenCalled();

      expect(resetSessionAttackControlMode()).toBe('auto-fire');
      expect(getSessionAttackControlMode()).toBe('auto-fire');
      expect(sanitizeAttackControlMode('unknown-mode')).toBe('auto-fire');
      expect(sanitizeAttackControlMode('manual-attack')).toBe('manual-attack');

      setSessionAttackControlMode('manual-attack');
      expect(getSessionAttackControlMode()).toBe('manual-attack');
      expect(setItemSpy).not.toHaveBeenCalled();
    } finally {
      setItemSpy.mockRestore();
    }
  });
});

describe('R3I-A2 EXP ManualAttackController input state machine', () => {
  test('defines ATTACK and CANCEL regions clear of PULSE, Pause, and Stat Allocation', () => {
    const layout = getManualAttackControlLayout(1600, 720);

    // PULSE button (1244, 400, hitRadius 44) clear of both ATTACK and CANCEL
    const pulseToAttack = Math.hypot(layout.attackButton.x - 1244, layout.attackButton.y - 400);
    const pulseToCancel = Math.hypot(layout.cancelZone.x - 1244, layout.cancelZone.y - 400);
    expect(pulseToAttack).toBeGreaterThan(44 + layout.attackButton.hitRadius);
    expect(pulseToCancel).toBeGreaterThan(44 + layout.cancelZone.hitRadius);

    // Cancel zone clear of ATTACK button
    const attackToCancel = Math.hypot(
      layout.cancelZone.x - layout.attackButton.x,
      layout.cancelZone.y - layout.attackButton.y,
    );
    expect(attackToCancel).toBeGreaterThan(layout.attackButton.hitRadius + layout.cancelZone.hitRadius);

    // Stat Allocation panel occupies x in [428, 1172]
    expect(layout.attackButton.x - layout.attackButton.hitRadius).toBeGreaterThan(1172);

    // Explicit point exclusions
    expect(isPointInsideManualAttackButton({ x: 1244, y: 400 }, layout)).toBe(false); // PULSE
    expect(isPointInsideManualAttackButton({ x: 1556, y: 39 }, layout)).toBe(false); // Pause
    expect(isPointInsideManualAttackButton({ x: 540, y: 622 }, layout)).toBe(false); // Stat tile
    expect(isPointInsideManualAttackButton({ x: 888, y: 622 }, layout)).toBe(false); // Stat tile
    expect(isPointInsideManualAttackButton({ x: 290, y: 552 }, layout)).toBe(false); // MOVE pad
    expect(isPointInsideManualAttackButton({ x: layout.attackButton.x, y: layout.attackButton.y }, layout)).toBe(true);
    expect(isPointInsideManualCancelZone({ x: layout.cancelZone.x, y: layout.cancelZone.y }, layout)).toBe(true);
  });

  test('tap ATTACK does not fire on pointerdown, commits single tap on pointerup, and ignores duplicate pointerup', () => {
    const { manual, emit, setActivePointers, attackLayout } = createDualInputHarness();
    const tap = createPointer(2, attackLayout.attackButton.x + 12, attackLayout.attackButton.y - 8, 100);

    setActivePointers([tap]);
    emit('pointerdown', tap);
    expect(manual.getGuideState().phase).toBe('pressed');
    expect(manual.consumePendingCommand()).toBeNull();

    // Small thumb jitter below dragThreshold stays a tap
    tap.x += 8;
    tap.y -= 6;
    emit('pointermove', tap);
    expect(manual.getGuideState().phase).toBe('pressed');
    expect(manual.consumePendingCommand()).toBeNull();

    // Release produces exactly ONE tap command
    tap.isDown = false;
    setActivePointers([]);
    emit('pointerup', tap);
    const firstCmd = manual.consumePendingCommand();
    expect(firstCmd).toMatchObject({ kind: 'tap', direction: null });
    expect(manual.consumePendingCommand()).toBeNull();

    // Duplicate pointerup for same pointer ID never emits a second command
    emit('pointerup', tap);
    emit('pointerupoutside', tap);
    expect(manual.consumePendingCommand()).toBeNull();
  });

  test('hold-and-drag aims from finger start position, supports fast reversals, and fires once on release', () => {
    const { manual, emit, setActivePointers, attackLayout } = createDualInputHarness();
    // Touch off-center inside ATTACK button: finger start (1350, 570) becomes the gesture origin!
    const startX = attackLayout.attackButton.x + 40;
    const startY = attackLayout.attackButton.y + 18;
    const drag = createPointer(3, startX, startY, 200);

    setActivePointers([drag]);
    emit('pointerdown', drag);

    // Drag left by 60px from finger start (even though still right of fixed button center 1310 -> 1290)
    drag.x = startX - 60;
    drag.y = startY;
    emit('pointermove', drag);

    const aimingLeft = manual.getGuideState();
    expect(aimingLeft.phase).toBe('aiming');
    expect(aimingLeft.aimDirection?.x).toBeCloseTo(-1);
    expect(aimingLeft.aimDirection?.y).toBeCloseTo(0);
    expect(manual.consumePendingCommand()).toBeNull(); // no unintended shot during aiming

    // Fast reversal straight up-right (3-4-5 diagonal from start)
    drag.x = startX + 36;
    drag.y = startY - 48;
    emit('pointermove', drag);
    const reversed = manual.getGuideState();
    expect(reversed.phase).toBe('aiming');
    expect(reversed.aimDirection?.x).toBeCloseTo(0.6);
    expect(reversed.aimDirection?.y).toBeCloseTo(-0.8);

    // Release commits ONE aimed attack in exact chosen direction
    drag.isDown = false;
    setActivePointers([]);
    emit('pointerup', drag);
    const cmd = manual.consumePendingCommand();
    expect(cmd?.kind).toBe('aimed');
    expect(cmd?.direction?.x).toBeCloseTo(0.6);
    expect(cmd?.direction?.y).toBeCloseTo(-0.8);
    expect(manual.getGuideState().phase).toBe('idle');
    expect(manual.consumePendingCommand()).toBeNull();
  });

  test('dragging into CANCEL zone cancels without firing and never converts back into a tap', () => {
    const { manual, emit, setActivePointers, attackLayout } = createDualInputHarness();
    const drag = createPointer(4, attackLayout.attackButton.x, attackLayout.attackButton.y, 300);

    setActivePointers([drag]);
    emit('pointerdown', drag);

    // Aim left first, then drag into cancel zone
    drag.x = attackLayout.attackButton.x - 50;
    emit('pointermove', drag);
    expect(manual.getGuideState().phase).toBe('aiming');

    drag.x = attackLayout.cancelZone.x;
    drag.y = attackLayout.cancelZone.y;
    emit('pointermove', drag);
    expect(manual.getGuideState().phase).toBe('canceling');
    expect(manual.getGuideState().cancelHighlighted).toBe(true);

    // Release inside cancel -> zero command
    drag.isDown = false;
    setActivePointers([]);
    emit('pointerup', drag);
    expect(manual.consumePendingCommand()).toBeNull();
    expect(manual.getGuideState().phase).toBe('idle');

    // Drag directly into cancel without prior aim, then drag back onto start point -> still NEVER becomes a tap!
    const directCancel = createPointer(5, attackLayout.attackButton.x, attackLayout.attackButton.y, 400);
    setActivePointers([directCancel]);
    emit('pointerdown', directCancel);
    directCancel.x = attackLayout.cancelZone.x;
    directCancel.y = attackLayout.cancelZone.y;
    emit('pointermove', directCancel);
    expect(manual.getGuideState().phase).toBe('canceling');

    directCancel.x = attackLayout.attackButton.x;
    directCancel.y = attackLayout.attackButton.y;
    emit('pointermove', directCancel);
    directCancel.isDown = false;
    setActivePointers([]);
    emit('pointerup', directCancel);
    expect(manual.consumePendingCommand()).toBeNull();
  });

  test('pointerupoutside cancels cleanly with zero shot and no stuck state', () => {
    const { manual, emit, setActivePointers, attackLayout } = createDualInputHarness();
    const drag = createPointer(6, attackLayout.attackButton.x, attackLayout.attackButton.y, 500);

    setActivePointers([drag]);
    emit('pointerdown', drag);
    drag.x = attackLayout.attackButton.x + 80;
    emit('pointermove', drag);
    expect(manual.getGuideState().phase).toBe('aiming');

    drag.isDown = false;
    setActivePointers([]);
    emit('pointerupoutside', drag);
    expect(manual.consumePendingCommand()).toBeNull();
    expect(manual.getGuideState().phase).toBe('idle');
    expect(manual.getGuideState().active).toBe(false);
  });

  test('supports simultaneous two-thumb MOVE + ATTACK without altering MOVE or allowing finger stealing', () => {
    const { movement, manual, emit, setActivePointers, moveLayout, attackLayout } = createDualInputHarness();

    const moveFinger = createPointer(1, moveLayout.movement.x - 50, moveLayout.movement.y, 10);
    const attackFinger = createPointer(2, attackLayout.attackButton.x, attackLayout.attackButton.y, 20);
    const intruderFinger = createPointer(3, attackLayout.attackButton.x + 15, attackLayout.attackButton.y, 30);

    setActivePointers([moveFinger, attackFinger, intruderFinger]);
    emit('pointerdown', moveFinger);
    emit('pointerdown', attackFinger);
    emit('pointerdown', intruderFinger); // must not steal active ATTACK

    // Aim downward with finger 2 while walking straight left with finger 1
    attackFinger.y = attackLayout.attackButton.y + 60;
    emit('pointermove', attackFinger);
    intruderFinger.x = attackLayout.attackButton.x + 90;
    emit('pointermove', intruderFinger);

    const moveSnap = movement.getMovementInput();
    expect(moveSnap.source).toBe('pointer');
    expect(moveSnap.movement.x).toBeCloseTo(-1);
    expect(moveSnap.movement.y).toBeCloseTo(0);
    expect(moveSnap.aimActive).toBe(false); // MovementInputController does NOT hijack right-side aim in manual mode

    const attackGuide = manual.getGuideState();
    expect(attackGuide.phase).toBe('aiming');
    expect(attackGuide.aimDirection?.x).toBeCloseTo(0);
    expect(attackGuide.aimDirection?.y).toBeCloseTo(1);

    // Releasing intruder does nothing; releasing finger 2 commits downward shot while MOVE stays untouched
    intruderFinger.isDown = false;
    emit('pointerup', intruderFinger);
    expect(manual.consumePendingCommand()).toBeNull();

    attackFinger.isDown = false;
    setActivePointers([moveFinger]);
    emit('pointerup', attackFinger);
    const cmd = manual.consumePendingCommand();
    expect(cmd?.kind).toBe('aimed');
    expect(cmd?.direction?.y).toBeCloseTo(1);

    const stillMoving = movement.getMovementInput();
    expect(stillMoving.source).toBe('pointer');
    expect(stillMoving.movement.x).toBeCloseTo(-1);
  });

  test('overlay suspension cancels held ATTACK and resume never produces a ghost attack', () => {
    const { manual, emit, setActivePointers, attackLayout } = createDualInputHarness();
    const heldAttack = createPointer(7, attackLayout.attackButton.x, attackLayout.attackButton.y, 100);

    setActivePointers([heldAttack]);
    emit('pointerdown', heldAttack);
    heldAttack.x -= 45;
    emit('pointermove', heldAttack);
    expect(manual.getGuideState().phase).toBe('aiming');

    // Overlay opens (level-up / class / pause)
    manual.suspendForOverlay();
    expect(manual.isSuppressed()).toBe(true);
    expect(manual.getGuideState().phase).toBe('idle');
    expect(manual.consumePendingCommand()).toBeNull();

    // Overlay closes with selection pointer + still-held finger -> ZERO ghost attack!
    const selectionPointer = createPointer(8, attackLayout.attackButton.x, attackLayout.attackButton.y, 150);
    setActivePointers([heldAttack, selectionPointer]);
    manual.resumeAfterOverlay({
      ignoredPointer: selectionPointer,
      activePointers: [heldAttack, selectionPointer],
    });
    emit('pointerup', heldAttack);
    emit('pointerup', selectionPointer);
    expect(manual.consumePendingCommand()).toBeNull();

    // Fresh intentional press after release works cleanly
    setActivePointers([]);
    const freshTap = createPointer(8, attackLayout.attackButton.x, attackLayout.attackButton.y, 250);
    setActivePointers([freshTap]);
    emit('pointerdown', freshTap);
    freshTap.isDown = false;
    setActivePointers([]);
    emit('pointerup', freshTap);
    expect(manual.consumePendingCommand()).toMatchObject({ kind: 'tap' });
  });

  test('PULSE, Pause, and destroy cleanup exclude HUD buttons and remove all listeners cleanly', () => {
    const { manual, emit, setActivePointers, listenerCounts, attackLayout } = createDualInputHarness();

    const pulseTap = createPointer(10, 1244, 400, 10);
    const pauseTap = createPointer(11, 1556, 39, 20);
    setActivePointers([pulseTap, pauseTap]);
    manual.clearOverlaySelectionPointer(pulseTap);
    emit('pointerdown', pulseTap);
    emit('pointerup', pulseTap);
    manual.clearOverlaySelectionPointer(pauseTap);
    emit('pointerdown', pauseTap);
    emit('pointerup', pauseTap);
    expect(manual.consumePendingCommand()).toBeNull();

    expect(listenerCounts()).toEqual({ pointerdown: 2, pointermove: 2, pointerup: 2, pointerupoutside: 2 });
    manual.destroy();
    expect(listenerCounts()).toEqual({ pointerdown: 1, pointermove: 1, pointerup: 1, pointerupoutside: 1 });

    // Events after destroy do nothing
    const afterDestroy = createPointer(12, attackLayout.attackButton.x, attackLayout.attackButton.y, 30);
    setActivePointers([afterDestroy]);
    emit('pointerdown', afterDestroy);
    emit('pointerup', afterDestroy);
    expect(manual.consumePendingCommand()).toBeNull();
  });
});

describe('R3I-A2 EXP AutoFireWeapon & multi-weapon manual attack compatibility', () => {
  test('preserves original auto-fire behavior in Mode A and suppresses idle auto-fire while updating projectiles in Mode B', () => {
    const env = createWeaponTestEnv({ facing: { x: 1, y: 0 } });
    const arcBolt = new AutoFireWeapon(
      env.scene as never,
      env.owner as never,
      env.enemies as never,
      env.neutrals as never,
      WEAPON_DEFINITIONS['arc-bolt'],
    );

    // Mode B idle update: zero auto-fire
    arcBolt.update(100, 16, { autoFire: false });
    arcBolt.update(1000, 16, { autoFire: false });
    expect(firedProjectiles).toHaveLength(0);

    // Mode A default update: fires automatically on cooldown
    arcBolt.update(1000, 16);
    expect(firedProjectiles).toHaveLength(1);
    expect(firedProjectiles[0].direction).toEqual({ x: 1, y: 0 });

    // Mode B update still advances existing active projectiles cleanly without firing again!
    arcBolt.update(2000, 16, { autoFire: false });
    expect(firedProjectiles).toHaveLength(1);
    expect(updatedProjectiles).toContain(16);
  });

  test('tap attack prefers nearest enemy in range, falls back to nearest neutral, then fallback direction', () => {
    const env = createWeaponTestEnv({
      ownerX: 0,
      ownerY: 0,
      enemies: [
        { x: 0, y: -250, active: true, alive: true }, // within arc-bolt range (350)
        { x: 400, y: 0, active: true, alive: true }, // out of range (400 > 350)
      ],
      neutrals: [{ x: 100, y: 0, active: true, alive: true }],
    });
    const arcBolt = new AutoFireWeapon(
      env.scene as never,
      env.owner as never,
      env.enemies as never,
      env.neutrals as never,
      WEAPON_DEFINITIONS['arc-bolt'],
    );

    // 1. Enemy beats closer neutral shape when enemy is in range
    const tapEnemy = dispatchManualAttackCommand(
      [arcBolt],
      0,
      { id: 1, kind: 'tap', direction: null, issuedAtMs: 0 },
      { x: 1, y: 0 },
    );
    expect(tapEnemy.firedCount).toBe(1);
    expect(tapEnemy.targetKind).toBe('enemy');
    expect(firedProjectiles[0].direction.x).toBeCloseTo(0);
    expect(firedProjectiles[0].direction.y).toBeCloseTo(-1);

    // 2. When no alive enemy is in range, falls back to nearest valid neutral shape
    env.enemiesList[0].alive = false;
    const tapNeutral = dispatchManualAttackCommand(
      [arcBolt],
      500,
      { id: 2, kind: 'tap', direction: null, issuedAtMs: 500 },
      { x: -1, y: 0 },
    );
    expect(tapNeutral.firedCount).toBe(1);
    expect(tapNeutral.targetKind).toBe('neutral');
    expect(firedProjectiles[1].direction.x).toBeCloseTo(1);
    expect(firedProjectiles[1].direction.y).toBeCloseTo(0);

    // 3. When no valid target exists in range, uses explicit fallback direction
    env.neutralsList[0].alive = false;
    const tapFallback = dispatchManualAttackCommand(
      [arcBolt],
      1000,
      { id: 3, kind: 'tap', direction: null, issuedAtMs: 1000 },
      { x: 0, y: 1 },
    );
    expect(tapFallback.firedCount).toBe(1);
    expect(tapFallback.targetKind).toBe('fallback');
    expect(firedProjectiles[2].direction.x).toBeCloseTo(0);
    expect(firedProjectiles[2].direction.y).toBeCloseTo(1);
  });

  test('supports all 7 weapons with independent cooldowns, exact burst/spread/pierce/explosion stats, radial Sunwheel, and cooldown feedback', () => {
    const env = createWeaponTestEnv({
      ownerX: 0,
      ownerY: 0,
      enemies: [{ x: 180, y: 0, active: true, alive: true }],
    });
    const weapons = WEAPON_LIST.map(
      (def) => new AutoFireWeapon(env.scene as never, env.owner as never, env.enemies as never, env.neutrals as never, def),
    );

    // 1. At t = 0, all 7 weapons are ready and fire once with exact projectile counts:
    // arc-bolt(1) + twin-fangs(2) + ember-lance(1) + bloom-cannon(3) + phase-disc(1) + sunwheel(6 radial) + shatterbell(1) = 15
    const initialAim = dispatchManualAttackCommand(
      weapons,
      0,
      { id: 1, kind: 'aimed', direction: { x: 0, y: -1 }, issuedAtMs: 0 },
      { x: 1, y: 0 },
    );
    expect(initialAim.firedCount).toBe(7);
    expect(initialAim.firedWeaponIds).toEqual(WEAPON_LIST.map((w) => w.id));
    expect(firedProjectiles).toHaveLength(15);

    // Sunwheel radial burst produced 6 evenly spaced directions (including non-upward directions)
    const sunwheelShots = firedProjectiles.filter((p) => p.stats.id === 'sunwheel');
    expect(sunwheelShots).toHaveLength(6);
    expect(sunwheelShots.some((p) => p.direction.x > 0.9)).toBe(true);
    expect(sunwheelShots.some((p) => p.direction.x < -0.9)).toBe(true);

    // Phase Disc preserved pierceCount = 2; Shatterbell preserved explosionRadius = 94
    expect(firedProjectiles.find((p) => p.stats.id === 'phase-disc')?.stats.pierceCount).toBe(2);
    expect(firedProjectiles.find((p) => p.stats.id === 'shatterbell')?.stats.explosionRadius).toBe(94);

    // 2. At t = 200ms, ALL 7 weapons are on cooldown -> zero fired, exact shortest cooldown reported (arc-bolt: 220ms)
    firedProjectiles.length = 0;
    const onCooldown = dispatchManualAttackCommand(
      weapons,
      200,
      { id: 2, kind: 'tap', direction: null, issuedAtMs: 200 },
      { x: 1, y: 0 },
    );
    expect(onCooldown.firedCount).toBe(0);
    expect(onCooldown.blockedByCooldownCount).toBe(7);
    expect(onCooldown.minCooldownRemainingMs).toBe(220);
    expect(firedProjectiles).toHaveLength(0);

    const readinessAt200 = summarizeManualAttackReadiness(weapons, 200);
    expect(readinessAt200.ready).toBe(false);
    expect(readinessAt200.readyWeaponCount).toBe(0);
    expect(readinessAt200.nextReadyCooldownMs).toBe(220);

    // 3. At t = 450ms, ONLY arc-bolt (420ms) is ready -> fires ONLY arc-bolt, leaving the other 6 strictly on cooldown
    const partialReady = dispatchManualAttackCommand(
      weapons,
      450,
      { id: 3, kind: 'tap', direction: null, issuedAtMs: 450 },
      { x: 0, y: 1 },
    );
    expect(partialReady.firedWeaponIds).toEqual(['arc-bolt']);
    expect(partialReady.blockedByCooldownCount).toBe(6);
    expect(firedProjectiles).toHaveLength(1);

    // 4. At t = 1250ms, radial Sunwheel (1220ms) is ready again and fires its 6-way radial burst on tap
    firedProjectiles.length = 0;
    const sunwheelOnly = dispatchManualAttackCommand(
      [weapons.find((w) => w.getId() === 'sunwheel')!],
      1250,
      { id: 4, kind: 'tap', direction: null, issuedAtMs: 1250 },
      { x: 1, y: 0 },
    );
    expect(sunwheelOnly.firedWeaponIds).toEqual(['sunwheel']);
    expect(sunwheelOnly.targetKind).toBe('radial');
    expect(firedProjectiles).toHaveLength(6);
  });
});

function createDualInputHarness() {
  const handlers = new Map<string, Array<(pointer: ActivePointerLike) => void>>();
  const manager: { pointers: ActivePointerLike[]; mousePointer?: ActivePointerLike } = { pointers: [] };
  const input = {
    manager,
    activePointer: undefined as ActivePointerLike | undefined,
    on: (eventName: string, handler: (pointer: ActivePointerLike) => void) => {
      handlers.set(eventName, [...(handlers.get(eventName) ?? []), handler]);
    },
    off: (eventName: string, handler: (pointer: ActivePointerLike) => void) => {
      handlers.set(
        eventName,
        (handlers.get(eventName) ?? []).filter((entry) => entry !== handler),
      );
    },
  };
  const scene = {
    scale: { width: 1600, height: 720 },
    time: { now: 1000 },
    input,
  };
  const key = { isDown: false };
  const keys = {
    left: key,
    right: key,
    up: key,
    down: key,
    altLeft: key,
    altRight: key,
    altUp: key,
    altDown: key,
  };

  const movement = new MovementInputController(scene as never, keys as never, { disableAimPointer: true });
  const manual = new ManualAttackController(scene as never, {
    isPointerClaimedExternally: (pointerId) => movement.isPointerClaimed(pointerId),
  });

  return {
    movement,
    manual,
    moveLayout: getDualJoystickLayout(1600, 720),
    attackLayout: getManualAttackControlLayout(1600, 720),
    emit: (eventName: string, pointer: ActivePointerLike) => {
      input.activePointer = pointer;
      for (const handler of [...(handlers.get(eventName) ?? [])]) {
        handler(pointer);
      }
    },
    setActivePointers: (nextPointers: ActivePointerLike[]) => {
      manager.pointers = nextPointers;
      input.activePointer = nextPointers[0];
    },
    listenerCounts: () => ({
      pointerdown: (handlers.get('pointerdown') ?? []).length,
      pointermove: (handlers.get('pointermove') ?? []).length,
      pointerup: (handlers.get('pointerup') ?? []).length,
      pointerupoutside: (handlers.get('pointerupoutside') ?? []).length,
    }),
  };
}

function createPointer(id: number, x: number, y: number, downTime: number): ActivePointerLike {
  return { id, x, y, isDown: true, downTime };
}

function createWeaponTestEnv(opts: {
  ownerX?: number;
  ownerY?: number;
  facing?: { x: number; y: number };
  enemies?: Array<{ x: number; y: number; active: boolean; alive: boolean }>;
  neutrals?: Array<{ x: number; y: number; active: boolean; alive: boolean }>;
} = {}) {
  const owner = {
    x: opts.ownerX ?? 0,
    y: opts.ownerY ?? 0,
    isAlive: () => true,
    getFacingDirection: () => ({ ...(opts.facing ?? { x: 1, y: 0 }) }),
  };
  const enemiesList = (opts.enemies ?? []).map((e) => ({
    ...e,
    isAlive() {
      return this.alive;
    },
  }));
  const neutralsList = (opts.neutrals ?? []).map((n) => ({
    ...n,
    isAlive() {
      return this.alive;
    },
  }));
  const enemies = { active: true, getChildren: () => enemiesList };
  const neutrals = { active: true, getChildren: () => neutralsList };

  const scene = {
    time: { now: 0 },
    physics: {
      add: {
        group: () => {
          const entries: unknown[] = [];
          return {
            children: { entries },
            add: (item: unknown) => entries.push(item),
            destroy: () => {
              entries.length = 0;
            },
          };
        },
      },
    },
    add: {
      circle: () => ({
        setBlendMode: () => undefined,
        setDepth: () => undefined,
        setStrokeStyle: () => undefined,
        destroy: () => undefined,
      }),
    },
    tweens: {
      add: (config: { onComplete?: () => void }) => {
        config.onComplete?.();
      },
    },
  };

  return { scene, owner, enemies, neutrals, enemiesList, neutralsList };
}
