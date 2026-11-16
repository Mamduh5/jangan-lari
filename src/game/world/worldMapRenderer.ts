import type Phaser from 'phaser';
import { CAMERA_OVERSCROLL_PADDING_X, CAMERA_OVERSCROLL_PADDING_Y, WORLD_HEIGHT, WORLD_WIDTH } from '../config/worldBalance';
import { SOLID_ROCKS, WORLD_CENTER, WORLD_OUTLINE } from './worldMap';

/**
 * Minimal world presentation (R3F-D part A): void, island fill, outline and the
 * solid rock footprints. Replaced by the full doodle renderer in part B.
 */
export function renderWorldMap(scene: Phaser.Scene): void {
  const graphics = scene.add.graphics().setDepth(-40);

  graphics.fillStyle(0x2a2838, 1);
  graphics.fillRect(
    -CAMERA_OVERSCROLL_PADDING_X,
    -CAMERA_OVERSCROLL_PADDING_Y,
    WORLD_WIDTH + CAMERA_OVERSCROLL_PADDING_X * 2,
    WORLD_HEIGHT + CAMERA_OVERSCROLL_PADDING_Y * 2,
  );

  const outline = WORLD_OUTLINE.map((point) => ({ x: point.x, y: point.y }));
  graphics.fillStyle(0x98b648, 1);
  graphics.fillPoints(outline, true, true);
  graphics.lineStyle(10, 0x1b1a22, 1);
  graphics.strokePoints(outline, true, true);

  graphics.fillStyle(0xd9b472, 1);
  graphics.fillCircle(WORLD_CENTER.x, WORLD_CENTER.y, 380);

  graphics.fillStyle(0x8d8aa3, 1);
  graphics.lineStyle(6, 0x1b1a22, 1);
  for (const rock of SOLID_ROCKS) {
    graphics.fillCircle(rock.x, rock.y, rock.radius);
    graphics.strokeCircle(rock.x, rock.y, rock.radius);
  }
}
