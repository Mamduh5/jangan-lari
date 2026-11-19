import type Phaser from 'phaser';
import { GAME_WIDTH } from '../config/constants';
import {
  getManualAttackControlLayout,
  isPointInsideManualAttackButton,
  isPointInsideManualCancelZone,
  type ManualAttackControlLayout,
} from './joystickLayout';
import type { ActivePointerLike, MovementVector } from './MovementInputController';

export type ManualAttackPhase = 'idle' | 'pressed' | 'aiming' | 'canceling';

export type ManualAttackCommandKind = 'tap' | 'aimed';

export type ManualAttackCommand = {
  id: number;
  kind: ManualAttackCommandKind;
  direction: MovementVector | null;
  issuedAtMs: number;
};

export type ManualAttackGuideState = {
  phase: ManualAttackPhase;
  active: boolean;
  start: MovementVector;
  current: MovementVector;
  aimDirection: MovementVector | null;
  knobOffset: MovementVector;
  cancelHighlighted: boolean;
};

export type ManualAttackControllerOptions = {
  isPointerClaimedExternally?: (pointerId: number) => boolean;
};

export class ManualAttackController {
  private attackPointerId: number | null = null;
  private phase: ManualAttackPhase = 'idle';
  private touchStart: MovementVector = { x: 0, y: 0 };
  private touchCurrent: MovementVector = { x: 0, y: 0 };
  private aimDirection: MovementVector | null = null;
  private enteredAiming = false;
  private suppressed = false;
  private pendingCommand: ManualAttackCommand | null = null;
  private commandSequence = 0;
  private readonly ignoredPointers = new Map<number, { downTime: number; x: number; y: number }>();
  private readonly isPointerClaimedExternally?: (pointerId: number) => boolean;

  private readonly handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    const ignored = this.ignoredPointers.get(pointer.id);
    if (ignored) {
      const sameDownTime = (pointer.downTime ?? ignored.downTime) <= ignored.downTime;
      const samePosition = Math.hypot(pointer.x - ignored.x, pointer.y - ignored.y) < 1;
      if (sameDownTime && samePosition) {
        return;
      }

      this.ignoredPointers.delete(pointer.id);
    }

    if (this.suppressed || this.attackPointerId !== null) {
      return;
    }

    if (this.isPointerClaimedExternally?.(pointer.id)) {
      return;
    }

    const layout = this.getLayout();
    if (!isPointInsideManualAttackButton({ x: pointer.x, y: pointer.y }, layout)) {
      return;
    }

    this.attackPointerId = pointer.id;
    this.phase = 'pressed';
    this.touchStart = { x: pointer.x, y: pointer.y };
    this.touchCurrent = { x: pointer.x, y: pointer.y };
    this.aimDirection = null;
    this.enteredAiming = false;
  };

  private readonly handlePointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (this.suppressed || pointer.id !== this.attackPointerId) {
      return;
    }

    const layout = this.getLayout();
    this.touchCurrent = { x: pointer.x, y: pointer.y };

    if (isPointInsideManualCancelZone(this.touchCurrent, layout)) {
      this.enteredAiming = true;
      this.phase = 'canceling';
      return;
    }

    const dx = this.touchCurrent.x - this.touchStart.x;
    const dy = this.touchCurrent.y - this.touchStart.y;
    const distance = Math.hypot(dx, dy);

    if (!this.enteredAiming && distance >= layout.attackButton.dragThreshold) {
      this.enteredAiming = true;
    }

    if (this.enteredAiming) {
      this.phase = 'aiming';
      if (distance >= layout.attackButton.aimDeadzone && distance > 0) {
        this.aimDirection = { x: dx / distance, y: dy / distance };
      }
    }
  };

  private readonly handlePointerUp = (pointer: Phaser.Input.Pointer): void => {
    this.ignoredPointers.delete(pointer.id);

    if (pointer.id !== this.attackPointerId) {
      return;
    }

    const layout = this.getLayout();
    this.touchCurrent = { x: pointer.x, y: pointer.y };

    // Final gesture check at exact release coordinates so ultra-fast flicks into cancel or aim resolve accurately.
    if (isPointInsideManualCancelZone(this.touchCurrent, layout)) {
      this.enteredAiming = true;
      this.phase = 'canceling';
    } else if (!this.enteredAiming) {
      const dx = this.touchCurrent.x - this.touchStart.x;
      const dy = this.touchCurrent.y - this.touchStart.y;
      const distance = Math.hypot(dx, dy);
      if (distance >= layout.attackButton.dragThreshold && distance > 0) {
        this.enteredAiming = true;
        this.phase = 'aiming';
        this.aimDirection = { x: dx / distance, y: dy / distance };
      }
    }

    if (!this.suppressed) {
      if (this.phase === 'pressed' && !this.enteredAiming) {
        this.enqueueCommand('tap', null);
      } else if (this.phase === 'aiming' && this.aimDirection) {
        this.enqueueCommand('aimed', { ...this.aimDirection });
      }
      // Canceling or entered-aiming without a valid direction intentionally emits no command.
    }

    this.resetActiveGesture();
  };

  private readonly handlePointerUpOutside = (pointer: Phaser.Input.Pointer): void => {
    this.ignoredPointers.delete(pointer.id);

    if (pointer.id !== this.attackPointerId) {
      return;
    }

    // Releasing outside the game viewport always cancels cleanly with no ambiguous shot or stuck state.
    this.resetActiveGesture();
  };

  constructor(
    private readonly scene: Phaser.Scene,
    options: ManualAttackControllerOptions = {},
  ) {
    this.isPointerClaimedExternally = options.isPointerClaimedExternally;
    this.scene.input.on('pointerdown', this.handlePointerDown);
    this.scene.input.on('pointermove', this.handlePointerMove);
    this.scene.input.on('pointerup', this.handlePointerUp);
    this.scene.input.on('pointerupoutside', this.handlePointerUpOutside);
  }

  getLayout(): ManualAttackControlLayout {
    const width = this.scene.scale?.width ?? GAME_WIDTH;
    const height = this.scene.scale?.height;
    return getManualAttackControlLayout(width, height);
  }

  isPointerClaimed(pointerId: number): boolean {
    return this.attackPointerId === pointerId;
  }

  isSuppressed(): boolean {
    return this.suppressed;
  }

  consumePendingCommand(): ManualAttackCommand | null {
    this.clearReleasedPointers();
    if (this.suppressed || !this.pendingCommand) {
      this.pendingCommand = null;
      return null;
    }

    const command = this.pendingCommand;
    this.pendingCommand = null;
    return command;
  }

  getGuideState(): ManualAttackGuideState {
    this.clearReleasedPointers();
    const layout = this.getLayout();

    if (this.suppressed || this.attackPointerId === null || this.phase === 'idle') {
      return {
        phase: 'idle',
        active: false,
        start: { x: layout.attackButton.x, y: layout.attackButton.y },
        current: { x: layout.attackButton.x, y: layout.attackButton.y },
        aimDirection: null,
        knobOffset: { x: 0, y: 0 },
        cancelHighlighted: false,
      };
    }

    let knobOffset: MovementVector = { x: 0, y: 0 };
    if (this.phase === 'aiming' && this.aimDirection) {
      const rawDist = Math.hypot(
        this.touchCurrent.x - this.touchStart.x,
        this.touchCurrent.y - this.touchStart.y,
      );
      const clampedDist = Math.min(Math.max(rawDist, layout.attackButton.dragThreshold), layout.attackButton.maxKnobTravel);
      knobOffset = {
        x: this.aimDirection.x * clampedDist,
        y: this.aimDirection.y * clampedDist,
      };
    }

    return {
      phase: this.phase,
      active: true,
      start: { ...this.touchStart },
      current: { ...this.touchCurrent },
      aimDirection: this.aimDirection ? { ...this.aimDirection } : null,
      knobOffset,
      cancelHighlighted: this.phase === 'canceling',
    };
  }

  suspendForOverlay(): void {
    this.suppressed = true;
    this.pendingCommand = null;

    if (this.attackPointerId !== null) {
      this.ignoredPointers.set(this.attackPointerId, {
        downTime: Number.MAX_SAFE_INTEGER,
        x: this.touchCurrent.x,
        y: this.touchCurrent.y,
      });
    }

    this.resetActiveGesture();
  }

  resumeAfterOverlay(options: { ignoredPointer?: ActivePointerLike | null; activePointers?: ActivePointerLike[] } = {}): void {
    this.suppressed = false;
    this.pendingCommand = null;

    if (options.ignoredPointer) {
      this.ignoreOverlaySelectionPointer(options.ignoredPointer);
    }

    // Any pointer still held across an overlay close is explicitly ignored so no ghost attack fires.
    const activePointers = options.activePointers ?? this.collectActivePointers();
    for (const pointer of activePointers) {
      if (pointer.isDown) {
        this.ignoreOverlaySelectionPointer(pointer);
      }
    }

    this.pruneIgnoredPointers(activePointers);
    this.resetActiveGesture();
  }

  ignoreOverlaySelectionPointer(pointer: ActivePointerLike): void {
    this.ignoredPointers.set(pointer.id, {
      downTime: pointer.downTime ?? 0,
      x: pointer.x,
      y: pointer.y,
    });
  }

  clearOverlaySelectionPointer(pointer: ActivePointerLike): void {
    this.ignoreOverlaySelectionPointer(pointer);
    if (this.attackPointerId === pointer.id) {
      this.resetActiveGesture();
    }
  }

  reset(): void {
    this.pendingCommand = null;
    this.resetActiveGesture();
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this.handlePointerDown);
    this.scene.input.off('pointermove', this.handlePointerMove);
    this.scene.input.off('pointerup', this.handlePointerUp);
    this.scene.input.off('pointerupoutside', this.handlePointerUpOutside);
    this.pendingCommand = null;
    this.resetActiveGesture();
    this.ignoredPointers.clear();
  }

  private enqueueCommand(kind: ManualAttackCommandKind, direction: MovementVector | null): void {
    this.commandSequence += 1;
    const now = typeof this.scene.time?.now === 'number' ? this.scene.time.now : 0;
    this.pendingCommand = {
      id: this.commandSequence,
      kind,
      direction,
      issuedAtMs: now,
    };
  }

  private resetActiveGesture(): void {
    this.attackPointerId = null;
    this.phase = 'idle';
    this.touchStart = { x: 0, y: 0 };
    this.touchCurrent = { x: 0, y: 0 };
    this.aimDirection = null;
    this.enteredAiming = false;
  }

  private collectActivePointers(): ActivePointerLike[] {
    const inputManager = this.scene.input?.manager as
      | (Phaser.Input.InputManager & {
          pointers?: Phaser.Input.Pointer[];
          mousePointer?: Phaser.Input.Pointer;
        })
      | undefined;
    const pointerCandidates = [
      ...(Array.isArray(inputManager?.pointers) ? inputManager.pointers : []),
      inputManager?.mousePointer,
      this.scene.input?.activePointer,
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

    if (this.attackPointerId !== null && !activePointerIds.has(this.attackPointerId)) {
      // OS touch cancel or missed pointerup resets cleanly without firing a ghost attack.
      this.resetActiveGesture();
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
}
