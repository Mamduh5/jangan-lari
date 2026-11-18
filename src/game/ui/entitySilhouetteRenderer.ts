import Phaser from 'phaser';
import type { EnemyArchetypeId } from '../data/enemies';
import type { HeroSpritePresentation } from '../data/heroSpritePresentation';

const INK = 0x1b1a22;
const CREAM = 0xfdf7e7;
const GOLD = 0xfde68a;

/**
 * Draws the compact cream-and-ink player footing disc once at spawn.
 * Separates all four heroes from terrain props and color-similar enemies in color or grayscale.
 */
export function drawPlayerFootingBadge(
  graphics: Phaser.GameObjects.Graphics,
  presentation: HeroSpritePresentation,
): void {
  const r = presentation.footingRadius;
  const shadowY = Math.round(presentation.displaySize * 0.34);

  graphics.clear();

  // Compact contact shadow directly under the hero's feet
  graphics.fillStyle(INK, 0.28);
  graphics.fillEllipse(0, shadowY, r * 1.45, r * 0.58);

  // Subtle cream rim disc framed by dark doodle ink + hero accent trim
  graphics.fillStyle(CREAM, 0.38);
  graphics.fillCircle(0, 4, r);
  graphics.lineStyle(2.4, INK, 0.94);
  graphics.strokeCircle(0, 4, r);
  graphics.lineStyle(1.6, presentation.accentColor, 0.92);
  graphics.strokeCircle(0, 4, r - 2.4);
}

/**
 * Draws a compact hand-inked directional chevron around origin facing +X (angle 0).
 */
export function drawPlayerAimChevron(graphics: Phaser.GameObjects.Graphics, accentColor: number): void {
  graphics.clear();
  graphics.fillStyle(GOLD, 0.98);
  graphics.lineStyle(2.2, INK, 0.98);
  graphics.beginPath();
  graphics.moveTo(9, 0);
  graphics.lineTo(-4, -5.5);
  graphics.lineTo(-1.5, 0);
  graphics.lineTo(-4, 5.5);
  graphics.closePath();
  graphics.fillPath();
  graphics.strokePath();

  // Inner accent notch makes the chevron readable even over bright yellow FX
  graphics.fillStyle(accentColor, 0.9);
  graphics.fillCircle(-1, 0, 1.8);
}

function strokeAndFillPoly(
  graphics: Phaser.GameObjects.Graphics,
  points: ReadonlyArray<readonly [number, number]>,
  fillColor: number,
  fillAlpha: number,
  strokeWidth: number,
  strokeAlpha = 0.95,
): void {
  graphics.fillStyle(fillColor, fillAlpha);
  graphics.lineStyle(strokeWidth, INK, strokeAlpha);
  graphics.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) {
      graphics.moveTo(x, y);
    } else {
      graphics.lineTo(x, y);
    }
  });
  graphics.closePath();
  graphics.fillPath();
  graphics.strokePath();
}

function drawNotchedRing(
  graphics: Phaser.GameObjects.Graphics,
  radius: number,
  notches: number,
  spikeLength: number,
  ringColor: number,
  strokeWidth: number,
): void {
  graphics.lineStyle(strokeWidth, INK, 0.92);
  graphics.strokeCircle(0, 0, radius);
  graphics.lineStyle(Math.max(1.5, strokeWidth - 1.2), ringColor, 0.9);
  graphics.strokeCircle(0, 0, radius - 1.8);

  for (let i = 0; i < notches; i += 1) {
    const a = (Math.PI * 2 * i) / notches;
    const perp = a + Math.PI / 2;
    const base = radius - 1;
    const tip = radius + spikeLength;
    const spread = Math.max(3, radius * 0.14);
    strokeAndFillPoly(
      graphics,
      [
        [Math.cos(a) * tip, Math.sin(a) * tip],
        [Math.cos(a) * base + Math.cos(perp) * spread, Math.sin(a) * base + Math.sin(perp) * spread],
        [Math.cos(a) * base - Math.cos(perp) * spread, Math.sin(a) * base - Math.sin(perp) * spread],
      ],
      ringColor,
      0.95,
      Math.max(1.8, strokeWidth - 0.8),
    );
  }
}

/**
 * Draws archetype-specific render-only contact grounding, tier insignia, and protruding
 * silhouette appendages behind the upright PNG sprite overlay.
 */
export function drawEnemySilhouetteBack(
  graphics: Phaser.GameObjects.Graphics,
  id: EnemyArchetypeId,
  displaySize: number,
): void {
  const half = displaySize / 2;
  const strokeW = id === 'behemoth' ? 3.2 : id === 'dreadnought' ? 3 : id === 'overlord' || id === 'riftblade' ? 2.8 : 2.3;

  graphics.clear();

  // Ground contact shadow anchors every enemy onto sand/grass cleanly
  const shadowWidth = id === 'scuttler' ? displaySize * 0.82 : id === 'crusher' ? displaySize * 0.88 : displaySize * 0.72;
  const shadowHeight = id === 'scuttler' ? displaySize * 0.26 : displaySize * 0.28;
  graphics.fillStyle(INK, 0.23);
  graphics.fillEllipse(0, half * 0.72, shadowWidth, shadowHeight);

  switch (id) {
    case 'scuttler': {
      // Twin short front mandibles facing +X so low crawling bug reads clearly at swarm scale
      strokeAndFillPoly(
        graphics,
        [
          [half * 0.74, -half * 0.1],
          [half * 1.06, -half * 0.24],
          [half * 0.92, -half * 0.02],
        ],
        0xfdf7e7,
        0.95,
        strokeW,
      );
      strokeAndFillPoly(
        graphics,
        [
          [half * 0.74, half * 0.18],
          [half * 1.06, half * 0.3],
          [half * 0.9, half * 0.08],
        ],
        0xfdf7e7,
        0.95,
        strokeW,
      );
      break;
    }

    case 'skimmer': {
      // Wide swept glider wings distinguish Skimmer from round Mauler in grayscale
      strokeAndFillPoly(
        graphics,
        [
          [-half * 0.42, -half * 0.22],
          [-half * 1.08, -half * 0.48],
          [-half * 0.94, 0],
          [-half * 0.46, half * 0.16],
        ],
        0xe0f2fe,
        0.96,
        strokeW,
      );
      strokeAndFillPoly(
        graphics,
        [
          [half * 0.42, -half * 0.22],
          [half * 1.08, -half * 0.48],
          [half * 0.94, 0],
          [half * 0.46, half * 0.16],
        ],
        0xe0f2fe,
        0.96,
        strokeW,
      );
      break;
    }

    case 'harrier': {
      // Directional dart arrow facing +X: sharp beak right + forked tail fins left
      strokeAndFillPoly(
        graphics,
        [
          [half * 0.66, -half * 0.16],
          [half * 1.12, 0],
          [half * 0.66, half * 0.2],
        ],
        0xfbbf24,
        0.98,
        strokeW,
      );
      strokeAndFillPoly(
        graphics,
        [
          [-half * 0.68, -half * 0.08],
          [-half * 1.08, -half * 0.42],
          [-half * 0.86, 0],
          [-half * 1.08, half * 0.42],
          [-half * 0.68, half * 0.08],
        ],
        0xc4b5fd,
        0.96,
        strokeW,
      );
      break;
    }

    case 'mauler': {
      // Blocky spiked knuckle gauntlets give Mauler heavy squared shoulders
      strokeAndFillPoly(
        graphics,
        [
          [-half * 0.56, -half * 0.42],
          [-half * 0.98, -half * 0.3],
          [-half * 0.98, half * 0.3],
          [-half * 0.56, half * 0.4],
        ],
        0xfed7aa,
        0.96,
        strokeW,
      );
      strokeAndFillPoly(
        graphics,
        [
          [half * 0.56, -half * 0.42],
          [half * 0.98, -half * 0.26],
          [half * 0.98, half * 0.28],
          [half * 0.56, half * 0.38],
        ],
        0xfed7aa,
        0.96,
        strokeW,
      );
      break;
    }

    case 'crusher': {
      // Wide horizontal battering-ram chassis silhouette
      strokeAndFillPoly(
        graphics,
        [
          [-half * 0.94, -half * 0.42],
          [-half * 1.12, -half * 0.56],
          [-half * 1.14, 0],
          [-half * 0.94, half * 0.36],
        ],
        0x94a3b8,
        0.96,
        strokeW,
      );
      strokeAndFillPoly(
        graphics,
        [
          [half * 0.94, -half * 0.42],
          [half * 1.12, -half * 0.56],
          [half * 1.14, 0],
          [half * 0.94, half * 0.36],
        ],
        0x94a3b8,
        0.96,
        strokeW,
      );
      break;
    }

    case 'bulwark': {
      // Tall fortress shield halo & corner rivets framing tall silhouette
      strokeAndFillPoly(
        graphics,
        [
          [-half * 0.62, -half * 0.68],
          [0, -half * 0.88],
          [half * 0.62, -half * 0.68],
          [half * 0.78, half * 0.46],
          [0, half * 0.72],
          [-half * 0.78, half * 0.46],
        ],
        0xd9f99d,
        0.9,
        strokeW + 0.3,
      );
      break;
    }

    case 'hexcaster': {
      // Hovering arcane halo + twin vertical crystal horns make ranged shooter unmistakable in grayscale
      graphics.lineStyle(strokeW, INK, 0.92);
      graphics.strokeCircle(0, -half * 0.04, half * 0.76);
      graphics.lineStyle(1.8, 0xa5f3fc, 0.92);
      graphics.strokeCircle(0, -half * 0.04, half * 0.72);
      strokeAndFillPoly(
        graphics,
        [
          [-half * 0.52, -half * 0.52],
          [-half * 0.76, -half * 1.0],
          [-half * 0.24, -half * 0.68],
        ],
        0x67e8f9,
        0.96,
        strokeW,
      );
      strokeAndFillPoly(
        graphics,
        [
          [half * 0.52, -half * 0.52],
          [half * 0.76, -half * 1.0],
          [half * 0.24, -half * 0.68],
        ],
        0x67e8f9,
        0.96,
        strokeW,
      );
      break;
    }

    case 'overlord': {
      // Elite ground emblem + armored pauldrons
      drawNotchedRing(graphics, half * 0.82, 6, 7, 0xe9d5ff, strokeW);
      strokeAndFillPoly(
        graphics,
        [
          [-half * 0.54, -half * 0.32],
          [-half * 0.94, -half * 0.62],
          [-half * 0.82, half * 0.18],
          [-half * 0.48, half * 0.26],
        ],
        0xc084fc,
        0.95,
        strokeW,
      );
      strokeAndFillPoly(
        graphics,
        [
          [half * 0.54, -half * 0.32],
          [half * 0.94, -half * 0.62],
          [half * 0.82, half * 0.18],
          [half * 0.48, half * 0.26],
        ],
        0xc084fc,
        0.95,
        strokeW,
      );
      break;
    }

    case 'riftblade': {
      // Fast Elite ground emblem + swept twin crescent scythe-blades
      drawNotchedRing(graphics, half * 0.82, 4, 8, 0xa5f3fc, strokeW);
      strokeAndFillPoly(
        graphics,
        [
          [-half * 0.32, -half * 0.22],
          [-half * 1.02, -half * 0.78],
          [-half * 0.72, -half * 0.08],
          [-half * 0.98, half * 0.42],
          [-half * 0.34, half * 0.22],
        ],
        0x67e8f9,
        0.96,
        strokeW,
      );
      break;
    }

    case 'dreadnought': {
      // Miniboss double war-ring + forward siege horn
      drawNotchedRing(graphics, half * 0.84, 8, 9, 0xfda4af, strokeW);
      strokeAndFillPoly(
        graphics,
        [
          [half * 0.76, -half * 0.24],
          [half * 1.12, -half * 0.06],
          [half * 0.78, half * 0.24],
        ],
        0xfde68a,
        0.98,
        strokeW,
      );
      break;
    }

    case 'behemoth': {
      // Boss royal war-ring tightly aligned around perimeter (well inside shockwave telegraph!)
      drawNotchedRing(graphics, half * 0.86, 10, 10, 0xfca5a5, strokeW + 0.4);
      break;
    }
  }
}

/**
 * Draws crisp front-perimeter caps/crowns where PNG crops need sealing or tier crests
 * clearly separate Elites, Dreadnought, and Behemoth in grayscale.
 */
export function drawEnemySilhouetteFront(
  graphics: Phaser.GameObjects.Graphics,
  id: EnemyArchetypeId,
  displaySize: number,
): boolean {
  const half = displaySize / 2;
  const strokeW = id === 'behemoth' ? 3.2 : id === 'dreadnought' ? 3 : 2.6;
  graphics.clear();

  switch (id) {
    case 'crusher': {
      // Seal both vertically cropped flat side borders with inked armored ram plates
      strokeAndFillPoly(
        graphics,
        [
          [-half * 0.9, -half * 0.42],
          [-half * 0.72, -half * 0.48],
          [-half * 0.72, half * 0.44],
          [-half * 0.9, half * 0.38],
        ],
        0xcbd5e1,
        0.98,
        strokeW,
      );
      strokeAndFillPoly(
        graphics,
        [
          [half * 0.72, -half * 0.48],
          [half * 0.9, -half * 0.42],
          [half * 0.9, half * 0.38],
          [half * 0.72, half * 0.44],
        ],
        0xcbd5e1,
        0.98,
        strokeW,
      );
      return true;
    }

    case 'dreadnought': {
      // Seal both flat vertical crop edges on sprite-enemy-miniboss-dreadnought.png with riveted pauldrons
      strokeAndFillPoly(
        graphics,
        [
          [-half * 0.9, -half * 0.44],
          [-half * 0.72, -half * 0.5],
          [-half * 0.72, half * 0.42],
          [-half * 0.9, half * 0.36],
        ],
        0xfda4af,
        0.98,
        strokeW,
      );
      strokeAndFillPoly(
        graphics,
        [
          [half * 0.72, -half * 0.5],
          [half * 0.9, -half * 0.44],
          [half * 0.9, half * 0.36],
          [half * 0.72, half * 0.42],
        ],
        0xfda4af,
        0.98,
        strokeW,
      );
      // Heavy spiked miniboss brow crest
      strokeAndFillPoly(
        graphics,
        [
          [-half * 0.24, -half * 0.64],
          [-half * 0.16, -half * 0.96],
          [0, -half * 0.74],
          [half * 0.18, -half * 0.98],
          [half * 0.26, -half * 0.64],
        ],
        GOLD,
        0.98,
        strokeW,
      );
      return true;
    }

    case 'overlord': {
      // 3-spike Elite Commander crown cleanly perched atop head
      strokeAndFillPoly(
        graphics,
        [
          [-half * 0.3, -half * 0.6],
          [-half * 0.36, -half * 0.92],
          [-half * 0.14, -half * 0.74],
          [0, -half * 1.0],
          [half * 0.14, -half * 0.74],
          [half * 0.36, -half * 0.92],
          [half * 0.3, -half * 0.6],
        ],
        GOLD,
        0.98,
        strokeW,
      );
      return true;
    }

    case 'riftblade': {
      // Razor twin-horn Elite crest
      strokeAndFillPoly(
        graphics,
        [
          [-half * 0.22, -half * 0.72],
          [-half * 0.32, -half * 1.02],
          [0, -half * 0.82],
          [half * 0.32, -half * 1.02],
          [half * 0.22, -half * 0.72],
        ],
        0x67e8f9,
        0.98,
        strokeW,
      );
      return true;
    }

    case 'behemoth': {
      // Grand jagged Boss crown cleanly perched on top brow
      strokeAndFillPoly(
        graphics,
        [
          [-half * 0.38, -half * 0.62],
          [-half * 0.44, -half * 0.96],
          [-half * 0.2, -half * 0.78],
          [0, -half * 1.04],
          [half * 0.2, -half * 0.78],
          [half * 0.44, -half * 0.96],
          [half * 0.38, -half * 0.62],
        ],
        0xfca5a5,
        0.98,
        strokeW,
      );
      return true;
    }

    default:
      return false;
  }
}
