# Normal enemy tuning (R3E)

Owner playtesting starting values; change the centralized configuration, not entity movement code.

| Enemy | Base speed (px/s) |
| --- | ---: |
| Scuttler | 135 |
| Skimmer | 158 |
| Harrier | 178 |
| Mauler | 106 |
| Crusher | 101 |
| Bulwark | 74 |
| Hexcaster | 95 |

- `src/game/config/enemyBalance.ts`: `ENEMY_ARCHETYPE_STAT_BALANCE.<id>.speed` feeds `data/enemies.ts` and entity movement. Existing timed/event scaling still applies; no extra multiplier was added.
- The same file owns `ENEMY_SPAWN_INTERVAL_MS` (1900 ms, consumed by RunScene's regular wave timer) and `ENEMY_ACTIVE_CAP` (22). The cap budgets normal spawns against the existing total live enemy count, so an active major encounter can further reduce ordinary pressure. Mandatory elites/minibosses bypass that budget; boss arrival uses the separate stage transition. Formation and event pressure also use the cap.
- `src/game/config/waveDirectorBalance.ts`: `WAVE_DIRECTOR_WINDOWS` owns time windows, compositions, weighted flex/fallback pools, min/max wave sizes, ranged limits and density scaling. All are unchanged in R3E.
- `src/game/config/enemyBehaviorBalance.ts`: role behavior parameters, including Crusher's independent `CHARGER_DASH_SPEED` of 760 px/s. R3E changes only its chase speed. `CHARGER_VELOCITY_CAP_BASE_SPEED` retains the old 112 px/s baseline for Phaser's per-axis cap (336 at stack zero), including existing timed/event scaling and rounding. This prevents the lower chase speed from indirectly slowing the dash; the 760 px/s commanded dash, effective cap, and timing remain unchanged.

Elite/miniboss/boss statistics, encounter schedule constants, attack contracts, XP, rewards, player and weapon statistics are unchanged. Scheduled elites/minibosses are still checked on the regular wave tick, so actual appearance is quantized to the now-1900 ms tick; their deadline/interval configuration is unchanged. Boss arrival is checked separately by the stage director.

Validation: `npm test`, `npm run build`, `git diff --check`. No gameplay E2E for this sprint. Owner playtesting should assess early escape space, later wave density and all major encounters before further tuning.
