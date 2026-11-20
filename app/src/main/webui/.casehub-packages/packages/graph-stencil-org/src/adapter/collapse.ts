import type { GraphModel } from '@casehubio/graph-core';

export function applyCollapsedUnits(
  model: GraphModel,
  yamlPaths: ReadonlyMap<string, readonly (string | number)[]>,
  collapsedUnits: ReadonlySet<string>,
): { model: GraphModel; yamlPaths: ReadonlyMap<string, readonly (string | number)[]> } {
  if (collapsedUnits.size === 0) return { model, yamlPaths };

  const collapsedNodeIds = new Set<string>();
  for (const node of model.nodes) {
    if (node.type === 'org-agent' && node.parentId) {
      const parentUnitId = node.parentId.replace(/^unit:/, '');
      if (collapsedUnits.has(parentUnitId)) {
        collapsedNodeIds.add(node.id);
      }
    }
  }

  const nodes = model.nodes.filter(n => !collapsedNodeIds.has(n.id));
  const edges = model.edges.filter(
    e => !collapsedNodeIds.has(e.source) && !collapsedNodeIds.has(e.target),
  );

  const filteredPaths = new Map<string, readonly (string | number)[]>();
  for (const [key, path] of yamlPaths) {
    if (!collapsedNodeIds.has(key)) filteredPaths.set(key, path);
  }

  return { model: { nodes, edges }, yamlPaths: filteredPaths };
}
