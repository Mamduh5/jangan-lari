import Phaser from 'phaser';
import {
  BOSS_SPAWN_TIME_MS,
  ELITE_SPAWN_INTERVAL_MS,
  FIRST_ELITE_SPAWN_AT_MS,
  MINIBOSS_SPAWN_INTERVAL_MS,
  MINIBOSS_SPAWN_TIME_MS,
} from '../config/constants';
import {
  WAVE_DIRECTOR_WINDOWS,
  getWaveDirectorWindow,
  type WaveDirectorWindow,
  type WaveTemplateDefinition,
  type WeightedEnemyEntry,
} from '../config/waveDirectorBalance';
import { ENEMY_ARCHETYPES, type EnemyArchetype } from '../data/enemies';

export type SpawnWaveResult = {
  wave: EnemyArchetype[];
  templateId: string;
  templateLabel: string;
  templateHighlight: boolean;
  formation: WaveTemplateDefinition['formation'];
  directorWindowId: string;
};

function chooseOne<T>(items: T[]): T {
  return items[Phaser.Math.Between(0, items.length - 1)];
}

const ELITE_ROTATION: EnemyArchetype[] = [ENEMY_ARCHETYPES.overlord, ENEMY_ARCHETYPES.riftblade];

export class SpawnDirector {
  private nextEliteSpawnAtMs = FIRST_ELITE_SPAWN_AT_MS;
  private nextEliteIndex = 0;
  private nextMinibossSpawnAtMs = MINIBOSS_SPAWN_TIME_MS;
  private bossSpawned = false;
  private lastWaveTemplateId = '';
  private lastWaveTemplateLabel = '';
  private lastWaveTemplateHighlight = false;
  private lastDirectorWindowId = WAVE_DIRECTOR_WINDOWS[0]?.id ?? '';
  private lastFormation: WaveTemplateDefinition['formation'] = 'loose';

  getNextEliteSpawnAtMs(): number {
    return this.nextEliteSpawnAtMs;
  }

  getNextMinibossSpawnAtMs(): number {
    return this.nextMinibossSpawnAtMs;
  }

  hasBossSpawned(): boolean {
    return this.bossSpawned;
  }

  markBossSpawned(): void {
    this.bossSpawned = true;
  }

  getLastWaveTemplateId(): string {
    return this.lastWaveTemplateId;
  }

  getLastWaveTemplateLabel(): string {
    return this.lastWaveTemplateLabel;
  }

  getLastWaveTemplateHighlight(): boolean {
    return this.lastWaveTemplateHighlight;
  }

  getLastDirectorWindowId(): string {
    return this.lastDirectorWindowId;
  }

  getLastFormation(): WaveTemplateDefinition['formation'] {
    return this.lastFormation;
  }

  nextWave(elapsedMs: number): SpawnWaveResult {
    if (elapsedMs >= BOSS_SPAWN_TIME_MS) {
      this.clearLastWave();
      return this.emptyWave();
    }

    const stage = getWaveDirectorWindow(elapsedMs);
    const normalWaveResult = this.buildStageWave(stage, elapsedMs);
    const wave = [...normalWaveResult.wave];

    this.lastWaveTemplateId = normalWaveResult.templateId;
    this.lastWaveTemplateLabel = normalWaveResult.templateLabel;
    this.lastWaveTemplateHighlight = normalWaveResult.templateHighlight;
    this.lastDirectorWindowId = stage.id;
    this.lastFormation = normalWaveResult.formation;

    if (elapsedMs >= this.nextEliteSpawnAtMs) {
      wave.push(ELITE_ROTATION[this.nextEliteIndex % ELITE_ROTATION.length]);
      this.nextEliteIndex += 1;
      this.nextEliteSpawnAtMs += ELITE_SPAWN_INTERVAL_MS;
    }

    if (elapsedMs >= this.nextMinibossSpawnAtMs && elapsedMs < BOSS_SPAWN_TIME_MS) {
      wave.push(ENEMY_ARCHETYPES.dreadnought);
      this.nextMinibossSpawnAtMs += MINIBOSS_SPAWN_INTERVAL_MS;
    }

    return {
      ...normalWaveResult,
      wave,
      directorWindowId: stage.id,
    };
  }

  private buildStageWave(stage: WaveDirectorWindow, elapsedMs: number): SpawnWaveResult {
    const template = chooseOne(stage.templates);
    const wave = template.composition.map((id) => ENEMY_ARCHETYPES[id]);
    const targetMaxCount = this.getScaledMaxCount(stage, elapsedMs);
    const targetMinCount = Math.min(stage.minCount, targetMaxCount);
    const flexPool = template.flexPool ?? stage.fallbackPool;

    while (wave.length < targetMinCount) {
      wave.push(ENEMY_ARCHETYPES[this.pickWeightedArchetypeId(flexPool)]);
    }

    while (wave.length < targetMaxCount && Phaser.Math.Between(0, 100) < 54) {
      wave.push(ENEMY_ARCHETYPES[this.pickWeightedArchetypeId(flexPool)]);
    }

    return {
      wave: this.enforceRoleCaps(wave, stage).slice(0, targetMaxCount),
      templateId: template.id,
      templateLabel: template.label,
      templateHighlight: Boolean(template.highlight),
      formation: template.formation,
      directorWindowId: stage.id,
    };
  }

  private getScaledMaxCount(stage: WaveDirectorWindow, elapsedMs: number): number {
    const minutesInWindow = Math.max(0, (elapsedMs - stage.startsAtMs) / 60000);
    const scaled = stage.maxCount + Math.floor(minutesInWindow * stage.densityScalePerMinute);
    return Math.max(stage.minCount, Math.min(stage.maxCount + 2, scaled));
  }

  private enforceRoleCaps(wave: EnemyArchetype[], stage: WaveDirectorWindow): EnemyArchetype[] {
    let rangedCount = 0;
    return wave.filter((archetype) => {
      if (archetype.behavior !== 'ranged') {
        return true;
      }

      rangedCount += 1;
      return rangedCount <= stage.rangedMax;
    });
  }

  private pickWeightedArchetypeId(pool: WeightedEnemyEntry[]): keyof typeof ENEMY_ARCHETYPES {
    const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Phaser.Math.Between(1, totalWeight);

    for (const entry of pool) {
      roll -= entry.weight;
      if (roll <= 0) {
        return entry.id;
      }
    }

    return pool[pool.length - 1].id;
  }

  private clearLastWave(): void {
    this.lastWaveTemplateId = '';
    this.lastWaveTemplateLabel = '';
    this.lastWaveTemplateHighlight = false;
    this.lastFormation = 'loose';
  }

  private emptyWave(): SpawnWaveResult {
    return {
      wave: [],
      templateId: '',
      templateLabel: '',
      templateHighlight: false,
      formation: 'loose',
      directorWindowId: '',
    };
  }
}
