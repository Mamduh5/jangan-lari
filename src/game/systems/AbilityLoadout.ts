import type { AbilityDefinition, AbilityId, AbilitySlot } from '../data/abilities';
import { getAbilityDefinition } from '../data/abilities';

type SlotState = {
  abilityId: AbilityId | null;
  nextReadyAtMs: number;
};

export class AbilityLoadout {
  private readonly slots: Record<AbilitySlot, SlotState> = {
    primary: { abilityId: null, nextReadyAtMs: 0 },
    signature: { abilityId: null, nextReadyAtMs: 0 },
    support: { abilityId: null, nextReadyAtMs: 0 },
  };

  constructor(primaryAbilityId: AbilityId, signatureAbilityId: AbilityId) {
    this.slots.primary.abilityId = primaryAbilityId;
    this.slots.signature.abilityId = signatureAbilityId;
  }

  getAbility(slot: AbilitySlot): AbilityDefinition | null {
    const abilityId = this.slots[slot].abilityId;
    return abilityId ? getAbilityDefinition(abilityId) : null;
  }

  canUse(slot: AbilitySlot, currentTime: number): boolean {
    return this.slots[slot].abilityId !== null && currentTime >= this.slots[slot].nextReadyAtMs;
  }

  commitUse(slot: AbilitySlot, currentTime: number, cooldownMs?: number): void {
    const ability = this.getAbility(slot);
    if (!ability) {
      return;
    }

    this.slots[slot].nextReadyAtMs = currentTime + (cooldownMs ?? ability.cooldownMs);
  }

  reduceCooldown(slot: AbilitySlot, amountMs: number, currentTime: number): void {
    if (amountMs <= 0) {
      return;
    }

    this.slots[slot].nextReadyAtMs = Math.max(currentTime, this.slots[slot].nextReadyAtMs - amountMs);
  }

  getRemainingCooldownMs(slot: AbilitySlot, currentTime: number): number {
    return Math.max(0, this.slots[slot].nextReadyAtMs - currentTime);
  }
}
