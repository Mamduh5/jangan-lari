import {
  createInitialTankStatLevels,
  createTankStatEffectSnapshot,
  getTankStatDefinition,
  type TankStatEffectSnapshot,
  type TankStatId,
  type TankStatLevels,
} from '../data/tankStats';

export type TankStatSpendResult = {
  spent: boolean;
  statId: TankStatId;
  previousLevel: number;
  nextLevel: number;
  effectDelta: number;
};

export class TankStatRuntime {
  private availablePoints = 0;
  private readonly levels: TankStatLevels;

  constructor(levels: TankStatLevels = createInitialTankStatLevels(), availablePoints = 0) {
    this.levels = { ...levels };
    this.availablePoints = Math.max(0, Math.floor(availablePoints));
  }

  getAvailablePoints(): number {
    return this.availablePoints;
  }

  getLevels(): TankStatLevels {
    return { ...this.levels };
  }

  getEffects(): TankStatEffectSnapshot {
    return createTankStatEffectSnapshot(this.levels);
  }

  grantPoints(points: number): number {
    const safePoints = Math.max(0, Math.floor(points));
    this.availablePoints += safePoints;
    return this.availablePoints;
  }

  canSpend(statId: TankStatId): boolean {
    const definition = getTankStatDefinition(statId);
    return this.availablePoints > 0 && this.levels[statId] < definition.maxLevel;
  }

  spendPoint(statId: TankStatId): TankStatSpendResult {
    const definition = getTankStatDefinition(statId);
    const previousLevel = this.levels[statId];

    if (!this.canSpend(statId)) {
      return {
        spent: false,
        statId,
        previousLevel,
        nextLevel: previousLevel,
        effectDelta: 0,
      };
    }

    this.levels[statId] = previousLevel + 1;
    this.availablePoints -= 1;

    return {
      spent: true,
      statId,
      previousLevel,
      nextLevel: this.levels[statId],
      effectDelta: definition.effectPerLevel,
    };
  }
}
