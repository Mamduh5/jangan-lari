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

describe('movement input helpers', () => {
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

  test('classifies left and right screen halves for dual-zone touch controls', () => {
    expect(getPointerControlZone(120, 800)).toBe('movement');
    expect(getPointerControlZone(520, 800)).toBe('aim');
  });

  test('reconciles held left and right pointers using their original control starts', () => {
    const reconciled = reconcilePointerChannels({
      viewportWidth: 1600,
      activePointers: [
        { id: 1, x: 260, y: 300, isDown: true, downTime: 10 },
        { id: 2, x: 1260, y: 220, isDown: true, downTime: 20 },
      ],
      previousMovement: {
        pointerId: 1,
        start: { x: 140, y: 300 },
        current: { x: 240, y: 300 },
      },
      previousAim: {
        pointerId: 2,
        start: { x: 1260, y: 300 },
        current: { x: 1260, y: 240 },
      },
    });

    expect(reconciled.movement.pointerId).toBe(1);
    expect(reconciled.movement.start).toEqual({ x: 140, y: 300 });
    expect(reconciled.movement.current).toEqual({ x: 260, y: 300 });
    expect(reconciled.aim.pointerId).toBe(2);
    expect(reconciled.aim.start).toEqual({ x: 1260, y: 300 });
    expect(reconciled.aim.current).toEqual({ x: 1260, y: 220 });
  });

  test('ignores an overlay selection pointer during reconciliation', () => {
    const reconciled = reconcilePointerChannels({
      viewportWidth: 1600,
      activePointers: [{ id: 9, x: 240, y: 360, isDown: true, downTime: 90 }],
      ignoredPointerIds: [9],
    });

    expect(reconciled.movement.pointerId).toBeNull();
    expect(reconciled.aim.pointerId).toBeNull();
  });

  test('suspend suppresses output while preserving explicit aim', () => {
    const { controller, emit, setActivePointers } = createControllerHarness();
    const aimPointer = createPointer(2, 1260, 300, 20);

    setActivePointers([aimPointer]);
    emit('pointerdown', aimPointer);
    aimPointer.y = 220;
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
    const { controller, emit, setActivePointers } = createControllerHarness();
    const movementPointer = createPointer(1, 140, 300, 10);
    const aimPointer = createPointer(2, 1260, 300, 20);

    setActivePointers([movementPointer, aimPointer]);
    emit('pointerdown', movementPointer);
    movementPointer.x = 250;
    emit('pointermove', movementPointer);
    emit('pointerdown', aimPointer);
    aimPointer.y = 220;
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
    const { controller, emit, setActivePointers } = createControllerHarness();
    const aimPointer = createPointer(2, 1260, 300, 20);

    setActivePointers([aimPointer]);
    emit('pointerdown', aimPointer);
    aimPointer.y = 220;
    emit('pointermove', aimPointer);
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
    const { controller, emit, setActivePointers } = createControllerHarness();
    const selectionPointer = createPointer(9, 220, 360, 90);

    controller.suspendForOverlay();
    setActivePointers([selectionPointer]);
    controller.resumeAfterOverlay({ ignoredPointer: selectionPointer, activePointers: [selectionPointer] });

    expect(controller.getMovementInput().source).toBe('idle');
    expect(controller.getPointerGuideState().movement.active).toBe(false);

    selectionPointer.isDown = false;
    setActivePointers([]);
    emit('pointerup', selectionPointer);

    const nextPointer = createPointer(9, 140, 300, 110);
    setActivePointers([nextPointer]);
    emit('pointerdown', nextPointer);
    nextPointer.x = 240;
    emit('pointermove', nextPointer);

    const freshTouch = controller.getMovementInput();
    expect(freshTouch.source).toBe('pointer');
    expect(freshTouch.movement.x).toBeGreaterThan(0.8);
  });
});

function createControllerHarness(): {
  controller: MovementInputController;
  emit: (eventName: string, pointer: ActivePointerLike) => void;
  setActivePointers: (nextPointers: ActivePointerLike[]) => void;
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
    scale: { width: 1600 },
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
  };
}

function createPointer(id: number, x: number, y: number, downTime: number): ActivePointerLike {
  return { id, x, y, isDown: true, downTime };
}
