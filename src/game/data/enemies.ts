import {
  BOSS_CONTACT_DAMAGE,
  BOSS_DASH_COOLDOWN_MS,
  BOSS_DASH_DURATION_MS,
  BOSS_DASH_SPEED_MULTIPLIER,
  BOSS_FIRST_PASS_MAX_HEALTH,
  BOSS_MOVE_SPEED,
  MINIBOSS_MAX_HEALTH,
} from '../config/constants';
import { ENEMY_ARCHETYPE_STAT_BALANCE } from '../config/enemyBalance';
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

export type EnemyBehavior = 'chase' | 'strafe' | 'dash' | 'ranged' | 'intercept' | 'charger' | 'blocker';

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
    maxHealth: ENEMY_ARCHETYPE_STAT_BALANCE.scuttler.maxHealth,
    speed: ENEMY_ARCHETYPE_STAT_BALANCE.scuttler.speed,
    contactDamage: ENEMY_ARCHETYPE_STAT_BALANCE.scuttler.contactDamage,
    xpValue: ENEMY_ARCHETYPE_STAT_BALANCE.scuttler.xpValue,
    behavior: 'chase',
    roles: ['fodder'],
  },
  skimmer: {
    id: 'skimmer',
    name: 'Skimmer',
    size: 36,
    color: 0x38bdf8,
    strokeColor: 0xe0f2fe,
    maxHealth: ENEMY_ARCHETYPE_STAT_BALANCE.skimmer.maxHealth,
    speed: ENEMY_ARCHETYPE_STAT_BALANCE.skimmer.speed,
    contactDamage: ENEMY_ARCHETYPE_STAT_BALANCE.skimmer.contactDamage,
    xpValue: ENEMY_ARCHETYPE_STAT_BALANCE.skimmer.xpValue,
    behavior: 'intercept',
    preferredDistance: ENEMY_ARCHETYPE_STAT_BALANCE.skimmer.preferredDistance,
    roles: ['interceptor'],
  },
  harrier: {
    id: 'harrier',
    name: 'Harrier',
    size: 34,
    color: 0xa78bfa,
    strokeColor: 0xede9fe,
    maxHealth: ENEMY_ARCHETYPE_STAT_BALANCE.harrier.maxHealth,
    speed: ENEMY_ARCHETYPE_STAT_BALANCE.harrier.speed,
    contactDamage: ENEMY_ARCHETYPE_STAT_BALANCE.harrier.contactDamage,
    xpValue: ENEMY_ARCHETYPE_STAT_BALANCE.harrier.xpValue,
    behavior: 'intercept',
    preferredDistance: ENEMY_ARCHETYPE_STAT_BALANCE.harrier.preferredDistance,
    roles: ['interceptor'],
  },
  mauler: {
    id: 'mauler',
    name: 'Mauler',
    size: 30,
    color: 0xf97316,
    strokeColor: 0xffedd5,
    maxHealth: ENEMY_ARCHETYPE_STAT_BALANCE.mauler.maxHealth,
    speed: ENEMY_ARCHETYPE_STAT_BALANCE.mauler.speed,
    contactDamage: ENEMY_ARCHETYPE_STAT_BALANCE.mauler.contactDamage,
    xpValue: ENEMY_ARCHETYPE_STAT_BALANCE.mauler.xpValue,
    behavior: 'blocker',
    roles: ['blocker'],
  },
  crusher: {
    id: 'crusher',
    name: 'Crusher',
    size: 34,
    color: 0xef4444,
    strokeColor: 0xfee2e2,
    maxHealth: ENEMY_ARCHETYPE_STAT_BALANCE.crusher.maxHealth,
    speed: ENEMY_ARCHETYPE_STAT_BALANCE.crusher.speed,
    contactDamage: ENEMY_ARCHETYPE_STAT_BALANCE.crusher.contactDamage,
    xpValue: ENEMY_ARCHETYPE_STAT_BALANCE.crusher.xpValue,
    behavior: 'charger',
    roles: ['charger'],
  },
  bulwark: {
    id: 'bulwark',
    name: 'Bulwark',
    size: 40,
    color: 0x84cc16,
    strokeColor: 0xecfccb,
    maxHealth: ENEMY_ARCHETYPE_STAT_BALANCE.bulwark.maxHealth,
    speed: ENEMY_ARCHETYPE_STAT_BALANCE.bulwark.speed,
    contactDamage: ENEMY_ARCHETYPE_STAT_BALANCE.bulwark.contactDamage,
    xpValue: ENEMY_ARCHETYPE_STAT_BALANCE.bulwark.xpValue,
    behavior: 'blocker',
    roles: ['blocker'],
  },
  hexcaster: {
    id: 'hexcaster',
    name: 'Hexcaster',
    size: 28,
    color: 0x22d3ee,
    strokeColor: 0xecfeff,
    maxHealth: ENEMY_ARCHETYPE_STAT_BALANCE.hexcaster.maxHealth,
    speed: ENEMY_ARCHETYPE_STAT_BALANCE.hexcaster.speed,
    contactDamage: ENEMY_ARCHETYPE_STAT_BALANCE.hexcaster.contactDamage,
    xpValue: ENEMY_ARCHETYPE_STAT_BALANCE.hexcaster.xpValue,
    behavior: 'ranged',
    preferredDistance: ENEMY_ARCHETYPE_STAT_BALANCE.hexcaster.preferredDistance,
    strafeStrength: ENEMY_ARCHETYPE_STAT_BALANCE.hexcaster.strafeStrength,
    shotCooldownMs: ENEMY_ARCHETYPE_STAT_BALANCE.hexcaster.shotCooldownMs,
    shotSpeed: ENEMY_ARCHETYPE_STAT_BALANCE.hexcaster.shotSpeed,
    shotDamage: ENEMY_ARCHETYPE_STAT_BALANCE.hexcaster.shotDamage,
    roles: ['ranged'],
  },
  overlord: {
    id: 'overlord',
    name: 'Overlord',
    size: 48,
    color: 0xa855f7,
    strokeColor: 0xf3e8ff,
    maxHealth: ENEMY_ARCHETYPE_STAT_BALANCE.overlord.maxHealth,
    speed: ENEMY_ARCHETYPE_STAT_BALANCE.overlord.speed,
    contactDamage: ENEMY_ARCHETYPE_STAT_BALANCE.overlord.contactDamage,
    xpValue: ENEMY_ARCHETYPE_STAT_BALANCE.overlord.xpValue,
    behavior: 'dash',
    dashCooldownMs: ENEMY_ARCHETYPE_STAT_BALANCE.overlord.dashCooldownMs,
    dashDurationMs: ENEMY_ARCHETYPE_STAT_BALANCE.overlord.dashDurationMs,
    dashSpeedMultiplier: ENEMY_ARCHETYPE_STAT_BALANCE.overlord.dashSpeedMultiplier,
    rewardGold: ENEMY_ARCHETYPE_STAT_BALANCE.overlord.rewardGold,
    rewardLevelUps: ENEMY_ARCHETYPE_STAT_BALANCE.overlord.rewardLevelUps,
    isElite: true,
    roles: ['elite', 'charger'],
  },
  riftblade: {
    id: 'riftblade',
    name: 'Riftblade',
    size: 42,
    color: 0x06b6d4,
    strokeColor: 0xecfeff,
    maxHealth: ENEMY_ARCHETYPE_STAT_BALANCE.riftblade.maxHealth,
    speed: ENEMY_ARCHETYPE_STAT_BALANCE.riftblade.speed,
    contactDamage: ENEMY_ARCHETYPE_STAT_BALANCE.riftblade.contactDamage,
    xpValue: ENEMY_ARCHETYPE_STAT_BALANCE.riftblade.xpValue,
    behavior: 'dash',
    dashCooldownMs: ENEMY_ARCHETYPE_STAT_BALANCE.riftblade.dashCooldownMs,
    dashDurationMs: ENEMY_ARCHETYPE_STAT_BALANCE.riftblade.dashDurationMs,
    dashSpeedMultiplier: ENEMY_ARCHETYPE_STAT_BALANCE.riftblade.dashSpeedMultiplier,
    rewardGold: ENEMY_ARCHETYPE_STAT_BALANCE.riftblade.rewardGold,
    rewardLevelUps: ENEMY_ARCHETYPE_STAT_BALANCE.riftblade.rewardLevelUps,
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
    speed: ENEMY_ARCHETYPE_STAT_BALANCE.dreadnought.speed,
    contactDamage: ENEMY_ARCHETYPE_STAT_BALANCE.dreadnought.contactDamage,
    xpValue: ENEMY_ARCHETYPE_STAT_BALANCE.dreadnought.xpValue,
    behavior: 'dash',
    dashCooldownMs: ENEMY_ARCHETYPE_STAT_BALANCE.dreadnought.dashCooldownMs,
    dashDurationMs: ENEMY_ARCHETYPE_STAT_BALANCE.dreadnought.dashDurationMs,
    dashSpeedMultiplier: ENEMY_ARCHETYPE_STAT_BALANCE.dreadnought.dashSpeedMultiplier,
    rewardGold: ENEMY_ARCHETYPE_STAT_BALANCE.dreadnought.rewardGold,
    rewardLevelUps: ENEMY_ARCHETYPE_STAT_BALANCE.dreadnought.rewardLevelUps,
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
