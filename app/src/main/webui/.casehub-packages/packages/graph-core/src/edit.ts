import type { GraphModel, GraphNode, GraphEdge } from './model.js';
import type { ConstraintViolation } from './validator.js';
import { validateConstraints } from './validator.js';
import { subtreeOf } from './traversal.js';

export interface EditResult {
  readonly model: GraphModel;
  readonly violations: readonly ConstraintViolation[];
}

export function addNode(model: GraphModel, newNode: GraphNode): EditResult {
  if (model.nodes.some(n => n.id === newNode.id)) {
    throw new Error(`Duplicate node ID '${newNode.id}'`);
  }
  if (newNode.parentId !== undefined && !model.nodes.some(n => n.id === newNode.parentId)) {
    throw new Error(`Parent node '${newNode.parentId}' not found`);
  }
  const newModel: GraphModel = {
    ...model,
    nodes: [...model.nodes, newNode],
  };
  return { model: newModel, violations: validateConstraints(newModel) };
}

export function removeNode(model: GraphModel, nodeId: string): EditResult {
  if (!model.nodes.some(n => n.id === nodeId)) {
    throw new Error(`Node '${nodeId}' not found`);
  }
  const subtree = subtreeOf(model, nodeId);
  const removeIds = new Set(subtree.map(n => n.id));
  const newModel: GraphModel = {
    ...model,
    nodes: model.nodes.filter(n => !removeIds.has(n.id)),
    edges: model.edges.filter(e => !removeIds.has(e.source) && !removeIds.has(e.target)),
  };
  return { model: newModel, violations: validateConstraints(newModel) };
}

export function replaceNode(model: GraphModel, nodeId: string, newNode: GraphNode): EditResult {
  if (!model.nodes.some(n => n.id === nodeId)) {
    throw new Error(`Node '${nodeId}' not found`);
  }
  if (newNode.id !== nodeId) {
    throw new Error(`Replacement node ID '${newNode.id}' must match target '${nodeId}'`);
  }
  const newModel: GraphModel = {
    ...model,
    nodes: model.nodes.map(n => n.id === nodeId ? newNode : n),
  };
  return { model: newModel, violations: validateConstraints(newModel) };
}

export function addEdge(model: GraphModel, newEdge: GraphEdge): EditResult {
  if (model.edges.some(e => e.id === newEdge.id)) {
    throw new Error(`Duplicate edge ID '${newEdge.id}'`);
  }
  if (!model.nodes.some(n => n.id === newEdge.source)) {
    throw new Error(`Source node '${newEdge.source}' not found`);
  }
  if (!model.nodes.some(n => n.id === newEdge.target)) {
    throw new Error(`Target node '${newEdge.target}' not found`);
  }
  const newModel: GraphModel = {
    ...model,
    edges: [...model.edges, newEdge],
  };
  return { model: newModel, violations: validateConstraints(newModel) };
}

export function reconnectEdge(
  model: GraphModel,
  edgeId: string,
  endpoints: { source?: string; target?: string },
): EditResult {
  const edge = model.edges.find(e => e.id === edgeId);
  if (!edge) {
    throw new Error(`Edge '${edgeId}' not found`);
  }
  if (endpoints.source === undefined && endpoints.target === undefined) {
    throw new Error('At least one endpoint (source or target) must be specified');
  }
  if (endpoints.source !== undefined && !model.nodes.some(n => n.id === endpoints.source)) {
    throw new Error(`Node '${endpoints.source}' not found`);
  }
  if (endpoints.target !== undefined && !model.nodes.some(n => n.id === endpoints.target)) {
    throw new Error(`Node '${endpoints.target}' not found`);
  }
  const newModel: GraphModel = {
    ...model,
    edges: model.edges.map(e => {
      if (e.id !== edgeId) return e;
      return {
        ...e,
        source: endpoints.source ?? e.source,
        target: endpoints.target ?? e.target,
      };
    }),
  };
  return { model: newModel, violations: validateConstraints(newModel) };
}

export function splitEdge(model: GraphModel, edgeId: string, insertNode: GraphNode): EditResult {
  const edge = model.edges.find(e => e.id === edgeId);
  if (!edge) {
    throw new Error(`Edge '${edgeId}' not found`);
  }
  const newEdge1: GraphEdge = {
    id: `${edgeId}-pre`,
    type: edge.type,
    source: edge.source,
    target: insertNode.id,
  };
  const newEdge2: GraphEdge = {
    id: `${edgeId}-post`,
    type: edge.type,
    source: insertNode.id,
    target: edge.target,
  };
  let result = removeEdge(model, edgeId);
  result = addNode(result.model, insertNode);
  result = addEdge(result.model, newEdge1);
  result = addEdge(result.model, newEdge2);
  return result;
}

export function removeNodes(model: GraphModel, nodeIds: ReadonlySet<string>): EditResult {
  if (nodeIds.size === 0) return { model, violations: [] };

  const ordered: string[] = [];
  const remaining = new Set(nodeIds);

  while (remaining.size > 0) {
    const leaves: string[] = [];
    for (const id of remaining) {
      const hasChildInSet = model.nodes.some(
        n => n.parentId === id && remaining.has(n.id),
      );
      if (!hasChildInSet) leaves.push(id);
    }
    if (leaves.length === 0) {
      for (const id of remaining) ordered.push(id);
      break;
    }
    for (const id of leaves) {
      ordered.push(id);
      remaining.delete(id);
    }
  }

  let current = model;
  const allViolations: ConstraintViolation[] = [];
  for (const id of ordered) {
    const result = removeNode(current, id);
    current = result.model;
    allViolations.push(...result.violations);
  }
  return { model: current, violations: allViolations };
}

export function removeEdge(model: GraphModel, edgeId: string): EditResult {
  if (!model.edges.some(e => e.id === edgeId)) {
    throw new Error(`Edge '${edgeId}' not found`);
  }
  const newModel: GraphModel = {
    ...model,
    edges: model.edges.filter(e => e.id !== edgeId),
  };
  return { model: newModel, violations: validateConstraints(newModel) };
}
