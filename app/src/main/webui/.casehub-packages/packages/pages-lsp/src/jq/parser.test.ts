import { describe, it, expect } from 'vitest';
import { validateJqExpression } from './parser.js';

describe('validateJqExpression', () => {
  it('accepts valid path expression', () => {
    expect(validateJqExpression('.name')).toEqual([]);
  });

  it('accepts pipe chain', () => {
    expect(validateJqExpression('.items | map(.price)')).toEqual([]);
  });

  it('accepts comparison', () => {
    expect(validateJqExpression('.severity == "high"')).toEqual([]);
  });

  it('accepts empty expression', () => {
    expect(validateJqExpression('')).toEqual([]);
  });

  it('accepts select expression', () => {
    expect(validateJqExpression('.[] | select(.active == true)')).toEqual([]);
  });

  it('rejects invalid pipe sequence', () => {
    const errors = validateJqExpression('.items ||| bad');
    expect(errors.length).toBeGreaterThan(0);
  });
});
