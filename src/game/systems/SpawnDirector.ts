import Phaser from 'phaser';
import {
  BOSS_SPAWN_TIME_MS,
  ELITE_SPAWN_INTERVAL_MS,
  MINIBOSS_SPAWN_INTERVAL_MS,
  MINIBOSS_SPAWN_TIME_MS,
  RUN_TARGET_DURATION_MS,
} from '../config/constants';
import { ENEMY_ARCHETYPES, type EnemyArchetype } from '../data/enemies';

type WeightedEntry = { archetype: EnemyArchetype; weight: number };

type WaveTemplateContext = {
  choose: <T>(items: T[]) => T;
};

type WaveTemplate = {
  id: string;
  label: string;
  highlight?: boolean;
  buildWave: (context: WaveTemplateContext) => EnemyArchetype[];
};

type StageRule = {
  untilMs: number;
  minCount: number;
  maxCount: number;
  fallbackPool: WeightedEntry[];
  templates: WaveTemplate[];
};

export type SpawnWaveResult = {
  wave: EnemyArchetype[];
  templateId: string;
  templateLabel: string;
  templateHighlight: boolean;
};

const OPENING_STAGE_END_MS = 45000;
const EARLY_RAMP_STAGE_END_MS = 120000;
const FIRST_ELITE_SPAWN_AT_MS = 35000;

function chooseOne<T>(items: T[]): T {
  return items[Phaser.Math.Between(0, items.length - 1)];
}

const OPENING_TEMPLATES: WaveTemplate[] = [
  {
    id: 'rush-pack',
    label: 'Rush Pack',
    buildWave: ({ choose }) => [
      ENEMY_ARCHETYPES.mauler,
      ENEMY_ARCHETYPES.scuttler,
      choose([ENEMY_ARCHETYPES.scuttler, ENEMY_ARCHETYPES.harrier]),
      choose([ENEMY_ARCHETYPES.scuttler, ENEMY_ARCHETYPES.skimmer]),
    ],
  },
  {
    id: 'flank-screen',
    label: 'Flank Screen',
    buildWave: ({ choose }) => [
      ENEMY_ARCHETYPES.skimmer,
      ENEMY_ARCHETYPES.harrier,
      ENEMY_ARCHETYPES.scuttler,
      choose([ENEMY_ARCHETYPES.scuttler, ENEMY_ARCHETYPES.mauler]),
    ],
  },
  {
    id: 'dash-pocket',
    label: 'Dash Pocket',
    highlight: true,
    buildWave: ({ choose }) => [
      ENEMY_ARCHETYPES.crusher,
      ENEMY_ARCHETYPES.scuttler,
      choose([ENEMY_ARCHETYPES.harrier, ENEMY_ARCHETYPES.skimmer]),
    ],
  },
];

const EARLY_RAMP_TEMPLATES: WaveTemplate[] = [
  {
    id: 'bulwark-pivot',
    label: 'Bulwark Pivot',
    highlight: true,
    buildWave: ({ choose }) => [
      ENEMY_ARCHETYPES.bulwark,
      ENEMY_ARCHETYPES.harrier,
      choose([ENEMY_ARCHETYPES.harrier, ENEMY_ARCHETYPES.skimmer]),
      choose([ENEMY_ARCHETYPES.scuttler, ENEMY_ARCHETYPES.mauler]),
    ],
  },
  {
    id: 'crusher-pincer',
    label: 'Crusher Pincer',
    highlight: true,
    buildWave: ({ choose }) => [
      ENEMY_ARCHETYPES.crusher,
      ENEMY_ARCHETYPES.harrier,
      ENEMY_ARCHETYPES.skimmer,
      choose([ENEMY_ARCHETYPES.mauler, ENEMY_ARCHETYPES.scuttler]),
    ],
  },
  {
    id: 'mauler-surge',
    label: 'Mauler Surge',
    buildWave: ({ choose }) => [
      ENEMY_ARCHETYPES.mauler,
      ENEMY_ARCHETYPES.mauler,
      ENEMY_ARCHETYPES.scuttler,
      choose([ENEMY_ARCHETYPES.harrier, ENEMY_ARCHETYPES.skimmer]),
    ],
  },
];

const MID_STAGE_TEMPLATES: WaveTemplate[] = [
  {
    id: 'bulwark-battery',
    label: 'Bulwark Battery',
    highlight: true,
    buildWave: ({ choose }) => [
      ENEMY_ARCHETYPES.bulwark,
      ENEMY_ARCHETYPES.bulwark,
      ENEMY_ARCHETYPES.hexcaster,
      choose([ENEMY_ARCHETYPES.harrier, ENEMY_ARCHETYPES.skimmer]),
    ],
  },
  {
    id: 'ranged-pincer',
    label: 'Ranged Pincer',
    highlight: true,
    buildWave: ({ choose }) => [
      ENEMY_ARCHETYPES.hexcaster,
      ENEMY_ARCHETYPES.harrier,
      ENEMY_ARCHETYPES.harrier,
      choose([ENEMY_ARCHETYPES.mauler, ENEMY_ARCHETYPES.crusher]),
    ],
  },
  {
    id: 'crusher-screen',
    label: 'Crusher Screen',
    buildWave: ({ choose }) => [
      ENEMY_ARCHETYPES.crusher,
      ENEMY_ARCHETYPES.mauler,
      ENEMY_ARCHETYPES.skimmer,
      choose([ENEMY_ARCHETYPES.bulwark, ENEMY_ARCHETYPES.hexcaster]),
    ],
  },
];

const LATE_STAGE_TEMPLATES: WaveTemplate[] = [
  {
    id: 'crossfire-cage',
    label: 'Crossfire Cage',
    highlight: true,
    buildWave: ({ choose }) => [
      ENEMY_ARCHETYPES.bulwark,
      ENEMY_ARCHETYPES.hexcaster,
      ENEMY_ARCHETYPES.hexcaster,
      ENEMY_ARCHETYPES.harrier,
      choose([ENEMY_ARCHETYPES.skimmer, ENEMY_ARCHETYPES.crusher]),
    ],
  },
  {
    id: 'wall-and-fangs',
    label: 'Wall and Fangs',
    highlight: true,
    buildWave: ({ choose }) => [
      ENEMY_ARCHETYPES.bulwark,
      ENEMY_ARCHETYPES.bulwark,
      ENEMY_ARCHETYPES.harrier,
      ENEMY_ARCHETYPES.harrier,
      choose([ENEMY_ARCHETYPES.mauler, ENEMY_ARCHETYPES.skimmer]),
    ],
  },
  {
    id: 'dash-flank-pack',
    label: 'Dash Flank Pack',
    buildWave: ({ choose }) => [
      ENEMY_ARCHETYPES.crusher,
      ENEMY_ARCHETYPES.harrier,
      ENEMY_ARCHETYPES.harrier,
      ENEMY_ARCHETYPES.mauler,
      choose([ENEMY_ARCHETYPES.skimmer, ENEMY_ARCHETYPES.scuttler]),
    ],
  },
];

const ENDGAME_TEMPLATES: WaveTemplate[] = [
  {
    id: 'siege-screen',
    label: 'Siege Screen',
    highlight: true,
    buildWave: ({ choose }) => [
      ENEMY_ARCHETYPES.bulwark,
      ENEMY_ARCHETYPES.bulwark,
      ENEMY_ARCHETYPES.hexcaster,
      ENEMY_ARCHETYPES.hexcaster,
      ENEMY_ARCHETYPES.harrier,
      choose([ENEMY_ARCHETYPES.crusher, ENEMY_ARCHETYPES.skimmer]),
    ],
  },
  {
    id: 'collapse-pack',
    label: 'Collapse Pack',
    highlight: true,
    buildWave: ({ choose }) => [
      ENEMY_ARCHETYPES.crusher,
      ENEMY_ARCHETYPES.harrier,
      ENEMY_ARCHETYPES.harrier,
      ENEMY_ARCHETYPES.mauler,
      ENEMY_ARCHETYPES.mauler,
      choose([ENEMY_ARCHETYPES.skimmer, ENEMY_ARCHETYPES.scuttler]),
    ],
  },
  {
    id: 'crossfire-wall',
    label: 'Crossfire Wall',
    highlight: true,
    buildWave: ({ choose }) => [
      ENEMY_ARCHETYPES.bulwark,
      ENEMY_ARCHETYPES.hexcaster,
      ENEMY_ARCHETYPES.hexcaster,
      ENEMY_ARCHETYPES.skimmer,
      ENEMY_ARCHETYPES.harrier,
      choose([ENEMY_ARCHETYPES.crusher, ENEMY_ARCHETYPES.mauler]),
    ],
  },
];

const STAGE_RULES: StageRule[] = [
  {
    untilMs: OPENING_STAGE_END_MS,
    minCount: 3,
    maxCount: 4,
    fallbackPool: [
      { archetype: ENEMY_ARCHETYPES.scuttler, weight: 22 },
      { archetype: ENEMY_ARCHETYPES.skimmer, weight: 20 },
      { archetype: ENEMY_ARCHETYPES.harrier, weight: 18 },
      { archetype: ENEMY_ARCHETYPES.mauler, weight: 24 },
      { archetype: ENEMY_ARCHETYPES.crusher, weight: 16 },
    ],
    templates: OPENING_TEMPLATES,
  },
  {
    untilMs: EARLY_RAMP_STAGE_END_MS,
    minCount: 4,
    maxCount: 5,
    fallbackPool: [
      { archetype: ENEMY_ARCHETYPES.scuttler, weight: 12 },
      { archetype: ENEMY_ARCHETYPES.skimmer, weight: 18 },
      { archetype: ENEMY_ARCHETYPES.harrier, weight: 18 },
      { archetype: ENEMY_ARCHETYPES.mauler, weight: 24 },
      { archetype: ENEMY_ARCHETYPES.crusher, weight: 16 },
      { archetype: ENEMY_ARCHETYPES.bulwark, weight: 12 },
    ],
    templates: EARLY_RAMP_TEMPLATES,
  },
  {
    untilMs: 240000,
    minCount: 4,
    maxCount: 6,
    fallbackPool: [
      { archetype: ENEMY_ARCHETYPES.scuttler, weight: 10 },
      { archetype: ENEMY_ARCHETYPES.skimmer, weight: 16 },
      { archetype: ENEMY_ARCHETYPES.harrier, weight: 16 },
      { archetype: ENEMY_ARCHETYPES.mauler, weight: 20 },
      { archetype: ENEMY_ARCHETYPES.crusher, weight: 16 },
      { archetype: ENEMY_ARCHETYPES.bulwark, weight: 12 },
      { archetype: ENEMY_ARCHETYPES.hexcaster, weight: 10 },
    ],
    templates: MID_STAGE_TEMPLATES,
  },
  {
    untilMs: 420000,
    minCount: 5,
    maxCount: 7,
    fallbackPool: [
      { archetype: ENEMY_ARCHETYPES.scuttler, weight: 8 },
      { archetype: ENEMY_ARCHETYPES.skimmer, weight: 12 },
      { archetype: ENEMY_ARCHETYPES.harrier, weight: 14 },
      { archetype: ENEMY_ARCHETYPES.mauler, weight: 18 },
      { archetype: ENEMY_ARCHETYPES.crusher, weight: 18 },
      { archetype: ENEMY_ARCHETYPES.bulwark, weight: 14 },
      { archetype: ENEMY_ARCHETYPES.hexcaster, weight: 16 },
    ],
    templates: LATE_STAGE_TEMPLATES,
  },
  {
    untilMs: 600000,
    minCount: 6,
    maxCount: 8,
    fallbackPool: [
      { archetype: ENEMY_ARCHETYPES.skimmer, weight: 10 },
      { archetype: ENEMY_ARCHETYPES.harrier, weight: 12 },
      { archetype: ENEMY_ARCHETYPES.mauler, weight: 16 },
      { archetype: ENEMY_ARCHETYPES.crusher, weight: 18 },
      { archetype: ENEMY_ARCHETYPES.bulwark, weight: 18 },
      { archetype: ENEMY_ARCHETYPES.hexcaster, weight: 18 },
      { archetype: ENEMY_ARCHETYPES.scuttler, weight: 8 },
    ],
    templates: ENDGAME_TEMPLATES,
  },
  {
    untilMs: RUN_TARGET_DURATION_MS,
    minCount: 7,
    maxCount: 10,
    fallbackPool: [
      { archetype: ENEMY_ARCHETYPES.skimmer, weight: 8 },
      { archetype: ENEMY_ARCHETYPES.harrier, weight: 10 },
      { archetype: ENEMY_ARCHETYPES.mauler, weight: 16 },
      { archetype: ENEMY_ARCHETYPES.crusher, weight: 18 },
      { archetype: ENEMY_ARCHETYPES.bulwark, weight: 18 },
      { archetype: ENEMY_ARCHETYPES.hexcaster, weight: 22 },
      { archetype: ENEMY_ARCHETYPES.scuttler, weight: 8 },
    ],
    templates: ENDGAME_TEMPLATES,
  },
];

const ELITE_ROTATION: EnemyArchetype[] = [ENEMY_ARCHETYPES.overlord, ENEMY_ARCHETYPES.riftblade];

export class SpawnDirector {
  private nextEliteSpawnAtMs = FIRST_ELITE_SPAWN_AT_MS;
  private nextEliteIndex = 0;
  private nextMinibossSpawnAtMs = MINIBOSS_SPAWN_TIME_MS;
  private bossSpawned = false;
  private lastWaveTemplateId = '';
  private lastWaveTemplateLabel = '';
  private lastWaveTemplateHighlight = false;

  getNextEliteSpawnAtMs(): number {
    return this.nextEliteSpawnAtMs;
  }

  getNextMinibossSpawnAtMs(): number {
    return this.nextMinibossSpawnAtMs;
  }

  hasBossSpawned(): boolean {
    return this.bossSpawned;
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

  nextWave(elapsedMs: number): SpawnWaveResult {
    if (elapsedMs >= RUN_TARGET_DURATION_MS) {
      return { wave: [], templateId: '', templateLabel: '', templateHighlight: false };
    }

    const stage = this.getStageRule(elapsedMs);
    const normalWaveResult = this.buildStageWave(stage);
    const wave = [...normalWaveResult.wave];

    this.lastWaveTemplateId = normalWaveResult.templateId;
    this.lastWaveTemplateLabel = normalWaveResult.templateLabel;
    this.lastWaveTemplateHighlight = normalWaveResult.templateHighlight;

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

    return {
      wave,
      templateId: normalWaveResult.templateId,
      templateLabel: normalWaveResult.templateLabel,
      templateHighlight: normalWaveResult.templateHighlight,
    };
  }

  private getStageRule(elapsedMs: number): StageRule {
    return STAGE_RULES.find((stage) => elapsedMs < stage.untilMs) ?? STAGE_RULES[STAGE_RULES.length - 1];
  }

  private buildStageWave(stage: StageRule): SpawnWaveResult {
    const template = chooseOne(stage.templates);
    const context: WaveTemplateContext = {
      choose: chooseOne,
    };

    const wave = [...template.buildWave(context)];

    while (wave.length < stage.minCount) {
      wave.push(this.pickWeightedArchetype(stage.fallbackPool));
    }

    if (wave.length < stage.maxCount && Phaser.Math.Between(0, 100) < 55) {
      wave.push(this.pickWeightedArchetype(stage.fallbackPool));
    }

    if (wave.length < stage.maxCount && Phaser.Math.Between(0, 100) < 18) {
      wave.push(this.pickWeightedArchetype(stage.fallbackPool));
    }

    return {
      wave: wave.slice(0, stage.maxCount),
      templateId: template.id,
      templateLabel: template.label,
      templateHighlight: Boolean(template.highlight),
    };
  }

  private pickWeightedArchetype(pool: WeightedEntry[]): EnemyArchetype {
    const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Phaser.Math.Between(1, totalWeight);

    for (const entry of pool) {
      roll -= entry.weight;
      if (roll <= 0) {
        return entry.archetype;
      }
    }

    return pool[pool.length - 1].archetype;
  }
}
