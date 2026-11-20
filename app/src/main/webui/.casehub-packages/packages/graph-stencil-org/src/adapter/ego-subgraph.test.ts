import { describe, it, expect } from 'vitest';
import { extractEgoSubgraph } from './ego-subgraph.js';
import type { GraphModel, GraphNode, GraphEdge } from '@casehubio/graph-core';

const SAMPLE_MODEL: GraphModel = {
  nodes: [
    { id: 'unit:team1', type: 'org-unit', properties: { name: 'Team One' } },
    { id: 'unit:team2', type: 'org-unit', properties: { name: 'Team Two' } },
    { id: 'agent:team1:alice', type: 'org-agent', parentId: 'unit:team1', properties: { agentId: 'alice', role: 'lead' } },
    { id: 'agent:team1:bob', type: 'org-agent', parentId: 'unit:team1', properties: { agentId: 'bob', role: 'worker' } },
    { id: 'agent:team2:carol', type: 'org-agent', parentId: 'unit:team2', properties: { agentId: 'carol', role: 'lead' } },
    { id: 'agent:team2:dave', type: 'org-agent', parentId: 'unit:team2', properties: { agentId: 'dave', role: 'worker' } },
  ],
  edges: [
    { id: 'e1', type: 'org-supervises', source: 'agent:team1:alice', target: 'agent:team1:bob' },
    { id: 'e2', type: 'org-delegates-to', source: 'agent:team1:alice', target: 'agent:team2:carol' },
    { id: 'e3', type: 'org-supervises', source: 'agent:team2:carol', target: 'agent:team2:dave' },
  ],
};

describe('extractEgoSubgraph', () => {
  it('returns only 1-hop neighbours of ego agent', () => {
    const sub = extractEgoSubgraph(SAMPLE_MODEL, 'alice');
    const agentIds = sub.nodes
      .filter(n => n.type === 'org-agent')
      .map(n => n.properties['agentId']);
    expect(agentIds).toContain('alice');
    expect(agentIds).toContain('bob');
    expect(agentIds).toContain('carol');
    expect(agentIds).not.toContain('dave');
  });

  it('preserves unit context for ego agent', () => {
    const sub = extractEgoSubgraph(SAMPLE_MODEL, 'alice');
    const units = sub.nodes.filter(n => n.type === 'org-unit');
    expect(units.length).toBeGreaterThan(0);
    expect(units.map(u => u.id)).toContain('unit:team1');
  });

  it('includes units for neighbour agents', () => {
    const sub = extractEgoSubgraph(SAMPLE_MODEL, 'alice');
    const units = sub.nodes.filter(n => n.type === 'org-unit');
    expect(units.map(u => u.id)).toContain('unit:team2');
  });

  it('includes edges to/from ego only', () => {
    const sub = extractEgoSubgraph(SAMPLE_MODEL, 'alice');
    expect(sub.edges).toHaveLength(2);
  });

  it('preserves metadata from original model', () => {
    const model: GraphModel = { ...SAMPLE_MODEL, metadata: { version: '1.0' } };
    const sub = extractEgoSubgraph(model, 'alice');
    expect(sub.metadata).toEqual({ version: '1.0' });
  });

  it('returns empty subgraph for unknown agent', () => {
    const sub = extractEgoSubgraph(SAMPLE_MODEL, 'unknown');
    expect(sub.nodes).toHaveLength(0);
    expect(sub.edges).toHaveLength(0);
  });
});
