import { describe, it, expect } from 'vitest';
import { neonCollection } from '../collections/neon/index.js';

describe('neon collection', () => {
  it('is a parts collection', () => {
    expect(neonCollection.type).toBe('parts');
  });

  it('has label "Neon"', () => {
    expect(neonCollection.label).toBe('Neon');
  });

  it('has more than 300 part symbols', () => {
    expect(neonCollection.parts.size).toBeGreaterThan(300);
  });

  it('contains head:angular part', () => {
    expect(neonCollection.parts.has('head:angular')).toBe(true);
  });

  it('contains hair:afro part', () => {
    expect(neonCollection.parts.has('hair:afro')).toBe(true);
  });

  it('parts contain valid SVG content', () => {
    const head = neonCollection.parts.get('head:angular')!;
    expect(head).toContain('polygon');
  });
});
