import type { EnemyArchetypeId } from '../data/enemies';

export type MapBuffType = 'shield-pulse';

export type BuffShrineBalance = {
  earliestTimeMs: number;
  intervalMs: number;
  durationMs: number;
  shrineRadius: number;
  claimRadius: number;
  buffType: MapBuffType;
  buffDurationMs: number;
  pulseCooldownRefundMs: number;
  shieldInvulnerabilityMs: number;
  enemyPressure: EnemyArchetypeId[];
  pressureSpawnDistance: number;
  safeDistanceFromPlayer: number;
  edgePadding: number;
  maxActiveEvents: number;
  fillColor: number;
  strokeColor: number;
  labelColor: string;
};

export const BUFF_SHRINE_EVENT: BuffShrineBalance = {
  earliestTimeMs: 135000,
  intervalMs: 95000,
  durationMs: 22000,
  shrineRadius: 34,
  claimRadius: 58,
  buffType: 'shield-pulse',
  buffDurationMs: 4200,
  pulseCooldownRefundMs: 8000,
  shieldInvulnerabilityMs: 4200,
  enemyPressure: ['mauler', 'skimmer', 'hexcaster'],
  pressureSpawnDistance: 260,
  safeDistanceFromPlayer: 560,
  edgePadding: 180,
  maxActiveEvents: 1,
  fillColor: 0x38bdf8,
  strokeColor: 0xe0f2fe,
  labelColor: '#e0f2fe',
};

export const MAP_EVENT_ENCOUNTER_BUFFER_MS = 9000;
