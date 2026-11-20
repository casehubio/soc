import type { NodeDecoration } from '@casehubio/graph-core';
import type { DagResultSnapshot, DagPlanSnapshot, NodeStateSnapshot } from '../types/index.js';
import { toDecoration } from './decoration.js';

export function dagToDecorations(
  result: DagResultSnapshot,
): ReadonlyMap<string, NodeDecoration> {
  const decorations = new Map<string, NodeDecoration>();

  for (const [nodeId, state] of Object.entries(result.nodeStates)) {
    decorations.set(`dag:${nodeId}`, toDecoration('node', state.kind.toUpperCase()));
  }

  return decorations;
}

export function nodeStatesToTaskStates(
  plan: DagPlanSnapshot,
  result: DagResultSnapshot,
): Record<string, NodeStateSnapshot> {
  const taskStates: Record<string, NodeStateSnapshot> = {};

  for (const [nodeId, state] of Object.entries(result.nodeStates)) {
    const dagNode = plan.nodes[nodeId];
    if (dagNode != null) {
      taskStates[dagNode.taskId] = state;
    }
  }

  return taskStates;
}
