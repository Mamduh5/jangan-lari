import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';

export type JoystickId = 'movement' | 'aim';

export type JoystickPoint = {
  x: number;
  y: number;
};

export type JoystickZoneLayout = {
  id: JoystickId;
  x: number;
  y: number;
  baseRadius: number;
  hitRadius: number;
  knobRadius: number;
  maxKnobTravel: number;
  deadzone: number;
};

export type DualJoystickLayout = {
  viewportWidth: number;
  viewportHeight: number;
  movement: JoystickZoneLayout;
  aim: JoystickZoneLayout;
};

export type JoystickSample = {
  rawVector: JoystickPoint;
  distance: number;
  engaged: boolean;
  direction: JoystickPoint;
  knobOffset: JoystickPoint;
  knobPosition: JoystickPoint;
};

export type ManualAttackButtonLayout = {
  x: number;
  y: number;
  buttonRadius: number;
  hitRadius: number;
  aimRingRadius: number;
  knobRadius: number;
  maxKnobTravel: number;
  dragThreshold: number;
  aimDeadzone: number;
};

export type ManualAttackCancelZoneLayout = {
  x: number;
  y: number;
  radius: number;
  hitRadius: number;
};

export type ManualAttackControlLayout = {
  viewportWidth: number;
  viewportHeight: number;
  attackButton: ManualAttackButtonLayout;
  cancelZone: ManualAttackCancelZoneLayout;
};

/**
 * Canonical mobile dual-joystick geometry in Phaser virtual game coordinates (1600x720).
 * Both MovementInputController (touch hit testing & vector calculation) and UIScene
 * (doodle joystick rendering & knob placement) derive directly from these values so
 * visuals and touch capture regions stay 1:1 aligned under Phaser.Scale.FIT.
 *
 * Clearances at 1600x720:
 * - PULSE button: center (1244, 400), hitRadius 44 -> distance to AIM (1310, 552) is 165.7px (> 44 + 108 = 152px)
 * - Stat Allocation panel: x in [428, 1172], y in [529, 681] -> 30px clear of MOVE right edge (398) and AIM left edge (1202)
 * - Bottom edge: 552 + 108 = 660 (60px clear of bottom gesture bar)
 */
export const DEFAULT_JOYSTICK_CENTER_X_OFFSET = 290;
export const DEFAULT_JOYSTICK_CENTER_Y = 552;
export const DEFAULT_JOYSTICK_BASE_RADIUS = 92;
export const DEFAULT_JOYSTICK_HIT_RADIUS = 108;
export const DEFAULT_JOYSTICK_KNOB_RADIUS = 28;
export const DEFAULT_JOYSTICK_MAX_KNOB_TRAVEL = 64;
export const DEFAULT_JOYSTICK_DEADZONE = 12;

/**
 * Experimental MOBA-inspired ATTACK button and CANCEL zone geometry in 1600x720 virtual space.
 * Clearances at 1600x720:
 * - ATTACK center (1310, 552), hitRadius 88:
 *   - PULSE (1244, 400, hitRadius 44): distance 165.7px -> 33.7px clear gap
 *   - Stat Allocation panel (right edge 1172): 1310 - 88 = 1222 -> 50px clear gap
 * - CANCEL center (1468, 376), hitRadius 54:
 *   - ATTACK center (1310, 552): distance 236.5px -> 94.5px clear gap
 *   - PULSE center (1244, 400): distance 225.3px -> 127.3px clear gap
 *   - Pause button (1556, 39): 337px vertical clearance
 */
export const DEFAULT_MANUAL_ATTACK_BUTTON_RADIUS = 68;
export const DEFAULT_MANUAL_ATTACK_HIT_RADIUS = 88;
export const DEFAULT_MANUAL_ATTACK_AIM_RING_RADIUS = 92;
export const DEFAULT_MANUAL_ATTACK_KNOB_RADIUS = 24;
export const DEFAULT_MANUAL_ATTACK_MAX_KNOB_TRAVEL = 68;
export const DEFAULT_MANUAL_ATTACK_DRAG_THRESHOLD = 22;
export const DEFAULT_MANUAL_ATTACK_AIM_DEADZONE = 12;
export const DEFAULT_MANUAL_CANCEL_CENTER_X = 1468;
export const DEFAULT_MANUAL_CANCEL_CENTER_Y = 376;
export const DEFAULT_MANUAL_CANCEL_RADIUS = 42;
export const DEFAULT_MANUAL_CANCEL_HIT_RADIUS = 54;

export function getDualJoystickLayout(
  viewportWidth = GAME_WIDTH,
  viewportHeight?: number,
): DualJoystickLayout {
  const safeWidth = Number.isFinite(viewportWidth) && viewportWidth > 0 ? viewportWidth : GAME_WIDTH;
  const derivedHeight = Math.round((safeWidth / GAME_WIDTH) * GAME_HEIGHT);
  const safeHeight =
    typeof viewportHeight === 'number' && Number.isFinite(viewportHeight) && viewportHeight > 0
      ? viewportHeight
      : derivedHeight;

  const scaleX = safeWidth / GAME_WIDTH;
  const scaleY = safeHeight / GAME_HEIGHT;
  const radiusScale = Math.min(scaleX, scaleY);

  const centerOffsetX = DEFAULT_JOYSTICK_CENTER_X_OFFSET * scaleX;
  const centerY = DEFAULT_JOYSTICK_CENTER_Y * scaleY;
  const baseRadius = DEFAULT_JOYSTICK_BASE_RADIUS * radiusScale;
  const hitRadius = DEFAULT_JOYSTICK_HIT_RADIUS * radiusScale;
  const knobRadius = DEFAULT_JOYSTICK_KNOB_RADIUS * radiusScale;
  const maxKnobTravel = DEFAULT_JOYSTICK_MAX_KNOB_TRAVEL * radiusScale;
  const deadzone = DEFAULT_JOYSTICK_DEADZONE * radiusScale;

  return {
    viewportWidth: safeWidth,
    viewportHeight: safeHeight,
    movement: {
      id: 'movement',
      x: centerOffsetX,
      y: centerY,
      baseRadius,
      hitRadius,
      knobRadius,
      maxKnobTravel,
      deadzone,
    },
    aim: {
      id: 'aim',
      x: safeWidth - centerOffsetX,
      y: centerY,
      baseRadius,
      hitRadius,
      knobRadius,
      maxKnobTravel,
      deadzone,
    },
  };
}

export function isPointInsideJoystick(point: JoystickPoint, zone: JoystickZoneLayout): boolean {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    return false;
  }

  return Math.hypot(point.x - zone.x, point.y - zone.y) <= zone.hitRadius;
}

export function hitTestJoystickZone(
  x: number,
  y: number,
  layout: DualJoystickLayout = getDualJoystickLayout(),
): JoystickId | null {
  const point = { x, y };

  if (isPointInsideJoystick(point, layout.movement)) {
    return 'movement';
  }

  if (isPointInsideJoystick(point, layout.aim)) {
    return 'aim';
  }

  return null;
}

export function sampleJoystickPointer(point: JoystickPoint, zone: JoystickZoneLayout): JoystickSample {
  const dx = Number.isFinite(point.x) ? point.x - zone.x : 0;
  const dy = Number.isFinite(point.y) ? point.y - zone.y : 0;
  const distance = Math.hypot(dx, dy);

  if (!Number.isFinite(distance) || distance < zone.deadzone || distance === 0) {
    return {
      rawVector: { x: dx, y: dy },
      distance: Number.isFinite(distance) ? distance : 0,
      engaged: false,
      direction: { x: 0, y: 0 },
      knobOffset: { x: 0, y: 0 },
      knobPosition: { x: zone.x, y: zone.y },
    };
  }

  const dirX = dx / distance;
  const dirY = dy / distance;
  const clampedDistance = Math.min(distance, zone.maxKnobTravel);
  const knobOffsetX = dirX * clampedDistance;
  const knobOffsetY = dirY * clampedDistance;

  return {
    rawVector: { x: dx, y: dy },
    distance,
    engaged: true,
    direction: { x: dirX, y: dirY },
    knobOffset: { x: knobOffsetX, y: knobOffsetY },
    knobPosition: {
      x: zone.x + knobOffsetX,
      y: zone.y + knobOffsetY,
    },
  };
}

export function getManualAttackControlLayout(
  viewportWidth = GAME_WIDTH,
  viewportHeight?: number,
): ManualAttackControlLayout {
  const safeWidth = Number.isFinite(viewportWidth) && viewportWidth > 0 ? viewportWidth : GAME_WIDTH;
  const derivedHeight = Math.round((safeWidth / GAME_WIDTH) * GAME_HEIGHT);
  const safeHeight =
    typeof viewportHeight === 'number' && Number.isFinite(viewportHeight) && viewportHeight > 0
      ? viewportHeight
      : derivedHeight;

  const scaleX = safeWidth / GAME_WIDTH;
  const scaleY = safeHeight / GAME_HEIGHT;
  const radiusScale = Math.min(scaleX, scaleY);

  return {
    viewportWidth: safeWidth,
    viewportHeight: safeHeight,
    attackButton: {
      x: safeWidth - DEFAULT_JOYSTICK_CENTER_X_OFFSET * scaleX,
      y: DEFAULT_JOYSTICK_CENTER_Y * scaleY,
      buttonRadius: DEFAULT_MANUAL_ATTACK_BUTTON_RADIUS * radiusScale,
      hitRadius: DEFAULT_MANUAL_ATTACK_HIT_RADIUS * radiusScale,
      aimRingRadius: DEFAULT_MANUAL_ATTACK_AIM_RING_RADIUS * radiusScale,
      knobRadius: DEFAULT_MANUAL_ATTACK_KNOB_RADIUS * radiusScale,
      maxKnobTravel: DEFAULT_MANUAL_ATTACK_MAX_KNOB_TRAVEL * radiusScale,
      dragThreshold: DEFAULT_MANUAL_ATTACK_DRAG_THRESHOLD * radiusScale,
      aimDeadzone: DEFAULT_MANUAL_ATTACK_AIM_DEADZONE * radiusScale,
    },
    cancelZone: {
      x: DEFAULT_MANUAL_CANCEL_CENTER_X * scaleX,
      y: DEFAULT_MANUAL_CANCEL_CENTER_Y * scaleY,
      radius: DEFAULT_MANUAL_CANCEL_RADIUS * radiusScale,
      hitRadius: DEFAULT_MANUAL_CANCEL_HIT_RADIUS * radiusScale,
    },
  };
}

export function isPointInsideManualAttackButton(
  point: JoystickPoint,
  layout: ManualAttackControlLayout = getManualAttackControlLayout(),
): boolean {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    return false;
  }

  return Math.hypot(point.x - layout.attackButton.x, point.y - layout.attackButton.y) <= layout.attackButton.hitRadius;
}

export function isPointInsideManualCancelZone(
  point: JoystickPoint,
  layout: ManualAttackControlLayout = getManualAttackControlLayout(),
): boolean {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    return false;
  }

  return Math.hypot(point.x - layout.cancelZone.x, point.y - layout.cancelZone.y) <= layout.cancelZone.hitRadius;
}
