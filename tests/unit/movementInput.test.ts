import {
  getPointerControlZone,
  normalizeMovementVector,
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
});
