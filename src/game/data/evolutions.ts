import { EVOLUTION_MIN_ELAPSED_MS, EVOLUTION_MIN_LEVEL } from '../config/constants';
import type { AbilityId } from './abilities';
import type { HeroId } from './heroes';
import type { TraitId } from './traits';

export type EvolutionId =
  | 'citadel-core'
  | 'reckoner-drive'
  | 'kill-chain-protocol'
  | 'siege-lock-array'
  | 'pyre-constellation'
  | 'cinder-crown';

export type EvolutionDefinition = {
  id: EvolutionId;
  heroId: HeroId;
  title: string;
  description: string;
  minLevel: number;
  minElapsedMs: number;
  requiredTraitIds: TraitId[];
  oneOfTraitIds?: TraitId[];
  requiredSupportAbilityId?: AbilityId;
};

export const EVOLUTION_DEFINITIONS: Record<EvolutionId, EvolutionDefinition> = {
  'citadel-core': {
    id: 'citadel-core',
    heroId: 'runner',
    title: 'Citadel Core',
    description: 'Bulwark Slam spends Guard in chunks and releases follow-up fortress pulses while Guard holds.',
    minLevel: EVOLUTION_MIN_LEVEL,
    minElapsedMs: EVOLUTION_MIN_ELAPSED_MS,
    requiredTraitIds: ['close-guard', 'steadfast-posture'],
  },
  'reckoner-drive': {
    id: 'reckoner-drive',
    heroId: 'runner',
    title: 'Reckoner Drive',
    description: 'Bulwark Slam becomes a forward breach line that punishes state-touched enemies much harder.',
    minLevel: Math.max(5, EVOLUTION_MIN_LEVEL - 1),
    minElapsedMs: Math.max(120_000, EVOLUTION_MIN_ELAPSED_MS - 20_000),
    requiredTraitIds: ['iron-reserve'],
    oneOfTraitIds: ['pressure-lenses', 'predator-relay'],
  },
  'kill-chain-protocol': {
    id: 'kill-chain-protocol',
    heroId: 'shade',
    title: 'Kill Chain Protocol',
    description: 'Marked kills from Hunter Sweep immediately redirect an empowered follow-up strike into the next priority target.',
    minLevel: EVOLUTION_MIN_LEVEL,
    minElapsedMs: EVOLUTION_MIN_ELAPSED_MS,
    requiredTraitIds: ['target-painter', 'focused-breach'],
  },
  'siege-lock-array': {
    id: 'siege-lock-array',
    heroId: 'shade',
    title: 'Siege Lock Array',
    description: 'Hunter Sweep lingers on Marked targets with stabilizing follow-up passes that feed Guard.',
    minLevel: Math.max(5, EVOLUTION_MIN_LEVEL - 1),
    minElapsedMs: Math.max(130_000, EVOLUTION_MIN_ELAPSED_MS - 10_000),
    requiredTraitIds: ['target-painter'],
    oneOfTraitIds: ['focused-breach', 'predator-relay'],
    requiredSupportAbilityId: 'recovery-field',
  },
  'pyre-constellation': {
    id: 'pyre-constellation',
    heroId: 'weaver',
    title: 'Pyre Constellation',
    description: 'Hex Detonation chains across nearby Ailmented enemies, consuming them in sequence.',
    minLevel: EVOLUTION_MIN_LEVEL,
    minElapsedMs: EVOLUTION_MIN_ELAPSED_MS,
    requiredTraitIds: ['infectious-volley'],
    oneOfTraitIds: ['lingering-fever', 'volatile-bloom'],
  },
  'cinder-crown': {
    id: 'cinder-crown',
    heroId: 'weaver',
    title: 'Cinder Crown',
    description: 'Hex Detonation prioritizes Marked Ailmented targets and cashes them out for a heavy focused burst.',
    minLevel: Math.max(5, EVOLUTION_MIN_LEVEL - 1),
    minElapsedMs: Math.max(120_000, EVOLUTION_MIN_ELAPSED_MS - 20_000),
    requiredTraitIds: ['infectious-volley', 'catalytic-exposure'],
    oneOfTraitIds: ['pressure-lenses', 'volatile-bloom'],
  },
};

export const EVOLUTION_IDS: EvolutionId[] = Object.keys(EVOLUTION_DEFINITIONS) as EvolutionId[];

export function getEvolutionDefinition(id: EvolutionId): EvolutionDefinition {
  return EVOLUTION_DEFINITIONS[id];
}
