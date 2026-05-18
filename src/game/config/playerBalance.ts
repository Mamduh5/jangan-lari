// Base player stats
export const PLAYER_SPEED = 260;
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
export const SWIFTNESS_MOVE_SPEED_BONUS = 22;
export const POWER_DAMAGE_BONUS = 5;
export const RAPID_FIRE_COOLDOWN_REDUCTION_MS = 40;
export const VELOCITY_PROJECTILE_SPEED_BONUS = 90;
export const MAGNET_PICKUP_RANGE_BONUS = 35;
export const REACH_RANGE_BONUS = 55;

// Permanent upgrade effect values.
// These must stay in sync with permanentUpgrades.ts descriptions and RunScene logic.
export const PERMANENT_MAX_HP_PER_LEVEL = 10;
export const PERMANENT_MOVE_SPEED_PER_LEVEL = 8;
export const PERMANENT_PICKUP_RANGE_PER_LEVEL = 12;
export const PERMANENT_STARTING_DAMAGE_PER_LEVEL = 3;
export const PERMANENT_HP_REGEN_PER_LEVEL = 0.15;
