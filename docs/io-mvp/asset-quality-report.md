# Asset Quality Report

Generated from committed PNGs under `public/assets` using alpha > 8 as the visible-pixel threshold.

## Ready To Use Now

- Hero menu icons: `hero-runner`, `hero-vanguard`, `hero-shade`, `hero-verdant`.
- Weapon HUD icons: all seven `weapon-*` files.
- Projectile overlays: all seven player projectile files plus `projectile-enemy-shot`. Visible bounds meet the refined projectile thresholds.
- Pickup icons: gold, health, magnet, and XP gem files. XP gems are runtime-sized through code so their large source art does not clutter play.
- UI icons/buttons currently wired: `ui-gold`, `ui-pause`, `ui-xp`, `ui-hp`, `ui-button-play`, `ui-button-retry`, `ui-button-close`.
- Low-risk effects currently wired: `effect-enemy-death-puff`, `effect-hit-pop`, `effect-level-up-burst`, `effect-xp-collect`.

## Usable But Watch In Game

- `effect-boss-shockwave` and `effect-miniboss-line-strike`: source bounds are broad; keep current fallback mechanics unless specifically reviewing those effects.
- `projectile-phase-disc` and `projectile-sunwheel`: strong readable bounds, but coverage is high enough to watch for visual noise in dense waves.
- XP gem pickup icons: source art is large and tall, but runtime diameter is now capped by tier.
- UI icons: source coverage is high; current small decorative use is acceptable, but avoid larger HUD placements without review.
- Enemy icons/sprites, props, tiles, and upgrade icons: mapped and measurable, but remain future-disabled until a focused runtime pass reviews readability and gameplay context.

## Needs Manual Refinement

- `tile-boundary-pebble`: visible height is only 48px on a 256px canvas with 8.2% coverage; likely too thin/faint for tile use.
- `tile-ground-blob`: 16.4% coverage; usable as subtle ground detail, but likely too faint if it becomes an important navigation/readability element.
- Several upgrade and branch icons sit near 17-20% coverage. They may be too fine at small reward-card sizes and should be reviewed before enabling upgrade categories.

## Missing Expected Slot Files

- Tank class icons: `class-basic`, `class-twin`, `class-sniper`.
- Skill/status icons: `skill-breakout-pulse`, `buff-shield-pulse`, `buff-pulse-refund`, `status-hp-regen`.
- Map-event icons: `map-event-power-core`, `map-event-challenge-wave`, `map-event-reward-target`.
- UI icons: `ui-score`, `ui-stat`, `ui-class`, `ui-reward`, `ui-codex`.

## Files Present But Not Mapped To Slots

- None found. Every PNG under `public/assets` maps to an existing slot path.

## Runtime-Enabled Categories And Status

- `heroMenuIcons`: enabled; ready.
- `weaponHudIcons`: enabled; ready.
- `projectileSprites`: enabled; refined assets pass basic alpha-bounds checks. Decorative overlays only.
- `pickupIcons`: enabled; XP icon overlays now use compact tier diameters.
- `effectSprites`: enabled; low-risk effect overlays only. High-risk boss/miniboss mechanics stay on existing fallback visuals.
- `uiIcons`: enabled; only present icons preload and render.
- `uiButtons`: enabled; only present button icons preload and render.

## Future-Disabled Categories And Why

- `heroSkins`, `enemySprites`, `bossSprites`, `minibossSprites`: runtime readability and body alignment risk; keep shape/collision bodies authoritative.
- `enemyIcons`: no active runtime surface in this pass.
- `mapProps`, `tiles`: future arena decoration only; do not risk pathing/readability changes.
- `upgradeIcons`, `signatureUpgradeIcons`, `branchUpgradeIcons`: reward-card UI has not adopted icon layout.
- `skillIcons`, `buffStatusIcons`, `powerCoreMapEventIcons`, `tankClassIcons`: expected files are missing or the runtime surface is not enabled.

## Full PNG Metrics

| Path | Canvas | Visible bbox | Visible size | Coverage | Status / warning |
| --- | ---: | --- | ---: | ---: | --- |
| `assets/effects/effect-boss-shockwave.png` | 128x128 | 2,2-126,127 | 125x126 | 77.3% | Watch: broad/high coverage effect. |
| `assets/effects/effect-enemy-death-puff.png` | 128x128 | 2,15-126,114 | 125x100 | 56.9% | Ready. |
| `assets/effects/effect-hit-pop.png` | 128x128 | 3,3-125,124 | 123x122 | 48.4% | Ready; watch combat-space coverage. |
| `assets/effects/effect-level-up-burst.png` | 128x128 | 3,2-124,124 | 122x123 | 44.9% | Ready. |
| `assets/effects/effect-miniboss-line-strike.png` | 128x128 | 3,17-125,113 | 123x97 | 29.2% | Watch: high-risk mechanic visual. |
| `assets/effects/effect-xp-collect.png` | 128x128 | 3,3-123,127 | 121x125 | 34.6% | Ready. |
| `assets/enemies/enemy-boss-behemoth.png` | 256x256 | 18,34-237,221 | 220x188 | 52.5% | Future-disabled; needs runtime readability review. |
| `assets/enemies/enemy-bulwark.png` | 256x256 | 34,42-226,230 | 193x189 | 41.0% | Future-disabled; needs runtime readability review. |
| `assets/enemies/enemy-crusher.png` | 256x256 | 18,34-237,221 | 220x188 | 55.2% | Future-disabled; needs runtime readability review. |
| `assets/enemies/enemy-harrier.png` | 256x256 | 18,34-237,221 | 220x188 | 44.8% | Future-disabled; needs runtime readability review. |
| `assets/enemies/enemy-hexcaster.png` | 256x256 | 31,50-230,228 | 200x179 | 41.5% | Future-disabled; needs runtime readability review. |
| `assets/enemies/enemy-mauler.png` | 256x256 | 18,38-237,217 | 220x180 | 45.8% | Future-disabled; needs runtime readability review. |
| `assets/enemies/enemy-miniboss-dreadnought.png` | 256x256 | 18,34-237,221 | 220x188 | 55.6% | Future-disabled; needs runtime readability review. |
| `assets/enemies/enemy-overlord.png` | 256x256 | 53,18-202,237 | 150x220 | 36.8% | Future-disabled; narrower silhouette. |
| `assets/enemies/enemy-riftblade.png` | 256x256 | 34,18-221,237 | 188x220 | 45.2% | Future-disabled; needs runtime readability review. |
| `assets/enemies/enemy-scuttler.png` | 256x256 | 18,47-237,208 | 220x162 | 40.4% | Future-disabled; needs runtime readability review. |
| `assets/enemies/enemy-skimmer.png` | 256x256 | 18,34-237,221 | 220x188 | 47.9% | Future-disabled; needs runtime readability review. |
| `assets/enemies/sprite-enemy-boss-behemoth.png` | 256x256 | 27,43-235,237 | 209x195 | 45.0% | Future-disabled; high-risk runtime sprite. |
| `assets/enemies/sprite-enemy-bulwark.png` | 256x256 | 42,40-212,232 | 171x193 | 37.0% | Future-disabled; high-risk runtime sprite. |
| `assets/enemies/sprite-enemy-crusher.png` | 256x256 | 18,34-237,221 | 220x188 | 54.4% | Future-disabled; high-risk runtime sprite. |
| `assets/enemies/sprite-enemy-harrier.png` | 256x256 | 18,34-237,221 | 220x188 | 44.0% | Future-disabled; high-risk runtime sprite. |
| `assets/enemies/sprite-enemy-hexcaster.png` | 256x256 | 45,40-213,233 | 169x194 | 36.5% | Future-disabled; high-risk runtime sprite. |
| `assets/enemies/sprite-enemy-mauler.png` | 256x256 | 19,48-238,235 | 220x188 | 45.6% | Future-disabled; high-risk runtime sprite. |
| `assets/enemies/sprite-enemy-miniboss-dreadnought.png` | 256x256 | 18,34-237,221 | 220x188 | 54.0% | Future-disabled; high-risk runtime sprite. |
| `assets/enemies/sprite-enemy-overlord.png` | 256x256 | 49,52-208,236 | 160x185 | 33.5% | Future-disabled; narrower silhouette. |
| `assets/enemies/sprite-enemy-riftblade.png` | 256x256 | 34,18-221,237 | 188x220 | 45.2% | Future-disabled; high-risk runtime sprite. |
| `assets/enemies/sprite-enemy-scuttler.png` | 256x256 | 31,68-225,226 | 195x159 | 35.4% | Future-disabled; lower vertical occupancy. |
| `assets/enemies/sprite-enemy-skimmer.png` | 256x256 | 18,34-237,221 | 220x188 | 44.8% | Future-disabled; high-risk runtime sprite. |
| `assets/heroes/hero-runner.png` | 256x256 | 2,24-252,237 | 251x214 | 57.0% | Ready. |
| `assets/heroes/hero-shade.png` | 256x256 | 33,7-223,250 | 191x244 | 49.8% | Ready. |
| `assets/heroes/hero-vanguard.png` | 256x256 | 5,39-253,219 | 249x181 | 53.5% | Ready. |
| `assets/heroes/hero-verdant.png` | 256x256 | 46,6-208,251 | 163x246 | 44.3% | Ready; narrower silhouette. |
| `assets/heroes/skin-runner.png` | 256x256 | 27,41-214,231 | 188x191 | 37.3% | Future-disabled player skin. |
| `assets/heroes/skin-shade.png` | 256x256 | 34,18-221,237 | 188x220 | 47.2% | Future-disabled player skin. |
| `assets/heroes/skin-vanguard.png` | 256x256 | 18,34-237,221 | 220x188 | 49.7% | Future-disabled player skin. |
| `assets/heroes/skin-verdant.png` | 256x256 | 34,18-221,237 | 188x220 | 44.8% | Future-disabled player skin. |
| `assets/pickups/pickup-gold-coin.png` | 128x128 | 16,16-111,111 | 96x96 | 45.3% | Ready. |
| `assets/pickups/pickup-health-heart.png` | 128x128 | 13,20-113,107 | 101x88 | 34.9% | Ready. |
| `assets/pickups/pickup-magnet.png` | 128x128 | 10,20-116,107 | 107x88 | 25.8% | Ready. |
| `assets/pickups/pickup-xp-gem-huge.png` | 128x128 | 11,3-116,126 | 106x124 | 52.4% | Ready; runtime size capped. |
| `assets/pickups/pickup-xp-gem-large.png` | 128x128 | 12,4-116,125 | 105x122 | 51.2% | Ready; runtime size capped. |
| `assets/pickups/pickup-xp-gem-medium.png` | 128x128 | 12,3-114,126 | 103x124 | 51.0% | Ready; runtime size capped. |
| `assets/pickups/pickup-xp-gem-small.png` | 128x128 | 16,3-113,126 | 98x124 | 50.3% | Ready; runtime size capped. |
| `assets/projectiles/projectile-arc-bolt.png` | 128x128 | 2,10-126,112 | 125x103 | 44.1% | Ready. |
| `assets/projectiles/projectile-bloom-cannon.png` | 128x128 | 2,30-126,103 | 125x74 | 40.1% | Ready. |
| `assets/projectiles/projectile-ember-lance.png` | 128x128 | 2,29-126,95 | 125x67 | 46.1% | Ready. |
| `assets/projectiles/projectile-enemy-shot.png` | 128x128 | 2,25-126,106 | 125x82 | 41.0% | Ready. |
| `assets/projectiles/projectile-phase-disc.png` | 128x128 | 2,2-127,123 | 126x122 | 70.1% | Ready; watch high coverage. |
| `assets/projectiles/projectile-shatterbell.png` | 128x128 | 3,20-126,109 | 124x90 | 48.3% | Ready. |
| `assets/projectiles/projectile-sunwheel.png` | 128x128 | 2,2-126,126 | 125x125 | 64.1% | Ready; watch high coverage. |
| `assets/projectiles/projectile-twin-fangs.png` | 128x128 | 2,30-125,96 | 124x67 | 30.1% | Ready. |
| `assets/props/prop-risk-altar.png` | 256x256 | 19,21-236,234 | 218x214 | 49.4% | Future-disabled prop. |
| `assets/props/prop-soft-bush.png` | 256x256 | 15,30-239,225 | 225x196 | 49.9% | Future-disabled prop. |
| `assets/props/prop-tiny-shrine.png` | 256x256 | 23,19-232,236 | 210x218 | 47.9% | Future-disabled prop. |
| `assets/props/prop-wobbly-rock.png` | 256x256 | 15,30-239,225 | 225x196 | 48.7% | Future-disabled prop. |
| `assets/tiles/tile-boundary-pebble.png` | 256x256 | 28,118-227,165 | 200x48 | 8.2% | Needs refinement if used visibly. |
| `assets/tiles/tile-ground-blob.png` | 256x256 | 39,71-218,162 | 180x92 | 16.4% | Needs review/refinement before enabling. |
| `assets/ui/ui-button-close.png` | 256x256 | 12,14-241,245 | 230x232 | 36.2% | Ready. |
| `assets/ui/ui-button-play.png` | 256x256 | 40,4-243,253 | 204x250 | 47.3% | Ready. |
| `assets/ui/ui-button-retry.png` | 256x256 | 4,12-255,250 | 252x239 | 39.6% | Ready. |
| `assets/ui/ui-gold.png` | 256x256 | 6,0-251,254 | 246x255 | 71.3% | Ready; watch at larger HUD sizes. |
| `assets/ui/ui-hp.png` | 256x256 | 2,18-253,239 | 252x222 | 56.0% | Ready. |
| `assets/ui/ui-pause.png` | 256x256 | 18,6-231,255 | 214x250 | 63.0% | Ready. |
| `assets/ui/ui-xp.png` | 256x256 | 6,6-247,253 | 242x248 | 63.7% | Ready; watch at larger HUD sizes. |
| `assets/upgrades/branch-arc-bolt-lanebreaker.png` | 256x256 | 24,36-231,219 | 208x184 | 19.6% | Watch: potentially fine/thin at small card sizes. |
| `assets/upgrades/branch-phase-disc-deep-cut.png` | 256x256 | 24,36-230,219 | 207x184 | 19.0% | Watch: potentially fine/thin at small card sizes. |
| `assets/upgrades/branch-sunwheel-outer-ring.png` | 256x256 | 24,36-230,219 | 207x184 | 19.6% | Watch: potentially fine/thin at small card sizes. |
| `assets/upgrades/branch-twin-fangs-serrated-stream.png` | 256x256 | 23,36-231,219 | 209x184 | 18.7% | Watch: potentially fine/thin at small card sizes. |
| `assets/upgrades/signature-arc-bolt-volt-volley.png` | 256x256 | 23,23-231,231 | 209x209 | 27.5% | Future-disabled; likely usable. |
| `assets/upgrades/signature-bloom-cannon-bramble-fan.png` | 256x256 | 23,24-231,231 | 209x208 | 26.1% | Future-disabled; likely usable. |
| `assets/upgrades/signature-ember-lance-sundering-tip.png` | 256x256 | 23,23-231,231 | 209x209 | 24.7% | Future-disabled; likely usable. |
| `assets/upgrades/signature-phase-disc-rift-array.png` | 256x256 | 23,24-231,230 | 209x207 | 26.3% | Future-disabled; likely usable. |
| `assets/upgrades/signature-shatterbell-aftershock.png` | 256x256 | 23,24-231,230 | 209x207 | 27.4% | Future-disabled; likely usable. |
| `assets/upgrades/signature-sunwheel-corona-lattice.png` | 256x256 | 23,24-231,230 | 209x207 | 27.5% | Future-disabled; likely usable. |
| `assets/upgrades/signature-twin-fangs-ripper-line.png` | 256x256 | 23,24-231,231 | 209x208 | 25.3% | Future-disabled; likely usable. |
| `assets/upgrades/upgrade-magnet.png` | 256x256 | 23,36-231,219 | 209x184 | 30.2% | Future-disabled; likely usable. |
| `assets/upgrades/upgrade-power.png` | 256x256 | 23,36-231,219 | 209x184 | 40.6% | Future-disabled; likely usable. |
| `assets/upgrades/upgrade-rapid-fire.png` | 256x256 | 23,36-231,219 | 209x184 | 32.7% | Future-disabled; likely usable. |
| `assets/upgrades/upgrade-reach.png` | 256x256 | 23,36-231,219 | 209x184 | 19.8% | Watch: potentially fine/thin at small card sizes. |
| `assets/upgrades/upgrade-swiftness.png` | 256x256 | 59,64-212,213 | 154x150 | 20.3% | Watch: smaller visible drawing. |
| `assets/upgrades/upgrade-unlock-bloom-cannon.png` | 256x256 | 40,35-215,218 | 176x184 | 18.1% | Watch: potentially fine/thin at small card sizes. |
| `assets/upgrades/upgrade-unlock-ember-lance.png` | 256x256 | 40,35-216,218 | 177x184 | 18.0% | Watch: potentially fine/thin at small card sizes. |
| `assets/upgrades/upgrade-unlock-phase-disc.png` | 256x256 | 40,36-215,218 | 176x183 | 17.5% | Watch: potentially fine/thin at small card sizes. |
| `assets/upgrades/upgrade-unlock-shatterbell.png` | 256x256 | 40,36-215,218 | 176x183 | 17.3% | Watch: potentially fine/thin at small card sizes. |
| `assets/upgrades/upgrade-unlock-sunwheel.png` | 256x256 | 40,36-216,219 | 177x184 | 17.9% | Watch: potentially fine/thin at small card sizes. |
| `assets/upgrades/upgrade-unlock-twin-fangs.png` | 256x256 | 39,36-215,218 | 177x183 | 17.5% | Watch: potentially fine/thin at small card sizes. |
| `assets/upgrades/upgrade-velocity.png` | 256x256 | 23,36-231,219 | 209x184 | 37.5% | Future-disabled; likely usable. |
| `assets/upgrades/upgrade-vitality.png` | 256x256 | 23,36-231,219 | 209x184 | 37.4% | Future-disabled; likely usable. |
| `assets/weapons/weapon-arc-bolt.png` | 128x128 | 0,5-127,114 | 128x110 | 20.7% | Ready; line art is readable in HUD. |
| `assets/weapons/weapon-bloom-cannon.png` | 128x128 | 1,16-126,107 | 126x92 | 52.8% | Ready. |
| `assets/weapons/weapon-ember-lance.png` | 128x128 | 1,19-127,106 | 127x88 | 62.7% | Ready. |
| `assets/weapons/weapon-phase-disc.png` | 128x128 | 4,5-126,122 | 123x118 | 63.0% | Ready. |
| `assets/weapons/weapon-shatterbell.png` | 128x128 | 3,5-125,125 | 123x121 | 75.7% | Ready; watch high coverage. |
| `assets/weapons/weapon-sunwheel.png` | 128x128 | 8,2-124,126 | 117x125 | 56.7% | Ready. |
| `assets/weapons/weapon-twin-fangs.png` | 128x128 | 14,3-117,125 | 104x123 | 51.5% | Ready. |
