import { describe, it, expect } from 'vitest';
import { ConditionEvaluator } from './condition-evaluator.js';

describe('ConditionEvaluator', () => {
  it('evaluates truthy strings via isTruthy', () => {
    const eval_ = new ConditionEvaluator(() => false);
    expect(eval_.evaluate('true')).toBe(true);
    expect(eval_.evaluate('false')).toBe(false);
    expect(eval_.evaluate('yes')).toBe(true);
    expect(eval_.evaluate('no')).toBe(false);
  });

  it('falls back to delegate for non-boolean strings', () => {
    const eval_ = new ConditionEvaluator((expr) => expr === 'x > 5');
    expect(eval_.evaluate('x > 5')).toBe(true);
    expect(eval_.evaluate('x < 5')).toBe(false);
  });
});
