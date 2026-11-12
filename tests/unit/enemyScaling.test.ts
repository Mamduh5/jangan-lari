import {
  BOSS_FIRST_PASS_MAX_HEALTH,
  ENEMY_ACTIVE_CAP,
  ENEMY_SPAWN_INTERVAL_MS,
  ENEMY_SCALING_INTERVAL_MS,
  ENEMY_SCALING_MAX_STACK,
} from '../../src/game/config/constants';
import { CHARGER_DASH_SPEED } from '../../src/game/config/enemyBehaviorBalance';
import { ENEMY_ARCHETYPES } from '../../src/game/data/enemies';
import {
  applyEventEnemyStatMultiplier,
  applyEnemyScaling,
  getAvailableEnemySpawnSlots,
  selectEnemyWaveWithinCap,
  getEnemyMajorEncounterFactor,
  getEnemyScalingMultipliers,
  getEnemyScalingSnapshot,
  getEnemyScalingStack,
} from '../../src/game/systems/enemyScaling';

describe('enemy scaling', () => {
  test('starts at stack 0 and advances by interval', () => {
    expect(getEnemyScalingStack(0)).toBe(0);
    expect(getEnemyScalingStack(ENEMY_SCALING_INTERVAL_MS - 1)).toBe(0);
    expect(getEnemyScalingStack(ENEMY_SCALING_INTERVAL_MS)).toBe(1);
    expect(getEnemyScalingStack(ENEMY_SCALING_INTERVAL_MS * 3)).toBe(3);
  });

  test('caps normal timed scaling at max stack', () => {
    expect(getEnemyScalingStack(ENEMY_SCALING_INTERVAL_MS * (ENEMY_SCALING_MAX_STACK + 10))).toBe(
      ENEMY_SCALING_MAX_STACK,
    );
  });

  test('calculates deterministic stat multipliers', () => {
    const multipliers = getEnemyScalingMultipliers(2);
    expect(multipliers.hp).toBeCloseTo(1.68);
    expect(multipliers.speed).toBe(1.09);
    expect(multipliers.damage).toBe(1.16);
    expect(multipliers.projectileCooldown).toBe(0.944);
    expect(multipliers.projectileSpeed).toBe(1.07);
  });

  test('scales regular enemies more strongly than major encounters', () => {
    const elapsedMs = ENEMY_SCALING_INTERVAL_MS * 4;
    const hexcaster = applyEnemyScaling(ENEMY_ARCHETYPES.hexcaster, elapsedMs);
    const boss = applyEnemyScaling(ENEMY_ARCHETYPES.behemoth, elapsedMs);

    expect(getEnemyMajorEncounterFactor(ENEMY_ARCHETYPES.hexcaster)).toBe(1);
    expect(getEnemyMajorEncounterFactor(ENEMY_ARCHETYPES.behemoth)).toBe(0.65);
    expect(hexcaster.maxHealth).toBe(227);
    expect(hexcaster.shotCooldownMs).toBe(1465);
    expect(boss.maxHealth).toBe(Math.round(BOSS_FIRST_PASS_MAX_HEALTH * 1.884));
  });

  test('reports scaling snapshot and active cap slots', () => {
    expect(getEnemyScalingSnapshot(ENEMY_SCALING_INTERVAL_MS * 2)).toMatchObject({
      stack: 2,
      maxStack: ENEMY_SCALING_MAX_STACK,
      intervalMs: ENEMY_SCALING_INTERVAL_MS,
    });
    expect(getAvailableEnemySpawnSlots(0)).toBe(ENEMY_ACTIVE_CAP);
    expect(getAvailableEnemySpawnSlots(ENEMY_ACTIVE_CAP - 2)).toBe(2);
    expect(getAvailableEnemySpawnSlots(ENEMY_ACTIVE_CAP + 5)).toBe(0);
  });

  test('event stat multiplier applies only when explicitly requested', () => {
    const base = ENEMY_ARCHETYPES.harrier;
    const eventEnemy = applyEventEnemyStatMultiplier(base);

    expect(base.maxHealth).toBe(74);
    expect(base.contactDamage).toBe(11);
    expect(eventEnemy.maxHealth).toBe(370);
    expect(eventEnemy.contactDamage).toBe(55);
    expect(eventEnemy.speed).toBeGreaterThan(base.speed);
  });
});


describe('R3E normal pressure tuning', () => {
  test('uses the requested base speeds without changing Crusher dash velocity', () => {
    expect(Object.fromEntries(
      ['scuttler', 'skimmer', 'harrier', 'mauler', 'crusher', 'bulwark', 'hexcaster'].map(
        (id) => [id, ENEMY_ARCHETYPES[id as keyof typeof ENEMY_ARCHETYPES].speed],
      ),
    )).toEqual({ scuttler: 135, skimmer: 158, harrier: 178, mauler: 106, crusher: 101, bulwark: 74, hexcaster: 95 });
    expect(CHARGER_DASH_SPEED).toBe(760);
    expect(ENEMY_SPAWN_INTERVAL_MS).toBe(1900);
    expect(ENEMY_ACTIVE_CAP).toBe(22);
  });

  test.each([22, 23, 40])('keeps every major encounter when the active count is %i', (activeCount) => {
    const { scuttler, overlord, riftblade, dreadnought, behemoth } = ENEMY_ARCHETYPES;
    const wave = [scuttler, overlord, scuttler, riftblade, dreadnought, behemoth];
    expect(selectEnemyWaveWithinCap(wave, activeCount)).toEqual([overlord, riftblade, dreadnought, behemoth]);
    expect(wave).toHaveLength(6);
  });

  test('major encounters do not consume the last normal slot or reorder the wave', () => {
    const { scuttler, overlord, dreadnought, behemoth } = ENEMY_ARCHETYPES;
    expect(selectEnemyWaveWithinCap([overlord, scuttler, dreadnought, scuttler, behemoth], 21))
      .toEqual([overlord, scuttler, dreadnought, behemoth]);
    expect(selectEnemyWaveWithinCap(Array(24).fill(scuttler), 0)).toHaveLength(22);
    expect(selectEnemyWaveWithinCap([], 0)).toEqual([]);
  });
});


describe('Crusher dash physics preservation', () => {
  test('retains the old velocity cap at every scaling stack and after event scaling', () => {
    const oldCrusher = { ...ENEMY_ARCHETYPES.crusher, speed: 112 };
    for (let stack = 0; stack <= ENEMY_SCALING_MAX_STACK; stack += 1) {
      const elapsed = stack * ENEMY_SCALING_INTERVAL_MS;
      const oldScaled = applyEnemyScaling(oldCrusher, elapsed);
      const tuned = applyEnemyScaling(ENEMY_ARCHETYPES.crusher, elapsed);
      expect(tuned.speed).toBeLessThan(oldScaled.speed);
      expect(tuned.velocityCapBaseSpeed! * 3).toBe(oldScaled.speed * 3);
      // Event archetypes are modified before timed scaling in RunScene.
      const oldEvent = applyEnemyScaling(applyEventEnemyStatMultiplier(oldCrusher), elapsed);
      const event = applyEnemyScaling(applyEventEnemyStatMultiplier(ENEMY_ARCHETYPES.crusher), elapsed);
      expect(event.velocityCapBaseSpeed! * 3).toBe(oldEvent.speed * 3);
    }
  });
});
