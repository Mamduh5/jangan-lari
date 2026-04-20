import type { AbilityId } from './abilities';
import type { HeroId } from './heroes';
import type { TraitId } from './traits';

export type RewardCategory = 'trait' | 'stabilizer' | 'support';

export type RewardId =
  | TraitId
  | 'shock-lattice'
  | 'spotter-drone'
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
