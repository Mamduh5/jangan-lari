import {
  DEFAULT_JOYSTICK_BASE_RADIUS,
  DEFAULT_JOYSTICK_CENTER_X_OFFSET,
  DEFAULT_JOYSTICK_CENTER_Y,
  DEFAULT_JOYSTICK_DEADZONE,
  DEFAULT_JOYSTICK_HIT_RADIUS,
  DEFAULT_JOYSTICK_KNOB_RADIUS,
  DEFAULT_JOYSTICK_MAX_KNOB_TRAVEL,
  getDualJoystickLayout,
  hitTestJoystickZone,
  sampleJoystickPointer,
} from '../../src/game/input/joystickLayout';
import {
  MovementInputController,
  type ActivePointerLike,
  getPointerControlZone,
  normalizeMovementVector,
  reconcilePointerChannels,
  resolveMovementInput,
  type MovementVector,
} from '../../src/game/input/MovementInputController';

const zero: MovementVector = { x: 0, y: 0 };
const right: MovementVector = { x: 1, y: 0 };

describe('movement input helpers and shared joystick layout', () => {
  test('normalizes diagonal movement vectors', () => {
    const movement = normalizeMovementVector({ x: 3, y: 4 });

    expect(movement.x).toBeCloseTo(0.6);
    expect(movement.y).toBeCloseTo(0.8);
  });

  test('keeps zero vectors stable', () => {
    expect(normalizeMovementVector(zero)).toEqual(zero);
  });

  test('prefers active keyboard movement over pointer movement', () => {
    const input = resolveMovementInput({
      keyboard: { vector: { x: 0, y: -1 }, active: true },
      pointer: { vector: { x: 60, y: 0 }, active: true },
      previousFacing: right,
    });

    expect(input.source).toBe('keyboard');
    expect(input.movement).toEqual({ x: 0, y: -1 });
    expect(input.facing).toEqual({ x: 0, y: -1 });
    expect(input.aimSource).toBe('movement');
  });

  test('uses left-side pointer drag movement when keyboard is inactive', () => {
    const input = resolveMovementInput({
      keyboard: { vector: zero, active: false },
      pointer: { vector: { x: 40, y: 40 }, active: true },
      previousFacing: right,
    });

    expect(input.source).toBe('pointer');
    expect(input.movement.x).toBeCloseTo(Math.SQRT1_2);
    expect(input.movement.y).toBeCloseTo(Math.SQRT1_2);
    expect(input.facing).toEqual(input.movement);
    expect(input.aimSource).toBe('movement');
  });

  test('uses right-side aim drag independently from movement', () => {
    const input = resolveMovementInput({
      keyboard: { vector: zero, active: false },
      pointer: { vector: { x: -60, y: 0 }, active: true },
      aimPointer: { vector: { x: 0, y: 80 }, active: true },
      previousFacing: right,
    });

    expect(input.source).toBe('pointer');
    expect(input.movement).toEqual({ x: -1, y: 0 });
    expect(input.aim).toEqual({ x: 0, y: 1 });
    expect(input.facing).toEqual({ x: 0, y: 1 });
    expect(input.aimActive).toBe(true);
    expect(input.aimSource).toBe('pointer');
    expect(input.hasExplicitAim).toBe(true);
  });

  test('preserves facing when idle or when opposing keys cancel movement', () => {
    const previousFacing = { x: 0, y: 1 };

    expect(
      resolveMovementInput({
        keyboard: { vector: zero, active: false },
        pointer: { vector: zero, active: false },
        previousFacing,
      }),
    ).toMatchObject({
      movement: zero,
      facing: previousFacing,
      source: 'idle',
      aimActive: false,
    });

    expect(
      resolveMovementInput({
        keyboard: { vector: zero, active: true },
        pointer: { vector: { x: 50, y: 0 }, active: true },
        previousFacing,
      }),
    ).toMatchObject({
      movement: zero,
      facing: previousFacing,
      source: 'keyboard',
    });
  });

  test('releasing aim preserves last explicit aim while movement can stop', () => {
    const input = resolveMovementInput({
      keyboard: { vector: zero, active: false },
      pointer: { vector: zero, active: false },
      aimPointer: { vector: zero, active: false },
      previousFacing: { x: 0, y: -1 },
      hasExplicitAim: true,
    });

    expect(input).toMatchObject({
      movement: zero,
      facing: { x: 0, y: -1 },
      aim: { x: 0, y: -1 },
      aimActive: false,
      aimSource: 'idle',
      hasExplicitAim: true,
    });
  });

  test('treats released or tiny pointer movement as stopped movement', () => {
    const released = resolveMovementInput({
      keyboard: { vector: zero, active: false },
      pointer: { vector: { x: 80, y: 0 }, active: false },
      previousFacing: right,
    });
    const underDeadzone = resolveMovementInput({
      keyboard: { vector: zero, active: false },
      pointer: { vector: { x: 4, y: 4 }, active: true },
      previousFacing: right,
    });

    expect(released).toMatchObject({ movement: zero, facing: right, source: 'idle' });
    expect(underDeadzone).toMatchObject({ movement: zero, facing: right, source: 'idle' });
  });

  test('defines symmetric shared joystick geometry clear of PULSE, Pause, and Stat Allocation', () => {
    const layout = getDualJoystickLayout(1600, 720);

    expect(layout.movement).toEqual({
      id: 'movement',
      x: DEFAULT_JOYSTICK_CENTER_X_OFFSET,
      y: DEFAULT_JOYSTICK_CENTER_Y,
      baseRadius: DEFAULT_JOYSTICK_BASE_RADIUS,
      hitRadius: DEFAULT_JOYSTICK_HIT_RADIUS,
      knobRadius: DEFAULT_JOYSTICK_KNOB_RADIUS,
      maxKnobTravel: DEFAULT_JOYSTICK_MAX_KNOB_TRAVEL,
      deadzone: DEFAULT_JOYSTICK_DEADZONE,
    });
    expect(layout.aim.x).toBe(1600 - DEFAULT_JOYSTICK_CENTER_X_OFFSET);
    expect(layout.aim.y).toBe(DEFAULT_JOYSTICK_CENTER_Y);
    expect(layout.movement.maxKnobTravel + layout.movement.knobRadius).toBeLessThanOrEqual(layout.movement.baseRadius);

    // PULSE button (1244, 400) with hitRadius 44 must stay clear of AIM hitRadius
    const pulseDistance = Math.hypot(layout.aim.x - 1244, layout.aim.y - 400);
    expect(pulseDistance).toBeGreaterThan(44 + layout.aim.hitRadius);

    // Stat allocation panel occupies x in [428, 1172]
    expect(layout.movement.x + layout.movement.hitRadius).toBeLessThan(428);
    expect(layout.aim.x - layout.aim.hitRadius).toBeGreaterThan(1172);
  });

  test('hit-tests only inside MOVE and AIM joystick bounds and rejects screen-half arena or HUD touches', () => {
    const layout = getDualJoystickLayout(1600, 720);

    // Inside MOVE (center, base, and outer forgiving boundary)
    expect(getPointerControlZone(layout.movement.x, layout.movement.y, 1600, 720)).toBe('movement');
    expect(getPointerControlZone(layout.movement.x + 80, layout.movement.y - 40, 1600, 720)).toBe('movement');
    expect(getPointerControlZone(layout.movement.x + layout.movement.hitRadius, layout.movement.y, 1600, 720)).toBe('movement');

    // Inside AIM
    expect(getPointerControlZone(layout.aim.x, layout.aim.y, 1600, 720)).toBe('aim');
    expect(getPointerControlZone(layout.aim.x - 60, layout.aim.y - 70, 1600, 720)).toBe('aim');
    expect(getPointerControlZone(layout.aim.x - layout.aim.hitRadius, layout.aim.y, 1600, 720)).toBe('aim');

    // Outside both pads (open left/right arena, center, PULSE, Pause, Stat panel)
    expect(getPointerControlZone(140, 300, 1600, 720)).toBeNull();
    expect(getPointerControlZone(1260, 300, 1600, 720)).toBeNull();
    expect(getPointerControlZone(800, 360, 1600, 720)).toBeNull();
    expect(getPointerControlZone(1244, 400, 1600, 720)).toBeNull(); // PULSE center
    expect(getPointerControlZone(1244 + 30, 400 + 32, 1600, 720)).toBeNull(); // PULSE lower-right hit rim
    expect(getPointerControlZone(1556, 39, 1600, 720)).toBeNull(); // Pause button
    expect(getPointerControlZone(540, 622, 1600, 720)).toBeNull(); // Stat tile 1
    expect(getPointerControlZone(888, 622, 1600, 720)).toBeNull(); // Stat tile 3
    expect(getPointerControlZone(layout.movement.x + layout.movement.hitRadius + 1, layout.movement.y, 1600, 720)).toBeNull();

    // Proportional scaling for alternate virtual dimensions
    const halfLayout = getDualJoystickLayout(800, 360);
    expect(hitTestJoystickZone(halfLayout.movement.x, halfLayout.movement.y, halfLayout)).toBe('movement');
    expect(hitTestJoystickZone(halfLayout.aim.x, halfLayout.aim.y, halfLayout)).toBe('aim');
    expect(hitTestJoystickZone(400, 180, halfLayout)).toBeNull();
  });

  test('sampleJoystickPointer aligns knob offset with center-relative input vector and clamps to maxKnobTravel', () => {
    const { movement } = getDualJoystickLayout(1600, 720);

    const inDeadzone = sampleJoystickPointer({ x: movement.x + 5, y: movement.y - 5 }, movement);
    expect(inDeadzone.engaged).toBe(false);
    expect(inDeadzone.direction).toEqual(zero);
    expect(inDeadzone.knobOffset).toEqual(zero);
    expect(inDeadzone.knobPosition).toEqual({ x: movement.x, y: movement.y });

    const midDrag = sampleJoystickPointer({ x: movement.x + 30, y: movement.y - 40 }, movement);
    expect(midDrag.engaged).toBe(true);
    expect(midDrag.direction.x).toBeCloseTo(0.6);
    expect(midDrag.direction.y).toBeCloseTo(-0.8);
    expect(midDrag.knobOffset).toEqual({ x: 30, y: -40 });

    const farDrag = sampleJoystickPointer({ x: movement.x + 300, y: movement.y + 400 }, movement);
    expect(farDrag.engaged).toBe(true);
    expect(farDrag.direction.x).toBeCloseTo(0.6);
    expect(farDrag.direction.y).toBeCloseTo(0.8);
    expect(Math.hypot(farDrag.knobOffset.x, farDrag.knobOffset.y)).toBeCloseTo(movement.maxKnobTravel);
    expect(farDrag.knobOffset.x).toBeCloseTo(0.6 * movement.maxKnobTravel);
    expect(farDrag.knobOffset.y).toBeCloseTo(0.8 * movement.maxKnobTravel);
  });

  test('reconciles held movement and aim pointers anchored to fixed joystick centers even if dragged outside', () => {
    const layout = getDualJoystickLayout(1600, 720);
    const reconciled = reconcilePointerChannels({
      viewportWidth: 1600,
      viewportHeight: 720,
      activePointers: [
        { id: 1, x: 480, y: 420, isDown: true, downTime: 10 }, // dragged outside MOVE while held
        { id: 2, x: 1120, y: 380, isDown: true, downTime: 20 }, // dragged outside AIM while held
      ],
      previousMovement: {
        pointerId: 1,
        start: { x: layout.movement.x, y: layout.movement.y },
        current: { x: 440, y: 440 },
      },
      previousAim: {
        pointerId: 2,
        start: { x: layout.aim.x, y: layout.aim.y },
        current: { x: 1150, y: 400 },
      },
    });

    expect(reconciled.movement.pointerId).toBe(1);
    expect(reconciled.movement.start).toEqual({ x: layout.movement.x, y: layout.movement.y });
    expect(reconciled.movement.current).toEqual({ x: 480, y: 420 });
    expect(reconciled.aim.pointerId).toBe(2);
    expect(reconciled.aim.start).toEqual({ x: layout.aim.x, y: layout.aim.y });
    expect(reconciled.aim.current).toEqual({ x: 1120, y: 380 });
  });

  test('reconciliation ignores pointers outside joystick hit areas and ignored overlay pointers', () => {
    const layout = getDualJoystickLayout(1600, 720);
    const reconciled = reconcilePointerChannels({
      viewportWidth: 1600,
      viewportHeight: 720,
      activePointers: [
        { id: 7, x: 140, y: 300, isDown: true, downTime: 50 }, // outside MOVE
        { id: 8, x: 1244, y: 400, isDown: true, downTime: 60 }, // PULSE button
        { id: 9, x: layout.movement.x + 20, y: layout.movement.y, isDown: true, downTime: 90 }, // inside MOVE but ignored
      ],
      ignoredPointerIds: [9],
    });

    expect(reconciled.movement.pointerId).toBeNull();
    expect(reconciled.aim.pointerId).toBeNull();
  });

  test('ignores touches starting outside joysticks even when dragged across a joystick circle', () => {
    const { controller, emit, setActivePointers, layout } = createControllerHarness();
    const strayLeft = createPointer(1, 140, 300, 10);
    const pulseTap = createPointer(2, 1244, 400, 20);

    setActivePointers([strayLeft, pulseTap]);
    emit('pointerdown', strayLeft);
    emit('pointerdown', pulseTap);

    // Drag both stray pointers right through the MOVE and AIM circles
    strayLeft.x = layout.movement.x + 50;
    strayLeft.y = layout.movement.y;
    emit('pointermove', strayLeft);
    pulseTap.x = layout.aim.x;
    pulseTap.y = layout.aim.y - 50;
    emit('pointermove', pulseTap);

    const input = controller.getMovementInput();
    const guides = controller.getPointerGuideState();
    expect(input.source).toBe('idle');
    expect(input.movement).toEqual(zero);
    expect(input.aimActive).toBe(false);
    expect(guides.movement.active).toBe(false);
    expect(guides.aim.active).toBe(false);
  });

  test('calculates joystick vector from fixed joystick center on immediate off-center touch and respects deadzone', () => {
    const { controller, emit, setActivePointers, layout } = createControllerHarness();

    // 1. Touch inside deadzone near center -> captured, zero movement, knob stays centered
    const centerTouch = createPointer(1, layout.movement.x + 5, layout.movement.y + 4, 10);
    setActivePointers([centerTouch]);
    emit('pointerdown', centerTouch);

    expect(controller.getMovementInput().source).toBe('idle');
    expect(controller.getPointerGuideState().movement).toMatchObject({
      active: true,
      start: { x: layout.movement.x, y: layout.movement.y },
      vector: zero,
    });

    // Release and tap immediately off-center inside MOVE ring (no pointermove needed!)
    centerTouch.isDown = false;
    setActivePointers([]);
    emit('pointerup', centerTouch);

    const offCenterMove = createPointer(2, layout.movement.x + 48, layout.movement.y, 20);
    setActivePointers([offCenterMove]);
    emit('pointerdown', offCenterMove);

    const moveSnapshot = controller.getMovementInput();
    expect(moveSnapshot.source).toBe('pointer');
    expect(moveSnapshot.movement.x).toBeCloseTo(1);
    expect(moveSnapshot.movement.y).toBeCloseTo(0);
    expect(controller.getPointerGuideState().movement.vector).toEqual({ x: 48, y: 0 });
  });

  test('tracks pointer outside ring once started inside, clamps knob to radius, supports fast reversals, and resets cleanly', () => {
    const { controller, emit, setActivePointers, layout } = createControllerHarness();
    const movePointer = createPointer(1, layout.movement.x + 20, layout.movement.y, 10);

    setActivePointers([movePointer]);
    emit('pointerdown', movePointer);

    // Drag far outside the MOVE circle (even into the right half of the screen)
    movePointer.x = layout.movement.x + 300;
    movePointer.y = layout.movement.y - 400;
    emit('pointermove', movePointer);

    const farDiagonal = controller.getMovementInput();
    const farGuide = controller.getPointerGuideState().movement;
    expect(farDiagonal.source).toBe('pointer');
    expect(farDiagonal.movement.x).toBeCloseTo(0.6);
    expect(farDiagonal.movement.y).toBeCloseTo(-0.8);
    expect(Math.hypot(farGuide.vector.x, farGuide.vector.y)).toBeCloseTo(layout.movement.maxKnobTravel);
    expect(farGuide.vector.x / layout.movement.maxKnobTravel).toBeCloseTo(farDiagonal.movement.x);
    expect(farGuide.vector.y / layout.movement.maxKnobTravel).toBeCloseTo(farDiagonal.movement.y);

    // Fast direction reversal to straight left
    movePointer.x = layout.movement.x - 120;
    movePointer.y = layout.movement.y;
    emit('pointermove', movePointer);

    const reversed = controller.getMovementInput();
    const reversedGuide = controller.getPointerGuideState().movement;
    expect(reversed.movement.x).toBeCloseTo(-1);
    expect(reversed.movement.y).toBeCloseTo(0);
    expect(reversedGuide.vector.x).toBeCloseTo(-layout.movement.maxKnobTravel);
    expect(reversedGuide.vector.y).toBeCloseTo(0);

    // Release resets movement & knob cleanly
    movePointer.isDown = false;
    setActivePointers([]);
    emit('pointerupoutside', movePointer);

    const afterRelease = controller.getMovementInput();
    expect(afterRelease.source).toBe('idle');
    expect(afterRelease.movement).toEqual(zero);
    expect(controller.getPointerGuideState().movement.active).toBe(false);
    expect(controller.getPointerGuideState().movement.vector).toEqual(zero);
  });

  test('supports simultaneous MOVE + AIM multitouch and resists second touch stealing or PULSE tapping', () => {
    const { controller, emit, setActivePointers, layout } = createControllerHarness();
    const movePointer = createPointer(1, layout.movement.x - 50, layout.movement.y, 10);
    const aimPointer = createPointer(2, layout.aim.x, layout.aim.y - 50, 20);
    const thirdTouchInMove = createPointer(3, layout.movement.x + 60, layout.movement.y, 30);

    setActivePointers([movePointer, aimPointer, thirdTouchInMove]);
    emit('pointerdown', movePointer);
    emit('pointerdown', aimPointer);
    emit('pointerdown', thirdTouchInMove); // must NOT steal MOVE

    const combined = controller.getMovementInput();
    expect(combined.source).toBe('pointer');
    expect(combined.movement.x).toBeCloseTo(-1);
    expect(combined.aimActive).toBe(true);
    expect(combined.aim.y).toBeCloseTo(-1);

    // Release AIM and tap PULSE while MOVE stays held
    aimPointer.isDown = false;
    emit('pointerup', aimPointer);
    const pulseTap = createPointer(4, 1244, 400, 40);
    setActivePointers([movePointer, pulseTap]);
    controller.clearOverlaySelectionPointer(pulseTap);
    emit('pointerdown', pulseTap);

    const afterPulse = controller.getMovementInput();
    expect(afterPulse.source).toBe('pointer');
    expect(afterPulse.movement.x).toBeCloseTo(-1);
    expect(afterPulse.aimActive).toBe(false);
    expect(controller.getPointerGuideState().aim.active).toBe(false);
  });

  test('suspend suppresses output while preserving explicit aim', () => {
    const { controller, emit, setActivePointers, layout } = createControllerHarness();
    const aimPointer = createPointer(2, layout.aim.x, layout.aim.y - 10, 20);

    setActivePointers([aimPointer]);
    emit('pointerdown', aimPointer);
    aimPointer.y = layout.aim.y - 80;
    emit('pointermove', aimPointer);

    const activeAim = controller.getMovementInput();
    expect(activeAim.aimActive).toBe(true);
    expect(activeAim.facing.y).toBeLessThan(-0.7);

    controller.suspendForOverlay();
    const suppressed = controller.getMovementInput();

    expect(controller.isSuppressed()).toBe(true);
    expect(suppressed.movement).toEqual(zero);
    expect(suppressed.aimActive).toBe(false);
    expect(suppressed.hasExplicitAim).toBe(true);
    expect(suppressed.facing.y).toBeLessThan(-0.7);
  });

  test('resume reacquires held movement and aim pointers without a new pointerdown', () => {
    const { controller, emit, setActivePointers, layout } = createControllerHarness();
    const movementPointer = createPointer(1, layout.movement.x, layout.movement.y, 10);
    const aimPointer = createPointer(2, layout.aim.x, layout.aim.y, 20);

    setActivePointers([movementPointer, aimPointer]);
    emit('pointerdown', movementPointer);
    movementPointer.x = layout.movement.x + 140; // dragged outside ring before overlay
    emit('pointermove', movementPointer);
    emit('pointerdown', aimPointer);
    aimPointer.y = layout.aim.y - 140; // dragged outside ring before overlay
    emit('pointermove', aimPointer);

    controller.suspendForOverlay();
    controller.resumeAfterOverlay({ activePointers: [movementPointer, aimPointer] });

    const resumed = controller.getMovementInput();
    const guideState = controller.getPointerGuideState();
    expect(resumed.source).toBe('pointer');
    expect(resumed.movement.x).toBeGreaterThan(0.8);
    expect(resumed.aimSource).toBe('pointer');
    expect(resumed.aim.y).toBeLessThan(-0.7);
    expect(guideState.movement.active).toBe(true);
    expect(guideState.aim.active).toBe(true);
  });

  test('resume with no active pointer leaves movement idle and preserves aim', () => {
    const { controller, emit, setActivePointers, layout } = createControllerHarness();
    const aimPointer = createPointer(2, layout.aim.x, layout.aim.y - 60, 20);

    setActivePointers([aimPointer]);
    emit('pointerdown', aimPointer);
    controller.getMovementInput();

    controller.suspendForOverlay();
    aimPointer.isDown = false;
    setActivePointers([]);
    controller.resumeAfterOverlay({ activePointers: [] });

    const resumed = controller.getMovementInput();
    expect(resumed.source).toBe('idle');
    expect(resumed.movement).toEqual(zero);
    expect(resumed.aimActive).toBe(false);
    expect(resumed.hasExplicitAim).toBe(true);
    expect(resumed.aim.y).toBeLessThan(-0.7);
    expect(controller.getPointerGuideState().movement.active).toBe(false);
    expect(controller.getPointerGuideState().aim.active).toBe(false);
  });

  test('overlay selection pointer does not become control and same id works after release', () => {
    const { controller, emit, setActivePointers, layout } = createControllerHarness();
    const selectionPointer = createPointer(9, layout.movement.x + 30, layout.movement.y, 90);

    controller.suspendForOverlay();
    setActivePointers([selectionPointer]);
    controller.resumeAfterOverlay({ ignoredPointer: selectionPointer, activePointers: [selectionPointer] });

    expect(controller.getMovementInput().source).toBe('idle');
    expect(controller.getPointerGuideState().movement.active).toBe(false);

    selectionPointer.isDown = false;
    setActivePointers([]);
    emit('pointerup', selectionPointer);

    const nextPointer = createPointer(9, layout.movement.x + 50, layout.movement.y, 110);
    setActivePointers([nextPointer]);
    emit('pointerdown', nextPointer);

    const freshTouch = controller.getMovementInput();
    expect(freshTouch.source).toBe('pointer');
    expect(freshTouch.movement.x).toBeGreaterThan(0.8);
  });
});

function createControllerHarness(): {
  controller: MovementInputController;
  emit: (eventName: string, pointer: ActivePointerLike) => void;
  setActivePointers: (nextPointers: ActivePointerLike[]) => void;
  layout: ReturnType<typeof getDualJoystickLayout>;
} {
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

  return {
    controller: new MovementInputController(scene as never, keys as never),
    emit: (eventName, pointer) => {
      input.activePointer = pointer;
      for (const handler of handlers.get(eventName) ?? []) {
        handler(pointer);
      }
    },
    setActivePointers: (nextPointers) => {
      manager.pointers = nextPointers;
      input.activePointer = nextPointers[0];
    },
    layout: getDualJoystickLayout(1600, 720),
  };
}

function createPointer(id: number, x: number, y: number, downTime: number): ActivePointerLike {
  return { id, x, y, isDown: true, downTime };
}
