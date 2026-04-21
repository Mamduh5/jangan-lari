import type { HeroId } from './heroes';

export type TraitCategory = 'enabler' | 'amplifier' | 'converter';

export type TraitId =
  | 'close-guard'
  | 'steadfast-posture'
  | 'iron-reserve'
  | 'target-painter'
  | 'focused-breach'
  | 'scavenger-shield'
  | 'predator-relay'
  | 'pressure-lenses'
  | 'lingering-static'
  | 'breach-capacitor'
  | 'infectious-volley'
  | 'lingering-fever'
  | 'volatile-bloom'
  | 'catalytic-exposure';

export type TraitDefinition = {
  id: TraitId;
  category: TraitCategory;
  title: string;
  description: string;
  heroBias: HeroId | 'shared';
};

export const TRAIT_DEFINITIONS: Record<TraitId, TraitDefinition> = {
  'close-guard': {
    id: 'close-guard',
    category: 'enabler',
    title: 'Close Guard',
    description: 'Point-blank Brace Shot hits grant more Guard.',
    heroBias: 'runner',
  },
  'steadfast-posture': {
    id: 'steadfast-posture',
    category: 'amplifier',
    title: 'Steadfast Posture',
    description: 'While Guard is active, Brace Shot throws a broader, denser burst.',
    heroBias: 'runner',
  },
  'iron-reserve': {
    id: 'iron-reserve',
    category: 'amplifier',
    title: 'Iron Reserve',
    description: 'Guard cap rises and Bulwark Slam can cash in a deeper reserve for stronger impact.',
    heroBias: 'runner',
  },
  'target-painter': {
    id: 'target-painter',
    category: 'enabler',
    title: 'Target Painter',
    description: 'Seeker Burst applies longer Mark and sticks to targets more reliably.',
    heroBias: 'shade',
  },
  'focused-breach': {
    id: 'focused-breach',
    category: 'amplifier',
    title: 'Focused Breach',
    description: 'Hunter Sweep hits Marked enemies harder and recovers a little faster when it cashes out Mark.',
    heroBias: 'shade',
  },
  'scavenger-shield': {
    id: 'scavenger-shield',
    category: 'converter',
    title: 'Scavenger Shield',
    description: 'Killing a Marked enemy grants a small burst of Guard.',
    heroBias: 'shared',
  },
  'predator-relay': {
    id: 'predator-relay',
    category: 'converter',
    title: 'Predator Relay',
    description: 'Gaining Guard briefly empowers your next Signature against a state-affected enemy.',
    heroBias: 'shared',
  },
  'pressure-lenses': {
    id: 'pressure-lenses',
    category: 'amplifier',
    title: 'Pressure Lenses',
    description: 'Primary fire gains a light bonus only when your lane condition is already online.',
    heroBias: 'shared',
  },
  'lingering-static': {
    id: 'lingering-static',
    category: 'enabler',
    title: 'Lingering Static',
    description: 'Disrupted lingers longer, making support setup windows easier to cash in.',
    heroBias: 'shared',
  },
  'breach-capacitor': {
    id: 'breach-capacitor',
    category: 'amplifier',
    title: 'Breach Capacitor',
    description: 'Signature abilities hit Disrupted enemies harder.',
    heroBias: 'shared',
  },
  'infectious-volley': {
    id: 'infectious-volley',
    category: 'enabler',
    title: 'Infectious Volley',
    description: 'Cinder Needles fires one extra needle and keeps Ailment windows more reliable.',
    heroBias: 'weaver',
  },
  'lingering-fever': {
    id: 'lingering-fever',
    category: 'amplifier',
    title: 'Lingering Fever',
    description: 'Ailment lasts longer, making setup windows less fragile.',
    heroBias: 'weaver',
  },
  'volatile-bloom': {
    id: 'volatile-bloom',
    category: 'converter',
    title: 'Volatile Bloom',
    description: 'Hex Detonation creates a stronger follow-up burst when it consumes Ailment.',
    heroBias: 'weaver',
  },
  'catalytic-exposure': {
    id: 'catalytic-exposure',
    category: 'converter',
    title: 'Catalytic Exposure',
    description: 'Consuming Ailment Marks the healthiest nearby enemy for a short execution window.',
    heroBias: 'weaver',
  },
};

export const TRAIT_IDS: TraitId[] = Object.keys(TRAIT_DEFINITIONS) as TraitId[];

export function getTraitDefinition(id: TraitId): TraitDefinition {
  return TRAIT_DEFINITIONS[id];
}
