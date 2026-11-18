import type { EnemyArchetypeId } from './enemies';

/**
 * Decorative-only presentation for individually approved, upright enemy sprites.
 * `displaySize` is in game units and is independent of ENEMY_ARCHETYPES physics sizes.
 * `flipsWithMovement` is only true for art with a meaningful left/right orientation.
 */
export interface EnemySpritePresentation {
  readonly displaySize: number;
  readonly flipsWithMovement: boolean;
}

export const UPRIGHT_ENEMY_SPRITE_PRESENTATION: Readonly<Partial<Record<EnemyArchetypeId, EnemySpritePresentation>>> = {
  scuttler: { displaySize: 52, flipsWithMovement: true }, // low wide 4-legged bug
  skimmer: { displaySize: 60, flipsWithMovement: false }, // winged floater
  harrier: { displaySize: 58, flipsWithMovement: true }, // beak right, forked tail left
  mauler: { displaySize: 54, flipsWithMovement: true }, // heavy squared shoulders, face right
  crusher: { displaySize: 66, flipsWithMovement: false }, // wide horizontal armored ram
  bulwark: { displaySize: 68, flipsWithMovement: false }, // tall fortress shield blocker
  hexcaster: { displaySize: 56, flipsWithMovement: false }, // slim upright arcane caster
  overlord: { displaySize: 88, flipsWithMovement: false }, // crowned heavy elite
  riftblade: { displaySize: 78, flipsWithMovement: true }, // bladed tall elite, face right
  dreadnought: { displaySize: 112, flipsWithMovement: true }, // armored miniboss, face right
  behemoth: { displaySize: 138, flipsWithMovement: true }, // king boss, face right
};

export function getUprightEnemySpritePresentation(id: EnemyArchetypeId): EnemySpritePresentation | null {
  return Object.prototype.hasOwnProperty.call(UPRIGHT_ENEMY_SPRITE_PRESENTATION, id)
    ? UPRIGHT_ENEMY_SPRITE_PRESENTATION[id] ?? null
    : null;
}
