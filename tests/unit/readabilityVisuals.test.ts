import { ENEMY_ARCHETYPES } from '../../src/game/data/enemies';
import {
  getEnemyProjectileVisual,
  getEnemyXpReward,
  getXpGemVisual,
  resolveProjectileVisual,
} from '../../src/game/systems/readabilityVisuals';

describe('readability visuals', () => {
  test('enemy projectile visuals always contain red danger color', () => {
    const visual = getEnemyProjectileVisual(0x22d3ee);

    expect(visual.faction).toBe('enemy');
    expect(visual.containsRed).toBe(true);
    expect(visual.dangerColor).toBe(0xff3344);
    expect(visual.fillColor).toBe(0xff3344);
  });

  test('player projectile visuals keep weapon color instead of enemy red override', () => {
    const visual = resolveProjectileVisual({
      faction: 'player',
      baseColor: 0x60a5fa,
      strokeColor: 0xdbeafe,
    });

    expect(visual.faction).toBe('player');
    expect(visual.fillColor).toBe(0x60a5fa);
    expect(visual.dangerColor).toBeNull();
    expect(visual.containsRed).toBe(false);
  });

  test('enemy XP rewards stay archetype driven and preserve role differences', () => {
    expect(getEnemyXpReward(ENEMY_ARCHETYPES.scuttler)).toBeLessThan(getEnemyXpReward(ENEMY_ARCHETYPES.hexcaster));
    expect(getEnemyXpReward(ENEMY_ARCHETYPES.hexcaster)).toBeLessThan(getEnemyXpReward(ENEMY_ARCHETYPES.overlord));
    expect(getEnemyXpReward(ENEMY_ARCHETYPES.dreadnought)).toBeLessThan(getEnemyXpReward(ENEMY_ARCHETYPES.behemoth));
  });

  test('XP gem tiers use distinct non-red readable colors by value', () => {
    const small = getXpGemVisual(5);
    const medium = getXpGemVisual(12);
    const large = getXpGemVisual(34);
    const huge = getXpGemVisual(96);

    expect(small.tier).toBe('small');
    expect(medium.tier).toBe('medium');
    expect(large.tier).toBe('large');
    expect(huge.tier).toBe('huge');
    expect(new Set([small.fillColor, medium.fillColor, large.fillColor, huge.fillColor]).size).toBe(4);
    expect([small, medium, large, huge].every((visual) => !isDangerRed(visual.fillColor))).toBe(true);
  });
});

function isDangerRed(color: number): boolean {
  const red = (color >> 16) & 0xff;
  const green = (color >> 8) & 0xff;
  const blue = color & 0xff;
  return red >= 180 && green <= 140 && blue <= 150 && red >= green + 40 && red >= blue + 40;
}
