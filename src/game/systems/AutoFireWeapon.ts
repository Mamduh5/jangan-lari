import Phaser from 'phaser';
import type { WeaponDefinition } from '../data/weapons';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';

export class AutoFireWeapon {
  private readonly projectileGroup: Phaser.Physics.Arcade.Group;
  private nextFireTime = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly owner: Player,
    private readonly enemies: Phaser.Physics.Arcade.Group,
    private readonly weapon: WeaponDefinition,
  ) {
    this.projectileGroup = this.scene.physics.add.group({ runChildUpdate: false });
  }

  getProjectiles(): Phaser.Physics.Arcade.Group {
    return this.projectileGroup;
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
    this.nextFireTime = currentTime + this.weapon.fireCooldownMs;
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
    const maxRangeSq = this.weapon.range * this.weapon.range;
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

    const projectile = this.getInactiveProjectile() ?? this.createProjectile();
    projectile.fire(this.owner.x, this.owner.y, direction, this.weapon);
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
