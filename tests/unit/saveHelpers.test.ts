import { HEROES } from '../../src/game/data/heroes';
import {
  createDefaultSaveData,
  loadGameSave,
  markControlHintDismissed,
  recordLocalLeaderboardEntry,
  updateControlGuideMode,
  writeGameSave,
} from '../../src/game/save/saveData';
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
        unlockedHeroes: ['vanguard'],
        unlockedPermanentUpgrades: ['move-speed'],
        purchasedPermanentUpgrades: {
          'max-hp': -1,
          'move-speed': 2,
          'pickup-range': 1,
          'starting-damage': 3,
          'hp-regen': 4,
        },
        completedQuests: ['defeat-1-elite'],
        progressStats: {
          totalKills: -5,
          totalSurvivalMs: 1000,
          maxLevelReached: 4,
          totalGoldCollected: 20,
          eliteKills: 1,
        },
        controlGuideMode: 'loud',
        controlHintDismissed: true,
      }),
    );

    const save = loadGameSave();
    expect(save.totalGold).toBe(0);
    expect(save.selectedHero).toBe('vanguard');
    expect(save.unlockedHeroes).toEqual(['vanguard']);
    expect(save.unlockedPermanentUpgrades).toEqual(['max-hp', 'move-speed', 'pickup-range', 'hp-regen']);
    expect(save.purchasedPermanentUpgrades['max-hp']).toBe(0);
    expect(save.purchasedPermanentUpgrades['hp-regen']).toBe(4);
    expect(save.progressStats.totalKills).toBe(0);
    expect(save.bestScore).toBe(0);
    expect(save.localLeaderboard).toEqual([]);
    expect(save.controlGuideMode).toBe('subtle');
    expect(save.controlHintDismissed).toBe(true);
  });

  test('old saves without hp regen remain compatible and gain the default regen upgrade slot', () => {
    window.localStorage.setItem(
      'jangan-lari-save-v1',
      JSON.stringify({
        version: 4,
        totalGold: 10,
        selectedHero: 'runner',
        unlockedHeroes: ['runner'],
        unlockedPermanentUpgrades: ['max-hp', 'move-speed', 'pickup-range'],
        purchasedPermanentUpgrades: {
          'max-hp': 2,
          'move-speed': 1,
          'pickup-range': 0,
          'starting-damage': 0,
        },
      }),
    );

    const save = loadGameSave();
    expect(save.unlockedPermanentUpgrades).toContain('hp-regen');
    expect(save.purchasedPermanentUpgrades['hp-regen']).toBe(0);
    expect(save.purchasedPermanentUpgrades['max-hp']).toBe(2);
  });

  test('unlockHero requires enough gold and selects the unlocked hero', () => {
    const save = createDefaultSaveData();
    expect(unlockHero(save, HEROES.vanguard)).toBeNull();

    const fundedSave = { ...save, totalGold: 200 };
    const unlocked = unlockHero(fundedSave, HEROES.vanguard);

    expect(unlocked).not.toBeNull();
    expect(unlocked?.totalGold).toBe(80);
    expect(unlocked?.selectedHero).toBe('vanguard');
    expect(isHeroUnlocked(unlocked!, 'vanguard')).toBe(true);
  });

  test('selectHero only works for unlocked heroes', () => {
    const save = createDefaultSaveData();
    expect(selectHero(save, 'vanguard')).toBeNull();

    const unlockedSave = { ...save, unlockedHeroes: ['runner', 'vanguard'] as const };
    const selected = selectHero(unlockedSave, 'vanguard');
    expect(selected?.selectedHero).toBe('vanguard');
  });

  test('writeGameSave persists the latest save snapshot', () => {
    const save = { ...createDefaultSaveData(), totalGold: 77 };
    writeGameSave(save);

    const parsed = JSON.parse(window.localStorage.getItem('jangan-lari-save-v1') ?? '{}');
    expect(parsed.totalGold).toBe(77);
  });

  test('control guide settings persist locally', () => {
    const hiddenSave = updateControlGuideMode(createDefaultSaveData(), 'hidden');
    expect(hiddenSave.controlGuideMode).toBe('hidden');

    const dismissedSave = markControlHintDismissed(hiddenSave);
    expect(dismissedSave.controlHintDismissed).toBe(true);

    const parsed = JSON.parse(window.localStorage.getItem('jangan-lari-save-v1') ?? '{}');
    expect(parsed.controlGuideMode).toBe('hidden');
    expect(parsed.controlHintDismissed).toBe(true);
  });

  test('recordLocalLeaderboardEntry stores top local runs and updates best score', () => {
    const first = recordLocalLeaderboardEntry(createDefaultSaveData(), {
      score: 240,
      level: 3,
      classId: 'twin',
      classTitle: 'Twin',
      kills: 4,
      timeSurvivedMs: 12_000,
      timestamp: 1000,
    });

    expect(first.isNewBest).toBe(true);
    expect(first.saveData.bestScore).toBe(240);
    expect(first.saveData.localLeaderboard).toHaveLength(1);
    expect(first.saveData.localLeaderboard[0]).toMatchObject({
      score: 240,
      level: 3,
      classId: 'twin',
      classTitle: 'Twin',
      kills: 4,
      timeSurvivedMs: 12_000,
    });

    const second = recordLocalLeaderboardEntry(first.saveData, {
      score: 120,
      level: 2,
      classId: 'basic',
      classTitle: 'Basic',
      kills: 1,
      timeSurvivedMs: 5000,
      timestamp: 2000,
    });

    expect(second.isNewBest).toBe(false);
    expect(second.saveData.bestScore).toBe(240);
    expect(second.saveData.localLeaderboard.map((entry) => entry.score)).toEqual([240, 120]);
  });
});
