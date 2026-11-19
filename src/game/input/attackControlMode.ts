export const ATTACK_CONTROL_MODES = ['auto-fire', 'manual-attack'] as const;
export type AttackControlMode = (typeof ATTACK_CONTROL_MODES)[number];

export const DEFAULT_ATTACK_CONTROL_MODE: AttackControlMode = 'auto-fire';

export type AttackControlModeMetadata = {
  id: AttackControlMode;
  label: string;
  shortLabel: string;
  description: string;
};

export const ATTACK_CONTROL_MODE_METADATA: Record<AttackControlMode, AttackControlModeMetadata> = {
  'auto-fire': {
    id: 'auto-fire',
    label: 'Auto-Fire — Original',
    shortLabel: 'Auto-Fire',
    description: 'Fixed MOVE + AIM pads. Weapons fire automatically.',
  },
  'manual-attack': {
    id: 'manual-attack',
    label: 'Manual Attack — Experimental',
    shortLabel: 'Manual (Exp)',
    description: 'Fixed MOVE + MOBA ATTACK pad. Tap, drag-aim, or drag to X to cancel.',
  },
};

/**
 * Session-only experimental selection.
 * Intentionally kept in memory (never written to localStorage / GameSaveData) so
 * every fresh launch defaults cleanly to Auto-Fire — Original and older APKs/saves
 * are unaffected.
 */
let sessionAttackControlMode: AttackControlMode = DEFAULT_ATTACK_CONTROL_MODE;

export function sanitizeAttackControlMode(value: unknown): AttackControlMode {
  return value === 'manual-attack' ? 'manual-attack' : DEFAULT_ATTACK_CONTROL_MODE;
}

export function getSessionAttackControlMode(): AttackControlMode {
  return sessionAttackControlMode;
}

export function setSessionAttackControlMode(mode: AttackControlMode): AttackControlMode {
  sessionAttackControlMode = sanitizeAttackControlMode(mode);
  return sessionAttackControlMode;
}

export function toggleSessionAttackControlMode(): AttackControlMode {
  sessionAttackControlMode = sessionAttackControlMode === 'auto-fire' ? 'manual-attack' : 'auto-fire';
  return sessionAttackControlMode;
}

export function resetSessionAttackControlMode(): AttackControlMode {
  sessionAttackControlMode = DEFAULT_ATTACK_CONTROL_MODE;
  return sessionAttackControlMode;
}

export function getAttackControlModeMetadata(mode: AttackControlMode): AttackControlModeMetadata {
  return ATTACK_CONTROL_MODE_METADATA[sanitizeAttackControlMode(mode)];
}
