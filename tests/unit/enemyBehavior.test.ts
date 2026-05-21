import {
  BLOCKER_BRACE_COOLDOWN_MS,
  BLOCKER_BRACE_DURATION_MS,
  BLOCKER_BRACE_TRIGGER_DISTANCE,
  CHARGER_COOLDOWN_MS,
  CHARGER_DASH_DURATION_MS,
  CHARGER_DASH_SPEED,
  CHARGER_RECOVERY_MS,
  CHARGER_TRIGGER_DISTANCE,
  CHARGER_WINDUP_MS,
  INTERCEPT_APPROACH_STRAFE_STRENGTH,
  INTERCEPT_PREDICTION_TIME_S,
  ROLE_INTERCEPTOR_UNLOCK_MS,
  ROLE_CHARGER_UNLOCK_MS,
  ROLE_BLOCKER_UNLOCK_MS,
  ROLE_RANGED_UNLOCK_MS,
  ROLE_WEIGHTS,
} from '../../src/game/config/enemyBehaviorBalance';
import { ENEMY_ARCHETYPES } from '../../src/game/data/enemies';
import { ENEMY_ROLE_TAGS } from '../../src/game/config/waveDirectorBalance';

describe('enemy behavior config', () => {
  test('interceptor config values are within sensible ranges', () => {
    expect(INTERCEPT_PREDICTION_TIME_S).toBeGreaterThan(0);
    expect(INTERCEPT_PREDICTION_TIME_S).toBeLessThanOrEqual(2.0);
    expect(INTERCEPT_APPROACH_STRAFE_STRENGTH).toBeGreaterThan(0);
    expect(INTERCEPT_APPROACH_STRAFE_STRENGTH).toBeLessThanOrEqual(1.5);
  });

  test('charger state machine timings are self-consistent', () => {
    expect(CHARGER_WINDUP_MS).toBeGreaterThan(0);
    expect(CHARGER_DASH_DURATION_MS).toBeGreaterThan(0);
    expect(CHARGER_RECOVERY_MS).toBeGreaterThan(0);
    expect(CHARGER_COOLDOWN_MS).toBeGreaterThan(0);

    const totalCycleDurationMs = CHARGER_WINDUP_MS + CHARGER_DASH_DURATION_MS + CHARGER_RECOVERY_MS + CHARGER_COOLDOWN_MS;
    expect(totalCycleDurationMs).toBeGreaterThan(2500);

    expect(CHARGER_DASH_SPEED).toBeGreaterThan(200);
    expect(CHARGER_TRIGGER_DISTANCE).toBeGreaterThan(100);
  });

  test('blocker state machine timings are self-consistent', () => {
    expect(BLOCKER_BRACE_DURATION_MS).toBeGreaterThan(0);
    expect(BLOCKER_BRACE_COOLDOWN_MS).toBeGreaterThan(BLOCKER_BRACE_DURATION_MS);
    expect(BLOCKER_BRACE_TRIGGER_DISTANCE).toBeGreaterThan(80);
  });

  test('role unlock order is linear and sensible for progressive difficulty', () => {
    expect(ROLE_INTERCEPTOR_UNLOCK_MS).toBeGreaterThan(0);
    expect(ROLE_CHARGER_UNLOCK_MS).toBeGreaterThanOrEqual(ROLE_INTERCEPTOR_UNLOCK_MS);
    expect(ROLE_BLOCKER_UNLOCK_MS).toBeGreaterThanOrEqual(ROLE_INTERCEPTOR_UNLOCK_MS);
    expect(ROLE_RANGED_UNLOCK_MS).toBeGreaterThan(ROLE_INTERCEPTOR_UNLOCK_MS);
  });

  test('role weights sum correctly across phases', () => {
    const earlyTotal = Object.values(ROLE_WEIGHTS).reduce((sum, w) => sum + w.earlyGame, 0);
    const midTotal = Object.values(ROLE_WEIGHTS).reduce((sum, w) => sum + w.midGame, 0);
    const lateTotal = Object.values(ROLE_WEIGHTS).reduce((sum, w) => sum + w.lateGame, 0);

    expect(earlyTotal).toBeGreaterThan(0);
    expect(midTotal).toBeGreaterThan(0);
    expect(lateTotal).toBeGreaterThan(0);
    expect(lateTotal).toBeGreaterThan(earlyTotal / 2);
  });
});

describe('enemy archetype role assignments', () => {
  test('scuttler is pure fodder with chase behavior', () => {
    const { scuttler } = ENEMY_ARCHETYPES;
    expect(scuttler.behavior).toBe('chase');
    expect(ENEMY_ROLE_TAGS.scuttler).toContain('fodder');
  });

  test('skimmer and harrier use intercept behavior for route-cutting', () => {
    expect(ENEMY_ARCHETYPES.skimmer.behavior).toBe('intercept');
    expect(ENEMY_ARCHETYPES.harrier.behavior).toBe('intercept');
    expect(ENEMY_ROLE_TAGS.skimmer).toContain('interceptor');
    expect(ENEMY_ROLE_TAGS.harrier).toContain('interceptor');
  });

  test('crusher uses charger behavior for windup state machine', () => {
    expect(ENEMY_ARCHETYPES.crusher.behavior).toBe('charger');
    expect(ENEMY_ROLE_TAGS.crusher).toContain('charger');
  });

  test('mauler and bulwark use blocker behavior for route denial', () => {
    expect(ENEMY_ARCHETYPES.mauler.behavior).toBe('blocker');
    expect(ENEMY_ARCHETYPES.bulwark.behavior).toBe('blocker');
    expect(ENEMY_ROLE_TAGS.mauler).toContain('blocker');
    expect(ENEMY_ROLE_TAGS.bulwark).toContain('blocker');
  });

  test('hexcaster keeps ranged behavior as the priority threat', () => {
    expect(ENEMY_ARCHETYPES.hexcaster.behavior).toBe('ranged');
    expect(ENEMY_ROLE_TAGS.hexcaster).toContain('ranged');
  });

  test('elite enemies retain their behaviors unchanged', () => {
    expect(ENEMY_ARCHETYPES.overlord.behavior).toBe('dash');
    expect(ENEMY_ARCHETYPES.riftblade.behavior).toBe('strafe');
    expect(ENEMY_ARCHETYPES.dreadnought.behavior).toBe('dash');
    expect(ENEMY_ARCHETYPES.behemoth.behavior).toBe('dash');
  });

  test('interceptors are faster than fodder', () => {
    const fodderSpeed = ENEMY_ARCHETYPES.scuttler.speed;
    expect(ENEMY_ARCHETYPES.skimmer.speed).toBeGreaterThan(fodderSpeed * 0.8);
    expect(ENEMY_ARCHETYPES.harrier.speed).toBeGreaterThan(fodderSpeed * 0.9);
  });

  test('charger has less XP than ranged to avoid over-rewarding the wrong kill', () => {
    const chargerXp = ENEMY_ARCHETYPES.crusher.xpValue;
    const rangedXp = ENEMY_ARCHETYPES.hexcaster.xpValue;
    expect(chargerXp).toBeGreaterThan(0);
    expect(rangedXp).toBeGreaterThan(0);
    expect(chargerXp).toBeLessThanOrEqual(rangedXp + 4);
  });

  test('blocker bulwark has highest HP among non-elite non-boss enemies', () => {
    const regular = ['scuttler', 'skimmer', 'harrier', 'mauler', 'crusher', 'hexcaster'] as const;
    const maxHp = Math.max(...regular.map((id) => ENEMY_ARCHETYPES[id].maxHealth));
    expect(ENEMY_ARCHETYPES.bulwark.maxHealth).toBeGreaterThanOrEqual(maxHp);
  });

  test('interceptors have preferredDistance set for interception orbit', () => {
    expect(ENEMY_ARCHETYPES.skimmer.preferredDistance).toBeDefined();
    expect(ENEMY_ARCHETYPES.harrier.preferredDistance).toBeDefined();
    const skimmerDist = ENEMY_ARCHETYPES.skimmer.preferredDistance!;
    const harrierDist = ENEMY_ARCHETYPES.harrier.preferredDistance!;
    expect(skimmerDist).toBeGreaterThan(0);
    expect(harrierDist).toBeGreaterThan(0);
  });
});

describe('role tag coverage', () => {
  test('every archetype has at least one role tag', () => {
    for (const [id, tags] of Object.entries(ENEMY_ROLE_TAGS)) {
      expect(tags.length, `${id} should have at least one role tag`).toBeGreaterThan(0);
    }
  });

  test('non-elite non-boss tags are mutually exclusive between fodder and high-value roles', () => {
    const highValueRoles = ['interceptor', 'charger', 'blocker', 'ranged'] as const;
    const fodderIds = Object.entries(ENEMY_ROLE_TAGS)
      .filter(([, tags]) => tags.includes('fodder'))
      .map(([id]) => id);

    for (const fodderId of fodderIds) {
      const tags = ENEMY_ROLE_TAGS[fodderId as keyof typeof ENEMY_ROLE_TAGS];
      for (const highValue of highValueRoles) {
        expect(
          tags.includes(highValue),
          `fodder enemy ${fodderId} should not have ${highValue} role`,
        ).toBe(false);
      }
    }
  });
});
