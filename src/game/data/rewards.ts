import type { AbilityId } from './abilities';
import type { EvolutionId } from './evolutions';
import type { HeroId } from './heroes';
import type { TraitId } from './traits';

export type RewardCategory = 'trait' | 'stabilizer' | 'support' | 'evolution';

export type RewardId =
  | TraitId
  | EvolutionId
  | 'shock-lattice'
  | 'spotter-drone'
  | 'echo-turret'
  | 'recovery-field'
  | 'contagion-node'
  | 'field-repairs'
  | 'reflex-boots';

export type RewardLane = 'deepen' | 'bridge' | 'stabilize';

export type RewardDefinition = {
  id: RewardId;
  category: RewardCategory;
  lane: RewardLane;
  title: string;
  description: string;
  traitId?: TraitId;
  abilityId?: AbilityId;
  evolutionId?: EvolutionId;
  heroBias?: HeroId | 'shared';
  repeatable?: boolean;
};

export const REWARD_DEFINITIONS: Record<RewardId, RewardDefinition> = {
  'close-guard': {
    id: 'close-guard',
    category: 'trait',
    lane: 'deepen',
    title: 'Close Guard',
    description: 'Point-blank Brace Shot hits grant more Guard.',
    traitId: 'close-guard',
    heroBias: 'runner',
  },
  'steadfast-posture': {
    id: 'steadfast-posture',
    category: 'trait',
    lane: 'deepen',
    title: 'Steadfast Posture',
    description: 'While Guard is active, Brace Shot throws a broader, denser burst.',
    traitId: 'steadfast-posture',
    heroBias: 'runner',
  },
  'iron-reserve': {
    id: 'iron-reserve',
    category: 'trait',
    lane: 'deepen',
    title: 'Iron Reserve',
    description: 'Raise Guard cap and let Bulwark Slam cash in a deeper reserve.',
    traitId: 'iron-reserve',
    heroBias: 'runner',
  },
  'target-painter': {
    id: 'target-painter',
    category: 'trait',
    lane: 'deepen',
    title: 'Target Painter',
    description: 'Seeker Burst applies longer Mark and sticks to targets more reliably.',
    traitId: 'target-painter',
    heroBias: 'shade',
  },
  'focused-breach': {
    id: 'focused-breach',
    category: 'trait',
    lane: 'deepen',
    title: 'Focused Breach',
    description: 'Hunter Sweep slams Marked enemies harder and recovers slightly on cash-out.',
    traitId: 'focused-breach',
    heroBias: 'shade',
  },
  'scavenger-shield': {
    id: 'scavenger-shield',
    category: 'trait',
    lane: 'bridge',
    title: 'Scavenger Shield',
    description: 'Killing a Marked enemy grants a small burst of Guard.',
    traitId: 'scavenger-shield',
    heroBias: 'shared',
  },
  'predator-relay': {
    id: 'predator-relay',
    category: 'trait',
    lane: 'bridge',
    title: 'Predator Relay',
    description: 'Gaining Guard briefly empowers your next Signature against a state-affected enemy.',
    traitId: 'predator-relay',
    heroBias: 'shared',
  },
  'pressure-lenses': {
    id: 'pressure-lenses',
    category: 'trait',
    lane: 'deepen',
    title: 'Pressure Lenses',
    description: 'State-aligned fire gains a small bonus, and Echo Turret gains extra damage when it locks onto active states.',
    traitId: 'pressure-lenses',
    heroBias: 'shared',
  },
  'lingering-static': {
    id: 'lingering-static',
    category: 'trait',
    lane: 'bridge',
    title: 'Lingering Static',
    description: 'Disrupted lasts 0.9s longer.',
    traitId: 'lingering-static',
    heroBias: 'shared',
  },
  'breach-capacitor': {
    id: 'breach-capacitor',
    category: 'trait',
    lane: 'deepen',
    title: 'Breach Capacitor',
    description: 'Signature abilities deal more damage to Disrupted enemies.',
    traitId: 'breach-capacitor',
    heroBias: 'shared',
  },
  'shock-lattice': {
    id: 'shock-lattice',
    category: 'support',
    lane: 'bridge',
    title: 'Shock Lattice',
    description: 'Equip a support pulse that disrupts nearby enemies every few seconds.',
    abilityId: 'shock-lattice',
    heroBias: 'runner',
  },
  'spotter-drone': {
    id: 'spotter-drone',
    category: 'support',
    lane: 'bridge',
    title: 'Spotter Drone',
    description: 'Equip a support drone shot that disrupts priority targets from range.',
    abilityId: 'spotter-drone',
    heroBias: 'shade',
  },
  'echo-turret': {
    id: 'echo-turret',
    category: 'support',
    lane: 'bridge',
    title: 'Echo Turret',
    description: 'Equip a support turret shot that prefers enemies already carrying a live state.',
    abilityId: 'echo-turret',
    heroBias: 'shared',
  },
  'recovery-field': {
    id: 'recovery-field',
    category: 'support',
    lane: 'stabilize',
    title: 'Recovery Field',
    description: 'Equip a stabilizing support pulse that helps hold close pressure without replacing your engine.',
    abilityId: 'recovery-field',
    heroBias: 'runner',
  },
  'contagion-node': {
    id: 'contagion-node',
    category: 'support',
    lane: 'bridge',
    title: 'Contagion Node',
    description: 'Equip a support orb that seeds light Ailment into clustered enemies.',
    abilityId: 'contagion-node',
    heroBias: 'weaver',
  },
  'infectious-volley': {
    id: 'infectious-volley',
    category: 'trait',
    lane: 'deepen',
    title: 'Infectious Volley',
    description: 'Cinder Needles throws an extra needle and keeps Ailment setup steadier.',
    traitId: 'infectious-volley',
    heroBias: 'weaver',
  },
  'lingering-fever': {
    id: 'lingering-fever',
    category: 'trait',
    lane: 'deepen',
    title: 'Lingering Fever',
    description: 'Ailment lasts 0.9s longer.',
    traitId: 'lingering-fever',
    heroBias: 'weaver',
  },
  'volatile-bloom': {
    id: 'volatile-bloom',
    category: 'trait',
    lane: 'bridge',
    title: 'Volatile Bloom',
    description: 'Hex Detonation leaves a stronger follow-up burst when it consumes Ailment.',
    traitId: 'volatile-bloom',
    heroBias: 'weaver',
  },
  'catalytic-exposure': {
    id: 'catalytic-exposure',
    category: 'trait',
    lane: 'bridge',
    title: 'Catalytic Exposure',
    description: 'Ailment consumes Mark the healthiest nearby enemy and grants a small Guard pulse for immediate follow-up.',
    traitId: 'catalytic-exposure',
    heroBias: 'weaver',
  },
  'citadel-core': {
    id: 'citadel-core',
    category: 'evolution',
    lane: 'deepen',
    title: 'Citadel Core',
    description: 'Bulwark Slam spends Guard in chunks and emits follow-up fortress pulses while Guard lasts.',
    evolutionId: 'citadel-core',
    heroBias: 'runner',
  },
  'reckoner-drive': {
    id: 'reckoner-drive',
    category: 'evolution',
    lane: 'deepen',
    title: 'Reckoner Drive',
    description: 'Bulwark Slam becomes a forward breach line that spikes state-affected enemies much harder.',
    evolutionId: 'reckoner-drive',
    heroBias: 'runner',
  },
  'kill-chain-protocol': {
    id: 'kill-chain-protocol',
    category: 'evolution',
    lane: 'deepen',
    title: 'Kill Chain Protocol',
    description: 'Hunter Sweep killing a Marked target immediately chains an empowered strike into the next priority enemy.',
    evolutionId: 'kill-chain-protocol',
    heroBias: 'shade',
  },
  'siege-lock-array': {
    id: 'siege-lock-array',
    category: 'evolution',
    lane: 'deepen',
    title: 'Siege Lock Array',
    description: 'Hunter Sweep locks onto Marked targets with follow-up passes that grant Guard and safer sustain.',
    evolutionId: 'siege-lock-array',
    heroBias: 'shade',
  },
  'pyre-constellation': {
    id: 'pyre-constellation',
    category: 'evolution',
    lane: 'deepen',
    title: 'Pyre Constellation',
    description: 'Hex Detonation chains across nearby Ailmented enemies and consumes them in sequence.',
    evolutionId: 'pyre-constellation',
    heroBias: 'weaver',
  },
  'cinder-crown': {
    id: 'cinder-crown',
    category: 'evolution',
    lane: 'deepen',
    title: 'Cinder Crown',
    description: 'Hex Detonation prioritizes Marked Ailmented targets and turns them into a focused boss-killer burst.',
    evolutionId: 'cinder-crown',
    heroBias: 'weaver',
  },
  'field-repairs': {
    id: 'field-repairs',
    category: 'stabilizer',
    lane: 'stabilize',
    title: 'Field Repairs',
    description: '+24 max HP and heal 24 HP.',
    repeatable: true,
  },
  'reflex-boots': {
    id: 'reflex-boots',
    category: 'stabilizer',
    lane: 'stabilize',
    title: 'Reflex Boots',
    description: '+20 move speed.',
    repeatable: true,
  },
};

export function getRewardDefinition(id: RewardId): RewardDefinition {
  return REWARD_DEFINITIONS[id];
}
