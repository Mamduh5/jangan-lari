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
});
