import {
  CombatResponseController,
  getEnemyCombatResponseProfile,
  getWeaponCombatResponseProfile,
  resolveCombatImpactResponse,
} from '../../src/game/combat/combatResponse';

describe('combat response helpers', () => {
  test('profiles are only defined for the narrow authored slice', () => {
    expect(getEnemyCombatResponseProfile('scuttler')).not.toBeNull();
    expect(getEnemyCombatResponseProfile('overlord')).not.toBeNull();
    expect(getEnemyCombatResponseProfile('mauler')).toBeNull();

    expect(getWeaponCombatResponseProfile('arc-bolt')).not.toBeNull();
    expect(getWeaponCombatResponseProfile('ember-lance')).not.toBeNull();
    expect(getWeaponCombatResponseProfile('phase-disc')).not.toBeNull();
    expect(getWeaponCombatResponseProfile('sunwheel')).not.toBeNull();
    expect(getWeaponCombatResponseProfile('shatterbell')).not.toBeNull();
  });

  test('impact response combines weapon and enemy feel cues without affecting unrelated content', () => {
    const authoredImpact = resolveCombatImpactResponse({
      enemyId: 'scuttler',
      weaponId: 'arc-bolt',
      defeated: false,
      x: 100,
      y: 120,
      color: 0xfacc15,
      radius: 5,
    });
    expect(authoredImpact.hitStopMs).toBeGreaterThan(0);
    expect(authoredImpact.cue).not.toBeNull();

    const phaseDiscImpact = resolveCombatImpactResponse({
      enemyId: 'mauler',
      weaponId: 'phase-disc',
      defeated: false,
      x: 160,
      y: 140,
      color: 0xc084fc,
      radius: 9,
    });
    expect(phaseDiscImpact.hitStopMs).toBeGreaterThan(0);
    expect(phaseDiscImpact.hitStopMs).toBeLessThan(authoredImpact.hitStopMs);
    expect(phaseDiscImpact.cue).not.toBeNull();

    const shatterbellImpact = resolveCombatImpactResponse({
      enemyId: 'mauler',
      weaponId: 'shatterbell',
      defeated: false,
      x: 150,
      y: 150,
      color: 0x67e8f9,
      radius: 8,
    });
    expect(shatterbellImpact.hitStopMs).toBeGreaterThanOrEqual(phaseDiscImpact.hitStopMs);
    expect(shatterbellImpact.cue).not.toBeNull();

    const sunwheelImpact = resolveCombatImpactResponse({
      enemyId: 'mauler',
      weaponId: 'sunwheel',
      defeated: false,
      x: 140,
      y: 140,
      color: 0xfbbf24,
      radius: 5,
    });
    expect(sunwheelImpact.hitStopMs).toBeGreaterThan(0);
    expect(sunwheelImpact.hitStopMs).toBeLessThanOrEqual(phaseDiscImpact.hitStopMs);
    expect(sunwheelImpact.cue).not.toBeNull();

    const unrelatedImpact = resolveCombatImpactResponse({
      enemyId: 'mauler',
      weaponId: 'bloom-cannon',
      defeated: false,
      x: 100,
      y: 120,
      color: 0xffffff,
      radius: 8,
    });
    expect(unrelatedImpact.hitStopMs).toBe(0);
    expect(unrelatedImpact.cue).toBeNull();
  });

  test('combat response controller starts, extends, and clears hit-stop cleanly', () => {
    const events: string[] = [];
    const controller = new CombatResponseController({
      onHitStopStart: () => events.push('start'),
      onHitStopEnd: () => events.push('end'),
    });

    controller.triggerHitStop(10);
    controller.triggerHitStop(6);
    expect(controller.isHitStopActive()).toBe(true);
    expect(events).toEqual(['start']);

    controller.update(4);
    expect(controller.isHitStopActive()).toBe(true);

    controller.update(6);
    expect(controller.isHitStopActive()).toBe(false);
    expect(events).toEqual(['start', 'end']);

    controller.triggerHitStop(8);
    controller.clear();
    expect(controller.isHitStopActive()).toBe(false);
    expect(events).toEqual(['start', 'end', 'start', 'end']);
  });

  test('combat response controller coalesces clustered hit-stop refreshes', () => {
    const controller = new CombatResponseController();

    controller.triggerHitStop(18);
    controller.triggerHitStop(18);
    controller.update(5);
    controller.triggerHitStop(18);

    const metrics = controller.getMetrics();
    expect(metrics.hitStopStarts).toBe(1);
    expect(metrics.hitStopRefreshes).toBe(0);
    expect(metrics.hitStopSuppressions).toBe(2);
  });

  test('combat response controller can clear without resuming callbacks during teardown', () => {
    const events: string[] = [];
    const controller = new CombatResponseController({
      onHitStopStart: () => events.push('start'),
      onHitStopEnd: () => events.push('end'),
    });

    controller.triggerHitStop(12);
    controller.clear({ suppressCallbacks: true });

    expect(controller.isHitStopActive()).toBe(false);
    expect(events).toEqual(['start']);
  });
});
