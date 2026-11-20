import type { GraphModel, GraphEdge } from './model.js';

export interface SelectionResult {
  readonly valid: ReadonlySet<string>;
  readonly invalid: ReadonlySet<string>;
  readonly boundaryInput: GraphEdge | null;
  readonly boundaryOutput: GraphEdge | null;
}

export function validateSelection(
  candidateIds: ReadonlySet<string>,
  model: GraphModel,
): SelectionResult {
  const empty: SelectionResult = {
    valid: new Set(),
    invalid: new Set(),
    boundaryInput: null,
    boundaryOutput: null,
  };

  if (candidateIds.size === 0) return empty;

  const inbound: GraphEdge[] = [];
  const outbound: GraphEdge[] = [];

  for (const e of model.edges) {
    const srcIn = candidateIds.has(e.source);
    const tgtIn = candidateIds.has(e.target);
    if (!srcIn && tgtIn) inbound.push(e);
    else if (srcIn && !tgtIn) outbound.push(e);
  }

  if (inbound.length !== 1 || outbound.length !== 1) {
    return { ...empty, invalid: new Set(candidateIds) };
  }

  const entryNodeId = inbound[0]!.target;
  const exitNodeId = outbound[0]!.source;

  if (entryNodeId === exitNodeId) {
    return {
      valid: new Set(candidateIds),
      invalid: new Set(),
      boundaryInput: inbound[0]!,
      boundaryOutput: outbound[0]!,
    };
  }

  const visited = new Set<string>();
  const queue = [entryNodeId];
  visited.add(entryNodeId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const e of model.edges) {
      if (e.source === current && candidateIds.has(e.target) && !visited.has(e.target)) {
        visited.add(e.target);
        queue.push(e.target);
      }
    }
  }

  if (!visited.has(exitNodeId)) {
    return { ...empty, invalid: new Set(candidateIds) };
  }

  return {
    valid: new Set(candidateIds),
    invalid: new Set(),
    boundaryInput: inbound[0]!,
    boundaryOutput: outbound[0]!,
  };
}

export function canAddToSelection(
  nodeId: string,
  currentSelection: ReadonlySet<string>,
  model: GraphModel,
): SelectionResult {
  const expanded = new Set(currentSelection);
  expanded.add(nodeId);
  return validateSelection(expanded, model);
}

export function canRemoveFromSelection(
  nodeId: string,
  currentSelection: ReadonlySet<string>,
  model: GraphModel,
): SelectionResult {
  const shrunk = new Set(currentSelection);
  shrunk.delete(nodeId);
  return validateSelection(shrunk, model);
}
