import type { XpGemTier } from '../systems/readabilityVisuals';

export const XP_GEM_ICON_DIAMETER_BY_TIER: Record<XpGemTier, number> = {
  small: 20,
  medium: 24,
  large: 30,
  huge: 36,
};

export function resolveXpGemIconDiameter(tier: XpGemTier): number {
  return XP_GEM_ICON_DIAMETER_BY_TIER[tier];
}
