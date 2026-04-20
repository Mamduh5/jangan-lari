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
  | { used: true; slot: AbilitySlot; signatureHit?: SignatureHitResult };

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
        return this.tryUseBulwarkSlam(slot, ability);
      case 'seeker-burst':
        return this.tryUseSeekerBurst(slot, ability, currentTime);
      case 'hunter-sweep':
        return this.tryUseHunterSweep(slot, ability, currentTime);
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

  private tryUseBulwarkSlam(slot: AbilitySlot, ability: AbilityDefinition): AbilityUseResult {
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

    for (const enemy of targets) {
      enemy.takeDamage(ability.damage + damageBonus, { x: this.options.player.x, y: this.options.player.y });
      const knockback = new Phaser.Math.Vector2(enemy.x - this.options.player.x, enemy.y - this.options.player.y);
      if (knockback.lengthSq() > 0) {
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

    return { used: true, slot };
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

  private tryUseHunterSweep(slot: AbilitySlot, ability: AbilityDefinition, currentTime: number): AbilityUseResult {
    const target = this.findMarkedEnemy(currentTime, ability.range) ?? this.findNearestEnemy(ability.range);
    if (!target) {
      return { used: false };
    }

    const consumedMark = this.options.combatStates.consumeMark(target, currentTime);
    let damage = ability.damage;

    if (consumedMark) {
      damage = Math.round(damage * this.options.traits.getSignatureMarkedDamageMultiplier());
    }

    const killed = target.takeDamage(damage, { x: this.options.player.x, y: this.options.player.y });

    const line = this.options.scene.add.line(
      0,
      0,
      this.options.player.x,
      this.options.player.y,
      target.x,
      target.y,
      ability.strokeColor,
      0.95,
    );
    line.setLineWidth(4, 4);
    line.setDepth(8);
    this.options.scene.tweens.add({
      targets: line,
      alpha: 0,
      duration: 120,
      ease: 'Quad.Out',
      onComplete: () => line.destroy(),
    });

    return {
      used: true,
      slot,
      signatureHit: {
        target,
        damage,
        consumedMark,
        killed,
      },
    };
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
}
