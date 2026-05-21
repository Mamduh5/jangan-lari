import { ENEMY_ROLE_TAGS, getWaveDirectorWindow } from '../../src/game/config/waveDirectorBalance';

describe('wave director progression', () => {
  test('opens with only scuttlers before introducing fast enemies', () => {
    const opening = getWaveDirectorWindow(1_000);
    expect(opening.id).toBe('learn-fodder');
    expect(opening.templates.flatMap((template) => template.composition).every((id) => id === 'scuttler')).toBe(true);

    const fastWindow = getWaveDirectorWindow(75_000);
    expect(fastWindow.id).toBe('fast-spacing');
    expect(fastWindow.fallbackPool.some((entry) => entry.id === 'skimmer')).toBe(true);
    expect(fastWindow.fallbackPool.some((entry) => entry.id === 'hexcaster')).toBe(false);
  });

  test('keeps ranged enemies locked until the priority-threat window', () => {
    expect(getWaveDirectorWindow(150_000).fallbackPool.some((entry) => entry.id === 'hexcaster')).toBe(false);

    const rangedWindow = getWaveDirectorWindow(190_000);
    expect(rangedWindow.id).toBe('ranged-priority');
    expect(rangedWindow.rangedMax).toBe(1);
    expect(rangedWindow.templates.some((template) => template.composition.includes('hexcaster'))).toBe(true);
  });

  test('late templates use role bundles instead of decorative-only formations', () => {
    const lateWindow = getWaveDirectorWindow(500_000);
    const siege = lateWindow.templates.find((template) => template.id === 'siege-battery');

    expect(siege).toBeTruthy();
    expect(siege?.formation).toBe('sweep-wall');
    expect(siege?.composition.some((id) => ENEMY_ROLE_TAGS[id].includes('ranged'))).toBe(true);
    expect(siege?.composition.some((id) => ENEMY_ROLE_TAGS[id].includes('blocker'))).toBe(true);
  });
});
