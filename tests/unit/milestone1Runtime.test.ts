import { getAbilityDefinition } from '../../src/game/data/abilities';
import { CombatStateRuntime } from '../../src/game/systems/CombatStateRuntime';
import { LevelUpDirector } from '../../src/game/systems/LevelUpDirector';
import { TraitRuntime } from '../../src/game/systems/TraitRuntime';

describe('milestone 1 runtime helpers', () => {
  test('level up director gives directional offers for Iron Warden', () => {
    const director = new LevelUpDirector();
    const traits = new TraitRuntime();
    const choices = director.buildChoices('runner', traits, {
      shuffle: <T>(items: T[]) => [...items],
    });

    expect(choices).toHaveLength(3);
    expect(choices.some((choice) => choice.id === 'close-guard' || choice.id === 'steadfast-posture')).toBe(true);
    expect(choices.some((choice) => choice.id === 'shock-lattice')).toBe(true);
    expect(choices.some((choice) => choice.lane === 'stabilize')).toBe(true);
  });

  test('level up director gives Raptor Frame a mark path plus a bridge option', () => {
    const director = new LevelUpDirector();
    const traits = new TraitRuntime();
    const choices = director.buildChoices('shade', traits, {
      shuffle: <T>(items: T[]) => [...items],
    });

    expect(choices).toHaveLength(3);
    expect(choices.some((choice) => choice.id === 'target-painter' || choice.id === 'focused-breach')).toBe(true);
    expect(choices.some((choice) => choice.id === 'spotter-drone')).toBe(true);
  });

  test('level up director gives Ash Weaver an ailment path plus the Contagion Node support branch', () => {
    const director = new LevelUpDirector();
    const traits = new TraitRuntime();
    const choices = director.buildChoices('weaver', traits, {
      shuffle: <T>(items: T[]) => [...items],
    });

    expect(choices).toHaveLength(3);
    expect(choices.some((choice) => choice.id === 'infectious-volley' || choice.id === 'lingering-fever')).toBe(true);
    expect(choices.some((choice) => choice.id === 'contagion-node')).toBe(true);
    expect(choices.some((choice) => choice.lane === 'stabilize')).toBe(true);
  });

  test('trait runtime only turns on stronger Guard patterns when the matching trait is owned', () => {
    const traits = new TraitRuntime();
    const ability = getAbilityDefinition('brace-shot');

    expect(
      traits.getGuardGainOnPrimaryHit({
        heroId: 'runner',
        abilityId: 'brace-shot',
        isCloseRange: true,
        targetWasMarked: false,
      }),
    ).toBe(2);

    traits.addTrait('close-guard');
    traits.addTrait('steadfast-posture');

    expect(
      traits.getGuardGainOnPrimaryHit({
        heroId: 'runner',
        abilityId: 'brace-shot',
        isCloseRange: true,
        targetWasMarked: false,
      }),
    ).toBe(3);
    expect(traits.getPrimaryBurstCount({ heroId: 'runner', ability, guardActive: true })).toBe(4);
  });

  test('combat state runtime absorbs damage through Guard before health is touched', () => {
    const states = new CombatStateRuntime();
    states.setMaxGuard(18);
    states.gainGuard(12);

    const absorbed = states.absorbDamage(8);
    expect(absorbed).toEqual({ absorbed: 8, remaining: 0 });
    expect(states.getGuard()).toBe(4);

    const secondHit = states.absorbDamage(10);
    expect(secondHit).toEqual({ absorbed: 4, remaining: 6 });
    expect(states.getGuard()).toBe(0);
  });

  test('support rewards leave the offer pool once the support slot is filled', () => {
    const director = new LevelUpDirector();
    const traits = new TraitRuntime();

    const beforeSupport = director.buildChoices('runner', traits, {
      shuffle: <T>(items: T[]) => [...items],
      hasSupportAbility: false,
    });
    const afterSupport = director.buildChoices('runner', traits, {
      shuffle: <T>(items: T[]) => [...items],
      hasSupportAbility: true,
    });

    expect(beforeSupport.some((choice) => choice.category === 'support')).toBe(true);
    expect(afterSupport.some((choice) => choice.category === 'support')).toBe(false);
  });

  test('preferred support stays favored in the default offer order before the slot is filled', () => {
    const director = new LevelUpDirector();
    const traits = new TraitRuntime();

    const runnerChoices = director.buildChoices('runner', traits, {
      shuffle: <T>(items: T[]) => [...items],
      hasSupportAbility: false,
    });
    const shadeChoices = director.buildChoices('shade', traits, {
      shuffle: <T>(items: T[]) => [...items],
      hasSupportAbility: false,
    });

    const runnerSupportChoices = runnerChoices.filter((choice) => choice.category === 'support').map((choice) => choice.id);
    const shadeSupportChoices = shadeChoices.filter((choice) => choice.category === 'support').map((choice) => choice.id);

    expect(runnerSupportChoices[0]).toBe('shock-lattice');
    expect(shadeSupportChoices[0]).toBe('spotter-drone');
  });

  test('off-bias support remains eligible when the support pool shuffle brings it forward', () => {
    const director = new LevelUpDirector();
    const traits = new TraitRuntime();

    const runnerChoices = director.buildChoices('runner', traits, {
      hasSupportAbility: false,
      shuffle: <T extends { id?: string }>(items: T[]) =>
        [...items].sort((left, right) => {
          if (left.id === 'spotter-drone') return -1;
          if (right.id === 'spotter-drone') return 1;
          return 0;
        }),
    });
    const shadeChoices = director.buildChoices('shade', traits, {
      hasSupportAbility: false,
      shuffle: <T extends { id?: string }>(items: T[]) =>
        [...items].sort((left, right) => {
          if (left.id === 'shock-lattice') return -1;
          if (right.id === 'shock-lattice') return 1;
          return 0;
        }),
    });

    expect(runnerChoices.find((choice) => choice.category === 'support')?.id).toBe('spotter-drone');
    expect(shadeChoices.find((choice) => choice.category === 'support')?.id).toBe('shock-lattice');
  });

  test('trait runtime extends disrupted setup and signature payoff when the new traits are owned', () => {
    const traits = new TraitRuntime();

    expect(traits.getDisruptedDurationMs(2400)).toBe(2400);
    expect(traits.getSignatureDisruptedDamageMultiplier()).toBeCloseTo(1.25);

    traits.addTrait('lingering-static');
    traits.addTrait('breach-capacitor');

    expect(traits.getDisruptedDurationMs(2400)).toBe(3300);
    expect(traits.getSignatureDisruptedDamageMultiplier()).toBeCloseTo(1.45);
  });

  test('trait runtime extends ailment setup and detonation payoff when the new ailment traits are owned', () => {
    const traits = new TraitRuntime();
    const ability = getAbilityDefinition('cinder-needles');

    expect(traits.getPrimaryBurstCount({ heroId: 'weaver', ability, guardActive: false })).toBe(3);
    expect(traits.getAilmentDurationMs(2100)).toBe(2100);
    expect(traits.getHexConsumeBonusDamage()).toBe(12);
    expect(traits.getHexSecondaryBurstDamage()).toBe(0);

    traits.addTrait('infectious-volley');
    traits.addTrait('lingering-fever');
    traits.addTrait('volatile-bloom');

    expect(traits.getPrimaryBurstCount({ heroId: 'weaver', ability, guardActive: false })).toBe(4);
    expect(traits.getAilmentDurationMs(2100)).toBe(3350);
    expect(traits.getHexConsumeBonusDamage()).toBe(18);
    expect(traits.getHexSecondaryBurstDamage()).toBe(12);
  });

  test('evolution offers stay locked until hero commitment and late-run timing are satisfied', () => {
    const director = new LevelUpDirector();
    const runnerTraits = new TraitRuntime();

    let choices = director.buildChoices('runner', runnerTraits, {
      hasSupportAbility: true,
      level: 7,
      elapsedMs: 260_000,
      selectedEvolutionId: null,
      shuffle: <T>(items: T[]) => [...items],
    });
    expect(choices.some((choice) => choice.category === 'evolution')).toBe(false);

    runnerTraits.addTrait('close-guard');
    runnerTraits.addTrait('steadfast-posture');
    choices = director.buildChoices('runner', runnerTraits, {
      hasSupportAbility: true,
      level: 7,
      elapsedMs: 260_000,
      selectedEvolutionId: null,
      shuffle: <T>(items: T[]) => [...items],
    });
    expect(choices.find((choice) => choice.category === 'evolution')?.id).toBe('citadel-core');
  });

  test('only the matching hero can receive its evolution and only before one is chosen', () => {
    const director = new LevelUpDirector();
    const shadeTraits = new TraitRuntime();
    shadeTraits.addTrait('target-painter');
    shadeTraits.addTrait('focused-breach');

    const shadeChoices = director.buildChoices('shade', shadeTraits, {
      hasSupportAbility: true,
      level: 8,
      elapsedMs: 300_000,
      selectedEvolutionId: null,
      shuffle: <T>(items: T[]) => [...items],
    });
    expect(shadeChoices.find((choice) => choice.category === 'evolution')?.id).toBe('kill-chain-protocol');

    const afterEvolution = director.buildChoices('shade', shadeTraits, {
      hasSupportAbility: true,
      level: 8,
      elapsedMs: 300_000,
      selectedEvolutionId: 'kill-chain-protocol',
      shuffle: <T>(items: T[]) => [...items],
    });
    expect(afterEvolution.some((choice) => choice.category === 'evolution')).toBe(false);
  });
});
