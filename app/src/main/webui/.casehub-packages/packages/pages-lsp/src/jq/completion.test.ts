import { describe, it, expect } from 'vitest';
import { completeJqPath } from './completion.js';

describe('completeJqPath', () => {
  it('suggests column names after dot', () => {
    const columns = ['name', 'age', 'email'];
    const items = completeJqPath('.', 1, columns);
    expect(items.map(i => i.label)).toEqual(['name', 'age', 'email']);
  });

  it('filters by prefix', () => {
    const columns = ['name', 'namespace', 'email'];
    const items = completeJqPath('.na', 3, columns);
    expect(items.map(i => i.label)).toEqual(['name', 'namespace']);
  });

  it('returns empty for non-dot context', () => {
    const items = completeJqPath('select(', 7, ['name']);
    expect(items).toHaveLength(0);
  });

  it('suggests after pipe and dot', () => {
    const columns = ['price', 'quantity'];
    const items = completeJqPath('.items | .', 10, columns);
    expect(items.map(i => i.label)).toEqual(['price', 'quantity']);
  });
});
