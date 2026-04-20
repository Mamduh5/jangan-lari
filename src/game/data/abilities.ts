export type AbilitySlot = 'primary' | 'signature' | 'support';

export type AbilityId =
  | 'brace-shot'
  | 'bulwark-slam'
  | 'seeker-burst'
  | 'hunter-sweep';

export type AbilityBehaviorId =
  | 'brace-shot'
  | 'bulwark-slam'
  | 'seeker-burst'
  | 'hunter-sweep';

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
};

export function getAbilityDefinition(id: AbilityId): AbilityDefinition {
  return ABILITY_DEFINITIONS[id];
}
