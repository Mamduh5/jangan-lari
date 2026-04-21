import Phaser from 'phaser';
import { BOSS_TRIGGER_TIME_MS, RUN_TARGET_DURATION_MS } from '../config/constants';
import { ENEMY_ARCHETYPES, type EnemyArchetype } from '../data/enemies';

type PressureBeatDefinition = {
  id: string;
  label: string;
  objective: string;
  durationMs: number;
};

type WaveTemplate = {
  id: string;
  label: string;
  wave: EnemyArchetype[];
  pressureBeat?: PressureBeatDefinition;
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

export type PressureBeatSnapshot = {
  active: boolean;
  id: string;
  label: string;
  objective: string;
  remainingMs: number;
};

const MID_PRESSURE_TEMPLATE: WaveTemplate = {
  id: 'mid-siege-crossfire',
  label: 'Siege Crossfire',
  wave: [ENEMY_ARCHETYPES.bulwark, ENEMY_ARCHETYPES.harrier, ENEMY_ARCHETYPES.shooter, ENEMY_ARCHETYPES.skimmer],
  pressureBeat: {
    id: 'mid-siege-crossfire',
    label: 'Siege Crossfire',
    objective: 'Break the layered push before it boxes in your lane.',
    durationMs: 18000,
  },
};

const PRE_BOSS_TEMPLATE: WaveTemplate = {
  id: 'boss-lead-in',
  label: 'Boss Lead-In',
  wave: [ENEMY_ARCHETYPES.bulwark, ENEMY_ARCHETYPES.hexcaster, ENEMY_ARCHETYPES.skimmer, ENEMY_ARCHETYPES.anchor],
  pressureBeat: {
    id: 'boss-lead-in',
    label: 'Boss Lead-In',
    objective: 'Stabilize the lane before the Behemoth arrives.',
    durationMs: 18000,
  },
};

const STAGES: StageRule[] = [
  {
    untilMs: 90_000,
    templates: [
      {
        id: 'space-pressure',
        label: 'Space Pressure',
        wave: [ENEMY_ARCHETYPES.swarmer, ENEMY_ARCHETYPES.swarmer],
      },
      {
        id: 'first-anchor',
        label: 'First Anchor',
        wave: [ENEMY_ARCHETYPES.anchor],
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
      {
        id: 'strafe-screen',
        label: 'Strafe Screen',
        wave: [ENEMY_ARCHETYPES.skimmer, ENEMY_ARCHETYPES.shooter, ENEMY_ARCHETYPES.swarmer],
      },
      {
        id: 'harrier-screen',
        label: 'Harrier Screen',
        wave: [ENEMY_ARCHETYPES.harrier, ENEMY_ARCHETYPES.shooter, ENEMY_ARCHETYPES.swarmer],
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
      {
        id: 'dash-pocket',
        label: 'Dash Pocket',
        wave: [ENEMY_ARCHETYPES.crusher, ENEMY_ARCHETYPES.shooter, ENEMY_ARCHETYPES.swarmer],
      },
      {
        id: 'rot-front',
        label: 'Rot Front',
        wave: [ENEMY_ARCHETYPES.bulwark, ENEMY_ARCHETYPES.harrier, ENEMY_ARCHETYPES.hexcaster],
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
        id: 'fortress-break',
        label: 'Fortress Break',
        wave: [
          ENEMY_ARCHETYPES.bulwark,
          ENEMY_ARCHETYPES.crusher,
          ENEMY_ARCHETYPES.hexcaster,
          ENEMY_ARCHETYPES.shooter,
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
      {
        id: 'collapse-and-strafe',
        label: 'Collapse And Strafe',
        wave: [
          ENEMY_ARCHETYPES.crusher,
          ENEMY_ARCHETYPES.skimmer,
          ENEMY_ARCHETYPES.shooter,
          ENEMY_ARCHETYPES.anchor,
        ],
      },
      {
        id: 'execution-pocket',
        label: 'Execution Pocket',
        wave: [
          ENEMY_ARCHETYPES.bulwark,
          ENEMY_ARCHETYPES.harrier,
          ENEMY_ARCHETYPES.hexcaster,
          ENEMY_ARCHETYPES.shooter,
        ],
      },
    ],
  },
];

export class SpawnDirector {
  private lastWaveTemplateId = '';
  private lastWaveTemplateLabel = '';
  private lastWaveTemplateHighlight = false;
  private activePressureBeat: (PressureBeatDefinition & { untilMs: number }) | null = null;
  private midPressureTriggered = false;
  private preBossPressureTriggered = false;

  getLastWaveTemplateId(): string {
    return this.lastWaveTemplateId;
  }

  getLastWaveTemplateLabel(): string {
    return this.lastWaveTemplateLabel;
  }

  getLastWaveTemplateHighlight(): boolean {
    return this.lastWaveTemplateHighlight;
  }

  getPressureBeat(elapsedMs: number): PressureBeatSnapshot {
    this.updatePressureBeat(elapsedMs);

    if (!this.activePressureBeat) {
      return {
        active: false,
        id: '',
        label: '',
        objective: '',
        remainingMs: 0,
      };
    }

    return {
      active: true,
      id: this.activePressureBeat.id,
      label: this.activePressureBeat.label,
      objective: this.activePressureBeat.objective,
      remainingMs: Math.max(0, this.activePressureBeat.untilMs - elapsedMs),
    };
  }

  clearPressureBeat(): void {
    this.activePressureBeat = null;
  }

  nextWave(elapsedMs: number): SpawnWaveResult {
    this.updatePressureBeat(elapsedMs);

    const leadInThreshold = Math.max(240_000, BOSS_TRIGGER_TIME_MS - 24_000);
    if (!this.midPressureTriggered && elapsedMs >= 180_000 && elapsedMs < leadInThreshold) {
      this.midPressureTriggered = true;
      return this.activateTemplate(MID_PRESSURE_TEMPLATE, elapsedMs);
    }

    if (!this.preBossPressureTriggered && elapsedMs >= leadInThreshold && elapsedMs < BOSS_TRIGGER_TIME_MS) {
      this.preBossPressureTriggered = true;
      return this.activateTemplate(PRE_BOSS_TEMPLATE, elapsedMs);
    }

    const stage = STAGES.find((entry) => elapsedMs < entry.untilMs) ?? STAGES[STAGES.length - 1];
    const template = Phaser.Utils.Array.GetRandom(stage.templates);
    return this.activateTemplate(template, elapsedMs);
  }

  private activateTemplate(template: WaveTemplate, elapsedMs: number): SpawnWaveResult {
    this.lastWaveTemplateId = template.id;
    this.lastWaveTemplateLabel = template.label;
    this.lastWaveTemplateHighlight = Boolean(template.pressureBeat);

    if (template.pressureBeat) {
      this.activePressureBeat = {
        ...template.pressureBeat,
        untilMs: elapsedMs + template.pressureBeat.durationMs,
      };
    }

    return {
      wave: [...template.wave],
      templateId: template.id,
      templateLabel: template.label,
      templateHighlight: Boolean(template.pressureBeat),
    };
  }

  private updatePressureBeat(elapsedMs: number): void {
    if (!this.activePressureBeat) {
      return;
    }
    if (elapsedMs >= this.activePressureBeat.untilMs) {
      this.activePressureBeat = null;
    }
  }
}
