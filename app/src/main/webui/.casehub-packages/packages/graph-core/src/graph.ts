import type { GraphNode, GraphEdge, GraphModel } from './model.js';

export type GraphViolationRule =
  | 'empty_id'
  | 'duplicate_node_id'
  | 'duplicate_edge_id'
  | 'dangling_edge'
  | 'invalid_parent'
  | 'self_parent'
  | 'containment_cycle';

export interface GraphViolation {
  readonly rule: GraphViolationRule;
  readonly message: string;
  readonly nodeId?: string;
  readonly edgeId?: string;
}

export class GraphValidationError extends Error {
  readonly violations: readonly GraphViolation[];

  constructor(violations: readonly GraphViolation[]) {
    const summary = violations.map(v => v.message).join('; ');
    super(`Invalid graph: ${summary}`);
    this.name = 'GraphValidationError';
    this.violations = violations;
  }
}

export function validateGraph(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
): readonly GraphViolation[] {
  const violations: GraphViolation[] = [];
  const nodeIds = new Set<string>();

  for (const node of nodes) {
    if (!node.id.trim()) {
      violations.push({
        rule: 'empty_id',
        message: 'Node has empty or whitespace-only ID',
        nodeId: node.id,
      });
      continue;
    }
    if (nodeIds.has(node.id)) {
      violations.push({
        rule: 'duplicate_node_id',
        message: `Duplicate node ID '${node.id}'`,
        nodeId: node.id,
      });
    }
    nodeIds.add(node.id);
  }

  const edgeIds = new Set<string>();
  for (const edge of edges) {
    if (!edge.id.trim()) {
      violations.push({
        rule: 'empty_id',
        message: 'Edge has empty or whitespace-only ID',
        edgeId: edge.id,
      });
      continue;
    }
    if (edgeIds.has(edge.id)) {
      violations.push({
        rule: 'duplicate_edge_id',
        message: `Duplicate edge ID '${edge.id}'`,
        edgeId: edge.id,
      });
    }
    edgeIds.add(edge.id);

    if (!nodeIds.has(edge.source)) {
      violations.push({
        rule: 'dangling_edge',
        message: `Edge '${edge.id}' references non-existent source '${edge.source}'`,
        edgeId: edge.id,
        nodeId: edge.source,
      });
    }
    if (!nodeIds.has(edge.target)) {
      violations.push({
        rule: 'dangling_edge',
        message: `Edge '${edge.id}' references non-existent target '${edge.target}'`,
        edgeId: edge.id,
        nodeId: edge.target,
      });
    }
  }

  const flaggedNodes = new Set(
    violations
      .filter(v => v.rule === 'self_parent' || v.rule === 'invalid_parent')
      .map(v => v.nodeId),
  );

  for (const node of nodes) {
    if (node.parentId === undefined) continue;
    if (node.parentId === node.id) {
      violations.push({
        rule: 'self_parent',
        message: `Node '${node.id}' references itself as parent`,
        nodeId: node.id,
      });
      flaggedNodes.add(node.id);
    } else if (!nodeIds.has(node.parentId)) {
      violations.push({
        rule: 'invalid_parent',
        message: `Node '${node.id}' references non-existent parent '${node.parentId}'`,
        nodeId: node.id,
      });
      flaggedNodes.add(node.id);
    }
  }

  const parentMap = new Map<string, string>();
  for (const node of nodes) {
    if (node.parentId !== undefined && !flaggedNodes.has(node.id)) {
      parentMap.set(node.id, node.parentId);
    }
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();
  for (const nodeId of parentMap.keys()) {
    if (visited.has(nodeId)) continue;
    const path: string[] = [];
    let current: string | undefined = nodeId;
    while (current !== undefined && !visited.has(current) && parentMap.has(current)) {
      if (inStack.has(current)) {
        violations.push({
          rule: 'containment_cycle',
          message: `Containment cycle detected involving node '${current}'`,
          nodeId: current,
        });
        break;
      }
      inStack.add(current);
      path.push(current);
      current = parentMap.get(current);
    }
    for (const p of path) {
      visited.add(p);
      inStack.delete(p);
    }
  }

  return violations;
}

export function createGraph(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
  metadata?: Readonly<Record<string, unknown>>,
): GraphModel {
  const violations = validateGraph(nodes, edges);
  if (violations.length > 0) {
    throw new GraphValidationError(violations);
  }
  const model: GraphModel = { nodes, edges };
  if (metadata !== undefined) {
    return { ...model, metadata };
  }
  return model;
}
