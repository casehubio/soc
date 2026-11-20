import { parse as parseYaml, stringify } from 'yaml';
import { createGraph } from '@casehubio/graph-core';
import type { GraphNode, GraphEdge } from '@casehubio/graph-core';
import { buildFlatGraph } from '@openworkflowspec/sdk';
import type { Specification, FlatGraphNode, GraphEdge as SdkGraphEdge } from '@openworkflowspec/sdk';
import { buildYamlPaths } from './yaml-path-walker.js';
import { SWF_KNOWN_TYPES, SYNTHETIC_TYPES, SWF_TYPE_PREFIX, type AdapterResult } from '../types.js';

export function toSwfGraph(yaml: string): AdapterResult {
  const raw = parseYaml(yaml) as Specification.Workflow;
  const flatGraph = buildFlatGraph(raw, true);
  const yamlPaths = buildYamlPaths(yaml);

  const allSdkNodes = [flatGraph, ...flatGraph.nodes];
  const taskSdkNodes = allSdkNodes.filter(n => !SYNTHETIC_TYPES.has(n.type as string));

  let degraded: { reason: string } | undefined;
  if (yamlPaths.size !== taskSdkNodes.length) {
    degraded = { reason: `yamlPaths/model mismatch: ${yamlPaths.size} paths for ${taskSdkNodes.length} task nodes` };
  } else {
    for (const node of taskSdkNodes) {
      if (!yamlPaths.has(node.id)) {
        degraded = { reason: `No YAML path for task node '${node.id}'` };
        break;
      }
    }
  }

  const nodes: GraphNode[] = allSdkNodes.map(mapNode);
  const parentMap = new Map(allSdkNodes.filter(n => n.parentId).map(n => [n.id, n.parentId!]));
  const rawEdges: GraphEdge[] = flatGraph.edges.map(e => mapEdge(e, allSdkNodes));
  const edges = rawEdges.map(e => clampEdgeToContainerBoundary(e, parentMap));
  const model = createGraph(nodes, edges);

  const definitions = (raw as Record<string, unknown>)['definitions'] as Record<string, unknown> | undefined;

  const base = { model, yamlPaths, ...(definitions ? { definitions } : {}) };
  return degraded ? { ...base, degraded } : base;
}

function mapNode(sdkNode: FlatGraphNode): GraphNode {
  const sdkType = sdkNode.type as string;
  const isRoot = sdkType === 'root' || (!sdkNode.parentId && sdkType !== 'start' && sdkType !== 'end');
  const type = isRoot ? 'swf-root' : SWF_KNOWN_TYPES.has(sdkType) ? `${SWF_TYPE_PREFIX}${sdkType}` : 'swf-generic';

  const properties: Record<string, unknown> = {};
  if (sdkNode.label) {
    const sdkTypeStr = sdkNode.type as string;
    properties['label'] = (sdkTypeStr === 'try' || sdkTypeStr === 'catch') ? sdkTypeStr : sdkNode.label;
  }
  if (sdkNode.task) Object.assign(properties, sdkNode.task);
  if (!SWF_KNOWN_TYPES.has(sdkType)) properties['originalType'] = sdkType;

  return {
    id: sdkNode.id,
    type,
    ...(sdkNode.parentId ? { parentId: sdkNode.parentId } : {}),
    properties,
  };
}

function mapEdge(sdkEdge: SdkGraphEdge, nodes: FlatGraphNode[]): GraphEdge {
  const sourceNode = nodes.find(n => n.id === sdkEdge.sourceId);
  const edgeType = sourceNode?.type === 'switch' ? 'switch-case' : 'flow';

  return {
    id: sdkEdge.id,
    type: edgeType,
    source: sdkEdge.sourceId,
    target: sdkEdge.targetId,
    ...(sdkEdge.label ? { properties: { label: sdkEdge.label } } : {}),
  };
}

function ancestors(nodeId: string, parentMap: Map<string, string>): string[] {
  const result: string[] = [];
  let current = parentMap.get(nodeId);
  while (current) {
    result.push(current);
    current = parentMap.get(current);
  }
  return result;
}

function clampEdgeToContainerBoundary(edge: GraphEdge, parentMap: Map<string, string>): GraphEdge {
  const sourceAncestors = new Set(ancestors(edge.source, parentMap));
  const targetAncestors = new Set(ancestors(edge.target, parentMap));

  let source = edge.source;
  let target = edge.target;

  // If source is inside a container that the target is NOT inside, walk source up
  let s = parentMap.get(source);
  while (s && !targetAncestors.has(s) && s !== target) {
    source = s;
    s = parentMap.get(s);
  }

  // If target is inside a container that the source is NOT inside, walk target up
  let t = parentMap.get(target);
  while (t && !sourceAncestors.has(t) && t !== source) {
    target = t;
    t = parentMap.get(t);
  }

  if (source === edge.source && target === edge.target) return edge;
  return { ...edge, source, target };
}

export function wrapDoBlock(doBlock: unknown): string {
  return stringify({
    document: { dsl: '1.0.3', namespace: 'embedded', name: 'worker-do', version: '1.0.0' },
    do: doBlock,
  });
}
