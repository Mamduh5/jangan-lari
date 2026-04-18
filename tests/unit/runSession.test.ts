import {
  accumulateRunElapsedMs,
  beginLevelUpCountdown,
  calculateRunGoldReward,
  chooseRandomValidIndex,
  clearRunRegistryState,
  createFreshRunSessionState,
  shouldBeginQueuedLevelUp,
  tickLevelUpCountdown,
  writeFreshRunRegistryState,
} from '../../src/game/utils/runSession';
import { RUN_TARGET_DURATION_MS } from '../../src/game/config/constants';

function createRegistryRecorder(): { writes: Record<string, unknown>; set: (key: string, value: unknown) => void } {
  const writes: Record<string, unknown> = {};
  return {
    writes,
    set(key: string, value: unknown) {
      writes[key] = value;
    },
  };
}

describe('runSession helpers', () => {
  test('createFreshRunSessionState returns a clean run state', () => {
    expect(createFreshRunSessionState()).toEqual({
      runElapsedMs: 0,
      pendingLevelUps: 0,
      levelUpRemainingMs: 0,
      killCount: 0,
      eliteKillCount: 0,
      goldEarned: 0,
      isEnded: false,
      isLevelingUp: false,
      isSystemPaused: false,
      isTransitioningToMenu: false,
      isResolvingLevelUpChoice: false,
      globalWeaponDamageBonus: 0,
      globalWeaponCooldownReduction: 0,
      globalProjectileSpeedBonus: 0,
      globalWeaponRangeBonus: 0,
    });
  });

  test('accumulateRunElapsedMs only advances active run time and clamps large deltas', () => {
    expect(accumulateRunElapsedMs(2500, 8000, false)).toBe(2500);
    expect(accumulateRunElapsedMs(2500, 8000, true)).toBe(2600);
    expect(accumulateRunElapsedMs(RUN_TARGET_DURATION_MS - 50, 1000, true)).toBe(RUN_TARGET_DURATION_MS);
  });

  test('tickLevelUpCountdown counts down and expires cleanly', () => {
    const initial = beginLevelUpCountdown();
    const partial = tickLevelUpCountdown(initial, 5000, true);
    expect(partial.remainingMs).toBe(10000);
    expect(partial.expired).toBe(false);

    const paused = tickLevelUpCountdown(partial.remainingMs, 5000, false);
    expect(paused.remainingMs).toBe(10000);
    expect(paused.expired).toBe(false);

    const expired = tickLevelUpCountdown(paused.remainingMs, 10000, true);
    expect(expired.remainingMs).toBe(0);
    expect(expired.expired).toBe(true);
  });

  test('chooseRandomValidIndex only picks from displayed valid choices', () => {
    const choices = [undefined, { id: 'a' }, null, { id: 'b' }];
    expect(chooseRandomValidIndex(choices, 0)).toBe(1);
    expect(chooseRandomValidIndex(choices, 0.99)).toBe(3);
    expect(chooseRandomValidIndex([undefined, null], 0.5)).toBeNull();
  });

  test('shouldBeginQueuedLevelUp only allows deferred level-up starts from a safe boundary', () => {
    expect(
      shouldBeginQueuedLevelUp({
        levelUpQueued: true,
        pendingLevelUps: 1,
        isEnded: false,
        isTransitioningToMenu: false,
        isSystemPaused: false,
        isHitStopActive: false,
        isLevelingUp: false,
      }),
    ).toBe(true);

    expect(
      shouldBeginQueuedLevelUp({
        levelUpQueued: true,
        pendingLevelUps: 1,
        isEnded: false,
        isTransitioningToMenu: false,
        isSystemPaused: true,
        isHitStopActive: false,
        isLevelingUp: false,
      }),
    ).toBe(false);

    expect(
      shouldBeginQueuedLevelUp({
        levelUpQueued: true,
        pendingLevelUps: 1,
        isEnded: false,
        isTransitioningToMenu: false,
        isSystemPaused: false,
        isHitStopActive: true,
        isLevelingUp: false,
      }),
    ).toBe(false);

    expect(
      shouldBeginQueuedLevelUp({
        levelUpQueued: false,
        pendingLevelUps: 1,
        isEnded: false,
        isTransitioningToMenu: false,
        isSystemPaused: false,
        isHitStopActive: false,
        isLevelingUp: false,
      }),
    ).toBe(false);
  });

  test('calculateRunGoldReward stays deterministic', () => {
    expect(calculateRunGoldReward(4, 17, false)).toBe(37);
    expect(calculateRunGoldReward(4, 17, true)).toBe(65);
  });

  test('registry helpers reset and clear run-facing state', () => {
    const registry = createRegistryRecorder();
    writeFreshRunRegistryState(registry, 'Runner', 90);
    expect(registry.writes['run.endActive']).toBe(false);
    expect(registry.writes['run.instructions']).toBe('Selected Hero: Runner');
    expect(registry.writes['run.levelUpMode']).toBe('normal');
    expect(registry.writes['run.totalGold']).toBe(90);

    clearRunRegistryState(registry, 120);
    expect(registry.writes['run.levelUpActive']).toBe(false);
    expect(registry.writes['run.levelUpMode']).toBe('normal');
    expect(registry.writes['run.instructions']).toBe('Return to menu complete.');
    expect(registry.writes['run.totalGold']).toBe(120);
  });
});
