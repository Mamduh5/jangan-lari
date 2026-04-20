import Phaser from 'phaser';
import { RUN_TARGET_DURATION_MS } from '../config/constants';
import { ENEMY_ARCHETYPES, type EnemyArchetype } from '../data/enemies';

type WaveTemplate = {
  id: string;
  label: string;
  wave: EnemyArchetype[];
};

type StageRule = {
  untilMs: number;
  templates: WaveTemplate[];
};

export type SpawnWaveResult = {
  wave: EnemyArchetype[];
  templateId: string;
  templateLabel: string;
  templateHighlight: boolean;
};

const STAGES: StageRule[] = [
  {
    untilMs: 75_000,
    templates: [
      {
        id: 'space-pressure',
        label: 'Space Pressure',
        wave: [ENEMY_ARCHETYPES.swarmer, ENEMY_ARCHETYPES.swarmer, ENEMY_ARCHETYPES.swarmer],
      },
      {
        id: 'first-anchor',
        label: 'First Anchor',
        wave: [ENEMY_ARCHETYPES.anchor, ENEMY_ARCHETYPES.swarmer],
      },
      {
        id: 'first-shots',
        label: 'First Shots',
        wave: [ENEMY_ARCHETYPES.shooter, ENEMY_ARCHETYPES.swarmer],
      },
    ],
  },
  {
    untilMs: 180_000,
    templates: [
      {
        id: 'mixed-lane',
        label: 'Mixed Lane',
        wave: [ENEMY_ARCHETYPES.anchor, ENEMY_ARCHETYPES.shooter, ENEMY_ARCHETYPES.swarmer],
      },
      {
        id: 'cross-pressure',
        label: 'Cross Pressure',
        wave: [ENEMY_ARCHETYPES.shooter, ENEMY_ARCHETYPES.shooter, ENEMY_ARCHETYPES.swarmer],
      },
      {
        id: 'wall-and-rush',
        label: 'Wall And Rush',
        wave: [ENEMY_ARCHETYPES.anchor, ENEMY_ARCHETYPES.swarmer, ENEMY_ARCHETYPES.swarmer],
      },
    ],
  },
  {
    untilMs: 300_000,
    templates: [
      {
        id: 'priority-pocket',
        label: 'Priority Pocket',
        wave: [ENEMY_ARCHETYPES.anchor, ENEMY_ARCHETYPES.shooter, ENEMY_ARCHETYPES.shooter],
      },
      {
        id: 'hold-the-line',
        label: 'Hold The Line',
        wave: [ENEMY_ARCHETYPES.anchor, ENEMY_ARCHETYPES.anchor, ENEMY_ARCHETYPES.swarmer],
      },
      {
        id: 'wide-collapse',
        label: 'Wide Collapse',
        wave: [
          ENEMY_ARCHETYPES.swarmer,
          ENEMY_ARCHETYPES.swarmer,
          ENEMY_ARCHETYPES.shooter,
          ENEMY_ARCHETYPES.anchor,
        ],
      },
    ],
  },
  {
    untilMs: RUN_TARGET_DURATION_MS,
    templates: [
      {
        id: 'layered-screen',
        label: 'Layered Screen',
        wave: [
          ENEMY_ARCHETYPES.anchor,
          ENEMY_ARCHETYPES.shooter,
          ENEMY_ARCHETYPES.shooter,
          ENEMY_ARCHETYPES.swarmer,
        ],
      },
      {
        id: 'double-anchor',
        label: 'Double Anchor',
        wave: [
          ENEMY_ARCHETYPES.anchor,
          ENEMY_ARCHETYPES.anchor,
          ENEMY_ARCHETYPES.shooter,
          ENEMY_ARCHETYPES.swarmer,
        ],
      },
      {
        id: 'surround-and-punish',
        label: 'Surround And Punish',
        wave: [
          ENEMY_ARCHETYPES.shooter,
          ENEMY_ARCHETYPES.shooter,
          ENEMY_ARCHETYPES.swarmer,
          ENEMY_ARCHETYPES.swarmer,
        ],
      },
    ],
  },
];

export class SpawnDirector {
  private lastWaveTemplateId = '';
  private lastWaveTemplateLabel = '';

  getLastWaveTemplateId(): string {
    return this.lastWaveTemplateId;
  }

  getLastWaveTemplateLabel(): string {
    return this.lastWaveTemplateLabel;
  }

  getLastWaveTemplateHighlight(): boolean {
    return false;
  }

  nextWave(elapsedMs: number): SpawnWaveResult {
    const stage = STAGES.find((entry) => elapsedMs < entry.untilMs) ?? STAGES[STAGES.length - 1];
    const template = Phaser.Utils.Array.GetRandom(stage.templates);

    this.lastWaveTemplateId = template.id;
    this.lastWaveTemplateLabel = template.label;

    return {
      wave: [...template.wave],
      templateId: template.id,
      templateLabel: template.label,
      templateHighlight: false,
    };
  }
}
