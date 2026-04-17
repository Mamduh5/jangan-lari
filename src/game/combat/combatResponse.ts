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

type CombatImpactResponseOptions = {
  enemyId: EnemyArchetypeId;
  weaponId: WeaponId;
  defeated: boolean;
  x: number;
  y: number;
  color: number;
  radius: number;
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
  'ember-lance': {
    launchScaleX: 1.42,
    launchScaleY: 0.68,
    launchTweenMs: 120,
    impactHitStopMs: 18,
    cueAlpha: 0.16,
    cueScale: 1.22,
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

  constructor(private readonly hooks: CombatResponseHooks = {}) {}

  update(deltaMs: number): void {
    if (this.hitStopRemainingMs <= 0) {
      return;
    }

    this.hitStopRemainingMs = Math.max(0, this.hitStopRemainingMs - Math.max(0, deltaMs));
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
    this.hitStopRemainingMs = Math.max(this.hitStopRemainingMs, durationMs);
    if (wasInactive) {
      this.hooks.onHitStopStart?.();
    }
  }

  emitImpactCue(cue: CombatImpactCue | null): void {
    if (cue) {
      this.hooks.onImpactCue?.(cue);
    }
  }

  clear(): void {
    if (this.hitStopRemainingMs > 0) {
      this.hitStopRemainingMs = 0;
      this.hooks.onHitStopEnd?.();
    }
  }
}
