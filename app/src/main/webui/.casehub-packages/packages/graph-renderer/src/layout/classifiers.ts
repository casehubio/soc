import type { GraphEdge, GraphNode } from '@casehubio/graph-core';
import type { ClassificationRule, ArchetypeName, LayoutStrategy } from './types.js';

const ARCHETYPE_LAYOUT: Readonly<Record<ArchetypeName, LayoutStrategy>> = {
  'simple-structure': 'star',
  'hierarchy': 'tree',
  'professional-bureaucracy': 'circular',
  'tiered-escalation': 'layered',
  'divisional-holarchy': 'nested',
  'federation': 'hub-spoke',
  'pipeline': 'flow',
  'coalition': 'radial',
  'matrix': 'grid',
  'market': 'radial',
};

function edgesByKind(edges: readonly GraphEdge[]): Map<string, GraphEdge[]> {
  const map = new Map<string, GraphEdge[]>();
  for (const e of edges) {
    const kind = (e.properties?.['kind'] as string | undefined) ?? '';
    let list = map.get(kind);
    if (!list) { list = []; map.set(kind, list); }
    list.push(e);
  }
  return map;
}

function directedTreeDepth(edges: readonly GraphEdge[], kind: string): number {
  const matching = edges.filter(e => e.properties?.['kind'] === kind);
  if (matching.length === 0) return 0;
  const children = new Map<string, string[]>();
  const allTargets = new Set<string>();
  for (const e of matching) {
    let list = children.get(e.source);
    if (!list) { list = []; children.set(e.source, list); }
    list.push(e.target);
    allTargets.add(e.target);
  }
  const roots = [...children.keys()].filter(k => !allTargets.has(k));
  if (roots.length === 0) return 1;
  function depth(nodeId: string): number {
    const kids = children.get(nodeId);
    if (!kids || kids.length === 0) return 1;
    let max = 0;
    for (const kid of kids) { const d = depth(kid); if (d > max) max = d; }
    return 1 + max;
  }
  let maxDepth = 0;
  for (const root of roots) { const d = depth(root); if (d > maxDepth) maxDepth = d; }
  return maxDepth;
}

function isLinearChain(edges: readonly GraphEdge[], kind: string): boolean {
  const matching = edges.filter(e => e.properties?.['kind'] === kind);
  if (matching.length < 2) return false;
  const sourceCount = new Map<string, number>();
  const targetCount = new Map<string, number>();
  for (const e of matching) {
    sourceCount.set(e.source, (sourceCount.get(e.source) ?? 0) + 1);
    targetCount.set(e.target, (targetCount.get(e.target) ?? 0) + 1);
  }
  for (const count of sourceCount.values()) { if (count > 1) return false; }
  for (const count of targetCount.values()) { if (count > 1) return false; }
  return true;
}

function hasMultiParentNodes(nodes: readonly GraphNode[], nodeType: string, groupKey: string, idKey: string): boolean {
  const groups = new Map<string, Set<string>>();
  for (const n of nodes) {
    if (n.type !== nodeType) continue;
    const id = n.properties[idKey] as string;
    const group = n.properties[groupKey] as string;
    let set = groups.get(id);
    if (!set) { set = new Set(); groups.set(id, set); }
    set.add(group);
  }
  for (const set of groups.values()) { if (set.size > 1) return true; }
  return false;
}

function hasNestedContainers(nodes: readonly GraphNode[], containerType: string): boolean {
  return nodes.some(n => n.type === containerType && n.parentId !== undefined);
}

const nestedContainerDetector: ClassificationRule = {
  id: 'nested-container-detector',
  classify(model, facts) {
    const containerTypes = new Set(model.nodes.filter(n => n.parentId === undefined || model.nodes.some(p => p.id === n.parentId && p.type === n.type)).map(n => n.type).filter(Boolean));
    for (const type of containerTypes) {
      if (hasNestedContainers(model.nodes, type!)) {
        facts.assert('graph', 'has-nested-containers', true);
        return;
      }
    }
  },
};

const edgeKindAnalyzer: ClassificationRule = {
  id: 'edge-kind-analyzer',
  classify(model, facts) {
    const byKind = edgesByKind(model.edges);
    for (const [kind, edges] of byKind) {
      if (!kind) continue;
      facts.assert(`kind:${kind}`, 'count', edges.length);

      const depth = directedTreeDepth(model.edges, kind);
      if (depth > 0) facts.assert(`kind:${kind}`, 'tree-depth', depth);

      if (isLinearChain(model.edges, kind)) {
        facts.assert(`kind:${kind}`, 'is-linear-chain', true);
        facts.assert('graph', 'has-linear-chain', kind);
      }

      const sources = new Set(edges.map(e => e.source));
      if (sources.size === 1 && edges.length > 0) {
        facts.assert(`kind:${kind}`, 'single-source', true);
      }

      const hubSources = new Map<string, number>();
      for (const e of edges) {
        hubSources.set(e.source, (hubSources.get(e.source) ?? 0) + 1);
      }
      if ([...hubSources.values()].some(c => c >= 2)) {
        facts.assert(`kind:${kind}`, 'has-hub', true);
      }
    }

    if (model.edges.length === 0) {
      facts.assert('graph', 'no-edges', true);
    }
  },
};

const extendedEdgeDetector: ClassificationRule = {
  id: 'extended-edge-detector',
  classify(model, facts) {
    for (const e of model.edges) {
      if (e.properties?.['kind'] === 'EXTENDED') {
        const extKind = e.properties['extendedKind'] as string | undefined;
        if (extKind) {
          facts.assert('graph', `has-extended-${extKind}`, true);
        }
      }
    }
  },
};

const multiParentDetector: ClassificationRule = {
  id: 'multi-parent-detector',
  classify(model, facts) {
    if (hasMultiParentNodes(model.nodes, 'org-agent', 'unitId', 'agentId')) {
      facts.assert('graph', 'has-multi-parent-nodes', true);
    }
  },
};

const archetypeSelector: ClassificationRule = {
  id: 'archetype-selector',
  classify(model, facts) {
    if (facts.has('graph', 'no-edges')) {
      facts.assert('graph', 'archetype', 'simple-structure');
      facts.assert('graph', 'archetype-confidence', 'low');
      facts.assert('graph', 'recommended-strategy', 'force');
      return;
    }

    type Match = { archetype: ArchetypeName; confidence: 'high' | 'medium' | 'low' };
    let match: Match | undefined;

    if (!match && facts.has('graph', 'has-extended-bids-to')) {
      match = { archetype: 'market', confidence: 'high' };
    }
    if (!match && facts.has('graph', 'has-multi-parent-nodes')) {
      match = { archetype: 'matrix', confidence: 'high' };
    }
    if (!match && facts.has('graph', 'has-nested-containers')) {
      match = { archetype: 'divisional-holarchy', confidence: 'high' };
    }

    const escalationCount = facts.get('kind:ESCALATES_TO', 'count') as number | undefined;
    if (!match && escalationCount !== undefined && escalationCount >= 2) {
      facts.assert('graph', 'has-escalation-chains', true);
      facts.assert('graph', 'escalation-count', escalationCount);
      match = { archetype: 'tiered-escalation', confidence: 'high' };
    }

    const delegationChain = facts.has('kind:DELEGATES_TO', 'is-linear-chain');
    const reportsToCount = facts.get('kind:REPORTS_TO', 'count') as number | undefined;
    if (!match && delegationChain && !(reportsToCount && reportsToCount > 0)) {
      match = { archetype: 'pipeline', confidence: 'high' };
    }

    const delegationHub = facts.has('kind:DELEGATES_TO', 'has-hub');
    if (!match && delegationHub && reportsToCount && reportsToCount >= 2) {
      match = { archetype: 'federation', confidence: 'high' };
    }

    const supervisesCount = facts.get('kind:SUPERVISES', 'count') as number | undefined;
    if (!match && reportsToCount && reportsToCount >= 2 && (!supervisesCount || supervisesCount === 0)) {
      match = { archetype: 'coalition', confidence: 'medium' };
    }

    const supervisionDepth = facts.get('kind:SUPERVISES', 'tree-depth') as number | undefined;
    if (!match && supervisionDepth !== undefined && supervisionDepth > 2) {
      facts.assert('graph', 'supervision-depth', supervisionDepth);
      match = { archetype: 'hierarchy', confidence: 'high' };
    }

    if (!match && facts.has('kind:SUPERVISES', 'single-source')) {
      match = { archetype: 'simple-structure', confidence: 'high' };
    }

    const backsUpCount = facts.get('kind:BACKS_UP', 'count') as number | undefined;
    if (!match && backsUpCount && backsUpCount > 0 && (!supervisesCount || supervisesCount === 0)) {
      match = { archetype: 'professional-bureaucracy', confidence: 'medium' };
    }

    if (match) {
      facts.assert('graph', 'archetype', match.archetype);
      facts.assert('graph', 'archetype-confidence', match.confidence);
      facts.assert('graph', 'recommended-strategy', ARCHETYPE_LAYOUT[match.archetype]);
    } else {
      facts.assert('graph', 'archetype', 'simple-structure');
      facts.assert('graph', 'archetype-confidence', 'low');
      facts.assert('graph', 'recommended-strategy', 'force');
    }
  },
};

export function defaultClassifiers(): ClassificationRule[] {
  return [
    edgeKindAnalyzer,
    extendedEdgeDetector,
    multiParentDetector,
    nestedContainerDetector,
    archetypeSelector,
  ];
}
