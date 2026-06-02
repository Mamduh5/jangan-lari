import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { ENEMY_ARCHETYPES, type EnemyArchetype } from '../data/enemies';
import { HEROES } from '../data/heroes';
import { WEAPON_DEFINITIONS, type WeaponDefinition, type WeaponId } from '../data/weapons';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { createMovementKeys } from '../input/createMovementKeys';
import { MovementInputController, type MovementInputSnapshot } from '../input/MovementInputController';
import { AutoFireWeapon } from '../systems/AutoFireWeapon';

const ARENA_WIDTH = 1800;
const ARENA_HEIGHT = 1200;
const BOT_COUNT = 16;
const ZONE_START_RADIUS = 760;
const ZONE_END_RADIUS = 170;
const ZONE_SHRINK_DURATION_MS = 90_000;
const ZONE_DAMAGE_TICK_MS = 1000;
const ZONE_PLAYER_DAMAGE = 8;
const ZONE_BOT_DAMAGE = 10;
const BOT_STRIKE_COOLDOWN_MS = 720;
const BOT_STRIKE_RANGE = 42;

type RoyaleLootKind = 'weapon' | 'repair';

type RoyaleLoot = Phaser.GameObjects.Rectangle & {
  body: Phaser.Physics.Arcade.Body;
};

export type RoyaleSnapshot = {
  active: boolean;
  elapsedMs: number;
  playerAlive: boolean;
  endActive: boolean;
  victory: boolean;
  endTitle: string;
  survivors: number;
  rank: number;
  botCount: number;
  aliveBotCount: number;
  lootCount: number;
  currentWeaponName: string;
  zone: {
    radius: number;
    nextRadius: number;
    status: string;
  };
};

export class RoyaleScene extends Phaser.Scene {
  private player!: Player;
  private bots!: Phaser.Physics.Arcade.Group;
  private loot!: Phaser.Physics.Arcade.Group;
  private movementInput!: MovementInputController;
  private lastMovementInput: MovementInputSnapshot = {
    movement: { x: 0, y: 0 },
    facing: { x: 1, y: 0 },
    source: 'idle',
    aim: { x: 1, y: 0 },
    aimActive: false,
    aimSource: 'idle',
    hasExplicitAim: false,
  };
  private currentWeapon!: AutoFireWeapon;
  private currentWeaponDefinition: WeaponDefinition = WEAPON_DEFINITIONS['arc-bolt'];
  private projectileCollider: Phaser.Physics.Arcade.Collider | null = null;
  private botPlayerCollider: Phaser.Physics.Arcade.Collider | null = null;
  private botBotCollider: Phaser.Physics.Arcade.Collider | null = null;
  private lootCollider: Phaser.Physics.Arcade.Collider | null = null;
  private elapsedMs = 0;
  private zoneRadius = ZONE_START_RADIUS;
  private nextZoneDamageAtMs = ZONE_DAMAGE_TICK_MS;
  private isEnded = false;
  private isRestarting = false;
  private victory = false;
  private endTitle = '';
  private eliminatedBots = new Set<Enemy>();
  private lootLabels = new Map<RoyaleLoot, Phaser.GameObjects.Text>();
  private hudSurvivorsText!: Phaser.GameObjects.Text;
  private hudWeaponText!: Phaser.GameObjects.Text;
  private hudZoneText!: Phaser.GameObjects.Text;
  private hudStatusText!: Phaser.GameObjects.Text;
  private safeZoneFill!: Phaser.GameObjects.Arc;
  private safeZoneRing!: Phaser.GameObjects.Arc;
  private endOverlay!: Phaser.GameObjects.Container;
  private endTitleText!: Phaser.GameObjects.Text;
  private endBodyText!: Phaser.GameObjects.Text;
  private restartButtonBase!: Phaser.GameObjects.Rectangle;
  private restartButton!: Phaser.GameObjects.Text;

  constructor() {
    super('RoyaleScene');
  }

  create(): void {
    this.elapsedMs = 0;
    this.zoneRadius = ZONE_START_RADIUS;
    this.nextZoneDamageAtMs = ZONE_DAMAGE_TICK_MS;
    this.isEnded = false;
    this.isRestarting = false;
    this.victory = false;
    this.endTitle = '';
    this.eliminatedBots.clear();
    this.lootLabels.clear();

    this.cameras.main.setBackgroundColor('#10201b');
    this.physics.world.setBounds(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    this.drawArena();

    this.player = new Player(this, ARENA_WIDTH / 2, ARENA_HEIGHT / 2, HEROES.runner);
    this.player.addMoveSpeed(HEROES.runner.moveSpeedBonus);
    this.bots = this.physics.add.group({ runChildUpdate: false });
    this.loot = this.physics.add.group({ runChildUpdate: false });

    this.spawnBots();
    this.spawnLoot();
    this.equipWeapon('arc-bolt');

    this.movementInput = new MovementInputController(this, createMovementKeys(this));
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

    this.botPlayerCollider = this.physics.add.collider(this.player, this.bots, (_playerObject, botObject) => {
      if (botObject instanceof Enemy) {
        this.handlePlayerBotContact(botObject);
      }
    });
    this.botBotCollider = this.physics.add.collider(this.bots, this.bots);
    this.lootCollider = this.physics.add.overlap(this.player, this.loot, (_playerObject, lootObject) => {
      if (lootObject instanceof Phaser.GameObjects.Rectangle) {
        this.collectLoot(lootObject as RoyaleLoot);
      }
    });

    this.createHud();
    this.createEndOverlay();
    this.publishHudState('Find a weapon pickup and survive the shrinking safe area.');

    this.input.keyboard?.on('keydown-ENTER', this.handleRestartShortcut, this);
    this.input.keyboard?.on('keydown-SPACE', this.handleRestartShortcut, this);
    this.input.on('pointerdown', this.handleEndOverlayPointerDown, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
  }

  update(_time: number, delta: number): void {
    if (this.isEnded) {
      return;
    }

    this.elapsedMs += delta;
    this.lastMovementInput = this.movementInput.getMovementInput();
    const movement = new Phaser.Math.Vector2(this.lastMovementInput.movement.x, this.lastMovementInput.movement.y);
    this.player.move(movement, !this.lastMovementInput.hasExplicitAim);
    this.player.setFacingDirection(new Phaser.Math.Vector2(this.lastMovementInput.facing.x, this.lastMovementInput.facing.y));
    this.player.updateVisualState(this.time.now);

    this.updateBots();
    this.currentWeapon.update(this.time.now, delta);
    this.updateSafeZone(delta);
    this.checkMatchEnd();
    this.publishHudState();
  }

  public restartMatch(): void {
    if (this.isRestarting) {
      return;
    }

    this.isRestarting = true;
    this.scene.restart();
  }

  public exitToMenu(): void {
    this.scene.start('MenuScene');
  }

  public getRoyaleSnapshot(): RoyaleSnapshot {
    const aliveBotCount = this.getAliveBots().length;
    const playerAlive = this.player?.isAlive() ?? false;
    return {
      active: this.scene.isActive('RoyaleScene'),
      elapsedMs: this.elapsedMs,
      playerAlive,
      endActive: this.isEnded,
      victory: this.victory,
      endTitle: this.endTitle,
      survivors: aliveBotCount + Number(playerAlive),
      rank: playerAlive ? aliveBotCount + 1 : aliveBotCount + 1,
      botCount: this.bots?.getChildren().length ?? 0,
      aliveBotCount,
      lootCount: this.getActiveLoot().length,
      currentWeaponName: this.currentWeaponDefinition.name,
      zone: {
        radius: this.zoneRadius,
        nextRadius: ZONE_END_RADIUS,
        status: this.getZoneStatusText(),
      },
    };
  }

  public debugCollectNearestLoot(): boolean {
    const firstLoot = this.getActiveLoot()[0];
    if (!firstLoot) {
      return false;
    }

    firstLoot.setPosition(this.player.x, this.player.y);
    this.collectLoot(firstLoot);
    return true;
  }

  public debugDamageFirstBot(amount = 999): boolean {
    const bot = this.getAliveBots()[0];
    if (!bot) {
      return false;
    }

    this.damageBot(bot, amount, { x: this.player.x, y: this.player.y }, 'player');
    return true;
  }

  public debugEliminateRemainingBots(): boolean {
    const bots = this.getAliveBots();
    if (bots.length === 0) {
      return false;
    }

    for (const bot of bots) {
      this.damageBot(bot, 9999, { x: this.player.x, y: this.player.y }, 'player');
    }
    this.checkMatchEnd();
    return true;
  }

  public debugEndMatch(victory: boolean): void {
    this.endMatch(victory, victory ? 'Victory' : 'Defeat', victory ? 'Debug royale field cleared.' : 'Debug royale defeat.');
  }

  private drawArena(): void {
    this.add.rectangle(ARENA_WIDTH / 2, ARENA_HEIGHT / 2, ARENA_WIDTH, ARENA_HEIGHT, 0x183428, 1);

    for (let x = 120; x < ARENA_WIDTH; x += 240) {
      this.add.line(0, 0, x, 0, x, ARENA_HEIGHT, 0x244a39, 0.28).setOrigin(0).setDepth(0);
    }

    for (let y = 120; y < ARENA_HEIGHT; y += 240) {
      this.add.line(0, 0, 0, y, ARENA_WIDTH, y, 0x244a39, 0.28).setOrigin(0).setDepth(0);
    }

    const coverPoints = [
      [290, 240],
      [610, 930],
      [890, 320],
      [1180, 720],
      [1510, 390],
      [1450, 990],
    ];
    for (const [x, y] of coverPoints) {
      this.add.rectangle(x, y, 96, 52, 0x315c45, 0.88).setStrokeStyle(2, 0x8db99b, 0.36).setDepth(1);
    }
  }

  private spawnBots(): void {
    const centerX = ARENA_WIDTH / 2;
    const centerY = ARENA_HEIGHT / 2;
    for (let index = 0; index < BOT_COUNT; index += 1) {
      const angle = (Math.PI * 2 * index) / BOT_COUNT;
      const radius = 360 + (index % 4) * 90;
      const x = Phaser.Math.Clamp(centerX + Math.cos(angle) * radius, 72, ARENA_WIDTH - 72);
      const y = Phaser.Math.Clamp(centerY + Math.sin(angle) * radius, 72, ARENA_HEIGHT - 72);
      const bot = new Enemy(this, x, y, this.createBotArchetype(index));
      bot.setData('nextStrikeAt', this.time.now + 500 + index * 45);
      this.bots.add(bot);
    }
  }

  private createBotArchetype(index: number): EnemyArchetype {
    const base =
      index % 5 === 0
        ? ENEMY_ARCHETYPES.skimmer
        : index % 4 === 0
          ? ENEMY_ARCHETYPES.mauler
          : ENEMY_ARCHETYPES.scuttler;

    return {
      ...base,
      name: `Prototype Bot ${index + 1}`,
      maxHealth: 26 + (index % 4) * 7,
      speed: 92 + (index % 5) * 10,
      contactDamage: 6 + (index % 3) * 2,
      xpValue: 0,
      isElite: false,
      isMiniboss: false,
      isBoss: false,
      behavior: index % 5 === 0 ? 'intercept' : index % 4 === 0 ? 'blocker' : 'chase',
    };
  }

  private spawnLoot(): void {
    const entries: Array<{ x: number; y: number; kind: RoyaleLootKind; weaponId?: WeaponId; label: string; color: number }> = [
      { x: 520, y: 390, kind: 'weapon', weaponId: 'twin-fangs', label: 'TF', color: 0x7dd3fc },
      { x: 1260, y: 430, kind: 'weapon', weaponId: 'ember-lance', label: 'EL', color: 0xfb7185 },
      { x: 420, y: 880, kind: 'weapon', weaponId: 'sunwheel', label: 'SW', color: 0xfbbf24 },
      { x: 1320, y: 890, kind: 'repair', label: '+', color: 0x86efac },
      { x: 900, y: 190, kind: 'weapon', weaponId: 'phase-disc', label: 'PD', color: 0xc084fc },
    ];

    for (const entry of entries) {
      const pickup = this.add.rectangle(entry.x, entry.y, 38, 38, entry.color, 0.9) as RoyaleLoot;
      pickup.setStrokeStyle(3, 0xf8fafc, 0.82);
      pickup.setDepth(3);
      pickup.setData('kind', entry.kind);
      pickup.setData('weaponId', entry.weaponId ?? '');
      this.physics.add.existing(pickup);
      pickup.body.setAllowGravity(false);
      pickup.body.setCircle(19);
      this.loot.add(pickup);

      const label = this.add
        .text(entry.x, entry.y, entry.label, {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '14px',
          color: '#0f172a',
        })
        .setOrigin(0.5)
        .setDepth(4);
      this.lootLabels.set(pickup, label);
    }
  }

  private equipWeapon(weaponId: WeaponId): void {
    this.currentWeapon?.destroy();
    this.projectileCollider?.destroy();
    this.currentWeaponDefinition = WEAPON_DEFINITIONS[weaponId];
    this.currentWeapon = new AutoFireWeapon(this, this.player, this.bots, null, this.currentWeaponDefinition, () =>
      this.lastMovementInput.hasExplicitAim ? this.lastMovementInput.aim : this.player.getFacingDirection(),
    );
    this.projectileCollider = this.physics.add.overlap(this.currentWeapon.getProjectiles(), this.bots, (projectileObject, botObject) => {
      if (projectileObject instanceof Projectile && botObject instanceof Enemy) {
        this.handleProjectileBotOverlap(projectileObject, botObject);
      }
    });
  }

  private collectLoot(pickup: RoyaleLoot): void {
    if (!pickup.active || this.isEnded) {
      return;
    }

    const kind = String(pickup.getData('kind')) as RoyaleLootKind;
    if (kind === 'weapon') {
      const weaponId = String(pickup.getData('weaponId')) as WeaponId;
      if (weaponId in WEAPON_DEFINITIONS) {
        this.equipWeapon(weaponId);
        this.publishHudState(`Picked up ${WEAPON_DEFINITIONS[weaponId].name}.`);
      }
    } else {
      const healed = this.player.heal(24);
      this.publishHudState(healed > 0 ? `Repaired ${healed} HP.` : 'Repair held. HP already full.');
    }

    this.lootLabels.get(pickup)?.destroy();
    this.lootLabels.delete(pickup);
    pickup.destroy();
  }

  private updateBots(): void {
    const bots = this.getAliveBots();
    for (const bot of bots) {
      const target = this.findBotTarget(bot, bots);
      if (!target) {
        bot.body.setVelocity(0, 0);
        bot.updatePresentation(this.time.now);
        continue;
      }

      bot.chase(target, this.time.now);
      bot.updatePresentation(this.time.now);

      if (target instanceof Enemy) {
        this.tryBotStrike(bot, target);
      }
    }
  }

  private findBotTarget(bot: Enemy, bots: Enemy[]): Player | Enemy | null {
    let target: Player | Enemy | null = this.player.isAlive() ? this.player : null;
    let nearestDistanceSq = target ? Phaser.Math.Distance.Squared(bot.x, bot.y, target.x, target.y) : Number.POSITIVE_INFINITY;

    for (const candidate of bots) {
      if (candidate === bot || !candidate.isAlive()) {
        continue;
      }

      const distanceSq = Phaser.Math.Distance.Squared(bot.x, bot.y, candidate.x, candidate.y);
      if (distanceSq < nearestDistanceSq) {
        target = candidate;
        nearestDistanceSq = distanceSq;
      }
    }

    return target;
  }

  private tryBotStrike(attacker: Enemy, target: Enemy): void {
    const distance = Phaser.Math.Distance.Between(attacker.x, attacker.y, target.x, target.y);
    if (distance > BOT_STRIKE_RANGE) {
      return;
    }

    const nextStrikeAt = Number(attacker.getData('nextStrikeAt') ?? 0);
    if (this.time.now < nextStrikeAt) {
      return;
    }

    attacker.setData('nextStrikeAt', this.time.now + BOT_STRIKE_COOLDOWN_MS);
    this.damageBot(target, Math.max(5, Math.round(attacker.contactDamage * 0.85)), { x: attacker.x, y: attacker.y }, 'bot');
  }

  private updateSafeZone(_deltaMs: number): void {
    const progress = Phaser.Math.Clamp(this.elapsedMs / ZONE_SHRINK_DURATION_MS, 0, 1);
    this.zoneRadius = Phaser.Math.Linear(ZONE_START_RADIUS, ZONE_END_RADIUS, progress);
    this.safeZoneFill.setRadius(this.zoneRadius);
    this.safeZoneRing.setRadius(this.zoneRadius);
    this.safeZoneRing.setStrokeStyle(5, progress > 0.7 ? 0xfbbf24 : 0x86efac, 0.92);

    if (this.elapsedMs < this.nextZoneDamageAtMs) {
      return;
    }

    this.nextZoneDamageAtMs += ZONE_DAMAGE_TICK_MS;
    this.applyZoneDamage();
  }

  private applyZoneDamage(): void {
    const centerX = ARENA_WIDTH / 2;
    const centerY = ARENA_HEIGHT / 2;

    if (this.player.isAlive() && Phaser.Math.Distance.Between(this.player.x, this.player.y, centerX, centerY) > this.zoneRadius) {
      const tookDamage = this.player.takeDamage(ZONE_PLAYER_DAMAGE, this.time.now);
      if (tookDamage) {
        this.createBurstCircle(this.player.x, this.player.y, 0xf97316, 10, 34, 180, 0.7);
        if (!this.player.isAlive()) {
          this.endMatch(false, 'Defeat', 'The danger zone caught you.');
          return;
        }
      }
    }

    for (const bot of this.getAliveBots()) {
      if (Phaser.Math.Distance.Between(bot.x, bot.y, centerX, centerY) > this.zoneRadius) {
        this.damageBot(bot, ZONE_BOT_DAMAGE, { x: centerX, y: centerY }, 'zone');
      }
    }
  }

  private handleProjectileBotOverlap(projectile: Projectile, bot: Enemy): void {
    if (!projectile.active || !bot.active || this.isEnded || !bot.isAlive()) {
      return;
    }

    const shouldDeactivate = projectile.consumeHit();
    this.damageBot(bot, projectile.getDamage(), { x: projectile.x, y: projectile.y }, 'player', projectile.getVisualColor());

    const explosionRadius = projectile.getExplosionRadius();
    const explosionDamage = projectile.getExplosionDamage();
    if (explosionRadius > 0 && explosionDamage > 0) {
      this.applyProjectileExplosion(bot.x, bot.y, explosionRadius, explosionDamage, bot, projectile.getVisualColor());
    }

    if (shouldDeactivate) {
      projectile.deactivate();
    }
  }

  private applyProjectileExplosion(x: number, y: number, radius: number, damage: number, primaryTarget: Enemy, color: number): void {
    this.createBurstCircle(x, y, color, 12, radius, 210, 0.42);

    for (const bot of this.getAliveBots()) {
      if (bot === primaryTarget) {
        continue;
      }

      if (Phaser.Math.Distance.Between(x, y, bot.x, bot.y) <= radius) {
        this.damageBot(bot, damage, { x, y }, 'player', color);
      }
    }
  }

  private damageBot(bot: Enemy, amount: number, impactPoint: { x: number; y: number }, source: 'player' | 'bot' | 'zone', color = 0xfacc15): void {
    if (!bot.active || !bot.isAlive() || this.eliminatedBots.has(bot)) {
      return;
    }

    const x = bot.x;
    const y = bot.y;
    const died = bot.takeDamage(amount, impactPoint);
    if (!died) {
      return;
    }

    this.eliminatedBots.add(bot);
    this.createBurstCircle(x, y, source === 'zone' ? 0xf97316 : color, 10, 42, 220, 0.85);
    this.publishHudState(source === 'player' ? 'Bot eliminated.' : source === 'zone' ? 'A bot fell outside the safe area.' : 'Bots traded an elimination.');
  }

  private handlePlayerBotContact(bot: Enemy): void {
    if (this.isEnded || !bot.isAlive()) {
      return;
    }

    const tookDamage = this.player.takeDamage(bot.contactDamage, this.time.now);
    if (!tookDamage) {
      return;
    }

    this.createBurstCircle(this.player.x, this.player.y, 0xf87171, 10, 34, 170, 0.72);
    if (!this.player.isAlive()) {
      this.endMatch(false, 'Defeat', 'A prototype bot knocked you out.');
    }
  }

  private checkMatchEnd(): void {
    if (this.isEnded) {
      return;
    }

    if (!this.player.isAlive()) {
      this.endMatch(false, 'Defeat', 'You were eliminated.');
      return;
    }

    if (this.getAliveBots().length === 0) {
      this.endMatch(true, 'Victory', 'You are the last survivor in the prototype arena.');
    }
  }

  private endMatch(victory: boolean, title: string, subtitle: string): void {
    if (this.isEnded) {
      return;
    }

    this.isEnded = true;
    this.victory = victory;
    this.endTitle = title;
    this.player.move(new Phaser.Math.Vector2(0, 0));
    for (const bot of this.getAliveBots()) {
      bot.body.setVelocity(0, 0);
    }
    this.physics.pause();
    this.movementInput?.suspendForOverlay();

    this.endTitleText.setText(title);
    this.endTitleText.setColor(victory ? '#fef08a' : '#fecaca');
    this.endBodyText.setText(`${subtitle}\nSurvivors: ${this.getAliveBots().length + Number(this.player.isAlive())}  Rank: #${this.getPlayerRank()}`);
    this.endOverlay.setVisible(true);
    this.publishHudState(victory ? 'Victory. Restart to run the prototype again.' : 'Defeat. Restart to try again.');
  }

  private createHud(): void {
    this.safeZoneFill = this.add.circle(ARENA_WIDTH / 2, ARENA_HEIGHT / 2, this.zoneRadius, 0x86efac, 0.045).setDepth(1.5);
    this.safeZoneRing = this.add.circle(ARENA_WIDTH / 2, ARENA_HEIGHT / 2, this.zoneRadius, 0x000000, 0).setDepth(2);
    this.safeZoneRing.setStrokeStyle(5, 0x86efac, 0.92);

    const panel = this.add.rectangle(18, 18, 430, 104, 0x07130f, 0.82).setOrigin(0, 0).setScrollFactor(0).setDepth(50);
    panel.setStrokeStyle(1, 0x86efac, 0.45);
    this.hudSurvivorsText = this.add.text(34, 32, '', this.getHudTextStyle(18, '#f8fafc')).setScrollFactor(0).setDepth(51);
    this.hudWeaponText = this.add.text(34, 58, '', this.getHudTextStyle(14, '#bfdbfe')).setScrollFactor(0).setDepth(51);
    this.hudZoneText = this.add.text(34, 82, '', this.getHudTextStyle(14, '#fde68a')).setScrollFactor(0).setDepth(51);
    this.hudStatusText = this.add
      .text(GAME_WIDTH / 2, 24, '', {
        ...this.getHudTextStyle(15, '#e2e8f0'),
        align: 'center',
        wordWrap: { width: 620 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(51);
  }

  private createEndOverlay(): void {
    const backdrop = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x020617, 0.82).setScrollFactor(0);
    const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 520, 260, 0x0f172a, 0.98).setScrollFactor(0);
    panel.setStrokeStyle(2, 0x93c5fd, 0.86);
    this.endTitleText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 78, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '38px',
        color: '#fef08a',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    this.endBodyText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 12, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '16px',
        color: '#dbeafe',
        align: 'center',
        wordWrap: { width: 430 },
        lineSpacing: 6,
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    this.restartButtonBase = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 92, 172, 54, 0xfde68a, 1)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    this.restartButtonBase.on('pointerdown', () => this.restartMatch());

    this.restartButton = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 92, 'RESTART', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '22px',
        color: '#111827',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    this.restartButton.on('pointerdown', () => this.restartMatch());

    this.endOverlay = this.add.container(0, 0, [
      backdrop,
      panel,
      this.endTitleText,
      this.endBodyText,
      this.restartButtonBase,
      this.restartButton,
    ]);
    this.endOverlay.setDepth(80);
    this.endOverlay.setVisible(false);
  }

  private publishHudState(status?: string): void {
    this.hudSurvivorsText?.setText(`Survivors ${this.getAliveBots().length + Number(this.player.isAlive())}/${BOT_COUNT + 1}  Rank #${this.getPlayerRank()}`);
    this.hudWeaponText?.setText(`Weapon ${this.currentWeaponDefinition.name}`);
    this.hudZoneText?.setText(this.getZoneStatusText());
    if (status) {
      this.hudStatusText?.setText(status);
    }
  }

  private getZoneStatusText(): string {
    const remainingMs = Math.max(0, ZONE_SHRINK_DURATION_MS - this.elapsedMs);
    return `Safe radius ${Math.round(this.zoneRadius)} -> ${ZONE_END_RADIUS}  ${Math.ceil(remainingMs / 1000)}s`;
  }

  private getPlayerRank(): number {
    return this.player?.isAlive() ? this.getAliveBots().length + 1 : this.getAliveBots().length + 1;
  }

  private getAliveBots(): Enemy[] {
    return ((this.bots?.getChildren() ?? []) as Enemy[]).filter((bot) => bot.active && bot.isAlive());
  }

  private getActiveLoot(): RoyaleLoot[] {
    return ((this.loot?.getChildren() ?? []) as RoyaleLoot[]).filter((pickup) => pickup.active);
  }

  private createBurstCircle(x: number, y: number, color: number, startRadius: number, endRadius: number, duration: number, alpha: number): void {
    const burst = this.add.circle(x, y, startRadius, color, alpha).setDepth(10);
    burst.setStrokeStyle(2, color, Math.min(1, alpha + 0.12));
    this.tweens.add({
      targets: burst,
      radius: endRadius,
      alpha: 0,
      duration,
      ease: 'Quad.Out',
      onComplete: () => burst.destroy(),
    });
  }

  private getHudTextStyle(fontSize: number, color: string): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: `${fontSize}px`,
      color,
      stroke: '#000000',
      strokeThickness: 2,
    };
  }

  private handleRestartShortcut(): void {
    if (this.isEnded) {
      this.restartMatch();
    }
  }

  private handleEndOverlayPointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.isEnded || !this.endOverlay.visible) {
      return;
    }

    const buttonWidth = 172;
    const buttonHeight = 54;
    const buttonX = GAME_WIDTH / 2;
    const buttonY = GAME_HEIGHT / 2 + 92;
    const insideRestartButton =
      Math.abs(pointer.x - buttonX) <= buttonWidth / 2 && Math.abs(pointer.y - buttonY) <= buttonHeight / 2;

    if (insideRestartButton) {
      this.restartMatch();
    }
  }

  private handleShutdown(): void {
    this.currentWeapon?.destroy();
    this.projectileCollider?.destroy();
    this.botPlayerCollider?.destroy();
    this.botBotCollider?.destroy();
    this.lootCollider?.destroy();
    this.movementInput?.destroy();
    this.input.keyboard?.off('keydown-ENTER', this.handleRestartShortcut, this);
    this.input.keyboard?.off('keydown-SPACE', this.handleRestartShortcut, this);
    this.input.off('pointerdown', this.handleEndOverlayPointerDown, this);
    for (const label of this.lootLabels.values()) {
      label.destroy();
    }
    this.lootLabels.clear();
  }
}
