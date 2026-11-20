import { describe, it, expect } from 'vitest';
import { applyCollapsedUnits } from './collapse.js';
import { toOrgGraph } from './org-adapter.js';

const YAML = `
organization:
  units:
    - unitId: team1
      name: Team One
      kind: rig
      tenancyId: t1
      members:
        - agentId: alice
          role: worker
        - agentId: bob
          role: lead
      capabilities: []
      goals: []
      constraints: []
  relationships:
    - sourceAgentId: bob
      targetAgentId: alice
      kind: SUPERVISES
      tenancyId: t1
`;

describe('applyCollapsedUnits', () => {
  it('removes agent nodes from collapsed units', () => {
    const base = toOrgGraph(YAML);
    const collapsed = new Set(['team1']);
    const result = applyCollapsedUnits(base.model, base.yamlPaths, collapsed);
    const agents = result.model.nodes.filter(n => n.type === 'org-agent');
    expect(agents).toHaveLength(0);
  });

  it('removes edges connected to collapsed agents', () => {
    const base = toOrgGraph(YAML);
    const collapsed = new Set(['team1']);
    const result = applyCollapsedUnits(base.model, base.yamlPaths, collapsed);
    expect(result.model.edges).toHaveLength(0);
  });

  it('preserves unit node for collapsed unit', () => {
    const base = toOrgGraph(YAML);
    const collapsed = new Set(['team1']);
    const result = applyCollapsedUnits(base.model, base.yamlPaths, collapsed);
    const units = result.model.nodes.filter(n => n.type === 'org-unit');
    expect(units).toHaveLength(1);
  });

  it('does nothing when no units collapsed', () => {
    const base = toOrgGraph(YAML);
    const collapsed = new Set<string>();
    const result = applyCollapsedUnits(base.model, base.yamlPaths, collapsed);
    expect(result.model.nodes).toHaveLength(base.model.nodes.length);
    expect(result.model.edges).toHaveLength(base.model.edges.length);
  });

  it('filters yamlPaths for removed nodes', () => {
    const base = toOrgGraph(YAML);
    const collapsed = new Set(['team1']);
    const result = applyCollapsedUnits(base.model, base.yamlPaths, collapsed);
    for (const node of result.model.nodes) {
      expect(result.yamlPaths.has(node.id)).toBe(true);
    }
    const removedNodeIds = ['agent:team1:alice', 'agent:team1:bob'];
    for (const id of removedNodeIds) {
      expect(result.yamlPaths.has(id)).toBe(false);
    }
  });
});
