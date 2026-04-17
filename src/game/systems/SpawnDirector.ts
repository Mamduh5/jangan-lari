import Phaser from 'phaser';
import {
  BOSS_SPAWN_TIME_MS,
  ELITE_SPAWN_INTERVAL_MS,
  RUN_TARGET_DURATION_MS,
} from '../config/constants';
import { ENEMY_ARCHETYPES, type EnemyArchetype } from '../data/enemies';

type StageRule = {
  untilMs: number;
  minCount: number;
  maxCount: number;
  pool: Array<{ archetype: EnemyArchetype; weight: number }>;
};

const STAGE_RULES: StageRule[] = [
  {
    untilMs: 28000,
    minCount: 1,
    maxCount: 2,
    pool: [
      { archetype: ENEMY_ARCHETYPES.scuttler, weight: 50 },
      { archetype: ENEMY_ARCHETYPES.skimmer, weight: 25 },
      { archetype: ENEMY_ARCHETYPES.mauler, weight: 25 },
    ],
  },
  {
    untilMs: 65000,
    minCount: 3,
    maxCount: 4,
    pool: [
      { archetype: ENEMY_ARCHETYPES.scuttler, weight: 20 },
      { archetype: ENEMY_ARCHETYPES.skimmer, weight: 25 },
      { archetype: ENEMY_ARCHETYPES.mauler, weight: 35 },
      { archetype: ENEMY_ARCHETYPES.bulwark, weight: 20 },
    ],
  },
  {
    untilMs: RUN_TARGET_DURATION_MS,
    minCount: 4,
    maxCount: 5,
    pool: [
      { archetype: ENEMY_ARCHETYPES.skimmer, weight: 22 },
      { archetype: ENEMY_ARCHETYPES.mauler, weight: 33 },
      { archetype: ENEMY_ARCHETYPES.bulwark, weight: 30 },
      { archetype: ENEMY_ARCHETYPES.scuttler, weight: 15 },
    ],
  },
];

export class SpawnDirector {
  private nextEliteSpawnAtMs = 30000;
  private bossSpawned = false;

  nextWave(elapsedMs: number): EnemyArchetype[] {
    if (elapsedMs >= RUN_TARGET_DURATION_MS) {
      return [];
    }

    const stage = this.getStageRule(elapsedMs);
    const wave: EnemyArchetype[] = [];
    const baseCount = Phaser.Math.Between(stage.minCount, stage.maxCount);

    for (let index = 0; index < baseCount; index += 1) {
      wave.push(this.pickWeightedArchetype(stage));
    }

    if (elapsedMs >= this.nextEliteSpawnAtMs) {
      wave.push(ENEMY_ARCHETYPES.overlord);
      this.nextEliteSpawnAtMs += ELITE_SPAWN_INTERVAL_MS;
    }

    if (!this.bossSpawned && elapsedMs >= BOSS_SPAWN_TIME_MS) {
      wave.push(ENEMY_ARCHETYPES.behemoth);
      this.bossSpawned = true;
    }

    return wave;
  }

  private getStageRule(elapsedMs: number): StageRule {
    return STAGE_RULES.find((stage) => elapsedMs < stage.untilMs) ?? STAGE_RULES[STAGE_RULES.length - 1];
  }

  private pickWeightedArchetype(stage: StageRule): EnemyArchetype {
    const totalWeight = stage.pool.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Phaser.Math.Between(1, totalWeight);

    for (const entry of stage.pool) {
      roll -= entry.weight;
      if (roll <= 0) {
        return entry.archetype;
      }
    }

    return stage.pool[stage.pool.length - 1].archetype;
  }
}
