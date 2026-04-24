import { SpawnDirector } from '../../src/game/systems/SpawnDirector';

describe('spawn director pressure beats', () => {
  test('anti-ramp pressure beat triggers on its authored early window', () => {
    const director = new SpawnDirector();

    const wave = director.nextWave(102_000);

    expect(wave.templateId).toBe('ramp-check');
    expect(wave.templateHighlight).toBe(true);
    expect(wave.wave.map((enemy) => enemy.id)).toEqual(['harrier', 'shooter', 'shooter', 'swarmer']);
    expect(wave.eventType).toBe('priority-execution');
    expect(wave.eventTargetIndex).toBe(0);
    expect(wave.eventTargetColor).toBe(0xfef08a);
    expect(director.getPressureBeat(102_000)).toMatchObject({
      active: true,
      id: 'ramp-check',
      type: 'priority-execution',
      label: 'Ramp Check',
    });
  });

  test('stabilization pressure beat surfaces before the mid-run siege check', () => {
    const director = new SpawnDirector();

    const wave = director.nextWave(156_000);

    expect(wave.templateId).toBe('stabilize-pocket');
    expect(wave.wave.map((enemy) => enemy.id)).toEqual(['anchor', 'shooter', 'swarmer', 'swarmer']);
    expect(wave.eventType).toBe('stabilize-collapse');
    expect(wave.eventTargetIndex).toBe(0);
    expect(director.getPressureBeat(156_000)).toMatchObject({
      type: 'stabilize-collapse',
      label: 'Stabilize Pocket',
    });
    expect(director.getPressureBeat(156_000).objective).toContain('messy cluster');
  });

  test('anti-turtle pressure beat triggers on the existing late-run path', () => {
    const director = new SpawnDirector();
    director.nextWave(180_000);

    const wave = director.nextWave(222_000);

    expect(wave.templateId).toBe('bunker-break');
    expect(wave.wave.map((enemy) => enemy.id)).toEqual(['crusher', 'hexcaster', 'shooter', 'bulwark']);
    expect(wave.eventType).toBe('hold-space');
    expect(wave.eventTargetIndex).toBe(3);
    expect(wave.eventTargetColor).toBe(0xfb923c);
    expect(director.getPressureBeat(222_000)).toMatchObject({
      active: true,
      id: 'bunker-break',
      type: 'hold-space',
      label: 'Hold Space',
    });
  });

  test('execution-window pressure beat exposes a marked event target for payoff builds', () => {
    const director = new SpawnDirector();
    director.nextWave(180_000);
    director.nextWave(222_000);

    const wave = director.nextWave(264_000);

    expect(wave.templateId).toBe('execution-window');
    expect(wave.wave.map((enemy) => enemy.id)).toEqual(['bulwark', 'harrier', 'hexcaster', 'shooter']);
    expect(wave.eventType).toBe('state-break');
    expect(wave.eventTitle).toBe('State Break');
    expect(wave.eventObjective).toContain('hero payoff');
    expect(wave.eventTargetIndex).toBe(2);
    expect(wave.eventTargetColor).toBe(0xfbbf24);
    expect(director.getPressureBeat(264_000).objective).toContain('Guard, Mark, or Ailment payoff');
    expect(director.getPressureBeat(264_000).type).toBe('state-break');
  });

  test('pressure beat snapshots expire cleanly after their duration', () => {
    const director = new SpawnDirector();
    director.nextWave(102_000);

    expect(director.getPressureBeat(102_000).active).toBe(true);
    expect(director.getPressureBeat(118_500).active).toBe(false);
  });
});
