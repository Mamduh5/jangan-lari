import type { EnemyArchetypeId } from './enemies';
import type { HeroId } from './heroes';
import type { TankClassId } from './tankClasses';
import type { WeaponId } from './weapons';

export type VisualAssetKind =
  | 'hero-icon'
  | 'hero-skin'
  | 'weapon-icon'
  | 'enemy-icon'
  | 'enemy-sprite'
  | 'tank-class-icon'
  | 'ui-icon';

export type VisualAssetSlot = {
  key: string;
  path: string;
  description: string;
  kind: VisualAssetKind;
  optional: true;
};

export type UiIconAssetId = 'gold' | 'pause' | 'score' | 'xp' | 'hp' | 'stat' | 'class' | 'reward' | 'codex';

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

export const TANK_CLASS_ICON_ASSET_SLOTS: Record<TankClassId, VisualAssetSlot> = {
  basic: createSlot('tank-class-icon', 'class-basic', 'assets/ui/class-basic.png', 'Basic class icon.'),
  twin: createSlot('tank-class-icon', 'class-twin', 'assets/ui/class-twin.png', 'Twin class icon.'),
  sniper: createSlot('tank-class-icon', 'class-sniper', 'assets/ui/class-sniper.png', 'Sniper class icon.'),
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

export const ALL_VISUAL_ASSET_SLOTS: VisualAssetSlot[] = [
  ...Object.values(HERO_ICON_ASSET_SLOTS),
  ...Object.values(HERO_SKIN_ASSET_SLOTS),
  ...Object.values(WEAPON_ICON_ASSET_SLOTS),
  ...Object.values(ENEMY_ICON_ASSET_SLOTS),
  ...Object.values(ENEMY_SPRITE_ASSET_SLOTS),
  ...Object.values(TANK_CLASS_ICON_ASSET_SLOTS),
  ...Object.values(UI_ICON_ASSET_SLOTS),
];
