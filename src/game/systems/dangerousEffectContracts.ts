import {
  MINIBOSS_LINE_STRIKE_DAMAGE_ACTIVE_MS,
  MINIBOSS_LINE_STRIKE_LENGTH,
  MINIBOSS_LINE_STRIKE_TELEGRAPH_MS,
  MINIBOSS_LINE_STRIKE_WIDTH,
} from '../config/constants';

export type LineAttackEffectContract = {
  kind: 'miniboss-line-strike';
  length: number;
  damageWidth: number;
  visualWidth: number;
  halfWidth: number;
  telegraphMs: number;
  damageActiveMs: number;
  activeVisualMs: number;
};

export function createMinibossLineAttackContract(length = MINIBOSS_LINE_STRIKE_LENGTH): LineAttackEffectContract {
  const safeLength = Math.max(1, Math.floor(length));
  const width = MINIBOSS_LINE_STRIKE_WIDTH;

  return {
    kind: 'miniboss-line-strike',
    length: safeLength,
    damageWidth: width,
    visualWidth: width,
    halfWidth: width / 2,
    telegraphMs: MINIBOSS_LINE_STRIKE_TELEGRAPH_MS,
    damageActiveMs: MINIBOSS_LINE_STRIKE_DAMAGE_ACTIVE_MS,
    activeVisualMs: MINIBOSS_LINE_STRIKE_DAMAGE_ACTIVE_MS,
  };
}

export function lineAttackDamageAndVisualMatch(contract: LineAttackEffectContract): boolean {
  return (
    contract.length > 0 &&
    contract.damageWidth === contract.visualWidth &&
    contract.halfWidth * 2 === contract.damageWidth &&
    contract.activeVisualMs === contract.damageActiveMs
  );
}
