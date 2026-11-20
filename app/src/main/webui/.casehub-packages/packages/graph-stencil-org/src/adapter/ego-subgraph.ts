import type { GraphModel, GraphNode, GraphEdge } from '@casehubio/graph-core';

export function extractEgoSubgraph(model: GraphModel, egoAgentId: string): GraphModel {
  const egoNodeIds = new Set<string>();
  const neighbourNodeIds = new Set<string>();
  const includedUnitIds = new Set<string>();

  for (const node of model.nodes) {
    if (node.type === 'org-agent' && node.properties['agentId'] === egoAgentId) {
      egoNodeIds.add(node.id);
      if (node.parentId) includedUnitIds.add(node.parentId);
    }
  }

  const relevantEdges: GraphEdge[] = [];
  for (const edge of model.edges) {
    const sourceIsEgo = egoNodeIds.has(edge.source);
    const targetIsEgo = egoNodeIds.has(edge.target);
    if (sourceIsEgo || targetIsEgo) {
      relevantEdges.push(edge);
      const otherId = sourceIsEgo ? edge.target : edge.source;
      neighbourNodeIds.add(otherId);
    }
  }

  for (const node of model.nodes) {
    if (neighbourNodeIds.has(node.id) && node.parentId) {
      includedUnitIds.add(node.parentId);
    }
  }

  const includedNodeIds = new Set([...egoNodeIds, ...neighbourNodeIds, ...includedUnitIds]);

  const nodes: GraphNode[] = model.nodes.filter(n => includedNodeIds.has(n.id));
  const edges: GraphEdge[] = relevantEdges;

  return { nodes, edges, ...(model.metadata ? { metadata: model.metadata } : {}) };
}
