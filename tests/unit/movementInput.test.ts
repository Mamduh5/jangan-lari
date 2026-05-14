import {
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
  });

  test('uses pointer drag when keyboard is inactive', () => {
    const input = resolveMovementInput({
      keyboard: { vector: zero, active: false },
      pointer: { vector: { x: 40, y: 40 }, active: true },
      previousFacing: right,
    });

    expect(input.source).toBe('pointer');
    expect(input.movement.x).toBeCloseTo(Math.SQRT1_2);
    expect(input.movement.y).toBeCloseTo(Math.SQRT1_2);
    expect(input.facing).toEqual(input.movement);
  });

  test('preserves facing when idle or when opposing keys cancel movement', () => {
    const previousFacing = { x: 0, y: 1 };

    expect(
      resolveMovementInput({
        keyboard: { vector: zero, active: false },
        pointer: { vector: zero, active: false },
        previousFacing,
      }),
    ).toEqual({
      movement: zero,
      facing: previousFacing,
      source: 'idle',
    });

    expect(
      resolveMovementInput({
        keyboard: { vector: zero, active: true },
        pointer: { vector: { x: 50, y: 0 }, active: true },
        previousFacing,
      }),
    ).toEqual({
      movement: zero,
      facing: previousFacing,
      source: 'keyboard',
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

    expect(released).toEqual({ movement: zero, facing: right, source: 'idle' });
    expect(underDeadzone).toEqual({ movement: zero, facing: right, source: 'idle' });
  });
});
