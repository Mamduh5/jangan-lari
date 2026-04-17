import {
  CombatResponseController,
  HIT_STOP_REFRESH_BLOCK_RATIO,
  HIT_STOP_REFRESH_GUARD_MAX_MS,
  getCombatResponseTuningSnapshot,
  getEnemyCombatResponseProfile,
  getWeaponCombatResponseProfile,
  resolveCombatImpactResponse,
} from '../../src/game/combat/combatResponse';

describe('combat response helpers', () => {
  test('profiles cover the current roster plus encounter enemies with distinct authored tuning', () => {
    expect(getEnemyCombatResponseProfile('scuttler')).not.toBeNull();
    expect(getEnemyCombatResponseProfile('skimmer')).not.toBeNull();
    expect(getEnemyCombatResponseProfile('harrier')).not.toBeNull();
    expect(getEnemyCombatResponseProfile('mauler')).not.toBeNull();
    expect(getEnemyCombatResponseProfile('crusher')).not.toBeNull();
    expect(getEnemyCombatResponseProfile('bulwark')).not.toBeNull();
    expect(getEnemyCombatResponseProfile('overlord')).not.toBeNull();
    expect(getEnemyCombatResponseProfile('riftblade')).not.toBeNull();
    expect(getEnemyCombatResponseProfile('dreadnought')).not.toBeNull();
    expect(getEnemyCombatResponseProfile('behemoth')).not.toBeNull();

    expect(getWeaponCombatResponseProfile('arc-bolt')).not.toBeNull();
    expect(getWeaponCombatResponseProfile('twin-fangs')).not.toBeNull();
    expect(getWeaponCombatResponseProfile('bloom-cannon')).not.toBeNull();
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
    expect(phaseDiscImpact.hitStopMs).toBeLessThanOrEqual(authoredImpact.hitStopMs);
    expect(phaseDiscImpact.cue).not.toBeNull();

    const twinFangsImpact = resolveCombatImpactResponse({
      enemyId: 'harrier',
      weaponId: 'twin-fangs',
      defeated: false,
      x: 132,
      y: 118,
      color: 0x7dd3fc,
      radius: 4,
    });
    expect(twinFangsImpact.hitStopMs).toBeGreaterThan(0);
    expect(twinFangsImpact.hitStopMs).toBeLessThanOrEqual(authoredImpact.hitStopMs);
    expect(twinFangsImpact.cue).not.toBeNull();

    const bloomCannonImpact = resolveCombatImpactResponse({
      enemyId: 'bulwark',
      weaponId: 'bloom-cannon',
      defeated: false,
      x: 148,
      y: 122,
      color: 0x86efac,
      radius: 5,
    });
    expect(bloomCannonImpact.hitStopMs).toBeGreaterThan(twinFangsImpact.hitStopMs);
    expect(bloomCannonImpact.hitStopMs).toBeLessThanOrEqual(authoredImpact.hitStopMs + 2);
    expect(bloomCannonImpact.cue).not.toBeNull();

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

    const specialEncounterImpact = resolveCombatImpactResponse({
      enemyId: 'dreadnought',
      weaponId: 'bloom-cannon',
      defeated: false,
      x: 100,
      y: 120,
      color: 0x86efac,
      radius: 5,
    });
    expect(specialEncounterImpact.hitStopMs).toBeGreaterThan(0);
    expect(specialEncounterImpact.hitStopMs).toBeLessThan(bloomCannonImpact.hitStopMs);
    expect(specialEncounterImpact.cue).not.toBeNull();

    const bossEncounterImpact = resolveCombatImpactResponse({
      enemyId: 'behemoth',
      weaponId: 'bloom-cannon',
      defeated: false,
      x: 112,
      y: 128,
      color: 0x86efac,
      radius: 5,
    });
    expect(bossEncounterImpact.hitStopMs).toBeGreaterThan(0);
    expect(bossEncounterImpact.hitStopMs).toBeLessThanOrEqual(specialEncounterImpact.hitStopMs + 1);
    expect(bossEncounterImpact.cue).not.toBeNull();
    expect(bossEncounterImpact.cue?.alpha).toBeLessThanOrEqual(specialEncounterImpact.cue?.alpha ?? 1);
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

  test('tuning snapshot exposes the current authored profiles and guard values for review', () => {
    const snapshot = getCombatResponseTuningSnapshot();

    expect(snapshot.hitStopGuard.refreshBlockRatio).toBe(HIT_STOP_REFRESH_BLOCK_RATIO);
    expect(snapshot.hitStopGuard.refreshGuardMaxMs).toBe(HIT_STOP_REFRESH_GUARD_MAX_MS);
    expect(snapshot.enemyProfiles.dreadnought?.deathBeatMs).toBeGreaterThan(snapshot.enemyProfiles.scuttler?.deathBeatMs ?? 0);
    expect(snapshot.weaponProfiles['sunwheel']?.impactHitStopMs).toBeLessThan(
      snapshot.weaponProfiles['shatterbell']?.impactHitStopMs ?? Number.POSITIVE_INFINITY,
    );
  });
});
