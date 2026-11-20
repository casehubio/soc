import type { GraphModel } from '@casehubio/graph-core';
import {
  computeElkLayout,
  type ElkLayoutOptions,
  type ElkLayoutResult,
  type NodeLayout,
} from '@casehubio/graph-renderer';

function overlaps(a: NodeLayout, b: NodeLayout): boolean {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}

/** Preserve ELK's routing while separating the occasional overlapping sibling tasks. */
export async function computeSwfLayout(
  model: GraphModel,
  options: ElkLayoutOptions,
): Promise<ElkLayoutResult> {
  const layout = await computeElkLayout(model, options);
  const nodeLayouts = new Map(layout.nodeLayouts);
  if (options.direction === 'DOWN') {
    const visible = model.nodes.filter(node => !node.parentId || node.parentId === 'root')
      .filter(node => node.type !== 'swf-root');
    const ids = new Set(visible.map(node => node.id));
    const incoming = new Map(visible.map(node => [node.id, [] as string[]]));
    const outgoing = new Map(visible.map(node => [node.id, [] as string[]]));
    for (const edge of model.edges) {
      if (ids.has(edge.source) && ids.has(edge.target)) {
        outgoing.get(edge.source)!.push(edge.target);
        incoming.get(edge.target)!.push(edge.source);
      }
    }

    const indegree = new Map(visible.map(node => [node.id, incoming.get(node.id)!.length]));
    const depth = new Map(visible.map(node => [node.id, 0]));
    const queue = visible.filter(node => indegree.get(node.id) === 0).map(node => node.id);
    let visited = 0;
    for (let i = 0; i < queue.length; i++) {
      const source = queue[i]!;
      visited++;
      for (const target of outgoing.get(source)!) {
        depth.set(target, Math.max(depth.get(target)!, depth.get(source)! + 1));
        indegree.set(target, indegree.get(target)! - 1);
        if (indegree.get(target) === 0) queue.push(target);
      }
    }

    if (visited === visible.length) {
      const layers = new Map<number, string[]>();
      for (const node of visible) {
        const level = depth.get(node.id)!;
        const row = layers.get(level) ?? [];
        row.push(node.id);
        layers.set(level, row);
      }
      const gap = Math.max(40, options.spacing ?? 50);
      const cellWidth = Math.max(...visible.map(node => nodeLayouts.get(node.id)?.width ?? 280), 280) + gap;
      const center = Math.floor(Math.max(...[...layers.values()].map(row => row.length)) / 2);
      let y = gap;
      for (const [level, row] of [...layers].sort(([a], [b]) => a - b)) {
        row.sort((a, b) => (nodeLayouts.get(a)?.x ?? 0) - (nodeLayouts.get(b)?.x ?? 0));
        for (const [index, id] of row.entries()) {
          const original = nodeLayouts.get(id);
          if (!original) continue;
          const predecessor = incoming.get(id)!;
          const predecessorRow = predecessor.length === 1 ? layers.get(depth.get(predecessor[0]!)!) : undefined;
          const inheritedX = predecessorRow && predecessorRow.length > 1
            ? nodeLayouts.get(predecessor[0]!)?.x : undefined;
          nodeLayouts.set(id, {
            ...original,
            x: row.length === 1 ? inheritedX ?? center * cellWidth : index * cellWidth,
            y,
          });
        }
        y += Math.max(...row.map(id => nodeLayouts.get(id)?.height ?? 53)) + gap;
      }
      return { nodeLayouts };
    }
  }
  const siblings = new Map<string, string[]>();

  for (const node of model.nodes) {
    const parent = !node.parentId || node.parentId === 'root' ? '__root__' : node.parentId;
    const group = siblings.get(parent) ?? [];
    group.push(node.id);
    siblings.set(parent, group);
  }

  const horizontal = options.direction === 'RIGHT' || options.direction === 'LEFT';
  const gap = Math.max(20, options.spacing ?? 50);
  for (const ids of siblings.values()) {
    const placed: NodeLayout[] = [];
    const ordered = ids
      .map(id => [id, nodeLayouts.get(id)] as const)
      .filter((entry): entry is readonly [string, NodeLayout] => entry[1] !== undefined)
      .sort(([, a], [, b]) => horizontal ? a.x - b.x : a.y - b.y);

    for (const [id, original] of ordered) {
      let current = { ...original };
      while (placed.some(other => overlaps(current, other))) {
        if (horizontal) {
          current = { ...current, x: Math.max(...placed.map(other => other.x + other.width)) + gap };
        } else {
          current = { ...current, y: Math.max(...placed.map(other => other.y + other.height)) + gap };
        }
      }
      nodeLayouts.set(id, current);
      placed.push(current);
    }
  }

  return { nodeLayouts };
}
