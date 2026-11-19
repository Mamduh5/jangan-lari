import Phaser from 'phaser';
import { playWeaponFireCue } from '../audio/audioCuePlayer';
import type { WeaponDefinition, WeaponFirePattern, WeaponStatPatch, WeaponStats } from '../data/weapons';
import { Enemy } from '../entities/Enemy';
import { NeutralShape } from '../entities/NeutralShape';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';

type WeaponTarget = {
  x: number;
  y: number;
};

type FireDirectionProvider = () => { x: number; y: number };

export type WeaponUpdateOptions = {
  autoFire?: boolean;
};

export type WeaponTapTargetResolution = {
  direction: { x: number; y: number };
  targetKind: 'enemy' | 'neutral';
  distanceSq: number;
};

export type WeaponAttackCommand = {
  kind: 'tap' | 'aimed';
  direction?: { x: number; y: number } | null;
  fallbackDirection: { x: number; y: number };
};

export type WeaponAttackExecutionResult = {
  weaponId: string;
  fired: boolean;
  reason: 'fired' | 'cooldown' | 'inactive-owner' | 'invalid-direction';
  cooldownRemainingMs: number;
  firePattern: WeaponFirePattern;
  resolvedDirection: { x: number; y: number } | null;
  targetKind: 'aimed' | 'enemy' | 'neutral' | 'fallback' | 'radial' | 'none';
};

export class AutoFireWeapon {
  private readonly projectileGroup: Phaser.Physics.Arcade.Group;
  private readonly stats: WeaponStats;
  private nextFireTime = 0;
  private lastFireDirection = { x: 1, y: 0 };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly owner: Player,
    private readonly enemies: Phaser.Physics.Arcade.Group,
    private readonly neutralShapes: Phaser.Physics.Arcade.Group | null,
    weapon: WeaponDefinition,
    private readonly getFireDirection: FireDirectionProvider = () => owner.getFacingDirection(),
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

  getLastFireDirection(): { x: number; y: number } {
    return { ...this.lastFireDirection };
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

  applyStatPatch(patch: WeaponStatPatch): void {
    if (patch.damage !== undefined) {
      this.stats.damage = Math.max(1, this.stats.damage + patch.damage);
    }

    if (patch.burstCount !== undefined) {
      this.stats.burstCount = Math.max(1, patch.burstCount);
    }

    if (patch.spreadDegrees !== undefined) {
      this.stats.spreadDegrees = Math.max(0, patch.spreadDegrees);
    }

    if (patch.radialCount !== undefined) {
      this.stats.radialCount = Math.max(3, patch.radialCount);
    }

    if (patch.pierceCount !== undefined) {
      this.stats.pierceCount = Math.max(0, patch.pierceCount);
    }

    if (patch.projectileSpeed !== undefined) {
      this.stats.projectileSpeed = Math.max(120, this.stats.projectileSpeed + patch.projectileSpeed);
    }

    if (patch.projectileRadius !== undefined) {
      this.stats.projectileRadius = Math.max(2, this.stats.projectileRadius + patch.projectileRadius);
    }

    if (patch.range !== undefined) {
      this.stats.range = Math.max(80, this.stats.range + patch.range);
    }

    if (patch.explosionRadius !== undefined) {
      this.stats.explosionRadius = Math.max(0, (this.stats.explosionRadius ?? 0) + patch.explosionRadius);
    }

    if (patch.explosionDamageMultiplier !== undefined) {
      this.stats.explosionDamageMultiplier = Math.max(
        0,
        (this.stats.explosionDamageMultiplier ?? 0) + patch.explosionDamageMultiplier,
      );
    }

    if (patch.fireCooldownMs !== undefined) {
      this.stats.fireCooldownMs = Math.max(120, this.stats.fireCooldownMs + patch.fireCooldownMs);
      this.nextFireTime = Math.min(this.nextFireTime, this.scene.time.now + this.stats.fireCooldownMs);
    }
  }

  update(currentTime: number, deltaMs: number, options?: WeaponUpdateOptions): void {
    this.updateProjectiles(deltaMs);

    if (options?.autoFire === false) {
      return;
    }

    if (!this.owner.isAlive() || currentTime < this.nextFireTime) {
      return;
    }

    const fireDirection = this.resolveFireDirection();
    if (!fireDirection) {
      return;
    }

    this.fireWithResolvedDirection(currentTime, fireDirection);
  }

  isReadyToFire(currentTime: number): boolean {
    return this.owner.isAlive() && currentTime >= this.nextFireTime;
  }

  getCooldownRemainingMs(currentTime: number): number {
    return Math.max(0, Math.ceil(this.nextFireTime - currentTime));
  }

  findTapTargetDirection(): WeaponTapTargetResolution | null {
    const maxRangeSq = this.stats.range * this.stats.range;
    const enemy = this.findNearestEnemy(maxRangeSq);
    if (enemy) {
      const dx = enemy.x - this.owner.x;
      const dy = enemy.y - this.owner.y;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq > 0) {
        const length = Math.sqrt(distanceSq);
        return {
          direction: { x: dx / length, y: dy / length },
          targetKind: 'enemy',
          distanceSq,
        };
      }
    }

    const neutral = this.findNearestNeutralShape(maxRangeSq);
    if (neutral) {
      const dx = neutral.x - this.owner.x;
      const dy = neutral.y - this.owner.y;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq > 0) {
        const length = Math.sqrt(distanceSq);
        return {
          direction: { x: dx / length, y: dy / length },
          targetKind: 'neutral',
          distanceSq,
        };
      }
    }

    return null;
  }

  executeAttackCommand(currentTime: number, command: WeaponAttackCommand): WeaponAttackExecutionResult {
    const firePattern: WeaponFirePattern = this.stats.firePattern === 'radial' ? 'radial' : 'targeted';

    if (!this.owner.isAlive()) {
      return {
        weaponId: this.stats.id,
        fired: false,
        reason: 'inactive-owner',
        cooldownRemainingMs: 0,
        firePattern,
        resolvedDirection: null,
        targetKind: 'none',
      };
    }

    if (currentTime < this.nextFireTime) {
      return {
        weaponId: this.stats.id,
        fired: false,
        reason: 'cooldown',
        cooldownRemainingMs: this.getCooldownRemainingMs(currentTime),
        firePattern,
        resolvedDirection: null,
        targetKind: 'none',
      };
    }

    if (firePattern === 'radial') {
      const referenceDir =
        this.toNormalizedVector(command.direction) ??
        this.toNormalizedVector(command.fallbackDirection) ??
        this.toNormalizedVector(this.lastFireDirection) ??
        new Phaser.Math.Vector2(1, 0);

      this.fireWithResolvedDirection(currentTime, referenceDir);
      return {
        weaponId: this.stats.id,
        fired: true,
        reason: 'fired',
        cooldownRemainingMs: this.stats.fireCooldownMs,
        firePattern,
        resolvedDirection: { x: referenceDir.x, y: referenceDir.y },
        targetKind: 'radial',
      };
    }

    let chosenVector: Phaser.Math.Vector2 | null = null;
    let targetKind: WeaponAttackExecutionResult['targetKind'] = 'fallback';

    if (command.kind === 'aimed') {
      chosenVector = this.toNormalizedVector(command.direction);
      if (!chosenVector) {
        return {
          weaponId: this.stats.id,
          fired: false,
          reason: 'invalid-direction',
          cooldownRemainingMs: 0,
          firePattern,
          resolvedDirection: null,
          targetKind: 'none',
        };
      }
      targetKind = 'aimed';
    } else {
      const targetResolution = this.findTapTargetDirection();
      if (targetResolution) {
        chosenVector = new Phaser.Math.Vector2(targetResolution.direction.x, targetResolution.direction.y);
        targetKind = targetResolution.targetKind;
      } else {
        chosenVector =
          this.toNormalizedVector(command.direction) ??
          this.toNormalizedVector(command.fallbackDirection) ??
          this.toNormalizedVector(this.lastFireDirection);
        targetKind = 'fallback';
      }
    }

    if (!chosenVector) {
      return {
        weaponId: this.stats.id,
        fired: false,
        reason: 'invalid-direction',
        cooldownRemainingMs: 0,
        firePattern,
        resolvedDirection: null,
        targetKind: 'none',
      };
    }

    this.fireWithResolvedDirection(currentTime, chosenVector);
    return {
      weaponId: this.stats.id,
      fired: true,
      reason: 'fired',
      cooldownRemainingMs: this.stats.fireCooldownMs,
      firePattern,
      resolvedDirection: { x: chosenVector.x, y: chosenVector.y },
      targetKind,
    };
  }

  destroy(): void {
    const projectiles = [...this.getProjectileEntries()];

    for (const projectile of projectiles) {
      projectile.destroy();
    }

    this.projectileGroup.destroy();
  }

  private updateProjectiles(deltaMs: number): void {
    const projectiles = this.getProjectileEntries();

    for (const projectile of projectiles) {
      projectile.update(deltaMs);
    }
  }

  private findNearestTarget(): WeaponTarget | null {
    const maxRangeSq = this.stats.range * this.stats.range;
    const enemy = this.findNearestEnemy(maxRangeSq);

    if (enemy) {
      return enemy;
    }

    return this.findNearestNeutralShape(maxRangeSq);
  }

  private findNearestEnemy(maxRangeSq: number): Enemy | null {
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

  private findNearestNeutralShape(maxRangeSq: number): NeutralShape | null {
    if (!this.neutralShapes?.active) {
      return null;
    }

    const neutralShapes = this.neutralShapes.getChildren() as NeutralShape[];
    let nearestShape: NeutralShape | null = null;
    let nearestDistanceSq = maxRangeSq;

    for (const neutralShape of neutralShapes) {
      if (!neutralShape.active || !neutralShape.isAlive()) {
        continue;
      }

      const distanceSq = Phaser.Math.Distance.Squared(this.owner.x, this.owner.y, neutralShape.x, neutralShape.y);
      if (distanceSq > nearestDistanceSq) {
        continue;
      }

      nearestShape = neutralShape;
      nearestDistanceSq = distanceSq;
    }

    return nearestShape;
  }

  private fireAt(target: WeaponTarget): void {
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

  private fireInDirection(direction: Phaser.Math.Vector2): void {
    const burstCount = this.stats.burstCount ?? 1;
    const totalSpread = this.stats.spreadDegrees ?? 0;
    const baseDirection = direction.clone().normalize();
    this.lastFireDirection = { x: baseDirection.x, y: baseDirection.y };

    for (let index = 0; index < burstCount; index += 1) {
      const spreadOffset =
        burstCount === 1 ? 0 : Phaser.Math.Linear(-totalSpread / 2, totalSpread / 2, index / (burstCount - 1));
      const shotDirection = baseDirection.clone().rotate(Phaser.Math.DegToRad(spreadOffset));
      const projectile = this.getInactiveProjectile() ?? this.createProjectile();
      projectile.fire(this.owner.x, this.owner.y, shotDirection, this.stats);
    }
  }

  private fireRadialBurst(): void {
    const radialCount = Math.max(3, this.stats.radialCount ?? this.stats.burstCount ?? 6);

    for (let index = 0; index < radialCount; index += 1) {
      const angle = (Math.PI * 2 * index) / radialCount;
      const shotDirection = new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle));
      const projectile = this.getInactiveProjectile() ?? this.createProjectile();
      projectile.fire(this.owner.x, this.owner.y, shotDirection, this.stats);
    }
  }

  private getInactiveProjectile(): Projectile | null {
    const projectiles = this.getProjectileEntries();

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

  private fireWithResolvedDirection(currentTime: number, fireDirection: Phaser.Math.Vector2): void {
    if (this.stats.firePattern === 'radial') {
      this.lastFireDirection = { x: fireDirection.x, y: fireDirection.y };
      this.fireRadialBurst();
    } else {
      this.fireInDirection(fireDirection);
    }

    this.createMuzzleFlash();
    playWeaponFireCue(this.stats);
    this.nextFireTime = currentTime + this.stats.fireCooldownMs;
  }

  private toNormalizedVector(direction?: { x: number; y: number } | null): Phaser.Math.Vector2 | null {
    if (!direction || !Number.isFinite(direction.x) || !Number.isFinite(direction.y)) {
      return null;
    }

    const vector = new Phaser.Math.Vector2(direction.x, direction.y);
    if (vector.lengthSq() === 0) {
      return null;
    }

    return vector.normalize();
  }

  private resolveFireDirection(): Phaser.Math.Vector2 | null {
    return this.toNormalizedVector(this.getFireDirection());
  }

  private createMuzzleFlash(): void {
    const isRadial = this.stats.firePattern === 'radial';
    const isExplosive = Boolean(this.stats.explosionRadius);
    const isPiercing = Boolean(this.stats.pierceCount);
    const isHeavy = this.stats.fireCooldownMs >= 900 || this.stats.damage >= 28;
    const isBurst = (this.stats.burstCount ?? 1) > 1 && !isRadial;
    const flashRadius = Math.max(
      8,
      this.stats.projectileRadius *
        (isRadial ? 2.8 : isExplosive ? 2.45 : isHeavy ? 2.15 : isPiercing ? 2.05 : isBurst ? 1.95 : 1.8),
    );
    const flash = this.scene.add.circle(
      this.owner.x,
      this.owner.y,
      flashRadius,
      this.stats.projectileColor,
      isExplosive ? 0.38 : isHeavy ? 0.34 : isBurst ? 0.28 : 0.3,
    );
    flash.setBlendMode(Phaser.BlendModes.ADD);
    flash.setDepth(8);

    const outerRing = this.scene.add.circle(
      this.owner.x,
      this.owner.y,
      flashRadius * (isExplosive ? 0.84 : isRadial ? 0.76 : 0.7),
      this.stats.projectileColor,
      isExplosive ? 0.14 : 0.1,
    );
    outerRing.setStrokeStyle(isExplosive ? 4 : isPiercing ? 3 : isHeavy ? 3 : 2, this.stats.projectileStrokeColor, 0.95);
    outerRing.setBlendMode(Phaser.BlendModes.ADD);
    outerRing.setDepth(8);

    const spark = this.scene.add.circle(this.owner.x, this.owner.y, Math.max(3, flashRadius * 0.42), 0xffffff, isHeavy || isExplosive ? 0.2 : 0.12);
    spark.setBlendMode(Phaser.BlendModes.ADD);
    spark.setDepth(8);

    this.scene.tweens.add({
      targets: [flash, outerRing, spark],
      scale: isRadial ? 2.5 : isExplosive ? 2.35 : isPiercing ? 2.15 : isHeavy ? 2.1 : isBurst ? 2 : 1.8,
      alpha: 0,
      duration: isRadial ? 170 : isExplosive ? 180 : isHeavy ? 150 : isPiercing ? 140 : isBurst ? 115 : 120,
      ease: 'Quad.Out',
      onComplete: () => {
        flash.destroy();
        outerRing.destroy();
        spark.destroy();
      },
    });
  }

  private getProjectileEntries(): Projectile[] {
    const internalChildren = (this.projectileGroup as Phaser.Physics.Arcade.Group & {
      children?: { entries?: Projectile[] };
    }).children;

    return Array.isArray(internalChildren?.entries) ? internalChildren.entries : [];
  }
}
