import { HEROES } from '../../src/game/data/heroes';
import { createDefaultSaveData, loadGameSave, writeGameSave } from '../../src/game/save/saveData';
import { isHeroUnlocked, selectHero, unlockHero } from '../../src/game/save/saveHeroes';

describe('save helpers', () => {
  test('loadGameSave creates a default save when storage is empty', () => {
    const save = loadGameSave();

    expect(save).toEqual(createDefaultSaveData());
    expect(window.localStorage.getItem('jangan-lari-save-v1')).toContain('runner');
  });

  test('loadGameSave sanitizes invalid stored hero state', () => {
    window.localStorage.setItem(
      'jangan-lari-save-v1',
      JSON.stringify({
        version: 99,
        totalGold: -100,
        selectedHero: 'not-real',
        unlockedHeroes: ['shade'],
        unlockedPermanentUpgrades: ['move-speed'],
        purchasedPermanentUpgrades: {
          'max-hp': -1,
          'move-speed': 2,
          'pickup-range': 1,
          'starting-damage': 3,
        },
        completedQuests: ['defeat-1-elite'],
        progressStats: {
          totalKills: -5,
          totalSurvivalMs: 1000,
          maxLevelReached: 4,
          totalGoldCollected: 20,
          eliteKills: 1,
        },
      }),
    );

    const save = loadGameSave();
    expect(save.totalGold).toBe(0);
    expect(save.selectedHero).toBe('shade');
    expect(save.unlockedHeroes).toEqual(['shade']);
    expect(save.purchasedPermanentUpgrades['max-hp']).toBe(0);
    expect(save.progressStats.totalKills).toBe(0);
  });

  test('unlockHero returns null for already-available milestone heroes', () => {
    const save = createDefaultSaveData();
    expect(unlockHero(save, HEROES.runner)).toBeNull();
    expect(unlockHero(save, HEROES.shade)).toBeNull();
  });

  test('selectHero only works for unlocked heroes', () => {
    const save = createDefaultSaveData();
    expect(selectHero(save, 'shade')?.selectedHero).toBe('shade');

    const lockedSave = { ...save, unlockedHeroes: ['runner'] as const };
    expect(isHeroUnlocked(lockedSave, 'shade')).toBe(false);
    expect(selectHero(lockedSave, 'shade')).toBeNull();
  });

  test('writeGameSave persists the latest save snapshot', () => {
    const save = { ...createDefaultSaveData(), totalGold: 77 };
    writeGameSave(save);

    const parsed = JSON.parse(window.localStorage.getItem('jangan-lari-save-v1') ?? '{}');
    expect(parsed.totalGold).toBe(77);
  });
});
