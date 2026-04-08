export type EnemyArchetypeId = 'scuttler' | 'mauler' | 'bulwark' | 'overlord' | 'behemoth';

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
    maxHealth: 20,
    speed: 124,
    contactDamage: 8,
    xpValue: 6,
  },
  mauler: {
    id: 'mauler',
    name: 'Mauler',
    size: 30,
    color: 0xf97316,
    strokeColor: 0xffedd5,
    maxHealth: 34,
    speed: 92,
    contactDamage: 12,
    xpValue: 8,
  },
  bulwark: {
    id: 'bulwark',
    name: 'Bulwark',
    size: 40,
    color: 0x84cc16,
    strokeColor: 0xecfccb,
    maxHealth: 72,
    speed: 60,
    contactDamage: 18,
    xpValue: 12,
  },
  overlord: {
    id: 'overlord',
    name: 'Overlord',
    size: 48,
    color: 0xa855f7,
    strokeColor: 0xf3e8ff,
    maxHealth: 190,
    speed: 86,
    contactDamage: 24,
    xpValue: 30,
    isElite: true,
  },
  behemoth: {
    id: 'behemoth',
    name: 'Behemoth',
    size: 72,
    color: 0xdc2626,
    strokeColor: 0xfee2e2,
    maxHealth: 600,
    speed: 70,
    contactDamage: 34,
    xpValue: 80,
    isBoss: true,
  },
};
