import { LevelUpDirector } from '../../src/game/systems/LevelUpDirector';
import { TraitRuntime } from '../../src/game/systems/TraitRuntime';

function buildChoices(
  heroId: 'runner' | 'shade' | 'weaver',
  traits: TraitRuntime,
  options?: {
    hasSupportAbility?: boolean;
    supportAbilityId?: 'shock-lattice' | 'spotter-drone' | 'echo-turret' | 'recovery-field' | 'contagion-node' | null;
    level?: number;
    elapsedMs?: number;
    selectedEvolutionId?: string | null;
  },
) {
  return new LevelUpDirector().buildChoices(heroId, traits, {
    ...options,
    shuffle: <T>(items: T[]) => [...items],
  });
}

describe('V2 closure routes', () => {
  test.each([
    {
      heroId: 'runner' as const,
      deepenId: 'close-guard',
      branchId: 'shock-lattice',
    },
    {
      heroId: 'shade' as const,
      deepenId: 'target-painter',
      branchId: 'spotter-drone',
    },
    {
      heroId: 'weaver' as const,
      deepenId: 'infectious-volley',
      branchId: 'contagion-node',
    },
  ])('each hero opens with a deepen, bridge, and stabilize lane for $heroId', ({ heroId, deepenId, branchId }) => {
    const choices = buildChoices(heroId, new TraitRuntime());

    expect(choices).toHaveLength(3);
    expect(choices.map((choice) => choice.lane)).toEqual(['deepen', 'bridge', 'stabilize']);
    expect(choices[0]?.id).toBe(deepenId);
    expect(choices[1]?.id).toBe(branchId);
  });

  test('runner keeps a clear fortress route and a plausible breach alternate', () => {
    const mainTraits = new TraitRuntime();
    mainTraits.addTrait('close-guard');
    let choices = buildChoices('runner', mainTraits);
    expect(choices.find((choice) => choice.id === 'steadfast-posture')?.lane).toBe('deepen');

    mainTraits.addTrait('steadfast-posture');
    choices = buildChoices('runner', mainTraits, {
      hasSupportAbility: true,
      level: 7,
      elapsedMs: 260_000,
      selectedEvolutionId: null,
    });
    expect(choices.find((choice) => choice.category === 'evolution')?.id).toBe('citadel-core');

    const alternateTraits = new TraitRuntime();
    alternateTraits.addTrait('iron-reserve');
    choices = buildChoices('runner', alternateTraits, {
      hasSupportAbility: false,
    });
    expect(choices.find((choice) => choice.category === 'support')?.id).toBe('echo-turret');

    alternateTraits.addTrait('pressure-lenses');
    choices = buildChoices('runner', alternateTraits, {
      hasSupportAbility: true,
      supportAbilityId: 'echo-turret',
      level: 8,
      elapsedMs: 300_000,
      selectedEvolutionId: null,
    });
    expect(choices.find((choice) => choice.category === 'evolution')?.id).toBe('reckoner-drive');
  });

  test('shade keeps a clear mark-burst route and a plausible stabilizing alternate', () => {
    const mainTraits = new TraitRuntime();
    mainTraits.addTrait('target-painter');
    let choices = buildChoices('shade', mainTraits);
    expect(choices.find((choice) => choice.id === 'focused-breach')?.lane).toBe('deepen');

    mainTraits.addTrait('focused-breach');
    choices = buildChoices('shade', mainTraits, {
      hasSupportAbility: true,
      level: 8,
      elapsedMs: 300_000,
      selectedEvolutionId: null,
    });
    expect(choices.find((choice) => choice.category === 'evolution')?.id).toBe('kill-chain-protocol');

    const alternateTraits = new TraitRuntime();
    alternateTraits.addTrait('target-painter');
    choices = buildChoices('shade', alternateTraits, {
      hasSupportAbility: false,
    });
    expect(choices.find((choice) => choice.id === 'recovery-field')?.lane).toBe('stabilize');

    alternateTraits.addTrait('predator-relay');
    choices = buildChoices('shade', alternateTraits, {
      hasSupportAbility: true,
      supportAbilityId: 'recovery-field',
      level: 8,
      elapsedMs: 300_000,
      selectedEvolutionId: null,
    });
    expect(choices.find((choice) => choice.category === 'evolution')?.id).toBe('siege-lock-array');
  });

  test('weaver keeps a clear ailment-cluster route and a plausible conversion alternate', () => {
    const mainTraits = new TraitRuntime();
    mainTraits.addTrait('infectious-volley');
    let choices = buildChoices('weaver', mainTraits);
    expect(choices.find((choice) => choice.id === 'lingering-fever')?.lane).toBe('deepen');

    mainTraits.addTrait('lingering-fever');
    choices = buildChoices('weaver', mainTraits, {
      hasSupportAbility: true,
      level: 8,
      elapsedMs: 300_000,
      selectedEvolutionId: null,
    });
    expect(choices.find((choice) => choice.category === 'evolution')?.id).toBe('pyre-constellation');

    const alternateTraits = new TraitRuntime();
    alternateTraits.addTrait('infectious-volley');
    alternateTraits.addTrait('catalytic-exposure');
    alternateTraits.addTrait('volatile-bloom');
    choices = buildChoices('weaver', alternateTraits, {
      hasSupportAbility: false,
    });
    expect(choices.find((choice) => choice.category === 'support')?.id).toBe('echo-turret');

    alternateTraits.addTrait('pressure-lenses');
    choices = buildChoices('weaver', alternateTraits, {
      hasSupportAbility: true,
      supportAbilityId: 'echo-turret',
      level: 8,
      elapsedMs: 300_000,
      selectedEvolutionId: null,
    });
    expect(choices.find((choice) => choice.category === 'evolution')?.id).toBe('cinder-crown');
  });
});
