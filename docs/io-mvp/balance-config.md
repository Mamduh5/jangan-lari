# Balance Config Guide

This document maps where to tune gameplay numbers and why client config is not security.

## Config ownership rules

- **Player/progression balance**: `src/game/config/playerBalance.ts`
  - Base player stats: speed, max HP, hit flash, pickup range, XP thresholds
  - Core upgrade effect values: vitality regen, swiftness speed, power damage, rapid-fire cooldown reduction, velocity projectile speed, magnet pickup range, reach weapon range
  - Permanent upgrade effect values: max HP, move speed, pickup range, starting damage, HP regen per level

- **World/map balance**: `src/game/config/worldBalance.ts`
  - Virtual game size remains 1600x720
  - Current world size and camera overscroll padding
  - Spawn bounds padding and normal/boss/summon spawn distances

- **Enemy/spawn/scaling balance**: `src/game/config/enemyBalance.ts`
  - Spawn interval, active cap, safe radii, spawn attempts
  - Time-based scaling intervals, max stack, per-stack multipliers
  - Miniboss and elite spawn timing

- **Wave director balance**: `src/game/config/waveDirectorBalance.ts`
  - Enemy role tags
  - Time windows and unlock timing
  - Wave templates, role bundles, weights, min/max counts, ranged caps, and density scaling
  - Formation enable timing, cooldown, retry timing, and wave-template alert cooldown

- **Boss/miniboss/event balance**: `src/game/config/bossBalance.ts`
  - Boss spawn time, run target duration, active delta cap
  - Boss health, speed, contact damage, dash timing, phase thresholds, phase-2 multipliers
  - Boss shockwave radius, telegraph, damage active window, cooldown
  - Boss state sequences, crossfire projectiles, summon compositions, summon timing, batch size, cap, stat multipliers
  - Miniboss line-strike and volley geometry/timing

- **Map event balance**: `src/game/config/mapEventBalance.ts`
  - Power Core earliest time, interval, duration, radius, claim radius, and placement safety
  - Power Core buff type, buff duration, shield duration, Pulse cooldown refund, visual colors, and pressure enemy composition

- **Weapon/reward balance**: `src/game/config/rewardBalance.ts`
  - XP gem attract speed
  - Neutral shape spawn count, interval, padding, safe radius
  - Level-up flash and auto-pick timing
  - Gold reward base, per-level, per-kill step, victory bonus
  - Run event windows and durations (reward target, challenge wave)
  - Event enemy stat/speed multipliers
  - First elite XP bonus

- **Global runtime constants**: `src/game/config/constants.ts`
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
- World/camera bounds
- Map event placement, rewards, buff values, or pressure enemies
- Boss state timing, summon composition, crossfire values, HP, damage, speed, or attack cooldowns

Scenes should orchestrate gameplay, not own tunable balance numbers.

## Why client config is not anti-cheat security

Client-side constants are visible in source and easily modified by anyone with browser dev tools. Do not hide values for anti-cheat purposes. Future multiplayer security must come from authoritative server logic that validates movement, damage, kills, XP, stat points, class unlocks, score, and leaderboard entries. The current single-player runtime is client-authoritative by design.

## Future multiplayer must move authority to server

When multiplayer is added:
- Clients send input commands and requested stat/class choices
- A room server owns movement validity, projectile spawning, collisions, damage, XP, stat/class validation, score, run completion, and leaderboard eligibility
- Clients must not be trusted for final position, damage, kills, XP, stat points, class unlocks, score, best score, or leaderboard entries
