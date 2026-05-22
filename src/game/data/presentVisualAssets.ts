import { ALL_VISUAL_ASSET_SLOTS, type VisualAssetSlot } from './assetSlots';
import {
  getVisualAssetRuntimeCategoryForSlot,
  isVisualAssetRuntimeCategoryEnabled,
} from '../config/visualAssetRuntimeConfig';

export const PRESENT_VISUAL_ASSET_KEYS = new Set<string>([
  'hero-runner',
  'hero-vanguard',
  'hero-shade',
  'hero-verdant',
  'skin-runner',
  'skin-vanguard',
  'skin-shade',
  'skin-verdant',
  'weapon-arc-bolt',
  'weapon-twin-fangs',
  'weapon-ember-lance',
  'weapon-bloom-cannon',
  'weapon-phase-disc',
  'weapon-sunwheel',
  'weapon-shatterbell',
  'enemy-scuttler',
  'enemy-skimmer',
  'enemy-harrier',
  'enemy-mauler',
  'enemy-crusher',
  'enemy-bulwark',
  'enemy-hexcaster',
  'enemy-overlord',
  'enemy-riftblade',
  'enemy-miniboss-dreadnought',
  'enemy-boss-behemoth',
  'sprite-enemy-scuttler',
  'sprite-enemy-skimmer',
  'sprite-enemy-harrier',
  'sprite-enemy-mauler',
  'sprite-enemy-crusher',
  'sprite-enemy-bulwark',
  'sprite-enemy-hexcaster',
  'sprite-enemy-overlord',
  'sprite-enemy-riftblade',
  'sprite-enemy-miniboss-dreadnought',
  'sprite-enemy-boss-behemoth',
  'ui-gold',
  'ui-pause',
  'ui-xp',
  'ui-hp',
  'projectile-arc-bolt',
  'projectile-twin-fangs',
  'projectile-ember-lance',
  'projectile-bloom-cannon',
  'projectile-phase-disc',
  'projectile-sunwheel',
  'projectile-shatterbell',
  'projectile-enemy-shot',
  'pickup-gold',
  'pickup-health',
  'pickup-magnet',
  'pickup-xp-small',
  'pickup-xp-medium',
  'pickup-xp-large',
  'pickup-xp-huge',
  'effect-boss-shockwave',
  'effect-enemy-death-puff',
  'effect-hit-pop',
  'effect-level-up-burst',
  'effect-miniboss-line-strike',
  'effect-xp-collect',
  'prop-risk-altar',
  'prop-soft-bush',
  'prop-tiny-shrine',
  'prop-wobbly-rock',
  'tile-boundary-pebble',
  'tile-ground-blob',
  'upgrade-vitality',
  'upgrade-swiftness',
  'upgrade-power',
  'upgrade-rapid-fire',
  'upgrade-velocity',
  'upgrade-magnet',
  'upgrade-reach',
  'upgrade-unlock-twin-fangs',
  'upgrade-unlock-ember-lance',
  'upgrade-unlock-bloom-cannon',
  'upgrade-unlock-phase-disc',
  'upgrade-unlock-sunwheel',
  'upgrade-unlock-shatterbell',
  'signature-arc-bolt-volt-volley',
  'signature-twin-fangs-ripper-line',
  'signature-ember-lance-sundering-tip',
  'signature-bloom-cannon-bramble-fan',
  'signature-phase-disc-rift-array',
  'signature-sunwheel-corona-lattice',
  'signature-shatterbell-aftershock',
  'branch-arc-bolt-lanebreaker',
  'branch-twin-fangs-serrated-stream',
  'branch-phase-disc-deep-cut',
  'branch-sunwheel-outer-ring',
  'ui-button-play',
  'ui-button-retry',
  'ui-button-close',
]);

export const PRESENT_VISUAL_ASSET_SLOTS: VisualAssetSlot[] = ALL_VISUAL_ASSET_SLOTS.filter((slot) =>
  PRESENT_VISUAL_ASSET_KEYS.has(slot.key),
);

export const RUNTIME_PRELOAD_VISUAL_ASSET_KEYS = new Set<string>(
  PRESENT_VISUAL_ASSET_SLOTS.filter((slot) =>
    isVisualAssetRuntimeCategoryEnabled(getVisualAssetRuntimeCategoryForSlot(slot)),
  ).map((slot) => slot.key),
);

export const RUNTIME_PRELOAD_VISUAL_ASSET_SLOTS: VisualAssetSlot[] = PRESENT_VISUAL_ASSET_SLOTS.filter((slot) =>
  RUNTIME_PRELOAD_VISUAL_ASSET_KEYS.has(slot.key),
);

export const FUTURE_ONLY_VISUAL_ASSET_SLOTS: VisualAssetSlot[] = PRESENT_VISUAL_ASSET_SLOTS.filter(
  (slot) => !RUNTIME_PRELOAD_VISUAL_ASSET_KEYS.has(slot.key),
);

export const FUTURE_ONLY_VISUAL_ASSET_KEYS = new Set<string>(FUTURE_ONLY_VISUAL_ASSET_SLOTS.map((slot) => slot.key));

export const MISSING_OPTIONAL_VISUAL_ASSET_KEYS = new Set<string>(
  ALL_VISUAL_ASSET_SLOTS.filter((slot) => !PRESENT_VISUAL_ASSET_KEYS.has(slot.key)).map((slot) => slot.key),
);

export const PRELOAD_VISUAL_ASSET_KEYS = RUNTIME_PRELOAD_VISUAL_ASSET_KEYS;
export const PRELOAD_VISUAL_ASSET_SLOTS = RUNTIME_PRELOAD_VISUAL_ASSET_SLOTS;
