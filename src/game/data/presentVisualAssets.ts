import { ALL_VISUAL_ASSET_SLOTS, type VisualAssetSlot } from './assetSlots';

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
]);

export const PRESENT_VISUAL_ASSET_SLOTS: VisualAssetSlot[] = ALL_VISUAL_ASSET_SLOTS.filter((slot) =>
  PRESENT_VISUAL_ASSET_KEYS.has(slot.key),
);

export const PRELOAD_VISUAL_ASSET_KEYS = new Set<string>([
  'hero-runner',
  'hero-vanguard',
  'hero-shade',
  'hero-verdant',
  'weapon-arc-bolt',
  'weapon-twin-fangs',
  'weapon-ember-lance',
  'weapon-bloom-cannon',
  'weapon-phase-disc',
  'weapon-sunwheel',
  'weapon-shatterbell',
]);

export const PRELOAD_VISUAL_ASSET_SLOTS: VisualAssetSlot[] = PRESENT_VISUAL_ASSET_SLOTS.filter((slot) =>
  PRELOAD_VISUAL_ASSET_KEYS.has(slot.key),
);
