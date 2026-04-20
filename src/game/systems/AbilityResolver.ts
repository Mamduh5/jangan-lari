import Phaser from 'phaser';
import type { AbilityDefinition, AbilitySlot } from '../data/abilities';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import { AbilityProjectile, type AbilityProjectilePayload } from '../entities/AbilityProjectile';
import type { CombatStateRuntime } from './CombatStateRuntime';
import type { TraitRuntime } from './TraitRuntime';
import type { HeroId } from '../data/heroes';

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
};

export class AbilityResolver {
  constructor(private readonly options: AbilityResolverOptions) {}

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
    const burstCount = this.options.traits.getPrimaryBurstCount({
      heroId: this.options.heroId,
      ability,
      guardActive,
    });
    const totalSpread = this.options.traits.getPrimarySpreadDegrees({
      heroId: this.options.heroId,
      ability,
      guardActive,
    });
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

    const radius = ability.radius ?? ability.range;
    const enemies = this.getActiveEnemies();
    const targets = enemies.filter(
      (enemy) => Phaser.Math.Distance.Between(this.options.player.x, this.options.player.y, enemy.x, enemy.y) <= radius,
    );

    if (targets.length === 0) {
      return { used: false };
    }

    const spentGuard = Math.max(6, this.options.combatStates.spendGuard(Math.min(12, guard)));
    const damageBonus = Math.round(spentGuard * 1.2);
    let disruptedTargetsHit = 0;

    for (const enemy of targets) {
      const targetWasDisrupted = this.options.combatStates.isDisrupted(enemy, currentTime);
      let damage = ability.damage + damageBonus;
      if (targetWasDisrupted) {
        damage = Math.round(damage * this.options.traits.getSignatureDisruptedDamageMultiplier());
        disruptedTargetsHit += 1;
      }

      const killed = enemy.takeDamage(damage, { x: this.options.player.x, y: this.options.player.y });
      const knockback = new Phaser.Math.Vector2(enemy.x - this.options.player.x, enemy.y - this.options.player.y);
      if (!killed && enemy.active && enemy.body && knockback.lengthSq() > 0) {
        knockback.normalize().scale(180 + spentGuard * 5);
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

    const burstCount = this.options.traits.getPrimaryBurstCount({
      heroId: this.options.heroId,
      ability,
      guardActive: this.options.combatStates.hasGuard(),
    });
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

    const consumedMark = this.options.combatStates.consumeMark(target, currentTime);
    const targetWasDisrupted = this.options.combatStates.isDisrupted(target, currentTime);
    let damage = ability.damage;

    if (consumedMark) {
      damage = Math.round(damage * this.options.traits.getSignatureMarkedDamageMultiplier());
    }
    if (targetWasDisrupted) {
      damage = Math.round(damage * this.options.traits.getSignatureDisruptedDamageMultiplier());
    }

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
    const target = this.findAilmentedEnemy(currentTime, ability.range);
    if (!target) {
      return { used: false };
    }

    const radius = ability.radius ?? ability.range;
    const consumeBonusDamage = this.options.traits.getHexConsumeBonusDamage();
    const volatileBurstDamage = this.options.traits.getHexSecondaryBurstDamage();
    const volatileBurstRadius = this.options.traits.getHexSecondaryBurstRadius(48);
    let disruptedTargetsHit = 0;
    let ailmentConsumes = 0;

    const targets = this.getActiveEnemies().filter(
      (enemy) => Phaser.Math.Distance.Between(target.x, target.y, enemy.x, enemy.y) <= radius,
    );

    for (const enemy of targets) {
      const consumedAilment = this.options.combatStates.consumeAilment(enemy, currentTime);
      let damage = consumedAilment ? ability.damage + consumeBonusDamage : Math.round(ability.damage * 0.6);
      if (this.options.combatStates.isDisrupted(enemy, currentTime)) {
        damage = Math.round(damage * this.options.traits.getSignatureDisruptedDamageMultiplier());
        disruptedTargetsHit += 1;
      }

      enemy.takeDamage(damage, { x: target.x, y: target.y });

      if (!consumedAilment) {
        continue;
      }

      ailmentConsumes += 1;
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
      this.options.combatStates.applyDisrupted(enemy, currentTime, disruptedDuration);
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
}
