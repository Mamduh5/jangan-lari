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
  scuttler: { displaySize: 36, flipsWithMovement: true },
  skimmer: { displaySize: 40, flipsWithMovement: false }, // near-symmetric blob
  harrier: { displaySize: 38, flipsWithMovement: true }, // beak right, tail left
  mauler: { displaySize: 36, flipsWithMovement: true }, // eye and face toward the right
  crusher: { displaySize: 42, flipsWithMovement: false }, // wide symmetric slab
  bulwark: { displaySize: 46, flipsWithMovement: false }, // front-facing shield
  hexcaster: { displaySize: 36, flipsWithMovement: false }, // front-facing orb
  overlord: { displaySize: 62, flipsWithMovement: false }, // upright, near-frontal blob
  riftblade: { displaySize: 56, flipsWithMovement: true }, // eye/face right
  dreadnought: { displaySize: 84, flipsWithMovement: true }, // face right
  behemoth: { displaySize: 112, flipsWithMovement: true }, // face right
};

export function getUprightEnemySpritePresentation(id: EnemyArchetypeId): EnemySpritePresentation | null {
  return Object.prototype.hasOwnProperty.call(UPRIGHT_ENEMY_SPRITE_PRESENTATION, id)
    ? UPRIGHT_ENEMY_SPRITE_PRESENTATION[id] ?? null
    : null;
}
