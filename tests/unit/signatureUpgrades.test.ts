import {
  UPGRADE_POOL,
  buildLevelUpChoices,
  getEligibleSignatureUpgrades,
  shouldQueueBreakthroughChoice,
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

  test('one-weapon preference injects one weapon-direction option without forcing a specific weapon', () => {
    const choices = buildLevelUpChoices({
      upgrades: UPGRADE_POOL,
      ownedWeaponIds: ['arc-bolt'],
      takenSignatureIds: [],
      forceSignature: false,
      preferWeaponDirection: true,
      shuffle: <T>(items: T[]): T[] => [...items],
    });

    expect(choices).toHaveLength(3);
    expect(
      choices.some((choice) =>
        [
          'unlock-twin-fangs',
          'unlock-ember-lance',
          'unlock-bloom-cannon',
          'unlock-phase-disc',
          'unlock-sunwheel',
          'unlock-shatterbell',
        ].includes(choice.id),
      ),
    ).toBe(true);
  });

  test('breakthrough mode injects one signature and fills from the high-impact core pool first', () => {
    const choices = buildLevelUpChoices({
      upgrades: UPGRADE_POOL,
      ownedWeaponIds: ['arc-bolt'],
      takenSignatureIds: [],
      forceSignature: false,
      mode: 'breakthrough',
      shuffle: <T>(items: T[]): T[] => [...items],
    });

    expect(choices).toHaveLength(3);
    expect(choices[0].id).toBe('signature-arc-bolt-volt-volley');
    expect(choices.slice(1).map((choice) => choice.id)).toEqual(['power', 'rapid-fire']);
  });

  test('breakthrough mode falls back to non-utility core upgrades when the high-impact pool is short', () => {
    const choices = buildLevelUpChoices({
      upgrades: [
        UPGRADE_POOL.find((upgrade) => upgrade.id === 'power')!,
        UPGRADE_POOL.find((upgrade) => upgrade.id === 'vitality')!,
        UPGRADE_POOL.find((upgrade) => upgrade.id === 'unlock-twin-fangs')!,
        UPGRADE_POOL.find((upgrade) => upgrade.id === 'signature-arc-bolt-volt-volley')!,
      ],
      ownedWeaponIds: ['arc-bolt'],
      takenSignatureIds: [],
      forceSignature: false,
      mode: 'breakthrough',
      shuffle: <T>(items: T[]): T[] => [...items],
    });

    expect(choices.map((choice) => choice.id)).toEqual([
      'signature-arc-bolt-volt-volley',
      'power',
      'unlock-twin-fangs',
    ]);
  });

  test('breakthrough queue helper only returns true before the milestone is consumed', () => {
    expect(
      shouldQueueBreakthroughChoice({
        upgrades: UPGRADE_POOL,
        ownedWeaponIds: ['arc-bolt'],
        takenSignatureIds: [],
        milestoneConsumed: false,
      }),
    ).toBe(true);

    expect(
      shouldQueueBreakthroughChoice({
        upgrades: UPGRADE_POOL,
        ownedWeaponIds: ['arc-bolt'],
        takenSignatureIds: [],
        milestoneConsumed: true,
      }),
    ).toBe(false);
  });
});
