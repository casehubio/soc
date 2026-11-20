import { describe, it, expect } from 'vitest';
import { dagToGraph } from './dag-adapter.js';
import type { DagPlanSnapshot, DagNodeSnapshot } from '../types/index.js';

function node(
  id: string,
  deps: string[] = [],
  joinType: 'ALL_OF' | 'ANY_OF' = 'ALL_OF',
  taskId?: string,
): DagNodeSnapshot {
  return {
    id,
    taskId: taskId ?? `task-${id}`,
    taskDescription: `Task ${id}`,
    executorName: `exec-${id}`,
    dependsOn: deps,
    joinType,
  };
}

function plan(nodes: DagNodeSnapshot[]): DagPlanSnapshot {
  const map: Record<string, DagNodeSnapshot> = {};
  for (const n of nodes) map[n.id] = n;
  return { nodes: map, timestamp: '2026-08-06T10:00:00Z' };
}

describe('dagToGraph', () => {
  it('single node → one GraphNode, no edges, entry and exit', () => {
    const result = dagToGraph(plan([node('a')]));
    expect(result.model.nodes).toHaveLength(1);
    expect(result.model.nodes[0]!.id).toBe('dag:a');
    expect(result.model.nodes[0]!.type).toBe('dag-node');
    expect(result.model.edges).toHaveLength(0);
    expect(result.entryNodeIds.has('dag:a')).toBe(true);
    expect(result.exitNodeIds.has('dag:a')).toBe(true);
  });

  it('linear chain A→B→C → 3 nodes, 2 edges, correct direction', () => {
    const result = dagToGraph(plan([node('a'), node('b', ['a']), node('c', ['b'])]));
    expect(result.model.nodes).toHaveLength(3);
    expect(result.model.edges).toHaveLength(2);
    const edge = result.model.edges.find(e => e.target === 'dag:b');
    expect(edge).toBeDefined();
    expect(edge!.source).toBe('dag:a');
    expect(edge!.type).toBe('dependency');
    expect(result.entryNodeIds).toEqual(new Set(['dag:a']));
    expect(result.exitNodeIds).toEqual(new Set(['dag:c']));
  });

  it('diamond → 4 nodes, 4 edges', () => {
    const result = dagToGraph(plan([
      node('a'), node('b', ['a']), node('c', ['a']), node('d', ['b', 'c']),
    ]));
    expect(result.model.nodes).toHaveLength(4);
    expect(result.model.edges).toHaveLength(4);
    expect(result.entryNodeIds).toEqual(new Set(['dag:a']));
    expect(result.exitNodeIds).toEqual(new Set(['dag:d']));
  });

  it('preserves JoinType in node properties', () => {
    const result = dagToGraph(plan([node('a'), node('b', ['a'], 'ANY_OF')]));
    const bNode = result.model.nodes.find(n => n.id === 'dag:b');
    expect(bNode!.properties['joinType']).toBe('ANY_OF');
    expect(bNode!.properties['dependsOn']).toEqual(['a']);
  });

  it('builds taskIdToGraphNodeId map', () => {
    const result = dagToGraph(plan([node('n1', [], 'ALL_OF', 'my-task')]));
    expect(result.taskIdToGraphNodeId.get('my-task')).toBe('dag:n1');
  });
});
