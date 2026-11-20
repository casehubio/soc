import { describe, it, expect } from 'vitest';
import { allowedTypesAt, allowedTypesForSiblingOf, isAllowedChild } from './insertion-constraints.js';

describe('allowedTypesAt', () => {
  it('page allows rows, columns, and all component types', () => {
    const c = allowedTypesAt('page');
    expect(c.structuralTypes).toContain('row');
    expect(c.structuralTypes).toContain('column');
    expect(c.componentTypes.length).toBeGreaterThan(50);
    expect(c.componentTypes).toContain('bar-chart');
    expect(c.componentTypes).toContain('input');
  });

  it('row allows only columns', () => {
    const c = allowedTypesAt('row');
    expect(c.structuralTypes).toEqual(['column']);
    expect(c.componentTypes).toEqual([]);
  });

  it('column allows all component types, no structural', () => {
    const c = allowedTypesAt('column');
    expect(c.structuralTypes).toEqual([]);
    expect(c.componentTypes.length).toBeGreaterThan(50);
  });

  it('container component (tabs) allows all component types', () => {
    const c = allowedTypesAt('tabs');
    expect(c.structuralTypes).toEqual([]);
    expect(c.componentTypes.length).toBeGreaterThan(50);
  });

  it('container component (form-scope) allows all component types', () => {
    const c = allowedTypesAt('form-scope');
    expect(c.structuralTypes).toEqual([]);
    expect(c.componentTypes.length).toBeGreaterThan(50);
  });

  it('leaf component (bar-chart) allows nothing', () => {
    const c = allowedTypesAt('bar-chart');
    expect(c.structuralTypes).toEqual([]);
    expect(c.componentTypes).toEqual([]);
  });

  it('unknown type allows nothing', () => {
    const c = allowedTypesAt('nonexistent');
    expect(c.structuralTypes).toEqual([]);
    expect(c.componentTypes).toEqual([]);
  });
});

describe('allowedTypesForSiblingOf', () => {
  it('sibling of component = column constraint (all components)', () => {
    const c = allowedTypesForSiblingOf('component');
    expect(c.structuralTypes).toEqual([]);
    expect(c.componentTypes.length).toBeGreaterThan(50);
  });

  it('sibling of column = row constraint (columns only)', () => {
    const c = allowedTypesForSiblingOf('column');
    expect(c.structuralTypes).toEqual(['column']);
    expect(c.componentTypes).toEqual([]);
  });

  it('sibling of row = page constraint (rows, columns, components)', () => {
    const c = allowedTypesForSiblingOf('row');
    expect(c.structuralTypes).toContain('row');
    expect(c.componentTypes.length).toBeGreaterThan(50);
  });
});

describe('isAllowedChild', () => {
  it('bar-chart is allowed in column', () => {
    expect(isAllowedChild('column', 'bar-chart')).toBe(true);
  });

  it('row is not allowed in column', () => {
    expect(isAllowedChild('column', 'row')).toBe(false);
  });

  it('column is allowed in row', () => {
    expect(isAllowedChild('row', 'column')).toBe(true);
  });

  it('bar-chart is not allowed in row', () => {
    expect(isAllowedChild('row', 'bar-chart')).toBe(false);
  });

  it('nothing is allowed in leaf component', () => {
    expect(isAllowedChild('bar-chart', 'input')).toBe(false);
  });

  it('row is allowed in page', () => {
    expect(isAllowedChild('page', 'row')).toBe(true);
  });

  it('component is allowed in container (tabs)', () => {
    expect(isAllowedChild('tabs', 'bar-chart')).toBe(true);
  });
});
