import { chooseSafeSpawnPoint, type SpawnPoint } from '../../src/game/systems/spawnSafety';

describe('spawn safety', () => {
  const bounds = { minX: 24, minY: 24, maxX: 1976, maxY: 1376 };
  const player = { x: 100, y: 700 };

  test('rejects close candidates until a valid far candidate is available', () => {
    const candidates = [
      { x: 120, y: 700 },
      { x: 130, y: 690 },
      { x: 620, y: 700 },
    ];

    const spawnPoint = chooseSafeSpawnPoint({
      player,
      bounds,
      safeRadius: 360,
      attempts: candidates.length,
      createCandidate: nextCandidate(candidates),
    });

    expect(spawnPoint).toEqual({ x: 620, y: 700 });
  });

  test('accepts the first valid far candidate', () => {
    const spawnPoint = chooseSafeSpawnPoint({
      player,
      bounds,
      safeRadius: 360,
      attempts: 3,
      createCandidate: nextCandidate([{ x: 500, y: 700 }]),
    });

    expect(spawnPoint).toEqual({ x: 500, y: 700 });
  });

  test('fallback stays inside world bounds and preserves the minimum distance when possible', () => {
    const edgePlayer = { x: 24, y: 24 };
    const spawnPoint = chooseSafeSpawnPoint({
      player: edgePlayer,
      bounds,
      safeRadius: 360,
      attempts: 2,
      createCandidate: nextCandidate([
        { x: -200, y: -200 },
        { x: -120, y: 40 },
      ]),
    });

    expect(spawnPoint.x).toBeGreaterThanOrEqual(bounds.minX);
    expect(spawnPoint.x).toBeLessThanOrEqual(bounds.maxX);
    expect(spawnPoint.y).toBeGreaterThanOrEqual(bounds.minY);
    expect(spawnPoint.y).toBeLessThanOrEqual(bounds.maxY);
    expect(distanceBetween(edgePlayer, spawnPoint)).toBeGreaterThanOrEqual(360);
  });
});

function nextCandidate(candidates: SpawnPoint[]): () => SpawnPoint {
  let index = 0;
  return () => candidates[Math.min(index++, candidates.length - 1)];
}

function distanceBetween(left: SpawnPoint, right: SpawnPoint): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}
