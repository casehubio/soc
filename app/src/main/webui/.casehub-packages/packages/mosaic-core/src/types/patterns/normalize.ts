import type { PatternCategoryName } from './categories.js';

export function normalizePatternType(wire: string): PatternCategoryName {
  return wire.toLowerCase() as PatternCategoryName;
}
