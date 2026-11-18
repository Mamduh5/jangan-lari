import type { HeroId } from './heroes';

/**
 * Decorative-only runtime presentation sizes and grounding accents for approved hero skins.
 * Independent of HeroDefinition.appearance.size and Arcade physics bodies.
 */
export interface HeroSpritePresentation {
  readonly displaySize: number;
  readonly footingRadius: number;
  readonly accentColor: number;
}

export const HERO_SPRITE_PRESENTATION: Readonly<Record<HeroId, HeroSpritePresentation>> = {
  runner: {
    displaySize: 62,
    footingRadius: 26,
    accentColor: 0x93c5fd,
  },
  vanguard: {
    displaySize: 68,
    footingRadius: 29,
    accentColor: 0xfcd34d,
  },
  shade: {
    displaySize: 64,
    footingRadius: 25,
    accentColor: 0xc4b5fd,
  },
  verdant: {
    displaySize: 64,
    footingRadius: 27,
    accentColor: 0x86efac,
  },
};

export function getHeroSpritePresentation(heroId: HeroId): HeroSpritePresentation {
  return HERO_SPRITE_PRESENTATION[heroId];
}
