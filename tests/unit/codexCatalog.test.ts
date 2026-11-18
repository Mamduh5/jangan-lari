import { describe, expect, test } from 'vitest';
import { ENEMY_ARCHETYPES } from '../../src/game/data/enemies';
import { HERO_LIST } from '../../src/game/data/heroes';
import { UPGRADE_POOL } from '../../src/game/data/upgrades';
import { WEAPON_LIST } from '../../src/game/data/weapons';
import { VISUAL_ASSET_RUNTIME_CONFIG } from '../../src/game/config/visualAssetRuntimeConfig';
import { createDefaultSaveData } from '../../src/game/save/saveData';
import {
  CODEX_CATEGORIES,
  CODEX_ENEMY_ORDER,
  getCodexEnemyEntries,
  getCodexHeroEntries,
  getCodexPageSlice,
  getCodexWeaponEntries,
  stepCodexIndex,
} from '../../src/game/ui/codexCatalog';

describe('R3G-D2B Field Codex catalog & pagination data', () => {
  test('exposes exact category totals for 4 heroes, 7 weapons, and 11 enemies', () => {
    expect(CODEX_CATEGORIES.map((c) => [c.id, c.label, c.count])).toEqual([
      ['heroes', 'HEROES', 4],
      ['weapons', 'WEAPONS', 7],
      ['enemies', 'ENEMIES', 11],
    ]);
    expect(CODEX_ENEMY_ORDER).toHaveLength(Object.keys(ENEMY_ARCHETYPES).length);
    expect(VISUAL_ASSET_RUNTIME_CONFIG.enemyIcons).toBe(false);
    expect(VISUAL_ASSET_RUNTIME_CONFIG.heroSkins).toBe(false);
  });

  test('lists all 4 heroes regardless of unlock state and tracks real passive & modifiers', () => {
    const save = { ...createDefaultSaveData(), unlockedHeroes: ['runner' as const], selectedHero: 'runner' as const };
    const heroes = getCodexHeroEntries(save);
    expect(heroes.map((h) => h.id)).toEqual(HERO_LIST.map((h) => h.id));
    expect(heroes[0].unlocked).toBe(true);
    expect(heroes[0].selected).toBe(true);
    expect(heroes[3].id).toBe('verdant');
    expect(heroes[3].unlocked).toBe(false);
    expect(heroes[3].unlockChipLabel).toBe('LOCKED · 210G');
    expect(heroes[3].statModifiers).toEqual([
      { label: 'Max HP', value: '+15' },
      { label: 'Pickup Range', value: '+30' },
      { label: 'Starting Damage', value: '+2' },
    ]);
  });

  test('lists all 7 weapons with accurate optional base stats and mapped signature/branch upgrades', () => {
    const weapons = getCodexWeaponEntries();
    expect(weapons.map((w) => w.id)).toEqual(WEAPON_LIST.map((w) => w.id));

    const arcBolt = weapons.find((w) => w.id === 'arc-bolt')!;
    expect(arcBolt.baseStats.map((s) => s.label)).toEqual([
      'Damage',
      'Cooldown',
      'Speed',
      'Range',
      'Radius',
      'Pattern',
    ]);
    expect(arcBolt.signatureUpgrades.map((u) => u.title)).toEqual(['Volt Volley']);
    expect(arcBolt.branchUpgrades.map((u) => u.title)).toEqual(['Lanebreaker']);
    expect(arcBolt.branchUpgrades[0].prerequisiteLabel).toBe('Requires Volt Volley');

    const emberLance = weapons.find((w) => w.id === 'ember-lance')!;
    expect(emberLance.signatureUpgrades.map((u) => u.title)).toEqual(['Sundering Tip']);
    expect(emberLance.branchUpgrades).toEqual([]);

    const shatterbell = weapons.find((w) => w.id === 'shatterbell')!;
    expect(shatterbell.baseStats.map((s) => s.label)).toContain('Blast Radius');
    expect(shatterbell.baseStats.map((s) => s.label)).toContain('Blast Damage');
    expect(shatterbell.branchUpgrades).toEqual([]);

    // Confirm no signature or branch upgrade from UPGRADE_POOL is left unmapped
    const mappedUpgradeIds = new Set(
      weapons.flatMap((w) => [...w.signatureUpgrades, ...w.branchUpgrades].map((u) => u.id)),
    );
    const poolWeaponUpgradeIds = UPGRADE_POOL.filter(
      (u) => u.kind === 'signature' || u.kind === 'branch',
    ).map((u) => u.id);
    expect(Array.from(mappedUpgradeIds).sort()).toEqual([...poolWeaponUpgradeIds].sort());
  });

  test('lists all 11 enemies ordered Regular (7) -> Elite (2) -> Miniboss (1) -> Boss (1) with verified stats', () => {
    const enemies = getCodexEnemyEntries();
    expect(enemies).toHaveLength(11);
    expect(enemies.slice(0, 7).every((e) => e.tier === 'Regular')).toBe(true);
    expect(enemies.slice(7, 9).map((e) => [e.id, e.tier])).toEqual([
      ['overlord', 'Elite'],
      ['riftblade', 'Elite'],
    ]);
    expect([enemies[9].id, enemies[9].tier]).toEqual(['dreadnought', 'Miniboss']);
    expect([enemies[10].id, enemies[10].tier]).toEqual(['behemoth', 'Boss']);

    const dreadnought = enemies[9];
    expect(dreadnought.baseStats).toEqual([
      { label: 'Base HP', value: `${ENEMY_ARCHETYPES.dreadnought.maxHealth}` },
      { label: 'Base Speed', value: `${ENEMY_ARCHETYPES.dreadnought.speed}` },
      { label: 'Contact DMG', value: `${ENEMY_ARCHETYPES.dreadnought.contactDamage}` },
      { label: 'XP Value', value: `${ENEMY_ARCHETYPES.dreadnought.xpValue}` },
    ]);
    expect(dreadnought.specialStats.map((s) => s.label)).toContain('Clear Reward');
  });

  test('computes deterministic pagination slices and circular detail stepping', () => {
    const page1 = getCodexPageSlice([1, 2, 3, 4, 5, 6, 7], 0, 4);
    const page2 = getCodexPageSlice([1, 2, 3, 4, 5, 6, 7], 1, 4);
    expect(page1.items).toEqual([1, 2, 3, 4]);
    expect(page1.pageCount).toBe(2);
    expect(page2.items).toEqual([5, 6, 7]);
    expect(page2.pageIndex).toBe(1);

    expect(stepCodexIndex(0, -1, 7)).toBe(6);
    expect(stepCodexIndex(6, 1, 7)).toBe(0);
  });
});
