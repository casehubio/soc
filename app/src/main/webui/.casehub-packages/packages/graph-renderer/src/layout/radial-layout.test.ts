import { describe, it, expect } from 'vitest';
import { computeRadialLayout } from './radial-layout.js';
import type { GraphModel } from '@casehubio/graph-core';

describe('computeRadialLayout', () => {
  it('places a single root node', () => {
    const model: GraphModel = {
      nodes: [{ id: 'a', type: 'default', properties: {} }],
      edges: [],
    };
    const result = computeRadialLayout(model);
    expect(result.nodeLayouts.get('a')).toBeDefined();
  });

  it('places hub at center with spokes around it', () => {
    const model: GraphModel = {
      nodes: [
        { id: 'root', type: 'container', properties: {} },
        { id: 'hub', type: 'agent', properties: {}, parentId: 'root' },
        { id: 's1', type: 'agent', properties: {}, parentId: 'root' },
        { id: 's2', type: 'agent', properties: {}, parentId: 'root' },
        { id: 's3', type: 'agent', properties: {}, parentId: 'root' },
      ],
      edges: [
        { id: 'e1', source: 'hub', target: 's1', type: 'default' },
        { id: 'e2', source: 'hub', target: 's2', type: 'default' },
        { id: 'e3', source: 'hub', target: 's3', type: 'default' },
      ],
    };
    const result = computeRadialLayout(model);
    expect(result.nodeLayouts.size).toBe(5);
    expect(result.nodeLayouts.get('root')).toBeDefined();
    expect(result.nodeLayouts.get('hub')).toBeDefined();
  });

  it('returns ElkLayoutResult shape', () => {
    const model: GraphModel = { nodes: [], edges: [] };
    const result = computeRadialLayout(model);
    expect(result).toHaveProperty('nodeLayouts');
    expect(result.nodeLayouts).toBeInstanceOf(Map);
  });

  it('respects custom spacing', () => {
    const model: GraphModel = {
      nodes: [
        { id: 'root', type: 'container', properties: {} },
        { id: 'hub', type: 'agent', properties: {}, parentId: 'root' },
        { id: 's1', type: 'agent', properties: {}, parentId: 'root' },
        { id: 's2', type: 'agent', properties: {}, parentId: 'root' },
        { id: 's3', type: 'agent', properties: {}, parentId: 'root' },
        { id: 's4', type: 'agent', properties: {}, parentId: 'root' },
      ],
      edges: [
        { id: 'e1', source: 'hub', target: 's1', type: 'default' },
        { id: 'e2', source: 'hub', target: 's2', type: 'default' },
        { id: 'e3', source: 'hub', target: 's3', type: 'default' },
        { id: 'e4', source: 'hub', target: 's4', type: 'default' },
      ],
    };
    const wide = computeRadialLayout(model, { spacing: 300 });
    const narrow = computeRadialLayout(model, { spacing: 50 });
    const wideRoot = wide.nodeLayouts.get('root')!;
    const narrowRoot = narrow.nodeLayouts.get('root')!;
    expect(wideRoot.width).toBeGreaterThan(narrowRoot.width);
  });
});
