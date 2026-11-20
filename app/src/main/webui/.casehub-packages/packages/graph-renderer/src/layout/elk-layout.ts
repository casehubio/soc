import ELK, { type ElkNode, type ElkExtendedEdge } from 'elkjs/lib/elk.bundled.js';
import type { GraphModel, GraphNode } from '@casehubio/graph-core';
import { rootNodes, childrenOf } from '@casehubio/graph-core';

export interface ElkLayoutOptions {
  direction?: 'DOWN' | 'RIGHT' | 'LEFT' | 'UP';
  spacing?: number;
  containerPadding?: number;
  nodeSizes?: ReadonlyMap<string, { width: number; height: number }>;
  wrapping?: boolean;
  algorithm?: 'layered' | 'mrtree' | 'radial' | 'force' | 'stress';
  elkOptions?: Readonly<Record<string, string>>;
  headerHeight?: number;
  partitions?: ReadonlyMap<string, number>;
}

export interface NodeLayout {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ElkLayoutResult {
  readonly nodeLayouts: ReadonlyMap<string, NodeLayout>;
}

const DEFAULT_NODE_WIDTH = 280;
const DEFAULT_NODE_HEIGHT = 53;
const DEFAULT_HEADER_HEIGHT = 35;

const CHAR_WIDTH = 7.5;
const LABEL_PADDING = 40;

function estimateNodeWidth(node: GraphNode): number {
  const label = (node.properties['label'] ?? node.properties['taskDescription'] ?? '') as string;
  if (!label) return DEFAULT_NODE_WIDTH;
  return Math.max(DEFAULT_NODE_WIDTH, Math.ceil(label.length * CHAR_WIDTH + LABEL_PADDING));
}

const elk = new ELK();

function buildElkNode(
  model: GraphModel,
  node: GraphNode,
  visited: Set<string>,
  padding: number,
  headerHeight: number,
  spacing: number,
  nodeSizes?: ReadonlyMap<string, { width: number; height: number }>,
  wrapping?: boolean,
  partitions?: ReadonlyMap<string, number>,
  elkOptions?: Readonly<Record<string, string>>,
): ElkNode {
  if (visited.has(node.id)) {
    throw new Error(`Containment cycle at node '${node.id}'`);
  }
  visited.add(node.id);

  const children = childrenOf(model, node.id);
  const size = nodeSizes?.get(node.id);
  const estimatedWidth = estimateNodeWidth(node);
  const elkNode: ElkNode = {
    id: node.id,
    width: size?.width ?? estimatedWidth,
    height: size?.height ?? DEFAULT_NODE_HEIGHT,
  };
  if (children.length > 0) {
    elkNode.children = children.map(c =>
      buildElkNode(model, c, visited, padding, headerHeight, spacing, nodeSizes, wrapping, partitions, elkOptions));
    const containerOpts: Record<string, string> = {
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.padding': `[top=${Math.max(padding, headerHeight)},left=${padding},bottom=${padding},right=${padding}]`,
      'elk.spacing.nodeNode': String(spacing),
      'elk.layered.spacing.nodeNodeBetweenLayers': String(spacing),
      ...(elkOptions ?? {}),
    };
    elkNode.layoutOptions = containerOpts;
  }
  const part = partitions?.get(node.id);
  if (part !== undefined) {
    elkNode.layoutOptions = { ...(elkNode.layoutOptions ?? {}), 'elk.partitioning.partition': String(part) };
  }
  return elkNode;
}

function extractNodeLayouts(elkNodes: ElkNode[] | undefined, map: Map<string, NodeLayout>): void {
  if (!elkNodes) return;
  for (const n of elkNodes) {
    map.set(n.id, {
      x: n.x ?? 0,
      y: n.y ?? 0,
      width: n.width ?? DEFAULT_NODE_WIDTH,
      height: n.height ?? DEFAULT_NODE_HEIGHT,
    });
    extractNodeLayouts(n.children, map);
  }
}

function findLCA(model: GraphModel, aId: string, bId: string): string | null {
  const ancestorsA = new Set<string>();
  let cur = model.nodes.find(n => n.id === aId);
  while (cur?.parentId) { ancestorsA.add(cur.parentId); cur = model.nodes.find(n => n.id === cur!.parentId); }
  cur = model.nodes.find(n => n.id === bId);
  while (cur?.parentId) {
    if (ancestorsA.has(cur.parentId)) return cur.parentId;
    cur = model.nodes.find(n => n.id === cur!.parentId);
  }
  return null;
}

function attachEdgesToLCA(
  rootElk: ElkNode,
  edgesByParent: Map<string | null, ElkExtendedEdge[]>,
): void {
  const rootEdges = edgesByParent.get(null) ?? [];
  rootElk.edges = rootEdges;
  function visit(elkNode: ElkNode): void {
    const childEdges = edgesByParent.get(elkNode.id);
    if (childEdges) elkNode.edges = childEdges;
    if (elkNode.children) elkNode.children.forEach(visit);
  }
  if (rootElk.children) rootElk.children.forEach(visit);
}

export async function computeElkLayout(
  model: GraphModel,
  options: ElkLayoutOptions = {},
): Promise<ElkLayoutResult> {
  const direction = options.direction ?? 'DOWN';
  const spacing = options.spacing ?? 50;
  const padding = options.containerPadding ?? 20;
  const headerHeight = options.headerHeight ?? DEFAULT_HEADER_HEIGHT;

  const roots = rootNodes(model);
  if (roots.length === 0) {
    if (model.nodes.length > 0) {
      throw new Error('Containment cycle: no root nodes found — every node has a parent');
    }
    return { nodeLayouts: new Map() };
  }

  const nodeSizes = options.nodeSizes;
  const rootChildren = roots.map(n =>
    buildElkNode(model, n, new Set(), padding, headerHeight, spacing,
      nodeSizes, options.wrapping, options.partitions, options.elkOptions));

  const layoutEdges = model.edges.filter(e => !e.properties?.['excludeFromLayout']);
  const edgesByParent = new Map<string | null, ElkExtendedEdge[]>();
  for (const e of layoutEdges) {
    const lca = findLCA(model, e.source, e.target);
    const list = edgesByParent.get(lca) ?? [];
    list.push({ id: e.id, sources: [e.source], targets: [e.target] });
    edgesByParent.set(lca, list);
  }

  const algorithm = options.algorithm ?? 'layered';
  const layoutOpts: Record<string, string> = {
    'elk.algorithm': algorithm,
    'elk.spacing.nodeNode': String(spacing),
    'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
    ...(options.elkOptions ?? {}),
  };

  if (algorithm === 'layered') {
    layoutOpts['elk.direction'] = direction;
    layoutOpts['elk.layered.spacing.nodeNodeBetweenLayers'] = String(spacing);
  }

  if (options.wrapping) {
    layoutOpts['elk.layered.wrapping.strategy'] = 'SINGLE_EDGE';
    layoutOpts['elk.layered.wrapping.additionalEdgeSpacing'] = '30';
    layoutOpts['elk.aspectRatio'] = '1.6';
    layoutOpts['elk.layered.wrapping.cutting.strategy'] = 'ARD';
  }

  const graph: ElkNode = {
    id: 'root',
    layoutOptions: layoutOpts,
    children: rootChildren,
  };

  attachEdgesToLCA(graph, edgesByParent);

  const layouted = await elk.layout(graph);

  const nodeLayouts = new Map<string, NodeLayout>();
  extractNodeLayouts(layouted.children, nodeLayouts);

  return { nodeLayouts };
}
