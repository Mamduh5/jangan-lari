import { SpawnDirector } from '../../src/game/systems/SpawnDirector';

describe('spawn director pressure beats', () => {
  test('anti-ramp pressure beat triggers on its authored early window', () => {
    const director = new SpawnDirector();

    const wave = director.nextWave(102_000);

    expect(wave.templateId).toBe('ramp-check');
    expect(wave.templateHighlight).toBe(true);
    expect(wave.wave.map((enemy) => enemy.id)).toEqual(['harrier', 'shooter', 'shooter', 'swarmer']);
    expect(wave.eventTargetIndex).toBeNull();
    expect(director.getPressureBeat(102_000)).toMatchObject({
      active: true,
      id: 'ramp-check',
      label: 'Ramp Check',
    });
  });

  test('stabilization pressure beat surfaces before the mid-run siege check', () => {
    const director = new SpawnDirector();

    const wave = director.nextWave(156_000);

    expect(wave.templateId).toBe('stabilize-pocket');
    expect(wave.wave.map((enemy) => enemy.id)).toEqual(['anchor', 'shooter', 'swarmer', 'swarmer']);
    expect(director.getPressureBeat(156_000).objective).toContain('recover space');
  });

  test('anti-turtle pressure beat triggers on the existing late-run path', () => {
    const director = new SpawnDirector();
    director.nextWave(180_000);

    const wave = director.nextWave(222_000);

    expect(wave.templateId).toBe('bunker-break');
    expect(wave.wave.map((enemy) => enemy.id)).toEqual(['crusher', 'hexcaster', 'shooter', 'bulwark']);
    expect(director.getPressureBeat(222_000)).toMatchObject({
      active: true,
      id: 'bunker-break',
      label: 'Bunker Break',
    });
  });

  test('execution-window pressure beat exposes a marked event target for payoff builds', () => {
    const director = new SpawnDirector();
    director.nextWave(180_000);
    director.nextWave(222_000);

    const wave = director.nextWave(264_000);

    expect(wave.templateId).toBe('execution-window');
    expect(wave.wave.map((enemy) => enemy.id)).toEqual(['bulwark', 'harrier', 'hexcaster', 'shooter']);
    expect(wave.eventTargetIndex).toBe(2);
    expect(wave.eventTargetColor).toBe(0xfbbf24);
    expect(director.getPressureBeat(264_000).objective).toContain('marked conduit');
  });

  test('pressure beat snapshots expire cleanly after their duration', () => {
    const director = new SpawnDirector();
    director.nextWave(102_000);

    expect(director.getPressureBeat(102_000).active).toBe(true);
    expect(director.getPressureBeat(118_500).active).toBe(false);
  });
});
