export type HpRegenTickInput = {
  currentHp: number;
  maxHp: number;
  regenPerSecond: number;
  accumulator: number;
  deltaMs: number;
  alive: boolean;
  maxDeltaMs?: number;
};

export type HpRegenTickResult = {
  nextHp: number;
  nextAccumulator: number;
  healedAmount: number;
  active: boolean;
};

export const DEFAULT_HP_REGEN_MAX_DELTA_MS = 250;

export function resolveHpRegenTick(input: HpRegenTickInput): HpRegenTickResult {
  const currentHp = Math.max(0, Number(input.currentHp));
  const maxHp = Math.max(0, Number(input.maxHp));
  const regenPerSecond = Math.max(0, Number(input.regenPerSecond));
  const maxDeltaMs = Math.max(0, Number(input.maxDeltaMs ?? DEFAULT_HP_REGEN_MAX_DELTA_MS));
  const deltaMs = Math.min(Math.max(0, Number(input.deltaMs)), maxDeltaMs);

  if (!input.alive || currentHp <= 0 || currentHp >= maxHp || regenPerSecond <= 0 || deltaMs <= 0) {
    return {
      nextHp: Math.min(currentHp, maxHp),
      nextAccumulator: currentHp >= maxHp || !input.alive ? 0 : Math.max(0, Number(input.accumulator)),
      healedAmount: 0,
      active: false,
    };
  }

  const pendingHealing = Math.max(0, Number(input.accumulator)) + (regenPerSecond * deltaMs) / 1000;
  const wholeHealing = Math.floor(pendingHealing);
  const missingHp = maxHp - currentHp;
  const healedAmount = Math.min(missingHp, wholeHealing);
  const nextHp = currentHp + healedAmount;
  const nextAccumulator = nextHp >= maxHp ? 0 : pendingHealing - healedAmount;

  return {
    nextHp,
    nextAccumulator,
    healedAmount,
    active: healedAmount > 0 || nextAccumulator > 0,
  };
}
