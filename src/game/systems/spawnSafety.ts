export type SpawnPoint = {
  x: number;
  y: number;
};

export type SpawnBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type SafeSpawnPointOptions = {
  player: SpawnPoint;
  bounds: SpawnBounds;
  safeRadius: number;
  attempts: number;
  createCandidate: () => SpawnPoint;
};

export function chooseSafeSpawnPoint(options: SafeSpawnPointOptions): SpawnPoint {
  const attempts = Math.max(1, Math.floor(options.attempts));
  const safeRadiusSq = options.safeRadius * options.safeRadius;
  let farthestCandidate = clampPointToBounds(options.createCandidate(), options.bounds);
  let farthestDistanceSq = getDistanceSq(options.player, farthestCandidate);

  if (farthestDistanceSq >= safeRadiusSq) {
    return farthestCandidate;
  }

  for (let attempt = 1; attempt < attempts; attempt += 1) {
    const candidate = clampPointToBounds(options.createCandidate(), options.bounds);
    const distanceSq = getDistanceSq(options.player, candidate);

    if (distanceSq >= safeRadiusSq) {
      return candidate;
    }

    if (distanceSq > farthestDistanceSq) {
      farthestCandidate = candidate;
      farthestDistanceSq = distanceSq;
    }
  }

  const farthestCorner = chooseFarthestCorner(options.player, options.bounds);
  if (getDistanceSq(options.player, farthestCorner) >= safeRadiusSq) {
    return farthestCorner;
  }

  return farthestCandidate;
}

function clampPointToBounds(point: SpawnPoint, bounds: SpawnBounds): SpawnPoint {
  return {
    x: clamp(point.x, bounds.minX, bounds.maxX),
    y: clamp(point.y, bounds.minY, bounds.maxY),
  };
}

function chooseFarthestCorner(player: SpawnPoint, bounds: SpawnBounds): SpawnPoint {
  const corners: SpawnPoint[] = [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.minX, y: bounds.maxY },
  ];

  return corners.reduce((farthest, corner) =>
    getDistanceSq(player, corner) > getDistanceSq(player, farthest) ? corner : farthest,
  );
}

function getDistanceSq(left: SpawnPoint, right: SpawnPoint): number {
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  return dx * dx + dy * dy;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
