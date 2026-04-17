import type { EnemyArchetypeId } from '../data/enemies';
import type { WeaponId } from '../data/weapons';

export type CombatImpactCue = {
  x: number;
  y: number;
  color: number;
  startRadius: number;
  endRadius: number;
  durationMs: number;
  alpha: number;
};

export type EnemyCombatResponseProfile = {
  hurtFlashMs: number;
  flinchVelocityScale: number;
  recoilSpeed: number;
  hitScaleX: number;
  hitScaleY: number;
  hitTweenMs: number;
  hitStopMs: number;
  deathBeatMs: number;
  deathScaleX: number;
  deathScaleY: number;
  deathTweenMs: number;
  deathHitStopMs: number;
  cueAlpha: number;
  cueScale: number;
};

export type WeaponCombatResponseProfile = {
  launchScaleX: number;
  launchScaleY: number;
  launchTweenMs: number;
  impactHitStopMs: number;
  cueAlpha: number;
  cueScale: number;
};

type CombatResponseHooks = {
  onHitStopStart?: () => void;
  onHitStopEnd?: () => void;
  onImpactCue?: (cue: CombatImpactCue) => void;
};

type CombatResponseMetrics = {
  hitStopStarts: number;
  hitStopRefreshes: number;
  hitStopSuppressions: number;
};

type CombatImpactResponseOptions = {
  enemyId: EnemyArchetypeId;
  weaponId: WeaponId;
  defeated: boolean;
  x: number;
  y: number;
  color: number;
  radius: number;
};

const LIGHT_STRAFER_RESPONSE: EnemyCombatResponseProfile = {
  hurtFlashMs: 96,
  flinchVelocityScale: 0.62,
  recoilSpeed: 82,
  hitScaleX: 1.1,
  hitScaleY: 0.88,
  hitTweenMs: 84,
  hitStopMs: 8,
  deathBeatMs: 64,
  deathScaleX: 1.22,
  deathScaleY: 0.7,
  deathTweenMs: 66,
  deathHitStopMs: 14,
  cueAlpha: 0.11,
  cueScale: 1.12,
};

const BRUISER_CHASE_RESPONSE: EnemyCombatResponseProfile = {
  hurtFlashMs: 114,
  flinchVelocityScale: 0.66,
  recoilSpeed: 76,
  hitScaleX: 1.12,
  hitScaleY: 0.86,
  hitTweenMs: 92,
  hitStopMs: 10,
  deathBeatMs: 82,
  deathScaleX: 1.26,
  deathScaleY: 0.68,
  deathTweenMs: 84,
  deathHitStopMs: 17,
  cueAlpha: 0.15,
  cueScale: 1.2,
};

const DASH_BRUISER_RESPONSE: EnemyCombatResponseProfile = {
  hurtFlashMs: 118,
  flinchVelocityScale: 0.64,
  recoilSpeed: 72,
  hitScaleX: 1.14,
  hitScaleY: 0.84,
  hitTweenMs: 96,
  hitStopMs: 11,
  deathBeatMs: 88,
  deathScaleX: 1.28,
  deathScaleY: 0.66,
  deathTweenMs: 92,
  deathHitStopMs: 18,
  cueAlpha: 0.16,
  cueScale: 1.24,
};

const ENCOUNTER_MINIBOSS_RESPONSE: EnemyCombatResponseProfile = {
  hurtFlashMs: 132,
  flinchVelocityScale: 0.76,
  recoilSpeed: 48,
  hitScaleX: 1.07,
  hitScaleY: 0.93,
  hitTweenMs: 118,
  hitStopMs: 7,
  deathBeatMs: 126,
  deathScaleX: 1.16,
  deathScaleY: 0.82,
  deathTweenMs: 126,
  deathHitStopMs: 22,
  cueAlpha: 0.1,
  cueScale: 1.22,
};

const ENCOUNTER_BOSS_RESPONSE: EnemyCombatResponseProfile = {
  hurtFlashMs: 144,
  flinchVelocityScale: 0.84,
  recoilSpeed: 30,
  hitScaleX: 1.05,
  hitScaleY: 0.96,
  hitTweenMs: 132,
  hitStopMs: 8,
  deathBeatMs: 164,
  deathScaleX: 1.14,
  deathScaleY: 0.84,
  deathTweenMs: 164,
  deathHitStopMs: 28,
  cueAlpha: 0.09,
  cueScale: 1.34,
};

const BURST_TARGETED_WEAPON_RESPONSE: WeaponCombatResponseProfile = {
  launchScaleX: 1.16,
  launchScaleY: 0.84,
  launchTweenMs: 84,
  impactHitStopMs: 7,
  cueAlpha: 0.08,
  cueScale: 1.04,
};

const ENEMY_RESPONSE_PROFILES: Partial<Record<EnemyArchetypeId, EnemyCombatResponseProfile>> = {
  scuttler: {
    hurtFlashMs: 105,
    flinchVelocityScale: 0.56,
    recoilSpeed: 98,
    hitScaleX: 1.16,
    hitScaleY: 0.84,
    hitTweenMs: 88,
    hitStopMs: 10,
    deathBeatMs: 72,
    deathScaleX: 1.34,
    deathScaleY: 0.62,
    deathTweenMs: 72,
    deathHitStopMs: 18,
    cueAlpha: 0.16,
    cueScale: 1.18,
  },
  skimmer: {
    ...LIGHT_STRAFER_RESPONSE,
    flinchVelocityScale: 0.6,
    recoilSpeed: 88,
    cueAlpha: 0.12,
  },
  harrier: {
    ...LIGHT_STRAFER_RESPONSE,
    hurtFlashMs: 92,
    recoilSpeed: 94,
    hitScaleX: 1.12,
    hitStopMs: 7,
    cueAlpha: 0.1,
    cueScale: 1.1,
  },
  mauler: {
    ...BRUISER_CHASE_RESPONSE,
    recoilSpeed: 84,
    cueScale: 1.18,
  },
  crusher: {
    ...DASH_BRUISER_RESPONSE,
    flinchVelocityScale: 0.62,
    recoilSpeed: 70,
    hitStopMs: 12,
    deathHitStopMs: 19,
  },
  bulwark: {
    ...BRUISER_CHASE_RESPONSE,
    flinchVelocityScale: 0.74,
    recoilSpeed: 52,
    hitScaleX: 1.08,
    hitScaleY: 0.92,
    hitStopMs: 12,
    deathBeatMs: 96,
    deathScaleX: 1.18,
    deathScaleY: 0.8,
    deathTweenMs: 96,
    deathHitStopMs: 18,
    cueAlpha: 0.18,
    cueScale: 1.3,
  },
  overlord: {
    hurtFlashMs: 125,
    flinchVelocityScale: 0.66,
    recoilSpeed: 84,
    hitScaleX: 1.11,
    hitScaleY: 0.9,
    hitTweenMs: 96,
    hitStopMs: 14,
    deathBeatMs: 110,
    deathScaleX: 1.24,
    deathScaleY: 0.7,
    deathTweenMs: 110,
    deathHitStopMs: 24,
    cueAlpha: 0.22,
    cueScale: 1.38,
  },
  riftblade: {
    ...LIGHT_STRAFER_RESPONSE,
    hurtFlashMs: 116,
    flinchVelocityScale: 0.68,
    recoilSpeed: 78,
    hitScaleX: 1.12,
    hitTweenMs: 92,
    hitStopMs: 12,
    deathBeatMs: 96,
    deathScaleX: 1.24,
    deathScaleY: 0.72,
    deathTweenMs: 96,
    deathHitStopMs: 20,
    cueAlpha: 0.2,
    cueScale: 1.32,
  },
  dreadnought: {
    ...ENCOUNTER_MINIBOSS_RESPONSE,
  },
  behemoth: {
    ...ENCOUNTER_BOSS_RESPONSE,
  },
};

const WEAPON_RESPONSE_PROFILES: Partial<Record<WeaponId, WeaponCombatResponseProfile>> = {
  'arc-bolt': {
    launchScaleX: 1.24,
    launchScaleY: 0.78,
    launchTweenMs: 80,
    impactHitStopMs: 10,
    cueAlpha: 0.12,
    cueScale: 1.06,
  },
  'twin-fangs': {
    ...BURST_TARGETED_WEAPON_RESPONSE,
    launchScaleX: 1.18,
    launchScaleY: 0.82,
    cueAlpha: 0.07,
  },
  'ember-lance': {
    launchScaleX: 1.42,
    launchScaleY: 0.68,
    launchTweenMs: 120,
    impactHitStopMs: 18,
    cueAlpha: 0.16,
    cueScale: 1.22,
  },
  'bloom-cannon': {
    ...BURST_TARGETED_WEAPON_RESPONSE,
    launchScaleX: 1.14,
    launchTweenMs: 92,
    impactHitStopMs: 8,
    cueAlpha: 0.09,
    cueScale: 1.08,
  },
  'phase-disc': {
    launchScaleX: 1.12,
    launchScaleY: 1.34,
    launchTweenMs: 110,
    impactHitStopMs: 8,
    cueAlpha: 0.08,
    cueScale: 1.08,
  },
  sunwheel: {
    launchScaleX: 1.06,
    launchScaleY: 1.22,
    launchTweenMs: 96,
    impactHitStopMs: 6,
    cueAlpha: 0.06,
    cueScale: 1.02,
  },
  shatterbell: {
    launchScaleX: 1.26,
    launchScaleY: 0.76,
    launchTweenMs: 118,
    impactHitStopMs: 12,
    cueAlpha: 0.1,
    cueScale: 1.14,
  },
};

export function getEnemyCombatResponseProfile(enemyId: EnemyArchetypeId): EnemyCombatResponseProfile | null {
  return ENEMY_RESPONSE_PROFILES[enemyId] ?? null;
}

export function getWeaponCombatResponseProfile(weaponId: WeaponId): WeaponCombatResponseProfile | null {
  return WEAPON_RESPONSE_PROFILES[weaponId] ?? null;
}

export function resolveCombatImpactResponse(options: CombatImpactResponseOptions): {
  hitStopMs: number;
  cue: CombatImpactCue | null;
} {
  const enemyProfile = getEnemyCombatResponseProfile(options.enemyId);
  const weaponProfile = getWeaponCombatResponseProfile(options.weaponId);
  const hitStopMs = Math.max(
    options.defeated ? enemyProfile?.deathHitStopMs ?? 0 : enemyProfile?.hitStopMs ?? 0,
    weaponProfile?.impactHitStopMs ?? 0,
  );

  const cueAlpha = Math.max(enemyProfile?.cueAlpha ?? 0, weaponProfile?.cueAlpha ?? 0);
  if (cueAlpha <= 0) {
    return { hitStopMs, cue: null };
  }

  const cueScale = Math.max(enemyProfile?.cueScale ?? 1, weaponProfile?.cueScale ?? 1);
  const cue = {
    x: options.x,
    y: options.y,
    color: options.color,
    startRadius: Math.max(4, options.radius * 0.44),
    endRadius: Math.max(
      14,
      options.radius * cueScale * (options.defeated ? 4.2 : 2.8),
    ),
    durationMs: options.defeated ? 160 : 110,
    alpha: cueAlpha,
  };

  return { hitStopMs, cue };
}

export class CombatResponseController {
  private hitStopRemainingMs = 0;
  private refreshGuardRemainingMs = 0;
  private readonly metrics: CombatResponseMetrics = {
    hitStopStarts: 0,
    hitStopRefreshes: 0,
    hitStopSuppressions: 0,
  };

  constructor(private readonly hooks: CombatResponseHooks = {}) {}

  update(deltaMs: number): void {
    const elapsedMs = Math.max(0, deltaMs);
    if (this.refreshGuardRemainingMs > 0) {
      this.refreshGuardRemainingMs = Math.max(0, this.refreshGuardRemainingMs - elapsedMs);
    }

    if (this.hitStopRemainingMs <= 0) {
      return;
    }

    this.hitStopRemainingMs = Math.max(0, this.hitStopRemainingMs - elapsedMs);
    if (this.hitStopRemainingMs === 0) {
      this.hooks.onHitStopEnd?.();
    }
  }

  isHitStopActive(): boolean {
    return this.hitStopRemainingMs > 0;
  }

  triggerHitStop(durationMs: number): void {
    if (durationMs <= 0) {
      return;
    }

    const wasInactive = this.hitStopRemainingMs === 0;
    if (!wasInactive) {
      const refreshBlocked =
        this.refreshGuardRemainingMs > 0 || this.hitStopRemainingMs >= durationMs * 0.7;
      if (refreshBlocked) {
        this.metrics.hitStopSuppressions += 1;
        return;
      }
    }

    const nextDurationMs = Math.max(this.hitStopRemainingMs, durationMs);
    const didRefresh = !wasInactive && nextDurationMs > this.hitStopRemainingMs;
    this.hitStopRemainingMs = nextDurationMs;
    this.refreshGuardRemainingMs = Math.min(10, durationMs);

    if (wasInactive) {
      this.metrics.hitStopStarts += 1;
      this.hooks.onHitStopStart?.();
      return;
    }

    if (didRefresh) {
      this.metrics.hitStopRefreshes += 1;
    }
  }

  emitImpactCue(cue: CombatImpactCue | null): void {
    if (cue) {
      this.hooks.onImpactCue?.(cue);
    }
  }

  clear(options?: { suppressCallbacks?: boolean }): void {
    if (this.hitStopRemainingMs > 0) {
      this.hitStopRemainingMs = 0;
      this.refreshGuardRemainingMs = 0;
      if (!options?.suppressCallbacks) {
        this.hooks.onHitStopEnd?.();
      }
    }
  }

  getMetrics(): CombatResponseMetrics {
    return { ...this.metrics };
  }
}
