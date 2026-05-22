import type Phaser from 'phaser';
import {
  ALL_VISUAL_ASSET_SLOTS,
  BRANCH_UPGRADE_ICON_ASSET_SLOTS,
  BUFF_STATUS_ICON_ASSET_SLOTS,
  EFFECT_SPRITE_ASSET_SLOTS,
  ENEMY_ICON_ASSET_SLOTS,
  ENEMY_SPRITE_ASSET_SLOTS,
  HERO_ICON_ASSET_SLOTS,
  HERO_SKIN_ASSET_SLOTS,
  MAP_PROP_ASSET_SLOTS,
  PICKUP_ICON_ASSET_SLOTS,
  POWER_CORE_MAP_EVENT_ICON_ASSET_SLOTS,
  PROJECTILE_SPRITE_ASSET_SLOTS,
  SIGNATURE_UPGRADE_ICON_ASSET_SLOTS,
  SKILL_ICON_ASSET_SLOTS,
  TANK_CLASS_ICON_ASSET_SLOTS,
  TILE_ASSET_SLOTS,
  UPGRADE_ICON_ASSET_SLOTS,
  UI_BUTTON_ASSET_SLOTS,
  UI_ICON_ASSET_SLOTS,
  WEAPON_ICON_ASSET_SLOTS,
  type BranchUpgradeIconAssetId,
  type BuffStatusIconAssetId,
  type EffectAssetId,
  type MapPropAssetId,
  type PickupIconAssetId,
  type PowerCoreMapEventIconAssetId,
  type ProjectileAssetId,
  type SignatureUpgradeIconAssetId,
  type SkillIconAssetId,
  type TileAssetId,
  type UiButtonAssetId,
  type UiIconAssetId,
  type UpgradeIconAssetId,
  type VisualAssetSlot,
} from '../data/assetSlots';
import {
  getVisualAssetRuntimeCategoryForSlot,
  isVisualAssetRuntimeCategoryEnabled,
  type VisualAssetRuntimeCategory,
} from '../config/visualAssetRuntimeConfig';
import type { EnemyArchetypeId } from '../data/enemies';
import type { HeroId } from '../data/heroes';
import type { TankClassId } from '../data/tankClasses';
import type { WeaponId } from '../data/weapons';

const VISUAL_ASSET_SLOT_BY_KEY = new Map<string, VisualAssetSlot>(
  ALL_VISUAL_ASSET_SLOTS.map((slot) => [slot.key, slot]),
);

export function hasTexture(scene: Pick<Phaser.Scene, 'textures'> | null | undefined, key: string | null | undefined): boolean {
  if (!scene || !key) {
    return false;
  }

  try {
    return Boolean(scene.textures.exists(key));
  } catch {
    return false;
  }
}

export function shouldUseTexture(
  scene: Pick<Phaser.Scene, 'textures'> | null | undefined,
  slot: VisualAssetSlot | null | undefined,
): slot is VisualAssetSlot {
  if (!slot) {
    return false;
  }

  return shouldUseVisualAsset(scene, getVisualAssetRuntimeCategoryForSlot(slot), slot);
}

export function getVisualAssetSlotByKey(key: string | null | undefined): VisualAssetSlot | null {
  if (!key) {
    return null;
  }

  return VISUAL_ASSET_SLOT_BY_KEY.get(key) ?? null;
}

export function hasVisualAsset(
  scene: Pick<Phaser.Scene, 'textures'> | null | undefined,
  slotKey: string | null | undefined,
): boolean {
  const slot = getVisualAssetSlotByKey(slotKey);
  return Boolean(slot && hasTexture(scene, slot.key));
}

export function shouldUseVisualAsset(
  scene: Pick<Phaser.Scene, 'textures'> | null | undefined,
  category: VisualAssetRuntimeCategory,
  slotOrKey: VisualAssetSlot | string | null | undefined,
): slotOrKey is VisualAssetSlot {
  if (!isVisualAssetRuntimeCategoryEnabled(category)) {
    return false;
  }

  const slot = typeof slotOrKey === 'string' ? getVisualAssetSlotByKey(slotOrKey) : slotOrKey;
  if (!slot || getVisualAssetRuntimeCategoryForSlot(slot) !== category) {
    return false;
  }

  return Boolean(slot && hasTexture(scene, slot.key));
}

export function getHeroIconAssetSlot(heroId: HeroId): VisualAssetSlot {
  return HERO_ICON_ASSET_SLOTS[heroId];
}

export const getHeroIconSlot = getHeroIconAssetSlot;

export function getHeroSkinAssetSlot(heroId: HeroId): VisualAssetSlot {
  return HERO_SKIN_ASSET_SLOTS[heroId];
}

export const getHeroSkinSlot = getHeroSkinAssetSlot;

export function getWeaponIconAssetSlot(weaponId: WeaponId): VisualAssetSlot {
  return WEAPON_ICON_ASSET_SLOTS[weaponId];
}

export const getWeaponIconSlot = getWeaponIconAssetSlot;

export function getProjectileSpriteAssetSlot(projectileId: ProjectileAssetId): VisualAssetSlot {
  return PROJECTILE_SPRITE_ASSET_SLOTS[projectileId];
}

export const getProjectileSpriteSlot = getProjectileSpriteAssetSlot;

export function getEnemyIconAssetSlot(enemyId: EnemyArchetypeId): VisualAssetSlot {
  return ENEMY_ICON_ASSET_SLOTS[enemyId];
}

export const getEnemyIconSlot = getEnemyIconAssetSlot;

export function getEnemySpriteAssetSlot(enemyId: EnemyArchetypeId): VisualAssetSlot {
  return ENEMY_SPRITE_ASSET_SLOTS[enemyId];
}

export const getEnemySpriteSlot = getEnemySpriteAssetSlot;

export function getPickupIconAssetSlot(pickupId: PickupIconAssetId): VisualAssetSlot {
  return PICKUP_ICON_ASSET_SLOTS[pickupId];
}

export const getPickupIconSlot = getPickupIconAssetSlot;

export function getEffectSpriteAssetSlot(effectId: EffectAssetId): VisualAssetSlot {
  return EFFECT_SPRITE_ASSET_SLOTS[effectId];
}

export const getEffectSpriteSlot = getEffectSpriteAssetSlot;

export function getMapPropAssetSlot(propId: MapPropAssetId): VisualAssetSlot {
  return MAP_PROP_ASSET_SLOTS[propId];
}

export const getMapPropSlot = getMapPropAssetSlot;

export function getTileAssetSlot(tileId: TileAssetId): VisualAssetSlot {
  return TILE_ASSET_SLOTS[tileId];
}

export const getTileSlot = getTileAssetSlot;

export function getTankClassIconAssetSlot(classId: TankClassId): VisualAssetSlot {
  return TANK_CLASS_ICON_ASSET_SLOTS[classId];
}

export const getTankClassIconSlot = getTankClassIconAssetSlot;

export function getUpgradeIconAssetSlot(upgradeId: UpgradeIconAssetId): VisualAssetSlot {
  return UPGRADE_ICON_ASSET_SLOTS[upgradeId];
}

export const getUpgradeIconSlot = getUpgradeIconAssetSlot;

export function getSignatureUpgradeIconAssetSlot(upgradeId: SignatureUpgradeIconAssetId): VisualAssetSlot {
  return SIGNATURE_UPGRADE_ICON_ASSET_SLOTS[upgradeId];
}

export const getSignatureUpgradeIconSlot = getSignatureUpgradeIconAssetSlot;

export function getBranchUpgradeIconAssetSlot(upgradeId: BranchUpgradeIconAssetId): VisualAssetSlot {
  return BRANCH_UPGRADE_ICON_ASSET_SLOTS[upgradeId];
}

export const getBranchUpgradeIconSlot = getBranchUpgradeIconAssetSlot;

export function getSkillIconAssetSlot(skillId: SkillIconAssetId): VisualAssetSlot {
  return SKILL_ICON_ASSET_SLOTS[skillId];
}

export const getSkillIconSlot = getSkillIconAssetSlot;

export function getBuffStatusIconAssetSlot(buffId: BuffStatusIconAssetId): VisualAssetSlot {
  return BUFF_STATUS_ICON_ASSET_SLOTS[buffId];
}

export const getBuffStatusIconSlot = getBuffStatusIconAssetSlot;

export function getPowerCoreMapEventIconAssetSlot(eventId: PowerCoreMapEventIconAssetId): VisualAssetSlot {
  return POWER_CORE_MAP_EVENT_ICON_ASSET_SLOTS[eventId];
}

export const getPowerCoreMapEventIconSlot = getPowerCoreMapEventIconAssetSlot;

export function getUiIconAssetSlot(iconId: UiIconAssetId): VisualAssetSlot {
  return UI_ICON_ASSET_SLOTS[iconId];
}

export const getUiIconSlot = getUiIconAssetSlot;

export function getUiButtonAssetSlot(buttonId: UiButtonAssetId): VisualAssetSlot {
  return UI_BUTTON_ASSET_SLOTS[buttonId];
}

export const getUiButtonSlot = getUiButtonAssetSlot;
