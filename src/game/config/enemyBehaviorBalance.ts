// ============================================================
// A27 — Enemy Behavior Redesign: tuning values for all roles
// All behavior balance lives here so the owner can retune
// without reading RunScene or Enemy implementation.
// ============================================================

// Behavior role IDs (authoritative list)
export const BEHAVIOR_ROLE_FODDER = 'fodder' as const;
export const BEHAVIOR_ROLE_INTERCEPTOR = 'interceptor' as const;
export const BEHAVIOR_ROLE_CHARGER = 'charger' as const;
export const BEHAVIOR_ROLE_BLOCKER = 'blocker' as const;
export const BEHAVIOR_ROLE_RANGED = 'ranged' as const;

// ============================================================
// Interceptor behavior (skimmer, harrier)
// Moves toward predicted player position to cut off routes.
// Punishes straight-line running.
// ============================================================
export const INTERCEPT_PREDICTION_TIME_S = 0.72;    // seconds ahead to predict player position
export const INTERCEPT_APPROACH_STRAFE_STRENGTH = 0.18; // lateral route-cutting offset, not orbiting
export const INTERCEPT_PREFERRED_DISTANCE = 68;    // px - closes aggressively instead of circling
export const INTERCEPT_MIN_FORWARD_SPEED_SCALE = 0.92;
export const INTERCEPT_DISTANCE_FORWARD_SPEED_SCALE = 0.28;

// ============================================================
// Charger behavior (crusher)
// State machine: chasing → windup → dashing → recovering
// Windup telegraph makes the dash readable.
// ============================================================
export const CHARGER_WINDUP_MS = 470;           // freeze + visual telegraph before dash
export const CHARGER_DASH_SPEED = 760;          // px/s - committed dash velocity
export const CHARGER_DASH_DURATION_MS = 380;    // ms dash remains active
export const CHARGER_RECOVERY_MS = 380;         // ms slow/vulnerable after dash
export const CHARGER_COOLDOWN_MS = 1900;        // ms between attack cycles
export const CHARGER_TRIGGER_DISTANCE = 330;    // px - max distance to start windup
export const CHARGER_WARN_COLOR = 0xff4400;     // stroke color during windup

// ============================================================
// Blocker behavior (bulwark, mauler)
// Approaches then anchors, creating a physical wall / route denial.
// Pairs best with ranged/caster enemies behind it.
// ============================================================
export const BLOCKER_BRACE_DURATION_MS = 1500;       // ms anchored
export const BLOCKER_BRACE_COOLDOWN_MS = 3000;       // ms before next brace
export const BLOCKER_BRACE_TRIGGER_DISTANCE = 220;   // px — brace trigger range

// ============================================================
// Ranged behavior (hexcaster) — sharpened values
// Maintains preferred range, strafes, fires readable projectiles.
// ============================================================
export const RANGED_PREFERRED_DISTANCE = 360;   // px
export const RANGED_RETREAT_DISTANCE = 240;     // px — aggressive retreat threshold
export const RANGED_STRAFE_STRENGTH = 1.14;     // lateral movement scale
export const RANGED_SHOT_COOLDOWN_MS = 1750;    // ms
export const RANGED_SHOT_SPEED = 335;           // px/s
export const RANGED_SHOT_DAMAGE = 14;           // hp per hit

// ============================================================
// Role unlock timing (informational — wave director references
// these to decide when to introduce new role enemies)
// ============================================================
export const ROLE_INTERCEPTOR_UNLOCK_MS = 60_000;   // 1:00
export const ROLE_CHARGER_UNLOCK_MS = 120_000;      // 2:00
export const ROLE_BLOCKER_UNLOCK_MS = 120_000;      // 2:00
export const ROLE_RANGED_UNLOCK_MS = 180_000;       // 3:00

// ============================================================
// Role weights (documentation / validation reference)
// Describes relative spawn presence across game phases.
// ============================================================
export const ROLE_WEIGHTS = {
  fodder:      { earlyGame: 100, midGame: 40, lateGame: 15 },
  interceptor: { earlyGame: 0,   midGame: 30, lateGame: 20 },
  charger:     { earlyGame: 0,   midGame: 20, lateGame: 18 },
  blocker:     { earlyGame: 0,   midGame: 15, lateGame: 20 },
  ranged:      { earlyGame: 0,   midGame: 10, lateGame: 18 },
  elite:       { earlyGame: 0,   midGame: 5,  lateGame: 9  },
} as const;
