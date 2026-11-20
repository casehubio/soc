import { createGraph } from '@casehubio/graph-core';
import type { GraphNode, GraphEdge, GraphModel } from '@casehubio/graph-core';
import type { DagPlanSnapshot } from '../types/dag-plan.js';

export interface DagAdapterResult {
  readonly model: GraphModel;
  readonly entryNodeIds: ReadonlySet<string>;
  readonly exitNodeIds: ReadonlySet<string>;
  readonly taskIdToGraphNodeId: ReadonlyMap<string, string>;
}

export function dagToGraph(plan: DagPlanSnapshot): DagAdapterResult {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const taskIdToGraphNodeId = new Map<string, string>();

  for (const [nodeId, snapshot] of Object.entries(plan.nodes)) {
    const graphId = `dag:${nodeId}`;
    nodes.push({
      id: graphId,
      type: 'dag-node',
      properties: { ...snapshot },
    });
    taskIdToGraphNodeId.set(snapshot.taskId, graphId);

    for (const depId of snapshot.dependsOn) {
      const sourceId = `dag:${depId}`;
      edges.push({
        id: `${sourceId}--depends-on--${graphId}`,
        type: 'dependency',
        source: sourceId,
        target: graphId,
      });
    }
  }

  const entryNodeIds = new Set<string>();
  const exitNodeIds = new Set<string>();

  for (const n of nodes) {
    if (!edges.some(e => e.target === n.id)) entryNodeIds.add(n.id);
    if (!edges.some(e => e.source === n.id)) exitNodeIds.add(n.id);
  }

  return { model: createGraph(nodes, edges), entryNodeIds, exitNodeIds, taskIdToGraphNodeId };
}
