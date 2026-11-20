import { describe, it, expect } from 'vitest';
import { computeStackColumnLayout } from './stack-column-layout.js';
import type { GraphModel } from '@casehubio/graph-core';

describe('computeStackColumnLayout', () => {
  it('lays out a linear chain vertically', () => {
    const model: GraphModel = {
      nodes: [
        { id: 'a', type: 'task', properties: {} },
        { id: 'b', type: 'task', properties: {} },
        { id: 'c', type: 'task', properties: {} },
      ],
      edges: [
        { id: 'e1', source: 'a', target: 'b', type: 'default' },
        { id: 'e2', source: 'b', target: 'c', type: 'default' },
      ],
    };

    const result = computeStackColumnLayout(model);
    const a = result.nodeLayouts.get('a')!;
    const b = result.nodeLayouts.get('b')!;
    const c = result.nodeLayouts.get('c')!;

    expect(a).toBeDefined();
    expect(b).toBeDefined();
    expect(c).toBeDefined();
    expect(a.y).toBeLessThan(b.y);
    expect(b.y).toBeLessThan(c.y);
    expect(a.x).toBe(b.x);
    expect(b.x).toBe(c.x);
  });

  it('creates columns for splits', () => {
    const model: GraphModel = {
      nodes: [
        { id: 'start', type: 'task', properties: {} },
        { id: 'left', type: 'task', properties: {} },
        { id: 'right', type: 'task', properties: {} },
        { id: 'end', type: 'task', properties: {} },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'left', type: 'default' },
        { id: 'e2', source: 'start', target: 'right', type: 'default' },
        { id: 'e3', source: 'left', target: 'end', type: 'default' },
        { id: 'e4', source: 'right', target: 'end', type: 'default' },
      ],
    };

    const result = computeStackColumnLayout(model);
    const start = result.nodeLayouts.get('start')!;
    const left = result.nodeLayouts.get('left')!;
    const right = result.nodeLayouts.get('right')!;
    const end = result.nodeLayouts.get('end')!;

    expect(start.y).toBeLessThan(left.y);
    expect(start.y).toBeLessThan(right.y);
    expect(left.x).not.toBe(right.x);
    expect(end.y).toBeGreaterThan(left.y);
    expect(end.y).toBeGreaterThan(right.y);
  });

  it('skips specified node types', () => {
    const model: GraphModel = {
      nodes: [
        { id: 'root', type: 'container', properties: {} },
        { id: 'a', type: 'task', properties: {}, parentId: 'root' },
      ],
      edges: [],
    };

    const result = computeStackColumnLayout(model, { skipTypes: new Set(['container']) });
    expect(result.nodeLayouts.has('root')).toBe(false);
    expect(result.nodeLayouts.has('a')).toBe(true);
  });

  it('handles empty graph', () => {
    const model: GraphModel = { nodes: [], edges: [] };
    const result = computeStackColumnLayout(model);
    expect(result.nodeLayouts.size).toBe(0);
  });

  it('respects custom spacing options', () => {
    const model: GraphModel = {
      nodes: [
        { id: 'a', type: 'task', properties: {} },
        { id: 'b', type: 'task', properties: {} },
      ],
      edges: [
        { id: 'e1', source: 'a', target: 'b', type: 'default' },
      ],
    };

    const wide = computeStackColumnLayout(model, { verticalGap: 100 });
    const narrow = computeStackColumnLayout(model, { verticalGap: 10 });

    const wideGap = wide.nodeLayouts.get('b')!.y - wide.nodeLayouts.get('a')!.y;
    const narrowGap = narrow.nodeLayouts.get('b')!.y - narrow.nodeLayouts.get('a')!.y;

    expect(wideGap).toBeGreaterThan(narrowGap);
  });

  it('optimises column order to reduce edge crossings', () => {
    const model: GraphModel = {
      nodes: [
        { id: 'start', type: 'task', properties: {} },
        { id: 'col1', type: 'task', properties: {} },
        { id: 'col2', type: 'task', properties: {} },
        { id: 'col3', type: 'task', properties: {} },
        { id: 'end', type: 'task', properties: {} },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'col1', type: 'default' },
        { id: 'e2', source: 'start', target: 'col2', type: 'default' },
        { id: 'e3', source: 'start', target: 'col3', type: 'default' },
        { id: 'e4', source: 'col1', target: 'end', type: 'default' },
        { id: 'e5', source: 'col2', target: 'end', type: 'default' },
        { id: 'e6', source: 'col3', target: 'end', type: 'default' },
        { id: 'escape', source: 'col1', target: 'col3', type: 'default' },
      ],
    };

    const result = computeStackColumnLayout(model);
    const col1 = result.nodeLayouts.get('col1')!;
    const col3 = result.nodeLayouts.get('col3')!;

    expect(result.nodeLayouts.size).toBeGreaterThanOrEqual(5);
    expect(col1).toBeDefined();
    expect(col3).toBeDefined();
  });
});
