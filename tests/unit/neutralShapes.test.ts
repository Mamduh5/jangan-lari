import {
  NEUTRAL_SHAPE_DEFINITIONS,
  chooseNeutralShapeKind,
  getNeutralShapeDefinition,
} from '../../src/game/data/neutralShapes';

describe('neutral shape definitions', () => {
  test('defines readable shape tiers with increasing durability and XP', () => {
    expect(getNeutralShapeDefinition('square')).toMatchObject({
      kind: 'square',
      maxHealth: 30,
      xpValue: 3,
    });
    expect(NEUTRAL_SHAPE_DEFINITIONS.triangle.maxHealth).toBeGreaterThan(NEUTRAL_SHAPE_DEFINITIONS.square.maxHealth);
    expect(NEUTRAL_SHAPE_DEFINITIONS.pentagon.xpValue).toBeGreaterThan(NEUTRAL_SHAPE_DEFINITIONS.triangle.xpValue);
  });

  test('chooses shape kinds from weighted rolls deterministically', () => {
    expect(chooseNeutralShapeKind(0)).toBe('square');
    expect(chooseNeutralShapeKind(0.57)).toBe('square');
    expect(chooseNeutralShapeKind(0.581)).toBe('triangle');
    expect(chooseNeutralShapeKind(0.88)).toBe('pentagon');
    expect(chooseNeutralShapeKind(1)).toBe('pentagon');
  });

  test('falls back safely when custom weights are empty', () => {
    expect(chooseNeutralShapeKind(0.5, [{ ...NEUTRAL_SHAPE_DEFINITIONS.triangle, weight: 0 }])).toBe('triangle');
  });
});
