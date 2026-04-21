import { EVOLUTION_MIN_ELAPSED_MS, EVOLUTION_MIN_LEVEL } from '../config/constants';
import type { AbilityId } from './abilities';
import type { HeroId } from './heroes';
import type { TraitId } from './traits';

export type EvolutionId = 'citadel-core' | 'kill-chain-protocol' | 'pyre-constellation';

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
  'kill-chain-protocol': {
    id: 'kill-chain-protocol',
    heroId: 'shade',
    title: 'Kill Chain Protocol',
    description: 'Marked kills from Hunter Sweep immediately redirect an empowered follow-up strike into the next priority target.',
    minLevel: EVOLUTION_MIN_LEVEL,
    minElapsedMs: EVOLUTION_MIN_ELAPSED_MS,
    requiredTraitIds: ['target-painter', 'focused-breach'],
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
};

export const EVOLUTION_IDS: EvolutionId[] = Object.keys(EVOLUTION_DEFINITIONS) as EvolutionId[];

export function getEvolutionDefinition(id: EvolutionId): EvolutionDefinition {
  return EVOLUTION_DEFINITIONS[id];
}
