import Phaser from 'phaser';
import {
  BOSS_SPAWN_TIME_MS,
  ELITE_SPAWN_INTERVAL_MS,
  MINIBOSS_SPAWN_INTERVAL_MS,
  MINIBOSS_SPAWN_TIME_MS,
  RUN_TARGET_DURATION_MS,
} from '../config/constants';
import { ENEMY_ARCHETYPES, type EnemyArchetype } from '../data/enemies';

type StageRule = {
  untilMs: number;
  minCount: number;
  maxCount: number;
  pool: Array<{ archetype: EnemyArchetype; weight: number }>;
};

const OPENING_STAGE_END_MS = 45000;
const EARLY_RAMP_STAGE_END_MS = 120000;
const FIRST_ELITE_SPAWN_AT_MS = 35000;

const STAGE_RULES: StageRule[] = [
  {
    untilMs: OPENING_STAGE_END_MS,
    minCount: 3,
    maxCount: 4,
    pool: [
      { archetype: ENEMY_ARCHETYPES.scuttler, weight: 22 },
      { archetype: ENEMY_ARCHETYPES.skimmer, weight: 20 },
      { archetype: ENEMY_ARCHETYPES.harrier, weight: 18 },
      { archetype: ENEMY_ARCHETYPES.mauler, weight: 24 },
      { archetype: ENEMY_ARCHETYPES.crusher, weight: 16 },
    ],
  },
  {
    untilMs: EARLY_RAMP_STAGE_END_MS,
    minCount: 4,
    maxCount: 5,
    pool: [
      { archetype: ENEMY_ARCHETYPES.scuttler, weight: 12 },
      { archetype: ENEMY_ARCHETYPES.skimmer, weight: 18 },
      { archetype: ENEMY_ARCHETYPES.harrier, weight: 18 },
      { archetype: ENEMY_ARCHETYPES.mauler, weight: 24 },
      { archetype: ENEMY_ARCHETYPES.crusher, weight: 16 },
      { archetype: ENEMY_ARCHETYPES.bulwark, weight: 12 },
    ],
  },
  {
    untilMs: 240000,
    minCount: 4,
    maxCount: 6,
    pool: [
      { archetype: ENEMY_ARCHETYPES.scuttler, weight: 10 },
      { archetype: ENEMY_ARCHETYPES.skimmer, weight: 16 },
      { archetype: ENEMY_ARCHETYPES.harrier, weight: 16 },
      { archetype: ENEMY_ARCHETYPES.mauler, weight: 20 },
      { archetype: ENEMY_ARCHETYPES.crusher, weight: 16 },
      { archetype: ENEMY_ARCHETYPES.bulwark, weight: 12 },
      { archetype: ENEMY_ARCHETYPES.hexcaster, weight: 10 },
    ],
  },
  {
    untilMs: 420000,
    minCount: 5,
    maxCount: 7,
    pool: [
      { archetype: ENEMY_ARCHETYPES.scuttler, weight: 8 },
      { archetype: ENEMY_ARCHETYPES.skimmer, weight: 12 },
      { archetype: ENEMY_ARCHETYPES.harrier, weight: 14 },
      { archetype: ENEMY_ARCHETYPES.mauler, weight: 18 },
      { archetype: ENEMY_ARCHETYPES.crusher, weight: 18 },
      { archetype: ENEMY_ARCHETYPES.bulwark, weight: 14 },
      { archetype: ENEMY_ARCHETYPES.hexcaster, weight: 16 },
    ],
  },
  {
    untilMs: 600000,
    minCount: 6,
    maxCount: 8,
    pool: [
      { archetype: ENEMY_ARCHETYPES.skimmer, weight: 10 },
      { archetype: ENEMY_ARCHETYPES.harrier, weight: 12 },
      { archetype: ENEMY_ARCHETYPES.mauler, weight: 16 },
      { archetype: ENEMY_ARCHETYPES.crusher, weight: 18 },
      { archetype: ENEMY_ARCHETYPES.bulwark, weight: 18 },
      { archetype: ENEMY_ARCHETYPES.hexcaster, weight: 18 },
      { archetype: ENEMY_ARCHETYPES.scuttler, weight: 8 },
    ],
  },
  {
    untilMs: RUN_TARGET_DURATION_MS,
    minCount: 7,
    maxCount: 10,
    pool: [
      { archetype: ENEMY_ARCHETYPES.skimmer, weight: 8 },
      { archetype: ENEMY_ARCHETYPES.harrier, weight: 10 },
      { archetype: ENEMY_ARCHETYPES.mauler, weight: 16 },
      { archetype: ENEMY_ARCHETYPES.crusher, weight: 18 },
      { archetype: ENEMY_ARCHETYPES.bulwark, weight: 18 },
      { archetype: ENEMY_ARCHETYPES.hexcaster, weight: 22 },
      { archetype: ENEMY_ARCHETYPES.scuttler, weight: 8 },
    ],
  },
];

const ELITE_ROTATION: EnemyArchetype[] = [ENEMY_ARCHETYPES.overlord, ENEMY_ARCHETYPES.riftblade];

export class SpawnDirector {
  private nextEliteSpawnAtMs = FIRST_ELITE_SPAWN_AT_MS;
  private nextEliteIndex = 0;
  private nextMinibossSpawnAtMs = MINIBOSS_SPAWN_TIME_MS;
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
      wave.push(ELITE_ROTATION[this.nextEliteIndex % ELITE_ROTATION.length]);
      this.nextEliteIndex += 1;
      this.nextEliteSpawnAtMs += ELITE_SPAWN_INTERVAL_MS;
    }

    if (elapsedMs >= this.nextMinibossSpawnAtMs && elapsedMs < BOSS_SPAWN_TIME_MS) {
      wave.push(ENEMY_ARCHETYPES.dreadnought);
      this.nextMinibossSpawnAtMs += MINIBOSS_SPAWN_INTERVAL_MS;
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
