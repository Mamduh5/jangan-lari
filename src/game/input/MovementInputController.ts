import Phaser from 'phaser';
import type { MovementKeys } from './createMovementKeys';

export type MovementVector = {
  x: number;
  y: number;
};

export type MovementSource = 'keyboard' | 'pointer' | 'idle';

export type MovementInputSnapshot = {
  movement: MovementVector;
  facing: MovementVector;
  source: MovementSource;
};

export type MovementChannelInput = {
  vector: MovementVector;
  active: boolean;
};

export type ResolveMovementInputOptions = {
  keyboard: MovementChannelInput;
  pointer: MovementChannelInput;
  previousFacing: MovementVector;
  deadzone?: number;
};

const DEFAULT_FACING: MovementVector = { x: 1, y: 0 };
const POINTER_DEADZONE_PX = 12;

export function normalizeMovementVector(vector: MovementVector): MovementVector {
  const length = Math.hypot(vector.x, vector.y);

  if (length === 0 || !Number.isFinite(length)) {
    return { x: 0, y: 0 };
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
  };
}

export function resolveMovementInput({
  keyboard,
  pointer,
  previousFacing,
  deadzone = POINTER_DEADZONE_PX,
}: ResolveMovementInputOptions): MovementInputSnapshot {
  const stableFacing = normalizeMovementVector(previousFacing);
  const fallbackFacing = stableFacing.x === 0 && stableFacing.y === 0 ? DEFAULT_FACING : stableFacing;

  if (keyboard.active) {
    const movement = normalizeMovementVector(keyboard.vector);
    return {
      movement,
      facing: movement.x === 0 && movement.y === 0 ? fallbackFacing : movement,
      source: 'keyboard',
    };
  }

  if (pointer.active && Math.hypot(pointer.vector.x, pointer.vector.y) >= deadzone) {
    const movement = normalizeMovementVector(pointer.vector);
    return {
      movement,
      facing: movement,
      source: 'pointer',
    };
  }

  return {
    movement: { x: 0, y: 0 },
    facing: fallbackFacing,
    source: 'idle',
  };
}

export class MovementInputController {
  private activePointerId: number | null = null;
  private pointerStart: MovementVector = { x: 0, y: 0 };
  private pointerCurrent: MovementVector = { x: 0, y: 0 };
  private lastFacing: MovementVector = DEFAULT_FACING;

  private readonly handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (this.activePointerId !== null) {
      return;
    }

    this.activePointerId = pointer.id;
    this.pointerStart = { x: pointer.x, y: pointer.y };
    this.pointerCurrent = { x: pointer.x, y: pointer.y };
  };

  private readonly handlePointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.id !== this.activePointerId) {
      return;
    }

    this.pointerCurrent = { x: pointer.x, y: pointer.y };
  };

  private readonly handlePointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.id !== this.activePointerId) {
      return;
    }

    this.resetPointer();
  };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly keys: MovementKeys,
  ) {
    this.scene.input.on('pointerdown', this.handlePointerDown);
    this.scene.input.on('pointermove', this.handlePointerMove);
    this.scene.input.on('pointerup', this.handlePointerUp);
    this.scene.input.on('pointerupoutside', this.handlePointerUp);
    this.scene.input.on('gameout', this.resetPointer, this);
  }

  getMovementInput(): MovementInputSnapshot {
    const snapshot = resolveMovementInput({
      keyboard: this.readKeyboardInput(),
      pointer: this.readPointerInput(),
      previousFacing: this.lastFacing,
    });

    this.lastFacing = snapshot.facing;
    return snapshot;
  }

  resetPointer(): void {
    this.activePointerId = null;
    this.pointerStart = { x: 0, y: 0 };
    this.pointerCurrent = { x: 0, y: 0 };
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this.handlePointerDown);
    this.scene.input.off('pointermove', this.handlePointerMove);
    this.scene.input.off('pointerup', this.handlePointerUp);
    this.scene.input.off('pointerupoutside', this.handlePointerUp);
    this.scene.input.off('gameout', this.resetPointer, this);
    this.resetPointer();
  }

  private readKeyboardInput(): MovementChannelInput {
    const right = this.keys.right.isDown || this.keys.altRight.isDown;
    const left = this.keys.left.isDown || this.keys.altLeft.isDown;
    const down = this.keys.down.isDown || this.keys.altDown.isDown;
    const up = this.keys.up.isDown || this.keys.altUp.isDown;

    return {
      vector: {
        x: Number(right) - Number(left),
        y: Number(down) - Number(up),
      },
      active: right || left || down || up,
    };
  }

  private readPointerInput(): MovementChannelInput {
    return {
      vector: {
        x: this.pointerCurrent.x - this.pointerStart.x,
        y: this.pointerCurrent.y - this.pointerStart.y,
      },
      active: this.activePointerId !== null,
    };
  }
}
