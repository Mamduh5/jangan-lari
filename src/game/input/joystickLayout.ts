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
