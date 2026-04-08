export type EnemyArchetypeId =
  | 'scuttler'
  | 'skimmer'
  | 'mauler'
  | 'bulwark'
  | 'overlord'
  | 'behemoth';

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
  isElite?: boolean;
  isBoss?: boolean;
};

export const ENEMY_ARCHETYPES: Record<EnemyArchetypeId, EnemyArchetype> = {
  scuttler: {
    id: 'scuttler',
    name: 'Scuttler',
    size: 22,
    color: 0xfb7185,
    strokeColor: 0xffe4e6,
    maxHealth: 18,
    speed: 136,
    contactDamage: 7,
    xpValue: 5,
  },
  skimmer: {
    id: 'skimmer',
    name: 'Skimmer',
    size: 26,
    color: 0x38bdf8,
    strokeColor: 0xe0f2fe,
    maxHealth: 26,
    speed: 118,
    contactDamage: 10,
    xpValue: 7,
  },
  mauler: {
    id: 'mauler',
    name: 'Mauler',
    size: 30,
    color: 0xf97316,
    strokeColor: 0xffedd5,
    maxHealth: 40,
    speed: 94,
    contactDamage: 13,
    xpValue: 8,
  },
  bulwark: {
    id: 'bulwark',
    name: 'Bulwark',
    size: 40,
    color: 0x84cc16,
    strokeColor: 0xecfccb,
    maxHealth: 82,
    speed: 58,
    contactDamage: 18,
    xpValue: 13,
  },
  overlord: {
    id: 'overlord',
    name: 'Overlord',
    size: 48,
    color: 0xa855f7,
    strokeColor: 0xf3e8ff,
    maxHealth: 230,
    speed: 90,
    contactDamage: 22,
    xpValue: 32,
    isElite: true,
  },
  behemoth: {
    id: 'behemoth',
    name: 'Behemoth',
    size: 72,
    color: 0xdc2626,
    strokeColor: 0xfee2e2,
    maxHealth: 640,
    speed: 68,
    contactDamage: 34,
    xpValue: 90,
    isBoss: true,
  },
};
