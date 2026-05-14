export type NeutralShapeKind = 'square' | 'triangle' | 'pentagon';

export type NeutralShapeDefinition = {
  kind: NeutralShapeKind;
  label: string;
  maxHealth: number;
  xpValue: number;
  size: number;
  sides: number;
  rotationDeg: number;
  fillColor: number;
  strokeColor: number;
  weight: number;
};

export const NEUTRAL_SHAPE_DEFINITIONS: Record<NeutralShapeKind, NeutralShapeDefinition> = {
  square: {
    kind: 'square',
    label: 'Square',
    maxHealth: 30,
    xpValue: 3,
    size: 32,
    sides: 4,
    rotationDeg: 45,
    fillColor: 0xfacc15,
    strokeColor: 0xfef9c3,
    weight: 58,
  },
  triangle: {
    kind: 'triangle',
    label: 'Triangle',
    maxHealth: 54,
    xpValue: 5,
    size: 38,
    sides: 3,
    rotationDeg: -90,
    fillColor: 0xf97316,
    strokeColor: 0xffedd5,
    weight: 30,
  },
  pentagon: {
    kind: 'pentagon',
    label: 'Pentagon',
    maxHealth: 110,
    xpValue: 8,
    size: 48,
    sides: 5,
    rotationDeg: -90,
    fillColor: 0x60a5fa,
    strokeColor: 0xdbeafe,
    weight: 12,
  },
};

export const NEUTRAL_SHAPE_LIST: NeutralShapeDefinition[] = [
  NEUTRAL_SHAPE_DEFINITIONS.square,
  NEUTRAL_SHAPE_DEFINITIONS.triangle,
  NEUTRAL_SHAPE_DEFINITIONS.pentagon,
];

export function getNeutralShapeDefinition(kind: NeutralShapeKind): NeutralShapeDefinition {
  return NEUTRAL_SHAPE_DEFINITIONS[kind];
}

export function chooseNeutralShapeKind(
  roll: number,
  definitions: NeutralShapeDefinition[] = NEUTRAL_SHAPE_LIST,
): NeutralShapeKind {
  const totalWeight = definitions.reduce((sum, definition) => sum + Math.max(0, definition.weight), 0);

  if (totalWeight <= 0) {
    return definitions[0]?.kind ?? 'square';
  }

  const threshold = Math.min(Math.max(roll, 0), 0.999999) * totalWeight;
  let cursor = 0;

  for (const definition of definitions) {
    cursor += Math.max(0, definition.weight);
    if (threshold < cursor) {
      return definition.kind;
    }
  }

  return definitions[definitions.length - 1]?.kind ?? 'square';
}
