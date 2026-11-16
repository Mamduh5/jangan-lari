import Phaser from 'phaser';
import { CAMERA_OVERSCROLL_PADDING_X, CAMERA_OVERSCROLL_PADDING_Y, WORLD_HEIGHT, WORLD_WIDTH } from '../config/worldBalance';
import { shouldUseVisualAsset } from '../utils/assetResolver';
import {
  BUSHES,
  CLEARING_BLOB,
  CLEARING_CROWN,
  CLEARING_SPIRAL,
  CLOUDS,
  DIRT_PATHS,
  DRIPS,
  EDGE_PEBBLES,
  FLOWERS,
  GROUND_PATCHES,
  LANDMARKS,
  PEBBLES,
  SPARKLES,
  TUFTS,
  WORLD_COLORS as C,
  type Landmark,
} from './worldMapDecor';
import { ROCK_CLUSTERS, WORLD_OUTLINE, type Point } from './worldMap';

/**
 * R3F-D world presentation. The static terrain (void, island, regions, paths,
 * doodles, landmarks) is drawn once into a Graphics object and baked into a few
 * half-resolution render textures so it costs almost nothing per frame on mobile.
 * Rocks, bushes and the pebble rim are plain sprites reusing the committed
 * prop/tile art. All of it sits at negative depth, below gameplay.
 */

export const WORLD_RENDER_DEPTH = {
  voidBackdrop: -60,
  terrain: -40,
  edgePebbles: -30,
  bushes: -22,
  rocks: -20,
} as const;

const BAKE_SCALE = 0.5;
const BAKE_CHUNK = 1300;
const BAKE_OVERLAP = 6;
const OUTLINE_WIDTH = 10;

const toPoints = (points: ReadonlyArray<Point>): Point[] => points.map((point) => ({ x: point.x, y: point.y }));

export function renderWorldMap(scene: Phaser.Scene): void {
  const useRockSprite = shouldUseVisualAsset(scene, 'mapProps', 'prop-wobbly-rock');
  const useBushSprite = shouldUseVisualAsset(scene, 'mapProps', 'prop-soft-bush');
  const usePebbleSprite = shouldUseVisualAsset(scene, 'tiles', 'tile-boundary-pebble');

  scene.add
    .rectangle(
      -CAMERA_OVERSCROLL_PADDING_X,
      -CAMERA_OVERSCROLL_PADDING_Y,
      WORLD_WIDTH + CAMERA_OVERSCROLL_PADDING_X * 2,
      WORLD_HEIGHT + CAMERA_OVERSCROLL_PADDING_Y * 2,
      C.void,
    )
    .setOrigin(0, 0)
    .setDepth(WORLD_RENDER_DEPTH.voidBackdrop);

  const graphics = scene.make.graphics({}, false);
  drawTerrain(graphics, { rocks: !useRockSprite, bushes: !useBushSprite, pebbles: !usePebbleSprite });
  bakeOrAdd(scene, graphics);

  if (usePebbleSprite) {
    for (const pebble of EDGE_PEBBLES) {
      scene.add
        .image(pebble.x, pebble.y, 'tile-boundary-pebble')
        .setDisplaySize(150, 150)
        .setRotation(pebble.rotation)
        .setFlipX(pebble.flipX)
        .setDepth(WORLD_RENDER_DEPTH.edgePebbles);
    }
  }

  if (useBushSprite) {
    for (const bush of BUSHES) {
      scene.add
        .image(bush.x, bush.y, 'prop-soft-bush')
        .setDisplaySize(bush.size, bush.size)
        .setFlipX(bush.flipX)
        .setDepth(WORLD_RENDER_DEPTH.bushes);
    }
  }

  if (useRockSprite) {
    for (const cluster of ROCK_CLUSTERS) {
      for (const member of cluster.members) {
        scene.add
          .image(member.x, member.y, 'prop-wobbly-rock')
          .setDisplaySize(member.size, member.size)
          .setFlipX(member.flipX)
          .setTint(C.rockTint)
          .setDepth(WORLD_RENDER_DEPTH.rocks);
      }
    }
  }
}

function bakeOrAdd(scene: Phaser.Scene, graphics: Phaser.GameObjects.Graphics): void {
  try {
    const columns = Math.ceil(WORLD_WIDTH / BAKE_CHUNK);
    const rows = Math.ceil(WORLD_HEIGHT / BAKE_CHUNK);
    const size = Math.ceil((BAKE_CHUNK + BAKE_OVERLAP * 2) * BAKE_SCALE);

    graphics.setScale(BAKE_SCALE);
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const worldX = column * BAKE_CHUNK - BAKE_OVERLAP;
        const worldY = row * BAKE_CHUNK - BAKE_OVERLAP;
        const texture = scene.add
          .renderTexture(worldX, worldY, size, size)
          .setOrigin(0, 0)
          .setScale(1 / BAKE_SCALE)
          .setDepth(WORLD_RENDER_DEPTH.terrain);
        texture.draw(graphics, -worldX * BAKE_SCALE, -worldY * BAKE_SCALE);
      }
    }
    graphics.destroy();
  } catch {
    // Baking is an optimisation: fall back to drawing the terrain live.
    graphics.setScale(1).setPosition(0, 0).setDepth(WORLD_RENDER_DEPTH.terrain);
    scene.add.existing(graphics);
  }
}

interface FallbackFlags {
  rocks: boolean;
  bushes: boolean;
  pebbles: boolean;
}

function drawTerrain(g: Phaser.GameObjects.Graphics, fallback: FallbackFlags): void {
  const outline = toPoints(WORLD_OUTLINE);

  // Void dressing: soft clouds and sparkles around the island.
  g.fillStyle(C.cloud, 0.55);
  for (const cloud of CLOUDS) {
    g.fillEllipse(cloud.x, cloud.y, cloud.rx * 2, cloud.ry * 2);
    g.fillEllipse(cloud.x + cloud.rx * 0.5, cloud.y - cloud.ry * 0.3, cloud.rx * 1.2, cloud.ry * 1.4);
  }
  g.lineStyle(4, C.sparkle, 0.8);
  for (const sparkle of SPARKLES) {
    g.lineBetween(sparkle.x - sparkle.size, sparkle.y, sparkle.x + sparkle.size, sparkle.y);
    g.lineBetween(sparkle.x, sparkle.y - sparkle.size, sparkle.x, sparkle.y + sparkle.size);
  }

  // Mossy rim and slimy drips hanging off the island.
  g.lineStyle(96, C.rim, 1);
  g.strokePoints(outline, true, true);
  for (const drip of DRIPS) {
    g.fillStyle(C.rim, 1);
    g.fillEllipse(drip.x, drip.y + drip.height / 2, drip.width, drip.height);
    g.fillCircle(drip.x, drip.y + drip.height, drip.width * 0.62);
    g.lineStyle(6, C.outline, 1);
    g.strokeEllipse(drip.x, drip.y + drip.height / 2, drip.width, drip.height);
  }

  // Island ground.
  g.fillStyle(C.grass, 1);
  g.fillPoints(outline, true, true);

  for (const patch of GROUND_PATCHES) {
    if (patch.kind === 'mud') {
      continue;
    }
    g.fillStyle(patch.kind === 'dark' ? C.grassDark : C.grassLight, 1);
    g.fillPoints(patch.points, true, true);
  }

  // Dirt paths + central clearing: darker edge pass first, then the light fill.
  for (const pass of [0, 1] as const) {
    const color = pass === 0 ? C.dirtEdge : C.dirt;
    const extra = pass === 0 ? 22 : 0;
    for (const path of DIRT_PATHS) {
      g.lineStyle(path.width + extra, color, 1);
      g.strokePoints(path.points, false, false);
      const end = path.points[path.points.length - 1];
      g.fillStyle(color, 1);
      g.fillCircle(end.x, end.y, (path.width + extra) / 2);
    }
    g.fillStyle(color, 1);
    g.fillPoints(toPoints(CLEARING_BLOB), true, true);
    if (pass === 0) {
      g.lineStyle(26, C.dirtEdge, 1);
      g.strokePoints(toPoints(CLEARING_BLOB), true, true);
    }
  }

  for (const patch of GROUND_PATCHES) {
    if (patch.kind === 'mud') {
      g.fillStyle(C.mud, 0.9);
      g.fillPoints(patch.points, true, true);
    }
  }

  // Doodles scratched into the clearing.
  g.lineStyle(6, C.doodle, 0.9);
  g.strokePoints(CLEARING_SPIRAL, false, false);
  g.strokePoints(CLEARING_CROWN, false, false);

  // Grass tufts and flowers.
  g.lineStyle(4, C.tuft, 0.9);
  for (const tuft of TUFTS) {
    const s = tuft.scale;
    g.lineBetween(tuft.x - 10 * s, tuft.y, tuft.x - 14 * s, tuft.y - 18 * s);
    g.lineBetween(tuft.x, tuft.y, tuft.x, tuft.y - 24 * s);
    g.lineBetween(tuft.x + 10 * s, tuft.y, tuft.x + 14 * s, tuft.y - 18 * s);
  }
  for (const flower of FLOWERS) {
    drawFlower(g, flower.x, flower.y, flower.color, flower.scale);
  }

  // Loose decorative pebbles (not solid).
  for (const pebble of PEBBLES) {
    g.fillStyle(C.rock, 1);
    g.fillEllipse(pebble.x, pebble.y, pebble.size * 1.5, pebble.size);
    g.lineStyle(4, C.outline, 1);
    g.strokeEllipse(pebble.x, pebble.y, pebble.size * 1.5, pebble.size);
  }

  // Island outline over the ground so the silhouette reads as a hand-drawn blob.
  g.lineStyle(OUTLINE_WIDTH, C.outline, 1);
  g.strokePoints(outline, true, true);

  for (const item of LANDMARKS) {
    drawLandmark(g, item);
  }

  if (fallback.pebbles) {
    g.fillStyle(C.rock, 1);
    g.lineStyle(5, C.outline, 1);
    for (const pebble of EDGE_PEBBLES) {
      g.fillEllipse(pebble.x, pebble.y, 70, 44);
      g.strokeEllipse(pebble.x, pebble.y, 70, 44);
    }
  }

  if (fallback.bushes) {
    for (const bush of BUSHES) {
      g.fillStyle(C.bush, 1);
      g.lineStyle(5, C.outline, 1);
      g.fillCircle(bush.x, bush.y, bush.size * 0.38);
      g.strokeCircle(bush.x, bush.y, bush.size * 0.38);
    }
  }

  if (fallback.rocks) {
    // Solid rocks must stay visible even if their sprite failed to load.
    for (const cluster of ROCK_CLUSTERS) {
      for (const member of cluster.members) {
        g.fillStyle(C.rock, 1);
        g.lineStyle(7, C.outline, 1);
        g.fillEllipse(member.x, member.y, member.size * 0.86, member.size * 0.7);
        g.strokeEllipse(member.x, member.y, member.size * 0.86, member.size * 0.7);
      }
    }
  }
}

function drawFlower(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number, scale: number): void {
  g.fillStyle(color, 1);
  g.lineStyle(3, C.outline, 1);
  for (let petal = 0; petal < 5; petal += 1) {
    const angle = (petal / 5) * Math.PI * 2;
    const px = x + Math.cos(angle) * 11 * scale;
    const py = y + Math.sin(angle) * 11 * scale;
    g.fillCircle(px, py, 8 * scale);
    g.strokeCircle(px, py, 8 * scale);
  }
  g.fillStyle(0xf2c14e, 1);
  g.fillCircle(x, y, 6 * scale);
}

function drawLandmark(g: Phaser.GameObjects.Graphics, item: Landmark): void {
  const s = item.size / 300;
  g.save();
  g.translateCanvas(item.x, item.y);
  g.rotateCanvas(item.tilt);
  g.scaleCanvas(s, s);

  // Ground shadow so stickers feel placed on the world.
  g.fillStyle(0x000000, 0.2);
  g.fillEllipse(0, 130, 240, 50);
  g.lineStyle(8, C.outline, 1);

  switch (item.kind) {
    case 'console': {
      g.fillStyle(0xb9b2c9, 1);
      g.fillRoundedRect(-150, -130, 300, 250, 34);
      g.strokeRoundedRect(-150, -130, 300, 250, 34);
      g.fillStyle(0x3b3a4a, 1);
      g.fillRoundedRect(-112, -100, 224, 130, 18);
      g.strokeRoundedRect(-112, -100, 224, 130, 18);
      g.lineStyle(7, 0xf4efe2, 1);
      g.strokePoints([{ x: -52, y: -40 }, { x: -36, y: -62 }, { x: -20, y: -40 }], false, false);
      g.strokePoints([{ x: 20, y: -40 }, { x: 36, y: -62 }, { x: 52, y: -40 }], false, false);
      g.strokePoints([{ x: -22, y: -26 }, { x: 0, y: -12 }, { x: 22, y: -26 }], false, false);
      g.lineStyle(8, C.outline, 1);
      g.fillStyle(0xf4efe2, 1);
      g.fillRect(-95, 55, 50, 16);
      g.fillRect(-78, 38, 16, 50);
      g.fillStyle(0xf59ab6, 1);
      g.fillCircle(60, 62, 14);
      g.fillCircle(92, 44, 14);
      g.strokeCircle(60, 62, 14);
      g.strokeCircle(92, 44, 14);
      g.lineBetween(-70, -130, -90, -175);
      g.lineBetween(70, -130, 90, -175);
      g.fillStyle(0xf4efe2, 1);
      g.fillEllipse(-90, -180, 44, 30);
      g.fillEllipse(90, -180, 44, 30);
      g.strokeEllipse(-90, -180, 44, 30);
      g.strokeEllipse(90, -180, 44, 30);
      break;
    }
    case 'cup': {
      const body: Point[] = [{ x: -90, y: -70 }, { x: 90, y: -70 }, { x: 68, y: 130 }, { x: -68, y: 130 }];
      g.fillStyle(0xf6b8cb, 1);
      g.fillPoints(body, true, true);
      g.strokePoints(body, true, true);
      g.fillStyle(0xfdf2f6, 1);
      g.fillEllipse(0, -72, 190, 46);
      g.strokeEllipse(0, -72, 190, 46);
      g.fillStyle(0xf2788f, 1);
      g.fillRect(28, -230, 22, 170);
      g.strokeRect(28, -230, 22, 170);
      g.strokePoints([{ x: -34, y: 10 }, { x: -22, y: 18 }, { x: -10, y: 10 }], false, false);
      g.strokePoints([{ x: 10, y: 10 }, { x: 22, y: 18 }, { x: 34, y: 10 }], false, false);
      g.strokePoints([{ x: -14, y: 40 }, { x: 0, y: 52 }, { x: 14, y: 40 }], false, false);
      break;
    }
    case 'notebook': {
      g.fillStyle(0xf6ecd0, 1);
      g.fillRoundedRect(-110, -140, 220, 270, 14);
      g.strokeRoundedRect(-110, -140, 220, 270, 14);
      for (let ring = 0; ring < 6; ring += 1) {
        g.strokeCircle(-84 + ring * 34, -140, 11);
      }
      g.lineStyle(7, 0xa08057, 1);
      g.strokeEllipse(0, 0, 80, 72);
      g.strokeEllipse(-22, -56, 22, 58);
      g.strokeEllipse(22, -56, 22, 58);
      g.fillStyle(0xa08057, 1);
      g.fillCircle(-16, -6, 5);
      g.fillCircle(16, -6, 5);
      break;
    }
    case 'tree': {
      g.fillStyle(0x9a6b45, 1);
      g.fillRect(-26, -10, 52, 150);
      g.strokeRect(-26, -10, 52, 150);
      g.fillStyle(0x7fb59a, 1);
      for (const [cx, cy, r] of [[-70, -70, 78], [70, -70, 78], [0, -130, 92], [0, -60, 84]] as const) {
        g.fillCircle(cx, cy, r);
        g.strokeCircle(cx, cy, r);
      }
      g.fillCircle(0, -70, 84);
      g.lineStyle(6, 0xf0e6a0, 1);
      g.strokePoints(
        Array.from({ length: 30 }, (_, i) => ({
          x: Math.cos(i * 0.5) * (6 + i * 1.6),
          y: -90 + Math.sin(i * 0.5) * (6 + i * 1.2),
        })),
        false,
        false,
      );
      break;
    }
    case 'eyed-bush': {
      const spikes: Point[] = Array.from({ length: 20 }, (_, i) => {
        const angle = (i / 20) * Math.PI * 2;
        const radius = i % 2 === 0 ? 150 : 112;
        return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius * 0.8 };
      });
      g.fillStyle(0x5f9442, 1);
      g.fillPoints(spikes, true, true);
      g.strokePoints(spikes, true, true);
      g.fillStyle(0xf4efe2, 1);
      g.fillEllipse(-42, -8, 56, 70);
      g.fillEllipse(42, -8, 56, 70);
      g.strokeEllipse(-42, -8, 56, 70);
      g.strokeEllipse(42, -8, 56, 70);
      g.fillStyle(C.outline, 1);
      g.fillCircle(-38, -4, 12);
      g.fillCircle(46, -4, 12);
      break;
    }
    case 'bandage': {
      g.fillStyle(0xe8c9a2, 1);
      g.fillRoundedRect(-150, -48, 300, 96, 30);
      g.strokeRoundedRect(-150, -48, 300, 96, 30);
      g.save();
      g.rotateCanvas(Math.PI / 2);
      g.fillRoundedRect(-150, -48, 300, 96, 30);
      g.strokeRoundedRect(-150, -48, 300, 96, 30);
      g.restore();
      g.fillStyle(0xf6e3c7, 1);
      g.fillRoundedRect(-44, -44, 88, 88, 14);
      g.fillStyle(0xc79a72, 1);
      for (const [dx, dy] of [[-100, -12], [-70, 14], [100, 12], [70, -14], [-8, -100], [10, 100], [-14, -70], [12, 72]] as const) {
        g.fillCircle(dx, dy, 6);
      }
      break;
    }
    case 'stump': {
      g.fillStyle(0xa9a4b8, 1);
      g.fillRoundedRect(-120, -40, 240, 170, 26);
      g.strokeRoundedRect(-120, -40, 240, 170, 26);
      g.fillStyle(0x9ab84a, 1);
      g.fillEllipse(0, -44, 250, 90);
      g.strokeEllipse(0, -44, 250, 90);
      g.fillCircle(-80, 8, 22);
      g.fillCircle(30, 16, 26);
      g.fillStyle(0xf4efe2, 1);
      g.fillCircle(-44, 62, 32);
      g.fillCircle(44, 62, 32);
      g.strokeCircle(-44, 62, 32);
      g.strokeCircle(44, 62, 32);
      g.fillStyle(C.outline, 1);
      g.fillCircle(-40, 64, 13);
      g.fillCircle(48, 64, 13);
      break;
    }
    case 'star': {
      const star: Point[] = Array.from({ length: 10 }, (_, i) => {
        const angle = -Math.PI / 2 + (i / 10) * Math.PI * 2;
        const radius = i % 2 === 0 ? 110 : 52;
        return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
      });
      g.fillStyle(0xf59ab6, 1);
      g.fillPoints(star, true, true);
      g.strokePoints(star, true, true);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(0, 4, 26);
      g.strokeCircle(0, 4, 26);
      break;
    }
    case 'pencil': {
      g.fillStyle(0xf3c64a, 1);
      g.fillRect(-150, -34, 220, 68);
      g.strokeRect(-150, -34, 220, 68);
      g.fillStyle(0xf59ab6, 1);
      g.fillRect(-190, -34, 40, 68);
      g.strokeRect(-190, -34, 40, 68);
      g.fillStyle(0xf1dcb0, 1);
      g.fillTriangle(70, -34, 70, 34, 140, 0);
      g.strokeTriangle(70, -34, 70, 34, 140, 0);
      g.fillStyle(C.outline, 1);
      g.fillTriangle(116, -12, 116, 12, 140, 0);
      break;
    }
    case 'flag': {
      g.lineStyle(10, 0x7a5a3a, 1);
      g.lineBetween(0, -150, 0, 130);
      g.lineStyle(8, C.outline, 1);
      const cloth: Point[] = [{ x: 4, y: -150 }, { x: 120, y: -110 }, { x: 4, y: -70 }];
      g.fillStyle(0xf2f0e4, 1);
      g.fillPoints(cloth, true, true);
      g.strokePoints(cloth, true, true);
      g.fillStyle(0xe85d5d, 1);
      g.fillCircle(40, -110, 12);
      break;
    }
    case 'fence': {
      for (let post = 0; post < 5; post += 1) {
        const px = -150 + post * 75;
        g.fillStyle(0x9a6b45, 1);
        g.fillRoundedRect(px - 14, -50, 28, 130, 8);
        g.strokeRoundedRect(px - 14, -50, 28, 130, 8);
      }
      g.lineStyle(6, 0xe9d5a6, 1);
      for (let rope = 0; rope < 4; rope += 1) {
        const rx = -150 + rope * 75;
        g.strokePoints([{ x: rx + 14, y: -10 }, { x: rx + 37, y: 12 }, { x: rx + 61, y: -10 }], false, false);
      }
      break;
    }
  }

  g.restore();
}
