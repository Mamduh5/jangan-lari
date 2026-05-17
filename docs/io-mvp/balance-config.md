# Balance Config Guide

This document maps where to tune gameplay numbers and why client config is not security.

## Config ownership rules

- **Player/progression balance**: `src/game/config/playerBalance.ts`
  - Base player stats: speed, max HP, hit flash, pickup range, XP thresholds
  - Core upgrade effect values: vitality regen, swiftness speed, power damage, rapid-fire cooldown reduction, velocity projectile speed, magnet pickup range, reach weapon range
  - Permanent upgrade effect values: max HP, move speed, pickup range, starting damage, HP regen per level

- **Enemy/spawn/scaling balance**: `src/game/config/enemyBalance.ts`
  - Spawn interval, active cap, safe radii, spawn attempts
  - Time-based scaling intervals, max stack, per-stack multipliers
  - Miniboss and elite spawn timing
  - Spawn director stage timing (opening, early ramp, first elite)
  - Wave template alert cooldown

- **Boss/miniboss/event balance**: `src/game/config/bossBalance.ts`
  - Boss spawn time, run target duration, active delta cap
  - Boss health, phase thresholds, phase-2 multipliers
  - Boss shockwave radius, telegraph, damage active window, cooldown
  - Boss summon timing, batch size, cap, stat multipliers
  - Miniboss line-strike and volley geometry/timing

- **Weapon/reward balance**: `src/game/config/rewardBalance.ts`
  - XP gem attract speed
  - Neutral shape spawn count, interval, padding, safe radius
  - Level-up flash and auto-pick timing
  - Gold reward base, per-level, per-kill step, victory bonus
  - Run event windows and durations (reward target, challenge wave)
  - Event enemy stat/speed multipliers
  - First elite XP bonus

- **Global runtime constants**: `src/game/config/constants.ts`
  - Game/world dimensions, camera overscroll padding
  - Audio defaults
  - Hit shake visual feedback
  - Re-exports from grouped balance files for backward compatibility

- **Data tables**: `src/game/data/enemies.ts`, `weapons.ts`, `upgrades.ts`, `tankStats.ts`, `permanentUpgrades.ts`
  - Enemy archetype definitions remain in `enemies.ts`
  - Weapon definitions remain in `weapons.ts`
  - Upgrade descriptions now import effect values from `playerBalance.ts` so they stay in sync with `RunScene` logic
  - Stat definitions remain in `tankStats.ts`
  - Permanent upgrade descriptions now import effect values from `playerBalance.ts`

## What should not be hardcoded in scenes

- Any gameplay number that affects damage, health, speed, XP, gold, or spawn timing
- Upgrade effect values
- Permanent upgrade effect values
- Elite/BOSS XP bonuses
- Wave alert cooldowns
- Stage timing values

Scenes should orchestrate gameplay, not own tunable balance numbers.

## Why client config is not anti-cheat security

Client-side constants are visible in source and easily modified by anyone with browser dev tools. Do not hide values for anti-cheat purposes. Future multiplayer security must come from authoritative server logic that validates movement, damage, kills, XP, stat points, class unlocks, score, and leaderboard entries. The current single-player runtime is client-authoritative by design.

## Future multiplayer must move authority to server

When multiplayer is added:
- Clients send input commands and requested stat/class choices
- A room server owns movement validity, projectile spawning, collisions, damage, XP, stat/class validation, score, run completion, and leaderboard eligibility
- Clients must not be trusted for final position, damage, kills, XP, stat points, class unlocks, score, best score, or leaderboard entries
