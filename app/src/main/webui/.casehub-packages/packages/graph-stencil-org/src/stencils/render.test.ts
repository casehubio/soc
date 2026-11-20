import { describe, it, expect } from 'vitest';
import { renderOrgAgent } from './org-agent.js';
import { renderOrgUnit } from './org-unit.js';
import type { GraphNode } from '@casehubio/graph-core';

describe('renderOrgAgent — rich card', () => {
  it('renders enriched agent with all properties', () => {
    const node: GraphNode = {
      id: 'agent:u1:polecat-1', type: 'org-agent', parentId: 'unit:u1',
      properties: {
        agentId: 'polecat-1', role: 'worker', label: 'polecat-1', unitId: 'u1',
        slot: 'worker',
        capabilities: [{ name: 'full-stack-code-work' }],
        disposition: { autonomy: 'semi-auto', ruleFollowing: 'principled' },
        supervisionTargets: ['polecat-2'],
        escalationChain: ['witness-alpha', 'deacon', 'boot'],
        backupAgents: [{ agentId: 'polecat-2', scope: 'code-analysis', direction: 'backs' as const }],
        attestationGrants: [{ targetAgentId: 'witness-alpha', scope: 'rig-monitoring', dimensions: ['LATENCY'], signalTypes: ['COMPLIANT'] }],
        unitColorStart: '#2c5282', unitColorEnd: '#3182ce', unitKind: 'rig',
      },
    };
    const result = renderOrgAgent(node);
    expect(result).toBeDefined();
    const values = (result as any).values as unknown[];
    expect(values).toBeDefined();
    expect(values.length).toBeGreaterThan(5);
  });

  it('degrades gracefully with no enrichment', () => {
    const node: GraphNode = {
      id: 'agent:u1:simple', type: 'org-agent', parentId: 'unit:u1',
      properties: { agentId: 'simple', role: 'worker', label: 'simple', unitId: 'u1' },
    };
    const result = renderOrgAgent(node);
    expect(result).toBeDefined();
  });

  it('handles missing unitColors with defaults', () => {
    const node: GraphNode = {
      id: 'agent:u1:a1', type: 'org-agent', parentId: 'unit:u1',
      properties: { agentId: 'a1', label: 'a1', unitId: 'u1' },
    };
    expect(() => renderOrgAgent(node)).not.toThrow();
  });

  it('renders avatar component when avatar code is present', () => {
    const node: GraphNode = {
      id: 'agent:u1:a1', type: 'org-agent', parentId: 'unit:u1',
      properties: {
        agentId: 'a1', role: 'worker', label: 'a1', unitId: 'u1',
        avatar: 'mythic:P15',
        unitColorStart: '#2c5282',
      },
    };
    const result = renderOrgAgent(node);
    const flat = JSON.stringify((result as any).values);
    expect(flat).toContain('agent-avatar');
  });

  it('renders colored dot when avatar is absent', () => {
    const node: GraphNode = {
      id: 'agent:u1:a1', type: 'org-agent', parentId: 'unit:u1',
      properties: { agentId: 'a1', role: 'worker', label: 'a1', unitId: 'u1', unitColorStart: '#2c5282' },
    };
    const result = renderOrgAgent(node);
    const flat = JSON.stringify((result as any).values);
    expect(flat).toContain('svg');
    expect(flat).toContain('circle');
  });

  it('renders profession row when profession is present', () => {
    const node: GraphNode = {
      id: 'agent:u1:a1', type: 'org-agent', parentId: 'unit:u1',
      properties: {
        agentId: 'a1', role: 'worker', label: 'a1', unitId: 'u1',
        profession: 'Software', descriptorRole: 'Architect',
      },
    };
    const result = renderOrgAgent(node);
    const values = (result as any).values as unknown[];
    const flat = JSON.stringify(values);
    expect(flat).toContain('Software');
    expect(flat).toContain('Architect');
  });

  it('renders profession without descriptorRole when only profession is set', () => {
    const node: GraphNode = {
      id: 'agent:u1:a1', type: 'org-agent', parentId: 'unit:u1',
      properties: {
        agentId: 'a1', role: 'worker', label: 'a1', unitId: 'u1',
        profession: 'Software',
      },
    };
    const result = renderOrgAgent(node);
    const values = (result as any).values as unknown[];
    const flat = JSON.stringify(values);
    expect(flat).toContain('Software');
  });
});

describe('renderOrgUnit — rich container', () => {
  it('renders with kind-based gradient colors', () => {
    const node: GraphNode = {
      id: 'unit:oversight', type: 'org-unit',
      properties: {
        unitId: 'oversight', name: 'Oversight Chain', kind: 'supervision-hierarchy',
        label: 'Oversight Chain', memberCount: 2,
        capabilities: [], goals: [], constraints: [],
        kindColorStart: '#553c9a', kindColorEnd: '#6b46c1',
      },
    };
    const result = renderOrgUnit(node);
    expect(result).toBeDefined();
  });

  it('renders capability pills', () => {
    const node: GraphNode = {
      id: 'unit:rig1', type: 'org-unit',
      properties: {
        unitId: 'rig1', name: 'Rig Alpha', kind: 'rig',
        label: 'Rig Alpha', memberCount: 3,
        capabilities: [{ name: 'full-stack-code-work' }],
        goals: [], constraints: [],
        kindColorStart: '#2c5282', kindColorEnd: '#3182ce',
      },
    };
    const result = renderOrgUnit(node);
    expect(result).toBeDefined();
    const values = (result as any).values as unknown[];
    expect(values.length).toBeGreaterThan(3);
  });

  it('handles missing colors with defaults', () => {
    const node: GraphNode = {
      id: 'unit:u1', type: 'org-unit',
      properties: {
        unitId: 'u1', name: 'U1', label: 'U1', memberCount: 0,
        capabilities: [], goals: [], constraints: [],
      },
    };
    expect(() => renderOrgUnit(node)).not.toThrow();
  });
});
