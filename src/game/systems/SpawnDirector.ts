import Phaser from 'phaser';
import {
  BOSS_SPAWN_TIME_MS,
  ELITE_SPAWN_INTERVAL_MS,
  RUN_TARGET_DURATION_MS,
} from '../config/constants';
import { ENEMY_ARCHETYPES, type EnemyArchetype } from '../data/enemies';

export class SpawnDirector {
  private nextEliteSpawnAtMs = 35000;
  private bossSpawned = false;

  nextWave(elapsedMs: number): EnemyArchetype[] {
    if (elapsedMs >= RUN_TARGET_DURATION_MS) {
      return [];
    }

    const wave: EnemyArchetype[] = [];
    const stage = this.getStage(elapsedMs);
    const baseCount = this.getBaseCount(stage);

    for (let index = 0; index < baseCount; index += 1) {
      wave.push(this.pickArchetype(stage));
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

  hasSpawnedBoss(): boolean {
    return this.bossSpawned;
  }

  private getStage(elapsedMs: number): number {
    if (elapsedMs < 30000) {
      return 0;
    }

    if (elapsedMs < 65000) {
      return 1;
    }

    return 2;
  }

  private getBaseCount(stage: number): number {
    switch (stage) {
      case 0:
        return Phaser.Math.Between(2, 3);
      case 1:
        return Phaser.Math.Between(3, 5);
      default:
        return Phaser.Math.Between(4, 6);
    }
  }

  private pickArchetype(stage: number): EnemyArchetype {
    const roll = Math.random();

    if (stage === 0) {
      return roll < 0.45 ? ENEMY_ARCHETYPES.scuttler : ENEMY_ARCHETYPES.mauler;
    }

    if (stage === 1) {
      if (roll < 0.35) {
        return ENEMY_ARCHETYPES.scuttler;
      }

      if (roll < 0.8) {
        return ENEMY_ARCHETYPES.mauler;
      }

      return ENEMY_ARCHETYPES.bulwark;
    }

    if (roll < 0.25) {
      return ENEMY_ARCHETYPES.scuttler;
    }

    if (roll < 0.65) {
      return ENEMY_ARCHETYPES.mauler;
    }

    return ENEMY_ARCHETYPES.bulwark;
  }
}
