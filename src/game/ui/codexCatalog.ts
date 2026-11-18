import {
  BOSS_CROSSFIRE_PROJECTILE_COUNT_PHASE_1,
  BOSS_CROSSFIRE_PROJECTILE_COUNT_PHASE_2,
  BOSS_SHOCKWAVE_RADIUS,
  BOSS_SUMMON_MAX_ACTIVE,
  MINIBOSS_LINE_STRIKE_TELEGRAPH_MS,
  MINIBOSS_VOLLEY_DAMAGE,
  MINIBOSS_VOLLEY_PROJECTILE_COUNT,
} from '../config/bossBalance';
import {
  BLOCKER_BRACE_COOLDOWN_MS,
  BLOCKER_BRACE_DURATION_MS,
  BLOCKER_BRACE_TRIGGER_DISTANCE,
  CHARGER_COOLDOWN_MS,
  CHARGER_DASH_DURATION_MS,
  CHARGER_DASH_SPEED,
  CHARGER_RECOVERY_MS,
  CHARGER_TRIGGER_DISTANCE,
  CHARGER_WINDUP_MS,
  INTERCEPT_PREDICTION_TIME_S,
} from '../config/enemyBehaviorBalance';
import { ENEMY_ARCHETYPES, type EnemyArchetype, type EnemyArchetypeId } from '../data/enemies';
import { HERO_LIST, type HeroDefinition, type HeroId } from '../data/heroes';
import { UPGRADE_POOL, type UpgradeDefinition, type UpgradeId } from '../data/upgrades';
import { WEAPON_DEFINITIONS, WEAPON_LIST, type WeaponDefinition, type WeaponId } from '../data/weapons';
import type { GameSaveData } from '../save/saveData';
import { isHeroUnlocked } from '../save/saveHeroes';

export type CodexCategoryId = 'heroes' | 'weapons' | 'enemies';

export type CodexEnemyTier = 'Regular' | 'Elite' | 'Miniboss' | 'Boss';

export const CODEX_PAGE_SIZE = 4;

export const CODEX_ENEMY_ORDER: readonly EnemyArchetypeId[] = [
  // Regular (7)
  'scuttler',
  'skimmer',
  'harrier',
  'mauler',
  'crusher',
  'bulwark',
  'hexcaster',
  // Elite (2)
  'overlord',
  'riftblade',
  // Miniboss (1)
  'dreadnought',
  // Boss (1)
  'behemoth',
];

export type CodexCategoryMeta = {
  id: CodexCategoryId;
  label: string;
  count: number;
  eyebrow: string;
  indexTitle: string;
  indexSubtitle: string;
};

export const CODEX_CATEGORIES: readonly CodexCategoryMeta[] = [
  {
    id: 'heroes',
    label: 'HEROES',
    count: HERO_LIST.length,
    eyebrow: 'HERO LIBRARY',
    indexTitle: `Heroes (${HERO_LIST.length})`,
    indexSubtitle: 'All playable runners, starting weapons, passives, and unlock status.',
  },
  {
    id: 'weapons',
    label: 'WEAPONS',
    count: WEAPON_LIST.length,
    eyebrow: 'WEAPON ARCHIVE',
    indexTitle: `Weapons (${WEAPON_LIST.length})`,
    indexSubtitle: 'All 7 run weapons with base stats and signature/branch upgrades.',
  },
  {
    id: 'enemies',
    label: 'ENEMIES',
    count: CODEX_ENEMY_ORDER.length,
    eyebrow: 'ENEMY FIELD LOG',
    indexTitle: `Enemies (${CODEX_ENEMY_ORDER.length})`,
    indexSubtitle: 'All 11 Regular, Elite, Miniboss, and Boss encounters.',
  },
];

export type CodexStatItem = {
  label: string;
  value: string;
};

export type CodexHeroEntry = {
  kind: 'heroes';
  id: HeroId;
  hero: HeroDefinition;
  name: string;
  badgeLabel: string;
  description: string;
  passiveTitle: string;
  passiveDetail: string;
  passiveLabel: string;
  startingWeaponId: WeaponId;
  startingWeaponName: string;
  statModifiers: CodexStatItem[];
  unlockChipLabel: string;
  unlockStatusText: string;
  unlocked: boolean;
  selected: boolean;
  tileSummary: string;
  tileStats: string;
};

export type CodexWeaponUpgradeEntry = {
  id: UpgradeId;
  kind: 'signature' | 'branch';
  title: string;
  description: string;
  prerequisiteLabel: string | null;
};

export type CodexWeaponEntry = {
  kind: 'weapons';
  id: WeaponId;
  weapon: WeaponDefinition;
  name: string;
  shortLabel: string;
  codexSummary: string;
  originTag: string;
  originNote: string;
  baseStats: CodexStatItem[];
  signatureUpgrades: CodexWeaponUpgradeEntry[];
  branchUpgrades: CodexWeaponUpgradeEntry[];
  tileSummary: string;
  tileStats: string;
};

export type CodexEnemyEntry = {
  kind: 'enemies';
  id: EnemyArchetypeId;
  archetype: EnemyArchetype;
  name: string;
  tier: CodexEnemyTier;
  tierUpper: string;
  roleTag: string;
  behaviorLabel: string;
  summary: string;
  mechanicsNote: string;
  baseStats: CodexStatItem[];
  specialStats: CodexStatItem[];
  scalingNote: string;
  tileSummary: string;
  tileStats: string;
};

export type CodexPageSlice<T> = {
  items: T[];
  pageIndex: number;
  pageCount: number;
  startIndex: number;
  totalCount: number;
};

export function getCodexCategoryMeta(category: CodexCategoryId): CodexCategoryMeta {
  return CODEX_CATEGORIES.find((entry) => entry.id === category) ?? CODEX_CATEGORIES[0];
}

export function getCodexPageCount(totalItems: number, pageSize = CODEX_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(totalItems / Math.max(1, pageSize)));
}

export function getCodexPageSlice<T>(
  items: readonly T[],
  requestedPageIndex: number,
  pageSize = CODEX_PAGE_SIZE,
): CodexPageSlice<T> {
  const safePageSize = Math.max(1, pageSize);
  const pageCount = getCodexPageCount(items.length, safePageSize);
  const pageIndex = Math.max(0, Math.min(requestedPageIndex, pageCount - 1));
  const startIndex = pageIndex * safePageSize;
  return {
    items: items.slice(startIndex, startIndex + safePageSize),
    pageIndex,
    pageCount,
    startIndex,
    totalCount: items.length,
  };
}

export function stepCodexIndex(currentIndex: number, delta: -1 | 1, totalCount: number): number {
  if (totalCount <= 0) {
    return 0;
  }
  return ((currentIndex + delta) % totalCount + totalCount) % totalCount;
}

function splitHeroPassiveLabel(passiveLabel: string): { title: string; detail: string } {
  const separatorIndex = passiveLabel.indexOf(':');
  if (separatorIndex === -1) {
    return { title: 'PASSIVE TRAIT', detail: passiveLabel.trim() };
  }
  const rawDetail = passiveLabel.slice(separatorIndex + 1).trim();
  const detail =
    rawDetail.length > 0 ? rawDetail.charAt(0).toUpperCase() + rawDetail.slice(1) : rawDetail;
  return {
    title: passiveLabel.slice(0, separatorIndex).trim(),
    detail,
  };
}

export function getCodexHeroEntries(saveData: GameSaveData): CodexHeroEntry[] {
  return HERO_LIST.map((hero) => {
    const weapon = WEAPON_DEFINITIONS[hero.startingWeaponId];
    const unlocked = isHeroUnlocked(saveData, hero.id);
    const selected = saveData.selectedHero === hero.id;
    const { title: passiveTitle, detail: passiveDetail } = splitHeroPassiveLabel(hero.passiveLabel);

    const statModifiers: CodexStatItem[] = [];
    const quickModParts: string[] = [];
    if (hero.maxHealthBonus > 0) {
      statModifiers.push({ label: 'Max HP', value: `+${hero.maxHealthBonus}` });
      quickModParts.push(`+${hero.maxHealthBonus} HP`);
    }
    if (hero.moveSpeedBonus > 0) {
      statModifiers.push({ label: 'Move Speed', value: `+${hero.moveSpeedBonus}` });
      quickModParts.push(`+${hero.moveSpeedBonus} SPD`);
    }
    if (hero.pickupRangeBonus > 0) {
      statModifiers.push({ label: 'Pickup Range', value: `+${hero.pickupRangeBonus}` });
      quickModParts.push(`+${hero.pickupRangeBonus} Pickup`);
    }
    if (hero.startingDamageBonus > 0) {
      statModifiers.push({ label: 'Starting Damage', value: `+${hero.startingDamageBonus}` });
      quickModParts.push(`+${hero.startingDamageBonus} DMG`);
    }
    if (hero.fireCooldownReductionMs > 0) {
      statModifiers.push({ label: 'Cooldown Reduction', value: `-${hero.fireCooldownReductionMs} ms` });
      quickModParts.push(`-${hero.fireCooldownReductionMs} ms CD`);
    }

    const unlockChipLabel = selected
      ? 'SELECTED'
      : unlocked
        ? hero.unlockCost
          ? 'UNLOCKED'
          : 'STARTER'
        : `LOCKED · ${hero.unlockCost ?? 0}G`;

    const unlockStatusText = selected
      ? hero.unlockCost
        ? `Unlocked & Selected (${hero.unlockCost}g)`
        : 'Unlocked Starter (Selected)'
      : unlocked
        ? hero.unlockCost
          ? `Unlocked (${hero.unlockCost}g)`
          : 'Unlocked Starter'
        : `Locked (${hero.unlockCost ?? 0}g to unlock)`;

    const quickStatParts = [weapon.name, ...quickModParts];

    return {
      kind: 'heroes',
      id: hero.id,
      hero,
      name: hero.name,
      badgeLabel: hero.name.slice(0, 2).toUpperCase(),
      description: hero.description,
      passiveTitle,
      passiveDetail,
      passiveLabel: hero.passiveLabel,
      startingWeaponId: hero.startingWeaponId,
      startingWeaponName: weapon.name,
      statModifiers,
      unlockChipLabel,
      unlockStatusText,
      unlocked,
      selected,
      tileSummary: hero.description,
      tileStats: quickStatParts.slice(0, 3).join(' · '),
    };
  });
}

function getUpgradeTitleById(upgradeId: UpgradeId): string {
  const match = UPGRADE_POOL.find((entry) => entry.id === upgradeId);
  return match ? match.title : upgradeId;
}

function buildWeaponUpgradeEntry(upgrade: UpgradeDefinition): CodexWeaponUpgradeEntry {
  const kind = upgrade.kind === 'branch' ? 'branch' : 'signature';
  const reqTitles = (upgrade.requiresUpgradeIds ?? []).map((id) => getUpgradeTitleById(id));
  return {
    id: upgrade.id,
    kind,
    title: upgrade.title,
    description: upgrade.description,
    prerequisiteLabel: reqTitles.length > 0 ? `Requires ${reqTitles.join(' + ')}` : null,
  };
}

export function getCodexWeaponEntries(): CodexWeaponEntry[] {
  return WEAPON_LIST.map((weapon) => {
    const starterHero = HERO_LIST.find((hero) => hero.startingWeaponId === weapon.id);
    const originTag = starterHero ? `STARTER · ${starterHero.name.toUpperCase()}` : 'RUN UNLOCK';
    const originNote = starterHero
      ? `Starting weapon for ${starterHero.name}.`
      : 'Unlocked mid-run from the Weapon Unlock level-up pool.';

    const baseStats: CodexStatItem[] = [
      { label: 'Damage', value: `${weapon.damage}` },
      { label: 'Cooldown', value: `${weapon.fireCooldownMs} ms` },
      { label: 'Speed', value: `${weapon.projectileSpeed}` },
      { label: 'Range', value: `${weapon.range}` },
      { label: 'Radius', value: `${weapon.projectileRadius}` },
      { label: 'Pattern', value: weapon.firePattern === 'radial' ? 'Radial' : 'Targeted' },
    ];

    if (weapon.burstCount !== undefined) {
      baseStats.push({ label: 'Burst', value: `${weapon.burstCount}` });
    }
    if (weapon.spreadDegrees !== undefined) {
      baseStats.push({ label: 'Spread', value: `${weapon.spreadDegrees} deg` });
    }
    if (weapon.pierceCount !== undefined) {
      baseStats.push({ label: 'Pierce', value: `${weapon.pierceCount}` });
    }
    if (weapon.radialCount !== undefined) {
      baseStats.push({ label: 'Radial Bolts', value: `${weapon.radialCount}` });
    }
    if (weapon.explosionRadius !== undefined) {
      baseStats.push({ label: 'Blast Radius', value: `${weapon.explosionRadius}` });
    }
    if (weapon.explosionDamageMultiplier !== undefined) {
      baseStats.push({
        label: 'Blast Damage',
        value: `${Math.round(weapon.explosionDamageMultiplier * 100)}%`,
      });
    }

    const signatureUpgrades = UPGRADE_POOL.filter(
      (upgrade) => upgrade.kind === 'signature' && upgrade.requiresWeaponId === weapon.id,
    ).map(buildWeaponUpgradeEntry);

    const branchUpgrades = UPGRADE_POOL.filter(
      (upgrade) => upgrade.kind === 'branch' && upgrade.requiresWeaponId === weapon.id,
    ).map(buildWeaponUpgradeEntry);

    const upgradeTag =
      branchUpgrades.length > 0 ? 'Sig + Branch' : signatureUpgrades.length > 0 ? 'Signature' : 'Base';
    const tileStats = `${weapon.damage} DMG · ${weapon.fireCooldownMs} ms · ${upgradeTag}`;

    return {
      kind: 'weapons',
      id: weapon.id,
      weapon,
      name: weapon.name,
      shortLabel: weapon.shortLabel,
      codexSummary: weapon.codexSummary,
      originTag,
      originNote,
      baseStats,
      signatureUpgrades,
      branchUpgrades,
      tileSummary: weapon.codexSummary,
      tileStats,
    };
  });
}

function getEnemyTier(archetype: EnemyArchetype): CodexEnemyTier {
  if (archetype.isBoss) {
    return 'Boss';
  }
  if (archetype.isMiniboss) {
    return 'Miniboss';
  }
  if (archetype.isElite) {
    return 'Elite';
  }
  return 'Regular';
}

function getEnemyBehaviorDisplay(archetype: EnemyArchetype): string {
  switch (archetype.behavior) {
    case 'chase':
      return 'Direct Chase';
    case 'intercept':
      return 'Route Intercept';
    case 'blocker':
      return 'Lane Blocker';
    case 'charger':
      return 'Telegraphed Charger';
    case 'ranged':
      return 'Ranged Kiter';
    case 'dash':
      return archetype.isMiniboss
        ? 'Line Charge & Volley'
        : archetype.isBoss
          ? 'Boss Dash & Waves'
          : 'Surge Dash';
    case 'strafe':
      return 'Strafing Skirmisher';
  }
}

function getEnemyCopy(archetype: EnemyArchetype): { summary: string; mechanicsNote: string } {
  switch (archetype.id) {
    case 'scuttler':
      return {
        summary: 'Fast swarm unit that closes directly toward your position.',
        mechanicsNote: `Pursues along a direct vector (${archetype.speed} base speed). Low HP makes early packs clean XP.`,
      };
    case 'skimmer':
      return {
        summary: 'Interceptor that predicts your movement path to cut off escape routes.',
        mechanicsNote: `Leads runner motion ~${INTERCEPT_PREDICTION_TIME_S}s ahead with light lateral weave (preferred dist ${archetype.preferredDistance ?? 72} px).`,
      };
    case 'harrier':
      return {
        summary: 'High-speed interceptor built to punish straight-line running.',
        mechanicsNote: `Moves at ${archetype.speed} base speed and predicts forward velocity to close off open lanes (preferred dist ${archetype.preferredDistance ?? 64} px).`,
      };
    case 'mauler':
      return {
        summary: 'Heavy blocker that marches in and anchors down inside medium range.',
        mechanicsNote: `Locks velocity to brace for ${BLOCKER_BRACE_DURATION_MS} ms when within ${BLOCKER_BRACE_TRIGGER_DISTANCE} px (${BLOCKER_BRACE_COOLDOWN_MS} ms cooldown).`,
      };
    case 'crusher':
      return {
        summary: 'Telegraphed charger that freezes briefly before lunging forward.',
        mechanicsNote: `Within ${CHARGER_TRIGGER_DISTANCE} px, warns for ${CHARGER_WINDUP_MS} ms, dashes at ${CHARGER_DASH_SPEED} px/s for ${CHARGER_DASH_DURATION_MS} ms, then recovers (${CHARGER_RECOVERY_MS} ms, ${CHARGER_COOLDOWN_MS} ms cooldown).`,
      };
    case 'bulwark':
      return {
        summary: 'Armored wall unit with thick HP that anchors lanes to shield backline units.',
        mechanicsNote: `High ${archetype.maxHealth} base HP and ${archetype.contactDamage} contact damage. Braces for ${BLOCKER_BRACE_DURATION_MS} ms inside ${BLOCKER_BRACE_TRIGGER_DISTANCE} px.`,
      };
    case 'hexcaster':
      return {
        summary: 'Ranged strafer that maintains distance and fires energy projectiles.',
        mechanicsNote: `Strafes around ${archetype.preferredDistance ?? 360} px and fires ${archetype.shotDamage ?? 16} DMG bolts at ${archetype.shotSpeed ?? 350} px/s every ${archetype.shotCooldownMs ?? 1650} ms.`,
      };
    case 'overlord':
      return {
        summary: 'Armored elite charger that pressures positioning with heavy surging dashes.',
        mechanicsNote: `Dashes at ${archetype.dashSpeedMultiplier ?? 2.45}x speed for ${archetype.dashDurationMs ?? 390} ms every ${archetype.dashCooldownMs ?? 1300} ms. Drops ${archetype.rewardGold ?? 0}g and +${archetype.rewardLevelUps ?? 0} level-up.`,
      };
    case 'riftblade':
      return {
        summary: 'Fast-moving elite stalker with rapid cooldown surges across mid-range.',
        mechanicsNote: `${archetype.speed} base speed with ${archetype.dashSpeedMultiplier ?? 2.75}x dashes for ${archetype.dashDurationMs ?? 280} ms every ${archetype.dashCooldownMs ?? 1100} ms. Drops ${archetype.rewardGold ?? 0}g and +${archetype.rewardLevelUps ?? 0} level-up.`,
      };
    case 'dreadnought':
      return {
        summary: 'Mid-run miniboss combining telegraphed line charges with 5-shot volleys.',
        mechanicsNote: `Telegraphs ${MINIBOSS_LINE_STRIKE_TELEGRAPH_MS} ms before wide line charges and fires ${MINIBOSS_VOLLEY_PROJECTILE_COUNT}-bolt volleys (${MINIBOSS_VOLLEY_DAMAGE} DMG). Rewards ${archetype.rewardGold ?? 0}g and +${archetype.rewardLevelUps ?? 0} level-up.`,
      };
    case 'behemoth':
      return {
        summary: 'Final run boss pairing dashes with shockwave rings, crossfire, and summons.',
        mechanicsNote: `Cycles dashes, ${BOSS_SHOCKWAVE_RADIUS} px shockwave rings, ${BOSS_CROSSFIRE_PROJECTILE_COUNT_PHASE_1}/${BOSS_CROSSFIRE_PROJECTILE_COUNT_PHASE_2}-shot crossfire, and up to ${BOSS_SUMMON_MAX_ACTIVE} summons. Accelerates in Phase 2 (<50% HP).`,
      };
  }
}

export function getCodexEnemyEntries(): CodexEnemyEntry[] {
  return CODEX_ENEMY_ORDER.map((id) => {
    const archetype = ENEMY_ARCHETYPES[id];
    const tier = getEnemyTier(archetype);
    const tierUpper = tier.toUpperCase();
    const primaryRole = (archetype.roles ?? []).find((r) => r !== 'elite');
    const roleTag =
      tier === 'Boss'
        ? 'FINAL BOSS'
        : tier === 'Miniboss'
          ? 'MINIBOSS'
          : tier === 'Elite'
            ? primaryRole
              ? `ELITE · ${primaryRole.toUpperCase()}`
              : 'ELITE'
            : primaryRole
              ? primaryRole.toUpperCase()
              : 'REGULAR';
    const { summary, mechanicsNote } = getEnemyCopy(archetype);

    const baseStats: CodexStatItem[] = [
      { label: 'Base HP', value: `${archetype.maxHealth}` },
      { label: 'Base Speed', value: `${archetype.speed}` },
      { label: 'Contact DMG', value: `${archetype.contactDamage}` },
      { label: 'XP Value', value: `${archetype.xpValue}` },
    ];

    const specialStats: CodexStatItem[] = [];
    if (archetype.shotDamage !== undefined && archetype.shotCooldownMs !== undefined) {
      specialStats.push({
        label: 'Projectile',
        value: `${archetype.shotDamage} DMG / ${archetype.shotCooldownMs} ms`,
      });
    }
    if (archetype.dashSpeedMultiplier !== undefined && archetype.dashDurationMs !== undefined) {
      specialStats.push({
        label: 'Surge Dash',
        value: `${archetype.dashSpeedMultiplier}x · ${archetype.dashDurationMs} ms`,
      });
    }
    if (archetype.rewardGold !== undefined || archetype.rewardLevelUps !== undefined) {
      const rewardParts: string[] = [];
      if (archetype.rewardGold) {
        rewardParts.push(`+${archetype.rewardGold}g`);
      }
      if (archetype.rewardLevelUps) {
        rewardParts.push(`+${archetype.rewardLevelUps} level-up`);
      }
      specialStats.push({ label: 'Clear Reward', value: rewardParts.join(' · ') });
    }

    return {
      kind: 'enemies',
      id,
      archetype,
      name: archetype.name,
      tier,
      tierUpper,
      roleTag,
      behaviorLabel: getEnemyBehaviorDisplay(archetype),
      summary,
      mechanicsNote,
      baseStats,
      specialStats,
      scalingNote: 'Base values shown; enemy HP, speed, and damage scale over run time.',
      tileSummary: summary,
      tileStats: `HP ${archetype.maxHealth} · SPD ${archetype.speed} · DMG ${archetype.contactDamage}`,
    };
  });
}
