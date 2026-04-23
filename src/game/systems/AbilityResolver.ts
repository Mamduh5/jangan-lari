import Phaser from 'phaser';
import type { AbilityDefinition, AbilitySlot } from '../data/abilities';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import { AbilityProjectile, type AbilityProjectilePayload } from '../entities/AbilityProjectile';
import type { CombatStateRuntime } from './CombatStateRuntime';
import type { TraitRuntime } from './TraitRuntime';
import type { EvolutionId } from '../data/evolutions';
import type { HeroId } from '../data/heroes';
import { TriggerSeam } from './TriggerSeam';

export type SignatureHitResult = {
  target: Enemy;
  damage: number;
  consumedMark: boolean;
  killed: boolean;
} | null;

export type AbilityUseResult =
  | { used: false }
  | {
      used: true;
      slot: AbilitySlot;
      signatureHit?: SignatureHitResult;
      disruptedApplications?: number;
      disruptedTargetsHit?: number;
      ailmentApplications?: number;
      ailmentConsumes?: number;
    };

type AbilityResolverOptions = {
  scene: Phaser.Scene;
  player: Player;
  enemies: Phaser.Physics.Arcade.Group;
  projectiles: Phaser.Physics.Arcade.Group;
  combatStates: CombatStateRuntime;
  traits: TraitRuntime;
  heroId: HeroId;
  triggers?: TriggerSeam;
};

export class AbilityResolver {
  private evolutionId: EvolutionId | null = null;
  private readonly triggerSeam: TriggerSeam;

  constructor(private readonly options: AbilityResolverOptions) {
    this.triggerSeam =
      options.triggers ??
      new TriggerSeam({
        heroId: options.heroId,
        traits: options.traits,
        combatStates: options.combatStates,
      });
  }

  setEvolutionId(evolutionId: EvolutionId | null): void {
    this.evolutionId = evolutionId;
  }

  tryUseAbility(slot: AbilitySlot, ability: AbilityDefinition, currentTime: number): AbilityUseResult {
    switch (ability.behaviorId) {
      case 'brace-shot':
        return this.tryUseBraceShot(slot, ability);
      case 'bulwark-slam':
        return this.tryUseBulwarkSlam(slot, ability, currentTime);
      case 'seeker-burst':
        return this.tryUseSeekerBurst(slot, ability, currentTime);
      case 'hunter-sweep':
        return this.tryUseHunterSweep(slot, ability, currentTime);
      case 'shock-lattice':
        return this.tryUseShockLattice(slot, ability, currentTime);
      case 'spotter-drone':
        return this.tryUseSpotterDrone(slot, ability, currentTime);
      case 'echo-turret':
        return this.tryUseEchoTurret(slot, ability, currentTime);
      case 'recovery-field':
        return this.tryUseRecoveryField(slot, ability, currentTime);
      case 'cinder-needles':
        return this.tryUseCinderNeedles(slot, ability, currentTime);
      case 'hex-detonation':
        return this.tryUseHexDetonation(slot, ability, currentTime);
      case 'contagion-node':
        return this.tryUseContagionNode(slot, ability);
      default:
        return { used: false };
    }
  }

  private tryUseBraceShot(slot: AbilitySlot, ability: AbilityDefinition): AbilityUseResult {
    const target = this.findNearestEnemy(ability.range);
    if (!target) {
      return { used: false };
    }

    const direction = new Phaser.Math.Vector2(target.x - this.options.player.x, target.y - this.options.player.y);
    if (direction.lengthSq() === 0) {
      return { used: false };
    }

    const guardActive = this.options.combatStates.hasGuard();
    const { burstCount, spreadDegrees: totalSpread } = this.triggerSeam.resolvePrimaryPattern(ability, guardActive);
    const baseDirection = direction.normalize();

    for (let index = 0; index < burstCount; index += 1) {
      const spreadOffset =
        burstCount === 1 ? 0 : Phaser.Math.Linear(-totalSpread / 2, totalSpread / 2, index / (burstCount - 1));
      const shotDirection = baseDirection.clone().rotate(Phaser.Math.DegToRad(spreadOffset));
      this.spawnProjectile(shotDirection, {
        sourceAbilityId: ability.id,
        damage: ability.damage,
        maxDistance: ability.range,
        speed: ability.projectileSpeed ?? 520,
        radius: ability.projectileRadius ?? 5,
        color: ability.color,
        strokeColor: ability.strokeColor,
      });
    }

    return { used: true, slot };
  }

  private tryUseBulwarkSlam(slot: AbilitySlot, ability: AbilityDefinition, currentTime: number): AbilityUseResult {
    const guard = this.options.combatStates.getGuard();
    if (guard <= 0) {
      return { used: false };
    }

    if (this.evolutionId === 'reckoner-drive') {
      return this.tryUseReckonerDrive(slot, ability, currentTime, guard);
    }

    const radius = ability.radius ?? ability.range;
    const enemies = this.getActiveEnemies();
    const targets = enemies.filter(
      (enemy) => Phaser.Math.Distance.Between(this.options.player.x, this.options.player.y, enemy.x, enemy.y) <= radius,
    );

    if (targets.length === 0) {
      return { used: false };
    }

    const relayMultiplier = this.triggerSeam.resolveSignaturePayoff({
      currentTime,
      targetWasMarked: targets.some((enemy) => enemy.isMarked(currentTime)),
      targetWasDisrupted: targets.some((enemy) => enemy.isDisrupted(currentTime)),
      targetWasAilmented: targets.some((enemy) => enemy.isAilmented(currentTime)),
    });

    if (this.evolutionId === 'citadel-core') {
      const disruptedTargetsHit = this.applyBulwarkPulse(
        ability,
        radius,
        Math.min(6 + this.options.traits.getIronReserveSpendBonus(), guard),
        currentTime,
        relayMultiplier,
      );

      [170, 340].forEach((delayMs) => {
        this.options.scene.time.delayedCall(delayMs, () => {
          if (!this.options.player.active || this.options.combatStates.getGuard() < 3) {
            return;
          }
          this.applyBulwarkPulse(ability, radius, 3, this.options.scene.time.now, 0.72);
        });
      });

      return { used: true, slot, disruptedTargetsHit };
    }

    const disruptedTargetsHit = this.applyBulwarkPulse(
      ability,
      radius,
      Math.min(12 + this.options.traits.getIronReserveSpendBonus(), guard),
      currentTime,
      relayMultiplier,
    );
    return { used: true, slot, disruptedTargetsHit };
  }

  private tryUseSeekerBurst(slot: AbilitySlot, ability: AbilityDefinition, currentTime: number): AbilityUseResult {
    const target = this.findMarkedEnemy(currentTime, ability.range) ?? this.findNearestEnemy(ability.range);
    if (!target) {
      return { used: false };
    }

    const direction = new Phaser.Math.Vector2(target.x - this.options.player.x, target.y - this.options.player.y);
    if (direction.lengthSq() === 0) {
      return { used: false };
    }

    const burstCount = ability.burstCount ?? 1;
    const totalSpread = ability.spreadDegrees ?? 0;
    const baseDirection = direction.normalize();

    for (let index = 0; index < burstCount; index += 1) {
      const spreadOffset =
        burstCount === 1 ? 0 : Phaser.Math.Linear(-totalSpread / 2, totalSpread / 2, index / (burstCount - 1));
      const shotDirection = baseDirection.clone().rotate(Phaser.Math.DegToRad(spreadOffset));
      this.spawnProjectile(shotDirection, {
        sourceAbilityId: ability.id,
        damage: ability.damage,
        maxDistance: ability.range,
        speed: ability.projectileSpeed ?? 760,
        radius: ability.projectileRadius ?? 4,
        color: ability.color,
        strokeColor: ability.strokeColor,
      });
    }

    return { used: true, slot };
  }

  private tryUseCinderNeedles(slot: AbilitySlot, ability: AbilityDefinition, currentTime: number): AbilityUseResult {
    const target =
      this.findUnailmentedEnemy(currentTime, ability.range) ??
      this.findAilmentedEnemy(currentTime, ability.range) ??
      this.findNearestEnemy(ability.range);
    if (!target) {
      return { used: false };
    }

    const direction = new Phaser.Math.Vector2(target.x - this.options.player.x, target.y - this.options.player.y);
    if (direction.lengthSq() === 0) {
      return { used: false };
    }

    const { burstCount, spreadDegrees: totalSpread } = this.triggerSeam.resolvePrimaryPattern(
      ability,
      this.options.combatStates.hasGuard(),
    );
    const baseDirection = direction.normalize();

    for (let index = 0; index < burstCount; index += 1) {
      const spreadOffset =
        burstCount === 1 ? 0 : Phaser.Math.Linear(-totalSpread / 2, totalSpread / 2, index / (burstCount - 1));
      const shotDirection = baseDirection.clone().rotate(Phaser.Math.DegToRad(spreadOffset));
      this.spawnProjectile(shotDirection, {
        sourceAbilityId: ability.id,
        damage: ability.damage,
        maxDistance: ability.range,
        speed: ability.projectileSpeed ?? 680,
        radius: ability.projectileRadius ?? 4,
        color: ability.color,
        strokeColor: ability.strokeColor,
      });
    }

    return { used: true, slot };
  }

  private tryUseHunterSweep(slot: AbilitySlot, ability: AbilityDefinition, currentTime: number): AbilityUseResult {
    const target = this.findMarkedEnemy(currentTime, ability.range) ?? this.findNearestEnemy(ability.range);
    if (!target) {
      return { used: false };
    }

    const consumedMarkTx = this.options.combatStates.consumeMarkTx(target, currentTime);
    const consumedMark = consumedMarkTx.consumed;
    const targetWasDisrupted = this.options.combatStates.isDisrupted(target, currentTime);
    const targetWasAilmented = this.options.combatStates.isAilmented(target, currentTime);
    let damage = ability.damage;

    if (consumedMark) {
      damage = Math.round(damage * this.options.traits.getSignatureMarkedDamageMultiplier());
    }
    if (targetWasDisrupted) {
      damage = Math.round(damage * this.options.traits.getSignatureDisruptedDamageMultiplier());
    }
    damage = Math.round(
      damage *
        this.triggerSeam.resolveSignaturePayoff({
          currentTime,
          targetWasMarked: consumedMark || target.isMarked(currentTime),
          targetWasDisrupted,
          targetWasAilmented,
        }),
    );

    const killed = target.takeDamage(damage, { x: this.options.player.x, y: this.options.player.y });

    const line = this.options.scene.add.line(
      0,
      0,
      this.options.player.x,
      this.options.player.y,
      target.x,
      target.y,
      consumedMark ? 0xfef08a : ability.strokeColor,
      0.95,
    );
    line.setLineWidth(consumedMark ? 7 : 4, consumedMark ? 7 : 4);
    line.setDepth(8);
    this.options.scene.tweens.add({
      targets: line,
      alpha: 0,
      duration: consumedMark ? 180 : 120,
      ease: 'Quad.Out',
      onComplete: () => line.destroy(),
    });

    if (consumedMark) {
      const burst = this.options.scene.add.circle(target.x, target.y, 12, 0xfef08a, 0.24).setDepth(9);
      burst.setStrokeStyle(4, 0xfffbeb, 1);
      this.options.scene.tweens.add({
        targets: burst,
        radius: 42,
        alpha: 0,
        duration: 180,
        ease: 'Quad.Out',
        onComplete: () => burst.destroy(),
      });

      this.options.scene.cameras.main.shake(70, 0.0022);
    }

    if (this.evolutionId === 'kill-chain-protocol' && consumedMark && killed) {
      const nextTarget = this.findMarkedEnemyExcluding(currentTime, ability.range, target) ?? this.findNearestEnemyExcluding(ability.range, target);
      if (nextTarget) {
        const redirectedConsumedMark = this.options.combatStates.consumeMarkTx(nextTarget, currentTime).consumed;
        let redirectedDamage = Math.round(damage * 0.85);
        if (redirectedConsumedMark) {
          redirectedDamage = Math.round(redirectedDamage * 1.15);
        }
        nextTarget.takeDamage(redirectedDamage, { x: target.x, y: target.y });

        const chainLine = this.options.scene.add.line(
          0,
          0,
          target.x,
          target.y,
          nextTarget.x,
          nextTarget.y,
          0xfef08a,
          0.95,
        );
        chainLine.setLineWidth(5, 5);
        chainLine.setDepth(8.5);
        this.options.scene.tweens.add({
          targets: chainLine,
          alpha: 0,
          duration: 170,
          ease: 'Quad.Out',
          onComplete: () => chainLine.destroy(),
        });
      }
    }

    if (this.evolutionId === 'siege-lock-array' && target.active && target.isAlive() && (consumedMark || target.isMarked(currentTime))) {
      const immediateGain = this.options.combatStates.gainGuardTx(2).value;
      this.options.traits.notifyGuardGain(currentTime, immediateGain);

      [150, 310].forEach((delayMs) => {
        this.options.scene.time.delayedCall(delayMs, () => {
          if (!target.active || !target.isAlive() || !this.options.player.active) {
            return;
          }

          let repeatedDamage = Math.round(ability.damage * 0.58);
          if (this.options.combatStates.isDisrupted(target, this.options.scene.time.now)) {
            repeatedDamage = Math.round(repeatedDamage * this.options.traits.getSignatureDisruptedDamageMultiplier());
          }
          target.takeDamage(repeatedDamage, { x: this.options.player.x, y: this.options.player.y });

          const gained = this.options.combatStates.gainGuardTx(3).value;
          this.options.traits.notifyGuardGain(this.options.scene.time.now, gained);

          const lockLine = this.options.scene.add.line(
            0,
            0,
            this.options.player.x,
            this.options.player.y,
            target.x,
            target.y,
            0x93c5fd,
            0.92,
          );
          lockLine.setLineWidth(3, 3);
          lockLine.setDepth(8.4);
          this.options.scene.tweens.add({
            targets: lockLine,
            alpha: 0,
            duration: 150,
            ease: 'Quad.Out',
            onComplete: () => lockLine.destroy(),
          });
        });
      });
    }

    return {
      used: true,
      slot,
      disruptedTargetsHit: targetWasDisrupted ? 1 : 0,
      signatureHit: {
        target,
        damage,
        consumedMark,
        killed,
      },
    };
  }

  private tryUseHexDetonation(slot: AbilitySlot, ability: AbilityDefinition, currentTime: number): AbilityUseResult {
    const target = this.findBestHexDetonationTarget(
      currentTime,
      ability.range,
      ability.radius ?? ability.range,
      this.evolutionId === 'cinder-crown',
    );
    if (!target) {
      return { used: false };
    }

    const radius = ability.radius ?? ability.range;
    const consumeBonusDamage = this.options.traits.getHexConsumeBonusDamage();
    const volatileBurstDamage = this.options.traits.getHexSecondaryBurstDamage();
    const volatileBurstRadius = this.options.traits.getHexSecondaryBurstRadius(48);
    let disruptedTargetsHit = 0;
    let ailmentConsumes = 0;
    let catalyticMarked = false;

    const targets = this.getActiveEnemies().filter(
      (enemy) => Phaser.Math.Distance.Between(target.x, target.y, enemy.x, enemy.y) <= radius,
    );
    const chainedTargets = new Set<Enemy>();

    for (const enemy of targets) {
      chainedTargets.add(enemy);
      const consumedAilmentTx = this.options.combatStates.consumeAilmentTx(enemy, currentTime);
      const consumedAilment = consumedAilmentTx.consumed;
      const targetWasMarked = this.options.combatStates.isMarked(enemy, currentTime);
      let damage = consumedAilment ? ability.damage + consumeBonusDamage : Math.round(ability.damage * 0.6);
      if (this.evolutionId === 'cinder-crown' && enemy === target && consumedAilment && targetWasMarked) {
        damage = Math.round(damage * 1.95);
      }
      if (this.options.combatStates.isDisrupted(enemy, currentTime)) {
        damage = Math.round(damage * this.options.traits.getSignatureDisruptedDamageMultiplier());
        disruptedTargetsHit += 1;
      }
      if (consumedAilment) {
        damage = Math.round(
          damage *
            this.triggerSeam.resolveSignaturePayoff({
              currentTime,
              targetWasMarked,
              targetWasDisrupted: this.options.combatStates.isDisrupted(enemy, currentTime),
              targetWasAilmented: true,
            }),
        );
      }

      enemy.takeDamage(damage, { x: target.x, y: target.y });

      if (!consumedAilment) {
        continue;
      }

      ailmentConsumes += 1;
      if (!catalyticMarked) {
        catalyticMarked = this.tryApplyCatalyticExposure(currentTime, enemy, chainedTargets);
      }
      const consumeBurst = this.options.scene.add.circle(enemy.x, enemy.y, 14, 0xfb923c, 0.24).setDepth(9);
      consumeBurst.setStrokeStyle(3, 0xffedd5, 0.95);
      this.options.scene.tweens.add({
        targets: consumeBurst,
        radius: 46,
        alpha: 0,
        duration: 200,
        ease: 'Quad.Out',
        onComplete: () => consumeBurst.destroy(),
      });

      if (volatileBurstDamage <= 0) {
        continue;
      }

      for (const splashTarget of this.getActiveEnemies()) {
        if (splashTarget === enemy) {
          continue;
        }
        if (Phaser.Math.Distance.Between(enemy.x, enemy.y, splashTarget.x, splashTarget.y) > volatileBurstRadius) {
          continue;
        }
        splashTarget.takeDamage(volatileBurstDamage, { x: enemy.x, y: enemy.y });
      }
    }

    if (this.evolutionId === 'pyre-constellation' && ailmentConsumes > 0) {
      let chainOrigin = target;
      for (let index = 0; index < 2; index += 1) {
        const chainedTarget = this.findNearbyAilmentedEnemy(currentTime, chainOrigin, 240, chainedTargets);
        if (!chainedTarget) {
          break;
        }

        chainedTargets.add(chainedTarget);
        if (!this.options.combatStates.consumeAilmentTx(chainedTarget, currentTime).consumed) {
          break;
        }

        ailmentConsumes += 1;
        let chainDamage = ability.damage + consumeBonusDamage;
        if (this.options.combatStates.isDisrupted(chainedTarget, currentTime)) {
          chainDamage = Math.round(chainDamage * this.options.traits.getSignatureDisruptedDamageMultiplier());
          disruptedTargetsHit += 1;
        }
        chainedTarget.takeDamage(chainDamage, { x: chainOrigin.x, y: chainOrigin.y });

        const chainLine = this.options.scene.add.line(
          0,
          0,
          chainOrigin.x,
          chainOrigin.y,
          chainedTarget.x,
          chainedTarget.y,
          0xfb923c,
          0.9,
        );
        chainLine.setLineWidth(4, 4);
        chainLine.setDepth(8.5);
        this.options.scene.tweens.add({
          targets: chainLine,
          alpha: 0,
          duration: 180,
          ease: 'Quad.Out',
          onComplete: () => chainLine.destroy(),
        });

        chainOrigin = chainedTarget;
      }
    }

    const ring = this.options.scene.add.circle(target.x, target.y, 18, ability.color, 0.18).setDepth(8);
    ring.setStrokeStyle(4, ability.strokeColor, 0.95);
    this.options.scene.tweens.add({
      targets: ring,
      radius,
      alpha: 0,
      duration: 240,
      ease: 'Quad.Out',
      onComplete: () => ring.destroy(),
    });

    return {
      used: true,
      slot,
      disruptedTargetsHit,
      ailmentConsumes,
    };
  }

  private tryUseShockLattice(slot: AbilitySlot, ability: AbilityDefinition, currentTime: number): AbilityUseResult {
    const radius = ability.radius ?? ability.range;
    const targets = this.getActiveEnemies().filter(
      (enemy) => Phaser.Math.Distance.Between(this.options.player.x, this.options.player.y, enemy.x, enemy.y) <= radius,
    );

    if (targets.length === 0) {
      return { used: false };
    }

    const disruptedDuration = this.options.traits.getDisruptedDurationMs(ability.disruptedDurationMs ?? 2400);
    for (const enemy of targets) {
      enemy.takeDamage(ability.damage, { x: this.options.player.x, y: this.options.player.y });
      this.options.combatStates.applyDisruptedTx(enemy, currentTime, disruptedDuration);
    }

    const ring = this.options.scene.add.circle(this.options.player.x, this.options.player.y, 22, ability.color, 0.18).setDepth(8);
    ring.setStrokeStyle(3, ability.strokeColor, 0.95);
    this.options.scene.tweens.add({
      targets: ring,
      radius,
      alpha: 0,
      duration: 260,
      ease: 'Quad.Out',
      onComplete: () => ring.destroy(),
    });

    return { used: true, slot, disruptedApplications: targets.length };
  }

  private tryUseSpotterDrone(slot: AbilitySlot, ability: AbilityDefinition, currentTime: number): AbilityUseResult {
    const target = this.findSupportPriorityEnemy(currentTime, ability.range);
    if (!target) {
      return { used: false };
    }

    const direction = new Phaser.Math.Vector2(target.x - this.options.player.x, target.y - this.options.player.y);
    if (direction.lengthSq() === 0) {
      return { used: false };
    }

    this.spawnProjectile(direction.normalize(), {
      sourceAbilityId: ability.id,
      damage: ability.damage,
      maxDistance: ability.range,
      speed: ability.projectileSpeed ?? 660,
      radius: ability.projectileRadius ?? 4,
      color: ability.color,
      strokeColor: ability.strokeColor,
    });

    return { used: true, slot };
  }

  private tryUseEchoTurret(slot: AbilitySlot, ability: AbilityDefinition, currentTime: number): AbilityUseResult {
    const target = this.findStateAffectedEnemy(currentTime, ability.range) ?? this.findNearestEnemy(ability.range);
    if (!target) {
      return { used: false };
    }

    const direction = new Phaser.Math.Vector2(target.x - this.options.player.x, target.y - this.options.player.y);
    if (direction.lengthSq() === 0) {
      return { used: false };
    }

    const stateAligned = this.isEnemyStateAffected(target, currentTime);
    this.spawnProjectile(direction.normalize(), {
      sourceAbilityId: ability.id,
      damage:
        ability.damage +
        (stateAligned ? 1 : 0) +
        (stateAligned ? this.options.traits.getEchoTurretStateAlignedBonusDamage() : 0),
      maxDistance: ability.range,
      speed: ability.projectileSpeed ?? 720,
      radius: ability.projectileRadius ?? 4,
      color: ability.color,
      strokeColor: ability.strokeColor,
    });

    return { used: true, slot };
  }

  private tryUseRecoveryField(slot: AbilitySlot, ability: AbilityDefinition, currentTime: number): AbilityUseResult {
    const radius = ability.radius ?? ability.range;
    const targets = this.getActiveEnemies().filter(
      (enemy) => Phaser.Math.Distance.Between(this.options.player.x, this.options.player.y, enemy.x, enemy.y) <= radius,
    );

    if (targets.length === 0) {
      return { used: false };
    }

    for (const enemy of targets) {
      enemy.takeDamage(ability.damage, { x: this.options.player.x, y: this.options.player.y });
    }

    if (targets.length >= 3) {
      this.options.player.heal(4);
      const gained = this.options.combatStates.gainGuardTx(2).value;
      this.options.traits.notifyGuardGain(currentTime, gained);
    }

    const ring = this.options.scene.add.circle(this.options.player.x, this.options.player.y, 18, ability.color, 0.16).setDepth(8);
    ring.setStrokeStyle(3, ability.strokeColor, 0.95);
    this.options.scene.tweens.add({
      targets: ring,
      radius,
      alpha: 0,
      duration: 280,
      ease: 'Quad.Out',
      onComplete: () => ring.destroy(),
    });

    return { used: true, slot };
  }

  private tryUseContagionNode(slot: AbilitySlot, ability: AbilityDefinition): AbilityUseResult {
    const target = this.findClusteredEnemy(ability.range) ?? this.findNearestEnemy(ability.range);
    if (!target) {
      return { used: false };
    }

    const direction = new Phaser.Math.Vector2(target.x - this.options.player.x, target.y - this.options.player.y);
    if (direction.lengthSq() === 0) {
      return { used: false };
    }

    this.spawnProjectile(direction.normalize(), {
      sourceAbilityId: ability.id,
      damage: ability.damage,
      maxDistance: ability.range,
      speed: ability.projectileSpeed ?? 380,
      radius: ability.projectileRadius ?? 7,
      color: ability.color,
      strokeColor: ability.strokeColor,
    });

    return { used: true, slot };
  }

  private spawnProjectile(direction: Phaser.Math.Vector2, payload: AbilityProjectilePayload): void {
    const projectile = this.getInactiveProjectile() ?? this.createProjectile();
    projectile.fire(this.options.player.x, this.options.player.y, direction, payload);
  }

  private getInactiveProjectile(): AbilityProjectile | null {
    const internalChildren = (this.options.projectiles as Phaser.Physics.Arcade.Group & {
      children?: { entries?: AbilityProjectile[] };
    }).children;
    const projectiles = Array.isArray(internalChildren?.entries) ? internalChildren.entries : [];

    for (const projectile of projectiles) {
      if (!projectile.active) {
        return projectile;
      }
    }

    return null;
  }

  private createProjectile(): AbilityProjectile {
    const projectile = new AbilityProjectile(this.options.scene);
    this.options.projectiles.add(projectile);
    return projectile;
  }

  private getActiveEnemies(): Enemy[] {
    return (this.options.enemies.getChildren() as Enemy[]).filter((enemy) => enemy.active && enemy.isAlive());
  }

  private findNearestEnemy(range: number): Enemy | null {
    const maxDistanceSq = range * range;
    let nearest: Enemy | null = null;
    let nearestDistanceSq = maxDistanceSq;

    for (const enemy of this.getActiveEnemies()) {
      const distanceSq = Phaser.Math.Distance.Squared(this.options.player.x, this.options.player.y, enemy.x, enemy.y);
      if (distanceSq > nearestDistanceSq) {
        continue;
      }
      nearest = enemy;
      nearestDistanceSq = distanceSq;
    }

    return nearest;
  }

  private findMarkedEnemy(currentTime: number, range: number): Enemy | null {
    const markedEnemies = this.getActiveEnemies().filter((enemy) => enemy.isMarked(currentTime));
    if (markedEnemies.length === 0) {
      return null;
    }

    const maxDistanceSq = range * range;
    let nearest: Enemy | null = null;
    let nearestDistanceSq = maxDistanceSq;

    for (const enemy of markedEnemies) {
      const distanceSq = Phaser.Math.Distance.Squared(this.options.player.x, this.options.player.y, enemy.x, enemy.y);
      if (distanceSq > nearestDistanceSq) {
        continue;
      }
      nearest = enemy;
      nearestDistanceSq = distanceSq;
    }

    return nearest;
  }

  private findDisruptedEnemy(currentTime: number, range: number): Enemy | null {
    const disruptedEnemies = this.getActiveEnemies().filter((enemy) => enemy.isDisrupted(currentTime));
    if (disruptedEnemies.length === 0) {
      return null;
    }

    const maxDistanceSq = range * range;
    let nearest: Enemy | null = null;
    let nearestDistanceSq = maxDistanceSq;

    for (const enemy of disruptedEnemies) {
      const distanceSq = Phaser.Math.Distance.Squared(this.options.player.x, this.options.player.y, enemy.x, enemy.y);
      if (distanceSq > nearestDistanceSq) {
        continue;
      }
      nearest = enemy;
      nearestDistanceSq = distanceSq;
    }

    return nearest;
  }

  private findAilmentedEnemy(currentTime: number, range: number): Enemy | null {
    const ailmentedEnemies = this.getActiveEnemies().filter((enemy) => enemy.isAilmented(currentTime));
    if (ailmentedEnemies.length === 0) {
      return null;
    }

    const maxDistanceSq = range * range;
    let nearest: Enemy | null = null;
    let nearestDistanceSq = maxDistanceSq;

    for (const enemy of ailmentedEnemies) {
      const distanceSq = Phaser.Math.Distance.Squared(this.options.player.x, this.options.player.y, enemy.x, enemy.y);
      if (distanceSq > nearestDistanceSq) {
        continue;
      }
      nearest = enemy;
      nearestDistanceSq = distanceSq;
    }

    return nearest;
  }

  private findUnailmentedEnemy(currentTime: number, range: number): Enemy | null {
    const maxDistanceSq = range * range;
    let nearest: Enemy | null = null;
    let nearestDistanceSq = maxDistanceSq;

    for (const enemy of this.getActiveEnemies()) {
      if (enemy.isAilmented(currentTime)) {
        continue;
      }
      const distanceSq = Phaser.Math.Distance.Squared(this.options.player.x, this.options.player.y, enemy.x, enemy.y);
      if (distanceSq > nearestDistanceSq) {
        continue;
      }
      nearest = enemy;
      nearestDistanceSq = distanceSq;
    }

    return nearest;
  }

  private findClusteredEnemy(range: number): Enemy | null {
    const candidates = this.getActiveEnemies().filter((enemy) => {
      const distanceSq = Phaser.Math.Distance.Squared(this.options.player.x, this.options.player.y, enemy.x, enemy.y);
      return distanceSq <= range * range;
    });
    if (candidates.length === 0) {
      return null;
    }

    let bestTarget: Enemy | null = null;
    let bestScore = -1;

    for (const enemy of candidates) {
      const nearbyCount = candidates.filter(
        (other) => Phaser.Math.Distance.Between(enemy.x, enemy.y, other.x, other.y) <= 130,
      ).length;
      if (nearbyCount > bestScore) {
        bestTarget = enemy;
        bestScore = nearbyCount;
      }
    }

    return bestTarget;
  }

  private findSupportPriorityEnemy(currentTime: number, range: number): Enemy | null {
    return (
      this.findMarkedEnemy(currentTime, range) ??
      this.findDisruptedEnemy(currentTime, range) ??
      this.findNearestEnemy(range)
    );
  }

  private findMarkedAndAilmentedEnemy(currentTime: number, range: number): Enemy | null {
    const candidates = this.getActiveEnemies().filter(
      (enemy) => enemy.isMarked(currentTime) && enemy.isAilmented(currentTime),
    );
    return this.findNearestFromList(candidates, range);
  }

  private findBestHexDetonationTarget(
    currentTime: number,
    range: number,
    radius: number,
    preferMarkedAilmented: boolean,
  ): Enemy | null {
    const candidates = this.getActiveEnemies().filter((enemy) => {
      const distanceSq = Phaser.Math.Distance.Squared(this.options.player.x, this.options.player.y, enemy.x, enemy.y);
      return distanceSq <= range * range && enemy.isAilmented(currentTime);
    });
    if (candidates.length === 0) {
      return null;
    }

    let bestTarget: Enemy | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;
    let nearestDistanceSq = Number.POSITIVE_INFINITY;

    for (const candidate of candidates) {
      const nearbyAilmentedCount = candidates.filter(
        (other) => Phaser.Math.Distance.Between(candidate.x, candidate.y, other.x, other.y) <= radius,
      ).length;
      const markedBonus = preferMarkedAilmented && candidate.isMarked(currentTime) ? 100 : 0;
      const nearbyMarkedCount = candidates.filter(
        (other) =>
          other.isMarked(currentTime) &&
          Phaser.Math.Distance.Between(candidate.x, candidate.y, other.x, other.y) <= radius,
      ).length;
      const distanceSq = Phaser.Math.Distance.Squared(this.options.player.x, this.options.player.y, candidate.x, candidate.y);
      const score = nearbyAilmentedCount * 10 + nearbyMarkedCount * 3 + markedBonus;

      if (score > bestScore || (score === bestScore && distanceSq < nearestDistanceSq)) {
        bestTarget = candidate;
        bestScore = score;
        nearestDistanceSq = distanceSq;
      }
    }

    return bestTarget;
  }

  private findStateAffectedEnemy(currentTime: number, range: number): Enemy | null {
    const stateEnemies = this.getActiveEnemies().filter((enemy) => this.isEnemyStateAffected(enemy, currentTime));
    return this.findNearestFromList(stateEnemies, range);
  }

  private tryUseReckonerDrive(
    slot: AbilitySlot,
    ability: AbilityDefinition,
    currentTime: number,
    guard: number,
  ): AbilityUseResult {
    const target = this.findStateAffectedEnemy(currentTime, 400) ?? this.findNearestEnemy(400);
    if (!target) {
      return { used: false };
    }

    const direction = new Phaser.Math.Vector2(target.x - this.options.player.x, target.y - this.options.player.y);
    if (direction.lengthSq() === 0) {
      return { used: false };
    }

    const spendCap = Math.min(guard, 10 + this.options.traits.getIronReserveSpendBonus());
    const spentGuard = this.options.combatStates.spendGuardTx(spendCap).value;
    if (spentGuard <= 0) {
      return { used: false };
    }

    const normalized = direction.normalize();
    const endX = this.options.player.x + normalized.x * 370;
    const endY = this.options.player.y + normalized.y * 370;
    const relayMultiplier = this.triggerSeam.resolveSignaturePayoff({
      currentTime,
      targetWasMarked: target.isMarked(currentTime),
      targetWasDisrupted: target.isDisrupted(currentTime),
      targetWasAilmented: target.isAilmented(currentTime),
    });

    let disruptedTargetsHit = 0;
    for (const enemy of this.getActiveEnemies()) {
      const distanceToLine = this.getDistanceToSegment(this.options.player.x, this.options.player.y, endX, endY, enemy.x, enemy.y);
      const alongStart = Phaser.Math.Distance.Between(this.options.player.x, this.options.player.y, enemy.x, enemy.y);
      if (distanceToLine > 64 || alongStart > 390) {
        continue;
      }

      let damage = Math.round((ability.damage + spentGuard * 1.35) * relayMultiplier * this.options.traits.getIronReserveDamageMultiplier());
      const stateAffected = this.isEnemyStateAffected(enemy, currentTime);
      if (stateAffected) {
        damage = Math.round(damage * 1.42);
      }
      if (this.options.combatStates.isDisrupted(enemy, currentTime)) {
        damage = Math.round(damage * this.options.traits.getSignatureDisruptedDamageMultiplier());
        disruptedTargetsHit += 1;
      }

      enemy.takeDamage(damage, { x: this.options.player.x, y: this.options.player.y });
    }

    const breachLine = this.options.scene.add.line(
      0,
      0,
      this.options.player.x,
      this.options.player.y,
      endX,
      endY,
      0xfb923c,
      0.95,
    );
    breachLine.setLineWidth(10, 10);
    breachLine.setDepth(8.5);
    this.options.scene.tweens.add({
      targets: breachLine,
      alpha: 0,
      duration: 220,
      ease: 'Quad.Out',
      onComplete: () => breachLine.destroy(),
    });

    return { used: true, slot, disruptedTargetsHit };
  }

  private applyBulwarkPulse(
    ability: AbilityDefinition,
    radius: number,
    maxSpend: number,
    currentTime: number,
    damageScale: number,
  ): number {
    const guardBefore = this.options.combatStates.getGuard();
    if (guardBefore <= 0) {
      return 0;
    }

    const spentGuard = this.options.combatStates.spendGuardTx(Math.min(maxSpend, guardBefore)).value;
    if (spentGuard <= 0) {
      return 0;
    }

    let disruptedTargetsHit = 0;
    const targets = this.getActiveEnemies().filter(
      (enemy) => Phaser.Math.Distance.Between(this.options.player.x, this.options.player.y, enemy.x, enemy.y) <= radius,
    );

    for (const enemy of targets) {
      const targetWasDisrupted = this.options.combatStates.isDisrupted(enemy, currentTime);
      let damage = Math.round(
        (ability.damage + spentGuard * 1.2) * damageScale * this.options.traits.getIronReserveDamageMultiplier(),
      );
      if (targetWasDisrupted) {
        damage = Math.round(damage * this.options.traits.getSignatureDisruptedDamageMultiplier());
        disruptedTargetsHit += 1;
      }

      const killed = enemy.takeDamage(damage, { x: this.options.player.x, y: this.options.player.y });
      const knockback = new Phaser.Math.Vector2(enemy.x - this.options.player.x, enemy.y - this.options.player.y);
      if (!killed && enemy.active && enemy.body && knockback.lengthSq() > 0) {
        knockback.normalize().scale(160 + spentGuard * 5);
        enemy.body.setVelocity(knockback.x, knockback.y);
      }
    }

    const ring = this.options.scene.add.circle(this.options.player.x, this.options.player.y, 24, ability.color, 0.16).setDepth(8);
    ring.setStrokeStyle(4, ability.strokeColor, 0.95);
    this.options.scene.tweens.add({
      targets: ring,
      radius,
      alpha: 0,
      duration: 220,
      ease: 'Quad.Out',
      onComplete: () => ring.destroy(),
    });

    return disruptedTargetsHit;
  }

  private findMarkedEnemyExcluding(currentTime: number, range: number, excluded: Enemy): Enemy | null {
    const markedEnemies = this.getActiveEnemies().filter((enemy) => enemy !== excluded && enemy.isMarked(currentTime));
    return this.findNearestFromList(markedEnemies, range);
  }

  private findNearestEnemyExcluding(range: number, excluded: Enemy): Enemy | null {
    const enemies = this.getActiveEnemies().filter((enemy) => enemy !== excluded);
    return this.findNearestFromList(enemies, range);
  }

  private findNearbyAilmentedEnemy(currentTime: number, origin: Enemy, range: number, excluded: Set<Enemy>): Enemy | null {
    const ailmentedEnemies = this.getActiveEnemies().filter(
      (enemy) => !excluded.has(enemy) && enemy.isAilmented(currentTime),
    );
    if (ailmentedEnemies.length === 0) {
      return null;
    }

    let nearest: Enemy | null = null;
    let nearestDistanceSq = range * range;
    for (const enemy of ailmentedEnemies) {
      const distanceSq = Phaser.Math.Distance.Squared(origin.x, origin.y, enemy.x, enemy.y);
      if (distanceSq > nearestDistanceSq) {
        continue;
      }
      nearest = enemy;
      nearestDistanceSq = distanceSq;
    }

    return nearest;
  }

  private findNearestFromList(enemies: Enemy[], range: number): Enemy | null {
    const maxDistanceSq = range * range;
    let nearest: Enemy | null = null;
    let nearestDistanceSq = maxDistanceSq;

    for (const enemy of enemies) {
      const distanceSq = Phaser.Math.Distance.Squared(this.options.player.x, this.options.player.y, enemy.x, enemy.y);
      if (distanceSq > nearestDistanceSq) {
        continue;
      }
      nearest = enemy;
      nearestDistanceSq = distanceSq;
    }

    return nearest;
  }

  private isEnemyStateAffected(enemy: Enemy, currentTime: number): boolean {
    return enemy.isMarked(currentTime) || enemy.isDisrupted(currentTime) || enemy.isAilmented(currentTime);
  }

  private getDistanceToSegment(x1: number, y1: number, x2: number, y2: number, px: number, py: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (dx === 0 && dy === 0) {
      return Phaser.Math.Distance.Between(x1, y1, px, py);
    }

    const t = Phaser.Math.Clamp(((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy), 0, 1);
    const nearestX = x1 + dx * t;
    const nearestY = y1 + dy * t;
    return Phaser.Math.Distance.Between(nearestX, nearestY, px, py);
  }

  private tryApplyCatalyticExposure(currentTime: number, origin: Enemy, excluded: Set<Enemy>): boolean {
    const candidate = this.getActiveEnemies()
      .filter(
        (enemy) =>
          !excluded.has(enemy) &&
          !enemy.isMarked(currentTime) &&
          Phaser.Math.Distance.Between(origin.x, origin.y, enemy.x, enemy.y) <= 240,
      )
      .sort((left, right) => right.getCurrentHealth() - left.getCurrentHealth())[0];

    if (!candidate) {
      return false;
    }

    const conversion = this.triggerSeam.applyCatalyticExposureMark(candidate, currentTime);
    if (!conversion.applied) {
      return false;
    }

    if (conversion.guardGain > 0) {
      const gained = this.options.combatStates.gainGuardTx(conversion.guardGain).value;
      this.options.traits.notifyGuardGain(currentTime, gained);
    }

    return true;
  }
}
