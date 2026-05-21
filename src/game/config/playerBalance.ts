// Base player stats
export const PLAYER_SPEED = 250;
export const PLAYER_MOVE_SPEED_SOFT_CAP = 330;
export const PLAYER_MOVE_SPEED_BONUS_ABOVE_SOFT_CAP_MULTIPLIER = 0.35;
export const PLAYER_MAX_HP = 100;
export const PLAYER_HIT_INVULNERABILITY_MS = 700;
export const PLAYER_HIT_FLASH_MS = 120;
export const PLAYER_PICKUP_RANGE = 90;
export const PLAYER_START_LEVEL = 1;
export const PLAYER_START_XP_TO_NEXT_LEVEL = 15;
export const PLAYER_XP_PER_LEVEL = 23;

// HP regen timing cap
export const DEFAULT_HP_REGEN_MAX_DELTA_MS = 250;

// Core upgrade effect values.
// These must stay in sync with upgrades.ts descriptions and RunScene logic.
export const VITALITY_REGEN_PER_SECOND = 0.4;
export const SWIFTNESS_MOVE_SPEED_BONUS = 14;
export const POWER_DAMAGE_BONUS = 5;
export const RAPID_FIRE_COOLDOWN_REDUCTION_MS = 40;
export const VELOCITY_PROJECTILE_SPEED_BONUS = 90;
export const MAGNET_PICKUP_RANGE_BONUS = 35;
export const REACH_RANGE_BONUS = 55;

// Permanent upgrade effect values.
// These must stay in sync with permanentUpgrades.ts descriptions and RunScene logic.
export const PERMANENT_MAX_HP_PER_LEVEL = 10;
export const PERMANENT_MOVE_SPEED_PER_LEVEL = 5;
export const PERMANENT_PICKUP_RANGE_PER_LEVEL = 12;
export const PERMANENT_STARTING_DAMAGE_PER_LEVEL = 3;
export const PERMANENT_HP_REGEN_PER_LEVEL = 0.15;

// Tank stat upgrade effect values.
export const TANK_STAT_MOVE_SPEED_PER_LEVEL = 6;

// Hero speed bonuses.
export const RUNNER_MOVE_SPEED_BONUS = 14;
export const SHADE_MOVE_SPEED_BONUS = 22;

// Active survival tool
export const BREAKOUT_PULSE_COOLDOWN_MS = 18000;
export const BREAKOUT_PULSE_INVULNERABILITY_MS = 420;
export const BREAKOUT_PULSE_RADIUS = 185;
export const BREAKOUT_PULSE_KNOCKBACK = 126;
export const BREAKOUT_PULSE_ELITE_KNOCKBACK_MULTIPLIER = 0.62;
export const BREAKOUT_PULSE_BOSS_KNOCKBACK_MULTIPLIER = 0;
