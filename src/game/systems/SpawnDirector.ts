import { BOSS_TRIGGER_TIME_MS, RUN_TARGET_DURATION_MS } from '../config/constants';
import { ENEMY_ARCHETYPES, type EnemyArchetype } from '../data/enemies';

type PressureBeatDefinition = {
  id: string;
  type: PressureBeatType;
  label: string;
  objective: string;
  durationMs: number;
};

export type PressureBeatType = 'ambient' | 'hold-space' | 'priority-execution' | 'stabilize-collapse' | 'state-break';
export type PressureBeatEventType = Exclude<PressureBeatType, 'ambient'>;

type WaveTemplate = {
  id: string;
  label: string;
  wave: EnemyArchetype[];
  pressureBeat?: PressureBeatDefinition;
  eventType?: PressureBeatEventType;
  eventTitle?: string;
  eventObjective?: string;
  eventTargetIndex?: number;
  eventTargetColor?: number;
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
  eventType: PressureBeatEventType | null;
  eventTitle: string;
  eventObjective: string;
  eventDurationMs: number;
  eventTargetIndex: number | null;
  eventTargetColor: number | null;
};

export type PressureBeatSnapshot = {
  active: boolean;
  id: string;
  type: PressureBeatType | '';
  label: string;
  objective: string;
  remainingMs: number;
};

function pickRandomTemplate(templates: WaveTemplate[]): WaveTemplate {
  if (templates.length === 0) {
    throw new Error('SpawnDirector requires at least one wave template per stage.');
  }

  return templates[Math.floor(Math.random() * templates.length)]!;
}

const MID_PRESSURE_TEMPLATE: WaveTemplate = {
  id: 'mid-siege-crossfire',
  label: 'Siege Crossfire',
  wave: [ENEMY_ARCHETYPES.bulwark, ENEMY_ARCHETYPES.harrier, ENEMY_ARCHETYPES.shooter, ENEMY_ARCHETYPES.skimmer],
  pressureBeat: {
    id: 'mid-siege-crossfire',
    type: 'ambient',
    label: 'Siege Crossfire',
    objective: 'Break the layered push before it boxes in your lane.',
    durationMs: 18000,
  },
};

const ANTI_RAMP_TEMPLATE: WaveTemplate = {
  id: 'ramp-check',
  label: 'Ramp Check',
  wave: [ENEMY_ARCHETYPES.harrier, ENEMY_ARCHETYPES.shooter, ENEMY_ARCHETYPES.shooter, ENEMY_ARCHETYPES.swarmer],
  eventType: 'priority-execution',
  eventTitle: 'Priority Execution',
  eventObjective: 'Break the ramp target before it turns the wave sharper.',
  eventTargetIndex: 0,
  eventTargetColor: 0xfef08a,
  pressureBeat: {
    id: 'ramp-check',
    type: 'priority-execution',
    label: 'Ramp Check',
    objective: 'Execute the ramp target before it sharpens the crossfire.',
    durationMs: 16000,
  },
};

const STABILIZE_TEMPLATE: WaveTemplate = {
  id: 'stabilize-pocket',
  label: 'Stabilize Pocket',
  wave: [ENEMY_ARCHETYPES.anchor, ENEMY_ARCHETYPES.shooter, ENEMY_ARCHETYPES.swarmer, ENEMY_ARCHETYPES.swarmer],
  eventType: 'stabilize-collapse',
  eventTitle: 'Stabilize Pocket',
  eventObjective: 'Collapse the messy cluster before it spreads across the lane.',
  eventTargetIndex: 0,
  eventTargetColor: 0xfb7185,
  pressureBeat: {
    id: 'stabilize-pocket',
    type: 'stabilize-collapse',
    label: 'Stabilize Pocket',
    objective: 'Collapse the messy cluster and recover space before the next wave.',
    durationMs: 16000,
  },
};

const ANTI_TURTLE_TEMPLATE: WaveTemplate = {
  id: 'bunker-break',
  label: 'Hold Space',
  wave: [ENEMY_ARCHETYPES.crusher, ENEMY_ARCHETYPES.hexcaster, ENEMY_ARCHETYPES.shooter, ENEMY_ARCHETYPES.bulwark],
  eventType: 'hold-space',
  eventTitle: 'Hold Space',
  eventObjective: 'Stand near the breach anchor or break it with a payoff.',
  eventTargetIndex: 3,
  eventTargetColor: 0xfb923c,
  pressureBeat: {
    id: 'bunker-break',
    type: 'hold-space',
    label: 'Hold Space',
    objective: 'Hold near the breach anchor or break it with a Guard, Mark, or Ailment payoff.',
    durationMs: 18000,
  },
};

const EXECUTION_WINDOW_TEMPLATE: WaveTemplate = {
  id: 'execution-window',
  label: 'Execution Window',
  wave: [ENEMY_ARCHETYPES.bulwark, ENEMY_ARCHETYPES.harrier, ENEMY_ARCHETYPES.hexcaster, ENEMY_ARCHETYPES.shooter],
  eventType: 'state-break',
  eventTitle: 'State Break',
  eventObjective: 'Break the conduit with a hero payoff before it calls reinforcements.',
  pressureBeat: {
    id: 'execution-window',
    type: 'state-break',
    label: 'Execution Window',
    objective: 'Break the conduit with Guard, Mark, or Ailment payoff before the shell hardens.',
    durationMs: 18000,
  },
  eventTargetIndex: 2,
  eventTargetColor: 0xfbbf24,
};

const PRE_BOSS_TEMPLATE: WaveTemplate = {
  id: 'boss-lead-in',
  label: 'Boss Lead-In',
  wave: [ENEMY_ARCHETYPES.bulwark, ENEMY_ARCHETYPES.hexcaster, ENEMY_ARCHETYPES.skimmer, ENEMY_ARCHETYPES.anchor],
  pressureBeat: {
    id: 'boss-lead-in',
    type: 'ambient',
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
  private antiRampTriggered = false;
  private stabilizeTriggered = false;
  private midPressureTriggered = false;
  private antiTurtleTriggered = false;
  private executionWindowTriggered = false;
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
        type: '',
        label: '',
        objective: '',
        remainingMs: 0,
      };
    }

    return {
      active: true,
      id: this.activePressureBeat.id,
      type: this.activePressureBeat.type,
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

    if (!this.antiRampTriggered && elapsedMs >= 102_000 && elapsedMs < 120_000) {
      this.antiRampTriggered = true;
      return this.activateTemplate(ANTI_RAMP_TEMPLATE, elapsedMs);
    }

    if (!this.stabilizeTriggered && elapsedMs >= 156_000 && elapsedMs < 174_000) {
      this.stabilizeTriggered = true;
      return this.activateTemplate(STABILIZE_TEMPLATE, elapsedMs);
    }

    const leadInThreshold = Math.max(240_000, BOSS_TRIGGER_TIME_MS - 24_000);
    if (!this.midPressureTriggered && elapsedMs >= 180_000 && elapsedMs < leadInThreshold) {
      this.midPressureTriggered = true;
      return this.activateTemplate(MID_PRESSURE_TEMPLATE, elapsedMs);
    }

    if (!this.antiTurtleTriggered && elapsedMs >= 222_000 && elapsedMs < 240_000) {
      this.antiTurtleTriggered = true;
      return this.activateTemplate(ANTI_TURTLE_TEMPLATE, elapsedMs);
    }

    if (!this.executionWindowTriggered && elapsedMs >= 264_000 && elapsedMs < leadInThreshold) {
      this.executionWindowTriggered = true;
      return this.activateTemplate(EXECUTION_WINDOW_TEMPLATE, elapsedMs);
    }

    if (!this.preBossPressureTriggered && elapsedMs >= leadInThreshold && elapsedMs < BOSS_TRIGGER_TIME_MS) {
      this.preBossPressureTriggered = true;
      return this.activateTemplate(PRE_BOSS_TEMPLATE, elapsedMs);
    }

    const stage = STAGES.find((entry) => elapsedMs < entry.untilMs) ?? STAGES[STAGES.length - 1];
    const template = pickRandomTemplate(stage.templates);
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
      eventType: template.eventType ?? null,
      eventTitle: template.eventTitle ?? '',
      eventObjective: template.eventObjective ?? '',
      eventDurationMs: template.pressureBeat?.durationMs ?? 0,
      eventTargetIndex: template.eventTargetIndex ?? null,
      eventTargetColor: template.eventTargetColor ?? null,
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
