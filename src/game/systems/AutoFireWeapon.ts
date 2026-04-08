import Phaser from 'phaser';
import type { WeaponDefinition, WeaponStats } from '../data/weapons';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';

export class AutoFireWeapon {
  private readonly projectileGroup: Phaser.Physics.Arcade.Group;
  private readonly stats: WeaponStats;
  private nextFireTime = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly owner: Player,
    private readonly enemies: Phaser.Physics.Arcade.Group,
    weapon: WeaponDefinition,
  ) {
    this.projectileGroup = this.scene.physics.add.group({ runChildUpdate: false });
    this.stats = { ...weapon };
  }

  getProjectiles(): Phaser.Physics.Arcade.Group {
    return this.projectileGroup;
  }

  getId(): string {
    return this.stats.id;
  }

  getStats(): WeaponStats {
    return { ...this.stats };
  }

  addDamage(amount: number): void {
    this.stats.damage += amount;
  }

  reduceCooldown(amount: number): void {
    this.stats.fireCooldownMs = Math.max(120, this.stats.fireCooldownMs - amount);
    this.nextFireTime = Math.min(this.nextFireTime, this.scene.time.now + this.stats.fireCooldownMs);
  }

  addProjectileSpeed(amount: number): void {
    this.stats.projectileSpeed += amount;
  }

  addRange(amount: number): void {
    this.stats.range += amount;
  }

  update(currentTime: number, deltaMs: number): void {
    this.updateProjectiles(deltaMs);

    if (!this.owner.isAlive() || currentTime < this.nextFireTime) {
      return;
    }

    const target = this.findNearestEnemy();
    if (!target) {
      return;
    }

    this.fireAt(target);
    this.nextFireTime = currentTime + this.stats.fireCooldownMs;
  }

  destroy(): void {
    this.projectileGroup.clear(true, true);
  }

  private updateProjectiles(deltaMs: number): void {
    const projectiles = this.projectileGroup.getChildren() as Projectile[];

    for (const projectile of projectiles) {
      projectile.update(deltaMs);
    }
  }

  private findNearestEnemy(): Enemy | null {
    const maxRangeSq = this.stats.range * this.stats.range;
    const enemies = this.enemies.getChildren() as Enemy[];

    let nearestEnemy: Enemy | null = null;
    let nearestDistanceSq = maxRangeSq;

    for (const enemy of enemies) {
      if (!enemy.active || !enemy.isAlive()) {
        continue;
      }

      const distanceSq = Phaser.Math.Distance.Squared(this.owner.x, this.owner.y, enemy.x, enemy.y);
      if (distanceSq > nearestDistanceSq) {
        continue;
      }

      nearestEnemy = enemy;
      nearestDistanceSq = distanceSq;
    }

    return nearestEnemy;
  }

  private fireAt(target: Enemy): void {
    const direction = new Phaser.Math.Vector2(target.x - this.owner.x, target.y - this.owner.y);
    if (direction.lengthSq() === 0) {
      return;
    }

    const burstCount = this.stats.burstCount ?? 1;
    const totalSpread = this.stats.spreadDegrees ?? 0;
    const baseDirection = direction.clone().normalize();

    for (let index = 0; index < burstCount; index += 1) {
      const spreadOffset =
        burstCount === 1 ? 0 : Phaser.Math.Linear(-totalSpread / 2, totalSpread / 2, index / (burstCount - 1));
      const shotDirection = baseDirection.clone().rotate(Phaser.Math.DegToRad(spreadOffset));
      const projectile = this.getInactiveProjectile() ?? this.createProjectile();
      projectile.fire(this.owner.x, this.owner.y, shotDirection, this.stats);
    }
  }

  private getInactiveProjectile(): Projectile | null {
    const projectiles = this.projectileGroup.getChildren() as Projectile[];

    for (const projectile of projectiles) {
      if (!projectile.active) {
        return projectile;
      }
    }

    return null;
  }

  private createProjectile(): Projectile {
    const projectile = new Projectile(this.scene);
    this.projectileGroup.add(projectile);
    return projectile;
  }
}
