import { describe, it, expect } from 'vitest';
import { resolveModifiers } from '../modifiers.js';

describe('resolveModifiers', () => {
  it('returns neutral modifiers for empty input', () => {
    const mods = resolveModifiers({});
    expect(mods.intensity).toBe(0);
    expect(mods.temperament).toBe(0);
    expect(mods.energy).toBe(0);
    expect(mods.precision).toBe(0);
    expect(mods.organic).toBe(0);
  });

  it('maps "meticulous" to positive precision', () => {
    const mods = resolveModifiers({ adjectives: ['meticulous'] });
    expect(mods.precision).toBeGreaterThan(0);
  });

  it('maps "gentle" to negative intensity', () => {
    const mods = resolveModifiers({ adjectives: ['gentle'] });
    expect(mods.intensity).toBeLessThan(0);
  });

  it('maps "energetic" to positive energy', () => {
    const mods = resolveModifiers({ adjectives: ['energetic'] });
    expect(mods.energy).toBeGreaterThan(0);
  });

  it('maps canonical axes to expression', () => {
    const mods = resolveModifiers({
      canonicalAxes: { ruleFollowing: { term: 'strict', weight: 1.0 } },
    });
    expect(mods.expression.ruleFollowing).toBe('strict');
  });

  it('combines multiple adjectives', () => {
    const mods = resolveModifiers({ adjectives: ['meticulous', 'gentle'] });
    expect(mods.precision).toBeGreaterThan(0);
    expect(mods.intensity).toBeLessThan(0);
  });
});
