import type { Enemy } from '../../src/game/entities/Enemy';
import { LevelUpDirector } from '../../src/game/systems/LevelUpDirector';
import { CombatStateRuntime } from '../../src/game/systems/CombatStateRuntime';
import { TraitRuntime } from '../../src/game/systems/TraitRuntime';
import { TriggerSeam } from '../../src/game/systems/TriggerSeam';

function createMockStateEnemy(): Enemy {
  let markedUntil = 0;
  let disruptedUntil = 0;
  let ailmentUntil = 0;

  return {
    applyMark(currentTime: number, durationMs: number): void {
      markedUntil = Math.max(markedUntil, currentTime + durationMs);
    },
    isMarked(currentTime: number): boolean {
      return currentTime < markedUntil;
    },
    consumeMark(currentTime: number): boolean {
      if (currentTime >= markedUntil) {
        return false;
      }
      markedUntil = 0;
      return true;
    },
    applyDisrupted(currentTime: number, durationMs: number): void {
      disruptedUntil = Math.max(disruptedUntil, currentTime + durationMs);
    },
    isDisrupted(currentTime: number): boolean {
      return currentTime < disruptedUntil;
    },
    applyAilment(currentTime: number, durationMs: number): void {
      ailmentUntil = Math.max(ailmentUntil, currentTime + durationMs);
    },
    isAilmented(currentTime: number): boolean {
      return currentTime < ailmentUntil;
    },
    consumeAilment(currentTime: number): boolean {
      if (currentTime >= ailmentUntil) {
        return false;
      }
      ailmentUntil = 0;
      return true;
    },
  } as unknown as Enemy;
}

describe('trigger seam', () => {
  test('on-hit trigger preserves primary payoff and state applications', () => {
    const traits = new TraitRuntime();
    traits.addTrait('close-guard');
    traits.addTrait('pressure-lenses');
    traits.addTrait('lingering-static');

    const states = new CombatStateRuntime();
    states.setMaxGuard(24);
    states.gainGuard(4);

    const seam = new TriggerSeam({
      heroId: 'runner',
      traits,
      combatStates: states,
    });

    const hitPayoff = seam.resolveOnHitPayoffs({
      abilityId: 'brace-shot',
      isCloseRange: true,
      guardActive: true,
      targetWasMarked: false,
      targetWasDisrupted: false,
      targetWasAilmented: false,
    });

    expect(hitPayoff.damageBonus).toBe(2);
    expect(hitPayoff.guardGain).toBe(3);

    const markedEnemy = createMockStateEnemy();
    const markApplications = seam.applyOnHitStateApplications('seeker-burst', markedEnemy, 1_000);
    expect(markApplications).toEqual({
      markApplications: 1,
      disruptedApplications: 0,
      ailmentApplications: 0,
    });
    expect(states.isMarked(markedEnemy, 2_000)).toBe(true);
    expect(states.isMarked(markedEnemy, 2_700)).toBe(false);

    const disruptedEnemy = createMockStateEnemy();
    const disruptedApplications = seam.applyOnHitStateApplications('spotter-drone', disruptedEnemy, 1_000);
    expect(disruptedApplications).toEqual({
      markApplications: 0,
      disruptedApplications: 1,
      ailmentApplications: 0,
    });
    expect(states.isDisrupted(disruptedEnemy, 3_300)).toBe(true);
    expect(states.isDisrupted(disruptedEnemy, 3_500)).toBe(false);
  });

  test('on-kill trigger preserves marked-kill Guard conversion', () => {
    const traits = new TraitRuntime();
    traits.addTrait('scavenger-shield');
    const seam = new TriggerSeam({
      heroId: 'shade',
      traits,
      combatStates: new CombatStateRuntime(),
    });

    expect(seam.resolveOnKillPayoffs({ enemyWasMarked: true }).guardGain).toBe(5);
    expect(seam.resolveOnKillPayoffs({ enemyWasMarked: false }).guardGain).toBe(0);
  });

  test('signature consume payoff preserves predator relay behavior', () => {
    const traits = new TraitRuntime();
    traits.addTrait('predator-relay');
    const seam = new TriggerSeam({
      heroId: 'runner',
      traits,
      combatStates: new CombatStateRuntime(),
    });

    traits.notifyGuardGain(1_000, 3);

    expect(
      seam.resolveSignaturePayoff({
        currentTime: 1_050,
        targetWasMarked: false,
        targetWasDisrupted: false,
        targetWasAilmented: false,
      }),
    ).toBe(1);

    expect(
      seam.resolveSignaturePayoff({
        currentTime: 1_120,
        targetWasMarked: true,
        targetWasDisrupted: false,
        targetWasAilmented: false,
      }),
    ).toBeCloseTo(1.18);

    expect(
      seam.resolveSignaturePayoff({
        currentTime: 1_180,
        targetWasMarked: true,
        targetWasDisrupted: false,
        targetWasAilmented: false,
      }),
    ).toBe(1);
  });

  test('consume-triggered signature cooldown refund remains trait-gated', () => {
    const traits = new TraitRuntime();
    const seam = new TriggerSeam({
      heroId: 'shade',
      traits,
      combatStates: new CombatStateRuntime(),
    });

    expect(seam.resolveOnConsumeSignaturePayoff({ consumedMark: false }).cooldownRefundMs).toBe(0);
    expect(seam.resolveOnConsumeSignaturePayoff({ consumedMark: true }).cooldownRefundMs).toBe(0);

    traits.addTrait('focused-breach');
    expect(seam.resolveOnConsumeSignaturePayoff({ consumedMark: true }).cooldownRefundMs).toBe(220);
  });

  test('consume-triggered catalytic exposure mark conversion remains unchanged', () => {
    const traits = new TraitRuntime();
    const states = new CombatStateRuntime();
    states.setMaxGuard(12);
    const seam = new TriggerSeam({
      heroId: 'weaver',
      traits,
      combatStates: states,
    });
    const enemy = createMockStateEnemy();

    expect(seam.applyCatalyticExposureMark(enemy, 1_000)).toEqual({
      applied: false,
      guardGain: 0,
    });
    expect(states.isMarked(enemy, 1_100)).toBe(false);

    traits.addTrait('catalytic-exposure');
    expect(seam.applyCatalyticExposureMark(enemy, 1_000)).toEqual({
      applied: true,
      guardGain: 2,
    });
    expect(states.isMarked(enemy, 2_700)).toBe(true);
    expect(states.isMarked(enemy, 2_900)).toBe(false);
  });

  test('catalytic conversion can arm predator relay through guard gain payload', () => {
    const traits = new TraitRuntime();
    traits.addTrait('catalytic-exposure');
    traits.addTrait('predator-relay');
    const states = new CombatStateRuntime();
    states.setMaxGuard(12);
    const seam = new TriggerSeam({
      heroId: 'weaver',
      traits,
      combatStates: states,
    });
    const enemy = createMockStateEnemy();

    const conversion = seam.applyCatalyticExposureMark(enemy, 1_000);
    expect(conversion).toEqual({
      applied: true,
      guardGain: 2,
    });

    const gained = states.gainGuardTx(conversion.guardGain).value;
    traits.notifyGuardGain(1_000, gained);

    expect(
      seam.resolveSignaturePayoff({
        currentTime: 1_120,
        targetWasMarked: true,
        targetWasDisrupted: false,
        targetWasAilmented: true,
      }),
    ).toBeCloseTo(1.18);
  });

  test('representative trait-support-evolution route remains reachable', () => {
    const director = new LevelUpDirector();
    const traits = new TraitRuntime();
    traits.addTrait('target-painter');
    traits.addTrait('predator-relay');

    const choices = director.buildChoices('shade', traits, {
      hasSupportAbility: true,
      supportAbilityId: 'recovery-field',
      level: 8,
      elapsedMs: 300_000,
      selectedEvolutionId: null,
      shuffle: <T>(items: T[]) => [...items],
    });

    expect(choices.find((choice) => choice.category === 'evolution')?.id).toBe('siege-lock-array');
  });
});
