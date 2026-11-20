import { describe, it, expect } from 'vitest';
import { toDOT } from './dot-export.js';
import { registerRelationshipType } from '@casehubio/mosaic-core';
import type { GraphModel } from '@casehubio/graph-core';

describe('toDOT', () => {
  it('produces valid DOT for a simple graph', () => {
    const model: GraphModel = {
      nodes: [
        { id: 'a', type: 'case', properties: { label: 'Case A', status: 'RUNNING' } },
        { id: 'b', type: 'case', properties: { label: 'Case B', status: 'COMPLETED' } },
      ],
      edges: [
        { id: 'e1', type: 'parent_child', source: 'a', target: 'b' },
      ],
    };
    const dot = toDOT(model);
    expect(dot).toContain('digraph');
    expect(dot).toContain('"a"');
    expect(dot).toContain('"b"');
    expect(dot).toContain('"a" -> "b"');
    expect(dot).toContain('label="Case A"');
  });

  it('uses edge labels from relationship registry', () => {
    const model: GraphModel = {
      nodes: [
        { id: 'a', type: 'case', properties: { label: 'A' } },
        { id: 'b', type: 'case', properties: { label: 'B' } },
      ],
      edges: [
        { id: 'e1', type: 'supersedes', source: 'a', target: 'b' },
      ],
    };
    const dot = toDOT(model);
    expect(dot).toContain('label="Supersedes"');
  });

  it('handles undirected edges', () => {
    registerRelationshipType('_test_relates_to', {
      color: '#3b82f6', style: 'dotted', directed: false, label: 'Relates To',
    });
    const model: GraphModel = {
      nodes: [
        { id: 'a', type: 'case', properties: { label: 'A' } },
        { id: 'b', type: 'case', properties: { label: 'B' } },
      ],
      edges: [
        { id: 'e1', type: '_test_relates_to', source: 'a', target: 'b' },
      ],
    };
    const dot = toDOT(model);
    expect(dot).toContain('"a" -- "b"');
  });

  it('produces empty graph for no nodes', () => {
    const model: GraphModel = { nodes: [], edges: [] };
    const dot = toDOT(model);
    expect(dot).toContain('digraph');
    expect(dot).not.toContain('->');
  });
});
