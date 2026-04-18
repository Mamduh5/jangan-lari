import {
  UPGRADE_POOL,
  buildLevelUpChoices,
  getEligibleSignatureUpgrades,
} from '../../src/game/data/upgrades';

describe('signature upgrade helpers', () => {
  test('eligible signatures require the matching owned weapon', () => {
    const eligible = getEligibleSignatureUpgrades(UPGRADE_POOL, ['arc-bolt'], []);
    expect(eligible.map((upgrade) => upgrade.id)).toContain('signature-arc-bolt-volt-volley');
    expect(eligible.map((upgrade) => upgrade.id)).not.toContain('signature-shatterbell-aftershock');
  });

  test('taken signatures are excluded from future eligibility', () => {
    const eligible = getEligibleSignatureUpgrades(UPGRADE_POOL, ['arc-bolt'], ['signature-arc-bolt-volt-volley']);
    expect(eligible.map((upgrade) => upgrade.id)).not.toContain('signature-arc-bolt-volt-volley');
  });

  test('forced signature choice injects exactly one eligible signature when available', () => {
    const choices = buildLevelUpChoices({
      upgrades: UPGRADE_POOL,
      ownedWeaponIds: ['arc-bolt', 'twin-fangs'],
      takenSignatureIds: [],
      forceSignature: true,
      shuffle: <T>(items: T[]): T[] => [...items],
    });

    const signatureChoices = choices.filter((choice) => choice.kind === 'signature');
    expect(choices).toHaveLength(3);
    expect(signatureChoices).toHaveLength(1);
    expect(['signature-arc-bolt-volt-volley', 'signature-twin-fangs-ripper-line']).toContain(signatureChoices[0].id);
  });

  test('forced signature choice falls back to the regular pool when no signature is eligible', () => {
    const choices = buildLevelUpChoices({
      upgrades: UPGRADE_POOL,
      ownedWeaponIds: [],
      takenSignatureIds: [],
      forceSignature: true,
      shuffle: <T>(items: T[]): T[] => [...items],
    });

    expect(choices).toHaveLength(3);
    expect(choices.every((choice) => choice.kind === 'core')).toBe(true);
  });
});
