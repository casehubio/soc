import { describe, it, expect } from 'vitest';
import {
  matches, valuePattern, structuralPattern, anyOfPattern, defaultPattern,
} from './match.js';

describe('MatchPattern', () => {
  describe('ValuePattern', () => {
    it('matches equal scalar', () => {
      expect(matches(valuePattern('ACTIVE'), 'ACTIVE')).toBe(true);
      expect(matches(valuePattern('ACTIVE'), 'SUSPENDED')).toBe(false);
    });

    it('matches integer', () => {
      expect(matches(valuePattern(42), 42)).toBe(true);
      expect(matches(valuePattern(42), 43)).toBe(false);
    });

    it('matches null', () => {
      expect(matches(valuePattern(null), null)).toBe(true);
      expect(matches(valuePattern(null), 'x')).toBe(false);
    });
  });

  describe('StructuralPattern', () => {
    it('matches subset of map', () => {
      const pattern = structuralPattern({ type: 'trade' });
      expect(matches(pattern, { type: 'trade', amount: 1000 })).toBe(true);
      expect(matches(pattern, { type: 'settlement' })).toBe(false);
    });

    it('rejects non-object', () => {
      const pattern = structuralPattern({ type: 'trade' });
      expect(matches(pattern, 'not a map')).toBe(false);
      expect(matches(pattern, null)).toBe(false);
      expect(matches(pattern, [1, 2])).toBe(false);
    });

    it('empty pattern matches any map', () => {
      const pattern = structuralPattern({});
      expect(matches(pattern, { a: 1 })).toBe(true);
      expect(matches(pattern, {})).toBe(true);
    });

    it('missing field does not match', () => {
      const pattern = structuralPattern({ type: 'trade', priority: 'HIGH' });
      expect(matches(pattern, { type: 'trade' })).toBe(false);
    });
  });

  describe('AnyOfPattern', () => {
    it('matches single value in list', () => {
      expect(matches(anyOfPattern(['ACTIVE']), 'ACTIVE')).toBe(true);
    });

    it('matches value at any position', () => {
      const pattern = anyOfPattern(['a', 'b', 'c']);
      expect(matches(pattern, 'a')).toBe(true);
      expect(matches(pattern, 'b')).toBe(true);
      expect(matches(pattern, 'c')).toBe(true);
    });

    it('no match when value not in list', () => {
      expect(matches(anyOfPattern(['a', 'b']), 'z')).toBe(false);
    });

    it('mixed types', () => {
      const pattern = anyOfPattern(['x', 42]);
      expect(matches(pattern, 'x')).toBe(true);
      expect(matches(pattern, 42)).toBe(true);
      expect(matches(pattern, 99)).toBe(false);
    });

    it('empty values list never matches', () => {
      expect(matches(anyOfPattern([]), 'anything')).toBe(false);
    });

    it('matches null when null is in values', () => {
      expect(matches(anyOfPattern([null, 'a']), null)).toBe(true);
      expect(matches(anyOfPattern(['a', 'b']), null)).toBe(false);
    });
  });

  describe('DefaultPattern', () => {
    it('matches everything', () => {
      expect(matches(defaultPattern(), 'anything')).toBe(true);
      expect(matches(defaultPattern(), null)).toBe(true);
      expect(matches(defaultPattern(), {})).toBe(true);
      expect(matches(defaultPattern(), 42)).toBe(true);
    });
  });
});
