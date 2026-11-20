import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { toOrgGraph } from './org-adapter.js';

const ARCHETYPES_DIR = resolve(
  __dirname,
  '../test-fixtures/archetypes',
);

function loadArchetype(name: string): string {
  return readFileSync(resolve(ARCHETYPES_DIR, `${name}.yaml`), 'utf-8');
}

describe('toOrgGraph', () => {
  it('parses simple-structure archetype', () => {
    const yaml = loadArchetype('simple-structure');
    const result = toOrgGraph(yaml);

    expect(result.model.nodes).toHaveLength(6);
    const units = result.model.nodes.filter(n => n.type === 'org-unit');
    const agents = result.model.nodes.filter(n => n.type === 'org-agent');
    expect(units).toHaveLength(1);
    expect(agents).toHaveLength(5);

    for (const agent of agents) {
      expect(agent.parentId).toBe('unit:startup');
    }

    expect(result.model.edges).toHaveLength(4);
    for (const edge of result.model.edges) {
      expect(edge.type).toBe('org-supervises');
    }
  });

  it('parses divisional-holarchy with nested units', () => {
    const yaml = loadArchetype('divisional-holarchy');
    const result = toOrgGraph(yaml);

    const units = result.model.nodes.filter(n => n.type === 'org-unit');
    expect(units.length).toBeGreaterThanOrEqual(3);

    const emergency = units.find(n => n.properties['unitId'] === 'emergency');
    expect(emergency?.parentId).toBe('unit:hospital');

    const radiology = units.find(n => n.properties['unitId'] === 'radiology');
    expect(radiology?.parentId).toBe('unit:hospital');
  });

  it('maps relationship kinds to edge types', () => {
    const yaml = loadArchetype('tiered-escalation');
    const result = toOrgGraph(yaml);

    const edgeTypes = new Set(result.model.edges.map(e => e.type));
    expect(edgeTypes.has('org-escalates-to')).toBe(true);
    expect(edgeTypes.has('org-supervises')).toBe(true);
    expect(edgeTypes.has('org-backs-up')).toBe(true);
  });

  it('handles EXTENDED relationships with extendedKind', () => {
    const yaml = loadArchetype('market');
    const result = toOrgGraph(yaml);

    const extendedEdges = result.model.edges.filter(e => e.type === 'org-extended');
    expect(extendedEdges.length).toBeGreaterThan(0);
    expect(extendedEdges[0]!.properties?.['extendedKind']).toBe('bids-to');
  });

  it('handles matrix — multi-unit agents', () => {
    const yaml = loadArchetype('matrix');
    const result = toOrgGraph(yaml);

    const aliceNodes = result.model.nodes.filter(
      n => n.type === 'org-agent' && n.properties['agentId'] === 'dev-alice',
    );
    expect(aliceNodes).toHaveLength(2);
    expect(new Set(aliceNodes.map(n => n.properties['unitId']))).toEqual(
      new Set(['platform-team', 'billing-project']),
    );
  });

  it('resolves multi-unit edges with same-unit preference', () => {
    const yaml = loadArchetype('matrix');
    const result = toOrgGraph(yaml);

    const supervises = result.model.edges.find(
      e =>
        e.type === 'org-supervises' &&
        e.source === 'agent:platform-team:platform-lead' &&
        e.target.includes('dev-alice'),
    );
    expect(supervises).toBeDefined();
    expect(supervises!.target).toBe('agent:platform-team:dev-alice');
  });

  it('builds yamlPaths for all nodes', () => {
    const yaml = loadArchetype('simple-structure');
    const result = toOrgGraph(yaml);

    for (const node of result.model.nodes) {
      expect(result.yamlPaths.has(node.id)).toBe(true);
    }
  });

  it('builds yamlPaths for relationship edges', () => {
    const yaml = loadArchetype('simple-structure');
    const result = toOrgGraph(yaml);

    for (const edge of result.model.edges) {
      expect(result.yamlPaths.has(edge.id)).toBe(true);
    }
  });

  it('includes scope in edge properties', () => {
    const yaml = loadArchetype('federation-orchestrator');
    const result = toOrgGraph(yaml);

    const delegateEdges = result.model.edges.filter(e => e.type === 'org-delegates-to');
    const scopedEdge = delegateEdges.find(e => e.properties?.['scope']);
    expect(scopedEdge).toBeDefined();
    expect(
      (scopedEdge!.properties!['scope'] as { capabilityName?: string }).capabilityName,
    ).toBeDefined();
  });

  it('includes attestation in edge properties', () => {
    const yaml = loadArchetype('coalition-advisory');
    const result = toOrgGraph(yaml);

    const attestEdges = result.model.edges.filter(e => e.properties?.['attestation']);
    expect(attestEdges.length).toBeGreaterThan(0);
    const att = attestEdges[0]!.properties!['attestation'] as {
      dimensions?: string[];
    };
    expect(att.dimensions).toBeDefined();
    expect(att.dimensions!.length).toBeGreaterThan(0);
  });

  it('parses all 9 archetypes without error', () => {
    const names = [
      'simple-structure',
      'divisional-holarchy',
      'federation-orchestrator',
      'pipeline',
      'market',
      'matrix',
      'tiered-escalation',
      'professional-bureaucracy',
      'coalition-advisory',
    ];
    for (const name of names) {
      const yaml = loadArchetype(name);
      expect(() => toOrgGraph(yaml)).not.toThrow();
    }
  });

  it('handles unit properties — capabilities, goals, constraints', () => {
    const yaml = loadArchetype('simple-structure');
    const result = toOrgGraph(yaml);

    const unit = result.model.nodes.find(n => n.type === 'org-unit');
    expect(unit).toBeDefined();
    expect(unit!.properties['goals']).toBeDefined();
    expect((unit!.properties['goals'] as unknown[]).length).toBeGreaterThan(0);
  });

  it('sets label property on nodes', () => {
    const yaml = loadArchetype('simple-structure');
    const result = toOrgGraph(yaml);

    const unit = result.model.nodes.find(n => n.type === 'org-unit');
    expect(unit!.properties['label']).toBe('Startup Team');

    const agent = result.model.nodes.find(n => n.type === 'org-agent');
    expect(agent!.properties['label']).toBeDefined();
  });
});
