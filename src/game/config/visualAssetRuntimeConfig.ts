import type { VisualAssetKind, VisualAssetSlot } from '../data/assetSlots';

export type VisualAssetRuntimeCategory =
  | 'heroMenuIcons'
  | 'heroSkins'
  | 'weaponHudIcons'
  | 'projectileSprites'
  | 'enemySprites'
  | 'enemyIcons'
  | 'bossSprites'
  | 'minibossSprites'
  | 'pickupIcons'
  | 'effectSprites'
  | 'mapProps'
  | 'tiles'
  | 'upgradeIcons'
  | 'signatureUpgradeIcons'
  | 'branchUpgradeIcons'
  | 'skillIcons'
  | 'buffStatusIcons'
  | 'powerCoreMapEventIcons'
  | 'tankClassIcons'
  | 'uiButtons'
  | 'uiIcons';

export const VISUAL_ASSET_RUNTIME_CONFIG: Record<VisualAssetRuntimeCategory, boolean> = {
  heroMenuIcons: true,
  weaponHudIcons: true,
  heroSkins: false,
  projectileSprites: false,
  enemySprites: false,
  enemyIcons: false,
  bossSprites: false,
  minibossSprites: false,
  pickupIcons: true,
  effectSprites: true,
  mapProps: false,
  tiles: false,
  upgradeIcons: false,
  signatureUpgradeIcons: false,
  branchUpgradeIcons: false,
  skillIcons: false,
  buffStatusIcons: false,
  powerCoreMapEventIcons: false,
  tankClassIcons: false,
  uiButtons: true,
  uiIcons: true,
};

export function isVisualAssetRuntimeCategoryEnabled(category: VisualAssetRuntimeCategory): boolean {
  return VISUAL_ASSET_RUNTIME_CONFIG[category] === true;
}

export function getVisualAssetRuntimeCategoryForKind(
  kind: VisualAssetKind,
  slot?: Pick<VisualAssetSlot, 'key' | 'kind'> | null,
): VisualAssetRuntimeCategory {
  switch (kind) {
    case 'hero-icon':
      return 'heroMenuIcons';
    case 'hero-skin':
      return 'heroSkins';
    case 'weapon-icon':
      return 'weaponHudIcons';
    case 'projectile-sprite':
      return 'projectileSprites';
    case 'enemy-icon':
      return 'enemyIcons';
    case 'enemy-sprite':
      if (slot?.key.includes('miniboss')) {
        return 'minibossSprites';
      }
      if (slot?.key.includes('boss')) {
        return 'bossSprites';
      }
      return 'enemySprites';
    case 'pickup-icon':
      return 'pickupIcons';
    case 'effect-sprite':
      return 'effectSprites';
    case 'map-prop':
      return 'mapProps';
    case 'tile':
      return 'tiles';
    case 'upgrade-icon':
      return 'upgradeIcons';
    case 'signature-upgrade-icon':
      return 'signatureUpgradeIcons';
    case 'branch-upgrade-icon':
      return 'branchUpgradeIcons';
    case 'skill-icon':
      return 'skillIcons';
    case 'buff-status-icon':
      return 'buffStatusIcons';
    case 'power-core-map-event-icon':
      return 'powerCoreMapEventIcons';
    case 'tank-class-icon':
      return 'tankClassIcons';
    case 'ui-button':
      return 'uiButtons';
    case 'ui-icon':
    default:
      return 'uiIcons';
  }
}

export function getVisualAssetRuntimeCategoryForSlot(
  slot: Pick<VisualAssetSlot, 'key' | 'kind'>,
): VisualAssetRuntimeCategory {
  return getVisualAssetRuntimeCategoryForKind(slot.kind, slot);
}
