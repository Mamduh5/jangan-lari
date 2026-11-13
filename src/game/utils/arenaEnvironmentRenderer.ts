import type Phaser from 'phaser';
import type { ArenaDecorationPlacement } from '../config/arenaEnvironmentLayout';
import { shouldUseVisualAsset } from './assetResolver';

export type ArenaEnvironmentScene = Pick<Phaser.Scene, 'textures'> & {
  add: Pick<Phaser.GameObjects.GameObjectFactory, 'image'>;
};

/**
 * Renders decorative arena placements as plain static images (no physics
 * bodies). A placement is skipped when its slot is unapproved or its texture
 * failed to load, leaving the procedural arena as the fallback.
 */
export function renderArenaEnvironment(
  scene: ArenaEnvironmentScene,
  placements: readonly ArenaDecorationPlacement[],
): Phaser.GameObjects.Image[] {
  const rendered: Phaser.GameObjects.Image[] = [];

  for (const placement of placements) {
    if (!shouldUseVisualAsset(scene, placement.category, placement.key)) {
      continue;
    }

    const decoration = scene.add.image(placement.x, placement.y, placement.key);
    decoration
      .setDisplaySize(placement.displaySize, placement.displaySize)
      .setRotation(placement.rotation)
      .setFlipX(placement.flipX)
      .setAlpha(placement.alpha)
      .setDepth(placement.depth);
    if (placement.tint !== undefined) {
      decoration.setTint(placement.tint);
    }
    rendered.push(decoration);
  }

  return rendered;
}
