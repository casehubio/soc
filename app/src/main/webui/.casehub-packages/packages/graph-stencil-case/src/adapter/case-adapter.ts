import { parse as parseYaml } from 'yaml';
import { createGraph } from '@casehubio/graph-core';
import type { GraphNode, GraphEdge, GraphModel } from '@casehubio/graph-core';
import type { CaseDefinition } from '../types/case-definition.js';

export interface AdapterResult {
  readonly model: GraphModel;
  readonly yamlPaths: ReadonlyMap<string, readonly (string | number)[]>;
}

export function toGraph(yaml: string): AdapterResult {
  const def = parseYaml(yaml) as CaseDefinition;
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const yamlPaths = new Map<string, (string | number)[]>();

  const capabilityToWorker = new Map<string, string>();

  let workerIndex = 0;
  for (const worker of def.spec.workers ?? []) {
    const nodeId = `worker:${worker.name}`;
    nodes.push({
      id: nodeId,
      type: 'worker',
      properties: { ...worker },
    });
    yamlPaths.set(nodeId, ['spec', 'workers', workerIndex]);
    for (const cap of worker.capabilities) {
      capabilityToWorker.set(cap, nodeId);
    }
    workerIndex++;
  }

  let bindingIndex = 0;
  for (const binding of def.spec.bindings ?? []) {
    const nodeId = binding.name
      ? `binding:${binding.name}`
      : `binding:_${bindingIndex}`;
    nodes.push({
      id: nodeId,
      type: 'binding',
      properties: { ...binding },
    });
    yamlPaths.set(nodeId, ['spec', 'bindings', bindingIndex]);

    const capName = typeof binding.capability === 'string'
      ? binding.capability
      : (binding.capability as { name?: string } | undefined)?.name;
    if (capName) {
      const workerNodeId = capabilityToWorker.get(capName);
      if (workerNodeId) {
        edges.push({
          id: `${nodeId}--capability-dispatch--${workerNodeId}`,
          type: 'capability-dispatch',
          source: nodeId,
          target: workerNodeId,
        });
      } else if (!binding.subCase) {
        const extId = `external:${capName}`;
        if (!nodes.some(n => n.id === extId)) {
          nodes.push({ id: extId, type: 'external', properties: { name: capName } });
        }
        edges.push({
          id: `${nodeId}--capability-dispatch--${extId}`,
          type: 'capability-dispatch',
          source: nodeId,
          target: extId,
        });
      }
    }

    if (binding.subCase) {
      const sub = binding.subCase;
      const subId = typeof sub === 'string'
        ? `subcase:${sub}`
        : `subcase:${sub.namespace}/${sub.name}`;
      if (!nodes.some(n => n.id === subId)) {
        nodes.push({
          id: subId,
          type: 'subcase',
          properties: typeof sub === 'string' ? { name: sub } : { ...sub },
        });
      }
      edges.push({
        id: `${nodeId}--subcase-spawn--${subId}`,
        type: 'subcase-spawn',
        source: nodeId,
        target: subId,
      });
    }

    bindingIndex++;
  }

  const bindingNames = new Set((def.spec.bindings ?? []).map(b => b.name).filter((n): n is string => Boolean(n)));

  let milestoneIndex = 0;
  for (const milestone of def.spec.milestones ?? []) {
    const nodeId = `milestone:${milestone.name}`;
    nodes.push({
      id: nodeId,
      type: 'milestone',
      properties: { ...milestone },
    });
    yamlPaths.set(nodeId, ['spec', 'milestones', milestoneIndex]);

    if (milestone.condition) {
      for (const bName of bindingNames) {
        if (milestone.condition.includes(bName)) {
          edges.push({
            id: `binding:${bName}--condition--${nodeId}`,
            type: 'condition',
            source: `binding:${bName}`,
            target: nodeId,
          });
        }
      }
    }
    milestoneIndex++;
  }

  const milestoneNames = new Set((def.spec.milestones ?? []).map(m => m.name));

  let goalIndex = 0;
  for (const goal of def.spec.goals ?? []) {
    const nodeId = `goal:${goal.name}`;
    nodes.push({
      id: nodeId,
      type: 'goal',
      properties: { ...goal },
    });
    yamlPaths.set(nodeId, ['spec', 'goals', goalIndex]);

    const expr = JSON.stringify(goal.expression ?? {});
    for (const mName of milestoneNames) {
      if (expr.includes(mName)) {
        edges.push({
          id: `milestone:${mName}--goal--${nodeId}`,
          type: 'goal-condition',
          source: `milestone:${mName}`,
          target: nodeId,
        });
      }
    }
    for (const bName of bindingNames) {
      if (expr.includes(bName)) {
        edges.push({
          id: `binding:${bName}--goal--${nodeId}`,
          type: 'goal-condition',
          source: `binding:${bName}`,
          target: nodeId,
        });
      }
    }
    goalIndex++;
  }

  const definitions = (def as Record<string, unknown>)['definitions'] as
    Record<string, unknown> | undefined;

  return {
    model: createGraph(nodes, edges),
    yamlPaths,
    ...(definitions ? { definitions } : {}),
  };
}
