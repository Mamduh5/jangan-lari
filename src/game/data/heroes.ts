import type { AbilityId } from './abilities';
import type { WeaponId } from './weapons';

export type HeroId = 'runner' | 'shade' | 'weaver';
export type HeroStateAffinity = 'guard' | 'mark' | 'ailment';

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
  stateAffinity: HeroStateAffinity;
  passiveLabel: string;
  chassisRule: string;
  primaryAbilityId: AbilityId;
  signatureAbilityId: AbilityId;
  unlockCost?: number;
  startingWeaponId: WeaponId;
  maxHealthBonus: number;
  moveSpeedBonus: number;
  pickupRangeBonus: number;
  startingDamageBonus: number;
  fireCooldownReductionMs: number;
  baseGuardMax: number;
  appearance: HeroAppearance;
};

export const HEROES: Record<HeroId, HeroDefinition> = {
  runner: {
    id: 'runner',
    name: 'Iron Warden',
    description: 'Close-range wall that turns contact and cleanup into Guard, then cashes it out with a short-range slam.',
    stateAffinity: 'guard',
    passiveLabel: 'Bulwark Loop: primary hits near the player feed Guard and the signature converts Guard into area damage.',
    chassisRule: 'Primary hits within close range generate Guard. Signature spends Guard for stronger impact.',
    primaryAbilityId: 'brace-shot',
    signatureAbilityId: 'bulwark-slam',
    startingWeaponId: 'ember-lance',
    maxHealthBonus: 24,
    moveSpeedBonus: -10,
    pickupRangeBonus: 0,
    startingDamageBonus: 0,
    fireCooldownReductionMs: 0,
    baseGuardMax: 24,
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
    name: 'Raptor Frame',
    description: 'Tempo hunter that tags priority targets with Mark, then cuts through them with a high-value sweep.',
    stateAffinity: 'mark',
    passiveLabel: 'Hunter Loop: primary shots keep marks active and the signature spends marks for burst damage and cooldown tempo.',
    chassisRule: 'Primary applies Mark at range. Signature prefers marked targets and consumes Mark for bigger payoff.',
    primaryAbilityId: 'seeker-burst',
    signatureAbilityId: 'hunter-sweep',
    startingWeaponId: 'twin-fangs',
    maxHealthBonus: 0,
    moveSpeedBonus: 24,
    pickupRangeBonus: 0,
    startingDamageBonus: 0,
    fireCooldownReductionMs: 0,
    baseGuardMax: 12,
    appearance: {
      bodyColor: 0x38bdf8,
      strokeColor: 0xe0f2fe,
      auraColor: 0x0ea5e9,
      markerColor: 0xf8fafc,
      markerShape: 'dot',
      size: 32,
      angle: 20,
    },
  },
  weaver: {
    id: 'weaver',
    name: 'Ash Weaver',
    description: 'Mid-range pressure caster that seeds Ailment across packs, then cashes it out in a timed detonation.',
    stateAffinity: 'ailment',
    passiveLabel: 'Pyre Loop: primary fire builds Ailment and the signature consumes it for burst and cooldown tempo.',
    chassisRule: 'Primary applies Ailment. Signature detonates afflicted packs and consuming Ailment slightly refunds signature cooldown.',
    primaryAbilityId: 'cinder-needles',
    signatureAbilityId: 'hex-detonation',
    startingWeaponId: 'ember-lance',
    maxHealthBonus: -8,
    moveSpeedBonus: 12,
    pickupRangeBonus: 0,
    startingDamageBonus: 0,
    fireCooldownReductionMs: 0,
    baseGuardMax: 10,
    appearance: {
      bodyColor: 0xf97316,
      strokeColor: 0xffedd5,
      auraColor: 0xfb7185,
      markerColor: 0x7f1d1d,
      markerShape: 'dot',
      size: 34,
      angle: -18,
    },
  },
};

export const HERO_IDS: HeroId[] = ['runner', 'shade', 'weaver'];

export const HERO_LIST: HeroDefinition[] = HERO_IDS.map((heroId) => HEROES[heroId]);
