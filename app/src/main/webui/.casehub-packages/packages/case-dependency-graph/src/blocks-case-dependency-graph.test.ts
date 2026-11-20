// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import type { GraphModel } from '@casehubio/graph-core';
import { BlocksCaseDependencyGraph } from './blocks-case-dependency-graph.js';

const SAMPLE_MODEL: GraphModel = {
  nodes: [
    { id: 'a', type: 'case', properties: { label: 'Case A', status: 'RUNNING', domain: 'case' } },
    { id: 'b', type: 'case', properties: { label: 'Case B', status: 'COMPLETED', domain: 'case' } },
  ],
  edges: [
    { id: 'e1', type: 'parent_child', source: 'a', target: 'b' },
  ],
};

describe('BlocksCaseDependencyGraph', () => {
  it('has default properties', () => {
    const el = new BlocksCaseDependencyGraph();
    expect(el.selectionTopic).toBe('case-graph');
    expect(el.graphData).toBeUndefined();
    expect(el.endpoint).toBeUndefined();
  });

  it('exportDOT returns empty string when no model', () => {
    const el = new BlocksCaseDependencyGraph();
    expect(el.exportDOT()).toBe('');
  });

  it('exportDOT returns DOT string when model is set', () => {
    const el = new BlocksCaseDependencyGraph();
    (el as any)._model = SAMPLE_MODEL;
    const dot = el.exportDOT();
    expect(dot).toContain('digraph');
    expect(dot).toContain('"a"');
    expect(dot).toContain('"b"');
  });

  it('_edgeTypeSummary computes counts', () => {
    const el = new BlocksCaseDependencyGraph();
    (el as any)._model = SAMPLE_MODEL;
    const summary = (el as any)._edgeTypeSummary();
    expect(summary).toHaveLength(1);
    expect(summary[0].type).toBe('parent_child');
    expect(summary[0].count).toBe(1);
  });

  it('_buildGraph filters dangling edges', async () => {
    const model: GraphModel = {
      nodes: [{ id: 'a', type: 'case', properties: { label: 'A' } }],
      edges: [{ id: 'e1', type: 'parent_child', source: 'a', target: 'missing' }],
    };
    const el = new BlocksCaseDependencyGraph();
    (el as any)._model = model;
    await (el as any)._buildGraph();
    expect((el as any)._edges).toHaveLength(0);
  });
});
