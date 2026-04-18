export type WeaponId =
  | 'arc-bolt'
  | 'twin-fangs'
  | 'ember-lance'
  | 'bloom-cannon'
  | 'phase-disc'
  | 'sunwheel'
  | 'shatterbell';

export type WeaponFirePattern = 'targeted' | 'radial';

export type WeaponDefinition = {
  id: WeaponId;
  name: string;
  shortLabel: string;
  codexSummary: string;
  damage: number;
  fireCooldownMs: number;
  projectileSpeed: number;
  range: number;
  projectileRadius: number;
  projectileColor: number;
  projectileStrokeColor: number;
  projectileAlpha?: number;
  burstCount?: number;
  spreadDegrees?: number;
  firePattern?: WeaponFirePattern;
  radialCount?: number;
  pierceCount?: number;
  explosionRadius?: number;
  explosionDamageMultiplier?: number;
};

export type WeaponStats = WeaponDefinition;

export const WEAPON_DEFINITIONS: Record<WeaponId, WeaponDefinition> = {
  'arc-bolt': {
    id: 'arc-bolt',
    name: 'Arc Bolt',
    shortLabel: 'AB',
    codexSummary: 'Steady single-shot sidearm with reliable reach.',
    damage: 16,
    fireCooldownMs: 420,
    projectileSpeed: 600,
    range: 350,
    projectileRadius: 5,
    projectileColor: 0xfacc15,
    projectileStrokeColor: 0xfffbeb,
    projectileAlpha: 1,
  },
  'twin-fangs': {
    id: 'twin-fangs',
    name: 'Twin Fangs',
    shortLabel: 'TF',
    codexSummary: 'Fast dual burst for close kiting and clean picks.',
    damage: 9,
    fireCooldownMs: 580,
    projectileSpeed: 720,
    range: 310,
    projectileRadius: 4,
    projectileColor: 0x7dd3fc,
    projectileStrokeColor: 0xe0f2fe,
    projectileAlpha: 0.95,
    burstCount: 2,
    spreadDegrees: 10,
  },
  'ember-lance': {
    id: 'ember-lance',
    name: 'Ember Lance',
    shortLabel: 'EL',
    codexSummary: 'Heavy spear shot built to crack priority targets.',
    damage: 34,
    fireCooldownMs: 980,
    projectileSpeed: 460,
    range: 470,
    projectileRadius: 7,
    projectileColor: 0xfb7185,
    projectileStrokeColor: 0xffedd5,
    projectileAlpha: 0.9,
  },
  'bloom-cannon': {
    id: 'bloom-cannon',
    name: 'Bloom Cannon',
    shortLabel: 'BC',
    codexSummary: 'Tri-shot bloom that covers short-range lanes.',
    damage: 12,
    fireCooldownMs: 760,
    projectileSpeed: 540,
    range: 260,
    projectileRadius: 5,
    projectileColor: 0x86efac,
    projectileStrokeColor: 0xf0fdf4,
    projectileAlpha: 0.92,
    burstCount: 3,
    spreadDegrees: 20,
  },
  'phase-disc': {
    id: 'phase-disc',
    name: 'Phase Disc',
    shortLabel: 'PD',
    codexSummary: 'Wide piercing disc that keeps pressure through packs.',
    damage: 15,
    fireCooldownMs: 860,
    projectileSpeed: 520,
    range: 440,
    projectileRadius: 9,
    projectileColor: 0xc084fc,
    projectileStrokeColor: 0xf5d0fe,
    projectileAlpha: 0.92,
    pierceCount: 2,
  },
  sunwheel: {
    id: 'sunwheel',
    name: 'Sunwheel',
    shortLabel: 'SW',
    codexSummary: 'Radial nova that protects the space around you.',
    damage: 10,
    fireCooldownMs: 1220,
    projectileSpeed: 420,
    range: 235,
    projectileRadius: 5,
    projectileColor: 0xfbbf24,
    projectileStrokeColor: 0xfef3c7,
    projectileAlpha: 0.88,
    firePattern: 'radial',
    radialCount: 6,
  },
  shatterbell: {
    id: 'shatterbell',
    name: 'Shatterbell',
    shortLabel: 'SB',
    codexSummary: 'Slow crystal shell that bursts on contact.',
    damage: 22,
    fireCooldownMs: 1300,
    projectileSpeed: 410,
    range: 360,
    projectileRadius: 8,
    projectileColor: 0x67e8f9,
    projectileStrokeColor: 0xecfeff,
    projectileAlpha: 0.9,
    explosionRadius: 94,
    explosionDamageMultiplier: 0.65,
  },
};

export const STARTER_WEAPON: WeaponDefinition = WEAPON_DEFINITIONS['arc-bolt'];

export const WEAPON_LIST: WeaponDefinition[] = Object.values(WEAPON_DEFINITIONS);

export const UNLOCKABLE_WEAPONS: WeaponDefinition[] = [
  WEAPON_DEFINITIONS['twin-fangs'],
  WEAPON_DEFINITIONS['ember-lance'],
  WEAPON_DEFINITIONS['bloom-cannon'],
  WEAPON_DEFINITIONS['phase-disc'],
  WEAPON_DEFINITIONS['sunwheel'],
  WEAPON_DEFINITIONS['shatterbell'],
];

export function findWeaponDefinitionByName(name: string): WeaponDefinition | undefined {
  return WEAPON_LIST.find((weapon) => weapon.name === name);
}
