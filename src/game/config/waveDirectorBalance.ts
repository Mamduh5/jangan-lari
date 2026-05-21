import type { EnemyArchetypeId } from '../data/enemies';

export type EnemyRole = 'fodder' | 'fast' | 'interceptor' | 'blocker' | 'ranged' | 'charger' | 'elite' | 'bossOwned';

export type WeightedEnemyEntry = {
  id: EnemyArchetypeId;
  weight: number;
};

export type WaveTemplateDefinition = {
  id: string;
  label: string;
  highlight?: boolean;
  formation: 'loose' | 'ring-breakout' | 'pincer' | 'sweep-wall';
  composition: EnemyArchetypeId[];
  flexPool?: WeightedEnemyEntry[];
};

export type WaveDirectorWindow = {
  id: string;
  startsAtMs: number;
  untilMs: number;
  minCount: number;
  maxCount: number;
  densityScalePerMinute: number;
  rangedMax: number;
  fallbackPool: WeightedEnemyEntry[];
  templates: WaveTemplateDefinition[];
};

export const ENEMY_ROLE_TAGS: Record<EnemyArchetypeId, EnemyRole[]> = {
  scuttler: ['fodder'],
  skimmer: ['interceptor'],
  harrier: ['interceptor'],
  mauler: ['blocker'],
  crusher: ['charger'],
  bulwark: ['blocker'],
  hexcaster: ['ranged'],
  overlord: ['elite', 'charger'],
  riftblade: ['elite', 'fast'],
  dreadnought: ['elite', 'charger', 'blocker'],
  behemoth: ['elite', 'charger'],
};

export const WAVE_FORMATION_ENABLE_TIME_MS = 240000;
export const WAVE_FORMATION_COOLDOWN_MS = 36000;
export const WAVE_FORMATION_RETRY_MS = 3600;
export const WAVE_TEMPLATE_ALERT_COOLDOWN_MS = 7000;

export const WAVE_DIRECTOR_WINDOWS: WaveDirectorWindow[] = [
  {
    id: 'learn-fodder',
    startsAtMs: 0,
    untilMs: 60000,
    minCount: 2,
    maxCount: 3,
    densityScalePerMinute: 0,
    rangedMax: 0,
    fallbackPool: [{ id: 'scuttler', weight: 100 }],
    templates: [
      {
        id: 'scuttler-basics',
        label: 'Scuttler Basics',
        formation: 'loose',
        composition: ['scuttler', 'scuttler'],
        flexPool: [{ id: 'scuttler', weight: 100 }],
      },
    ],
  },
  {
    id: 'fast-spacing',
    startsAtMs: 60000,
    untilMs: 120000,
    minCount: 3,
    maxCount: 4,
    densityScalePerMinute: 0.15,
    rangedMax: 0,
    fallbackPool: [
      { id: 'scuttler', weight: 55 },
      { id: 'skimmer', weight: 30 },
      { id: 'harrier', weight: 15 },
    ],
    templates: [
      {
        id: 'skimmer-spacing',
        label: 'Skimmer Spacing',
        formation: 'loose',
        composition: ['scuttler', 'scuttler', 'skimmer'],
        flexPool: [
          { id: 'scuttler', weight: 60 },
          { id: 'skimmer', weight: 40 },
        ],
      },
      {
        id: 'fast-tail',
        label: 'Intercept Pincer',
        formation: 'pincer',
        composition: ['skimmer', 'harrier', 'scuttler'],
        flexPool: [
          { id: 'scuttler', weight: 45 },
          { id: 'skimmer', weight: 35 },
          { id: 'harrier', weight: 20 },
        ],
      },
    ],
  },
  {
    id: 'blocker-pathing',
    startsAtMs: 120000,
    untilMs: 180000,
    minCount: 3,
    maxCount: 5,
    densityScalePerMinute: 0.25,
    rangedMax: 0,
    fallbackPool: [
      { id: 'scuttler', weight: 35 },
      { id: 'skimmer', weight: 22 },
      { id: 'mauler', weight: 28 },
      { id: 'crusher', weight: 15 },
    ],
    templates: [
      {
        id: 'mauler-screen',
        label: 'Mauler Screen',
        highlight: true,
        formation: 'sweep-wall',
        composition: ['mauler', 'scuttler', 'scuttler', 'skimmer'],
        flexPool: [
          { id: 'scuttler', weight: 55 },
          { id: 'mauler', weight: 45 },
        ],
      },
      {
        id: 'crusher-pocket',
        label: 'Crusher Pocket',
        highlight: true,
        formation: 'pincer',
        composition: ['crusher', 'mauler', 'scuttler'],
        flexPool: [
          { id: 'scuttler', weight: 50 },
          { id: 'skimmer', weight: 30 },
          { id: 'mauler', weight: 20 },
        ],
      },
    ],
  },
  {
    id: 'ranged-priority',
    startsAtMs: 180000,
    untilMs: 240000,
    minCount: 4,
    maxCount: 5,
    densityScalePerMinute: 0.35,
    rangedMax: 1,
    fallbackPool: [
      { id: 'scuttler', weight: 25 },
      { id: 'skimmer', weight: 18 },
      { id: 'mauler', weight: 22 },
      { id: 'crusher', weight: 16 },
      { id: 'hexcaster', weight: 19 },
    ],
    templates: [
      {
        id: 'caster-screen',
        label: 'Caster Screen',
        highlight: true,
        formation: 'pincer',
        composition: ['hexcaster', 'mauler', 'scuttler', 'skimmer'],
        flexPool: [
          { id: 'scuttler', weight: 45 },
          { id: 'mauler', weight: 35 },
          { id: 'skimmer', weight: 20 },
        ],
      },
      {
        id: 'charger-caster',
        label: 'Charger Caster',
        highlight: true,
        formation: 'ring-breakout',
        composition: ['hexcaster', 'crusher', 'scuttler', 'scuttler'],
        flexPool: [
          { id: 'scuttler', weight: 55 },
          { id: 'crusher', weight: 25 },
          { id: 'skimmer', weight: 20 },
        ],
      },
    ],
  },
  {
    id: 'mixed-pressure',
    startsAtMs: 240000,
    untilMs: 420000,
    minCount: 4,
    maxCount: 6,
    densityScalePerMinute: 0.45,
    rangedMax: 2,
    fallbackPool: [
      { id: 'scuttler', weight: 16 },
      { id: 'skimmer', weight: 14 },
      { id: 'harrier', weight: 14 },
      { id: 'mauler', weight: 18 },
      { id: 'crusher', weight: 16 },
      { id: 'bulwark', weight: 12 },
      { id: 'hexcaster', weight: 10 },
    ],
    templates: [
      {
        id: 'wall-crossfire',
        label: 'Wall Crossfire',
        highlight: true,
        formation: 'sweep-wall',
        composition: ['bulwark', 'hexcaster', 'crusher', 'skimmer'],
        flexPool: [
          { id: 'scuttler', weight: 30 },
          { id: 'skimmer', weight: 25 },
          { id: 'mauler', weight: 22 },
          { id: 'hexcaster', weight: 23 },
        ],
      },
      {
        id: 'fast-and-fodder',
        label: 'Intercept Flood',
        formation: 'pincer',
        composition: ['harrier', 'skimmer', 'mauler', 'scuttler', 'scuttler'],
        flexPool: [
          { id: 'scuttler', weight: 45 },
          { id: 'harrier', weight: 25 },
          { id: 'skimmer', weight: 20 },
          { id: 'mauler', weight: 10 },
        ],
      },
      {
        id: 'charger-priority',
        label: 'Charger Priority',
        highlight: true,
        formation: 'ring-breakout',
        composition: ['crusher', 'hexcaster', 'mauler', 'scuttler'],
        flexPool: [
          { id: 'scuttler', weight: 45 },
          { id: 'crusher', weight: 25 },
          { id: 'mauler', weight: 30 },
        ],
      },
    ],
  },
  {
    id: 'late-role-bundles',
    startsAtMs: 420000,
    untilMs: 900000,
    minCount: 5,
    maxCount: 7,
    densityScalePerMinute: 0.6,
    rangedMax: 2,
    fallbackPool: [
      { id: 'scuttler', weight: 10 },
      { id: 'skimmer', weight: 12 },
      { id: 'harrier', weight: 12 },
      { id: 'mauler', weight: 16 },
      { id: 'crusher', weight: 16 },
      { id: 'bulwark', weight: 18 },
      { id: 'hexcaster', weight: 16 },
    ],
    templates: [
      {
        id: 'siege-battery',
        label: 'Siege Battery',
        highlight: true,
        formation: 'sweep-wall',
        composition: ['bulwark', 'bulwark', 'hexcaster', 'hexcaster', 'harrier'],
        flexPool: [
          { id: 'mauler', weight: 35 },
          { id: 'crusher', weight: 25 },
          { id: 'scuttler', weight: 25 },
          { id: 'skimmer', weight: 15 },
        ],
      },
      {
        id: 'collapse-pack',
        label: 'Collapse Pack',
        highlight: true,
        formation: 'ring-breakout',
        composition: ['crusher', 'harrier', 'skimmer', 'mauler', 'scuttler'],
        flexPool: [
          { id: 'scuttler', weight: 30 },
          { id: 'mauler', weight: 28 },
          { id: 'crusher', weight: 22 },
          { id: 'harrier', weight: 20 },
        ],
      },
      {
        id: 'crossfire-wall',
        label: 'Crossfire Wall',
        highlight: true,
        formation: 'pincer',
        composition: ['bulwark', 'hexcaster', 'hexcaster', 'skimmer', 'crusher'],
        flexPool: [
          { id: 'scuttler', weight: 35 },
          { id: 'mauler', weight: 35 },
          { id: 'harrier', weight: 30 },
        ],
      },
    ],
  },
];

export function getWaveDirectorWindow(elapsedMs: number): WaveDirectorWindow {
  return WAVE_DIRECTOR_WINDOWS.find((window) => elapsedMs >= window.startsAtMs && elapsedMs < window.untilMs)
    ?? WAVE_DIRECTOR_WINDOWS[WAVE_DIRECTOR_WINDOWS.length - 1];
}
