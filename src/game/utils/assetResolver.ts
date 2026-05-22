import type Phaser from 'phaser';
import {
  BRANCH_UPGRADE_ICON_ASSET_SLOTS,
  EFFECT_SPRITE_ASSET_SLOTS,
  ENEMY_ICON_ASSET_SLOTS,
  ENEMY_SPRITE_ASSET_SLOTS,
  HERO_ICON_ASSET_SLOTS,
  HERO_SKIN_ASSET_SLOTS,
  MAP_PROP_ASSET_SLOTS,
  PICKUP_ICON_ASSET_SLOTS,
  PROJECTILE_SPRITE_ASSET_SLOTS,
  SIGNATURE_UPGRADE_ICON_ASSET_SLOTS,
  TANK_CLASS_ICON_ASSET_SLOTS,
  TILE_ASSET_SLOTS,
  UPGRADE_ICON_ASSET_SLOTS,
  UI_BUTTON_ASSET_SLOTS,
  UI_ICON_ASSET_SLOTS,
  WEAPON_ICON_ASSET_SLOTS,
  type BranchUpgradeIconAssetId,
  type EffectAssetId,
  type MapPropAssetId,
  type PickupIconAssetId,
  type ProjectileAssetId,
  type SignatureUpgradeIconAssetId,
  type TileAssetId,
  type UiButtonAssetId,
  type UiIconAssetId,
  type UpgradeIconAssetId,
  type VisualAssetSlot,
} from '../data/assetSlots';
import type { EnemyArchetypeId } from '../data/enemies';
import type { HeroId } from '../data/heroes';
import type { TankClassId } from '../data/tankClasses';
import type { WeaponId } from '../data/weapons';

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
  return Boolean(slot && hasTexture(scene, slot.key));
}

export function getHeroIconAssetSlot(heroId: HeroId): VisualAssetSlot {
  return HERO_ICON_ASSET_SLOTS[heroId];
}

export function getHeroSkinAssetSlot(heroId: HeroId): VisualAssetSlot {
  return HERO_SKIN_ASSET_SLOTS[heroId];
}

export function getWeaponIconAssetSlot(weaponId: WeaponId): VisualAssetSlot {
  return WEAPON_ICON_ASSET_SLOTS[weaponId];
}

export function getProjectileSpriteAssetSlot(projectileId: ProjectileAssetId): VisualAssetSlot {
  return PROJECTILE_SPRITE_ASSET_SLOTS[projectileId];
}

export function getEnemyIconAssetSlot(enemyId: EnemyArchetypeId): VisualAssetSlot {
  return ENEMY_ICON_ASSET_SLOTS[enemyId];
}

export function getEnemySpriteAssetSlot(enemyId: EnemyArchetypeId): VisualAssetSlot {
  return ENEMY_SPRITE_ASSET_SLOTS[enemyId];
}

export function getPickupIconAssetSlot(pickupId: PickupIconAssetId): VisualAssetSlot {
  return PICKUP_ICON_ASSET_SLOTS[pickupId];
}

export function getEffectSpriteAssetSlot(effectId: EffectAssetId): VisualAssetSlot {
  return EFFECT_SPRITE_ASSET_SLOTS[effectId];
}

export function getMapPropAssetSlot(propId: MapPropAssetId): VisualAssetSlot {
  return MAP_PROP_ASSET_SLOTS[propId];
}

export function getTileAssetSlot(tileId: TileAssetId): VisualAssetSlot {
  return TILE_ASSET_SLOTS[tileId];
}

export function getTankClassIconAssetSlot(classId: TankClassId): VisualAssetSlot {
  return TANK_CLASS_ICON_ASSET_SLOTS[classId];
}

export function getUpgradeIconAssetSlot(upgradeId: UpgradeIconAssetId): VisualAssetSlot {
  return UPGRADE_ICON_ASSET_SLOTS[upgradeId];
}

export function getSignatureUpgradeIconAssetSlot(upgradeId: SignatureUpgradeIconAssetId): VisualAssetSlot {
  return SIGNATURE_UPGRADE_ICON_ASSET_SLOTS[upgradeId];
}

export function getBranchUpgradeIconAssetSlot(upgradeId: BranchUpgradeIconAssetId): VisualAssetSlot {
  return BRANCH_UPGRADE_ICON_ASSET_SLOTS[upgradeId];
}

export function getUiIconAssetSlot(iconId: UiIconAssetId): VisualAssetSlot {
  return UI_ICON_ASSET_SLOTS[iconId];
}

export function getUiButtonAssetSlot(buttonId: UiButtonAssetId): VisualAssetSlot {
  return UI_BUTTON_ASSET_SLOTS[buttonId];
}
