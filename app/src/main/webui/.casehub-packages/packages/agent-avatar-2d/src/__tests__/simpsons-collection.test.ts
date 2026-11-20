import { describe, it, expect } from 'vitest';
import { simpsonsCollection } from '../collections/simpsons/index.js';
import { ARCHETYPE_CONFIGS } from '../config-table.js';

describe('simpsons collection', () => {
  it('is a fixed collection', () => {
    expect(simpsonsCollection.type).toBe('fixed');
  });

  it('has label "Donut Creek"', () => {
    expect(simpsonsCollection.label).toBe('Donut Creek');
  });

  it('has 48 SVGs', () => {
    expect(simpsonsCollection.fixedSvgs.size).toBe(48);
  });

  it('every archetype key has an SVG', () => {
    for (const key of Object.keys(ARCHETYPE_CONFIGS)) {
      expect(simpsonsCollection.fixedSvgs.has(key),
        `Missing SVG for ${key}`).toBe(true);
    }
  });

  it('SVGs contain valid SVG content', () => {
    for (const [key, svg] of simpsonsCollection.fixedSvgs) {
      expect(svg, `${key} missing <svg`).toContain('<svg');
      expect(svg, `${key} missing </svg>`).toContain('</svg>');
    }
  });
});
