import {
  BOSS_CONTACT_DAMAGE,
  BOSS_DASH_COOLDOWN_MS,
  BOSS_DASH_DURATION_MS,
  BOSS_DASH_SPEED_MULTIPLIER,
  BOSS_FIRST_PASS_MAX_HEALTH,
  BOSS_MOVE_SPEED,
  MINIBOSS_MAX_HEALTH,
} from '../config/constants';
import type { EnemyRole } from '../config/waveDirectorBalance';

export type EnemyArchetypeId =
  | 'scuttler'
  | 'skimmer'
  | 'harrier'
  | 'mauler'
  | 'crusher'
  | 'bulwark'
  | 'hexcaster'
  | 'overlord'
  | 'riftblade'
  | 'dreadnought'
  | 'behemoth';

export type EnemyBehavior = 'chase' | 'strafe' | 'dash' | 'ranged';

export type EnemyArchetype = {
  id: EnemyArchetypeId;
  name: string;
  size: number;
  color: number;
  strokeColor: number;
  maxHealth: number;
  speed: number;
  contactDamage: number;
  xpValue: number;
  behavior: EnemyBehavior;
  preferredDistance?: number;
  strafeStrength?: number;
  dashCooldownMs?: number;
  dashDurationMs?: number;
  dashSpeedMultiplier?: number;
  shotCooldownMs?: number;
  shotSpeed?: number;
  shotDamage?: number;
  rewardGold?: number;
  rewardLevelUps?: number;
  isElite?: boolean;
  isMiniboss?: boolean;
  isBoss?: boolean;
  roles?: EnemyRole[];
};

export const ENEMY_ARCHETYPES: Record<EnemyArchetypeId, EnemyArchetype> = {
  scuttler: {
    id: 'scuttler',
    name: 'Scuttler',
    size: 22,
    color: 0xfb7185,
    strokeColor: 0xffe4e6,
    maxHealth: 32,
    speed: 142,
    contactDamage: 8,
    xpValue: 5,
    behavior: 'chase',
    roles: ['fodder'],
  },
  skimmer: {
    id: 'skimmer',
    name: 'Skimmer',
    size: 36,
    color: 0x38bdf8,
    strokeColor: 0xe0f2fe,
    maxHealth: 32,
    speed: 122,
    contactDamage: 10,
    xpValue: 7,
    behavior: 'strafe',
    preferredDistance: 160,
    strafeStrength: 0.7,
    roles: ['fast'],
  },
  harrier: {
    id: 'harrier',
    name: 'Harrier',
    size: 34,
    color: 0xa78bfa,
    strokeColor: 0xede9fe,
    maxHealth: 28,
    speed: 154,
    contactDamage: 9,
    xpValue: 6,
    behavior: 'strafe',
    preferredDistance: 235,
    strafeStrength: 1.08,
    roles: ['fast'],
  },
  mauler: {
    id: 'mauler',
    name: 'Mauler',
    size: 30,
    color: 0xf97316,
    strokeColor: 0xffedd5,
    maxHealth: 68,
    speed: 98,
    contactDamage: 14,
    xpValue: 8,
    behavior: 'chase',
    roles: ['blocker'],
  },
  crusher: {
    id: 'crusher',
    name: 'Crusher',
    size: 34,
    color: 0xef4444,
    strokeColor: 0xfee2e2,
    maxHealth: 90,
    speed: 80,
    contactDamage: 16,
    xpValue: 10,
    behavior: 'dash',
    dashCooldownMs: 1700,
    dashDurationMs: 280,
    dashSpeedMultiplier: 2.35,
    roles: ['charger'],
  },
  bulwark: {
    id: 'bulwark',
    name: 'Bulwark',
    size: 40,
    color: 0x84cc16,
    strokeColor: 0xecfccb,
    maxHealth: 144,
    speed: 58,
    contactDamage: 19,
    xpValue: 13,
    behavior: 'chase',
    roles: ['blocker'],
  },
  hexcaster: {
    id: 'hexcaster',
    name: 'Hexcaster',
    size: 28,
    color: 0x22d3ee,
    strokeColor: 0xecfeff,
    maxHealth: 52,
    speed: 96,
    contactDamage: 9,
    xpValue: 12,
    behavior: 'ranged',
    preferredDistance: 360,
    strafeStrength: 1.14,
    shotCooldownMs: 1750,
    shotSpeed: 335,
    shotDamage: 14,
    roles: ['ranged'],
  },
  overlord: {
    id: 'overlord',
    name: 'Overlord',
    size: 48,
    color: 0xa855f7,
    strokeColor: 0xf3e8ff,
    maxHealth: 430,
    speed: 90,
    contactDamage: 22,
    xpValue: 32,
    behavior: 'dash',
    dashCooldownMs: 1600,
    dashDurationMs: 340,
    dashSpeedMultiplier: 2.1,
    rewardGold: 12,
    rewardLevelUps: 1,
    isElite: true,
    roles: ['elite', 'charger'],
  },
  riftblade: {
    id: 'riftblade',
    name: 'Riftblade',
    size: 42,
    color: 0x06b6d4,
    strokeColor: 0xecfeff,
    maxHealth: 280,
    speed: 116,
    contactDamage: 18,
    xpValue: 34,
    behavior: 'strafe',
    preferredDistance: 250,
    strafeStrength: 1.25,
    rewardGold: 10,
    rewardLevelUps: 1,
    isElite: true,
    roles: ['elite', 'fast'],
  },
  dreadnought: {
    id: 'dreadnought',
    name: 'Dreadnought',
    size: 58,
    color: 0xf43f5e,
    strokeColor: 0xffe4e6,
    maxHealth: MINIBOSS_MAX_HEALTH,
    speed: 92,
    contactDamage: 26,
    xpValue: 52,
    behavior: 'dash',
    dashCooldownMs: 1350,
    dashDurationMs: 380,
    dashSpeedMultiplier: 2.45,
    rewardGold: 26,
    rewardLevelUps: 1,
    isMiniboss: true,
    roles: ['elite', 'charger', 'blocker'],
  },
  behemoth: {
    id: 'behemoth',
    name: 'Behemoth',
    size: 72,
    color: 0xdc2626,
    strokeColor: 0xfee2e2,
    maxHealth: BOSS_FIRST_PASS_MAX_HEALTH,
    speed: BOSS_MOVE_SPEED,
    contactDamage: BOSS_CONTACT_DAMAGE,
    xpValue: 96,
    behavior: 'dash',
    dashCooldownMs: BOSS_DASH_COOLDOWN_MS,
    dashDurationMs: BOSS_DASH_DURATION_MS,
    dashSpeedMultiplier: BOSS_DASH_SPEED_MULTIPLIER,
    rewardGold: 40,
    isBoss: true,
    roles: ['elite', 'charger'],
  },
};
