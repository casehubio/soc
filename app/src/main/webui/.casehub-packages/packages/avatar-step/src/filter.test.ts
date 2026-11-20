import { describe, it, expect } from 'vitest';
import { getCompatibleArchetypes, getValidFrameworkValues, getValidBigFivePoles } from './filter.js';

describe('getCompatibleArchetypes', () => {
  it('returns all 48 as strong when no filters', () => {
    const result = getCompatibleArchetypes({}, {});
    expect(result.size).toBe(48);
    for (const tier of result.values()) {
      expect(tier).toBe('strong');
    }
  });

  it('narrows to 3 families (12 archetypes) for MBTI=INTJ', () => {
    const result = getCompatibleArchetypes({ mbti: 'INTJ' }, {});
    const compatible = [...result.entries()].filter(([, t]) => t !== 'incompatible');
    const incompatible = [...result.entries()].filter(([, t]) => t === 'incompatible');
    expect(compatible).toHaveLength(12);
    expect(incompatible).toHaveLength(36);
  });

  it('intersects MBTI=INTJ + Enneagram=Type 5 to Sage + Magician', () => {
    const result = getCompatibleArchetypes(
      { mbti: 'INTJ', enneagram: 'Type 5' }, {}
    );
    const compatible = [...result.entries()].filter(([, t]) => t !== 'incompatible');
    const families = new Set(compatible.map(([k]) => k.split('/')[0]));
    expect(families).toEqual(new Set(['Sage', 'Magician']));
  });

  it('marks sub-archetype with MBTI affinity as strong', () => {
    const result = getCompatibleArchetypes({ mbti: 'INTJ', enneagram: 'Type 5' }, {});
    expect(result.get('Sage/Detective')).toBe('strong');
  });

  it('marks sub-archetype without affinity as weak', () => {
    // Magician/Innovator: MBTI affinity ENTP,ENTJ,ENFP (not INTJ), Enneagram 7,3 (not 5)
    const result = getCompatibleArchetypes({ mbti: 'INTJ', enneagram: 'Type 5' }, {});
    expect(result.get('Magician/Innovator')).toBe('weak');
  });

  it('handles Big Five selections', () => {
    // High O → Creator, Explorer, Magician, Rebel; Low C → Jester, Rebel, Explorer
    // Intersection → Explorer, Rebel
    const result = getCompatibleArchetypes({}, { O: 'high', C: 'low' });
    const compatible = [...result.entries()].filter(([, t]) => t !== 'incompatible');
    const families = new Set(compatible.map(([k]) => k.split('/')[0]));
    expect(families.has('Explorer')).toBe(true);
    expect(families.has('Rebel')).toBe(true);
    expect(families.has('Sage')).toBe(false);
  });

  it('conflicting selections produce empty intersection', () => {
    // INTJ → Sage, Magician, Sovereign; Type 7 → Jester, Explorer, Innocent — no overlap
    const result = getCompatibleArchetypes(
      { mbti: 'INTJ', enneagram: 'Type 7' }, {}
    );
    const compatible = [...result.entries()].filter(([, t]) => t !== 'incompatible');
    expect(compatible).toHaveLength(0);
  });
});

describe('getValidFrameworkValues', () => {
  it('all 16 MBTI values valid when no other selections', () => {
    const valid = getValidFrameworkValues('mbti', {}, {});
    expect(valid).toHaveLength(16);
  });

  it('disables conflicting MBTI values when Enneagram selected', () => {
    const valid = getValidFrameworkValues('mbti', { enneagram: 'Type 7' }, {});
    expect(valid.length).toBeLessThan(16);
    expect(valid).toContain('ENFP');
    expect(valid).not.toContain('INTJ');
  });
});

describe('getValidBigFivePoles', () => {
  it('both poles valid when no other selections', () => {
    const valid = getValidBigFivePoles('O', {}, {});
    expect(valid.has('high')).toBe(true);
    expect(valid.has('low')).toBe(true);
    expect(valid.has(null)).toBe(true);
  });

  it('restricts poles when frameworks narrow families', () => {
    const valid = getValidBigFivePoles('O', {}, { C: 'low' });
    expect(valid.has('high')).toBe(true);
    expect(valid.has(null)).toBe(true);
  });
});
