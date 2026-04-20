export type AbilitySlot = 'primary' | 'signature' | 'support';

export type AbilityId =
  | 'brace-shot'
  | 'bulwark-slam'
  | 'seeker-burst'
  | 'hunter-sweep'
  | 'shock-lattice'
  | 'spotter-drone'
  | 'cinder-needles'
  | 'hex-detonation'
  | 'contagion-node';

export type AbilityBehaviorId =
  | 'brace-shot'
  | 'bulwark-slam'
  | 'seeker-burst'
  | 'hunter-sweep'
  | 'shock-lattice'
  | 'spotter-drone'
  | 'cinder-needles'
  | 'hex-detonation'
  | 'contagion-node';

export type AbilityDefinition = {
  id: AbilityId;
  name: string;
  shortLabel: string;
  slot: AbilitySlot;
  description: string;
  behaviorId: AbilityBehaviorId;
  cooldownMs: number;
  damage: number;
  range: number;
  color: number;
  strokeColor: number;
  projectileSpeed?: number;
  projectileRadius?: number;
  burstCount?: number;
  spreadDegrees?: number;
  radius?: number;
  baseGuardGain?: number;
  markDurationMs?: number;
  disruptedDurationMs?: number;
  ailmentDurationMs?: number;
};

export const ABILITY_DEFINITIONS: Record<AbilityId, AbilityDefinition> = {
  'brace-shot': {
    id: 'brace-shot',
    name: 'Brace Shot',
    shortLabel: 'BS',
    slot: 'primary',
    description: 'Short cone burst built to hold space and turn close contact into Guard.',
    behaviorId: 'brace-shot',
    cooldownMs: 460,
    damage: 12,
    range: 290,
    color: 0xf59e0b,
    strokeColor: 0xfffbeb,
    projectileSpeed: 520,
    projectileRadius: 5,
    burstCount: 3,
    spreadDegrees: 22,
    baseGuardGain: 2,
  },
  'bulwark-slam': {
    id: 'bulwark-slam',
    name: 'Bulwark Slam',
    shortLabel: 'SL',
    slot: 'signature',
    description: 'A defensive pulse that spends Guard to crack nearby enemies and create space.',
    behaviorId: 'bulwark-slam',
    cooldownMs: 2400,
    damage: 26,
    range: 150,
    radius: 150,
    color: 0xfb923c,
    strokeColor: 0xffedd5,
  },
  'seeker-burst': {
    id: 'seeker-burst',
    name: 'Seeker Burst',
    shortLabel: 'SB',
    slot: 'primary',
    description: 'Accurate dual shots that tag targets with Mark and set up the finishing sweep.',
    behaviorId: 'seeker-burst',
    cooldownMs: 520,
    damage: 11,
    range: 430,
    color: 0x60a5fa,
    strokeColor: 0xe0f2fe,
    projectileSpeed: 760,
    projectileRadius: 4,
    burstCount: 2,
    spreadDegrees: 7,
    markDurationMs: 1600,
  },
  'hunter-sweep': {
    id: 'hunter-sweep',
    name: 'Hunter Sweep',
    shortLabel: 'HS',
    slot: 'signature',
    description: 'A priority strike that hunts Marked enemies first and cashes them out for burst.',
    behaviorId: 'hunter-sweep',
    cooldownMs: 2100,
    damage: 34,
    range: 520,
    color: 0x93c5fd,
    strokeColor: 0xf8fafc,
  },
  'shock-lattice': {
    id: 'shock-lattice',
    name: 'Shock Lattice',
    shortLabel: 'XL',
    slot: 'support',
    description: 'A close pulse that disrupts nearby enemies and gives signatures a cleaner payoff window.',
    behaviorId: 'shock-lattice',
    cooldownMs: 3800,
    damage: 8,
    range: 170,
    radius: 170,
    color: 0x22d3ee,
    strokeColor: 0xecfeff,
    disruptedDurationMs: 2400,
  },
  'spotter-drone': {
    id: 'spotter-drone',
    name: 'Spotter Drone',
    shortLabel: 'DR',
    slot: 'support',
    description: 'A tracking support shot that prefers marked targets, then disrupted targets, then the nearest threat.',
    behaviorId: 'spotter-drone',
    cooldownMs: 2800,
    damage: 7,
    range: 560,
    color: 0x34d399,
    strokeColor: 0xf0fdf4,
    projectileSpeed: 660,
    projectileRadius: 4,
    disruptedDurationMs: 1500,
  },
  'cinder-needles': {
    id: 'cinder-needles',
    name: 'Cinder Needles',
    shortLabel: 'CN',
    slot: 'primary',
    description: 'Fast ember needles that pressure packs by seeding Ailment across the closest threats.',
    behaviorId: 'cinder-needles',
    cooldownMs: 430,
    damage: 8,
    range: 420,
    color: 0xfb7185,
    strokeColor: 0xffedd5,
    projectileSpeed: 680,
    projectileRadius: 4,
    burstCount: 3,
    spreadDegrees: 18,
    ailmentDurationMs: 2100,
  },
  'hex-detonation': {
    id: 'hex-detonation',
    name: 'Hex Detonation',
    shortLabel: 'HD',
    slot: 'signature',
    description: 'Triggers a focused blast on an Ailmented cluster and explicitly consumes Ailment for burst payoff.',
    behaviorId: 'hex-detonation',
    cooldownMs: 2600,
    damage: 24,
    range: 460,
    radius: 120,
    color: 0xf97316,
    strokeColor: 0xffedd5,
  },
  'contagion-node': {
    id: 'contagion-node',
    name: 'Contagion Node',
    shortLabel: 'CND',
    slot: 'support',
    description: 'A drifting support orb that seeks clustered enemies and adds light Ailment setup without replacing the hero loop.',
    behaviorId: 'contagion-node',
    cooldownMs: 3200,
    damage: 6,
    range: 520,
    color: 0xfb7185,
    strokeColor: 0xfffbeb,
    projectileSpeed: 380,
    projectileRadius: 7,
    ailmentDurationMs: 1800,
  },
};

export function getAbilityDefinition(id: AbilityId): AbilityDefinition {
  return ABILITY_DEFINITIONS[id];
}
