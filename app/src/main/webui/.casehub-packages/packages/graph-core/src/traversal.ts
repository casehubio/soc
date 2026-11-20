import type { GraphNode, GraphModel } from './model.js';

export function childrenOf(model: GraphModel, parentId: string): readonly GraphNode[] {
  return model.nodes.filter(n => n.parentId === parentId);
}

export function ancestorsOf(model: GraphModel, nodeId: string): readonly GraphNode[] {
  const nodeMap = new Map(model.nodes.map(n => [n.id, n]));
  const target = nodeMap.get(nodeId);
  if (!target) return [];

  const ancestors: GraphNode[] = [];
  const visited = new Set<string>();
  visited.add(nodeId);
  let current = target.parentId !== undefined ? nodeMap.get(target.parentId) : undefined;

  while (current) {
    if (visited.has(current.id)) {
      throw new Error(`Containment cycle detected at node '${current.id}'`);
    }
    visited.add(current.id);
    ancestors.push(current);
    current = current.parentId !== undefined ? nodeMap.get(current.parentId) : undefined;
  }

  return ancestors;
}

export function subtreeOf(model: GraphModel, nodeId: string): readonly GraphNode[] {
  const nodeMap = new Map(model.nodes.map(n => [n.id, n]));
  const root = nodeMap.get(nodeId);
  if (!root) return [];

  const result: GraphNode[] = [];
  const visited = new Set<string>();
  const queue: GraphNode[] = [root];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current.id)) {
      throw new Error(`Containment cycle detected at node '${current.id}'`);
    }
    visited.add(current.id);
    result.push(current);

    for (const child of model.nodes) {
      if (child.parentId === current.id) {
        queue.push(child);
      }
    }
  }

  return result;
}

export function rootNodes(model: GraphModel): readonly GraphNode[] {
  return model.nodes.filter(n => n.parentId === undefined);
}
