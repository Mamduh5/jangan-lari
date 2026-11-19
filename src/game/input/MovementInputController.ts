import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/constants';
import type { MovementKeys } from './createMovementKeys';
import {
  DEFAULT_JOYSTICK_DEADZONE,
  getDualJoystickLayout,
  hitTestJoystickZone,
  sampleJoystickPointer,
  type DualJoystickLayout,
  type JoystickId,
  type JoystickZoneLayout,
} from './joystickLayout';

export {
  getDualJoystickLayout,
  hitTestJoystickZone,
  isPointInsideJoystick,
  sampleJoystickPointer,
  type DualJoystickLayout,
  type JoystickId,
  type JoystickSample,
  type JoystickZoneLayout,
} from './joystickLayout';

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

export type PointerGuideChannel = {
  active: boolean;
  start: MovementVector;
  current: MovementVector;
  vector: MovementVector;
};

export type PointerGuideState = {
  movement: PointerGuideChannel;
  aim: PointerGuideChannel;
};

export type ActivePointerLike = {
  id: number;
  x: number;
  y: number;
  isDown: boolean;
  downTime?: number;
};

export type PointerChannelState = {
  pointerId: number | null;
  start: MovementVector;
  current: MovementVector;
};

export type ReconcilePointerChannelsOptions = {
  activePointers: ActivePointerLike[];
  viewportWidth: number;
  viewportHeight?: number;
  previousMovement?: PointerChannelState;
  previousAim?: PointerChannelState;
  ignoredPointerIds?: Iterable<number>;
};

export type ReconciledPointerChannels = {
  movement: PointerChannelState;
  aim: PointerChannelState;
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
const POINTER_DEADZONE_PX = DEFAULT_JOYSTICK_DEADZONE;
export type PointerControlZone = JoystickId;

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

export function getPointerControlZone(
  pointerX: number,
  pointerY: number,
  viewportWidth = GAME_WIDTH,
  viewportHeight?: number,
): PointerControlZone | null {
  const layout = getDualJoystickLayout(viewportWidth, viewportHeight);
  return hitTestJoystickZone(pointerX, pointerY, layout);
}

export function createEmptyPointerChannelState(): PointerChannelState {
  return {
    pointerId: null,
    start: { x: 0, y: 0 },
    current: { x: 0, y: 0 },
  };
}

export function reconcilePointerChannels({
  activePointers,
  viewportWidth,
  viewportHeight,
  previousMovement = createEmptyPointerChannelState(),
  previousAim = createEmptyPointerChannelState(),
  ignoredPointerIds = [],
}: ReconcilePointerChannelsOptions): ReconciledPointerChannels {
  const layout = getDualJoystickLayout(viewportWidth, viewportHeight);
  const ignored = new Set(ignoredPointerIds);
  const candidates = activePointers
    .filter((pointer) => pointer.isDown && !ignored.has(pointer.id))
    .sort((left, right) => {
      const leftDownTime = left.downTime ?? Number.MAX_SAFE_INTEGER;
      const rightDownTime = right.downTime ?? Number.MAX_SAFE_INTEGER;
      return leftDownTime === rightDownTime ? left.id - right.id : leftDownTime - rightDownTime;
    });

  const claimedPointerIds = new Set<number>();

  const resumedMovement = findResumedPointer(candidates, previousMovement, claimedPointerIds);
  if (resumedMovement) {
    claimedPointerIds.add(resumedMovement.id);
  }

  const resumedAim = findResumedPointer(candidates, previousAim, claimedPointerIds);
  if (resumedAim) {
    claimedPointerIds.add(resumedAim.id);
  }

  const movementPointer =
    resumedMovement ??
    candidates.find(
      (pointer) =>
        !claimedPointerIds.has(pointer.id) && hitTestJoystickZone(pointer.x, pointer.y, layout) === 'movement',
    ) ??
    null;
  if (movementPointer) {
    claimedPointerIds.add(movementPointer.id);
  }

  const aimPointer =
    resumedAim ??
    candidates.find(
      (pointer) => !claimedPointerIds.has(pointer.id) && hitTestJoystickZone(pointer.x, pointer.y, layout) === 'aim',
    ) ??
    null;

  return {
    movement: buildReconciledChannelState(movementPointer, layout.movement),
    aim: buildReconciledChannelState(aimPointer, layout.aim),
  };
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

export type MovementInputControllerOptions = {
  disableAimPointer?: boolean;
};

export class MovementInputController {
  private readonly disableAimPointer: boolean;
  private movementPointerId: number | null = null;
  private movementPointerStart: MovementVector = { x: 0, y: 0 };
  private movementPointerCurrent: MovementVector = { x: 0, y: 0 };
  private aimPointerId: number | null = null;
  private aimPointerStart: MovementVector = { x: 0, y: 0 };
  private aimPointerCurrent: MovementVector = { x: 0, y: 0 };
  private lastFacing: MovementVector = DEFAULT_FACING;
  private hasExplicitAim = false;
  private inputSuppressed = false;
  private suspendedMovementPointer: PointerChannelState = createEmptyPointerChannelState();
  private suspendedAimPointer: PointerChannelState = createEmptyPointerChannelState();
  private readonly ignoredPointers = new Map<number, { downTime: number; x: number; y: number }>();

  private readonly handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    const ignoredPointer = this.ignoredPointers.get(pointer.id);
    if (ignoredPointer) {
      const sameDownTime = (pointer.downTime ?? ignoredPointer.downTime) <= ignoredPointer.downTime;
      const samePosition = Math.hypot(pointer.x - ignoredPointer.x, pointer.y - ignoredPointer.y) < 1;
      if (sameDownTime && samePosition) {
        return;
      }

      this.ignoredPointers.delete(pointer.id);
    }

    if (this.inputSuppressed) {
      return;
    }

    const layout = this.getJoystickLayout();
    const zone = hitTestJoystickZone(pointer.x, pointer.y, layout);

    if (!zone) {
      return;
    }

    if (zone === 'movement') {
      if (this.movementPointerId !== null) {
        return;
      }

      this.movementPointerId = pointer.id;
      this.movementPointerStart = { x: layout.movement.x, y: layout.movement.y };
      this.movementPointerCurrent = { x: pointer.x, y: pointer.y };
      return;
    }

    if (this.disableAimPointer || this.aimPointerId !== null) {
      return;
    }

    this.aimPointerId = pointer.id;
    this.aimPointerStart = { x: layout.aim.x, y: layout.aim.y };
    this.aimPointerCurrent = { x: pointer.x, y: pointer.y };
  };

  private readonly handlePointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (this.inputSuppressed) {
      return;
    }

    if (pointer.id === this.movementPointerId) {
      this.movementPointerCurrent = { x: pointer.x, y: pointer.y };
    }

    if (pointer.id === this.aimPointerId) {
      this.aimPointerCurrent = { x: pointer.x, y: pointer.y };
    }
  };

  private readonly handlePointerUp = (pointer: Phaser.Input.Pointer): void => {
    this.ignoredPointers.delete(pointer.id);

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
    options: MovementInputControllerOptions = {},
  ) {
    this.disableAimPointer = Boolean(options.disableAimPointer);
    this.scene.input.on('pointerdown', this.handlePointerDown);
    this.scene.input.on('pointermove', this.handlePointerMove);
    this.scene.input.on('pointerup', this.handlePointerUp);
    this.scene.input.on('pointerupoutside', this.handlePointerUp);
    // this.scene.input.on('gameout', this.resetPointer, this);
  }

  getMovementInput(): MovementInputSnapshot {
    this.clearReleasedPointers();

    if (this.inputSuppressed) {
      const snapshot = resolveMovementInput({
        keyboard: { vector: { x: 0, y: 0 }, active: false },
        pointer: { vector: { x: 0, y: 0 }, active: false },
        aimPointer: { vector: { x: 0, y: 0 }, active: false },
        previousFacing: this.lastFacing,
        hasExplicitAim: this.hasExplicitAim,
      });

      this.lastFacing = snapshot.facing;
      this.hasExplicitAim = snapshot.hasExplicitAim;
      return snapshot;
    }

    const layout = this.getJoystickLayout();
    const snapshot = resolveMovementInput({
      keyboard: this.readKeyboardInput(),
      pointer: this.readMovementPointerInput(layout),
      aimPointer: this.readAimPointerInput(layout),
      previousFacing: this.lastFacing,
      hasExplicitAim: this.hasExplicitAim,
      deadzone: layout.movement.deadzone,
    });

    this.lastFacing = snapshot.facing;
    this.hasExplicitAim = snapshot.hasExplicitAim;
    return snapshot;
  }

  suspendForOverlay(): void {
    if (this.inputSuppressed) {
      return;
    }

    this.inputSuppressed = true;
    this.suspendedMovementPointer = this.createPointerChannelState(
      this.movementPointerId,
      this.movementPointerStart,
      this.movementPointerCurrent,
    );
    this.suspendedAimPointer = this.createPointerChannelState(this.aimPointerId, this.aimPointerStart, this.aimPointerCurrent);
    this.resetPointer();
  }

  resumeAfterOverlay(options: { ignoredPointer?: ActivePointerLike | null; activePointers?: ActivePointerLike[] } = {}): void {
    this.inputSuppressed = false;
    if (options.ignoredPointer) {
      this.ignoreOverlaySelectionPointer(options.ignoredPointer);
    }
    this.reconcileActivePointers(options.activePointers);
  }

  setSuppressed(suppressed: boolean): void {
    if (suppressed) {
      this.suspendForOverlay();
      return;
    }

    this.resumeAfterOverlay();
  }

  isSuppressed(): boolean {
    return this.inputSuppressed;
  }

  reconcileActivePointers(activePointers = this.collectActivePointers()): void {
    this.pruneIgnoredPointers(activePointers);
    const reconciled = reconcilePointerChannels({
      activePointers,
      viewportWidth: this.scene.scale.width,
      viewportHeight: this.scene.scale.height,
      previousMovement: this.suspendedMovementPointer,
      previousAim: this.suspendedAimPointer,
      ignoredPointerIds: this.ignoredPointers.keys(),
    });

    this.applyPointerChannelState('movement', reconciled.movement);
    this.applyPointerChannelState('aim', this.disableAimPointer ? createEmptyPointerChannelState() : reconciled.aim);
    this.suspendedMovementPointer = createEmptyPointerChannelState();
    this.suspendedAimPointer = createEmptyPointerChannelState();
  }

  isPointerClaimed(pointerId: number): boolean {
    return this.movementPointerId === pointerId || this.aimPointerId === pointerId;
  }

  setFacingDirection(direction: MovementVector): void {
    const normalized = normalizeMovementVector(direction);
    if (normalized.x === 0 && normalized.y === 0) {
      return;
    }

    this.lastFacing = normalized;
  }

  ignoreOverlaySelectionPointer(pointer: ActivePointerLike): void {
    this.ignoredPointers.set(pointer.id, { downTime: pointer.downTime ?? 0, x: pointer.x, y: pointer.y });
  }

  clearOverlaySelectionPointer(pointer: ActivePointerLike): void {
    this.ignoreOverlaySelectionPointer(pointer);

    if (this.movementPointerId === pointer.id) {
      this.resetMovementPointer();
    }

    if (this.aimPointerId === pointer.id) {
      this.resetAimPointer();
    }
  }

  resetPointer(): void {
    this.resetMovementPointer();
    this.resetAimPointer();
  }

  getPointerGuideState(): PointerGuideState {
    const layout = this.getJoystickLayout();
    return {
      movement: this.createPointerGuideChannel(
        !this.inputSuppressed && this.movementPointerId !== null,
        layout.movement,
        this.movementPointerCurrent,
      ),
      aim: this.createPointerGuideChannel(
        !this.inputSuppressed && this.aimPointerId !== null,
        layout.aim,
        this.aimPointerCurrent,
      ),
    };
  }

  getJoystickLayout(): DualJoystickLayout {
    const width = this.scene.scale?.width ?? GAME_WIDTH;
    const height = this.scene.scale?.height;
    return getDualJoystickLayout(width, height);
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this.handlePointerDown);
    this.scene.input.off('pointermove', this.handlePointerMove);
    this.scene.input.off('pointerup', this.handlePointerUp);
    this.scene.input.off('pointerupoutside', this.handlePointerUp);
    // this.scene.input.off('gameout', this.resetPointer, this);
    this.resetPointer();
    this.ignoredPointers.clear();
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

  private readMovementPointerInput(layout: DualJoystickLayout): MovementChannelInput {
    return {
      vector: {
        x: this.movementPointerCurrent.x - layout.movement.x,
        y: this.movementPointerCurrent.y - layout.movement.y,
      },
      active: this.movementPointerId !== null,
    };
  }

  private readAimPointerInput(layout: DualJoystickLayout): MovementChannelInput {
    return {
      vector: {
        x: this.aimPointerCurrent.x - layout.aim.x,
        y: this.aimPointerCurrent.y - layout.aim.y,
      },
      active: this.aimPointerId !== null,
    };
  }

  private createPointerGuideChannel(
    active: boolean,
    zone: JoystickZoneLayout,
    current: MovementVector,
  ): PointerGuideChannel {
    if (!active) {
      return {
        active: false,
        start: { x: zone.x, y: zone.y },
        current: { x: zone.x, y: zone.y },
        vector: { x: 0, y: 0 },
      };
    }

    const sample = sampleJoystickPointer(current, zone);
    return {
      active: true,
      start: { x: zone.x, y: zone.y },
      current: { ...current },
      vector: sample.knobOffset,
    };
  }

  private createPointerChannelState(
    pointerId: number | null,
    start: MovementVector,
    current: MovementVector,
  ): PointerChannelState {
    return {
      pointerId,
      start: { ...start },
      current: { ...current },
    };
  }

  private applyPointerChannelState(channel: PointerControlZone, state: PointerChannelState): void {
    if (channel === 'movement') {
      this.movementPointerId = state.pointerId;
      this.movementPointerStart = { ...state.start };
      this.movementPointerCurrent = { ...state.current };
      return;
    }

    this.aimPointerId = state.pointerId;
    this.aimPointerStart = { ...state.start };
    this.aimPointerCurrent = { ...state.current };
  }

  private collectActivePointers(): ActivePointerLike[] {
    const inputManager = this.scene.input.manager as Phaser.Input.InputManager & {
      pointers?: Phaser.Input.Pointer[];
      mousePointer?: Phaser.Input.Pointer;
    };
    const pointerCandidates = [
      ...(Array.isArray(inputManager.pointers) ? inputManager.pointers : []),
      inputManager.mousePointer,
      this.scene.input.activePointer,
    ];
    const activePointers = new Map<number, ActivePointerLike>();

    for (const pointer of pointerCandidates) {
      if (!pointer || typeof pointer.id !== 'number' || !pointer.isDown) {
        continue;
      }

      activePointers.set(pointer.id, {
        id: pointer.id,
        x: pointer.x,
        y: pointer.y,
        isDown: pointer.isDown,
        downTime: pointer.downTime,
      });
    }

    return Array.from(activePointers.values());
  }

  private clearReleasedPointers(): void {
    const activePointerIds = new Set(this.collectActivePointers().map((pointer) => pointer.id));

    if (this.movementPointerId !== null && !activePointerIds.has(this.movementPointerId)) {
      this.resetMovementPointer();
    }

    if (this.aimPointerId !== null && !activePointerIds.has(this.aimPointerId)) {
      this.resetAimPointer();
    }

    for (const pointerId of this.ignoredPointers.keys()) {
      if (!activePointerIds.has(pointerId)) {
        this.ignoredPointers.delete(pointerId);
      }
    }
  }

  private pruneIgnoredPointers(activePointers: ActivePointerLike[]): void {
    const activePointerIds = new Set(activePointers.filter((pointer) => pointer.isDown).map((pointer) => pointer.id));
    for (const pointerId of this.ignoredPointers.keys()) {
      if (!activePointerIds.has(pointerId)) {
        this.ignoredPointers.delete(pointerId);
      }
    }
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

function findResumedPointer(
  candidates: ActivePointerLike[],
  previous: PointerChannelState,
  claimedPointerIds: Set<number>,
): ActivePointerLike | null {
  if (previous.pointerId === null) {
    return null;
  }

  return candidates.find((pointer) => pointer.id === previous.pointerId && !claimedPointerIds.has(pointer.id)) ?? null;
}

function buildReconciledChannelState(
  selected: ActivePointerLike | null,
  zone: JoystickZoneLayout,
): PointerChannelState {
  if (!selected) {
    return createEmptyPointerChannelState();
  }

  return {
    pointerId: selected.id,
    start: { x: zone.x, y: zone.y },
    current: { x: selected.x, y: selected.y },
  };
}
