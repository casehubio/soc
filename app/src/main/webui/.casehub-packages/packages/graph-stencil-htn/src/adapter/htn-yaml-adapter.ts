import { parse as parseYaml } from 'yaml';
import { createGraph } from '@casehubio/graph-core';
import type { GraphNode, GraphEdge } from '@casehubio/graph-core';

export interface HtnAdapterResult {
  readonly model: ReturnType<typeof createGraph>;
  readonly yamlPaths: ReadonlyMap<string, readonly (string | number)[]>;
}

interface HtnTask {
  name: string;
  capability?: string;
  definitionRef?: string;
  methods?: HtnMethod[];
  [k: string]: unknown;
}

interface HtnMethod {
  guard?: string;
  guardLabel?: string;
  strategy?: string;
  estimatedCost?: number;
  estimatedDuration?: string;
  tasks: HtnTask[];
  [k: string]: unknown;
}

export function htnYamlToGraph(yaml: string): HtnAdapterResult {
  const parsed = parseYaml(yaml) as Record<string, unknown>;
  const spec = parsed['spec'] as Record<string, unknown> | undefined;
  const decomposition = spec?.['decomposition'] as { root: HtnTask } | undefined;
  if (!decomposition?.root) {
    return { model: createGraph([], []), yamlPaths: new Map() };
  }

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const yamlPaths = new Map<string, (string | number)[]>();
  let counter = 0;

  function walkTask(task: HtnTask, path: (string | number)[]): string {
    const id = `htn-${counter++}`;
    const isCompound = task.methods && task.methods.length > 0;

    if (isCompound) {
      nodes.push({
        id,
        type: 'htn-compound',
        properties: { ...task, methods: undefined, methodCount: task.methods!.length },
      });
      yamlPaths.set(id, [...path]);

      task.methods!.forEach((method, mi) => {
        const methodId = `htn-${counter++}`;
        nodes.push({
          id: methodId,
          type: 'htn-method',
          properties: { ...method, tasks: undefined, guardLabel: method.guardLabel ?? '', guard: method.guard ?? '' },
        });
        yamlPaths.set(methodId, [...path, 'methods', mi]);

        edges.push({
          id: `${id}--decomposition--${methodId}`,
          type: 'decomposition',
          source: id,
          target: methodId,
        });

        method.tasks.forEach((child, ci) => {
          const childId = walkTask(child, [...path, 'methods', mi, 'tasks', ci]);
          edges.push({
            id: `${methodId}--contains--${childId}`,
            type: 'contains',
            source: methodId,
            target: childId,
          });
        });
      });
    } else {
      nodes.push({
        id,
        type: 'htn-leaf',
        properties: { ...task },
      });
      yamlPaths.set(id, [...path]);
    }

    return id;
  }

  walkTask(decomposition.root, ['spec', 'decomposition', 'root']);

  const definitions = parsed['definitions'] as Record<string, unknown> | undefined;

  return {
    model: createGraph(nodes, edges),
    yamlPaths,
    ...(definitions ? { definitions } : {}),
  };
}
