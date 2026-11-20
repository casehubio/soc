import { describe, it, expect } from 'vitest';
import { isTokenLeaf } from './types.js';

describe('isTokenLeaf', () => {
  it('returns true for valid TokenLeaf', () => {
    expect(isTokenLeaf({ $value: 'oklch(50% 0.1 210)', $type: 'color' })).toBe(true);
  });

  it('returns false for TokenMap group', () => {
    expect(isTokenLeaf({ accent: { $value: 'x', $type: 'color' } })).toBe(false);
  });

  it('returns false for null', () => {
    expect(isTokenLeaf(null)).toBe(false);
  });

  it('returns false for primitives', () => {
    expect(isTokenLeaf('hello')).toBe(false);
    expect(isTokenLeaf(42)).toBe(false);
  });
});
