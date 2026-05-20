// Spawn timing and caps
export const ENEMY_SPAWN_INTERVAL_MS = 1600;
export const ENEMY_ACTIVE_CAP = 28;
export const ENEMY_SPAWN_PLAYER_SAFE_RADIUS = 360;
export const ELITE_SPAWN_PLAYER_SAFE_RADIUS = 480;
export const BOSS_SPAWN_PLAYER_SAFE_RADIUS = 620;
export const ENEMY_SPAWN_SAFE_ATTEMPTS = 24;

// Time-based enemy scaling
export const ENEMY_SCALING_INTERVAL_MS = 90000;
export const ENEMY_SCALING_MAX_STACK = 8;
export const ENEMY_SCALING_HP_PER_STACK = 0.20;
export const ENEMY_SCALING_SPEED_PER_STACK = 0.025;
export const ENEMY_SCALING_DAMAGE_PER_STACK = 0.06;
export const ENEMY_SCALING_MAJOR_ENCOUNTER_FACTOR = 0.5;

// Miniboss and elite spawn timing
export const MINIBOSS_SPAWN_TIME_MS = 210000;
export const MINIBOSS_SPAWN_INTERVAL_MS = 210000;
export const ELITE_SPAWN_INTERVAL_MS = 45000;
export const ELITE_SPAWN_INDICATOR_MS = 650;

// Visual
export const ENEMY_HIT_FLASH_MS = 80;

// Spawn director stage timing
export const OPENING_STAGE_END_MS = 45000;
export const EARLY_RAMP_STAGE_END_MS = 120000;
export const FIRST_ELITE_SPAWN_AT_MS = 35000;

// Alert cooldown for wave template names
export const WAVE_TEMPLATE_ALERT_COOLDOWN_MS = 7000;

// Mid-run formation pressure
export const FORMATION_PRESSURE_FIRST_MS = 60000;
export const FORMATION_PRESSURE_COOLDOWN_MS = 32000;
export const FORMATION_PRESSURE_RETRY_MS = 3500;
export const FORMATION_RING_RADIUS = 390;
export const FORMATION_PINCER_DISTANCE = 500;
export const FORMATION_SWEEP_DISTANCE = 520;

// Mid-run movement pressure
export const DANGER_ZONE_FIRST_MS = 95000;
export const DANGER_ZONE_COOLDOWN_MS = 22000;
export const DANGER_ZONE_WARNING_MS = 950;
export const DANGER_ZONE_ACTIVE_MS = 1250;
export const DANGER_ZONE_RADIUS = 118;
export const DANGER_ZONE_DAMAGE = 12;
export const DANGER_ZONE_TICK_MS = 850;
