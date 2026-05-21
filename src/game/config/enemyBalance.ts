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
export const ENEMY_SCALING_HP_PER_STACK = 0.34;
export const ENEMY_SCALING_SPEED_PER_STACK = 0.045;
export const ENEMY_SCALING_DAMAGE_PER_STACK = 0.08;
export const ENEMY_SCALING_PROJECTILE_COOLDOWN_PER_STACK = 0.028;
export const ENEMY_SCALING_PROJECTILE_COOLDOWN_MIN_MULTIPLIER = 0.78;
export const ENEMY_SCALING_PROJECTILE_SPEED_PER_STACK = 0.035;
export const ENEMY_SCALING_PROJECTILE_COOLDOWN_FLOOR_MS = 780;
export const ENEMY_SCALING_MAJOR_ENCOUNTER_FACTOR = 0.65;

// Archetype combat stat tuning. Visual identity and behavior assignment
// stay in data/enemies.ts; rebalance-friendly combat numbers live here.
export const ENEMY_ARCHETYPE_STAT_BALANCE = {
  scuttler: {
    maxHealth: 34,
    speed: 150,
    contactDamage: 8,
    xpValue: 5,
  },
  skimmer: {
    maxHealth: 92,
    speed: 176,
    contactDamage: 12,
    xpValue: 8,
    preferredDistance: 72,
  },
  harrier: {
    maxHealth: 74,
    speed: 198,
    contactDamage: 11,
    xpValue: 8,
    preferredDistance: 64,
  },
  mauler: {
    maxHealth: 160,
    speed: 118,
    contactDamage: 17,
    xpValue: 10,
  },
  crusher: {
    maxHealth: 132,
    speed: 112,
    contactDamage: 20,
    xpValue: 12,
  },
  bulwark: {
    maxHealth: 260,
    speed: 82,
    contactDamage: 23,
    xpValue: 15,
  },
  hexcaster: {
    maxHealth: 96,
    speed: 106,
    contactDamage: 10,
    xpValue: 12,
    preferredDistance: 360,
    strafeStrength: 1.08,
    shotCooldownMs: 1650,
    shotSpeed: 350,
    shotDamage: 16,
  },
  overlord: {
    maxHealth: 1180,
    speed: 116,
    contactDamage: 30,
    xpValue: 34,
    dashCooldownMs: 1300,
    dashDurationMs: 390,
    dashSpeedMultiplier: 2.45,
    rewardGold: 12,
    rewardLevelUps: 1,
  },
  riftblade: {
    maxHealth: 820,
    speed: 152,
    contactDamage: 24,
    xpValue: 34,
    dashCooldownMs: 1100,
    dashDurationMs: 280,
    dashSpeedMultiplier: 2.75,
    rewardGold: 10,
    rewardLevelUps: 1,
  },
  dreadnought: {
    speed: 112,
    contactDamage: 32,
    xpValue: 52,
    dashCooldownMs: 1050,
    dashDurationMs: 440,
    dashSpeedMultiplier: 2.9,
    rewardGold: 26,
    rewardLevelUps: 1,
  },
} as const;

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
