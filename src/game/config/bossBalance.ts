import type { EnemyArchetypeId } from '../data/enemies';

// Boss spawn and run duration
export const STAGE_BOSS_SPAWN_TIME_MS = 900000;
export const BOSS_SPAWN_TIME_MS = STAGE_BOSS_SPAWN_TIME_MS;
export const RUN_TARGET_DURATION_MS = STAGE_BOSS_SPAWN_TIME_MS;
export const RUN_ACTIVE_DELTA_CAP_MS = 100;

// Boss health and tuning
export const BOSS_FIRST_PASS_MAX_HEALTH = 220000;
export const BOSS_CONTACT_DAMAGE = 56;
export const BOSS_MOVE_SPEED = 122;
export const BOSS_DASH_COOLDOWN_MS = 780;
export const BOSS_DASH_DURATION_MS = 620;
export const BOSS_DASH_SPEED_MULTIPLIER = 2.85;
export const BOSS_TARGET_FAST_KILL_MS = 60000;
export const BOSS_PHASE_TWO_HEALTH_RATIO = 0.5;
export const BOSS_PHASE_TWO_DAMAGE_MULTIPLIER = 1.24;
export const BOSS_PHASE_TWO_ATTACK_INTERVAL_MULTIPLIER = 0.72;
export const BOSS_PHASE_TWO_SHOCKWAVE_RADIUS_MULTIPLIER = 1.14;

// Boss shockwave
export const BOSS_SHOCKWAVE_RADIUS = 300;
export const BOSS_SHOCKWAVE_TELEGRAPH_MS = 860;
export const BOSS_SHOCKWAVE_DAMAGE_ACTIVE_MS = 920;
export const BOSS_SHOCKWAVE_THICKNESS = 16;
export const BOSS_SHOCKWAVE_COOLDOWN_MIN_MS = 3200;
export const BOSS_SHOCKWAVE_COOLDOWN_MAX_MS = 4400;

// Boss summons
export const BOSS_SUMMON_FIRST_DELAY_MS = 3200;
export const BOSS_SUMMON_INTERVAL_MS = 8400;
export const BOSS_SUMMON_BATCH_SIZE = 3;
export const BOSS_SUMMON_MAX_ACTIVE = 6;
export const BOSS_SUMMON_HEALTH_MULTIPLIER = 2.6;
export const BOSS_SUMMON_DAMAGE_MULTIPLIER = 0.85;
export const BOSS_SUMMON_SPEED_MULTIPLIER = 1.18;
export const BOSS_SUMMON_XP_VALUE = 1;

export type BossFightState = 'approach' | 'shockwave' | 'summon' | 'crossfire' | 'recovery';

export type BossStateDefinition = {
  state: BossFightState;
  durationMs: number;
};

export const BOSS_STATE_SEQUENCE_PHASE_1: BossStateDefinition[] = [
  { state: 'approach', durationMs: 5200 },
  { state: 'shockwave', durationMs: 2600 },
  { state: 'recovery', durationMs: 2200 },
  { state: 'summon', durationMs: 2800 },
  { state: 'approach', durationMs: 4200 },
  { state: 'crossfire', durationMs: 2600 },
  { state: 'recovery', durationMs: 1800 },
];

export const BOSS_STATE_SEQUENCE_PHASE_2: BossStateDefinition[] = [
  { state: 'approach', durationMs: 3600 },
  { state: 'shockwave', durationMs: 2200 },
  { state: 'summon', durationMs: 2400 },
  { state: 'crossfire', durationMs: 2400 },
  { state: 'recovery', durationMs: 1500 },
];

export const BOSS_CROSSFIRE_PROJECTILE_COUNT_PHASE_1 = 5;
export const BOSS_CROSSFIRE_PROJECTILE_COUNT_PHASE_2 = 7;
export const BOSS_CROSSFIRE_PROJECTILE_SPEED = 315;
export const BOSS_CROSSFIRE_PROJECTILE_DAMAGE = 15;
export const BOSS_CROSSFIRE_PROJECTILE_RADIUS = 8;
export const BOSS_CROSSFIRE_COLOR = 0xfca5a5;

export const BOSS_SUMMON_COMPOSITIONS: Record<1 | 2, EnemyArchetypeId[][]> = {
  1: [
    ['mauler', 'hexcaster'],
    ['crusher', 'skimmer'],
  ],
  2: [
    ['bulwark', 'hexcaster', 'skimmer'],
    ['crusher', 'hexcaster', 'harrier'],
    ['mauler', 'bulwark', 'hexcaster'],
  ],
};

//Miniboss health and tuning
export const MINIBOSS_MAX_HEALTH = 18500;

// Miniboss skills
export const MINIBOSS_LINE_STRIKE_MIN_LENGTH = 420;
export const MINIBOSS_LINE_STRIKE_MAX_LENGTH = 620;
export const MINIBOSS_LINE_STRIKE_OVERRUN_DISTANCE = 110;
export const MINIBOSS_LINE_STRIKE_TRAVEL_MULTIPLIER = 1.1;
export const MINIBOSS_LINE_STRIKE_WIDTH = 76;
export const MINIBOSS_LINE_STRIKE_TELEGRAPH_MS = 650;
export const MINIBOSS_LINE_STRIKE_DAMAGE_ACTIVE_MS = 420;
export const MINIBOSS_VOLLEY_TELEGRAPH_MS = 520;
export const MINIBOSS_VOLLEY_COOLDOWN_MS = 5600;
export const MINIBOSS_VOLLEY_PROJECTILE_COUNT = 5;
export const MINIBOSS_VOLLEY_PROJECTILE_RADIUS = 8;
export const MINIBOSS_VOLLEY_PROJECTILE_SPEED = 350;
export const MINIBOSS_VOLLEY_DAMAGE = 16;
export const MINIBOSS_VOLLEY_SPREAD_DEGREES = 58;
export const MINIBOSS_VOLLEY_TELEGRAPH_LANE_LENGTH = 340;
export const MINIBOSS_VOLLEY_ACTIVE_MS = 300;
export const MINIBOSS_VOLLEY_LANE_VISUAL_WIDTH = 48;
export const MINIBOSS_VOLLEY_LANE_DAMAGE_WIDTH = 60;
