import type { WeaponId } from './weapons';

export type HeroId = 'runner' | 'vanguard' | 'shade' | 'verdant';

export type HeroAppearance = {
  bodyColor: number;
  strokeColor: number;
  auraColor: number;
  markerColor: number;
  markerShape: 'dot' | 'bar';
  size: number;
  angle: number;
};

export type HeroDefinition = {
  id: HeroId;
  name: string;
  description: string;
  unlockCost?: number;
  startingWeaponId: WeaponId;
  passiveLabel: string;
  maxHealthBonus: number;
  moveSpeedBonus: number;
  pickupRangeBonus: number;
  startingDamageBonus: number;
  fireCooldownReductionMs: number;
  appearance: HeroAppearance;
};

export const HEROES: Record<HeroId, HeroDefinition> = {
  runner: {
    id: 'runner',
    name: 'Runner',
    description: 'Default scout built for steady kiting and clean early clears.',
    startingWeaponId: 'arc-bolt',
    passiveLabel: 'Quickstep: moves faster and fires slightly sooner.',
    maxHealthBonus: 0,
    moveSpeedBonus: 24,
    pickupRangeBonus: 0,
    startingDamageBonus: 0,
    fireCooldownReductionMs: 35,
    appearance: {
      bodyColor: 0x6ee7b7,
      strokeColor: 0xeafff7,
      auraColor: 0x34d399,
      markerColor: 0xe0f2fe,
      markerShape: 'dot',
      size: 32,
      angle: 45,
    },
  },
  vanguard: {
    id: 'vanguard',
    name: 'Vanguard',
    description: 'Unlockable bruiser who opens with a heavy lance and a thicker health pool.',
    unlockCost: 120,
    startingWeaponId: 'ember-lance',
    passiveLabel: 'Bulwark Core: more HP and heavier opening shots.',
    maxHealthBonus: 35,
    moveSpeedBonus: 0,
    pickupRangeBonus: 0,
    startingDamageBonus: 5,
    fireCooldownReductionMs: 0,
    appearance: {
      bodyColor: 0xf59e0b,
      strokeColor: 0xfffbeb,
      auraColor: 0xfb923c,
      markerColor: 0x7c2d12,
      markerShape: 'bar',
      size: 40,
      angle: 0,
    },
  },
  shade: {
    id: 'shade',
    name: 'Shade',
    description: 'Fast unlockable duelist that starts with Twin Fangs and lives on repositioning.',
    unlockCost: 180,
    startingWeaponId: 'twin-fangs',
    passiveLabel: 'Slipstream: higher speed and tighter opening cadence.',
    maxHealthBonus: 0,
    moveSpeedBonus: 36,
    pickupRangeBonus: 0,
    startingDamageBonus: 0,
    fireCooldownReductionMs: 55,
    appearance: {
      bodyColor: 0x818cf8,
      strokeColor: 0xe0e7ff,
      auraColor: 0x6366f1,
      markerColor: 0xf5f3ff,
      markerShape: 'dot',
      size: 30,
      angle: 20,
    },
  },
  verdant: {
    id: 'verdant',
    name: 'Verdant',
    description: 'Harvest mystic with Bloom Cannon, a wider pickup aura, and steadier sustain.',
    unlockCost: 210,
    startingWeaponId: 'bloom-cannon',
    passiveLabel: 'Seedcall: wider pickup range and sturdier support fire.',
    maxHealthBonus: 15,
    moveSpeedBonus: 0,
    pickupRangeBonus: 30,
    startingDamageBonus: 2,
    fireCooldownReductionMs: 0,
    appearance: {
      bodyColor: 0x4ade80,
      strokeColor: 0xf0fdf4,
      auraColor: 0x22c55e,
      markerColor: 0x14532d,
      markerShape: 'bar',
      size: 34,
      angle: -25,
    },
  },
};

export const HERO_IDS: HeroId[] = ['runner', 'vanguard', 'shade', 'verdant'];

export const HERO_LIST: HeroDefinition[] = HERO_IDS.map((heroId) => HEROES[heroId]);
