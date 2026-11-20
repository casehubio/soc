import type { AvatarModifiers, AxisExpression } from './types.js';

type Axis = 'intensity' | 'temperament' | 'energy' | 'precision' | 'organic';

const ADJECTIVE_MAP: Record<string, Partial<Record<Axis, number>>> = {
  meticulous:   { precision: 0.8 },
  precise:      { precision: 0.6 },
  methodical:   { precision: 0.5 },
  careful:      { precision: 0.4 },
  gentle:       { intensity: -0.6 },
  calm:         { intensity: -0.4, energy: -0.3 },
  soft:         { intensity: -0.3 },
  fierce:       { intensity: 0.8 },
  bold:         { intensity: 0.5 },
  aggressive:   { intensity: 0.7 },
  energetic:    { energy: 0.7 },
  lively:       { energy: 0.5 },
  dynamic:      { energy: 0.4 },
  sluggish:     { energy: -0.5 },
  warm:         { temperament: 0.5 },
  cold:         { temperament: -0.5 },
  friendly:     { temperament: 0.4 },
  stern:        { temperament: -0.4 },
  organic:      { organic: 0.6 },
  natural:      { organic: 0.4 },
  mechanical:   { organic: -0.6 },
  rigid:        { organic: -0.4 },
};

export interface ModifierInput {
  readonly adjectives?: readonly string[];
  readonly canonicalAxes?: Record<string, AxisExpression>;
}

export function resolveModifiers(input: ModifierInput): AvatarModifiers {
  let intensity = 0;
  let temperament = 0;
  let energy = 0;
  let precision = 0;
  let organic = 0;
  const expression: Record<string, string> = {};

  if (input.adjectives) {
    for (const adj of input.adjectives) {
      const mapping = ADJECTIVE_MAP[adj.toLowerCase()];
      if (mapping) {
        intensity += mapping.intensity ?? 0;
        temperament += mapping.temperament ?? 0;
        energy += mapping.energy ?? 0;
        precision += mapping.precision ?? 0;
        organic += mapping.organic ?? 0;
      }
    }
  }

  if (input.canonicalAxes) {
    for (const [axis, val] of Object.entries(input.canonicalAxes)) {
      expression[axis] = val.term;
    }
  }

  return { intensity, temperament, energy, precision, organic, expression };
}
