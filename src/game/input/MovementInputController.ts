import Phaser from 'phaser';
import type { MovementKeys } from './createMovementKeys';

export type MovementVector = {
  x: number;
  y: number;
};

export type MovementSource = 'keyboard' | 'pointer' | 'idle';
export type AimSource = 'pointer' | 'movement' | 'idle';

export type MovementInputSnapshot = {
  movement: MovementVector;
  facing: MovementVector;
  source: MovementSource;
  aim: MovementVector;
  aimActive: boolean;
  aimSource: AimSource;
  hasExplicitAim: boolean;
};

export type MovementChannelInput = {
  vector: MovementVector;
  active: boolean;
};

export type ResolveMovementInputOptions = {
  keyboard: MovementChannelInput;
  pointer: MovementChannelInput;
  aimPointer?: MovementChannelInput;
  previousFacing: MovementVector;
  hasExplicitAim?: boolean;
  deadzone?: number;
};

const DEFAULT_FACING: MovementVector = { x: 1, y: 0 };
const POINTER_DEADZONE_PX = 12;
export type PointerControlZone = 'movement' | 'aim';

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

export function getPointerControlZone(pointerX: number, viewportWidth: number): PointerControlZone {
  return pointerX < viewportWidth / 2 ? 'movement' : 'aim';
}

export function resolveMovementInput({
  keyboard,
  pointer,
  aimPointer = { vector: { x: 0, y: 0 }, active: false },
  previousFacing,
  hasExplicitAim = false,
  deadzone = POINTER_DEADZONE_PX,
}: ResolveMovementInputOptions): MovementInputSnapshot {
  const stableFacing = normalizeMovementVector(previousFacing);
  const fallbackFacing = stableFacing.x === 0 && stableFacing.y === 0 ? DEFAULT_FACING : stableFacing;
  let movement: MovementVector = { x: 0, y: 0 };
  let source: MovementSource = 'idle';

  if (keyboard.active) {
    movement = normalizeMovementVector(keyboard.vector);
    source = 'keyboard';
  } else if (pointer.active && Math.hypot(pointer.vector.x, pointer.vector.y) >= deadzone) {
    movement = normalizeMovementVector(pointer.vector);
    source = 'pointer';
  }

  if (aimPointer.active && Math.hypot(aimPointer.vector.x, aimPointer.vector.y) >= deadzone) {
    const aim = normalizeMovementVector(aimPointer.vector);
    return {
      movement,
      facing: aim,
      source,
      aim,
      aimActive: true,
      aimSource: 'pointer',
      hasExplicitAim: true,
    };
  }

  if (!hasExplicitAim && (movement.x !== 0 || movement.y !== 0)) {
    return {
      movement,
      facing: movement,
      source,
      aim: movement,
      aimActive: false,
      aimSource: 'movement',
      hasExplicitAim: false,
    };
  }

  return {
    movement,
    facing: fallbackFacing,
    source,
    aim: fallbackFacing,
    aimActive: false,
    aimSource: 'idle',
    hasExplicitAim,
  };
}

export class MovementInputController {
  private movementPointerId: number | null = null;
  private movementPointerStart: MovementVector = { x: 0, y: 0 };
  private movementPointerCurrent: MovementVector = { x: 0, y: 0 };
  private aimPointerId: number | null = null;
  private aimPointerStart: MovementVector = { x: 0, y: 0 };
  private aimPointerCurrent: MovementVector = { x: 0, y: 0 };
  private lastFacing: MovementVector = DEFAULT_FACING;
  private hasExplicitAim = false;

  private readonly handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    const zone = getPointerControlZone(pointer.x, this.scene.scale.width);

    if (zone === 'movement') {
      if (this.movementPointerId !== null) {
        return;
      }

      this.movementPointerId = pointer.id;
      this.movementPointerStart = { x: pointer.x, y: pointer.y };
      this.movementPointerCurrent = { x: pointer.x, y: pointer.y };
      return;
    }

    if (this.aimPointerId !== null) {
      return;
    }

    this.aimPointerId = pointer.id;
    this.aimPointerStart = { x: pointer.x, y: pointer.y };
    this.aimPointerCurrent = { x: pointer.x, y: pointer.y };
  };

  private readonly handlePointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.id === this.movementPointerId) {
      this.movementPointerCurrent = { x: pointer.x, y: pointer.y };
    }

    if (pointer.id === this.aimPointerId) {
      this.aimPointerCurrent = { x: pointer.x, y: pointer.y };
    }
  };

  private readonly handlePointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.id === this.movementPointerId) {
      this.resetMovementPointer();
    }

    if (pointer.id === this.aimPointerId) {
      this.resetAimPointer();
    }
  };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly keys: MovementKeys,
  ) {
    this.scene.input.on('pointerdown', this.handlePointerDown);
    this.scene.input.on('pointermove', this.handlePointerMove);
    this.scene.input.on('pointerup', this.handlePointerUp);
    this.scene.input.on('pointerupoutside', this.handlePointerUp);
    // this.scene.input.on('gameout', this.resetPointer, this);
  }

  getMovementInput(): MovementInputSnapshot {
    const snapshot = resolveMovementInput({
      keyboard: this.readKeyboardInput(),
      pointer: this.readMovementPointerInput(),
      aimPointer: this.readAimPointerInput(),
      previousFacing: this.lastFacing,
      hasExplicitAim: this.hasExplicitAim,
    });

    this.lastFacing = snapshot.facing;
    this.hasExplicitAim = snapshot.hasExplicitAim;
    return snapshot;
  }

  resetPointer(): void {
    this.resetMovementPointer();
    this.resetAimPointer();
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this.handlePointerDown);
    this.scene.input.off('pointermove', this.handlePointerMove);
    this.scene.input.off('pointerup', this.handlePointerUp);
    this.scene.input.off('pointerupoutside', this.handlePointerUp);
    // this.scene.input.off('gameout', this.resetPointer, this);
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

  private readMovementPointerInput(): MovementChannelInput {
    return {
      vector: {
        x: this.movementPointerCurrent.x - this.movementPointerStart.x,
        y: this.movementPointerCurrent.y - this.movementPointerStart.y,
      },
      active: this.movementPointerId !== null,
    };
  }

  private readAimPointerInput(): MovementChannelInput {
    return {
      vector: {
        x: this.aimPointerCurrent.x - this.aimPointerStart.x,
        y: this.aimPointerCurrent.y - this.aimPointerStart.y,
      },
      active: this.aimPointerId !== null,
    };
  }

  private resetMovementPointer(): void {
    this.movementPointerId = null;
    this.movementPointerStart = { x: 0, y: 0 };
    this.movementPointerCurrent = { x: 0, y: 0 };
  }

  private resetAimPointer(): void {
    this.aimPointerId = null;
    this.aimPointerStart = { x: 0, y: 0 };
    this.aimPointerCurrent = { x: 0, y: 0 };
  }
}
