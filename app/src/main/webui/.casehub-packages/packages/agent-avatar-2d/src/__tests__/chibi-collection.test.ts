import { describe, it, expect } from 'vitest';
import { chibiCollection } from '../collections/chibi/index.js';
import { ARCHETYPE_CONFIGS } from '../config-table.js';

describe('chibi collection', () => {
  it('is a fixed collection', () => {
    expect(chibiCollection.type).toBe('fixed');
  });

  it('has label "Chibi"', () => {
    expect(chibiCollection.label).toBe('Chibi');
  });

  it('has 48 SVGs', () => {
    expect(chibiCollection.fixedSvgs.size).toBe(48);
  });

  it('every archetype key has an SVG', () => {
    for (const key of Object.keys(ARCHETYPE_CONFIGS)) {
      expect(chibiCollection.fixedSvgs.has(key),
        `Missing SVG for ${key}`).toBe(true);
    }
  });

  it('SVGs contain valid SVG content', () => {
    for (const [key, svg] of chibiCollection.fixedSvgs) {
      expect(svg, `${key} missing <svg`).toContain('<svg');
      expect(svg, `${key} missing </svg>`).toContain('</svg>');
    }
  });
});
