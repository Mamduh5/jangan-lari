import type { EnemyArchetypeId } from './enemies';
import type { HeroId } from './heroes';
import type { TankClassId } from './tankClasses';
import type { UpgradeId } from './upgrades';
import type { WeaponId } from './weapons';

export type VisualAssetKind =
  | 'hero-icon'
  | 'hero-skin'
  | 'weapon-icon'
  | 'projectile-sprite'
  | 'enemy-icon'
  | 'enemy-sprite'
  | 'pickup-icon'
  | 'effect-sprite'
  | 'map-prop'
  | 'tile'
  | 'upgrade-icon'
  | 'signature-upgrade-icon'
  | 'branch-upgrade-icon'
  | 'skill-icon'
  | 'buff-status-icon'
  | 'power-core-map-event-icon'
  | 'tank-class-icon'
  | 'ui-icon'
  | 'ui-button';

export type VisualAssetSlot = {
  key: string;
  path: string;
  description: string;
  kind: VisualAssetKind;
  optional: true;
};

export type UiIconAssetId = 'gold' | 'pause' | 'score' | 'xp' | 'hp' | 'stat' | 'class' | 'reward' | 'codex';
export type ProjectileAssetId = WeaponId | 'enemy-shot';
export type PickupIconAssetId = 'gold' | 'health' | 'magnet' | 'xp-small' | 'xp-medium' | 'xp-large' | 'xp-huge';
export type EffectAssetId =
  | 'boss-shockwave'
  | 'enemy-death-puff'
  | 'hit-pop'
  | 'level-up-burst'
  | 'miniboss-line-strike'
  | 'xp-collect';
export type MapPropAssetId = 'risk-altar' | 'soft-bush' | 'tiny-shrine' | 'wobbly-rock';
export type TileAssetId = 'boundary-pebble' | 'ground-blob';
export type UpgradeIconAssetId = Extract<
  UpgradeId,
  | 'vitality'
  | 'swiftness'
  | 'power'
  | 'rapid-fire'
  | 'velocity'
  | 'magnet'
  | 'reach'
  | 'unlock-twin-fangs'
  | 'unlock-ember-lance'
  | 'unlock-bloom-cannon'
  | 'unlock-phase-disc'
  | 'unlock-sunwheel'
  | 'unlock-shatterbell'
>;
export type SignatureUpgradeIconAssetId = Extract<UpgradeId, `signature-${string}`>;
export type BranchUpgradeIconAssetId = Extract<UpgradeId, `branch-${string}`>;
export type SkillIconAssetId = 'breakout-pulse';
export type BuffStatusIconAssetId = 'shield-pulse' | 'pulse-refund' | 'hp-regen';
export type PowerCoreMapEventIconAssetId = 'power-core' | 'challenge-wave' | 'reward-target';
export type UiButtonAssetId = 'play' | 'retry' | 'close';

function createSlot(kind: VisualAssetKind, key: string, path: string, description: string): VisualAssetSlot {
  return {
    key,
    path,
    description,
    kind,
    optional: true,
  };
}

export const HERO_ICON_ASSET_SLOTS: Record<HeroId, VisualAssetSlot> = {
  runner: createSlot('hero-icon', 'hero-runner', 'assets/heroes/hero-runner.png', 'Runner menu and loadout icon.'),
  vanguard: createSlot('hero-icon', 'hero-vanguard', 'assets/heroes/hero-vanguard.png', 'Vanguard menu and loadout icon.'),
  shade: createSlot('hero-icon', 'hero-shade', 'assets/heroes/hero-shade.png', 'Shade menu and loadout icon.'),
  verdant: createSlot('hero-icon', 'hero-verdant', 'assets/heroes/hero-verdant.png', 'Verdant menu and loadout icon.'),
};

export const HERO_SKIN_ASSET_SLOTS: Record<HeroId, VisualAssetSlot> = {
  runner: createSlot('hero-skin', 'skin-runner', 'assets/heroes/skin-runner.png', 'Optional Runner player overlay skin.'),
  vanguard: createSlot('hero-skin', 'skin-vanguard', 'assets/heroes/skin-vanguard.png', 'Optional Vanguard player overlay skin.'),
  shade: createSlot('hero-skin', 'skin-shade', 'assets/heroes/skin-shade.png', 'Optional Shade player overlay skin.'),
  verdant: createSlot('hero-skin', 'skin-verdant', 'assets/heroes/skin-verdant.png', 'Optional Verdant player overlay skin.'),
};

export const WEAPON_ICON_ASSET_SLOTS: Record<WeaponId, VisualAssetSlot> = {
  'arc-bolt': createSlot('weapon-icon', 'weapon-arc-bolt', 'assets/weapons/weapon-arc-bolt.png', 'Arc Bolt weapon icon.'),
  'twin-fangs': createSlot(
    'weapon-icon',
    'weapon-twin-fangs',
    'assets/weapons/weapon-twin-fangs.png',
    'Twin Fangs weapon icon.',
  ),
  'ember-lance': createSlot(
    'weapon-icon',
    'weapon-ember-lance',
    'assets/weapons/weapon-ember-lance.png',
    'Ember Lance weapon icon.',
  ),
  'bloom-cannon': createSlot(
    'weapon-icon',
    'weapon-bloom-cannon',
    'assets/weapons/weapon-bloom-cannon.png',
    'Bloom Cannon weapon icon.',
  ),
  'phase-disc': createSlot(
    'weapon-icon',
    'weapon-phase-disc',
    'assets/weapons/weapon-phase-disc.png',
    'Phase Disc weapon icon.',
  ),
  sunwheel: createSlot('weapon-icon', 'weapon-sunwheel', 'assets/weapons/weapon-sunwheel.png', 'Sunwheel weapon icon.'),
  shatterbell: createSlot(
    'weapon-icon',
    'weapon-shatterbell',
    'assets/weapons/weapon-shatterbell.png',
    'Shatterbell weapon icon.',
  ),
};

export const PROJECTILE_SPRITE_ASSET_SLOTS: Record<ProjectileAssetId, VisualAssetSlot> = {
  'arc-bolt': createSlot('projectile-sprite', 'projectile-arc-bolt', 'assets/projectiles/projectile-arc-bolt.png', 'Arc Bolt optional projectile sprite.'),
  'twin-fangs': createSlot(
    'projectile-sprite',
    'projectile-twin-fangs',
    'assets/projectiles/projectile-twin-fangs.png',
    'Twin Fangs optional projectile sprite.',
  ),
  'ember-lance': createSlot(
    'projectile-sprite',
    'projectile-ember-lance',
    'assets/projectiles/projectile-ember-lance.png',
    'Ember Lance optional projectile sprite.',
  ),
  'bloom-cannon': createSlot(
    'projectile-sprite',
    'projectile-bloom-cannon',
    'assets/projectiles/projectile-bloom-cannon.png',
    'Bloom Cannon optional projectile sprite.',
  ),
  'phase-disc': createSlot(
    'projectile-sprite',
    'projectile-phase-disc',
    'assets/projectiles/projectile-phase-disc.png',
    'Phase Disc optional projectile sprite.',
  ),
  sunwheel: createSlot('projectile-sprite', 'projectile-sunwheel', 'assets/projectiles/projectile-sunwheel.png', 'Sunwheel optional projectile sprite.'),
  shatterbell: createSlot(
    'projectile-sprite',
    'projectile-shatterbell',
    'assets/projectiles/projectile-shatterbell.png',
    'Shatterbell optional projectile sprite.',
  ),
  'enemy-shot': createSlot('projectile-sprite', 'projectile-enemy-shot', 'assets/projectiles/projectile-enemy-shot.png', 'Enemy ranged-shot optional projectile sprite.'),
};

export const ENEMY_ICON_ASSET_SLOTS: Record<EnemyArchetypeId, VisualAssetSlot> = {
  scuttler: createSlot('enemy-icon', 'enemy-scuttler', 'assets/enemies/enemy-scuttler.png', 'Scuttler enemy icon.'),
  skimmer: createSlot('enemy-icon', 'enemy-skimmer', 'assets/enemies/enemy-skimmer.png', 'Skimmer enemy icon.'),
  harrier: createSlot('enemy-icon', 'enemy-harrier', 'assets/enemies/enemy-harrier.png', 'Harrier enemy icon.'),
  mauler: createSlot('enemy-icon', 'enemy-mauler', 'assets/enemies/enemy-mauler.png', 'Mauler enemy icon.'),
  crusher: createSlot('enemy-icon', 'enemy-crusher', 'assets/enemies/enemy-crusher.png', 'Crusher enemy icon.'),
  bulwark: createSlot('enemy-icon', 'enemy-bulwark', 'assets/enemies/enemy-bulwark.png', 'Bulwark enemy icon.'),
  hexcaster: createSlot('enemy-icon', 'enemy-hexcaster', 'assets/enemies/enemy-hexcaster.png', 'Hexcaster enemy icon.'),
  overlord: createSlot('enemy-icon', 'enemy-overlord', 'assets/enemies/enemy-overlord.png', 'Overlord elite enemy icon.'),
  riftblade: createSlot('enemy-icon', 'enemy-riftblade', 'assets/enemies/enemy-riftblade.png', 'Riftblade elite enemy icon.'),
  dreadnought: createSlot(
    'enemy-icon',
    'enemy-miniboss-dreadnought',
    'assets/enemies/enemy-miniboss-dreadnought.png',
    'Dreadnought miniboss icon.',
  ),
  behemoth: createSlot(
    'enemy-icon',
    'enemy-boss-behemoth',
    'assets/enemies/enemy-boss-behemoth.png',
    'Behemoth boss icon.',
  ),
};

export const ENEMY_SPRITE_ASSET_SLOTS: Record<EnemyArchetypeId, VisualAssetSlot> = {
  scuttler: createSlot('enemy-sprite', 'sprite-enemy-scuttler', 'assets/enemies/sprite-enemy-scuttler.png', 'Scuttler optional sprite.'),
  skimmer: createSlot('enemy-sprite', 'sprite-enemy-skimmer', 'assets/enemies/sprite-enemy-skimmer.png', 'Skimmer optional sprite.'),
  harrier: createSlot('enemy-sprite', 'sprite-enemy-harrier', 'assets/enemies/sprite-enemy-harrier.png', 'Harrier optional sprite.'),
  mauler: createSlot('enemy-sprite', 'sprite-enemy-mauler', 'assets/enemies/sprite-enemy-mauler.png', 'Mauler optional sprite.'),
  crusher: createSlot('enemy-sprite', 'sprite-enemy-crusher', 'assets/enemies/sprite-enemy-crusher.png', 'Crusher optional sprite.'),
  bulwark: createSlot('enemy-sprite', 'sprite-enemy-bulwark', 'assets/enemies/sprite-enemy-bulwark.png', 'Bulwark optional sprite.'),
  hexcaster: createSlot('enemy-sprite', 'sprite-enemy-hexcaster', 'assets/enemies/sprite-enemy-hexcaster.png', 'Hexcaster optional sprite.'),
  overlord: createSlot('enemy-sprite', 'sprite-enemy-overlord', 'assets/enemies/sprite-enemy-overlord.png', 'Overlord optional sprite.'),
  riftblade: createSlot('enemy-sprite', 'sprite-enemy-riftblade', 'assets/enemies/sprite-enemy-riftblade.png', 'Riftblade optional sprite.'),
  dreadnought: createSlot(
    'enemy-sprite',
    'sprite-enemy-miniboss-dreadnought',
    'assets/enemies/sprite-enemy-miniboss-dreadnought.png',
    'Dreadnought optional sprite.',
  ),
  behemoth: createSlot(
    'enemy-sprite',
    'sprite-enemy-boss-behemoth',
    'assets/enemies/sprite-enemy-boss-behemoth.png',
    'Behemoth optional sprite.',
  ),
};

export const MINIBOSS_SPRITE_ASSET_SLOTS: Partial<Record<EnemyArchetypeId, VisualAssetSlot>> = {
  dreadnought: ENEMY_SPRITE_ASSET_SLOTS.dreadnought,
};

export const BOSS_SPRITE_ASSET_SLOTS: Partial<Record<EnemyArchetypeId, VisualAssetSlot>> = {
  behemoth: ENEMY_SPRITE_ASSET_SLOTS.behemoth,
};

export const PICKUP_ICON_ASSET_SLOTS: Record<PickupIconAssetId, VisualAssetSlot> = {
  gold: createSlot('pickup-icon', 'pickup-gold', 'assets/pickups/pickup-gold-coin.png', 'Gold pickup icon.'),
  health: createSlot('pickup-icon', 'pickup-health', 'assets/pickups/pickup-health-heart.png', 'Health pickup icon.'),
  magnet: createSlot('pickup-icon', 'pickup-magnet', 'assets/pickups/pickup-magnet.png', 'Magnet pickup icon.'),
  'xp-small': createSlot('pickup-icon', 'pickup-xp-small', 'assets/pickups/pickup-xp-gem-small.png', 'Small XP gem pickup icon.'),
  'xp-medium': createSlot('pickup-icon', 'pickup-xp-medium', 'assets/pickups/pickup-xp-gem-medium.png', 'Medium XP gem pickup icon.'),
  'xp-large': createSlot('pickup-icon', 'pickup-xp-large', 'assets/pickups/pickup-xp-gem-large.png', 'Large XP gem pickup icon.'),
  'xp-huge': createSlot('pickup-icon', 'pickup-xp-huge', 'assets/pickups/pickup-xp-gem-huge.png', 'Huge XP gem pickup icon.'),
};

export const EFFECT_SPRITE_ASSET_SLOTS: Record<EffectAssetId, VisualAssetSlot> = {
  'boss-shockwave': createSlot('effect-sprite', 'effect-boss-shockwave', 'assets/effects/effect-boss-shockwave.png', 'Boss shockwave optional effect sprite.'),
  'enemy-death-puff': createSlot(
    'effect-sprite',
    'effect-enemy-death-puff',
    'assets/effects/effect-enemy-death-puff.png',
    'Enemy death puff optional effect sprite.',
  ),
  'hit-pop': createSlot('effect-sprite', 'effect-hit-pop', 'assets/effects/effect-hit-pop.png', 'Hit pop optional effect sprite.'),
  'level-up-burst': createSlot('effect-sprite', 'effect-level-up-burst', 'assets/effects/effect-level-up-burst.png', 'Level-up burst optional effect sprite.'),
  'miniboss-line-strike': createSlot(
    'effect-sprite',
    'effect-miniboss-line-strike',
    'assets/effects/effect-miniboss-line-strike.png',
    'Miniboss line strike optional effect sprite.',
  ),
  'xp-collect': createSlot('effect-sprite', 'effect-xp-collect', 'assets/effects/effect-xp-collect.png', 'XP collect optional effect sprite.'),
};

export const MAP_PROP_ASSET_SLOTS: Record<MapPropAssetId, VisualAssetSlot> = {
  'risk-altar': createSlot('map-prop', 'prop-risk-altar', 'assets/props/prop-risk-altar.png', 'Risk altar optional map prop.'),
  'soft-bush': createSlot('map-prop', 'prop-soft-bush', 'assets/props/prop-soft-bush.png', 'Soft bush optional map prop.'),
  'tiny-shrine': createSlot('map-prop', 'prop-tiny-shrine', 'assets/props/prop-tiny-shrine.png', 'Tiny shrine optional map prop.'),
  'wobbly-rock': createSlot('map-prop', 'prop-wobbly-rock', 'assets/props/prop-wobbly-rock.png', 'Wobbly rock optional map prop.'),
};

export const TILE_ASSET_SLOTS: Record<TileAssetId, VisualAssetSlot> = {
  'boundary-pebble': createSlot('tile', 'tile-boundary-pebble', 'assets/tiles/tile-boundary-pebble.png', 'Boundary pebble optional tile detail.'),
  'ground-blob': createSlot('tile', 'tile-ground-blob', 'assets/tiles/tile-ground-blob.png', 'Ground blob optional tile detail.'),
};

export const TANK_CLASS_ICON_ASSET_SLOTS: Record<TankClassId, VisualAssetSlot> = {
  basic: createSlot('tank-class-icon', 'class-basic', 'assets/ui/class-basic.png', 'Basic class icon.'),
  twin: createSlot('tank-class-icon', 'class-twin', 'assets/ui/class-twin.png', 'Twin class icon.'),
  sniper: createSlot('tank-class-icon', 'class-sniper', 'assets/ui/class-sniper.png', 'Sniper class icon.'),
};

export const UPGRADE_ICON_ASSET_SLOTS: Record<UpgradeIconAssetId, VisualAssetSlot> = {
  vitality: createSlot('upgrade-icon', 'upgrade-vitality', 'assets/upgrades/upgrade-vitality.png', 'Vitality upgrade icon.'),
  swiftness: createSlot('upgrade-icon', 'upgrade-swiftness', 'assets/upgrades/upgrade-swiftness.png', 'Swiftness upgrade icon.'),
  power: createSlot('upgrade-icon', 'upgrade-power', 'assets/upgrades/upgrade-power.png', 'Power upgrade icon.'),
  'rapid-fire': createSlot('upgrade-icon', 'upgrade-rapid-fire', 'assets/upgrades/upgrade-rapid-fire.png', 'Rapid Fire upgrade icon.'),
  velocity: createSlot('upgrade-icon', 'upgrade-velocity', 'assets/upgrades/upgrade-velocity.png', 'Velocity upgrade icon.'),
  magnet: createSlot('upgrade-icon', 'upgrade-magnet', 'assets/upgrades/upgrade-magnet.png', 'Magnet upgrade icon.'),
  reach: createSlot('upgrade-icon', 'upgrade-reach', 'assets/upgrades/upgrade-reach.png', 'Reach upgrade icon.'),
  'unlock-twin-fangs': createSlot('upgrade-icon', 'upgrade-unlock-twin-fangs', 'assets/upgrades/upgrade-unlock-twin-fangs.png', 'Twin Fangs unlock upgrade icon.'),
  'unlock-ember-lance': createSlot('upgrade-icon', 'upgrade-unlock-ember-lance', 'assets/upgrades/upgrade-unlock-ember-lance.png', 'Ember Lance unlock upgrade icon.'),
  'unlock-bloom-cannon': createSlot('upgrade-icon', 'upgrade-unlock-bloom-cannon', 'assets/upgrades/upgrade-unlock-bloom-cannon.png', 'Bloom Cannon unlock upgrade icon.'),
  'unlock-phase-disc': createSlot('upgrade-icon', 'upgrade-unlock-phase-disc', 'assets/upgrades/upgrade-unlock-phase-disc.png', 'Phase Disc unlock upgrade icon.'),
  'unlock-sunwheel': createSlot('upgrade-icon', 'upgrade-unlock-sunwheel', 'assets/upgrades/upgrade-unlock-sunwheel.png', 'Sunwheel unlock upgrade icon.'),
  'unlock-shatterbell': createSlot('upgrade-icon', 'upgrade-unlock-shatterbell', 'assets/upgrades/upgrade-unlock-shatterbell.png', 'Shatterbell unlock upgrade icon.'),
};

export const SIGNATURE_UPGRADE_ICON_ASSET_SLOTS: Record<SignatureUpgradeIconAssetId, VisualAssetSlot> = {
  'signature-arc-bolt-volt-volley': createSlot(
    'signature-upgrade-icon',
    'signature-arc-bolt-volt-volley',
    'assets/upgrades/signature-arc-bolt-volt-volley.png',
    'Volt Volley signature upgrade icon.',
  ),
  'signature-twin-fangs-ripper-line': createSlot(
    'signature-upgrade-icon',
    'signature-twin-fangs-ripper-line',
    'assets/upgrades/signature-twin-fangs-ripper-line.png',
    'Ripper Line signature upgrade icon.',
  ),
  'signature-ember-lance-sundering-tip': createSlot(
    'signature-upgrade-icon',
    'signature-ember-lance-sundering-tip',
    'assets/upgrades/signature-ember-lance-sundering-tip.png',
    'Sundering Tip signature upgrade icon.',
  ),
  'signature-bloom-cannon-bramble-fan': createSlot(
    'signature-upgrade-icon',
    'signature-bloom-cannon-bramble-fan',
    'assets/upgrades/signature-bloom-cannon-bramble-fan.png',
    'Bramble Fan signature upgrade icon.',
  ),
  'signature-phase-disc-rift-array': createSlot(
    'signature-upgrade-icon',
    'signature-phase-disc-rift-array',
    'assets/upgrades/signature-phase-disc-rift-array.png',
    'Rift Array signature upgrade icon.',
  ),
  'signature-sunwheel-corona-lattice': createSlot(
    'signature-upgrade-icon',
    'signature-sunwheel-corona-lattice',
    'assets/upgrades/signature-sunwheel-corona-lattice.png',
    'Corona Lattice signature upgrade icon.',
  ),
  'signature-shatterbell-aftershock': createSlot(
    'signature-upgrade-icon',
    'signature-shatterbell-aftershock',
    'assets/upgrades/signature-shatterbell-aftershock.png',
    'Aftershock signature upgrade icon.',
  ),
};

export const BRANCH_UPGRADE_ICON_ASSET_SLOTS: Record<BranchUpgradeIconAssetId, VisualAssetSlot> = {
  'branch-arc-bolt-lanebreaker': createSlot(
    'branch-upgrade-icon',
    'branch-arc-bolt-lanebreaker',
    'assets/upgrades/branch-arc-bolt-lanebreaker.png',
    'Lanebreaker branch upgrade icon.',
  ),
  'branch-twin-fangs-serrated-stream': createSlot(
    'branch-upgrade-icon',
    'branch-twin-fangs-serrated-stream',
    'assets/upgrades/branch-twin-fangs-serrated-stream.png',
    'Serrated Stream branch upgrade icon.',
  ),
  'branch-phase-disc-deep-cut': createSlot(
    'branch-upgrade-icon',
    'branch-phase-disc-deep-cut',
    'assets/upgrades/branch-phase-disc-deep-cut.png',
    'Deep Cut branch upgrade icon.',
  ),
  'branch-sunwheel-outer-ring': createSlot(
    'branch-upgrade-icon',
    'branch-sunwheel-outer-ring',
    'assets/upgrades/branch-sunwheel-outer-ring.png',
    'Outer Ring branch upgrade icon.',
  ),
};

export const SKILL_ICON_ASSET_SLOTS: Record<SkillIconAssetId, VisualAssetSlot> = {
  'breakout-pulse': createSlot('skill-icon', 'skill-breakout-pulse', 'assets/ui/skill-breakout-pulse.png', 'Breakout Pulse active ability icon.'),
};

export const BUFF_STATUS_ICON_ASSET_SLOTS: Record<BuffStatusIconAssetId, VisualAssetSlot> = {
  'shield-pulse': createSlot('buff-status-icon', 'buff-shield-pulse', 'assets/ui/buff-shield-pulse.png', 'Power Core shield status icon.'),
  'pulse-refund': createSlot('buff-status-icon', 'buff-pulse-refund', 'assets/ui/buff-pulse-refund.png', 'Power Core pulse cooldown refund status icon.'),
  'hp-regen': createSlot('buff-status-icon', 'status-hp-regen', 'assets/ui/status-hp-regen.png', 'HP regeneration status icon.'),
};

export const POWER_CORE_MAP_EVENT_ICON_ASSET_SLOTS: Record<PowerCoreMapEventIconAssetId, VisualAssetSlot> = {
  'power-core': createSlot('power-core-map-event-icon', 'map-event-power-core', 'assets/ui/map-event-power-core.png', 'Power Core map-event icon.'),
  'challenge-wave': createSlot('power-core-map-event-icon', 'map-event-challenge-wave', 'assets/ui/map-event-challenge-wave.png', 'Challenge wave map-event icon.'),
  'reward-target': createSlot('power-core-map-event-icon', 'map-event-reward-target', 'assets/ui/map-event-reward-target.png', 'Reward target map-event icon.'),
};

export const UI_ICON_ASSET_SLOTS: Record<UiIconAssetId, VisualAssetSlot> = {
  gold: createSlot('ui-icon', 'ui-gold', 'assets/ui/ui-gold.png', 'Gold UI icon.'),
  pause: createSlot('ui-icon', 'ui-pause', 'assets/ui/ui-pause.png', 'Pause UI icon.'),
  score: createSlot('ui-icon', 'ui-score', 'assets/ui/ui-score.png', 'Score UI icon.'),
  xp: createSlot('ui-icon', 'ui-xp', 'assets/ui/ui-xp.png', 'XP UI icon.'),
  hp: createSlot('ui-icon', 'ui-hp', 'assets/ui/ui-hp.png', 'HP UI icon.'),
  stat: createSlot('ui-icon', 'ui-stat', 'assets/ui/ui-stat.png', 'Stat allocation UI icon.'),
  class: createSlot('ui-icon', 'ui-class', 'assets/ui/ui-class.png', 'Class UI icon.'),
  reward: createSlot('ui-icon', 'ui-reward', 'assets/ui/ui-reward.png', 'Reward UI icon.'),
  codex: createSlot('ui-icon', 'ui-codex', 'assets/ui/ui-codex.png', 'Codex UI icon.'),
};

export const UI_BUTTON_ASSET_SLOTS: Record<UiButtonAssetId, VisualAssetSlot> = {
  play: createSlot('ui-button', 'ui-button-play', 'assets/ui/ui-button-play.png', 'Play button icon.'),
  retry: createSlot('ui-button', 'ui-button-retry', 'assets/ui/ui-button-retry.png', 'Retry button icon.'),
  close: createSlot('ui-button', 'ui-button-close', 'assets/ui/ui-button-close.png', 'Close button icon.'),
};

export const ALL_VISUAL_ASSET_SLOTS: VisualAssetSlot[] = [
  ...Object.values(HERO_ICON_ASSET_SLOTS),
  ...Object.values(HERO_SKIN_ASSET_SLOTS),
  ...Object.values(WEAPON_ICON_ASSET_SLOTS),
  ...Object.values(PROJECTILE_SPRITE_ASSET_SLOTS),
  ...Object.values(ENEMY_ICON_ASSET_SLOTS),
  ...Object.values(ENEMY_SPRITE_ASSET_SLOTS),
  ...Object.values(PICKUP_ICON_ASSET_SLOTS),
  ...Object.values(EFFECT_SPRITE_ASSET_SLOTS),
  ...Object.values(MAP_PROP_ASSET_SLOTS),
  ...Object.values(TILE_ASSET_SLOTS),
  ...Object.values(UPGRADE_ICON_ASSET_SLOTS),
  ...Object.values(SIGNATURE_UPGRADE_ICON_ASSET_SLOTS),
  ...Object.values(BRANCH_UPGRADE_ICON_ASSET_SLOTS),
  ...Object.values(SKILL_ICON_ASSET_SLOTS),
  ...Object.values(BUFF_STATUS_ICON_ASSET_SLOTS),
  ...Object.values(POWER_CORE_MAP_EVENT_ICON_ASSET_SLOTS),
  ...Object.values(TANK_CLASS_ICON_ASSET_SLOTS),
  ...Object.values(UI_ICON_ASSET_SLOTS),
  ...Object.values(UI_BUTTON_ASSET_SLOTS),
];
