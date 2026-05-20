import type Phaser from 'phaser';
import {
  ENEMY_ICON_ASSET_SLOTS,
  ENEMY_SPRITE_ASSET_SLOTS,
  HERO_ICON_ASSET_SLOTS,
  HERO_SKIN_ASSET_SLOTS,
  TANK_CLASS_ICON_ASSET_SLOTS,
  UI_ICON_ASSET_SLOTS,
  WEAPON_ICON_ASSET_SLOTS,
  type UiIconAssetId,
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

export function getEnemyIconAssetSlot(enemyId: EnemyArchetypeId): VisualAssetSlot {
  return ENEMY_ICON_ASSET_SLOTS[enemyId];
}

export function getEnemySpriteAssetSlot(enemyId: EnemyArchetypeId): VisualAssetSlot {
  return ENEMY_SPRITE_ASSET_SLOTS[enemyId];
}

export function getTankClassIconAssetSlot(classId: TankClassId): VisualAssetSlot {
  return TANK_CLASS_ICON_ASSET_SLOTS[classId];
}

export function getUiIconAssetSlot(iconId: UiIconAssetId): VisualAssetSlot {
  return UI_ICON_ASSET_SLOTS[iconId];
}
