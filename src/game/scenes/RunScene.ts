import Phaser from 'phaser';
import { playCue, playHeroIntroCue } from '../audio/audioCuePlayer';
import {
  CombatResponseController,
  getEnemyCombatResponseProfile,
  resolveCombatImpactResponse,
} from '../combat/combatResponse';
import {
  BOSS_SPAWN_TIME_MS,
  BOSS_SPAWN_PLAYER_SAFE_RADIUS,
  BOSS_SPAWN_DISTANCE,
  BOSS_SUMMON_BATCH_SIZE,
  BOSS_SUMMON_FIRST_DELAY_MS,
  BOSS_SUMMON_INTERVAL_MS,
  BOSS_SUMMON_MAX_ACTIVE,
  BOSS_SUMMON_SPAWN_DISTANCE,
  BOSS_SUMMON_SPAWN_DISTANCE_STEP,
  BOSS_TARGET_FAST_KILL_MS,
  CAMERA_OVERSCROLL_PADDING_X,
  CAMERA_OVERSCROLL_PADDING_Y,
  CHALLENGE_WAVE_EVENT_DURATION_MS,
  CHALLENGE_WAVE_EVENT_WINDOW_END_MS,
  CHALLENGE_WAVE_EVENT_WINDOW_START_MS,
  ELITE_SPAWN_INDICATOR_MS,
  ELITE_SPAWN_PLAYER_SAFE_RADIUS,
  ENEMY_ACTIVE_CAP,
  ENEMY_SPAWN_INTERVAL_MS,
  ENEMY_SPAWN_PLAYER_SAFE_RADIUS,
  ENEMY_SPAWN_SAFE_ATTEMPTS,
  ENDING_FLASH_MS,
  EVENT_ENEMY_STAT_MULTIPLIER,
  FIRST_ELITE_XP_BONUS,
  BREAKOUT_PULSE_BOSS_KNOCKBACK_MULTIPLIER,
  BREAKOUT_PULSE_COOLDOWN_MS,
  BREAKOUT_PULSE_ELITE_KNOCKBACK_MULTIPLIER,
  BREAKOUT_PULSE_INVULNERABILITY_MS,
  BREAKOUT_PULSE_KNOCKBACK,
  BREAKOUT_PULSE_RADIUS,
  DANGER_ZONE_ACTIVE_MS,
  DANGER_ZONE_COOLDOWN_MS,
  DANGER_ZONE_DAMAGE,
  DANGER_ZONE_FIRST_MS,
  DANGER_ZONE_RADIUS,
  DANGER_ZONE_TICK_MS,
  DANGER_ZONE_WARNING_MS,
  FORMATION_PINCER_DISTANCE,
  FORMATION_RING_RADIUS,
  FORMATION_SWEEP_DISTANCE,
  GAME_HEIGHT,
  GAME_WIDTH,
  LEVEL_UP_FLASH_MS,
  MAGNET_PICKUP_RANGE_BONUS,
  NEUTRAL_SHAPE_INITIAL_COUNT,
  NEUTRAL_SHAPE_MAX_COUNT,
  NEUTRAL_SHAPE_PLAYER_SAFE_RADIUS,
  NEUTRAL_SHAPE_SPAWN_INTERVAL_MS,
  NEUTRAL_SHAPE_SPAWN_PADDING,
  NORMAL_ENEMY_SPAWN_DISTANCE,
  PERMANENT_HP_REGEN_PER_LEVEL,
  PERMANENT_MAX_HP_PER_LEVEL,
  PERMANENT_MOVE_SPEED_PER_LEVEL,
  PERMANENT_PICKUP_RANGE_PER_LEVEL,
  PERMANENT_STARTING_DAMAGE_PER_LEVEL,
  PLAYER_HIT_SHAKE_DURATION_MS,
  PLAYER_HIT_SHAKE_INTENSITY,
  POWER_DAMAGE_BONUS,
  RAPID_FIRE_COOLDOWN_REDUCTION_MS,
  REACH_RANGE_BONUS,
  REWARD_TARGET_EVENT_DURATION_MS,
  REWARD_TARGET_EVENT_WINDOW_END_MS,
  REWARD_TARGET_EVENT_WINDOW_START_MS,
  RUN_EVENT_ENCOUNTER_BUFFER_MS,
  SWIFTNESS_MOVE_SPEED_BONUS,
  VELOCITY_PROJECTILE_SPEED_BONUS,
  VITALITY_REGEN_PER_SECOND,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../config/constants';
import {
  BOSS_CROSSFIRE_COLOR,
  BOSS_CROSSFIRE_PROJECTILE_COUNT_PHASE_1,
  BOSS_CROSSFIRE_PROJECTILE_COUNT_PHASE_2,
  BOSS_CROSSFIRE_PROJECTILE_DAMAGE,
  BOSS_CROSSFIRE_PROJECTILE_RADIUS,
  BOSS_CROSSFIRE_PROJECTILE_SPEED,
  BOSS_STATE_SEQUENCE_PHASE_1,
  BOSS_STATE_SEQUENCE_PHASE_2,
  BOSS_SUMMON_COMPOSITIONS,
  type BossFightState,
  type BossStateDefinition,
} from '../config/bossBalance';
import { BUFF_SHRINE_EVENT, MAP_EVENT_ENCOUNTER_BUFFER_MS, REWARD_TARGET_ENEMY_BALANCE } from '../config/mapEventBalance';
import { resolveEnemyProjectileVisualDiameter } from '../config/projectileVisualBalance';
import {
  WAVE_FORMATION_COOLDOWN_MS,
  WAVE_FORMATION_ENABLE_TIME_MS,
  WAVE_FORMATION_RETRY_MS,
  WAVE_TEMPLATE_ALERT_COOLDOWN_MS,
  getWaveDirectorWindow,
} from '../config/waveDirectorBalance';
import { HEROES } from '../data/heroes';
import { chooseNeutralShapeKind } from '../data/neutralShapes';
import {
  BASIC_TANK_CLASS_ID,
  TANK_CLASS_EVOLUTION_LEVEL,
  canSelectTankClass,
  getAvailableTankClassChoices,
  getTankClassDefinition,
  type TankClassDefinition,
  type TankClassId,
} from '../data/tankClasses';
import {
  UPGRADE_POOL,
  buildLevelUpChoices,
  findUpgradeDefinitionById,
  shouldQueueBreakthroughChoice,
  type UpgradeChoiceMode,
  type UpgradeDefinition,
  type UpgradeId,
} from '../data/upgrades';
import { WEAPON_DEFINITIONS, type WeaponDefinition, type WeaponId } from '../data/weapons';
import { Enemy, type EnemyAttackSignal } from '../entities/Enemy';
import { NeutralShape } from '../entities/NeutralShape';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { XPGem } from '../entities/XPGem';
import { createMovementKeys } from '../input/createMovementKeys';
import { MovementInputController, type ActivePointerLike, type MovementInputSnapshot } from '../input/MovementInputController';
import type { GameplayBotRunSnapshot } from '../debug/gameplaySnapshot';
import { TANK_STAT_IDS, getTankStatDefinition, type TankStatId } from '../data/tankStats';
import type { EffectAssetId } from '../data/assetSlots';
import type { ControlGuideMode, GameSaveData } from '../save/saveData';
import { loadGameSave, markControlHintDismissed, recordLocalLeaderboardEntry, updateControlGuideMode } from '../save/saveData';
import { applyRunProgressToQuests } from '../save/saveQuests';
import { awardRunGold, getPermanentUpgradeLevel } from '../save/saveUpgrades';
import { AutoFireWeapon } from '../systems/AutoFireWeapon';
import {
  applyEventEnemyStatMultiplier,
  applyEnemyScaling,
  getAvailableEnemySpawnSlots,
  getEnemyScalingSnapshot,
} from '../systems/enemyScaling';
import {
  createBossShockwaveContract,
  createMinibossLineAttackContract,
  createMinibossVolleyContract,
} from '../systems/dangerousEffectContracts';
import { resolveBossPhase, type BossPhase } from '../systems/bossPhase';
import {
  createBossSummonArchetype,
  getAvailableBossSummonSlots,
  getBossPhasePressureState,
  shouldSpawnBossSummons,
} from '../systems/bossSummons';
import { getUpgradeRewardType, upgradeHasWeaponRewardTag } from '../systems/rewardClassification';
import { SpawnDirector } from '../systems/SpawnDirector';
import { getEnemyProjectileVisual, getEnemyXpReward, getXpGemVisual, type ProjectileVisual } from '../systems/readabilityVisuals';
import { chooseSafeSpawnPoint } from '../systems/spawnSafety';
import { TankStatRuntime } from '../systems/TankStatRuntime';
import type { EnemyArchetypeId } from '../data/enemies';
import { ENEMY_ARCHETYPES, type EnemyArchetype } from '../data/enemies';
import {
  accumulateRunElapsedMs,
  beginLevelUpCountdown,
  calculateRunGoldReward,
  chooseRandomValidIndex,
  clearRunRegistryState,
  createFreshRunSessionState,
  shouldBeginQueuedLevelUp,
  tickLevelUpCountdown,
  writeFreshRunRegistryState,
} from '../utils/runSession';
import { calculateRunScore } from '../utils/runScore';
import {
  areNormalSpawnsSuppressed,
  getStagePhaseForRunState,
  getStageVictoryCondition,
  type StagePhase,
} from '../utils/stagePhase';
import {
  getEffectSpriteAssetSlot,
  getPowerCoreMapEventIconAssetSlot,
  getProjectileSpriteAssetSlot,
  shouldUseVisualAsset,
} from '../utils/assetResolver';

type RunEventType = 'challenge-wave' | 'reward-target' | 'buff-shrine';

type EnemyBolt = {
  orb: Phaser.GameObjects.Arc;
  halo: Phaser.GameObjects.Arc;
  sprite?: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  elapsedMs: number;
  lifetimeMs: number;
  hasHitPlayer: boolean;
  visual: ProjectileVisual;
};

type ActiveRunEvent =
  | {
      type: 'challenge-wave';
      title: string;
      objective: string;
      startedAtMs: number;
      endsAtMs: number;
      challengeEnemies: Enemy[];
      rewardGold: number;
      rewardLevelUps: number;
    }
  | {
      type: 'reward-target';
      title: string;
      objective: string;
      startedAtMs: number;
      endsAtMs: number;
      targetEnemy: Enemy;
      rewardGold: number;
      rewardXp: number;
    }
  | {
      type: 'buff-shrine';
      title: string;
      objective: string;
      startedAtMs: number;
      endsAtMs: number;
      x: number;
      y: number;
      pressureEnemies: Enemy[];
      shrineVisual: Phaser.GameObjects.Arc;
      claimRing: Phaser.GameObjects.Arc;
      label: Phaser.GameObjects.Text;
      icon?: Phaser.GameObjects.Image;
    };

type FormationType = 'ring-breakout' | 'pincer' | 'sweep-wall';

type FormationSpawnPoint = {
  x: number;
  y: number;
  distanceFromPlayer: number;
  angle: number;
};

type DangerZonePhase = 'warning' | 'active';

type DangerZone = {
  x: number;
  y: number;
  radius: number;
  warningMs: number;
  activeMs: number;
  elapsedMs: number;
  damage: number;
  nextDamageAtMs: number;
  warningVisual: Phaser.GameObjects.Arc;
  activeVisual: Phaser.GameObjects.Arc;
  phase: DangerZonePhase;
};

export class RunScene extends Phaser.Scene {
  private player!: Player;
  private enemies!: Phaser.Physics.Arcade.Group;
  private neutralShapes!: Phaser.Physics.Arcade.Group;
  private xpGems!: Phaser.Physics.Arcade.Group;
  private weapons: AutoFireWeapon[] = [];
  private ownedWeaponIds = new Set<string>();
  private spawnDirector!: SpawnDirector;
  private saveData!: GameSaveData;
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
  private tankStats!: TankStatRuntime;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private neutralShapeSpawnTimer?: Phaser.Time.TimerEvent;
  private stagePhase: StagePhase = 'preBoss';
  private bossEnemy: Enemy | null = null;
  private bossPhase: BossPhase = 1;
  private bossPhaseTwoTriggered = false;
  private nextBossSummonAtMs = Number.POSITIVE_INFINITY;
  private bossFightState: BossFightState = 'approach';
  private bossStateIndex = 0;
  private bossStateEndsAtMs = Number.POSITIVE_INFINITY;
  private bossStateActionDone = false;
  private bossSummonCompositionIndex = 0;
  private colliders: Phaser.Physics.Arcade.Collider[] = [];
  private combatResponse!: CombatResponseController;
  private combatResponseImpactCounts: Partial<Record<WeaponId, number>> = {};
  private combatResponseEnemyImpactCounts: Partial<Record<EnemyArchetypeId, number>> = {};
  private lineStrikeAttacks: Array<{
    kind: 'miniboss-line-strike';
    x: number;
    y: number;
    direction: { x: number; y: number };
    length: number;
    visualWidth: number;
    damageWidth: number;
    halfWidth: number;
    damage: number;
    durationMs: number;
    activeVisualMs: number;
    elapsedMs: number;
    hasHitPlayer: boolean;
  }> = [];
  private shockwaveAttacks: Array<{
    ring: Phaser.GameObjects.Arc;
    halo: Phaser.GameObjects.Arc;
    x: number;
    y: number;
    maxRadius: number;
    currentRadius: number;
    durationMs: number;
    activeVisualMs: number;
    elapsedMs: number;
    thickness: number;
    damage: number;
    hasHitPlayer: boolean;
  }> = [];
  private skillTelegraphs: Array<{
    kind: 'boss-shockwave' | 'miniboss-volley';
    x: number;
    y: number;
    visualRadius: number;
    damageRadius: number;
    durationMs: number;
    elapsedMs: number;
    laneLength?: number;
    laneWidth?: number;
  }> = [];
  private lineTelegraphTracking: Array<{
    kind: 'miniboss-line-strike';
    x: number;
    y: number;
    direction: { x: number; y: number };
    visualLength: number;
    visualWidth: number;
    damageWidth: number;
    durationMs: number;
    elapsedMs: number;
  }> = [];
  private volleyAttacks: Array<{
    kind: 'miniboss-volley';
    lanes: Array<{
      x: number;
      y: number;
      direction: { x: number; y: number };
      length: number;
      halfWidth: number;
      visualWidth: number;
    }>;
    damage: number;
    durationMs: number;
    activeVisualMs: number;
    elapsedMs: number;
    hasHitPlayer: boolean;
  }> = [];
  private enemyBolts: EnemyBolt[] = [];
  private runElapsedMs = 0;
  private pendingLevelUps = 0;
  private levelUpRemainingMs = 0;
  private killCount = 0;
  private eliteKillCount = 0;
  private neutralShapesDestroyed = 0;
  private goldEarned = 0;
  private finalScore = 0;
  private newBestScore = false;
  private isEnded = false;
  private isLevelingUp = false;
  private isChoosingTankClass = false;
  private isSystemPaused = false;
  private isManualPaused = false;
  private isTransitioningToMenu = false;
  private isResolvingLevelUpChoice = false;
  private levelUpStartQueued = false;
  private tankClassChoiceStartQueued = false;
  private tankClassChoiceConsumed = false;
  private isTankClassChoiceForced = false;
  private currentTankClassId: TankClassId = BASIC_TANK_CLASS_ID;
  private currentTankClass: TankClassDefinition = getTankClassDefinition(BASIC_TANK_CLASS_ID);
  private guaranteedSignatureChoices = 0;
  private guaranteedBreakthroughChoices = 0;
  private breakthroughMilestoneConsumed = false;
  private firstEliteSignatureRewardClaimed = false;
  private rewardToastToken = 0;
  private alertToken = 0;
  private activeAlertPriority = 0;
  private activeAlertKind = 'objective';
  private activeAlertUntil = 0;
  private queuedRewardToast: { text: string; color: string } | null = null;
  private takenUniqueUpgradeIds = new Set<UpgradeId>();
  private activeRunEvent: ActiveRunEvent | null = null;
  private challengeWaveEventConsumed = false;
  private rewardTargetEventConsumed = false;
  private challengeWaveSuccessCount = 0;
  private challengeWaveFailureCount = 0;
  private rewardTargetSuccessCount = 0;
  private rewardTargetFailureCount = 0;
  private nextBuffShrineAtMs = BUFF_SHRINE_EVENT.earliestTimeMs;
  private buffShrineSuccessCount = 0;
  private buffShrineFailureCount = 0;
  private activeMapBuff: { type: 'shield-pulse'; remainingMs: number } | null = null;
  private controlHintVisible = false;
  private rewardTargetMarker?: Phaser.GameObjects.Arc;
  private rewardTargetLabel?: Phaser.GameObjects.Text;
  private lastWaveTemplateAlertAtMs = Number.NEGATIVE_INFINITY;
  private statsMaxedToastShownForPoints = 0;
  private nextFormationAtMs = WAVE_FORMATION_ENABLE_TIME_MS;
  private lastFormationType: FormationType | '' = '';
  private formationSpawnCount = 0;
  private formationWaveCount = 0;
  private lastFormationSpawnPoints: FormationSpawnPoint[] = [];
  private nextDangerZoneAtMs = DANGER_ZONE_FIRST_MS;
  private dangerZones: DangerZone[] = [];
  private lastDangerZonePhase: DangerZonePhase | '' = '';
  private dangerZoneSpawnCount = 0;
  private breakoutPulseCooldownRemainingMs = 0;
  private breakoutPulseProtectionRemainingMs = 0;
  private breakoutPulseActivationCount = 0;

  // These modifiers stack from heroes, permanent upgrades, and level-up picks.
  private globalWeaponDamageBonus = 0;
  private globalWeaponCooldownReduction = 0;
  private globalProjectileSpeedBonus = 0;
  private globalWeaponRangeBonus = 0;
  private metaHpRegenPerSecond = 0;
  private runHpRegenPerSecond = 0;

  private readonly handlePageVisibilityChange = (): void => {
    this.refreshSystemPauseState();
  };

  private readonly handleWindowBlur = (): void => {
    this.refreshSystemPauseState();
  };

  private readonly handleWindowFocus = (): void => {
    this.refreshSystemPauseState();
  };

  constructor() {
    super('RunScene');
  }

  create(): void {
    this.saveData = loadGameSave();
    this.controlHintVisible = !this.saveData.controlHintDismissed;

    const freshSession = createFreshRunSessionState();
    this.runElapsedMs = freshSession.runElapsedMs;
    this.pendingLevelUps = freshSession.pendingLevelUps;
    this.levelUpRemainingMs = freshSession.levelUpRemainingMs;
    this.killCount = freshSession.killCount;
    this.eliteKillCount = freshSession.eliteKillCount;
    this.neutralShapesDestroyed = freshSession.neutralShapesDestroyed;
    this.goldEarned = freshSession.goldEarned;
    this.finalScore = 0;
    this.newBestScore = false;
    this.isEnded = freshSession.isEnded;
    this.isLevelingUp = freshSession.isLevelingUp;
    this.isChoosingTankClass = false;
    this.isSystemPaused = freshSession.isSystemPaused;
    this.isManualPaused = false;
    this.isTransitioningToMenu = freshSession.isTransitioningToMenu;
    this.isResolvingLevelUpChoice = freshSession.isResolvingLevelUpChoice;
    this.levelUpStartQueued = false;
    this.tankClassChoiceStartQueued = false;
    this.tankClassChoiceConsumed = false;
    this.isTankClassChoiceForced = false;
    this.currentTankClassId = BASIC_TANK_CLASS_ID;
    this.currentTankClass = getTankClassDefinition(BASIC_TANK_CLASS_ID);
    this.guaranteedSignatureChoices = 0;
    this.guaranteedBreakthroughChoices = 0;
    this.breakthroughMilestoneConsumed = false;
    this.firstEliteSignatureRewardClaimed = false;
    this.rewardToastToken = 0;
    this.alertToken = 0;
    this.activeAlertPriority = 0;
    this.activeAlertKind = 'objective';
    this.activeAlertUntil = 0;
    this.queuedRewardToast = null;
    this.activeRunEvent = null;
    this.challengeWaveEventConsumed = false;
    this.rewardTargetEventConsumed = false;
    this.challengeWaveSuccessCount = 0;
    this.challengeWaveFailureCount = 0;
    this.rewardTargetSuccessCount = 0;
    this.rewardTargetFailureCount = 0;
    this.nextBuffShrineAtMs = BUFF_SHRINE_EVENT.earliestTimeMs;
    this.buffShrineSuccessCount = 0;
    this.buffShrineFailureCount = 0;
    this.activeMapBuff = null;
    this.rewardTargetMarker?.destroy();
    this.rewardTargetMarker = undefined;
    this.rewardTargetLabel?.destroy();
    this.rewardTargetLabel = undefined;
    this.lastWaveTemplateAlertAtMs = Number.NEGATIVE_INFINITY;
    this.statsMaxedToastShownForPoints = 0;
    this.nextFormationAtMs = WAVE_FORMATION_ENABLE_TIME_MS;
    this.lastFormationType = '';
    this.formationSpawnCount = 0;
    this.formationWaveCount = 0;
    this.lastFormationSpawnPoints = [];
    this.nextDangerZoneAtMs = DANGER_ZONE_FIRST_MS;
    this.clearDangerZones();
    this.lastDangerZonePhase = '';
    this.dangerZoneSpawnCount = 0;
    this.breakoutPulseCooldownRemainingMs = 0;
    this.breakoutPulseProtectionRemainingMs = 0;
    this.breakoutPulseActivationCount = 0;
    this.globalWeaponDamageBonus = freshSession.globalWeaponDamageBonus;
    this.globalWeaponCooldownReduction = freshSession.globalWeaponCooldownReduction;
    this.globalProjectileSpeedBonus = freshSession.globalProjectileSpeedBonus;
    this.globalWeaponRangeBonus = freshSession.globalWeaponRangeBonus;
    this.metaHpRegenPerSecond = 0;
    this.runHpRegenPerSecond = 0;
    this.weapons = [];
    this.colliders = [];
    this.lineStrikeAttacks = [];
    this.shockwaveAttacks = [];
    this.enemyBolts = [];
    this.lineTelegraphTracking = [];
    this.volleyAttacks = [];
    this.ownedWeaponIds.clear();
    this.takenUniqueUpgradeIds.clear();
    this.combatResponseImpactCounts = {};
    this.combatResponseEnemyImpactCounts = {};
    this.skillTelegraphs = [];
    this.bossPhase = 1;
    this.bossPhaseTwoTriggered = false;
    this.nextBossSummonAtMs = Number.POSITIVE_INFINITY;
    this.bossFightState = 'approach';
    this.bossStateIndex = 0;
    this.bossStateEndsAtMs = Number.POSITIVE_INFINITY;
    this.bossStateActionDone = false;
    this.bossSummonCompositionIndex = 0;

    const selectedHero = HEROES[this.saveData.selectedHero];

    this.cameras.main.setBackgroundColor('#111827');
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.drawArena();

    this.player = new Player(this, WORLD_WIDTH / 2, WORLD_HEIGHT / 2, selectedHero);
    this.player.applyTankClassVisualIdentity(this.currentTankClass.visual);
    this.enemies = this.physics.add.group({ runChildUpdate: false });
    this.neutralShapes = this.physics.add.group({ runChildUpdate: false });
    this.xpGems = this.physics.add.group({ runChildUpdate: false });
    this.spawnDirector = new SpawnDirector();
    this.stagePhase = 'preBoss';
    this.bossEnemy = null;
    this.bossPhase = 1;
    this.bossPhaseTwoTriggered = false;
    this.nextBossSummonAtMs = Number.POSITIVE_INFINITY;
    this.bossFightState = 'approach';
    this.bossStateIndex = 0;
    this.bossStateEndsAtMs = Number.POSITIVE_INFINITY;
    this.bossStateActionDone = false;
    this.bossSummonCompositionIndex = 0;
    this.movementInput = new MovementInputController(this, createMovementKeys(this));
    this.lastMovementInput = {
      movement: { x: 0, y: 0 },
      facing: { x: 1, y: 0 },
      source: 'idle',
      aim: { x: 1, y: 0 },
      aimActive: false,
      aimSource: 'idle',
      hasExplicitAim: false,
    };
    this.tankStats = new TankStatRuntime();
    this.combatResponse = new CombatResponseController({
      onHitStopStart: () => this.pauseCombatResponseSystems(),
      onHitStopEnd: () => this.resumeCombatResponseSystems(),
      onImpactCue: (cue) => {
        this.createBurstCircle(cue.x, cue.y, cue.color, cue.startRadius, cue.endRadius, cue.durationMs, cue.alpha);
      },
    });

    this.registerWeapon(WEAPON_DEFINITIONS[selectedHero.startingWeaponId]);
    this.applyPermanentUpgrades();
    this.applyHeroBonuses();
    this.spawnInitialNeutralShapes();

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(1);
    this.cameras.main.setBounds(
      -CAMERA_OVERSCROLL_PADDING_X,
      -CAMERA_OVERSCROLL_PADDING_Y,
      WORLD_WIDTH + CAMERA_OVERSCROLL_PADDING_X * 2,
      WORLD_HEIGHT + CAMERA_OVERSCROLL_PADDING_Y * 2,
    );

    this.colliders.push(
      this.physics.add.collider(this.player, this.enemies, (_playerObject, enemyObject) => {
        if (enemyObject instanceof Enemy) {
          this.handlePlayerEnemyOverlap(enemyObject);
        }
      }),
    );

    this.colliders.push(this.physics.add.collider(this.enemies, this.enemies));

    this.colliders.push(
      this.physics.add.overlap(this.player, this.xpGems, (_playerObject, gemObject) => {
        if (gemObject instanceof XPGem) {
          this.collectXPGem(gemObject);
        }
      }),
    );

    this.spawnTimer = this.time.addEvent({
      delay: ENEMY_SPAWN_INTERVAL_MS,
      loop: true,
      callback: this.spawnEnemyWave,
      callbackScope: this,
    });
    this.neutralShapeSpawnTimer = this.time.addEvent({
      delay: NEUTRAL_SHAPE_SPAWN_INTERVAL_MS,
      loop: true,
      callback: this.refillNeutralShapes,
      callbackScope: this,
    });

    writeFreshRunRegistryState(this.registry, selectedHero.name, this.saveData.totalGold);
    this.publishHudState();
    this.presentHeroIntro(selectedHero);

    document.addEventListener('visibilitychange', this.handlePageVisibilityChange);
    window.addEventListener('blur', this.handleWindowBlur);
    window.addEventListener('focus', this.handleWindowFocus);

    this.input.keyboard?.on('keydown-ESC', this.handleEscapeShortcut, this);
    this.input.keyboard?.on('keydown-E', this.activateBreakoutPulse, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    this.refreshSystemPauseState();
  }

  update(_time: number, delta: number): void {
    if (!this.player) {
      return;
    }

    if (this.isManualPaused) {
      this.publishHudState();
      return;
    }

    this.combatResponse.update(delta);
    this.player.updateVisualState(this.time.now);

    if (this.isEnded || this.isTransitioningToMenu) {
      this.publishHudState();
      return;
    }

    if (this.isSystemPaused) {
      this.publishHudState();
      return;
    }

    if (this.combatResponse.isHitStopActive()) {
      this.publishHudState();
      return;
    }

    if (this.tankClassChoiceStartQueued && !this.isLevelingUp && !this.isChoosingTankClass) {
      this.tankClassChoiceStartQueued = false;
      this.beginTankClassChoice();
      this.publishHudState();
      return;
    }

    if (this.isChoosingTankClass) {
      this.publishHudState();
      return;
    }

    if (
      shouldBeginQueuedLevelUp({
        levelUpQueued: this.levelUpStartQueued,
        pendingLevelUps: this.pendingLevelUps,
        isEnded: this.isEnded,
        isTransitioningToMenu: this.isTransitioningToMenu,
        isSystemPaused: this.isSystemPaused,
        isHitStopActive: false,
        isLevelingUp: this.isLevelingUp,
      })
    ) {
      this.levelUpStartQueued = false;
      this.beginLevelUp();
      this.publishHudState();
      return;
    }

    if (this.isLevelingUp) {
      this.updateLevelUpCountdown(delta);
      this.publishHudState();
      return;
    }

    this.runElapsedMs = accumulateRunElapsedMs(this.runElapsedMs, delta, true);
    this.syncStagePhase();
    this.enforceBossPhaseEnemyFocus();

    const movementInput = this.movementInput.getMovementInput();
    this.lastMovementInput = movementInput;
    this.dismissControlHintIfNeeded(movementInput);
    this.player.setFacingDirection(new Phaser.Math.Vector2(movementInput.facing.x, movementInput.facing.y));
    this.player.move(new Phaser.Math.Vector2(movementInput.movement.x, movementInput.movement.y), false);
    this.updateNeutralShapes();
    this.updateEnemies();
    this.syncBossPhaseState();
    this.updateBossStateDirector();
    this.updateBossSummons();
    this.trySpawnFormationPressure();
    this.trySpawnDangerZone();
    this.updateSkillTelegraphs(delta);
    this.updateDangerZones(delta);
    this.updateBreakoutPulse(delta);
    this.updateActiveMapBuff(delta);
    this.updateLineStrikeAttacks(delta);
    this.updateVolleyAttacks(delta);
    this.updateShockwaveAttacks(delta);
    this.updateEnemyBolts(delta);
    this.player.updateHpRegen(delta);
    this.updateGems();

    for (const weapon of this.weapons) {
      weapon.update(this.time.now, delta);
    }

    this.updateRunEventState();
    this.publishHudState();
  }

  public exitToMenu(): void {
    if (this.isTransitioningToMenu) {
      return;
    }

    this.isTransitioningToMenu = true;
    this.isManualPaused = false;
    this.levelUpStartQueued = false;
    this.tankClassChoiceStartQueued = false;
    this.isTankClassChoiceForced = false;
    this.registry.set('run.manualPaused', false);
    this.registry.set('run.pauseMenuActive', false);
    this.clearActiveRunEvent();
    this.pauseGameplaySystems();
    clearRunRegistryState(this.registry, this.saveData?.totalGold ?? Number(this.registry.get('save.totalGold') ?? 0));

    const sceneManager = this.game.scene;

    if (sceneManager.isActive('UIScene')) {
      sceneManager.stop('UIScene');
    }

    sceneManager.stop('RunScene');
    sceneManager.start('MenuScene');
  }

  public openManualPauseMenu(): void {
    if (this.isEnded || this.isTransitioningToMenu || this.isLevelingUp || this.isChoosingTankClass || this.isManualPaused) {
      return;
    }

    this.isManualPaused = true;
    this.registry.set('run.manualPaused', true);
    this.registry.set('run.pauseMenuActive', true);
    this.pauseGameplaySystems();
    this.publishHudState();
  }

  public closeManualPauseMenu(overlayPointer?: ActivePointerLike): void {
    if (!this.isManualPaused || this.isEnded || this.isTransitioningToMenu) {
      return;
    }

    this.isManualPaused = false;
    this.registry.set('run.manualPaused', false);
    this.registry.set('run.pauseMenuActive', false);
    this.registry.set('run.instructions', '');
    this.resumeGameplaySystems('', overlayPointer);
    this.publishHudState();
  }

  public restartRun(): void {
    if (this.isTransitioningToMenu) {
      return;
    }

    this.isManualPaused = false;
    this.isTransitioningToMenu = true;
    this.registry.set('run.manualPaused', false);
    this.registry.set('run.pauseMenuActive', false);
    this.clearActiveRunEvent();
    this.pauseGameplaySystems();

    const sceneManager = this.game.scene;
    if (sceneManager.isActive('UIScene')) {
      sceneManager.stop('UIScene');
    }

    this.scene.restart();
    this.scene.launch('UIScene');
  }

  public getGameplayBotSnapshot(): GameplayBotRunSnapshot {
    const levelUpChoices = (this.registry.get('run.levelUpChoices') ?? []) as UpgradeDefinition[];
    const activeEnemies = this.enemies?.active ? (this.enemies.getChildren() as Enemy[]) : [];
    const activeNeutralShapes = this.neutralShapes?.active ? (this.neutralShapes.getChildren() as NeutralShape[]) : [];
    const activeGems = this.xpGems?.active ? (this.xpGems.getChildren() as XPGem[]) : [];
    const primaryWeaponStats = this.weapons[0]?.getStats();
    const tankClassChoices = this.isChoosingTankClass ? this.getAvailableTankClassChoices() : [];
    const enemyScaling = getEnemyScalingSnapshot(this.runElapsedMs);

    const enemies = activeEnemies
      .filter((enemy) => enemy.active && enemy.isAlive())
      .map((enemy) => ({
        id: enemy.archetype.id,
        x: enemy.x,
        y: enemy.y,
        distance: Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y),
        hp: enemy.getCurrentHealth(),
        maxHp: enemy.getMaxHealth(),
        moveSpeed: enemy.getMoveSpeed(),
        contactDamage: enemy.contactDamage,
        shotDamage: enemy.archetype.shotDamage ?? null,
        shotCooldownMs: enemy.archetype.shotCooldownMs ?? null,
        shotSpeed: enemy.archetype.shotSpeed ?? null,
        scalingStack: enemyScaling.stack,
        behavior: enemy.getBehavior(),
        behaviorState: enemy.getBehaviorState(),
        xpValue: getEnemyXpReward(enemy.archetype),
        isRanged: enemy.isRangedShooter(),
        hasRangedWeapon: enemy.isRangedShooter(),
        isElite: enemy.isElite() || enemy.isMiniboss(),
        isBoss: enemy.isBoss(),
        isBossOwned: enemy.isBossOwned(),
        isEventTarget: enemy.isEventMarked(),
        isPriorityThreat: enemy.isPriorityThreat(),
        isBlockingRoute: enemy.isBlockingRoute(),
      }))
      .sort((left, right) => left.distance - right.distance)
      .slice(0, 14);

    const neutralShapes = activeNeutralShapes
      .filter((neutralShape) => neutralShape.active && neutralShape.isAlive())
      .map((neutralShape) => ({
        kind: neutralShape.getKind(),
        x: neutralShape.x,
        y: neutralShape.y,
        distance: Phaser.Math.Distance.Between(this.player.x, this.player.y, neutralShape.x, neutralShape.y),
        hp: neutralShape.getCurrentHealth(),
        maxHp: neutralShape.getMaxHealth(),
        xpValue: neutralShape.getXpValue(),
      }))
      .sort((left, right) => left.distance - right.distance);

    const xpGems = activeGems
      .filter((gem) => gem.active)
      .map((gem) => ({
        x: gem.x,
        y: gem.y,
        distance: Phaser.Math.Distance.Between(this.player.x, this.player.y, gem.x, gem.y),
        value: gem.getValue(),
        tier: gem.getTier(),
        fillColor: gem.getFillColor(),
        strokeColor: gem.getStrokeColor(),
        glowColor: gem.getGlowColor(),
      }))
      .sort((left, right) => left.distance - right.distance)
      .slice(0, 10);
    const enemyProjectiles = this.enemyBolts
      .filter((bolt) => bolt.orb.active && bolt.orb.visible)
      .map((bolt) => ({
        x: bolt.orb.x,
        y: bolt.orb.y,
        radius: bolt.radius,
        owner: 'enemy' as const,
        fillColor: bolt.visual.fillColor,
        strokeColor: bolt.visual.strokeColor,
        dangerColor: bolt.visual.dangerColor,
        containsRed: bolt.visual.containsRed,
      }))
      .slice(0, 12);
    const enemyAttacks: import('../debug/gameplaySnapshot').GameplayBotEnemyAttackSummary[] = [
      ...this.skillTelegraphs.map((telegraph) => ({
        kind: telegraph.kind,
        phase: 'warning' as const,
        warningOnly: true,
        damageRange: telegraph.laneLength ?? telegraph.damageRadius,
        visualRange: telegraph.laneLength ?? telegraph.visualRadius,
        damageWidth: telegraph.laneWidth ?? null,
        visualWidth: telegraph.laneWidth ?? null,
        damageRadius: telegraph.damageRadius > 0 ? telegraph.damageRadius : null,
        visualRadius: telegraph.visualRadius > 0 ? telegraph.visualRadius : null,
        damageActive: false,
        effectActive: telegraph.elapsedMs < telegraph.durationMs,
        remainingMs: Math.max(0, telegraph.durationMs - telegraph.elapsedMs),
      })),
      ...this.lineTelegraphTracking.map((telegraph) => ({
        kind: telegraph.kind,
        phase: 'warning' as const,
        warningOnly: true,
        damageRange: telegraph.visualLength,
        visualRange: telegraph.visualLength,
        damageWidth: telegraph.damageWidth,
        visualWidth: telegraph.visualWidth,
        damageRadius: null,
        visualRadius: null,
        damageActive: false,
        effectActive: telegraph.elapsedMs < telegraph.durationMs,
        remainingMs: Math.max(0, telegraph.durationMs - telegraph.elapsedMs),
      })),
      ...this.lineStrikeAttacks.map((attack) => ({
        kind: attack.kind,
        phase: 'active' as const,
        warningOnly: false,
        damageRange: attack.length,
        visualRange: attack.length,
        damageWidth: attack.damageWidth,
        visualWidth: attack.visualWidth,
        damageRadius: null,
        visualRadius: null,
        damageActive: attack.elapsedMs < attack.durationMs,
        effectActive: attack.elapsedMs < attack.activeVisualMs,
        remainingMs: Math.max(0, attack.durationMs - attack.elapsedMs),
      })),
      ...this.volleyAttacks.map((volley) => ({
        kind: 'miniboss-volley' as const,
        phase: 'active' as const,
        warningOnly: false,
        damageRange: volley.lanes[0]?.length ?? 0,
        visualRange: volley.lanes[0]?.length ?? 0,
        damageWidth: volley.lanes[0] ? volley.lanes[0].halfWidth * 2 : null,
        visualWidth: volley.lanes[0]?.visualWidth ?? null,
        damageRadius: null,
        visualRadius: null,
        damageActive: volley.elapsedMs < volley.durationMs,
        effectActive: volley.elapsedMs < volley.activeVisualMs,
        remainingMs: Math.max(0, volley.durationMs - volley.elapsedMs),
      })),
      ...this.shockwaveAttacks.map((attack) => ({
        kind: 'boss-shockwave' as const,
        phase: 'active' as const,
        warningOnly: false,
        damageRange: attack.currentRadius,
        visualRange: attack.currentRadius,
        damageWidth: null,
        visualWidth: null,
        damageRadius: attack.currentRadius,
        visualRadius: attack.currentRadius,
        damageActive: attack.elapsedMs < attack.durationMs,
        effectActive: attack.elapsedMs < attack.activeVisualMs,
        remainingMs: Math.max(0, attack.durationMs - attack.elapsedMs),
      })),
    ];
    const combatResponseMetrics = this.combatResponse.getMetrics();
    const activeBoss = this.getActiveBossEnemy();
    const stagePhase = this.getCurrentStagePhase();
    const activeBossSkill = this.getActiveBossSkillName();
    const bossSkillTelegraphActive = this.skillTelegraphs.some((telegraph) => telegraph.kind === 'boss-shockwave');
    const bossSkillDamageActive = this.shockwaveAttacks.some((attack) => attack.elapsedMs < attack.durationMs);
    const activeMinibossSkill = this.getActiveMinibossSkillName();
    const bossSummonActiveCount = this.getActiveBossSummonCount();
    const formationCooldownMs = Math.max(0, this.nextFormationAtMs - this.runElapsedMs);
    const dangerZoneCooldownMs = Math.max(0, this.nextDangerZoneAtMs - this.runElapsedMs);

    return {
      config: {
        gameWidth: GAME_WIDTH,
        gameHeight: GAME_HEIGHT,
        scaleMode: 'FIT',
      },
      stagePhase,
      elapsedMs: this.runElapsedMs,
      bossSpawnTimeMs: BOSS_SPAWN_TIME_MS,
      bossActive: Boolean(activeBoss),
      bossHp: activeBoss?.getCurrentHealth() ?? null,
      bossMaxHp: activeBoss?.getMaxHealth() ?? null,
      bossPhase: this.bossPhase,
      bossPhaseTwoTriggered: this.bossPhaseTwoTriggered,
      bossSummonActiveCount,
      bossSummonCap: BOSS_SUMMON_MAX_ACTIVE,
      bossTargetFastKillMs: BOSS_TARGET_FAST_KILL_MS,
      bossOwnedEnemyCount: bossSummonActiveCount,
      bossPhasePressure: getBossPhasePressureState({
        stagePhase,
        bossPhase: this.bossPhase,
        bossActive: Boolean(activeBoss),
      }),
      bossFightState: activeBoss ? this.bossFightState : '',
      bossStateRemainingMs: activeBoss ? Math.max(0, this.bossStateEndsAtMs - this.runElapsedMs) : 0,
      activeBossSkill,
      bossSkillTelegraphActive,
      bossSkillDamageActive,
      activeMinibossSkill,
      eventEnemyMultiplier: EVENT_ENEMY_STAT_MULTIPLIER,
      normalSpawnsSuppressed: this.areNormalSpawnsSuppressed(),
      victoryCondition: getStageVictoryCondition(stagePhase),
      hp: this.player.getCurrentHealth(),
      maxHp: this.player.getMaxHealth(),
      level: this.player.getLevel(),
      xp: this.player.getExperience(),
      xpNext: this.player.getExperienceToNextLevel(),
      kills: this.killCount,
      weaponCount: this.weapons.length,
      weaponNames: this.weapons.map((weapon) => weapon.getStats().name),
      primaryWeapon: primaryWeaponStats
        ? {
            id: primaryWeaponStats.id,
            damage: primaryWeaponStats.damage,
            fireCooldownMs: primaryWeaponStats.fireCooldownMs,
            projectileSpeed: primaryWeaponStats.projectileSpeed,
            range: primaryWeaponStats.range,
            burstCount: primaryWeaponStats.burstCount ?? 1,
            spreadDegrees: primaryWeaponStats.spreadDegrees ?? 0,
            latestProjectileDirection: this.weapons[0]?.getLastFireDirection() ?? { x: 1, y: 0 },
          }
        : null,
      goldEarned: this.goldEarned,
      totalGold: this.saveData.totalGold,
      score: this.calculateCurrentRunScore(),
      bestScore: this.saveData.bestScore,
      finalScore: this.finalScore,
      newBestScore: this.newBestScore,
      localLeaderboardEntryCount: this.saveData.localLeaderboard.length,
      neutralShapesDestroyed: this.neutralShapesDestroyed,
      levelUpActive: Boolean(this.registry.get('run.levelUpActive')),
      levelUpChoiceCount: levelUpChoices.length,
      upgradePoolExhausted: Boolean(this.registry.get('run.upgradePoolExhausted')),
      rewardText: String(this.registry.get('run.rewardText') ?? ''),
      endActive: Boolean(this.registry.get('run.endActive')),
      victory: Boolean(this.registry.get('run.victory')),
      endTitle: String(this.registry.get('run.endTitle') ?? ''),
      player: {
        x: this.player.x,
        y: this.player.y,
        facingX: this.player.getFacingDirection().x,
        facingY: this.player.getFacingDirection().y,
        moveSpeed: this.player.getMoveSpeed(),
        pickupRange: this.player.getPickupRange(),
      },
      input: {
        movement: { ...this.lastMovementInput.movement },
        aim: { ...this.lastMovementInput.aim },
        aimActive: this.lastMovementInput.aimActive,
        aimSource: this.lastMovementInput.aimSource,
        movementSource: this.lastMovementInput.source,
        hasExplicitAim: this.lastMovementInput.hasExplicitAim,
        suppressed: this.movementInput.isSuppressed(),
        movementPointerActive: this.movementInput.getPointerGuideState().movement.active,
        aimPointerActive: this.movementInput.getPointerGuideState().aim.active,
      },
      controlGuideMode: String(this.registry.get('run.controlGuideMode') ?? this.saveData.controlGuideMode) as ControlGuideMode,
      controlHintVisible: Boolean(this.registry.get('run.controlHintVisible')),
      controlJoysticks: this.movementInput.getPointerGuideState(),
      tankStats: {
        availablePoints: this.tankStats.getAvailablePoints(),
        canSpend: this.hasSpendableTankStats(),
        statsMaxed: this.areTankStatsMaxedWithPoints(),
        levels: this.tankStats.getLevels(),
        effects: this.tankStats.getEffects(),
        effectiveHpRegenPerSecond: this.player.getHpRegenPerSecond(),
        metaHpRegenPerSecond: this.metaHpRegenPerSecond,
        runHpRegenPerSecond: this.runHpRegenPerSecond,
        hpRegenActive: this.player.wasHpRegenActive(),
      },
      tankClass: {
        id: this.currentTankClass.id,
        title: this.currentTankClass.title,
        description: this.currentTankClass.description,
      },
      classChoice: {
        available: this.isChoosingTankClass || this.shouldQueueTankClassChoice(),
        active: this.isChoosingTankClass,
        choices: tankClassChoices.map((choice) => ({
          id: choice.id,
          title: choice.title,
          description: choice.description,
        })),
      },
      enemies,
      neutralShapeCount: neutralShapes.length,
      neutralShapes: neutralShapes.slice(0, 16),
      xpGems,
      enemyProjectiles,
      enemyAttacks,
      upgradeChoices: levelUpChoices.map((choice) => ({
        id: choice.id,
        title: choice.title,
        rewardType: getUpgradeRewardType(choice),
        hasWeaponTag: upgradeHasWeaponRewardTag(choice),
      })),
      camera: {
        scrollX: this.cameras.main.scrollX,
        scrollY: this.cameras.main.scrollY,
        playerScreenX: (this.player.x - this.cameras.main.scrollX) * this.cameras.main.zoom,
        playerScreenY: (this.player.y - this.cameras.main.scrollY) * this.cameras.main.zoom,
        overscrollPaddingX: CAMERA_OVERSCROLL_PADDING_X,
        overscrollPaddingY: CAMERA_OVERSCROLL_PADDING_Y,
      },
      spawnSafety: {
        enemySafeRadius: ENEMY_SPAWN_PLAYER_SAFE_RADIUS,
        eliteSafeRadius: ELITE_SPAWN_PLAYER_SAFE_RADIUS,
        bossSafeRadius: BOSS_SPAWN_PLAYER_SAFE_RADIUS,
        nearestEnemyDistance: enemies[0]?.distance ?? null,
      },
      enemyPopulation: {
        activeCount: this.getActiveEnemyCount(),
        activeCap: ENEMY_ACTIVE_CAP,
        normalSpawnSlots: this.areNormalSpawnsSuppressed() ? 0 : getAvailableEnemySpawnSlots(this.getActiveEnemyCount()),
        enemyEnemyPhysicalCollision: true,
      },
      enemyScaling,
      waveTemplate: {
        id: this.spawnDirector?.getLastWaveTemplateId() ?? '',
        label: this.spawnDirector?.getLastWaveTemplateLabel() ?? '',
        highlight: this.spawnDirector?.getLastWaveTemplateHighlight() ?? false,
      },
      formationPressure: {
        enabled: this.runElapsedMs >= WAVE_FORMATION_ENABLE_TIME_MS,
        active: this.lastFormationSpawnPoints.length > 0,
        lastFormationType: this.lastFormationType,
        cooldownMs: formationCooldownMs,
        spawnCount: this.formationSpawnCount,
        waveCount: this.formationWaveCount,
        spawnPoints: this.lastFormationSpawnPoints.slice(0, 8),
      },
      dangerZones: {
        enabled: this.formationWaveCount > 0 && this.runElapsedMs >= DANGER_ZONE_FIRST_MS,
        activeCount: this.dangerZones.length,
        warningCount: this.dangerZones.filter((zone) => zone.phase === 'warning').length,
        damageActiveCount: this.dangerZones.filter((zone) => zone.phase === 'active').length,
        cooldownMs: dangerZoneCooldownMs,
        spawnCount: this.dangerZoneSpawnCount,
        lastPhase: this.lastDangerZonePhase,
        zones: this.dangerZones.map((zone) => ({
          x: zone.x,
          y: zone.y,
          radius: zone.radius,
          phase: zone.phase,
          elapsedMs: zone.elapsedMs,
          remainingMs: Math.max(0, zone.warningMs + zone.activeMs - zone.elapsedMs),
          damage: zone.damage,
        })),
      },
      activeAbility: {
        label: 'Pulse',
        ready: this.canActivateBreakoutPulse(),
        cooldownMs: this.getBreakoutPulseCooldownMs(),
        cooldownTotalMs: BREAKOUT_PULSE_COOLDOWN_MS,
        protectionRemainingMs: this.breakoutPulseProtectionRemainingMs,
        activationCount: this.breakoutPulseActivationCount,
        radius: BREAKOUT_PULSE_RADIUS,
      },
      event: {
        active: this.activeRunEvent !== null,
        type: this.activeRunEvent?.type ?? '',
        title: this.activeRunEvent?.title ?? '',
        objective: this.activeRunEvent?.objective ?? '',
        remainingMs: this.activeRunEvent ? Math.max(0, this.activeRunEvent.endsAtMs - this.runElapsedMs) : 0,
        x: this.activeRunEvent?.type === 'buff-shrine' ? this.activeRunEvent.x : null,
        y: this.activeRunEvent?.type === 'buff-shrine' ? this.activeRunEvent.y : null,
        claimRadius: this.activeRunEvent?.type === 'buff-shrine' ? BUFF_SHRINE_EVENT.claimRadius : null,
        buffType: this.activeMapBuff?.type ?? '',
        buffRemainingMs: this.activeMapBuff?.remainingMs ?? 0,
        challengeWaveSuccesses: this.challengeWaveSuccessCount,
        challengeWaveFailures: this.challengeWaveFailureCount,
        rewardTargetSuccesses: this.rewardTargetSuccessCount,
        rewardTargetFailures: this.rewardTargetFailureCount,
        buffShrineSuccesses: this.buffShrineSuccessCount,
        buffShrineFailures: this.buffShrineFailureCount,
      },
      combatResponse: {
        hitStopStarts: combatResponseMetrics.hitStopStarts,
        hitStopRefreshes: combatResponseMetrics.hitStopRefreshes,
        hitStopSuppressions: combatResponseMetrics.hitStopSuppressions,
        hitStopActive: this.combatResponse.isHitStopActive(),
        weaponImpactCounts: { ...this.combatResponseImpactCounts },
        enemyImpactCounts: { ...this.combatResponseEnemyImpactCounts },
      },
    };
  }

  selectLevelUp(index: number, overlayPointer?: ActivePointerLike): void {
    if (!this.isLevelingUp || this.isEnded || this.isResolvingLevelUpChoice) {
      return;
    }

    const choices = this.registry.get('run.levelUpChoices') as UpgradeDefinition[] | undefined;
    const selectedUpgrade = choices?.[index];
    if (!selectedUpgrade) {
      return;
    }

    if (overlayPointer) {
      this.movementInput.ignoreOverlaySelectionPointer(overlayPointer);
    }

    this.isResolvingLevelUpChoice = true;
    this.levelUpRemainingMs = 0;
    this.registry.set('run.levelUpRemainingMs', 0);
    this.applyUpgrade(selectedUpgrade.id);
    this.showUpgradeSelectionFeedback(selectedUpgrade);
    this.pendingLevelUps = Math.max(0, this.pendingLevelUps - 1);

    if (this.pendingLevelUps > 0) {
      this.isResolvingLevelUpChoice = false;
      this.presentLevelUpChoices();
      this.publishHudState();
      return;
    }

    this.finishLevelUpSelection(overlayPointer);
  }

  public allocateTankStat(statId: TankStatId, overlayPointer?: ActivePointerLike): boolean {
    if (this.isEnded || this.isTransitioningToMenu || !this.tankStats.canSpend(statId)) {
      return false;
    }

    if (overlayPointer) {
      this.movementInput?.clearOverlaySelectionPointer(overlayPointer);
    }

    const result = this.tankStats.spendPoint(statId);
    if (!result.spent) {
      return false;
    }

    this.applyTankStatSpend(result.statId, result.effectDelta);
    this.showTankStatSelectionFeedback(result.statId, result.nextLevel);
    this.publishHudState();
    return true;
  }

  public debugGrantStatPoints(points = 1): void {
    if (this.isEnded || this.isTransitioningToMenu) {
      return;
    }

    this.tankStats.grantPoints(points);
    this.maybeShowStatsMaxedToast();
    this.publishHudState();
  }

  public selectTankClass(classId: TankClassId, overlayPointer?: ActivePointerLike): boolean {
    if (
      !this.isChoosingTankClass ||
      this.isEnded ||
      this.isTransitioningToMenu ||
      !canSelectTankClass({
        classId,
        level: this.isTankClassChoiceForced ? TANK_CLASS_EVOLUTION_LEVEL : this.player.getLevel(),
        currentClassId: this.currentTankClassId,
        classChoiceConsumed: this.tankClassChoiceConsumed,
      })
    ) {
      return false;
    }

    if (overlayPointer) {
      this.movementInput.ignoreOverlaySelectionPointer(overlayPointer);
    }

    this.applyTankClass(getTankClassDefinition(classId));
    this.isChoosingTankClass = false;
    this.isTankClassChoiceForced = false;
    this.tankClassChoiceConsumed = true;
    this.registry.set('run.classChoiceActive', false);
    this.registry.set('run.classChoiceChoices', []);
    this.registry.set('run.instructions', 'Class selected. Continue shaping your tank.');

    if (!this.isSystemPaused) {
      this.resumeGameplaySystems('Class selected. Continue shaping your tank.', overlayPointer);
    }

    this.publishHudState();
    return true;
  }

  public debugUnlockTankClassChoice(): void {
    if (this.isEnded || this.isTransitioningToMenu || this.tankClassChoiceConsumed) {
      return;
    }

    this.tankClassChoiceStartQueued = false;
    this.beginTankClassChoice(true);
    this.publishHudState();
  }

  public debugForceRunEvent(type: RunEventType): boolean {
    if (this.isEnded || this.isTransitioningToMenu || this.isLevelingUp || this.activeRunEvent || this.areNormalSpawnsSuppressed()) {
      return false;
    }

    if (type === 'challenge-wave') {
      return this.startChallengeWaveEvent(true);
    }

    if (type === 'buff-shrine') {
      return this.startBuffShrineEvent(true);
    }

    return this.startRewardTargetEvent(true);
  }

  public debugAddScoreProgress(options: { neutralShapesDestroyed?: number; enemyKills?: number; elapsedMs?: number } = {}): void {
    if (this.isEnded || this.isTransitioningToMenu) {
      return;
    }

    this.neutralShapesDestroyed += Math.max(0, Math.floor(options.neutralShapesDestroyed ?? 0));
    this.killCount += Math.max(0, Math.floor(options.enemyKills ?? 0));
    this.runElapsedMs += Math.max(0, Math.floor(options.elapsedMs ?? 0));
    this.syncStagePhase();
    this.enforceBossPhaseEnemyFocus();
    this.publishHudState();
  }

  public debugSetPlayerHealth(health: number): void {
    if (!this.player || this.isTransitioningToMenu) {
      return;
    }

    this.player.setCurrentHealthForDebug(health);
    this.publishHudState();
  }

  public debugTickHpRegen(deltaMs: number): void {
    if (!this.player || this.isEnded || this.isTransitioningToMenu) {
      return;
    }

    this.player.updateHpRegen(deltaMs);
    this.publishHudState();
  }

  public debugSetPlayerPosition(x: number, y: number): void {
    if (!this.player?.active || this.isTransitioningToMenu) {
      return;
    }

    const halfWidth = this.player.body.halfWidth ?? this.player.body.width / 2;
    const halfHeight = this.player.body.halfHeight ?? this.player.body.height / 2;
    const nextX = Phaser.Math.Clamp(x, halfWidth, WORLD_WIDTH - halfWidth);
    const nextY = Phaser.Math.Clamp(y, halfHeight, WORLD_HEIGHT - halfHeight);
    this.player.body.reset(nextX, nextY);
    this.player.setPosition(nextX, nextY);
    this.player.updateVisualState(this.time.now);
    this.cameras.main.centerOn(nextX, nextY);
    this.publishHudState();
  }

  public debugSpawnEnemyWaveAt(elapsedMs = this.runElapsedMs): void {
    if (this.isEnded || this.isTransitioningToMenu) {
      return;
    }

    this.runElapsedMs = Math.max(0, Math.floor(elapsedMs));
    this.syncStagePhase();
    this.enforceBossPhaseEnemyFocus();
    this.spawnEnemyWave();
    this.publishHudState();
  }

  public debugForceFormationPressure(type?: FormationType): boolean {
    if (this.isEnded || this.isTransitioningToMenu) {
      return false;
    }

    const spawned = this.spawnFormationPressure(type ?? this.pickNextFormationType(), true);
    this.publishHudState();
    return spawned;
  }

  public debugTriggerDangerZone(atPlayer = true): boolean {
    if (!this.player?.active || this.isEnded || this.isTransitioningToMenu) {
      return false;
    }

    const x = atPlayer ? this.player.x : Phaser.Math.Clamp(this.player.x + 130, 64, WORLD_WIDTH - 64);
    const y = this.player.y;
    const zone = this.createDangerZone(x, y);
    this.dangerZones.push(zone);
    this.dangerZoneSpawnCount += 1;
    this.lastDangerZonePhase = 'warning';
    this.publishHudState();
    return true;
  }

  public debugTickDangerZones(deltaMs: number): void {
    if (this.isEnded || this.isTransitioningToMenu || this.isManualPaused || this.isSystemPaused || this.isLevelingUp || this.isChoosingTankClass) {
      return;
    }

    this.updateDangerZones(Math.max(0, Math.floor(deltaMs)));
    this.publishHudState();
  }

  public debugSetBreakoutPulseCooldown(cooldownMs: number): void {
    this.breakoutPulseCooldownRemainingMs = Phaser.Math.Clamp(Math.floor(cooldownMs), 0, BREAKOUT_PULSE_COOLDOWN_MS);
    this.publishHudState();
  }

  public debugSetRunElapsedMs(elapsedMs: number): void {
    if (this.isEnded || this.isTransitioningToMenu) {
      return;
    }

    this.runElapsedMs = Math.max(0, Math.floor(elapsedMs));
    this.syncStagePhase();
    this.enforceBossPhaseEnemyFocus();
    this.publishHudState();
  }

  public debugClearEnemies(): void {
    if (!this.enemies?.active) {
      return;
    }

    for (const enemy of this.enemies.getChildren() as Enemy[]) {
      enemy.despawnSilently();
    }
    this.publishHudState();
  }

  public debugSpawnEnemyForReadability(archetypeId: EnemyArchetypeId = 'hexcaster'): void {
    if (this.isEnded || this.isTransitioningToMenu || !this.enemies?.active) {
      return;
    }

    const archetype = ENEMY_ARCHETYPES[archetypeId] ?? ENEMY_ARCHETYPES.hexcaster;
    if (this.areNormalSpawnsSuppressed() && !archetype.isBoss) {
      return;
    }
    this.spawnEnemyFromArchetype(archetype, this.getSpawnPoint(NORMAL_ENEMY_SPAWN_DISTANCE, this.getEnemySpawnSafeRadius(archetype)));
    this.publishHudState();
  }

  public debugSpawnEnemyNearPlayer(archetypeId: EnemyArchetypeId = 'scuttler', offsetX = 96, offsetY = 0): boolean {
    if (this.isEnded || this.isTransitioningToMenu || !this.enemies?.active || this.areNormalSpawnsSuppressed()) {
      return false;
    }

    if (getAvailableEnemySpawnSlots(this.getActiveEnemyCount()) <= 0) {
      return false;
    }

    const archetype = ENEMY_ARCHETYPES[archetypeId] ?? ENEMY_ARCHETYPES.scuttler;
    const x = Phaser.Math.Clamp(this.player.x + offsetX, 48, WORLD_WIDTH - 48);
    const y = Phaser.Math.Clamp(this.player.y + offsetY, 48, WORLD_HEIGHT - 48);
    this.spawnEnemyFromArchetype(archetype, new Phaser.Math.Vector2(x, y));
    this.publishHudState();
    return true;
  }

  public debugDefeatBoss(): boolean {
    if (this.isEnded || this.isTransitioningToMenu) {
      return false;
    }

    const boss = this.getActiveBossEnemy();
    if (!boss) {
      return false;
    }

    const bossX = boss.x;
    const bossY = boss.y;
    const xpValue = getEnemyXpReward(boss.archetype);
    boss.takeDamage(boss.getCurrentHealth(), { x: bossX, y: bossY });
    this.handleEnemyDefeated(boss, bossX, bossY, xpValue, true, false, false);
    return true;
  }

  public debugSetBossHealthRatio(ratio: number): boolean {
    if (this.isEnded || this.isTransitioningToMenu) {
      return false;
    }

    const boss = this.getActiveBossEnemy();
    if (!boss) {
      return false;
    }

    const targetHealth = Math.max(1, Math.round(boss.getMaxHealth() * Phaser.Math.Clamp(ratio, 0.01, 1)));
    const damage = Math.max(0, boss.getCurrentHealth() - targetHealth);
    if (damage > 0) {
      boss.takeDamage(damage, { x: boss.x, y: boss.y });
    }

    this.syncBossPhaseState();
    this.publishHudState();
    return true;
  }

  public debugForceBossSummons(): boolean {
    if (this.isEnded || this.isTransitioningToMenu) {
      return false;
    }

    const boss = this.getActiveBossEnemy();
    if (!boss) {
      return false;
    }

    this.syncBossPhaseState();
    if (this.bossPhase !== 2) {
      return false;
    }

    return this.spawnBossSummonBatch(true) > 0;
  }

  public debugTriggerBossShockwaveSkill(): boolean {
    if (this.isEnded || this.isTransitioningToMenu) {
      return false;
    }

    const boss = this.getActiveBossEnemy();
    if (!boss) {
      return false;
    }

    const contract = createBossShockwaveContract(this.bossPhase);
    const damage = Math.round(Math.max(24, boss.contactDamage - 6) * contract.damageMultiplier);
    this.showBossShockwaveTelegraph(boss.x, boss.y, contract.radius, contract.telegraphMs);
    this.time.delayedCall(contract.telegraphMs, () => {
      if (!this.isEnded && boss.active && boss.isAlive()) {
        this.spawnBossShockwave(boss.x, boss.y, contract.radius, damage, contract.damageActiveMs, contract.thickness);
      }
    });
    this.publishHudState();
    return true;
  }

  public debugTriggerMinibossVolley(): boolean {
    if (this.isEnded || this.isTransitioningToMenu) {
      return false;
    }

    const direction = new Phaser.Math.Vector2(this.player.x - (this.player.x - 260), 0).normalize();
    const x = Phaser.Math.Clamp(this.player.x - 260, 40, WORLD_WIDTH - 40);
    const y = this.player.y;
    this.showMinibossVolleyTelegraph(x, y, { x: direction.x, y: direction.y });
    const contract = createMinibossVolleyContract();
    this.time.delayedCall(contract.telegraphMs, () => {
      if (!this.isEnded) {
        this.executeMinibossVolley(x, y, { x: direction.x, y: direction.y });
      }
    });
    this.publishHudState();
    return true;
  }

  public debugSpawnEnemyProjectile(): void {
    if (!this.player?.active || this.isEnded || this.isTransitioningToMenu) {
      return;
    }

    const originX = Phaser.Math.Clamp(this.player.x - 260, 40, WORLD_WIDTH - 40);
    const originY = this.player.y;
    this.spawnEnemyBolt(originX, originY, { x: 1, y: 0 }, 260, 1, ENEMY_ARCHETYPES.hexcaster.color, 8);
    this.publishHudState();
  }

  public debugDropXpGem(value = 12): void {
    if (!this.xpGems?.active || this.isEnded || this.isTransitioningToMenu) {
      return;
    }

    const x = Phaser.Math.Clamp(this.player.x + 120, 40, WORLD_WIDTH - 40);
    const y = Phaser.Math.Clamp(this.player.y, 40, WORLD_HEIGHT - 40);
    this.xpGems.add(new XPGem(this, x, y, Math.max(1, Math.floor(value))));
    this.publishHudState();
  }

  public debugTriggerMinibossLineStrike(length = createMinibossLineAttackContract().length): void {
    if (!this.player?.active || this.isEnded || this.isTransitioningToMenu) {
      return;
    }

    this.executeMinibossLineStrike(
      { contactDamage: 26 } as Enemy,
      this.player.x - length / 2,
      this.player.y,
      { x: 1, y: 0 },
      length,
    );
    this.publishHudState();
  }

  public debugShowMinibossLineTelegraph(): void {
    if (!this.player?.active || this.isEnded || this.isTransitioningToMenu) {
      return;
    }

    const contract = createMinibossLineAttackContract();
    const direction = { x: 1, y: 0 };
    const x = Phaser.Math.Clamp(this.player.x - contract.length * 0.5, 40, WORLD_WIDTH - 40);
    const y = this.player.y;
    this.showLineAttackTelegraph(x, y, direction, contract.length, contract.visualWidth, 0xfda4af, contract.telegraphMs, 'warning');
    this.lineTelegraphTracking.push({
      kind: contract.kind,
      x,
      y,
      direction,
      visualLength: contract.length,
      visualWidth: contract.visualWidth,
      damageWidth: contract.damageWidth,
      durationMs: contract.telegraphMs,
      elapsedMs: 0,
    });
    this.publishHudState();
  }

  public debugShowMinibossVolleyTelegraph(): void {
    if (!this.player?.active || this.isEnded || this.isTransitioningToMenu) {
      return;
    }

    this.showMinibossVolleyTelegraph(this.player.x, this.player.y, { x: 1, y: 0 });
    this.publishHudState();
  }

  public debugExecuteMinibossVolley(): void {
    if (!this.player?.active || this.isEnded || this.isTransitioningToMenu) {
      return;
    }

    this.executeMinibossVolley(this.player.x, this.player.y, { x: 1, y: 0 });
    this.publishHudState();
  }

  public debugForceRewardVisibilityChoices(): void {
    if (this.isEnded || this.isTransitioningToMenu) {
      return;
    }

    const choices = ['unlock-twin-fangs', 'vitality', 'power']
      .map((upgradeId) => findUpgradeDefinitionById(upgradeId as UpgradeId))
      .filter((upgrade): upgrade is UpgradeDefinition => Boolean(upgrade));
    if (choices.length === 0) {
      return;
    }

    this.pendingLevelUps = 1;
    this.isLevelingUp = true;
    this.isResolvingLevelUpChoice = false;
    this.levelUpRemainingMs = beginLevelUpCountdown();
    this.pauseGameplaySystems('Pick a reward, then continue shaping your tank.');
    this.registry.set('run.levelUpActive', true);
    this.registry.set('run.levelUpMode', 'normal');
    this.registry.set('run.levelUpChoices', choices);
    this.registry.set('run.levelUpChoiceCount', choices.length);
    this.registry.set('run.levelUpRemainingMs', this.levelUpRemainingMs);
    this.registry.set('run.upgradePoolExhausted', false);
    this.publishHudState();
  }

  public debugEndRun(victory = false): void {
    if (this.isEnded || this.isTransitioningToMenu) {
      return;
    }

    this.endRun(victory, victory ? 'Victory' : 'Defeat', 'Debug score run complete.');
  }

  public setControlGuideMode(mode: ControlGuideMode): void {
    this.saveData = updateControlGuideMode(this.saveData, mode);
    this.registry.set('run.controlGuideMode', this.saveData.controlGuideMode);
    this.publishHudState();
  }

  public canActivateBreakoutPulse(): boolean {
    return (
      this.player?.active &&
      !this.isEnded &&
      !this.isTransitioningToMenu &&
      !this.isManualPaused &&
      !this.isSystemPaused &&
      !this.isLevelingUp &&
      !this.isChoosingTankClass &&
      !Boolean(this.registry.get('run.endActive')) &&
      this.breakoutPulseCooldownRemainingMs <= 0
    );
  }

  public getBreakoutPulseCooldownMs(): number {
    return Math.max(0, Math.ceil(this.breakoutPulseCooldownRemainingMs));
  }

  public activateBreakoutPulse(): boolean {
    if (!this.canActivateBreakoutPulse()) {
      this.publishHudState();
      return false;
    }

    this.breakoutPulseCooldownRemainingMs = BREAKOUT_PULSE_COOLDOWN_MS;
    this.breakoutPulseProtectionRemainingMs = BREAKOUT_PULSE_INVULNERABILITY_MS;
    this.breakoutPulseActivationCount += 1;
    this.player.extendInvulnerability(BREAKOUT_PULSE_INVULNERABILITY_MS, this.time.now);
    this.applyBreakoutPulseKnockback();
    this.createBreakoutPulseVisual();
    this.setAlert('objective', 'Pulse readying', 800);
    this.publishHudState();
    return true;
  }

  private registerWeapon(definition: WeaponDefinition, announce = false): void {
    if (this.ownedWeaponIds.has(definition.id)) {
      return;
    }

    const weapon = new AutoFireWeapon(this, this.player, this.enemies, this.neutralShapes, definition, () =>
      this.player.getFacingDirection(),
    );
    this.applyWeaponModifiersTo(weapon);
    if (this.currentTankClassId !== BASIC_TANK_CLASS_ID) {
      weapon.applyStatPatch(this.currentTankClass.weaponPatch);
    }
    this.weapons.push(weapon);
    this.ownedWeaponIds.add(definition.id);

    this.colliders.push(
      this.physics.add.overlap(weapon.getProjectiles(), this.enemies, (projectileObject, enemyObject) => {
        if (projectileObject instanceof Projectile && enemyObject instanceof Enemy) {
          this.handleProjectileEnemyOverlap(projectileObject, enemyObject);
        }
      }),
    );
    this.colliders.push(
      this.physics.add.overlap(weapon.getProjectiles(), this.neutralShapes, (projectileObject, shapeObject) => {
        if (projectileObject instanceof Projectile && shapeObject instanceof NeutralShape) {
          this.handleProjectileNeutralShapeOverlap(projectileObject, shapeObject);
        }
      }),
    );

    if (announce) {
      this.showFloatingText(this.player.x, this.player.y - 62, `${definition.name} online`, '#bfdbfe', 20);
      this.createBurstCircle(this.player.x, this.player.y, definition.projectileColor, 22, 70, 220, 0.9);
      this.cameras.main.flash(120, 140, 190, 255, false);
    }
  }

  private applyPermanentUpgrades(): void {
    const maxHpLevel = getPermanentUpgradeLevel(this.saveData, 'max-hp');
    const moveSpeedLevel = getPermanentUpgradeLevel(this.saveData, 'move-speed');
    const pickupRangeLevel = getPermanentUpgradeLevel(this.saveData, 'pickup-range');
    const startingDamageLevel = getPermanentUpgradeLevel(this.saveData, 'starting-damage');
    const hpRegenLevel = getPermanentUpgradeLevel(this.saveData, 'hp-regen');

    if (maxHpLevel > 0) {
      this.player.addMaxHealth(maxHpLevel * PERMANENT_MAX_HP_PER_LEVEL);
    }

    if (moveSpeedLevel > 0) {
      this.player.addMoveSpeed(moveSpeedLevel * PERMANENT_MOVE_SPEED_PER_LEVEL);
    }

    if (pickupRangeLevel > 0) {
      this.player.addPickupRange(pickupRangeLevel * PERMANENT_PICKUP_RANGE_PER_LEVEL);
    }

    if (startingDamageLevel > 0) {
      this.applyWeaponDamageBonus(startingDamageLevel * PERMANENT_STARTING_DAMAGE_PER_LEVEL);
    }

    if (hpRegenLevel > 0) {
      this.metaHpRegenPerSecond = hpRegenLevel * PERMANENT_HP_REGEN_PER_LEVEL;
      this.player.addHpRegenPerSecond(this.metaHpRegenPerSecond);
    }
  }

  private applyHeroBonuses(): void {
    const hero = HEROES[this.saveData.selectedHero];

    if (hero.maxHealthBonus !== 0) {
      this.player.addMaxHealth(hero.maxHealthBonus);
    }

    if (hero.moveSpeedBonus !== 0) {
      this.player.addMoveSpeed(hero.moveSpeedBonus);
    }

    if (hero.pickupRangeBonus !== 0) {
      this.player.addPickupRange(hero.pickupRangeBonus);
    }

    if (hero.startingDamageBonus !== 0) {
      this.applyWeaponDamageBonus(hero.startingDamageBonus);
    }

    if (hero.fireCooldownReductionMs !== 0) {
      this.applyWeaponCooldownReduction(hero.fireCooldownReductionMs);
    }
  }

  private drawArena(): void {
    const graphics = this.add.graphics();

    graphics.fillStyle(0x0b1020, 1);
    graphics.fillRect(
      -CAMERA_OVERSCROLL_PADDING_X,
      -CAMERA_OVERSCROLL_PADDING_Y,
      WORLD_WIDTH + CAMERA_OVERSCROLL_PADDING_X * 2,
      WORLD_HEIGHT + CAMERA_OVERSCROLL_PADDING_Y * 2,
    );

    graphics.fillStyle(0x111827, 1);
    graphics.fillRect(
      -CAMERA_OVERSCROLL_PADDING_X,
      -CAMERA_OVERSCROLL_PADDING_Y,
      WORLD_WIDTH + CAMERA_OVERSCROLL_PADDING_X * 2,
      CAMERA_OVERSCROLL_PADDING_Y,
    );
    graphics.fillRect(
      -CAMERA_OVERSCROLL_PADDING_X,
      WORLD_HEIGHT,
      WORLD_WIDTH + CAMERA_OVERSCROLL_PADDING_X * 2,
      CAMERA_OVERSCROLL_PADDING_Y,
    );
    graphics.fillRect(-CAMERA_OVERSCROLL_PADDING_X, 0, CAMERA_OVERSCROLL_PADDING_X, WORLD_HEIGHT);
    graphics.fillRect(WORLD_WIDTH, 0, CAMERA_OVERSCROLL_PADDING_X, WORLD_HEIGHT);

    graphics.fillStyle(0x152238, 1);
    graphics.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    graphics.fillStyle(0x0f172a, 0.65);
    for (let x = 0; x < WORLD_WIDTH; x += 160) {
      for (let y = 0; y < WORLD_HEIGHT; y += 160) {
        if ((x + y) % 320 === 0) {
          graphics.fillRect(x, y, 160, 160);
        }
      }
    }

    graphics.lineStyle(2, 0x243247, 0.7);
    for (let x = 0; x <= WORLD_WIDTH; x += 80) {
      graphics.lineBetween(x, 0, x, WORLD_HEIGHT);
    }

    for (let y = 0; y <= WORLD_HEIGHT; y += 80) {
      graphics.lineBetween(0, y, WORLD_WIDTH, y);
    }

    graphics.lineStyle(6, 0x475569, 1);
    graphics.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    const arenaCenter = this.add.circle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 90, 0x1d4ed8, 0.16);
    arenaCenter.setStrokeStyle(4, 0x93c5fd, 0.5);
  }

  private syncStagePhase(): void {
    const nextPhase = getStagePhaseForRunState({
      elapsedMs: this.runElapsedMs,
      bossSpawnTimeMs: BOSS_SPAWN_TIME_MS,
      bossActive: Boolean(this.getActiveBossEnemy()),
      ended: this.isEnded,
      victory: Boolean(this.registry.get('run.victory')),
    });

    if (nextPhase === 'boss' && this.stagePhase === 'preBoss') {
      this.enterBossPhase();
      return;
    }

    this.stagePhase = nextPhase;
  }

  private enterBossPhase(): void {
    if (this.isEnded || this.stagePhase === 'boss') {
      return;
    }

    this.stagePhase = 'boss';
    this.bossPhase = 1;
    this.bossPhaseTwoTriggered = false;
    this.nextBossSummonAtMs = Number.POSITIVE_INFINITY;
    this.beginBossStateSequence();
    this.spawnDirector.markBossSpawned();
    this.clearBossPhaseClutter();

    const existingBoss = this.getActiveBossEnemy();
    if (!existingBoss) {
      const spawnPoint = this.getSpawnPoint(BOSS_SPAWN_DISTANCE, BOSS_SPAWN_PLAYER_SAFE_RADIUS);
      this.bossEnemy = this.spawnEnemyFromArchetype(ENEMY_ARCHETYPES.behemoth, spawnPoint);
      this.bossEnemy.setBossPhase(this.bossPhase);
      this.presentEncounterSpawn(ENEMY_ARCHETYPES.behemoth, spawnPoint);
    } else {
      existingBoss.setBossPhase(this.bossPhase);
    }

    this.registry.set('run.instructions', 'Defeat the boss.');
    this.setAlert('boss', 'Defeat boss', 1800);
    this.publishHudState();
  }

  private clearBossPhaseClutter(): void {
    this.clearActiveRunEvent();

    for (const enemy of (this.enemies?.getChildren() as Enemy[] | undefined) ?? []) {
      if (enemy.active && !enemy.isBoss() && !enemy.isBossOwned()) {
        enemy.despawnSilently();
      }
    }

    for (const neutralShape of (this.neutralShapes?.getChildren() as NeutralShape[] | undefined) ?? []) {
      if (neutralShape.active) {
        neutralShape.destroy();
      }
    }

    this.lineStrikeAttacks = [];
    for (const attack of this.shockwaveAttacks) {
      attack.ring.destroy();
      attack.halo.destroy();
    }
    this.shockwaveAttacks = [];
    this.skillTelegraphs = [];
    for (const bolt of this.enemyBolts) {
      this.destroyEnemyBolt(bolt);
    }
    this.enemyBolts = [];
    this.clearDangerZones();
  }

  private getCurrentStagePhase(): StagePhase {
    return getStagePhaseForRunState({
      elapsedMs: this.runElapsedMs,
      bossSpawnTimeMs: BOSS_SPAWN_TIME_MS,
      bossActive: Boolean(this.getActiveBossEnemy()),
      ended: this.isEnded,
      victory: Boolean(this.registry.get('run.victory')),
    });
  }

  private getActiveBossEnemy(): Enemy | null {
    if (this.bossEnemy?.active && this.bossEnemy.isAlive()) {
      return this.bossEnemy;
    }

    const boss = ((this.enemies?.getChildren() as Enemy[] | undefined) ?? []).find(
      (enemy) => enemy.active && enemy.isAlive() && enemy.isBoss(),
    );
    this.bossEnemy = boss ?? null;
    return this.bossEnemy;
  }

  private syncBossPhaseState(): void {
    const boss = this.getActiveBossEnemy();
    if (!boss || this.isEnded) {
      return;
    }

    const result = resolveBossPhase({
      currentPhase: this.bossPhase,
      phaseTwoTriggered: this.bossPhaseTwoTriggered,
      hp: boss.getCurrentHealth(),
      maxHp: boss.getMaxHealth(),
    });

    if (!result.changed) {
      boss.setBossPhase(result.phase);
      return;
    }

    this.bossPhase = result.phase;
    this.bossPhaseTwoTriggered = result.phaseTwoTriggered;
    this.nextBossSummonAtMs = this.runElapsedMs + BOSS_SUMMON_FIRST_DELAY_MS;
    this.beginBossStateSequence();
    boss.setBossPhase(result.phase);
    this.registry.set('run.instructions', 'Boss phase 2. Shockwaves and summons.');
    this.setAlert('boss', 'Boss phase 2', 1800);
    this.showEncounterBanner('BOSS PHASE 2', 'Shockwaves and summons', 0xfca5a5, 1600);
    this.cameras.main.shake(160, 0.0024);
    this.cameras.main.flash(160, 255, 120, 120, false);
    playCue('boss-arrival');
  }

  private areNormalSpawnsSuppressed(): boolean {
    return areNormalSpawnsSuppressed(this.stagePhase) || (!this.isEnded && this.runElapsedMs >= BOSS_SPAWN_TIME_MS);
  }

  private getActiveBossSkillName(): string {
    if (this.skillTelegraphs.some((telegraph) => telegraph.kind === 'boss-shockwave')) {
      return 'shockwave-telegraph';
    }

    if (this.shockwaveAttacks.some((attack) => attack.elapsedMs < attack.durationMs)) {
      return 'shockwave';
    }

    return '';
  }

  private getActiveMinibossSkillName(): string {
    if (this.skillTelegraphs.some((telegraph) => telegraph.kind === 'miniboss-volley')) {
      return 'volley-telegraph';
    }

    if (this.lineTelegraphTracking.length > 0) {
      return 'line-strike-telegraph';
    }

    if (this.volleyAttacks.some((v) => v.elapsedMs < v.durationMs)) {
      return 'volley';
    }

    if (this.lineStrikeAttacks.some((attack) => attack.elapsedMs < attack.durationMs)) {
      return 'line-strike';
    }

    return '';
  }

  private beginBossStateSequence(): void {
    const sequence = this.getBossStateSequence();
    this.bossStateIndex = 0;
    this.bossFightState = sequence[0]?.state ?? 'approach';
    this.bossStateEndsAtMs = this.runElapsedMs + (sequence[0]?.durationMs ?? 4000);
    this.bossStateActionDone = false;
  }

  private getBossStateSequence(): BossStateDefinition[] {
    return this.bossPhase === 2 ? BOSS_STATE_SEQUENCE_PHASE_2 : BOSS_STATE_SEQUENCE_PHASE_1;
  }

  private updateBossStateDirector(): void {
    const boss = this.getActiveBossEnemy();
    if (!boss || this.stagePhase !== 'boss' || this.isEnded || this.isManualPaused || this.isSystemPaused) {
      return;
    }

    this.runBossStateAction(boss);

    if (this.runElapsedMs < this.bossStateEndsAtMs) {
      return;
    }

    const sequence = this.getBossStateSequence();
    if (sequence.length === 0) {
      return;
    }

    this.bossStateIndex = (this.bossStateIndex + 1) % sequence.length;
    const nextState = sequence[this.bossStateIndex];
    this.bossFightState = nextState.state;
    this.bossStateEndsAtMs = this.runElapsedMs + nextState.durationMs;
    this.bossStateActionDone = false;
    this.runBossStateAction(boss);
  }

  private runBossStateAction(boss: Enemy): void {
    if (this.bossStateActionDone) {
      return;
    }

    switch (this.bossFightState) {
      case 'shockwave':
        this.triggerBossShockwaveFromBoss(boss);
        this.bossStateActionDone = true;
        break;
      case 'summon':
        this.spawnBossSummonBatch(false);
        this.bossStateActionDone = true;
        break;
      case 'crossfire':
        this.spawnBossCrossfire(boss);
        this.bossStateActionDone = true;
        break;
      case 'recovery':
        this.registry.set('run.instructions', 'Boss recovering. Push damage.');
        this.bossStateActionDone = true;
        break;
      case 'approach':
      default:
        this.registry.set('run.instructions', this.bossPhase === 2 ? 'Boss raging. Keep space.' : 'Boss pressuring. Keep moving.');
        this.bossStateActionDone = true;
        break;
    }
  }

  private triggerBossShockwaveFromBoss(boss: Enemy): void {
    const contract = createBossShockwaveContract(this.bossPhase);
    const damage = Math.round(Math.max(24, boss.contactDamage - 6) * contract.damageMultiplier);
    this.showBossShockwaveTelegraph(boss.x, boss.y, contract.radius, contract.telegraphMs);
    this.time.delayedCall(contract.telegraphMs, () => {
      if (!this.isEnded && boss.active && boss.isAlive()) {
        this.spawnBossShockwave(boss.x, boss.y, contract.radius, damage, contract.damageActiveMs, contract.thickness);
      }
    });
    this.setAlert('boss', 'Shockwave charging', 900);
    playCue('dash-warning');
  }

  private spawnBossCrossfire(boss: Enemy): void {
    const projectileCount = this.bossPhase === 2 ? BOSS_CROSSFIRE_PROJECTILE_COUNT_PHASE_2 : BOSS_CROSSFIRE_PROJECTILE_COUNT_PHASE_1;
    const offset = Phaser.Math.FloatBetween(0, Math.PI * 2);

    for (let index = 0; index < projectileCount; index += 1) {
      const angle = offset + (Math.PI * 2 * index) / projectileCount;
      this.spawnEnemyBolt(
        boss.x,
        boss.y,
        { x: Math.cos(angle), y: Math.sin(angle) },
        BOSS_CROSSFIRE_PROJECTILE_SPEED,
        BOSS_CROSSFIRE_PROJECTILE_DAMAGE,
        BOSS_CROSSFIRE_COLOR,
        BOSS_CROSSFIRE_PROJECTILE_RADIUS,
      );
    }

    this.createBurstCircle(boss.x, boss.y, BOSS_CROSSFIRE_COLOR, 24, 82, 240, 0.68);
    this.setAlert('boss', 'Crossfire', 900);
    playCue('boss-release');
  }

  private enforceBossPhaseEnemyFocus(): void {
    if (!this.areNormalSpawnsSuppressed()) {
      return;
    }

    for (const enemy of (this.enemies?.getChildren() as Enemy[] | undefined) ?? []) {
      if (enemy.active && !enemy.isBoss() && !enemy.isBossOwned()) {
        enemy.despawnSilently();
      }
    }

    for (const neutralShape of (this.neutralShapes?.getChildren() as NeutralShape[] | undefined) ?? []) {
      if (neutralShape.active) {
        neutralShape.destroy();
      }
    }
  }

  private spawnEnemyWave(): void {
    if (this.isEnded || this.isLevelingUp || this.isSystemPaused || !this.enemies?.active) {
      return;
    }

    if (this.areNormalSpawnsSuppressed()) {
      return;
    }

    const waveResult = this.spawnDirector.nextWave(this.runElapsedMs);
    const hasMajorEncounter = waveResult.wave.some(
      (archetype) => archetype.isElite || archetype.isMiniboss || archetype.isBoss,
    );
    const availableNormalSlots = getAvailableEnemySpawnSlots(this.getActiveEnemyCount());
    let normalSpawnsUsed = 0;

    for (const archetype of waveResult.wave) {
      const isMajorEncounter = Boolean(archetype.isElite || archetype.isMiniboss || archetype.isBoss);
      if (!isMajorEncounter) {
        if (normalSpawnsUsed >= availableNormalSlots) {
          continue;
        }
        normalSpawnsUsed += 1;
      }

      const spawnPoint = this.getSpawnPoint(
        archetype.isBoss ? BOSS_SPAWN_DISTANCE : NORMAL_ENEMY_SPAWN_DISTANCE,
        this.getEnemySpawnSafeRadius(archetype),
      );
      this.spawnEnemyFromArchetype(archetype, spawnPoint);
      this.presentEncounterSpawn(archetype, spawnPoint);
    }

    if (!hasMajorEncounter) {
      this.presentWaveTemplateHighlight(waveResult.templateLabel, waveResult.templateHighlight);
    }
  }

  private trySpawnFormationPressure(): void {
    if (this.runElapsedMs < this.nextFormationAtMs || !this.canSpawnFormationPressure()) {
      return;
    }

    this.spawnFormationPressure(this.pickNextFormationType(), false);
  }

  private canSpawnFormationPressure(): boolean {
    return (
      !this.isEnded &&
      !this.isTransitioningToMenu &&
      !this.isManualPaused &&
      !this.isSystemPaused &&
      !this.isLevelingUp &&
      !this.isChoosingTankClass &&
      !this.areNormalSpawnsSuppressed() &&
      !this.activeRunEvent &&
      !this.hasActiveMajorEncounterEnemy() &&
      this.enemies?.active === true
    );
  }

  private pickNextFormationType(): FormationType {
    const configuredTypes = getWaveDirectorWindow(this.runElapsedMs).templates
      .map((template) => template.formation)
      .filter((formation): formation is FormationType => formation !== 'loose');
    const rotation: FormationType[] = configuredTypes.length > 0 ? configuredTypes : ['ring-breakout', 'pincer', 'sweep-wall'];
    return rotation[this.formationWaveCount % rotation.length];
  }

  private spawnFormationPressure(type: FormationType, forced: boolean): boolean {
    if (!this.canSpawnFormationPressure()) {
      return false;
    }

    const availableSlots = getAvailableEnemySpawnSlots(this.getActiveEnemyCount());
    if (availableSlots <= 0) {
    this.nextFormationAtMs = this.runElapsedMs + WAVE_FORMATION_RETRY_MS;
      return false;
    }

    const plan = this.buildFormationPlan(type, availableSlots);
    if (plan.length === 0) {
      this.nextFormationAtMs = this.runElapsedMs + WAVE_FORMATION_RETRY_MS;
      return false;
    }

    for (const entry of plan) {
      this.spawnEnemyFromArchetype(entry.archetype, entry.point);
    }

    this.lastFormationType = type;
    this.formationSpawnCount = plan.length;
    this.formationWaveCount += forced ? 0 : 1;
    this.lastFormationSpawnPoints = plan.map((entry) => ({
      x: entry.point.x,
      y: entry.point.y,
      distanceFromPlayer: Phaser.Math.Distance.Between(this.player.x, this.player.y, entry.point.x, entry.point.y),
      angle: Phaser.Math.Angle.Between(this.player.x, this.player.y, entry.point.x, entry.point.y),
    }));
    this.nextFormationAtMs = this.runElapsedMs + WAVE_FORMATION_COOLDOWN_MS;
    this.setAlert('objective', this.getFormationAlert(type), 900);
    return true;
  }

  private buildFormationPlan(
    type: FormationType,
    availableSlots: number,
  ): Array<{ archetype: EnemyArchetype; point: Phaser.Math.Vector2 }> {
    switch (type) {
      case 'ring-breakout':
        return this.buildRingBreakoutFormation(availableSlots);
      case 'pincer':
        return this.buildPincerFormation(availableSlots);
      case 'sweep-wall':
      default:
        return this.buildSweepWallFormation(availableSlots);
    }
  }

  private buildRingBreakoutFormation(
    availableSlots: number,
  ): Array<{ archetype: EnemyArchetype; point: Phaser.Math.Vector2 }> {
    const count = Math.min(6, availableSlots);
    if (count < 4) {
      return [];
    }

    const centerAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
    const slots = 8;
    const gapIndex = this.getClosestAngleIndex(centerAngle, slots);
    const archetypes = this.getFormationRoleBundle('ring-breakout', [
      ENEMY_ARCHETYPES.scuttler,
      ENEMY_ARCHETYPES.mauler,
      ENEMY_ARCHETYPES.harrier,
      ENEMY_ARCHETYPES.scuttler,
      ENEMY_ARCHETYPES.skimmer,
      ENEMY_ARCHETYPES.mauler,
    ]);
    const plan: Array<{ archetype: EnemyArchetype; point: Phaser.Math.Vector2 }> = [];

    for (let index = 0; index < slots && plan.length < count; index += 1) {
      const blockedForGap =
        index === gapIndex ||
        index === (gapIndex + 1) % slots ||
        index === (gapIndex + slots - 1) % slots;
      if (blockedForGap) {
        continue;
      }

      const angle = (index / slots) * Math.PI * 2;
      const point = this.clampFormationPoint(
        this.player.x + Math.cos(angle) * FORMATION_RING_RADIUS,
        this.player.y + Math.sin(angle) * FORMATION_RING_RADIUS,
        ENEMY_SPAWN_PLAYER_SAFE_RADIUS,
      );
      plan.push({ archetype: archetypes[plan.length % archetypes.length], point });
    }

    return plan;
  }

  private buildPincerFormation(
    availableSlots: number,
  ): Array<{ archetype: EnemyArchetype; point: Phaser.Math.Vector2 }> {
    const count = Math.min(6, availableSlots);
    if (count < 4) {
      return [];
    }

    const horizontal = Phaser.Math.Between(0, 1) === 0;
    const offsets = [-128, 0, 128];
    const archetypes = this.getFormationRoleBundle('pincer', [
      ENEMY_ARCHETYPES.mauler,
      ENEMY_ARCHETYPES.scuttler,
      ENEMY_ARCHETYPES.harrier,
      ENEMY_ARCHETYPES.mauler,
      ENEMY_ARCHETYPES.scuttler,
      ENEMY_ARCHETYPES.skimmer,
    ]);
    const plan: Array<{ archetype: EnemyArchetype; point: Phaser.Math.Vector2 }> = [];

    for (const side of [-1, 1]) {
      for (const offset of offsets) {
        if (plan.length >= count) {
          break;
        }

        const x = horizontal ? this.player.x + FORMATION_PINCER_DISTANCE * side : this.player.x + offset;
        const y = horizontal ? this.player.y + offset : this.player.y + FORMATION_PINCER_DISTANCE * side;
        plan.push({
          archetype: archetypes[plan.length % archetypes.length],
          point: this.clampFormationPoint(x, y, ENEMY_SPAWN_PLAYER_SAFE_RADIUS),
        });
      }
    }

    return plan;
  }

  private buildSweepWallFormation(
    availableSlots: number,
  ): Array<{ archetype: EnemyArchetype; point: Phaser.Math.Vector2 }> {
    const count = Math.min(5, availableSlots);
    if (count < 4) {
      return [];
    }

    const side = Phaser.Math.Between(0, 3);
    const horizontalWall = side === 0 || side === 2;
    const direction = side === 0 || side === 3 ? -1 : 1;
    const offsets = [-250, -120, 35, 175, 310];
    const archetypes = this.getFormationRoleBundle('sweep-wall', [
      ENEMY_ARCHETYPES.bulwark,
      ENEMY_ARCHETYPES.scuttler,
      ENEMY_ARCHETYPES.mauler,
      ENEMY_ARCHETYPES.harrier,
      ENEMY_ARCHETYPES.scuttler,
    ]);
    const plan: Array<{ archetype: EnemyArchetype; point: Phaser.Math.Vector2 }> = [];

    for (let index = 0; index < count; index += 1) {
      const stagger = index % 2 === 0 ? 0 : 48;
      const x = horizontalWall ? this.player.x + offsets[index] : this.player.x + FORMATION_SWEEP_DISTANCE * direction + stagger;
      const y = horizontalWall ? this.player.y + FORMATION_SWEEP_DISTANCE * direction + stagger : this.player.y + offsets[index];
      plan.push({
        archetype: archetypes[index % archetypes.length],
        point: this.clampFormationPoint(x, y, ENEMY_SPAWN_PLAYER_SAFE_RADIUS),
      });
    }

    return plan;
  }

  private clampFormationPoint(x: number, y: number, safeRadius: number): Phaser.Math.Vector2 {
    let nextX = Phaser.Math.Clamp(x, 48, WORLD_WIDTH - 48);
    let nextY = Phaser.Math.Clamp(y, 48, WORLD_HEIGHT - 48);
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, nextX, nextY);

    if (distance < safeRadius) {
      const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, nextX, nextY);
      nextX = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * safeRadius, 48, WORLD_WIDTH - 48);
      nextY = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * safeRadius, 48, WORLD_HEIGHT - 48);
    }

    return new Phaser.Math.Vector2(nextX, nextY);
  }

  private getFormationRoleBundle(type: FormationType, fallback: EnemyArchetype[]): EnemyArchetype[] {
    const window = getWaveDirectorWindow(this.runElapsedMs);
    const template = window.templates.find((candidate) => candidate.formation === type);
    if (!template) {
      return fallback;
    }

    const bundle = template.composition.map((id) => ENEMY_ARCHETYPES[id]).filter(Boolean);
    return bundle.length > 0 ? bundle : fallback;
  }

  private getClosestAngleIndex(angle: number, slotCount: number): number {
    const wrapped = Phaser.Math.Angle.Wrap(angle);
    const normalized = wrapped < 0 ? wrapped + Math.PI * 2 : wrapped;
    return Math.round((normalized / (Math.PI * 2)) * slotCount) % slotCount;
  }

  private getFormationAlert(type: FormationType): string {
    switch (type) {
      case 'ring-breakout':
        return 'Breakout gap';
      case 'pincer':
        return 'Pincer wave';
      case 'sweep-wall':
      default:
        return 'Sweep wall';
    }
  }

  private spawnEnemyFromArchetype(archetype: EnemyArchetype, spawnPoint: Phaser.Math.Vector2): Enemy {
    const scaledArchetype = applyEnemyScaling(archetype, this.runElapsedMs);
    const enemy = new Enemy(this, spawnPoint.x, spawnPoint.y, scaledArchetype);
    this.enemies.add(enemy);
    if (enemy.isBoss()) {
      this.bossEnemy = enemy;
      enemy.setBossPhase(this.bossPhase);
    }
    return enemy;
  }

  private updateBossSummons(): void {
    const boss = this.getActiveBossEnemy();
    const activeSummonCount = this.getActiveBossSummonCount();

    if (
      !shouldSpawnBossSummons({
        stagePhase: this.stagePhase,
        bossPhase: this.bossPhase,
        bossActive: Boolean(boss),
        elapsedMs: this.runElapsedMs,
        nextSummonAtMs: this.nextBossSummonAtMs,
        activeSummonCount,
      })
    ) {
      return;
    }

    this.spawnBossSummonBatch(false);
  }

  private spawnBossSummonBatch(forced: boolean): number {
    if (
      !this.enemies?.active ||
      this.stagePhase !== 'boss' ||
      (!forced && this.bossPhase !== 2 && this.bossFightState !== 'summon') ||
      !this.getActiveBossEnemy()
    ) {
      return 0;
    }

    const availableSlots = getAvailableBossSummonSlots(this.getActiveBossSummonCount());
    const summonCount = Math.min(BOSS_SUMMON_BATCH_SIZE, availableSlots);
    if (summonCount <= 0) {
      this.nextBossSummonAtMs = this.runElapsedMs + BOSS_SUMMON_INTERVAL_MS;
      return 0;
    }

    const composition = this.getNextBossSummonComposition();
    for (let index = 0; index < summonCount; index += 1) {
      const baseId = composition[index % composition.length] ?? 'scuttler';
      const summonArchetype = createBossSummonArchetype(ENEMY_ARCHETYPES[baseId]);
      const spawnPoint = this.getSpawnPoint(
        BOSS_SUMMON_SPAWN_DISTANCE + index * BOSS_SUMMON_SPAWN_DISTANCE_STEP,
        ENEMY_SPAWN_PLAYER_SAFE_RADIUS,
      );
      const summon = this.spawnEnemyFromArchetype(summonArchetype, spawnPoint);
      summon.setBossOwned(true);
      this.showSpawnIndicator(spawnPoint.x, spawnPoint.y, 'ADD', 0xfca5a5);
    }

    this.nextBossSummonAtMs = this.runElapsedMs + BOSS_SUMMON_INTERVAL_MS;
    if (!forced) {
      this.registry.set('run.instructions', 'Boss summons active. Keep space.');
      this.setAlert('boss', 'Boss summons', 1200);
    }
    this.publishHudState();
    return summonCount;
  }

  private getNextBossSummonComposition(): Array<keyof typeof ENEMY_ARCHETYPES> {
    const compositions = BOSS_SUMMON_COMPOSITIONS[this.bossPhase];
    const composition = compositions[this.bossSummonCompositionIndex % compositions.length] ?? ['scuttler'];
    this.bossSummonCompositionIndex += 1;
    return composition;
  }

  private getActiveBossSummonCount(): number {
    if (!this.enemies?.active) {
      return 0;
    }

    return (this.enemies.getChildren() as Enemy[]).filter(
      (enemy) => enemy.active && enemy.isAlive() && enemy.isBossOwned(),
    ).length;
  }

  private clearBossOwnedSummons(): void {
    const enemies = [...((this.enemies?.getChildren() as Enemy[] | undefined) ?? [])];
    for (const enemy of enemies) {
      if (enemy.active && enemy.isBossOwned()) {
        enemy.despawnSilently();
      }
    }
    this.nextBossSummonAtMs = Number.POSITIVE_INFINITY;
  }

  private spawnInitialNeutralShapes(): void {
    for (let index = 0; index < NEUTRAL_SHAPE_INITIAL_COUNT; index += 1) {
      this.spawnNeutralShape();
    }
  }

  private refillNeutralShapes(): void {
    if (this.isEnded || this.isLevelingUp || this.isSystemPaused || !this.neutralShapes?.active) {
      return;
    }

    if (this.areNormalSpawnsSuppressed()) {
      return;
    }

    if (this.getActiveNeutralShapeCount() >= NEUTRAL_SHAPE_MAX_COUNT) {
      return;
    }

    this.spawnNeutralShape();
  }

  private spawnNeutralShape(kind = chooseNeutralShapeKind(Phaser.Math.FloatBetween(0, 0.999999))): NeutralShape | null {
    if (!this.neutralShapes?.active || this.getActiveNeutralShapeCount() >= NEUTRAL_SHAPE_MAX_COUNT) {
      return null;
    }

    const spawnPoint = this.getNeutralShapeSpawnPoint();
    const neutralShape = new NeutralShape(this, spawnPoint.x, spawnPoint.y, kind);
    this.neutralShapes.add(neutralShape);
    return neutralShape;
  }

  private getActiveNeutralShapeCount(): number {
    if (!this.neutralShapes?.active) {
      return 0;
    }

    return (this.neutralShapes.getChildren() as NeutralShape[]).filter(
      (neutralShape) => neutralShape.active && neutralShape.isAlive(),
    ).length;
  }

  private getNeutralShapeSpawnPoint(): Phaser.Math.Vector2 {
    for (let attempt = 0; attempt < 18; attempt += 1) {
      const x = Phaser.Math.Between(NEUTRAL_SHAPE_SPAWN_PADDING, WORLD_WIDTH - NEUTRAL_SHAPE_SPAWN_PADDING);
      const y = Phaser.Math.Between(NEUTRAL_SHAPE_SPAWN_PADDING, WORLD_HEIGHT - NEUTRAL_SHAPE_SPAWN_PADDING);

      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y) >= NEUTRAL_SHAPE_PLAYER_SAFE_RADIUS) {
        return new Phaser.Math.Vector2(x, y);
      }
    }

    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    return new Phaser.Math.Vector2(
      Phaser.Math.Clamp(
        this.player.x + Math.cos(angle) * NEUTRAL_SHAPE_PLAYER_SAFE_RADIUS,
        NEUTRAL_SHAPE_SPAWN_PADDING,
        WORLD_WIDTH - NEUTRAL_SHAPE_SPAWN_PADDING,
      ),
      Phaser.Math.Clamp(
        this.player.y + Math.sin(angle) * NEUTRAL_SHAPE_PLAYER_SAFE_RADIUS,
        NEUTRAL_SHAPE_SPAWN_PADDING,
        WORLD_HEIGHT - NEUTRAL_SHAPE_SPAWN_PADDING,
      ),
    );
  }

  private presentEncounterSpawn(archetype: EnemyArchetype, spawnPoint: Phaser.Math.Vector2): void {
    if (archetype.isBoss) {
      this.registry.set('run.instructions', 'Final boss active.');
      this.setAlert('boss', 'Final boss', 1800);
      this.showSpawnIndicator(spawnPoint.x, spawnPoint.y, 'BOSS', 0xfca5a5);
      this.showEncounterBanner('FINAL BOSS', `${archetype.name} active`, 0xf87171, 1800);
      this.cameras.main.shake(160, 0.0023);
      this.cameras.main.flash(180, 255, 120, 120, false);
      playCue('boss-arrival');
    } else if (archetype.isMiniboss) {
      this.registry.set('run.instructions', 'Miniboss active.');
      this.setAlert('miniboss', 'Miniboss', 1500);
      this.showSpawnIndicator(spawnPoint.x, spawnPoint.y, 'MINIBOSS', 0xfda4af);
      this.showEncounterBanner('MINIBOSS', `${archetype.name} active`, 0xfda4af, 1500);
      this.cameras.main.shake(120, 0.0018);
      this.cameras.main.flash(120, 255, 180, 180, false);
      playCue('miniboss-arrival');
    } else if (archetype.isElite) {
      this.registry.set('run.instructions', 'Elite active.');
      this.setAlert('elite', 'Elite', 1100);
      this.showSpawnIndicator(spawnPoint.x, spawnPoint.y, 'ELITE', 0xe9d5ff);
      this.showEncounterBanner('ELITE', `${archetype.name} active`, 0xe9d5ff, 1000);
      this.cameras.main.shake(90, 0.0012);
      this.cameras.main.flash(90, 190, 150, 255, false);
      playCue('elite-arrival');
    }
  }

  private presentWaveTemplateHighlight(templateLabel: string, highlight: boolean): void {
    if (!highlight || !templateLabel || this.activeRunEvent) {
      return;
    }

    const now = this.time.now;
    if (now - this.lastWaveTemplateAlertAtMs < WAVE_TEMPLATE_ALERT_COOLDOWN_MS) {
      return;
    }

    this.lastWaveTemplateAlertAtMs = now;
    this.setAlert('objective', `${templateLabel} wave`, 1100);
  }

  private updateRunEventState(): void {
    if (this.activeRunEvent) {
      this.updateActiveRunEvent();
    } else {
      this.tryStartScheduledRunEvent();
    }

    this.updateRewardTargetMarker();
  }

  private updateActiveRunEvent(): void {
    const activeEvent = this.activeRunEvent;
    if (!activeEvent) {
      return;
    }

    if (activeEvent.type === 'challenge-wave') {
      const remainingChallengeEnemies = activeEvent.challengeEnemies.filter((enemy) => enemy.active && enemy.isAlive());
      activeEvent.challengeEnemies = remainingChallengeEnemies;

      if (remainingChallengeEnemies.length === 0 || this.runElapsedMs >= activeEvent.endsAtMs) {
        this.resolveRunEventSuccess(activeEvent, remainingChallengeEnemies.length === 0 ? 'Challenge wave cleared.' : 'Challenge wave survived.');
      }
      return;
    }

    if (activeEvent.type === 'buff-shrine') {
      activeEvent.pressureEnemies = activeEvent.pressureEnemies.filter((enemy) => enemy.active && enemy.isAlive());
      this.updateBuffShrineVisual(activeEvent);

      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, activeEvent.x, activeEvent.y);
      if (distance <= BUFF_SHRINE_EVENT.claimRadius) {
        this.resolveBuffShrineSuccess(activeEvent);
        return;
      }

      if (this.runElapsedMs >= activeEvent.endsAtMs) {
        this.resolveRunEventFailure(activeEvent, 'Power core faded.');
      }
      return;
    }

    if (!activeEvent.targetEnemy.active || !activeEvent.targetEnemy.isAlive()) {
      return;
    }

    if (this.runElapsedMs >= activeEvent.endsAtMs) {
      activeEvent.targetEnemy.despawnSilently();
      this.resolveRunEventFailure(activeEvent, 'Reward target escaped.');
    }
  }

  private tryStartScheduledRunEvent(): void {
    if (this.areNormalSpawnsSuppressed()) {
      return;
    }

    if (
      this.runElapsedMs >= this.nextBuffShrineAtMs &&
      this.canStartRunEvent(BUFF_SHRINE_EVENT.durationMs) &&
      this.getActiveBuffShrineCount() < BUFF_SHRINE_EVENT.maxActiveEvents
    ) {
      this.startBuffShrineEvent();
      return;
    }

    if (
      !this.rewardTargetEventConsumed &&
      this.runElapsedMs >= REWARD_TARGET_EVENT_WINDOW_START_MS &&
      this.runElapsedMs <= REWARD_TARGET_EVENT_WINDOW_END_MS &&
      this.canStartRunEvent(REWARD_TARGET_EVENT_DURATION_MS)
    ) {
      this.startRewardTargetEvent();
      return;
    }

    if (
      !this.challengeWaveEventConsumed &&
      this.runElapsedMs >= CHALLENGE_WAVE_EVENT_WINDOW_START_MS &&
      this.runElapsedMs <= CHALLENGE_WAVE_EVENT_WINDOW_END_MS &&
      this.canStartRunEvent(CHALLENGE_WAVE_EVENT_DURATION_MS)
    ) {
      this.startChallengeWaveEvent();
    }
  }

  private canStartRunEvent(durationMs: number): boolean {
    if (this.isEnded || this.isTransitioningToMenu || this.isLevelingUp || this.isSystemPaused || this.activeRunEvent) {
      return false;
    }

    if (this.areNormalSpawnsSuppressed()) {
      return false;
    }

    if (this.hasActiveMajorEncounterEnemy()) {
      return false;
    }

    const nextEliteSpawnAtMs = this.spawnDirector.getNextEliteSpawnAtMs();
    const nextMinibossSpawnAtMs = this.spawnDirector.getNextMinibossSpawnAtMs();
    const nextBossSpawnAtMs = this.spawnDirector.hasBossSpawned() ? Number.POSITIVE_INFINITY : BOSS_SPAWN_TIME_MS;
    const safeWindowRequiredMs = durationMs + RUN_EVENT_ENCOUNTER_BUFFER_MS + MAP_EVENT_ENCOUNTER_BUFFER_MS;

    return (
      nextEliteSpawnAtMs - this.runElapsedMs > safeWindowRequiredMs &&
      nextMinibossSpawnAtMs - this.runElapsedMs > safeWindowRequiredMs &&
      nextBossSpawnAtMs - this.runElapsedMs > safeWindowRequiredMs
    );
  }

  private hasActiveMajorEncounterEnemy(): boolean {
    const activeEnemies = this.enemies?.active ? (this.enemies.getChildren() as Enemy[]) : [];
    return activeEnemies.some((enemy) => enemy.active && enemy.isAlive() && (enemy.isElite() || enemy.isMiniboss() || enemy.isBoss()));
  }

  private startChallengeWaveEvent(force = false): boolean {
    if (this.areNormalSpawnsSuppressed()) {
      return false;
    }

    if (!force && !this.canStartRunEvent(CHALLENGE_WAVE_EVENT_DURATION_MS)) {
      return false;
    }

    const challengeEnemies = [
      ENEMY_ARCHETYPES.crusher,
      ENEMY_ARCHETYPES.mauler,
      ENEMY_ARCHETYPES.hexcaster,
      ENEMY_ARCHETYPES.harrier,
    ].map((archetype, index) =>
      this.spawnEnemyFromArchetype(
        applyEventEnemyStatMultiplier(archetype),
        this.getSpawnPoint(index === 0 ? 460 : 420, this.getEnemySpawnSafeRadius(archetype)),
      ),
    );

    this.activeRunEvent = {
      type: 'challenge-wave',
      title: 'Challenge Wave',
      objective: 'Clear or outlast.',
      startedAtMs: this.runElapsedMs,
      endsAtMs: this.runElapsedMs + CHALLENGE_WAVE_EVENT_DURATION_MS,
      challengeEnemies,
      rewardGold: 8,
      rewardLevelUps: 1,
    };
    this.challengeWaveEventConsumed = true;
    this.registry.set('run.instructions', 'Challenge wave active.');
    this.setAlert('objective', 'Challenge wave', 1300);
    this.showEncounterBanner('CHALLENGE', 'Clear or outlast', 0xfbbf24, 1300);
    this.cameras.main.shake(100, 0.0015);
    this.cameras.main.flash(100, 255, 210, 120, false);
    playCue('elite-arrival');
    return true;
  }

  private startRewardTargetEvent(force = false): boolean {
    if (this.areNormalSpawnsSuppressed()) {
      return false;
    }

    if (!force && !this.canStartRunEvent(REWARD_TARGET_EVENT_DURATION_MS)) {
      return false;
    }

    const rewardTargetArchetype: EnemyArchetype = applyEventEnemyStatMultiplier({
      ...ENEMY_ARCHETYPES.harrier,
      ...REWARD_TARGET_ENEMY_BALANCE,
    });
    const targetEnemy = this.spawnEnemyFromArchetype(
      rewardTargetArchetype,
      this.getSpawnPoint(380, ENEMY_SPAWN_PLAYER_SAFE_RADIUS),
    );
    targetEnemy.setEventMarker(0xfbbf24);

    this.activeRunEvent = {
      type: 'reward-target',
      title: 'Reward Target',
      objective: 'Hunt the target.',
      startedAtMs: this.runElapsedMs,
      endsAtMs: this.runElapsedMs + REWARD_TARGET_EVENT_DURATION_MS,
      targetEnemy,
      rewardGold: 18,
      rewardXp: 24,
    };
    this.rewardTargetEventConsumed = true;
    this.registry.set('run.instructions', 'Reward target active.');
    this.setAlert('objective', 'Reward target', 1300);
    this.showSpawnIndicator(targetEnemy.x, targetEnemy.y, 'TARGET', 0xfbbf24);
    this.showEncounterBanner('TARGET', 'Hunt it down', 0xfbbf24, 1300);
    this.cameras.main.flash(100, 255, 225, 140, false);
    playCue('elite-arrival');
    return true;
  }

  private startBuffShrineEvent(force = false): boolean {
    if (this.areNormalSpawnsSuppressed()) {
      return false;
    }

    if (!force && !this.canStartRunEvent(BUFF_SHRINE_EVENT.durationMs)) {
      return false;
    }

    const point = this.chooseBuffShrinePoint();
    const shrineVisual = this.add.circle(point.x, point.y, BUFF_SHRINE_EVENT.shrineRadius, BUFF_SHRINE_EVENT.fillColor, 0.2).setDepth(7.4);
    shrineVisual.setStrokeStyle(4, BUFF_SHRINE_EVENT.strokeColor, 0.95);
    shrineVisual.setBlendMode(Phaser.BlendModes.ADD);
    const claimRing = this.add.circle(point.x, point.y, BUFF_SHRINE_EVENT.claimRadius, BUFF_SHRINE_EVENT.fillColor, 0.05).setDepth(7.35);
    claimRing.setStrokeStyle(2, BUFF_SHRINE_EVENT.strokeColor, 0.76);
    const label = this.add
      .text(point.x, point.y - BUFF_SHRINE_EVENT.claimRadius - 20, 'CORE', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '14px',
        color: BUFF_SHRINE_EVENT.labelColor,
        stroke: '#0f172a',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(7.45);
    const icon = this.createPowerCoreMapEventIcon(point.x, point.y);

    const pressureEnemies = this.spawnBuffShrinePressure(point);
    this.activeRunEvent = {
      type: 'buff-shrine',
      title: 'Power Core',
      objective: 'Claim the core.',
      startedAtMs: this.runElapsedMs,
      endsAtMs: this.runElapsedMs + BUFF_SHRINE_EVENT.durationMs,
      x: point.x,
      y: point.y,
      pressureEnemies,
      shrineVisual,
      claimRing,
      label,
      icon,
    };
    this.nextBuffShrineAtMs = this.runElapsedMs + BUFF_SHRINE_EVENT.intervalMs;
    this.registry.set('run.instructions', 'Power core active.');
    this.setAlert('objective', 'Power core', 1300);
    this.showSpawnIndicator(point.x, point.y, 'CORE', BUFF_SHRINE_EVENT.strokeColor);
    this.cameras.main.flash(90, 140, 210, 255, false);
    playCue('elite-arrival');
    return true;
  }

  private chooseBuffShrinePoint(): Phaser.Math.Vector2 {
    const edge = BUFF_SHRINE_EVENT.edgePadding;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const x = Phaser.Math.Between(edge, WORLD_WIDTH - edge);
      const y = Phaser.Math.Between(edge, WORLD_HEIGHT - edge);
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y) >= BUFF_SHRINE_EVENT.safeDistanceFromPlayer) {
        return new Phaser.Math.Vector2(x, y);
      }
    }

    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    return new Phaser.Math.Vector2(
      Phaser.Math.Clamp(this.player.x + Math.cos(angle) * BUFF_SHRINE_EVENT.safeDistanceFromPlayer, edge, WORLD_WIDTH - edge),
      Phaser.Math.Clamp(this.player.y + Math.sin(angle) * BUFF_SHRINE_EVENT.safeDistanceFromPlayer, edge, WORLD_HEIGHT - edge),
    );
  }

  private createPowerCoreMapEventIcon(x: number, y: number): Phaser.GameObjects.Image | undefined {
    const slot = getPowerCoreMapEventIconAssetSlot('power-core');
    if (!shouldUseVisualAsset(this, 'powerCoreMapEventIcons', slot)) {
      return undefined;
    }

    return this.add
      .image(x, y, slot.key)
      .setDepth(7.46)
      .setDisplaySize(BUFF_SHRINE_EVENT.shrineRadius * 1.8, BUFF_SHRINE_EVENT.shrineRadius * 1.8)
      .setAlpha(0.96);
  }

  private spawnBuffShrinePressure(point: Phaser.Math.Vector2): Enemy[] {
    const availableSlots = getAvailableEnemySpawnSlots(this.getActiveEnemyCount());
    const pressureIds = BUFF_SHRINE_EVENT.enemyPressure.slice(0, availableSlots);

    return pressureIds.map((id, index) => {
      const archetype = applyEventEnemyStatMultiplier(ENEMY_ARCHETYPES[id]);
      const angle = (Math.PI * 2 * index) / Math.max(1, pressureIds.length) + Phaser.Math.FloatBetween(-0.24, 0.24);
      const spawnPoint = new Phaser.Math.Vector2(
        Phaser.Math.Clamp(point.x + Math.cos(angle) * BUFF_SHRINE_EVENT.pressureSpawnDistance, 48, WORLD_WIDTH - 48),
        Phaser.Math.Clamp(point.y + Math.sin(angle) * BUFF_SHRINE_EVENT.pressureSpawnDistance, 48, WORLD_HEIGHT - 48),
      );
      const enemy = this.spawnEnemyFromArchetype(archetype, spawnPoint);
      enemy.setEventMarker(BUFF_SHRINE_EVENT.strokeColor);
      return enemy;
    });
  }

  private updateBuffShrineVisual(activeEvent: Extract<ActiveRunEvent, { type: 'buff-shrine' }>): void {
    const remainingRatio = Phaser.Math.Clamp((activeEvent.endsAtMs - this.runElapsedMs) / BUFF_SHRINE_EVENT.durationMs, 0, 1);
    const pulse = 1 + Math.sin(this.time.now * 0.012) * 0.06;
    activeEvent.shrineVisual.setScale(pulse);
    activeEvent.icon?.setScale(pulse);
    activeEvent.claimRing.setAlpha(0.05 + remainingRatio * 0.06);
    activeEvent.claimRing.setStrokeStyle(2 + Math.round((1 - remainingRatio) * 2), BUFF_SHRINE_EVENT.strokeColor, 0.62 + remainingRatio * 0.2);
    activeEvent.label.setAlpha(0.78 + Math.sin(this.time.now * 0.015) * 0.12);
  }

  private resolveBuffShrineSuccess(activeEvent: Extract<ActiveRunEvent, { type: 'buff-shrine' }>): void {
    if (this.activeRunEvent !== activeEvent) {
      return;
    }

    this.buffShrineSuccessCount += 1;
    this.activeMapBuff = { type: BUFF_SHRINE_EVENT.buffType, remainingMs: BUFF_SHRINE_EVENT.buffDurationMs };
    this.breakoutPulseProtectionRemainingMs = Math.max(
      this.breakoutPulseProtectionRemainingMs,
      BUFF_SHRINE_EVENT.shieldInvulnerabilityMs,
    );
    this.breakoutPulseCooldownRemainingMs = Math.max(
      0,
      this.breakoutPulseCooldownRemainingMs - BUFF_SHRINE_EVENT.pulseCooldownRefundMs,
    );
    this.player.extendInvulnerability(BUFF_SHRINE_EVENT.shieldInvulnerabilityMs, this.time.now);
    this.createBurstCircle(activeEvent.x, activeEvent.y, BUFF_SHRINE_EVENT.fillColor, 26, 112, 320, 0.86);
    this.showFloatingText(this.player.x, this.player.y - 70, 'Shield + Pulse', BUFF_SHRINE_EVENT.labelColor, 18);
    this.showRewardToast('Power core: shield and Pulse refund', BUFF_SHRINE_EVENT.labelColor);
    this.registry.set('run.instructions', 'Power core claimed.');
    this.setAlert('objective', 'Core claimed', 1400);
    this.clearActiveRunEvent();
    playCue('elite-reward');
  }

  private resolveRunEventSuccess(activeEvent: ActiveRunEvent, detail: string): void {
    if (this.activeRunEvent !== activeEvent) {
      return;
    }

    if (activeEvent.type === 'challenge-wave') {
      this.challengeWaveSuccessCount += 1;
      this.grantRunEventReward('Challenge reward', activeEvent.rewardGold, 0, activeEvent.rewardLevelUps);
    } else if (activeEvent.type === 'reward-target') {
      this.rewardTargetSuccessCount += 1;
      this.grantRunEventReward('Reward target secured', activeEvent.rewardGold, activeEvent.rewardXp, 0);
    } else {
      this.resolveBuffShrineSuccess(activeEvent);
      return;
    }

    this.showRewardToast(
      activeEvent.type === 'challenge-wave'
        ? 'Challenge reward: +1 upgrade | +8 gold'
        : 'Reward target secured: +18 gold | +24 XP',
      '#fde68a',
    );
    this.registry.set('run.instructions', detail);
    this.setAlert('objective', activeEvent.type === 'challenge-wave' ? 'Challenge cleared' : 'Reward target secured', 1600);
    this.clearActiveRunEvent();
    playCue(activeEvent.type === 'challenge-wave' ? 'miniboss-reward' : 'elite-reward');
  }

  private resolveRunEventFailure(activeEvent: ActiveRunEvent, detail: string): void {
    if (this.activeRunEvent !== activeEvent) {
      return;
    }

    if (activeEvent.type === 'challenge-wave') {
      this.challengeWaveFailureCount += 1;
    } else if (activeEvent.type === 'reward-target') {
      this.rewardTargetFailureCount += 1;
    } else {
      this.buffShrineFailureCount += 1;
    }

    this.showRewardToast(
      activeEvent.type === 'challenge-wave'
        ? 'Challenge wave ended with no bonus reward.'
        : activeEvent.type === 'reward-target'
          ? 'Reward target escaped.'
          : 'Power core faded.',
      '#fca5a5',
    );
    this.registry.set('run.instructions', detail);
    this.setAlert(
      'objective',
      activeEvent.type === 'challenge-wave' ? 'Challenge ended' : activeEvent.type === 'reward-target' ? 'Target escaped' : 'Core faded',
      1400,
    );
    this.clearActiveRunEvent();
  }

  private grantRunEventReward(title: string, rewardGold: number, rewardXp: number, rewardLevelUps: number): void {
    const rewardMessages: string[] = [];

    if (rewardGold > 0) {
      this.goldEarned += rewardGold;
      this.showFloatingText(this.player.x, this.player.y - 70, `+${rewardGold} gold`, '#fcd34d', 16);
      this.createBurstCircle(this.player.x, this.player.y, 0xfbbf24, 12, 44, 220, 0.3);
      rewardMessages.push(`+${rewardGold} gold`);
    }

    if (rewardXp > 0) {
      const levelsGained = this.player.gainExperience(rewardXp);
      this.showFloatingText(this.player.x, this.player.y - 92, `+${rewardXp} XP`, '#bfdbfe', 16);
      rewardMessages.push(`+${rewardXp} XP`);
      if (levelsGained > 0) {
        this.handlePlayerLevelsGained(levelsGained);
      }
    }

    if (rewardLevelUps > 0) {
      this.pendingLevelUps += rewardLevelUps;
      this.showFloatingText(this.player.x, this.player.y - 114, rewardLevelUps > 1 ? `+${rewardLevelUps} upgrades` : '+1 upgrade', '#fef08a', 18);
      rewardMessages.push(rewardLevelUps > 1 ? `+${rewardLevelUps} upgrades` : '+1 upgrade');
    }

    if (rewardLevelUps > 0 && !this.isLevelingUp) {
      this.queueLevelUpStart();
    }

    this.showEncounterBanner(title.toUpperCase(), rewardMessages.join(' | '), 0xfbbf24, 1800);
  }

  private clearActiveRunEvent(): void {
    if (this.activeRunEvent?.type === 'reward-target') {
      this.activeRunEvent.targetEnemy.setEventMarker(null);
    }

    if (this.activeRunEvent?.type === 'buff-shrine') {
      this.activeRunEvent.shrineVisual.destroy();
      this.activeRunEvent.claimRing.destroy();
      this.activeRunEvent.label.destroy();
      this.activeRunEvent.icon?.destroy();
      for (const enemy of this.activeRunEvent.pressureEnemies) {
        if (enemy.active) {
          enemy.setEventMarker(null);
        }
      }
    }

    this.activeRunEvent = null;
    this.destroyRewardTargetMarker();
  }

  private getActiveBuffShrineCount(): number {
    return this.activeRunEvent?.type === 'buff-shrine' ? 1 : 0;
  }

  private updateRewardTargetMarker(): void {
    const activeEvent = this.activeRunEvent;
    if (!activeEvent || activeEvent.type !== 'reward-target' || !activeEvent.targetEnemy.active || !activeEvent.targetEnemy.isAlive()) {
      this.destroyRewardTargetMarker();
      return;
    }

    if (!this.rewardTargetMarker) {
      this.rewardTargetMarker = this.add.circle(activeEvent.targetEnemy.x, activeEvent.targetEnemy.y, 26, 0xfbbf24, 0.08).setDepth(8.1);
      this.rewardTargetMarker.setStrokeStyle(3, 0xfbbf24, 0.95);
    }

    if (!this.rewardTargetLabel) {
      this.rewardTargetLabel = this.add
        .text(activeEvent.targetEnemy.x, activeEvent.targetEnemy.y - 34, 'TARGET', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '14px',
          color: '#fef3c7',
          stroke: '#111827',
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(8.2);
    }

    const pulseRadius = 24 + Math.sin(this.time.now * 0.012) * 4;
    this.rewardTargetMarker.setPosition(activeEvent.targetEnemy.x, activeEvent.targetEnemy.y);
    this.rewardTargetMarker.setRadius(pulseRadius);
    this.rewardTargetLabel.setPosition(activeEvent.targetEnemy.x, activeEvent.targetEnemy.y - 34);
  }

  private destroyRewardTargetMarker(): void {
    this.rewardTargetMarker?.destroy();
    this.rewardTargetMarker = undefined;
    this.rewardTargetLabel?.destroy();
    this.rewardTargetLabel = undefined;
  }

  private getSpawnPoint(distance: number, safeRadius = ENEMY_SPAWN_PLAYER_SAFE_RADIUS): Phaser.Math.Vector2 {
    const spawnPoint = chooseSafeSpawnPoint({
      player: { x: this.player.x, y: this.player.y },
      bounds: { minX: 24, minY: 24, maxX: WORLD_WIDTH - 24, maxY: WORLD_HEIGHT - 24 },
      safeRadius,
      attempts: ENEMY_SPAWN_SAFE_ATTEMPTS,
      createCandidate: () => {
        const side = Phaser.Math.Between(0, 3);
        const offset = Phaser.Math.Between(-260, 260);

        switch (side) {
          case 0:
            return { x: this.player.x + offset, y: this.player.y - distance };
          case 1:
            return { x: this.player.x + distance, y: this.player.y + offset };
          case 2:
            return { x: this.player.x + offset, y: this.player.y + distance };
          default:
            return { x: this.player.x - distance, y: this.player.y + offset };
        }
      },
    });

    return new Phaser.Math.Vector2(spawnPoint.x, spawnPoint.y);
  }

  private getActiveEnemyCount(): number {
    if (!this.enemies?.active) {
      return 0;
    }

    return (this.enemies.getChildren() as Enemy[]).filter((enemy) => enemy.active && enemy.isAlive()).length;
  }

  private getEnemySpawnSafeRadius(archetype: EnemyArchetype): number {
    if (archetype.isBoss) {
      return BOSS_SPAWN_PLAYER_SAFE_RADIUS;
    }

    if (archetype.isElite || archetype.isMiniboss) {
      return ELITE_SPAWN_PLAYER_SAFE_RADIUS;
    }

    return ENEMY_SPAWN_PLAYER_SAFE_RADIUS;
  }

  private updateEnemies(): void {
    if (!this.enemies?.active) {
      return;
    }

    const enemyChildren = this.enemies.getChildren() as Enemy[];

    for (const enemy of enemyChildren) {
      const attackSignal = enemy.chase(this.player, this.time.now);
      if (attackSignal) {
        this.handleEnemyAttackSignal(enemy, attackSignal);
      }
      enemy.updatePresentation(this.time.now);
    }
  }

  private updateShockwaveAttacks(deltaMs: number): void {
    if (this.shockwaveAttacks.length === 0) {
      return;
    }

    const nextAttacks: typeof this.shockwaveAttacks = [];

    for (const attack of this.shockwaveAttacks) {
      const previousRadius = attack.currentRadius;
      attack.elapsedMs += deltaMs;
      const progress = Phaser.Math.Clamp(attack.elapsedMs / attack.durationMs, 0, 1);
      attack.currentRadius = Phaser.Math.Linear(52, attack.maxRadius, progress);
      attack.ring.setRadius(attack.currentRadius);
      attack.ring.setAlpha(0.92 - progress * 0.48);
      attack.ring.setStrokeStyle(Math.max(8, 14 - progress * 4), progress < 0.22 ? 0xffffff : 0xfca5a5, 0.95);
      attack.halo.setRadius(attack.currentRadius + attack.thickness * 0.7);
      attack.halo.setAlpha(0.16 - progress * 0.12);

      if (!attack.hasHitPlayer) {
        if (this.doesShockwaveHitPlayer(attack, previousRadius)) {
          attack.hasHitPlayer = true;
          const tookDamage = this.player.takeDamage(attack.damage, this.time.now);
          if (tookDamage) {
            this.cameras.main.shake(110, PLAYER_HIT_SHAKE_INTENSITY * 1.15);
            this.createBurstCircle(this.player.x, this.player.y, 0xfca5a5, 14, 42, 220, 0.8);
            this.showFloatingText(this.player.x, this.player.y - 24, `${attack.damage}`, '#fecaca', 18);

            if (!this.player.isAlive()) {
              attack.ring.destroy();
              attack.halo.destroy();
              this.endRun(false, 'Defeat', 'You were overwhelmed.');
              continue;
            }
          }
        }
      }

      if (progress >= 1) {
        attack.ring.destroy();
        attack.halo.destroy();
        continue;
      }

      nextAttacks.push(attack);
    }

    this.shockwaveAttacks = nextAttacks;
  }

  private updateSkillTelegraphs(deltaMs: number): void {
    if (this.skillTelegraphs.length > 0) {
      const nextTelegraphs: typeof this.skillTelegraphs = [];
      for (const telegraph of this.skillTelegraphs) {
        telegraph.elapsedMs += deltaMs;
        if (telegraph.elapsedMs < telegraph.durationMs) {
          nextTelegraphs.push(telegraph);
        }
      }
      this.skillTelegraphs = nextTelegraphs;
    }

    if (this.lineTelegraphTracking.length > 0) {
      const nextLineTelegraphs: typeof this.lineTelegraphTracking = [];
      for (const telegraph of this.lineTelegraphTracking) {
        telegraph.elapsedMs += deltaMs;
        if (telegraph.elapsedMs < telegraph.durationMs) {
          nextLineTelegraphs.push(telegraph);
        }
      }
      this.lineTelegraphTracking = nextLineTelegraphs;
    }
  }

  private updateLineStrikeAttacks(deltaMs: number): void {
    if (this.lineStrikeAttacks.length === 0) {
      return;
    }

    const nextAttacks: typeof this.lineStrikeAttacks = [];

    for (const attack of this.lineStrikeAttacks) {
      attack.elapsedMs += deltaMs;

      if (!attack.hasHitPlayer && this.isPlayerInsideLineAttack(attack.x, attack.y, attack.direction, attack.length, attack.halfWidth)) {
        attack.hasHitPlayer = true;
        const tookDamage = this.player.takeDamage(attack.damage, this.time.now);
        if (tookDamage) {
          this.createBurstCircle(this.player.x, this.player.y, 0xfb7185, 16, 54, 220, 0.85);
          this.showFloatingText(this.player.x, this.player.y - 28, `${attack.damage}`, '#fecdd3', 18);
          if (!this.player.isAlive()) {
            this.lineStrikeAttacks = [];
            this.endRun(false, 'Defeat', 'The Dreadnought broke through your position.');
            return;
          }
        }
      }

      if (attack.elapsedMs < attack.durationMs) {
        nextAttacks.push(attack);
      }
    }

    this.lineStrikeAttacks = nextAttacks;
  }

  private updateEnemyBolts(deltaMs: number): void {
    if (this.enemyBolts.length === 0) {
      return;
    }

    const nextBolts: typeof this.enemyBolts = [];
    const playerRadius = Math.max(14, this.player.width * 0.34);

    for (const bolt of this.enemyBolts) {
      bolt.elapsedMs += deltaMs;
      bolt.orb.x += bolt.vx * (deltaMs / 1000);
      bolt.orb.y += bolt.vy * (deltaMs / 1000);
      bolt.halo.x = bolt.orb.x;
      bolt.halo.y = bolt.orb.y;
      this.syncEnemyBoltSprite(bolt);

      const expired =
        bolt.elapsedMs >= bolt.lifetimeMs ||
        bolt.orb.x < -60 ||
        bolt.orb.x > WORLD_WIDTH + 60 ||
        bolt.orb.y < -60 ||
        bolt.orb.y > WORLD_HEIGHT + 60;

      if (!bolt.hasHitPlayer) {
        const distanceToPlayer = Phaser.Math.Distance.Between(bolt.orb.x, bolt.orb.y, this.player.x, this.player.y);
        if (distanceToPlayer <= playerRadius + bolt.radius) {
          bolt.hasHitPlayer = true;
          const tookDamage = this.player.takeDamage(bolt.damage, this.time.now);
          this.createBurstCircle(bolt.orb.x, bolt.orb.y, bolt.visual.trailColor, 8, 30, 170, 0.8);
          this.destroyEnemyBolt(bolt);

          if (tookDamage) {
            this.cameras.main.shake(85, PLAYER_HIT_SHAKE_INTENSITY * 0.85);
            this.showFloatingText(this.player.x, this.player.y - 26, `${bolt.damage}`, '#fecaca', 17);
            if (!this.player.isAlive()) {
              for (const pendingBolt of this.enemyBolts) {
                if (pendingBolt !== bolt) {
                  this.destroyEnemyBolt(pendingBolt);
                }
              }
              this.enemyBolts = [];
              this.endRun(false, 'Defeat', 'You were picked apart at range.');
              return;
            }
          }

          continue;
        }
      }

      if (expired) {
        this.destroyEnemyBolt(bolt);
        continue;
      }

      nextBolts.push(bolt);
    }

    this.enemyBolts = nextBolts;
  }

  private updateGems(): void {
    if (!this.xpGems?.active) {
      return;
    }

    const gems = this.xpGems.getChildren() as XPGem[];

    for (const gem of gems) {
      gem.update(this.player);
    }
  }

  private updateNeutralShapes(): void {
    if (!this.neutralShapes?.active) {
      return;
    }

    const neutralShapes = this.neutralShapes.getChildren() as NeutralShape[];

    for (const neutralShape of neutralShapes) {
      neutralShape.updatePresentation(this.time.now);
    }
  }

  private trySpawnDangerZone(): void {
    if (this.runElapsedMs < this.nextDangerZoneAtMs || !this.canSpawnDangerZone()) {
      return;
    }

    const center = this.chooseDangerZoneCenter();
    this.dangerZones.push(this.createDangerZone(center.x, center.y));
    this.dangerZoneSpawnCount += 1;
    this.lastDangerZonePhase = 'warning';
    this.nextDangerZoneAtMs = this.runElapsedMs + DANGER_ZONE_COOLDOWN_MS;
  }

  private canSpawnDangerZone(): boolean {
    return (
      this.formationWaveCount > 0 &&
      this.dangerZones.length === 0 &&
      !this.isEnded &&
      !this.isTransitioningToMenu &&
      !this.isManualPaused &&
      !this.isSystemPaused &&
      !this.isLevelingUp &&
      !this.isChoosingTankClass &&
      !this.areNormalSpawnsSuppressed() &&
      !this.activeRunEvent &&
      !this.hasActiveMajorEncounterEnemy()
    );
  }

  private chooseDangerZoneCenter(): Phaser.Math.Vector2 {
    const facing = this.player.getFacingDirection();
    const pressureFromFront = Phaser.Math.Between(0, 100) < 62;
    const angle = pressureFromFront
      ? Math.atan2(facing.y, facing.x) + Phaser.Math.FloatBetween(-0.65, 0.65)
      : Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = Phaser.Math.Between(90, 190);

    return new Phaser.Math.Vector2(
      Phaser.Math.Clamp(this.player.x + Math.cos(angle) * distance, 74, WORLD_WIDTH - 74),
      Phaser.Math.Clamp(this.player.y + Math.sin(angle) * distance, 74, WORLD_HEIGHT - 74),
    );
  }

  private createDangerZone(x: number, y: number): DangerZone {
    const warningVisual = this.add.circle(x, y, DANGER_ZONE_RADIUS, 0xfacc15, 0.11).setDepth(7.2);
    warningVisual.setStrokeStyle(4, 0xfef08a, 0.88);
    const activeVisual = this.add.circle(x, y, DANGER_ZONE_RADIUS, 0xef4444, 0.22).setDepth(7.25);
    activeVisual.setStrokeStyle(5, 0xfca5a5, 0.92);
    activeVisual.setVisible(false);

    return {
      x,
      y,
      radius: DANGER_ZONE_RADIUS,
      warningMs: DANGER_ZONE_WARNING_MS,
      activeMs: DANGER_ZONE_ACTIVE_MS,
      elapsedMs: 0,
      damage: DANGER_ZONE_DAMAGE,
      nextDamageAtMs: DANGER_ZONE_WARNING_MS,
      warningVisual,
      activeVisual,
      phase: 'warning',
    };
  }

  private updateDangerZones(deltaMs: number): void {
    if (this.dangerZones.length === 0) {
      return;
    }

    const nextZones: DangerZone[] = [];

    for (const zone of this.dangerZones) {
      zone.elapsedMs += deltaMs;
      if (zone.phase === 'warning') {
        const warningProgress = Phaser.Math.Clamp(zone.elapsedMs / zone.warningMs, 0, 1);
        zone.warningVisual.setAlpha(0.16 + Math.sin(this.time.now * 0.018) * 0.05);
        zone.warningVisual.setStrokeStyle(4 + Math.round(warningProgress * 2), 0xfef08a, 0.72 + warningProgress * 0.2);

        if (zone.elapsedMs >= zone.warningMs) {
          zone.phase = 'active';
          this.lastDangerZonePhase = 'active';
          zone.warningVisual.setVisible(false);
          zone.activeVisual.setVisible(true);
        }
      }

      if (zone.phase === 'active') {
        const activeElapsed = zone.elapsedMs - zone.warningMs;
        const activeProgress = Phaser.Math.Clamp(activeElapsed / zone.activeMs, 0, 1);
        zone.activeVisual.setAlpha(0.28 - activeProgress * 0.08);
        zone.activeVisual.setStrokeStyle(5, activeProgress < 0.55 ? 0xfca5a5 : 0xffffff, 0.92);
        this.tryApplyDangerZoneDamage(zone);

        if (activeElapsed >= zone.activeMs) {
          this.destroyDangerZone(zone);
          continue;
        }
      }

      nextZones.push(zone);
    }

    this.dangerZones = nextZones;
  }

  private tryApplyDangerZoneDamage(zone: DangerZone): void {
    if (zone.elapsedMs < zone.nextDamageAtMs) {
      return;
    }

    const playerDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, zone.x, zone.y);
    if (playerDistance > zone.radius + this.getPlayerHitRadius() * 0.65) {
      return;
    }

    zone.nextDamageAtMs = zone.elapsedMs + DANGER_ZONE_TICK_MS;
    const tookDamage = this.player.takeDamage(zone.damage, this.time.now);
    if (!tookDamage) {
      return;
    }

    this.cameras.main.shake(90, PLAYER_HIT_SHAKE_INTENSITY);
    this.createBurstCircle(this.player.x, this.player.y, 0xf97316, 12, 38, 180, 0.76);
    this.showFloatingText(this.player.x, this.player.y - 26, `${zone.damage}`, '#fed7aa', 17);
    if (!this.player.isAlive()) {
      this.endRun(false, 'Defeat', 'You stayed in the danger zone.');
    }
  }

  private clearDangerZones(): void {
    for (const zone of this.dangerZones) {
      this.destroyDangerZone(zone);
    }
    this.dangerZones = [];
  }

  private destroyDangerZone(zone: DangerZone): void {
    zone.warningVisual.destroy();
    zone.activeVisual.destroy();
  }

  private updateBreakoutPulse(deltaMs: number): void {
    if (this.breakoutPulseCooldownRemainingMs > 0) {
      this.breakoutPulseCooldownRemainingMs = Math.max(0, this.breakoutPulseCooldownRemainingMs - deltaMs);
    }

    if (this.breakoutPulseProtectionRemainingMs > 0) {
      this.breakoutPulseProtectionRemainingMs = Math.max(0, this.breakoutPulseProtectionRemainingMs - deltaMs);
    }
  }

  private updateActiveMapBuff(deltaMs: number): void {
    if (!this.activeMapBuff) {
      return;
    }

    this.activeMapBuff.remainingMs = Math.max(0, this.activeMapBuff.remainingMs - deltaMs);
    if (this.activeMapBuff.remainingMs <= 0) {
      this.activeMapBuff = null;
    }
  }

  private applyBreakoutPulseKnockback(): void {
    const activeEnemies = ((this.enemies?.getChildren() as Enemy[] | undefined) ?? []).filter(
      (enemy) => enemy.active && enemy.isAlive(),
    );

    for (const enemy of activeEnemies) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (distance > BREAKOUT_PULSE_RADIUS) {
        continue;
      }

      const direction = new Phaser.Math.Vector2(enemy.x - this.player.x, enemy.y - this.player.y);
      if (direction.lengthSq() === 0) {
        direction.set(1, 0);
      }
      direction.normalize();

      const multiplier = enemy.isBoss()
        ? BREAKOUT_PULSE_BOSS_KNOCKBACK_MULTIPLIER
        : enemy.isElite() || enemy.isMiniboss()
          ? BREAKOUT_PULSE_ELITE_KNOCKBACK_MULTIPLIER
          : 1;
      const pushDistance = BREAKOUT_PULSE_KNOCKBACK * multiplier;
      if (pushDistance <= 0) {
        continue;
      }

      const nextX = Phaser.Math.Clamp(enemy.x + direction.x * pushDistance, 36, WORLD_WIDTH - 36);
      const nextY = Phaser.Math.Clamp(enemy.y + direction.y * pushDistance, 36, WORLD_HEIGHT - 36);
      enemy.body.reset(nextX, nextY);
      enemy.setPosition(nextX, nextY);
      enemy.body.setVelocity(direction.x * enemy.getMoveSpeed() * 1.4, direction.y * enemy.getMoveSpeed() * 1.4);
    }
  }

  private createBreakoutPulseVisual(): void {
    const ring = this.add.circle(this.player.x, this.player.y, 32, 0x7dd3fc, 0).setDepth(9.5);
    ring.setStrokeStyle(6, 0xe0f2fe, 0.96);
    const halo = this.add.circle(this.player.x, this.player.y, 46, 0x38bdf8, 0.16).setDepth(9.4);
    halo.setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: [ring, halo],
      radius: BREAKOUT_PULSE_RADIUS,
      alpha: 0,
      duration: 360,
      ease: 'Cubic.Out',
      onComplete: () => {
        ring.destroy();
        halo.destroy();
      },
    });
  }

  private handleProjectileEnemyOverlap(projectile: Projectile, enemy: Enemy): void {
    if (!projectile.active || !enemy.active || this.isEnded) {
      return;
    }

    const enemyX = enemy.x;
    const enemyY = enemy.y;
    const xpValue = getEnemyXpReward(enemy.archetype);
    const wasBoss = enemy.isBoss();
    const wasMiniboss = enemy.isMiniboss();
    const wasElite = enemy.isElite();
    const damage = projectile.getDamage();
    const impactColor = projectile.getVisualColor();
    const impactRadius = projectile.getVisualRadius();
    const shouldDeactivate = projectile.consumeHit();
    const explosionRadius = projectile.getExplosionRadius();
    const explosionDamage = projectile.getExplosionDamage();
    const enemyDied = enemy.takeDamage(damage, { x: projectile.x, y: projectile.y });
    const baseBurstRadius = Math.max(12, impactRadius * 2.2);
    const impactFlashRadius = explosionRadius > 0 ? Math.max(baseBurstRadius, explosionRadius * 0.45) : baseBurstRadius;

    this.createBurstCircle(enemyX, enemyY, impactColor, Math.max(5, impactRadius * 0.7), impactFlashRadius, 90, 0.22);
    this.createBurstCircle(enemyX, enemyY, 0xffffff, Math.max(3, impactRadius * 0.28), Math.max(8, impactRadius * 1.15), 70, 0.18);
    this.spawnEffectSprite('hit-pop', enemyX, enemyY, Math.max(20, impactRadius * 3.2), 130, this.depthForCombatEffect(enemy));
    this.applyCombatImpactResponse(projectile.getWeaponId(), enemy, enemyDied, enemyX, enemyY, impactColor, impactRadius, true);
    if (wasBoss && !enemyDied) {
      this.syncBossPhaseState();
    }

    if (enemyDied) {
      this.showFloatingText(enemyX, enemyY - 16, `${damage}`, wasBoss ? '#fca5a5' : Phaser.Display.Color.IntegerToColor(impactColor).rgba, 18);
      this.createBurstCircle(enemyX, enemyY, wasBoss ? 0xfca5a5 : impactColor, 10, wasBoss ? 58 : Math.max(34, impactRadius * 4), 220, 0.9);
      this.createBurstCircle(enemyX, enemyY, 0xffffff, 6, wasBoss ? 74 : Math.max(26, impactRadius * 2.8), 160, 0.3);
      this.handleEnemyDefeated(enemy, enemyX, enemyY, xpValue, wasBoss, wasMiniboss, wasElite);
    } else if (wasBoss || wasMiniboss || wasElite || damage >= 18) {
      this.showFloatingText(enemyX, enemyY - 16, `${damage}`, wasBoss || wasMiniboss ? '#ffffff' : '#dbeafe', 16);
    }

    if (explosionRadius > 0 && explosionDamage > 0) {
      this.applyProjectileExplosion(enemyX, enemyY, explosionRadius, explosionDamage, enemy, impactColor);
    }

    if (shouldDeactivate) {
      projectile.deactivate();
    }
  }

  private handleProjectileNeutralShapeOverlap(projectile: Projectile, neutralShape: NeutralShape): void {
    if (!projectile.active || !neutralShape.active || !neutralShape.isAlive() || this.isEnded) {
      return;
    }

    const shapeX = neutralShape.x;
    const shapeY = neutralShape.y;
    const damage = projectile.getDamage();
    const xpValue = neutralShape.getXpValue();
    const impactColor = projectile.getVisualColor();
    const impactRadius = projectile.getVisualRadius();
    const shouldDeactivate = projectile.consumeHit();
    const shapeDestroyed = neutralShape.takeDamage(damage, this.time.now);
    const baseBurstRadius = Math.max(12, impactRadius * 2);

    this.createBurstCircle(shapeX, shapeY, impactColor, Math.max(4, impactRadius * 0.55), baseBurstRadius, 80, 0.2);
    this.createBurstCircle(shapeX, shapeY, 0xffffff, Math.max(3, impactRadius * 0.22), Math.max(8, impactRadius), 65, 0.14);
    this.spawnEffectSprite('hit-pop', shapeX, shapeY, Math.max(18, impactRadius * 3), 120, 8.8);

    if (shapeDestroyed) {
      const xpVisual = getXpGemVisual(xpValue);
      this.neutralShapesDestroyed += 1;
      this.showFloatingText(shapeX, shapeY - 18, `+${xpValue} XP`, xpVisual.textColor, 15);
      this.createBurstCircle(shapeX, shapeY, xpVisual.glowColor, 8, 34, 180, 0.72);
      this.createBurstCircle(shapeX, shapeY, 0xffffff, 4, 24, 130, 0.22);
      const gem = new XPGem(this, shapeX, shapeY, xpValue);
      this.xpGems.add(gem);
      neutralShape.destroy();
    } else if (damage >= 18) {
      this.showFloatingText(shapeX, shapeY - 16, `${damage}`, '#e0f2fe', 14);
    }

    if (shouldDeactivate) {
      projectile.deactivate();
    }
  }

  private handlePlayerEnemyOverlap(enemy: Enemy): void {
    if (this.isEnded || this.isLevelingUp || this.isSystemPaused) {
      return;
    }

    if (enemy.isLineStrikeMoving) {
      return;
    }

    const tookDamage = this.player.takeDamage(enemy.contactDamage, this.time.now);

    if (!tookDamage) {
      return;
    }

    this.cameras.main.shake(PLAYER_HIT_SHAKE_DURATION_MS, PLAYER_HIT_SHAKE_INTENSITY);
    this.createBurstCircle(this.player.x, this.player.y, 0xf87171, 12, 36, 180, 0.75);
    this.publishHudState();

    if (!this.player.isAlive()) {
      this.endRun(false, 'Defeat', 'You were overwhelmed.');
    }
  }

  private handleEnemyDefeated(
    enemy: Enemy,
    x: number,
    y: number,
    xpValue: number,
    wasBoss: boolean,
    wasMiniboss: boolean,
    wasElite: boolean,
  ): void {
    this.killCount += 1;
    if (wasElite) {
      this.eliteKillCount += 1;
    }

    const gem = new XPGem(this, x, y, xpValue);
    this.xpGems.add(gem);
    const xpVisual = getXpGemVisual(xpValue);
    this.createBurstCircle(x, y, xpVisual.glowColor, 10, xpVisual.radius * 4.2, 190, xpValue >= 24 ? 0.64 : 0.42);
    this.spawnEffectSprite('enemy-death-puff', x, y, Math.max(34, enemy.archetype.size * 1.25), 220, 8.9);

    const rewardOutcome = this.grantEncounterRewards(enemy, x, y);
    this.handleRunEventEnemyDefeated(enemy);

    if (wasBoss) {
      this.clearBossOwnedSummons();
      this.endRun(true, 'Victory', 'The Behemoth has fallen.');
      return;
    }

    if (wasMiniboss) {
      this.registry.set('run.instructions', 'Miniboss broken. Claim the power spike and keep moving.');
      this.setAlert('objective', 'Miniboss broken', 1600);
      return;
    }

    if (wasElite) {
      if (rewardOutcome.signatureChoicePrimed) {
        this.registry.set('run.instructions', 'Elite defeated. Next level-up includes a signature pick.');
        this.setAlert('objective', 'Signature reward primed', 1600);
      } else {
        this.registry.set('run.instructions', 'Elite defeated. Spend the reward before the next wave arrives.');
        this.setAlert('objective', 'Elite reward claimed', 1400);
      }
    }
  }

  private handleRunEventEnemyDefeated(enemy: Enemy): void {
    const activeEvent = this.activeRunEvent;
    if (!activeEvent) {
      return;
    }

    if (activeEvent.type === 'reward-target' && activeEvent.targetEnemy === enemy) {
      this.resolveRunEventSuccess(activeEvent, 'Reward target broken. Claim the payout and keep moving.');
      return;
    }

    if (activeEvent.type === 'challenge-wave') {
      activeEvent.challengeEnemies = activeEvent.challengeEnemies.filter((trackedEnemy) => trackedEnemy !== enemy && trackedEnemy.active && trackedEnemy.isAlive());
      if (activeEvent.challengeEnemies.length === 0) {
        this.resolveRunEventSuccess(activeEvent, 'Challenge wave cleared before the timer expired.');
      }
      return;
    }

    if (activeEvent.type === 'buff-shrine') {
      activeEvent.pressureEnemies = activeEvent.pressureEnemies.filter((trackedEnemy) => trackedEnemy !== enemy && trackedEnemy.active && trackedEnemy.isAlive());
    }
  }

  private applyProjectileExplosion(
    x: number,
    y: number,
    radius: number,
    damage: number,
    primaryTarget: Enemy,
    color: number,
  ): void {
    const enemies = this.enemies?.getChildren() as Enemy[] | undefined;
    if (!enemies) {
      return;
    }

    this.createBurstCircle(x, y, color, 14, radius, 220, 0.45);

    for (const enemy of enemies) {
      if (!enemy.active || enemy === primaryTarget) {
        continue;
      }

      const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (distance > radius) {
        continue;
      }

      const enemyDied = enemy.takeDamage(damage, { x, y });
      this.createBurstCircle(enemy.x, enemy.y, 0xffffff, 4, 14, 80, 0.16);
      this.applyCombatImpactResponse('shatterbell', enemy, enemyDied, x, y, color, Math.max(8, radius * 0.22), false);
      if (enemy.isBoss() && !enemyDied) {
        this.syncBossPhaseState();
      }
      if (!enemyDied) {
        continue;
      }

      this.handleEnemyDefeated(
        enemy,
        enemy.x,
        enemy.y,
        getEnemyXpReward(enemy.archetype),
        enemy.isBoss(),
        enemy.isMiniboss(),
        enemy.isElite(),
      );
    }
  }

  private grantEncounterRewards(enemy: Enemy, x: number, y: number): { signatureChoicePrimed: boolean } {
    const rewardGold = enemy.getRewardGold();
    const rewardLevelUps = enemy.getRewardLevelUps();
    const rewardMessages: string[] = [];
    let signatureChoicePrimed = false;
    let bonusLevelsGained = 0;

    if (rewardGold > 0) {
      this.goldEarned += rewardGold;
      this.showFloatingText(x, y - 38, `+${rewardGold} gold`, '#fcd34d', 16);
      this.createBurstCircle(x, y, 0xfbbf24, 14, 48, 220, 0.45);
      rewardMessages.push(`+${rewardGold} gold`);
    }

    if (rewardLevelUps > 0) {
      this.pendingLevelUps += rewardLevelUps;
      this.showFloatingText(x, y - 58, rewardLevelUps > 1 ? `+${rewardLevelUps} upgrades` : '+1 upgrade', '#bfdbfe', 18);
      rewardMessages.push(rewardLevelUps > 1 ? `+${rewardLevelUps} upgrades` : '+1 upgrade');

      if (enemy.isElite() && !enemy.isMiniboss() && !this.firstEliteSignatureRewardClaimed) {
        this.guaranteedSignatureChoices += 1;
        this.firstEliteSignatureRewardClaimed = true;
        signatureChoicePrimed = true;
        bonusLevelsGained = this.player.gainExperience(FIRST_ELITE_XP_BONUS);
        this.showFloatingText(x, y - 80, 'Signature pick primed', '#f5d0fe', 18);
        this.showFloatingText(x, y - 102, `+${FIRST_ELITE_XP_BONUS} XP`, '#bfdbfe', 16);
        this.createBurstCircle(x, y, 0xc084fc, 16, 54, 240, 0.42);
        this.createBurstCircle(x, y, 0x60a5fa, 10, 42, 180, 0.32);
        if (bonusLevelsGained > 0) {
          this.handlePlayerLevelsGained(bonusLevelsGained);
        }
        rewardMessages.push('signature pick primed');
        rewardMessages.push(`+${FIRST_ELITE_XP_BONUS} XP`);
      }

      if (enemy.isMiniboss()) {
        this.guaranteedSignatureChoices += 1;

        if (
          shouldQueueBreakthroughChoice({
            upgrades: this.getAvailableUpgradePool(),
            ownedWeaponIds: this.ownedWeaponIds as Iterable<WeaponId>,
            takenUpgradeIds: this.takenUniqueUpgradeIds,
            milestoneConsumed: this.breakthroughMilestoneConsumed,
          })
        ) {
          this.guaranteedBreakthroughChoices += 1;
          this.breakthroughMilestoneConsumed = true;
        }
      }
    }

    if (rewardLevelUps > 0 && !this.isLevelingUp) {
      this.queueLevelUpStart();
    }

    const rewardSummary = rewardMessages.join(' | ');

    if (enemy.isBoss()) {
      this.showRewardToast(`Boss reward secured: ${rewardSummary || 'Victory payout'}`, '#fde68a');
      playCue('boss-reward');
      return { signatureChoicePrimed };
    } else if (enemy.isMiniboss()) {
      this.showRewardToast(`Miniboss reward: ${rewardSummary}`, '#f9a8d4');
      playCue('miniboss-reward');
      return { signatureChoicePrimed };
    } else if (enemy.isElite()) {
      this.showRewardToast(`Elite reward: ${rewardSummary}`, signatureChoicePrimed ? '#f5d0fe' : '#ddd6fe');
      playCue('elite-reward');
      return { signatureChoicePrimed };
    }

    return { signatureChoicePrimed };
  }

  private presentHeroIntro(hero: (typeof HEROES)[keyof typeof HEROES]): void {
    const startingWeapon = WEAPON_DEFINITIONS[hero.startingWeaponId];
    this.registry.set('run.instructions', `${hero.name}: ${hero.passiveLabel}`);
    this.registry.set('run.heroName', hero.name);
    this.registry.set('run.heroPassive', hero.passiveLabel);
    this.setAlert('hero', `${hero.name} ready`, 1300);
    this.showEncounterBanner(hero.name, `${startingWeapon.name} online`, startingWeapon.projectileColor, 1300);
    this.showFloatingText(this.player.x, this.player.y - 78, `${startingWeapon.name} ready`, '#dbeafe', 18);
    playHeroIntroCue(hero, startingWeapon);

    this.time.delayedCall(2600, () => {
      if (!this.isEnded && !this.isLevelingUp && !this.isSystemPaused && !this.isTransitioningToMenu) {
        this.registry.set('run.instructions', '');
      }
    });
  }

  private handleEnemyAttackSignal(enemy: Enemy, signal: EnemyAttackSignal): void {
    switch (signal.type) {
      case 'miniboss-line-telegraph':
        this.registry.set('run.instructions', 'Lane forming. Move aside.');
        this.setAlert('miniboss', 'Charge lane', 800);
        {
          const contract = createMinibossLineAttackContract(signal.length);
          this.showLineAttackTelegraph(signal.x, signal.y, signal.direction, contract.length, contract.visualWidth, 0xfda4af, contract.telegraphMs, 'warning');
          this.lineTelegraphTracking.push({
            kind: contract.kind,
            x: signal.x,
            y: signal.y,
            direction: signal.direction,
            visualLength: contract.length,
            visualWidth: contract.visualWidth,
            damageWidth: contract.damageWidth,
            durationMs: contract.telegraphMs,
            elapsedMs: 0,
          });
        }
        playCue('dash-warning');
        break;
      case 'miniboss-line-execute':
        this.registry.set('run.instructions', 'Line charge. Reposition.');
        this.setAlert('miniboss', 'Charge live', 800);
        this.executeMinibossLineStrike(enemy, signal.x, signal.y, signal.direction, signal.length);
        playCue('miniboss-release');
        break;
      case 'boss-shockwave-telegraph':
        this.registry.set('run.instructions', 'Shockwave charging. Back out.');
        this.setAlert('boss', 'Shockwave charging', 900);
        this.showBossShockwaveTelegraph(signal.x, signal.y, signal.radius, signal.telegraphMs);
        playCue('dash-warning');
        break;
      case 'boss-shockwave-execute':
        this.registry.set('run.instructions', 'Shockwave live. Keep clear.');
        this.setAlert('boss', 'Shockwave live', 900);
        this.spawnBossShockwave(signal.x, signal.y, signal.radius, signal.damage, signal.durationMs, signal.thickness);
        playCue('boss-release');
        break;
      case 'miniboss-volley-telegraph':
        this.registry.set('run.instructions', 'Volley charging. Sidestep.');
        this.setAlert('miniboss', 'Volley charging', 900);
        this.showMinibossVolleyTelegraph(signal.x, signal.y, signal.direction);
        playCue('dash-warning');
        break;
      case 'miniboss-volley-execute':
        this.registry.set('run.instructions', 'Volley live. Keep moving.');
        this.setAlert('miniboss', 'Volley live', 900);
        this.executeMinibossVolley(signal.x, signal.y, signal.direction);
        playCue('miniboss-release');
        break;
      case 'ranged-shot':
        this.spawnEnemyBolt(signal.x, signal.y, signal.direction, signal.speed, signal.damage, signal.color, signal.radius);
        break;
    }
  }

  private executeMinibossLineStrike(
    enemy: Enemy,
    x: number,
    y: number,
    direction: { x: number; y: number },
    length: number,
  ): void {
    const contract = createMinibossLineAttackContract(length);
    this.showLineAttackTelegraph(x, y, direction, contract.length, contract.visualWidth, 0xfb7185, contract.activeVisualMs, 'active');
    this.createBurstCircle(x, y, 0xfb7185, 22, 70, 260, 0.75);
    this.cameras.main.shake(100, 0.0022);
    this.lineStrikeAttacks.push({
      kind: contract.kind,
      x,
      y,
      direction,
      length: contract.length,
      visualWidth: contract.visualWidth,
      damageWidth: contract.damageWidth,
      halfWidth: contract.halfWidth,
      damage: Math.max(18, enemy.contactDamage - 4),
      durationMs: contract.damageActiveMs,
      activeVisualMs: contract.activeVisualMs,
      elapsedMs: 0,
      hasHitPlayer: false,
    });
  }

  private spawnEnemyBolt(
    x: number,
    y: number,
    direction: { x: number; y: number },
    speed: number,
    damage: number,
    color: number,
    radius: number,
  ): void {
    const visual = getEnemyProjectileVisual(color);
    const orb = this.add.circle(x, y, radius, visual.fillColor, 0.96).setDepth(8.5);
    orb.setStrokeStyle(3, visual.strokeColor, 0.98);
    const halo = this.add.circle(x, y, radius * 2.05, visual.trailColor, 0.2).setDepth(8.4);
    halo.setStrokeStyle(2, visual.dangerColor ?? visual.fillColor, 0.55);
    const sprite = this.createEnemyBoltSprite(x, y, direction, radius);
    if (sprite) {
      orb.setAlpha(0);
    }
    this.createBurstCircle(x, y, visual.trailColor, Math.max(5, radius * 0.9), Math.max(14, radius * 2.8), 120, 0.38);

    this.enemyBolts.push({
      orb,
      halo,
      sprite,
      vx: direction.x * speed,
      vy: direction.y * speed,
      radius,
      damage,
      elapsedMs: 0,
      lifetimeMs: 2600,
      hasHitPlayer: false,
      visual,
    });
  }

  private createEnemyBoltSprite(
    x: number,
    y: number,
    direction: { x: number; y: number },
    radius: number,
  ): Phaser.GameObjects.Image | undefined {
    const slot = getProjectileSpriteAssetSlot('enemy-shot');
    if (!shouldUseVisualAsset(this, 'projectileSprites', slot)) {
      return undefined;
    }

    const displaySize = resolveEnemyProjectileVisualDiameter(radius);
    return this.add
      .image(x, y, slot.key)
      .setDepth(8.55)
      .setDisplaySize(displaySize, displaySize)
      .setAlpha(0.96)
      .setRotation(Math.atan2(direction.y, direction.x))
      .setBlendMode(Phaser.BlendModes.ADD);
  }

  private syncEnemyBoltSprite(bolt: EnemyBolt): void {
    if (!bolt.sprite) {
      return;
    }

    bolt.sprite.setPosition(bolt.orb.x, bolt.orb.y).setVisible(bolt.orb.visible && bolt.orb.active);
  }

  private destroyEnemyBolt(bolt: EnemyBolt): void {
    bolt.orb.destroy();
    bolt.halo.destroy();
    bolt.sprite?.destroy();
  }

  private showLineAttackTelegraph(
    x: number,
    y: number,
    direction: { x: number; y: number },
    length: number,
    width: number,
    color: number,
    durationMs: number,
    phase: 'warning' | 'active',
  ): void {
    const centerX = x + direction.x * (length / 2);
    const centerY = y + direction.y * (length / 2);
    const angle = Math.atan2(direction.y, direction.x);
    const endX = x + direction.x * length;
    const endY = y + direction.y * length;

    if (phase === 'warning') {
      const aimStem = this.add
        .rectangle(centerX, centerY, length, Math.max(2, width * 0.04), color, 0.52)
        .setDepth(8);
      aimStem.setRotation(angle);
      aimStem.setStrokeStyle(1, color, 0.55);

      const endCap = this.add.circle(endX, endY, Math.max(4, width * 0.12), color, 0).setDepth(8);
      endCap.setStrokeStyle(2, color, 0.7);

      this.tweens.add({
        targets: [aimStem, endCap],
        alpha: '+=0.2',
        duration: Math.max(120, durationMs - 120),
        ease: 'Sine.InOut',
        yoyo: true,
      });

      this.tweens.add({
        targets: [aimStem, endCap],
        alpha: 0,
        duration: durationMs,
        ease: 'Quad.Out',
        onComplete: () => {
          aimStem.destroy();
          endCap.destroy();
        },
      });
    } else {
      const lane = this.add.rectangle(centerX, centerY, length, width, color, 0.62).setDepth(8);
      lane.setRotation(angle);
      lane.setStrokeStyle(3, color, 1);

      const laneCore = this.add
        .rectangle(centerX, centerY, length, Math.max(10, width * 0.26), 0xffffff, 0.88)
        .setDepth(8);
      laneCore.setRotation(angle);

      const upperEdge = this.add.rectangle(centerX, centerY - width / 2, length, 3, color, 1).setDepth(8);
      upperEdge.setRotation(angle);
      const lowerEdge = this.add.rectangle(centerX, centerY + width / 2, length, 3, color, 1).setDepth(8);
      lowerEdge.setRotation(angle);

      const impactCap = this.add.circle(endX, endY, width * 0.38, color, 0.3).setDepth(8);
      impactCap.setStrokeStyle(3, 0xffffff, 1);

      this.tweens.add({
        targets: [lane, laneCore, upperEdge, lowerEdge, impactCap],
        alpha: 0,
        duration: durationMs,
        ease: 'Quad.Out',
        onComplete: () => {
          lane.destroy();
          laneCore.destroy();
          upperEdge.destroy();
          lowerEdge.destroy();
          impactCap.destroy();
        },
      });
    }
  }

  private showBossShockwaveTelegraph(x: number, y: number, radius: number, durationMs = createBossShockwaveContract(this.bossPhase).telegraphMs): void {
    const warningCore = this.add.circle(x, y, 48, 0xfca5a5, 0.14).setDepth(8);
    warningCore.setBlendMode(Phaser.BlendModes.ADD);
    const warning = this.add.circle(x, y, radius * 0.32, 0xfca5a5, 0.06).setDepth(8);
    warning.setStrokeStyle(4, 0xfca5a5, 0.98);
    const outerEdge = this.add.circle(x, y, radius * 0.32, 0xffffff, 0).setDepth(8);
    outerEdge.setStrokeStyle(2, 0xffffff, 0.95);
    this.skillTelegraphs.push({
      kind: 'boss-shockwave',
      x,
      y,
      visualRadius: radius,
      damageRadius: radius,
      durationMs,
      elapsedMs: 0,
    });

    this.tweens.add({
      targets: [warning, outerEdge],
      radius,
      alpha: 0,
      duration: durationMs,
      ease: 'Cubic.Out',
      onComplete: () => {
        warning.destroy();
        outerEdge.destroy();
      },
    });

    this.tweens.add({
      targets: warningCore,
      scale: 2.4,
      alpha: 0,
      duration: durationMs,
      ease: 'Quad.Out',
      onComplete: () => warningCore.destroy(),
    });
  }

  private spawnBossShockwave(
    x: number,
    y: number,
    radius: number,
    damage: number,
    durationMs = createBossShockwaveContract(this.bossPhase).damageActiveMs,
    thickness = createBossShockwaveContract(this.bossPhase).thickness,
  ): void {
    const ring = this.add.circle(x, y, 52, 0xfca5a5, 0).setDepth(8);
    ring.setStrokeStyle(Math.max(8, thickness - 2), 0xffffff, 0.98);
    const halo = this.add.circle(x, y, 52, 0xfca5a5, 0.12).setDepth(7);
    halo.setBlendMode(Phaser.BlendModes.ADD);
    this.createBurstCircle(x, y, 0xfca5a5, 28, 80, 260, 0.65);
    this.cameras.main.flash(120, 255, 170, 170, false);

    this.shockwaveAttacks.push({
      ring,
      halo,
      x,
      y,
      maxRadius: radius,
      currentRadius: 52,
      durationMs,
      activeVisualMs: durationMs,
      elapsedMs: 0,
      thickness,
      damage,
      hasHitPlayer: false,
    });
  }

  private showMinibossVolleyTelegraph(x: number, y: number, direction: { x: number; y: number }): void {
    const contract = createMinibossVolleyContract();
    const warningLaneWidth = 12;
    this.skillTelegraphs.push({
      kind: 'miniboss-volley',
      x,
      y,
      visualRadius: 0,
      damageRadius: 0,
      durationMs: contract.telegraphMs,
      elapsedMs: 0,
      laneLength: contract.laneLength,
      laneWidth: warningLaneWidth,
    });

    const baseAngle = Math.atan2(direction.y, direction.x);
    const startAngle = baseAngle - Phaser.Math.DegToRad(contract.spreadDegrees / 2);
    const step =
      contract.laneCount <= 1 ? 0 : Phaser.Math.DegToRad(contract.spreadDegrees / (contract.laneCount - 1));

    for (let index = 0; index < contract.laneCount; index += 1) {
      const angle = startAngle + step * index;
      this.showLineAttackTelegraph(
        x,
        y,
        { x: Math.cos(angle), y: Math.sin(angle) },
        contract.laneLength,
        warningLaneWidth,
        0xfef08a,
        contract.telegraphMs,
        'warning',
      );
    }
  }

  private executeMinibossVolley(x: number, y: number, direction: { x: number; y: number }): void {
    const contract = createMinibossVolleyContract();
    const baseAngle = Math.atan2(direction.y, direction.x);
    const startAngle = baseAngle - Phaser.Math.DegToRad(contract.spreadDegrees / 2);
    const step =
      contract.laneCount <= 1 ? 0 : Phaser.Math.DegToRad(contract.spreadDegrees / (contract.laneCount - 1));

    const lanes: (typeof this.volleyAttacks)[number]['lanes'] = [];
    for (let index = 0; index < contract.laneCount; index += 1) {
      const angle = startAngle + step * index;
      const dir = { x: Math.cos(angle), y: Math.sin(angle) };
      this.showLineAttackTelegraph(x, y, dir, contract.laneLength, contract.laneVisualWidth, 0xfef08a, contract.activeMs, 'active');
      lanes.push({
        x,
        y,
        direction: dir,
        length: contract.laneLength,
        halfWidth: contract.laneHalfWidth,
        visualWidth: contract.laneVisualWidth,
      });
    }

    this.createBurstCircle(x, y, 0xfef08a, 22, 66, 240, 0.76);
    this.cameras.main.shake(90, 0.0018);
    this.volleyAttacks.push({
      kind: 'miniboss-volley',
      lanes,
      damage: contract.damage,
      durationMs: contract.activeMs,
      activeVisualMs: contract.activeMs,
      elapsedMs: 0,
      hasHitPlayer: false,
    });
  }

  private updateVolleyAttacks(deltaMs: number): void {
    if (this.volleyAttacks.length === 0) {
      return;
    }

    const nextAttacks: typeof this.volleyAttacks = [];

    for (const volley of this.volleyAttacks) {
      volley.elapsedMs += deltaMs;

      if (!volley.hasHitPlayer) {
        for (const lane of volley.lanes) {
          if (this.isPlayerInsideLineAttack(lane.x, lane.y, lane.direction, lane.length, lane.halfWidth)) {
            volley.hasHitPlayer = true;
            const tookDamage = this.player.takeDamage(volley.damage, this.time.now);
            if (tookDamage) {
              this.createBurstCircle(this.player.x, this.player.y, 0xfef08a, 14, 46, 220, 0.82);
              this.showFloatingText(this.player.x, this.player.y - 28, `${volley.damage}`, '#fef9c3', 18);
              if (!this.player.isAlive()) {
                this.volleyAttacks = [];
                this.endRun(false, 'Defeat', 'The Dreadnought swept the field.');
                return;
              }
            }
            break;
          }
        }
      }

      if (volley.elapsedMs < volley.durationMs) {
        nextAttacks.push(volley);
      }
    }

    this.volleyAttacks = nextAttacks;
  }

  private isPlayerInsideLineAttack(
    originX: number,
    originY: number,
    direction: { x: number; y: number },
    length: number,
    halfWidth: number,
  ): boolean {
    const relativeX = this.player.x - originX;
    const relativeY = this.player.y - originY;
    const along = relativeX * direction.x + relativeY * direction.y;
    const perpendicular = Math.abs(relativeX * -direction.y + relativeY * direction.x);
    const playerHitRadius = this.getPlayerHitRadius();

    return along >= -playerHitRadius && along <= length + playerHitRadius && perpendicular <= halfWidth + playerHitRadius;
  }

  private doesShockwaveHitPlayer(
    attack: (typeof this.shockwaveAttacks)[number],
    previousRadius: number,
  ): boolean {
    const playerDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, attack.x, attack.y);
    const playerHitRadius = this.getPlayerHitRadius();
    const minimumAttackRadius = Math.min(previousRadius, attack.currentRadius) - attack.thickness;
    const maximumAttackRadius = Math.max(previousRadius, attack.currentRadius) + attack.thickness;

    return playerDistance + playerHitRadius >= minimumAttackRadius && playerDistance - playerHitRadius <= maximumAttackRadius;
  }

  private getPlayerHitRadius(): number {
    const playerBody = this.player.body;
    return Math.max(playerBody.halfWidth ?? playerBody.width / 2, playerBody.halfHeight ?? playerBody.height / 2);
  }

  private collectXPGem(gem: XPGem): void {
    if (!gem.active || this.isLevelingUp || this.isEnded || this.isSystemPaused) {
      return;
    }

    const gemValue = gem.getValue();
    gem.playCollectFeedback();
    this.createBurstCircle(gem.x, gem.y, gem.getGlowColor(), 8, 26, 150, 0.9);
    this.createBurstCircle(this.player.x, this.player.y, gem.getFillColor(), 6, 24, 130, 0.2);
    this.spawnEffectSprite('xp-collect', gem.x, gem.y, Math.max(22, getXpGemVisual(gemValue).radius * 2.6), 170, 9.2);
    if (gemValue >= 8) {
      this.showFloatingText(this.player.x, this.player.y - 22, `+${gemValue} XP`, getXpGemVisual(gemValue).textColor, 14);
    }
    const levelsGained = this.player.gainExperience(gemValue);
    gem.destroy();

    if (levelsGained > 0) {
      this.handlePlayerLevelsGained(levelsGained);
    }

    this.publishHudState();
  }

  private handlePlayerLevelsGained(levelsGained: number): void {
    if (levelsGained <= 0) {
      return;
    }

    this.pendingLevelUps += levelsGained;
    this.tankStats.grantPoints(levelsGained);
    this.queueTankClassChoiceIfEligible();
    this.queueLevelUpStart();
  }

  private queueTankClassChoiceIfEligible(): void {
    if (!this.shouldQueueTankClassChoice()) {
      return;
    }

    this.tankClassChoiceStartQueued = true;
  }

  private shouldQueueTankClassChoice(): boolean {
    return (
      !this.isChoosingTankClass &&
      !this.tankClassChoiceConsumed &&
      this.currentTankClassId === BASIC_TANK_CLASS_ID &&
      this.player.getLevel() >= TANK_CLASS_EVOLUTION_LEVEL
    );
  }

  private getAvailableTankClassChoices(): TankClassDefinition[] {
    return getAvailableTankClassChoices({
      level: this.isTankClassChoiceForced ? TANK_CLASS_EVOLUTION_LEVEL : this.player.getLevel(),
      currentClassId: this.currentTankClassId,
      classChoiceConsumed: this.tankClassChoiceConsumed,
    });
  }

  private beginTankClassChoice(force = false): void {
    this.isTankClassChoiceForced = force;
    const choices = this.getAvailableTankClassChoices();
    if (choices.length === 0 || this.isChoosingTankClass || this.isEnded) {
      this.isTankClassChoiceForced = false;
      return;
    }

    this.isChoosingTankClass = true;
    this.pauseGameplaySystems('Choose a tank class branch.');
    this.cameras.main.flash(LEVEL_UP_FLASH_MS, 125, 211, 252, false);
    this.createBurstCircle(this.player.x, this.player.y, 0x38bdf8, 18, 84, 260, 0.62);
    this.showFloatingText(this.player.x, this.player.y - 60, 'EVOLUTION READY', '#bae6fd', 24);
    this.registry.set('run.classChoiceActive', true);
    this.registry.set('run.classChoiceAvailable', true);
    this.registry.set('run.classChoiceChoices', choices);
    this.registry.set('run.instructions', 'Choose a tank class branch.');
  }

  private beginLevelUp(): void {
    if (this.isLevelingUp || this.pendingLevelUps <= 0 || this.isEnded) {
      return;
    }

    const presented = this.presentLevelUpChoices();
    if (!presented) {
      return;
    }

    this.isLevelingUp = true;
    this.pauseGameplaySystems();
    this.cameras.main.flash(LEVEL_UP_FLASH_MS, 255, 230, 130, false);
    this.createBurstCircle(this.player.x, this.player.y, 0xfde68a, 18, 82, 260, 0.95);
    this.spawnEffectSprite('level-up-burst', this.player.x, this.player.y, 82, 260, 9.1);
    this.showFloatingText(this.player.x, this.player.y - 56, 'LEVEL UP', '#fde68a', 24);
  }

  private queueLevelUpStart(): void {
    if (this.pendingLevelUps <= 0 || this.isLevelingUp || this.isEnded) {
      return;
    }

    this.levelUpStartQueued = true;
  }

  private presentLevelUpChoices(): boolean {
    const levelUpMode: UpgradeChoiceMode = this.guaranteedBreakthroughChoices > 0 ? 'breakthrough' : 'normal';
    const forceSignature = levelUpMode === 'breakthrough' || this.guaranteedSignatureChoices > 0;
    const choices = buildLevelUpChoices({
      upgrades: this.getAvailableUpgradePool(),
      ownedWeaponIds: Array.from(this.ownedWeaponIds) as WeaponId[],
      takenUpgradeIds: this.takenUniqueUpgradeIds,
      forceSignature,
      preferWeaponDirection: this.ownedWeaponIds.size === 1,
      mode: levelUpMode,
      shuffle: <T>(items: T[]): T[] => Phaser.Utils.Array.Shuffle(items),
    });

    if (choices.length === 0) {
      this.pendingLevelUps = Math.max(0, this.pendingLevelUps - 1);
      this.isLevelingUp = false;
      this.isResolvingLevelUpChoice = false;
      this.levelUpRemainingMs = 0;
      this.registry.set('run.levelUpActive', false);
      this.registry.set('run.levelUpMode', 'normal');
      this.registry.set('run.levelUpChoices', []);
      this.registry.set('run.levelUpChoiceCount', 0);
      this.registry.set('run.levelUpRemainingMs', 0);
      this.registry.set('run.upgradePoolExhausted', true);
      this.registry.set('run.instructions', '');
      this.showRewardToast('Upgrade pool empty', '#bfdbfe');
      if (!this.isSystemPaused) {
        this.resumeGameplaySystems('');
      }
      if (this.pendingLevelUps > 0) {
        this.queueLevelUpStart();
      }
      return false;
    }

    if (levelUpMode === 'breakthrough') {
      this.guaranteedBreakthroughChoices = Math.max(0, this.guaranteedBreakthroughChoices - 1);
    }

    if (forceSignature) {
      this.guaranteedSignatureChoices = Math.max(0, this.guaranteedSignatureChoices - 1);
    }

    this.isResolvingLevelUpChoice = false;
    this.levelUpRemainingMs = beginLevelUpCountdown();
    this.registry.set('run.levelUpActive', true);
    this.registry.set('run.levelUpMode', levelUpMode);
    this.registry.set('run.levelUpChoices', choices);
    this.registry.set('run.levelUpChoiceCount', choices.length);
    this.registry.set('run.levelUpRemainingMs', this.levelUpRemainingMs);
    this.registry.set('run.upgradePoolExhausted', false);
    this.registry.set('run.instructions', 'Choose an upgrade. Auto-pick starts in 15 seconds.');
    return true;
  }

  private updateLevelUpCountdown(deltaMs: number): void {
    const nextCountdown = tickLevelUpCountdown(this.levelUpRemainingMs, deltaMs, true);
    this.levelUpRemainingMs = nextCountdown.remainingMs;
    this.registry.set('run.levelUpRemainingMs', this.levelUpRemainingMs);

    if (nextCountdown.expired && !this.isResolvingLevelUpChoice) {
      this.autoPickLevelUp();
    }
  }

  private autoPickLevelUp(): void {
    const choices = (this.registry.get('run.levelUpChoices') ?? []) as UpgradeDefinition[];
    const randomIndex = chooseRandomValidIndex(choices);

    if (randomIndex === null) {
      this.finishLevelUpSelection();
      return;
    }

    this.selectLevelUp(randomIndex);
  }

  private finishLevelUpSelection(overlayPointer?: ActivePointerLike): void {
    this.isLevelingUp = false;
    this.isResolvingLevelUpChoice = false;
    this.levelUpRemainingMs = 0;
    this.registry.set('run.levelUpActive', false);
    this.registry.set('run.levelUpMode', 'normal');
    this.registry.set('run.levelUpChoices', []);
    this.registry.set('run.levelUpChoiceCount', 0);
    this.registry.set('run.levelUpRemainingMs', 0);
    this.registry.set('run.upgradePoolExhausted', false);
    this.registry.set('run.instructions', '');

    if (!this.isSystemPaused) {
      this.resumeGameplaySystems('', overlayPointer);
    }

    this.setAlert('objective', 'Back in', 900);
    this.publishHudState();
  }

  private getAvailableUpgradePool(): UpgradeDefinition[] {
    return UPGRADE_POOL.filter((upgrade) => {
      if (this.takenUniqueUpgradeIds.has(upgrade.id)) {
        return false;
      }

      switch (upgrade.id) {
        case 'unlock-twin-fangs':
          return !this.ownedWeaponIds.has('twin-fangs');
        case 'unlock-ember-lance':
          return !this.ownedWeaponIds.has('ember-lance');
        case 'unlock-bloom-cannon':
          return !this.ownedWeaponIds.has('bloom-cannon');
        case 'unlock-phase-disc':
          return !this.ownedWeaponIds.has('phase-disc');
        case 'unlock-sunwheel':
          return !this.ownedWeaponIds.has('sunwheel');
        case 'unlock-shatterbell':
          return !this.ownedWeaponIds.has('shatterbell');
        default:
          return true;
      }
    });
  }

  private applyUpgrade(upgradeId: UpgradeId): void {
    const upgrade = findUpgradeDefinitionById(upgradeId);
    if (upgrade?.kind === 'signature' || upgrade?.kind === 'branch') {
      this.applyWeaponUpgrade(upgrade);
      return;
    }

    switch (upgradeId) {
      case 'vitality':
        this.applyHpRegenBonus(VITALITY_REGEN_PER_SECOND);
        break;
      case 'swiftness':
        this.player.addMoveSpeed(SWIFTNESS_MOVE_SPEED_BONUS);
        break;
      case 'power':
        this.applyWeaponDamageBonus(POWER_DAMAGE_BONUS);
        break;
      case 'rapid-fire':
        this.applyWeaponCooldownReduction(RAPID_FIRE_COOLDOWN_REDUCTION_MS);
        break;
      case 'velocity':
        this.applyProjectileSpeedBonus(VELOCITY_PROJECTILE_SPEED_BONUS);
        break;
      case 'magnet':
        this.player.addPickupRange(MAGNET_PICKUP_RANGE_BONUS);
        break;
      case 'reach':
        this.applyWeaponRangeBonus(REACH_RANGE_BONUS);
        break;
      case 'unlock-twin-fangs':
        this.registerWeapon(WEAPON_DEFINITIONS['twin-fangs'], true);
        break;
      case 'unlock-ember-lance':
        this.registerWeapon(WEAPON_DEFINITIONS['ember-lance'], true);
        break;
      case 'unlock-bloom-cannon':
        this.registerWeapon(WEAPON_DEFINITIONS['bloom-cannon'], true);
        break;
      case 'unlock-phase-disc':
        this.registerWeapon(WEAPON_DEFINITIONS['phase-disc'], true);
        break;
      case 'unlock-sunwheel':
        this.registerWeapon(WEAPON_DEFINITIONS.sunwheel, true);
        break;
      case 'unlock-shatterbell':
        this.registerWeapon(WEAPON_DEFINITIONS.shatterbell, true);
        break;
    }
  }

  private applyWeaponUpgrade(upgrade: UpgradeDefinition): void {
    if (!upgrade.requiresWeaponId || !upgrade.weaponStatPatch) {
      return;
    }

    const weapon = this.weapons.find((entry) => entry.getId() === upgrade.requiresWeaponId);
    if (!weapon) {
      return;
    }

    weapon.applyStatPatch(upgrade.weaponStatPatch);
    this.takenUniqueUpgradeIds.add(upgrade.id);
  }

  private applyTankStatSpend(statId: TankStatId, effectDelta: number): void {
    switch (statId) {
      case 'bulletDamage':
        this.applyWeaponDamageBonus(effectDelta);
        break;
      case 'reload':
        this.applyWeaponCooldownReduction(effectDelta);
        break;
      case 'moveSpeed':
        this.player.addMoveSpeed(effectDelta);
        break;
      case 'hpRegen':
        this.applyHpRegenBonus(effectDelta);
        break;
    }
  }

  private applyHpRegenBonus(amountPerSecond: number): void {
    this.runHpRegenPerSecond += amountPerSecond;
    this.player.addHpRegenPerSecond(amountPerSecond);
  }

  private applyTankClass(definition: TankClassDefinition): void {
    this.currentTankClassId = definition.id;
    this.currentTankClass = definition;
    this.player.applyTankClassVisualIdentity(definition.visual);

    for (const weapon of this.weapons) {
      weapon.applyStatPatch(definition.weaponPatch);
    }

    this.showFloatingText(this.player.x, this.player.y - 86, `${definition.title} class`, '#bae6fd', 20);
    this.createBurstCircle(this.player.x, this.player.y, definition.visual.turretColor, 18, 72, 240, 0.72);
    this.cameras.main.flash(140, 125, 211, 252, false);
    playCue('upgrade-confirm');
  }

  private showTankStatSelectionFeedback(statId: TankStatId, nextLevel: number): void {
    const definition = getTankStatDefinition(statId);
    const palette: Record<TankStatId, { color: string; burstColor: number }> = {
      bulletDamage: { color: '#fde68a', burstColor: 0xf59e0b },
      reload: { color: '#99f6e4', burstColor: 0x14b8a6 },
      moveSpeed: { color: '#bfdbfe', burstColor: 0x38bdf8 },
      hpRegen: { color: '#bbf7d0', burstColor: 0x22c55e },
    };
    const statPalette = palette[statId];

    this.showFloatingText(this.player.x, this.player.y - 78, `${definition.shortLabel} ${nextLevel}/${definition.maxLevel}`, statPalette.color, 17);
    this.createBurstCircle(this.player.x, this.player.y, statPalette.burstColor, 12, 46, 180, 0.48);
    playCue('upgrade-confirm');
  }

  private showUpgradeSelectionFeedback(upgrade: UpgradeDefinition): void {
    const presentation: Record<
      UpgradeId,
      { text: string; color: string; burstColor: number; radius: number }
    > = {
      vitality: { text: 'Vitality +REG', color: '#bbf7d0', burstColor: 0x22c55e, radius: 54 },
      swiftness: { text: 'Swiftness +SPD', color: '#bfdbfe', burstColor: 0x60a5fa, radius: 56 },
      power: { text: 'Power +DMG', color: '#fde68a', burstColor: 0xf59e0b, radius: 60 },
      'rapid-fire': { text: 'Rapid Fire online', color: '#99f6e4', burstColor: 0x14b8a6, radius: 58 },
      velocity: { text: 'Velocity +VEL', color: '#ddd6fe', burstColor: 0xa78bfa, radius: 58 },
      magnet: { text: 'Magnet +MAG', color: '#bbf7d0', burstColor: 0x22c55e, radius: 56 },
      reach: { text: 'Reach +RNG', color: '#bfdbfe', burstColor: 0x38bdf8, radius: 58 },
      'unlock-twin-fangs': { text: 'Twin Fangs online', color: '#dbeafe', burstColor: 0x7dd3fc, radius: 0 },
      'unlock-ember-lance': { text: 'Ember Lance online', color: '#ffe4e6', burstColor: 0xfb7185, radius: 0 },
      'unlock-bloom-cannon': { text: 'Bloom Cannon online', color: '#dcfce7', burstColor: 0x86efac, radius: 0 },
      'unlock-phase-disc': { text: 'Phase Disc online', color: '#f3e8ff', burstColor: 0xc084fc, radius: 0 },
      'unlock-sunwheel': { text: 'Sunwheel online', color: '#fef3c7', burstColor: 0xfbbf24, radius: 0 },
      'unlock-shatterbell': { text: 'Shatterbell online', color: '#cffafe', burstColor: 0x67e8f9, radius: 0 },
      'signature-arc-bolt-volt-volley': { text: 'Volt Volley primed', color: '#fef08a', burstColor: 0xfacc15, radius: 64 },
      'signature-twin-fangs-ripper-line': { text: 'Ripper Line primed', color: '#dbeafe', burstColor: 0x7dd3fc, radius: 62 },
      'signature-ember-lance-sundering-tip': { text: 'Sundering Tip primed', color: '#ffe4e6', burstColor: 0xfb7185, radius: 66 },
      'signature-bloom-cannon-bramble-fan': { text: 'Bramble Fan primed', color: '#dcfce7', burstColor: 0x86efac, radius: 64 },
      'signature-phase-disc-rift-array': { text: 'Rift Array primed', color: '#f3e8ff', burstColor: 0xc084fc, radius: 66 },
      'signature-sunwheel-corona-lattice': { text: 'Corona Lattice primed', color: '#fef3c7', burstColor: 0xfbbf24, radius: 68 },
      'signature-shatterbell-aftershock': { text: 'Aftershock primed', color: '#cffafe', burstColor: 0x67e8f9, radius: 68 },
      'branch-arc-bolt-lanebreaker': { text: 'Lanebreaker online', color: '#fef08a', burstColor: 0xfacc15, radius: 66 },
      'branch-twin-fangs-serrated-stream': { text: 'Serrated Stream online', color: '#dbeafe', burstColor: 0x7dd3fc, radius: 64 },
      'branch-phase-disc-deep-cut': { text: 'Deep Cut online', color: '#f3e8ff', burstColor: 0xc084fc, radius: 68 },
      'branch-sunwheel-outer-ring': { text: 'Outer Ring online', color: '#fef3c7', burstColor: 0xfbbf24, radius: 70 },
    };

    const feedback = presentation[upgrade.id];
    if (!feedback) {
      return;
    }

    if (feedback.radius > 0) {
      this.showFloatingText(this.player.x, this.player.y - 82, feedback.text, feedback.color, 18);
      this.createBurstCircle(this.player.x, this.player.y, feedback.burstColor, 16, feedback.radius, 240, 0.78);
      this.cameras.main.shake(70, 0.0012);
    }

    playCue('upgrade-confirm');
  }

  private applyWeaponDamageBonus(amount: number): void {
    this.globalWeaponDamageBonus += amount;
    for (const weapon of this.weapons) {
      weapon.addDamage(amount);
    }
  }

  private applyWeaponCooldownReduction(amount: number): void {
    this.globalWeaponCooldownReduction += amount;
    for (const weapon of this.weapons) {
      weapon.reduceCooldown(amount);
    }
  }

  private applyProjectileSpeedBonus(amount: number): void {
    this.globalProjectileSpeedBonus += amount;
    for (const weapon of this.weapons) {
      weapon.addProjectileSpeed(amount);
    }
  }

  private applyWeaponRangeBonus(amount: number): void {
    this.globalWeaponRangeBonus += amount;
    for (const weapon of this.weapons) {
      weapon.addRange(amount);
    }
  }

  private applyWeaponModifiersTo(weapon: AutoFireWeapon): void {
    if (this.globalWeaponDamageBonus !== 0) {
      weapon.addDamage(this.globalWeaponDamageBonus);
    }

    if (this.globalWeaponCooldownReduction !== 0) {
      weapon.reduceCooldown(this.globalWeaponCooldownReduction);
    }

    if (this.globalProjectileSpeedBonus !== 0) {
      weapon.addProjectileSpeed(this.globalProjectileSpeedBonus);
    }

    if (this.globalWeaponRangeBonus !== 0) {
      weapon.addRange(this.globalWeaponRangeBonus);
    }
  }

  private refreshSystemPauseState(): void {
    if (this.isEnded || this.isTransitioningToMenu) {
      return;
    }

    const shouldPause = document.hidden || !document.hasFocus();
    if (shouldPause === this.isSystemPaused) {
      return;
    }

    this.isSystemPaused = shouldPause;

    if (shouldPause) {
      const mobileCopy = this.shouldUseMobileCopy();
      const message = this.isChoosingTankClass
        ? mobileCopy
          ? 'Class choice paused.'
          : 'Tab inactive. Class choice paused.'
        : this.isLevelingUp
          ? mobileCopy
            ? 'Upgrade choice paused.'
            : 'Tab inactive. Upgrade choice paused.'
          : mobileCopy
            ? 'Run paused.'
            : 'Tab inactive. Run paused.';
      this.pauseGameplaySystems(message);
    } else if (this.isManualPaused) {
      this.pauseGameplaySystems();
    } else if (this.isChoosingTankClass) {
      this.registry.set('run.instructions', 'Choose a tank class branch.');
    } else if (this.isLevelingUp) {
      this.registry.set('run.instructions', 'Choose an upgrade. Auto-pick starts in 15 seconds.');
    } else {
      this.registry.set('run.instructions', '');
      this.resumeGameplaySystems();
    }

    this.publishHudState();
  }

  private shouldUseMobileCopy(): boolean {
    const viewportWidth = window.innerWidth || this.scale.displaySize.width;
    const viewportHeight = window.innerHeight || this.scale.displaySize.height;
    return viewportWidth <= 960 || viewportHeight <= 540;
  }

  private pauseGameplaySystems(instructionText?: string): void {
    this.movementInput?.suspendForOverlay();

    if (this.player?.active) {
      this.player.move(new Phaser.Math.Vector2(0, 0));
    }

    this.physics.pause();
    if (this.spawnTimer) {
      this.spawnTimer.paused = true;
    }
    if (this.neutralShapeSpawnTimer) {
      this.neutralShapeSpawnTimer.paused = true;
    }

    if (instructionText) {
      this.registry.set('run.instructions', instructionText);
    }
  }

  private resumeGameplaySystems(instructionText?: string, ignoredPointer?: ActivePointerLike): void {
    if (
      this.isEnded ||
      this.isSystemPaused ||
      this.isManualPaused ||
      this.isLevelingUp ||
      this.isChoosingTankClass ||
      this.isTransitioningToMenu
    ) {
      return;
    }

    this.movementInput?.resumeAfterOverlay({ ignoredPointer });
    this.physics.resume();
    if (this.spawnTimer) {
      this.spawnTimer.paused = false;
    }
    if (this.neutralShapeSpawnTimer) {
      this.neutralShapeSpawnTimer.paused = false;
    }

    if (instructionText) {
      this.registry.set('run.instructions', instructionText);
    }
  }

  private publishHudState(): void {
    if (!this.player) {
      return;
    }

    const score = this.calculateCurrentRunScore();
    const stagePhase = this.getCurrentStagePhase();
    const activeBoss = this.getActiveBossEnemy();
    this.registry.set('run.hp', this.player.getCurrentHealth());
    this.registry.set('run.maxHp', this.player.getMaxHealth());
    this.registry.set('run.level', this.player.getLevel());
    this.registry.set('run.kills', this.killCount);
    this.registry.set('run.weaponCount', this.weapons.length);
    this.registry.set('run.xp', this.player.getExperience());
    this.registry.set('run.xpNext', this.player.getExperienceToNextLevel());
    this.registry.set('run.statPoints', this.tankStats.getAvailablePoints());
    this.registry.set('run.tankStatLevels', this.tankStats.getLevels());
    this.registry.set('run.tankStatEffects', this.tankStats.getEffects());
    this.registry.set('run.effectiveHpRegenPerSecond', this.player.getHpRegenPerSecond());
    this.registry.set('run.metaHpRegenPerSecond', this.metaHpRegenPerSecond);
    this.registry.set('run.runHpRegenPerSecond', this.runHpRegenPerSecond);
    this.registry.set('run.hpRegenActive', this.player.wasHpRegenActive());
    this.registry.set('run.canSpendStatPoints', this.hasSpendableTankStats());
    this.registry.set('run.statsMaxed', this.areTankStatsMaxedWithPoints());
    this.registry.set('run.tankClass', {
      id: this.currentTankClass.id,
      title: this.currentTankClass.title,
      description: this.currentTankClass.description,
    });
    this.registry.set('run.classChoiceAvailable', this.isChoosingTankClass || this.shouldQueueTankClassChoice());
    this.registry.set('run.classChoiceActive', this.isChoosingTankClass);
    this.registry.set('run.classChoiceChoices', this.isChoosingTankClass ? this.getAvailableTankClassChoices() : []);
    this.registry.set('run.targetMs', BOSS_SPAWN_TIME_MS);
    this.registry.set('run.stagePhase', stagePhase);
    this.registry.set('run.bossSpawnTimeMs', BOSS_SPAWN_TIME_MS);
    this.registry.set('run.bossActive', Boolean(activeBoss));
    this.registry.set('run.bossHp', activeBoss?.getCurrentHealth() ?? null);
    this.registry.set('run.bossMaxHp', activeBoss?.getMaxHealth() ?? null);
    this.registry.set('run.bossPhase', this.bossPhase);
    this.registry.set('run.bossPhaseTwoTriggered', this.bossPhaseTwoTriggered);
    this.registry.set('run.bossSummonActiveCount', this.getActiveBossSummonCount());
    this.registry.set('run.bossSummonCap', BOSS_SUMMON_MAX_ACTIVE);
    this.registry.set('run.bossTargetFastKillMs', BOSS_TARGET_FAST_KILL_MS);
    this.registry.set('run.bossOwnedEnemyCount', this.getActiveBossSummonCount());
    this.registry.set('run.bossPhasePressure', getBossPhasePressureState({
      stagePhase,
      bossPhase: this.bossPhase,
      bossActive: Boolean(activeBoss),
    }));
    this.registry.set('run.bossFightState', activeBoss ? this.bossFightState : '');
    this.registry.set('run.bossStateRemainingMs', activeBoss ? Math.max(0, this.bossStateEndsAtMs - this.runElapsedMs) : 0);
    this.registry.set('run.activeBossSkill', this.getActiveBossSkillName());
    this.registry.set('run.bossSkillTelegraphActive', this.skillTelegraphs.some((telegraph) => telegraph.kind === 'boss-shockwave'));
    this.registry.set('run.bossSkillDamageActive', this.shockwaveAttacks.some((attack) => attack.elapsedMs < attack.durationMs));
    this.registry.set('run.activeMinibossSkill', this.getActiveMinibossSkillName());
    this.registry.set('run.eventEnemyMultiplier', EVENT_ENEMY_STAT_MULTIPLIER);
    this.registry.set('run.normalSpawnsSuppressed', this.areNormalSpawnsSuppressed());
    this.registry.set('run.victoryCondition', getStageVictoryCondition(stagePhase));
    this.registry.set('run.goldEarned', this.goldEarned);
    this.registry.set('run.totalGold', this.saveData.totalGold);
    this.registry.set('run.elapsedMs', this.runElapsedMs);
    this.registry.set('run.score', score);
    this.registry.set('run.bestScore', this.saveData.bestScore);
    this.registry.set('run.finalScore', this.finalScore);
    this.registry.set('run.newBestScore', this.newBestScore);
    this.registry.set('run.localLeaderboard', this.saveData.localLeaderboard);
    this.registry.set('run.localLeaderboardEntryCount', this.saveData.localLeaderboard.length);
    this.registry.set('run.weaponNames', this.weapons.map((weapon) => weapon.getStats().name));
    this.registry.set('run.manualPaused', this.isManualPaused);
    this.registry.set('run.pauseMenuActive', this.isManualPaused);
    this.registry.set('run.eventActive', Boolean(this.activeRunEvent));
    this.registry.set('run.eventType', this.activeRunEvent?.type ?? '');
    this.registry.set('run.eventTitle', this.activeRunEvent?.title ?? '');
    this.registry.set('run.eventText', this.activeRunEvent?.objective ?? '');
    this.registry.set('run.eventRemainingMs', this.activeRunEvent ? Math.max(0, this.activeRunEvent.endsAtMs - this.runElapsedMs) : 0);
    this.registry.set('run.mapBuffType', this.activeMapBuff?.type ?? '');
    this.registry.set('run.mapBuffRemainingMs', this.activeMapBuff?.remainingMs ?? 0);
    this.registry.set('run.controlGuideMode', this.saveData.controlGuideMode);
    this.registry.set('run.controlHintVisible', this.controlHintVisible);
    this.registry.set('run.controlJoysticks', this.movementInput.getPointerGuideState());
    this.registry.set('run.inputSuppressed', this.movementInput.isSuppressed());
    this.registry.set('run.formationPressureEnabled', this.runElapsedMs >= WAVE_FORMATION_ENABLE_TIME_MS);
    this.registry.set('run.lastFormationType', this.lastFormationType);
    this.registry.set('run.formationCooldownMs', Math.max(0, this.nextFormationAtMs - this.runElapsedMs));
    this.registry.set('run.formationSpawnCount', this.formationSpawnCount);
    this.registry.set('run.dangerZoneActiveCount', this.dangerZones.length);
    this.registry.set('run.dangerZoneWarningCount', this.dangerZones.filter((zone) => zone.phase === 'warning').length);
    this.registry.set('run.dangerZoneDamageActiveCount', this.dangerZones.filter((zone) => zone.phase === 'active').length);
    this.registry.set('run.activeAbilityReady', this.canActivateBreakoutPulse());
    this.registry.set('run.activeAbilityCooldownMs', this.getBreakoutPulseCooldownMs());
    this.registry.set('run.activeAbilityCooldownTotalMs', BREAKOUT_PULSE_COOLDOWN_MS);
    this.registry.set('run.activeAbilityLabel', 'Pulse');
    this.maybeShowStatsMaxedToast();
  }

  private hasSpendableTankStats(): boolean {
    return TANK_STAT_IDS.some((statId) => this.tankStats.canSpend(statId));
  }

  private areTankStatsMaxedWithPoints(): boolean {
    return this.tankStats.getAvailablePoints() > 0 && !this.hasSpendableTankStats();
  }

  private maybeShowStatsMaxedToast(): void {
    const availablePoints = this.tankStats.getAvailablePoints();
    if (availablePoints <= 0 || this.hasSpendableTankStats()) {
      this.statsMaxedToastShownForPoints = 0;
      return;
    }

    if (this.statsMaxedToastShownForPoints === availablePoints) {
      return;
    }

    this.statsMaxedToastShownForPoints = availablePoints;
    this.showRewardToast('Stats maxed', '#bfdbfe');
  }

  private dismissControlHintIfNeeded(movementInput: MovementInputSnapshot): void {
    if (!this.controlHintVisible) {
      return;
    }

    const hasMovement = movementInput.source !== 'idle' && (movementInput.movement.x !== 0 || movementInput.movement.y !== 0);
    const hasAim = movementInput.aimActive;
    const hasTimedOut = this.runElapsedMs >= 5500;

    if (!hasMovement && !hasAim && !hasTimedOut) {
      return;
    }

    this.controlHintVisible = false;
    this.saveData = markControlHintDismissed(this.saveData);
  }

  private calculateCurrentRunScore(): number {
    return calculateRunScore({
      neutralShapesDestroyed: this.neutralShapesDestroyed,
      enemyKills: this.killCount,
      levelReached: this.player.getLevel(),
      timeSurvivedMs: this.runElapsedMs,
      goldEarned: this.goldEarned,
    });
  }

  private endRun(victory: boolean, title: string, subtitle: string): void {
    if (this.isEnded) {
      return;
    }

    this.isEnded = true;
    this.levelUpStartQueued = false;
    this.tankClassChoiceStartQueued = false;
    this.isTankClassChoiceForced = false;
    this.isLevelingUp = false;
    this.isChoosingTankClass = false;
    this.isResolvingLevelUpChoice = false;
    this.levelUpRemainingMs = 0;
    this.stagePhase = victory ? 'victory' : 'defeat';
    this.clearActiveRunEvent();
    this.combatResponse.clear({ suppressCallbacks: true });
    this.goldEarned += calculateRunGoldReward(this.player.getLevel(), this.killCount, victory);
    this.saveData = awardRunGold(this.saveData, this.goldEarned);

    const questResolution = applyRunProgressToQuests(this.saveData, {
      kills: this.killCount,
      survivalMs: this.runElapsedMs,
      levelReached: this.player.getLevel(),
      goldCollected: this.goldEarned,
      eliteKills: this.eliteKillCount,
    });
    this.saveData = questResolution.saveData;
    this.finalScore = this.calculateCurrentRunScore();
    const leaderboardResult = recordLocalLeaderboardEntry(this.saveData, {
      score: this.finalScore,
      level: this.player.getLevel(),
      classId: this.currentTankClass.id,
      classTitle: this.currentTankClass.title,
      kills: this.killCount,
      timeSurvivedMs: this.runElapsedMs,
    });
    this.saveData = leaderboardResult.saveData;
    this.newBestScore = leaderboardResult.isNewBest;

    this.spawnTimer?.remove(false);
    this.neutralShapeSpawnTimer?.remove(false);
    this.player.move(new Phaser.Math.Vector2(0, 0));
    this.player.updateVisualState(this.time.now);
    this.physics.pause();
    this.lineStrikeAttacks = [];
    for (const attack of this.shockwaveAttacks) {
      attack.ring.destroy();
      attack.halo.destroy();
    }
    this.shockwaveAttacks = [];
    this.skillTelegraphs = [];
    for (const bolt of this.enemyBolts) {
      this.destroyEnemyBolt(bolt);
    }
    this.enemyBolts = [];
    this.clearDangerZones();
    this.breakoutPulseProtectionRemainingMs = 0;

    this.cameras.main.shake(180, victory ? 0.0026 : 0.0034);
    if (victory) {
      playCue('victory');
      this.cameras.main.flash(ENDING_FLASH_MS, 255, 234, 150, false);
      this.createBurstCircle(this.player.x, this.player.y, 0xfde68a, 22, 90, 300, 0.95);
    } else {
      playCue('defeat');
      this.cameras.main.flash(ENDING_FLASH_MS, 255, 120, 120, false);
      this.createBurstCircle(this.player.x, this.player.y, 0xf87171, 18, 74, 260, 0.9);
    }

    this.registry.set('save.totalGold', this.saveData.totalGold);
    this.registry.set('run.endActive', true);
    this.registry.set('run.victory', victory);
    this.registry.set('run.endTitle', title);
    this.registry.set('run.endSubtitle', subtitle);
    this.registry.set('run.questRewards', questResolution.rewardMessages);
    this.registry.set('run.levelUpActive', false);
    this.registry.set('run.levelUpChoices', []);
    this.registry.set('run.levelUpChoiceCount', 0);
    this.registry.set('run.levelUpRemainingMs', 0);
    this.registry.set('run.upgradePoolExhausted', false);
    this.registry.set('run.classChoiceActive', false);
    this.registry.set('run.classChoiceChoices', []);
    this.registry.set('run.instructions', 'Tap the button to return to menu.');
    this.registry.set('run.eventActive', false);
    this.registry.set('run.eventType', '');
    this.registry.set('run.eventTitle', '');
    this.registry.set('run.eventText', '');
    this.registry.set('run.eventRemainingMs', 0);
    this.setAlert(victory ? 'victory' : 'defeat', title);
    this.showRewardToast(victory ? `Victory payout: +${this.goldEarned} gold` : `Run payout: +${this.goldEarned} gold`, victory ? '#fde68a' : '#fca5a5');
    this.publishHudState();
  }

  private setAlert(kind: string, text: string, durationMs = 0): void {
    const priority = this.getAlertPriority(kind);
    const now = this.time.now;

    if (now < this.activeAlertUntil && priority < this.activeAlertPriority) {
      return;
    }

    this.activeAlertPriority = priority;
    this.activeAlertKind = kind;
    this.activeAlertUntil = durationMs > 0 ? now + durationMs : 0;
    this.registry.set('run.alertKind', kind);
    this.registry.set('run.alertText', text);

    if (durationMs <= 0) {
      return;
    }

    const token = this.alertToken + 1;
    this.alertToken = token;
    this.time.delayedCall(durationMs, () => {
      if (this.alertToken !== token || this.isEnded) {
        return;
      }

      this.activeAlertPriority = 0;
      this.activeAlertKind = 'objective';
      this.activeAlertUntil = 0;
      this.registry.set('run.alertKind', 'objective');
      this.registry.set('run.alertText', '');
      this.flushQueuedRewardToast();
    });
  }

  private showRewardToast(text: string, color: string): void {
    if (
      !this.isEnded &&
      this.time.now < this.activeAlertUntil &&
      this.getAlertPriority(this.activeAlertKind) >= this.getAlertPriority('miniboss')
    ) {
      this.queuedRewardToast = { text, color };
      return;
    }

    const token = this.rewardToastToken + 1;
    this.rewardToastToken = token;
    this.registry.set('run.rewardText', text);
    this.registry.set('run.rewardColor', color);

    this.time.delayedCall(2400, () => {
      if (this.rewardToastToken !== token) {
        return;
      }

      this.registry.set('run.rewardText', '');
    });
  }

  private flushQueuedRewardToast(): void {
    if (!this.queuedRewardToast) {
      return;
    }

    const queuedToast = this.queuedRewardToast;
    this.queuedRewardToast = null;
    this.showRewardToast(queuedToast.text, queuedToast.color);
  }

  private getAlertPriority(kind: string): number {
    switch (kind) {
      case 'victory':
      case 'defeat':
      case 'boss':
        return 5;
      case 'miniboss':
        return 4;
      case 'elite':
        return 3;
      case 'hero':
        return 2;
      case 'objective':
      default:
        return 1;
    }
  }

  private showSpawnIndicator(x: number, y: number, label: string, color: number): void {
    const ring = this.add.circle(x, y, 14, color, 0.12).setDepth(8);
    ring.setStrokeStyle(3, color, 0.95);

    this.tweens.add({
      targets: ring,
      radius: 78,
      alpha: 0,
      duration: ELITE_SPAWN_INDICATOR_MS,
      ease: 'Cubic.Out',
      onComplete: () => ring.destroy(),
    });

    this.showFloatingText(x, y - 34, label, Phaser.Display.Color.IntegerToColor(color).rgba, 18);
  }

  private showEncounterBanner(title: string, subtitle: string, color: number, duration: number): void {
    const mobileCopy = this.shouldUseMobileCopy();
    const bannerY = mobileCopy ? 110 : 120;
    const bannerWidth = mobileCopy ? 460 : 620;
    const bannerHeight = mobileCopy ? 58 : 92;
    const accentWidth = mobileCopy ? 390 : 560;
    const titleSize = mobileCopy ? '22px' : '30px';
    const subtitleSize = mobileCopy ? '13px' : '16px';
    const subtitleWrapWidth = mobileCopy ? 390 : 540;
    const holdDuration = mobileCopy ? Math.min(duration, 1000) : duration;
    const backdrop = this.add.rectangle(GAME_WIDTH / 2, bannerY, bannerWidth, bannerHeight, 0x020617, 0.8).setDepth(30).setScrollFactor(0);
    backdrop.setStrokeStyle(2, color, 0.95);
    const accent = this.add.rectangle(GAME_WIDTH / 2, bannerY - bannerHeight / 2 + 6, accentWidth, 3, color, 0.9).setDepth(31).setScrollFactor(0);
    const titleText = this.add
      .text(GAME_WIDTH / 2, bannerY - (mobileCopy ? 7 : 10), title, {
        fontFamily: 'Georgia, serif',
        fontSize: titleSize,
        color: '#f8fafc',
      })
      .setOrigin(0.5)
      .setDepth(31)
      .setScrollFactor(0);
    const subtitleText = this.add
      .text(GAME_WIDTH / 2, bannerY + (mobileCopy ? 15 : 22), subtitle, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: subtitleSize,
        color: '#dbeafe',
        align: 'center',
        wordWrap: { width: subtitleWrapWidth },
      })
      .setOrigin(0.5)
      .setDepth(31)
      .setScrollFactor(0);

    for (const object of [backdrop, accent, titleText, subtitleText]) {
      object.setAlpha(0);
      object.y -= 18;
    }

    this.tweens.add({
      targets: [backdrop, accent, titleText, subtitleText],
      alpha: 1,
      y: `+=18`,
      duration: 180,
      ease: 'Quad.Out',
      hold: holdDuration,
      yoyo: true,
      onComplete: () => {
        backdrop.destroy();
        accent.destroy();
        titleText.destroy();
        subtitleText.destroy();
      },
    });
  }

  private createBurstCircle(
    x: number,
    y: number,
    color: number,
    startRadius: number,
    endRadius: number,
    duration: number,
    alpha: number,
  ): void {
    const burst = this.add.circle(x, y, startRadius, color, alpha).setDepth(9);
    burst.setStrokeStyle(2, color, Math.min(1, alpha + 0.15));

    this.tweens.add({
      targets: burst,
      radius: endRadius,
      alpha: 0,
      duration,
      ease: 'Quad.Out',
      onComplete: () => burst.destroy(),
    });
  }

  private spawnEffectSprite(
    effectId: EffectAssetId,
    x: number,
    y: number,
    displaySize: number,
    durationMs: number,
    depth: number,
  ): void {
    const slot = getEffectSpriteAssetSlot(effectId);
    if (!shouldUseVisualAsset(this, 'effectSprites', slot)) {
      return;
    }

    const sprite = this.add
      .image(x, y, slot.key)
      .setDepth(depth)
      .setDisplaySize(displaySize, displaySize)
      .setAlpha(0.82)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: sprite,
      scale: 1.18,
      alpha: 0,
      duration: durationMs,
      ease: 'Quad.Out',
      onComplete: () => sprite.destroy(),
    });
  }

  private depthForCombatEffect(enemy: Enemy): number {
    return Math.max(8.8, enemy.depth + 0.5);
  }

  private showFloatingText(x: number, y: number, text: string, color: string, fontSize: number): void {
    const label = this.add
      .text(x, y, text, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: `${fontSize}px`,
        color,
        stroke: '#0f172a',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(10);

    this.tweens.add({
      targets: label,
      y: y - 24,
      alpha: 0,
      duration: 420,
      ease: 'Quad.Out',
      onComplete: () => label.destroy(),
    });
  }

  private handleEscapeShortcut(): void {
    if (this.isEnded) {
      this.exitToMenu();
      return;
    }

    if (this.isManualPaused) {
      this.closeManualPauseMenu();
      return;
    }

    this.openManualPauseMenu();
  }

  private handleShutdown(): void {
    this.input.keyboard?.off('keydown-ESC', this.handleEscapeShortcut, this);
    this.input.keyboard?.off('keydown-E', this.activateBreakoutPulse, this);
    document.removeEventListener('visibilitychange', this.handlePageVisibilityChange);
    window.removeEventListener('blur', this.handleWindowBlur);
    window.removeEventListener('focus', this.handleWindowFocus);
    this.movementInput?.destroy();
    this.combatResponse.clear({ suppressCallbacks: true });

    this.spawnTimer?.remove(false);
    this.spawnTimer = undefined;
    this.neutralShapeSpawnTimer?.remove(false);
    this.neutralShapeSpawnTimer = undefined;

    for (const collider of this.colliders) {
      collider.destroy();
    }
    this.colliders = [];

    for (const weapon of this.weapons) {
      weapon.destroy();
    }
    this.weapons = [];

    for (const attack of this.shockwaveAttacks) {
      attack.ring.destroy();
      attack.halo.destroy();
    }
    for (const bolt of this.enemyBolts) {
      this.destroyEnemyBolt(bolt);
    }
    this.lineStrikeAttacks = [];
    this.shockwaveAttacks = [];
    this.enemyBolts = [];
    this.clearDangerZones();

    this.destroyPhysicsGroup(this.enemies);
    this.destroyPhysicsGroup(this.neutralShapes);
    this.destroyPhysicsGroup(this.xpGems);

    if (this.player?.active) {
      this.player.destroy();
    }

    this.rewardToastToken = 0;
    this.alertToken = 0;
    this.activeAlertPriority = 0;
    this.activeAlertKind = 'objective';
    this.activeAlertUntil = 0;
    this.lastWaveTemplateAlertAtMs = Number.NEGATIVE_INFINITY;
    this.queuedRewardToast = null;
    this.destroyRewardTargetMarker();
    this.activeRunEvent = null;
  }

  private destroyPhysicsGroup(group?: Phaser.Physics.Arcade.Group): void {
    if (!group) {
      return;
    }

    const internalChildren = (group as Phaser.Physics.Arcade.Group & {
      children?: { entries?: Phaser.GameObjects.GameObject[] };
    }).children;
    const children = Array.isArray(internalChildren?.entries) ? [...internalChildren.entries] : [];

    for (const child of children) {
      child.destroy();
    }

    group.destroy();
  }

  private applyCombatImpactResponse(
    weaponId: WeaponId,
    enemy: Enemy,
    defeated: boolean,
    x: number,
    y: number,
    color: number,
    radius: number,
    emitCue: boolean,
  ): void {
    const impactResponse = resolveCombatImpactResponse({
      enemyId: enemy.archetype.id,
      weaponId,
      defeated,
      x,
      y,
      color,
      radius,
    });

    if (impactResponse.hitStopMs <= 0 && !impactResponse.cue) {
      return;
    }

    this.combatResponseImpactCounts[weaponId] = (this.combatResponseImpactCounts[weaponId] ?? 0) + 1;
    if (getEnemyCombatResponseProfile(enemy.archetype.id)) {
      this.combatResponseEnemyImpactCounts[enemy.archetype.id] =
        (this.combatResponseEnemyImpactCounts[enemy.archetype.id] ?? 0) + 1;
    }
    this.combatResponse.triggerHitStop(impactResponse.hitStopMs);

    if (emitCue) {
      this.combatResponse.emitImpactCue(impactResponse.cue);
    }
  }

  private pauseCombatResponseSystems(): void {
    if (
      this.isEnded ||
      this.isLevelingUp ||
      this.isChoosingTankClass ||
      this.isSystemPaused ||
      this.isTransitioningToMenu ||
      !this.sys.isActive()
    ) {
      return;
    }

    this.physics.pause();
    this.tweens.pauseAll();
    if (this.spawnTimer) {
      this.spawnTimer.paused = true;
    }
    if (this.neutralShapeSpawnTimer) {
      this.neutralShapeSpawnTimer.paused = true;
    }
  }

  private resumeCombatResponseSystems(): void {
    if (!this.sys.isActive()) {
      return;
    }

    this.tweens.resumeAll();

    if (
      this.isEnded ||
      this.isLevelingUp ||
      this.isChoosingTankClass ||
      this.isSystemPaused ||
      this.isManualPaused ||
      this.isTransitioningToMenu
    ) {
      return;
    }

    this.physics.resume();
    if (this.spawnTimer) {
      this.spawnTimer.paused = false;
    }
    if (this.neutralShapeSpawnTimer) {
      this.neutralShapeSpawnTimer.paused = false;
    }
  }
}




