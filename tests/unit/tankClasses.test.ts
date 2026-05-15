import {
  BASIC_TANK_CLASS_ID,
  TANK_CLASS_DEFINITIONS,
  TANK_CLASS_EVOLUTION_LEVEL,
  canSelectTankClass,
  getAvailableTankClassChoices,
} from '../../src/game/data/tankClasses';

describe('tank class definitions', () => {
  test('defines the basic starter class', () => {
    expect(TANK_CLASS_DEFINITIONS.basic).toMatchObject({
      id: 'basic',
      title: 'Basic',
      unlockLevel: 1,
    });
    expect(BASIC_TANK_CLASS_ID).toBe('basic');
  });

  test('unlocks branch choices at the evolution threshold', () => {
    const choices = getAvailableTankClassChoices({
      level: TANK_CLASS_EVOLUTION_LEVEL,
      currentClassId: 'basic',
      classChoiceConsumed: false,
    });

    expect(choices.map((choice) => choice.id)).toEqual(['twin', 'sniper']);
  });

  test('does not allow class selection before the threshold', () => {
    expect(
      canSelectTankClass({
        classId: 'twin',
        level: TANK_CLASS_EVOLUTION_LEVEL - 1,
        currentClassId: 'basic',
        classChoiceConsumed: false,
      }),
    ).toBe(false);
  });

  test('does not expose choices after a class has been selected', () => {
    expect(
      getAvailableTankClassChoices({
        level: TANK_CLASS_EVOLUTION_LEVEL + 1,
        currentClassId: 'twin',
        classChoiceConsumed: true,
      }),
    ).toEqual([]);
  });

  test('rejects invalid class ids', () => {
    expect(
      canSelectTankClass({
        classId: 'rocket',
        level: TANK_CLASS_EVOLUTION_LEVEL,
        currentClassId: 'basic',
        classChoiceConsumed: false,
      }),
    ).toBe(false);
  });
});
