import { describe, it, expect } from 'vitest';
import { connectorPath, fanInPaths, fanOutPaths } from './svg-connectors.js';

describe('connectorPath', () => {
  it('returns a valid SVG path starting at from and ending at to', () => {
    const d = connectorPath({ x: 0, y: 0 }, { x: 100, y: 100 });
    expect(d).toMatch(/^M\s*0,0/);
    expect(d).toMatch(/100,100$/);
  });

  it('bezier (default) produces a cubic bezier command', () => {
    const d = connectorPath({ x: 0, y: 0 }, { x: 0, y: 100 });
    expect(d).toContain('C');
  });

  it('straight produces a line-to command', () => {
    const d = connectorPath({ x: 0, y: 0 }, { x: 100, y: 50 }, { curve: 'straight' });
    expect(d).toBe('M 0,0 L 100,50');
  });

  it('step produces orthogonal segments', () => {
    const d = connectorPath({ x: 0, y: 0 }, { x: 100, y: 100 }, { curve: 'step' });
    expect(d).toBe('M 0,0 V 50 H 100 V 100');
  });

  it('curvature 0 produces straight-line-equivalent bezier', () => {
    const d = connectorPath({ x: 0, y: 0 }, { x: 0, y: 100 }, { curvature: 0 });
    expect(d).toBe('M 0,0 C 0,0 0,100 0,100');
  });

  it('same point returns zero-length path', () => {
    const d = connectorPath({ x: 50, y: 50 }, { x: 50, y: 50 });
    expect(d).toMatch(/^M\s*50,50/);
  });
});

describe('fanInPaths', () => {
  it('returns one path per source', () => {
    const sources = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 200, y: 0 }];
    const target = { x: 100, y: 100 };
    const paths = fanInPaths(sources, target);
    expect(paths).toHaveLength(3);
  });

  it('each path ends at the target point', () => {
    const sources = [{ x: 0, y: 0 }, { x: 200, y: 0 }];
    const target = { x: 100, y: 80 };
    const paths = fanInPaths(sources, target);
    for (const d of paths) {
      expect(d).toMatch(/100,80$/);
    }
  });

  it('returns empty array for empty sources', () => {
    expect(fanInPaths([], { x: 50, y: 50 })).toEqual([]);
  });
});

describe('fanOutPaths', () => {
  it('returns one path per target', () => {
    const source = { x: 100, y: 0 };
    const targets = [{ x: 0, y: 100 }, { x: 200, y: 100 }];
    const paths = fanOutPaths(source, targets);
    expect(paths).toHaveLength(2);
  });

  it('each path starts at the source point', () => {
    const source = { x: 50, y: 10 };
    const targets = [{ x: 0, y: 100 }, { x: 100, y: 100 }];
    const paths = fanOutPaths(source, targets);
    for (const d of paths) {
      expect(d).toMatch(/^M\s*50,10/);
    }
  });

  it('returns empty array for empty targets', () => {
    expect(fanOutPaths({ x: 0, y: 0 }, [])).toEqual([]);
  });
});
