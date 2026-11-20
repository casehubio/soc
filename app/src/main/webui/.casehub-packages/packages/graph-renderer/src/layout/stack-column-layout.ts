import type { GraphModel } from '@casehubio/graph-core';
import type { ElkLayoutResult, NodeLayout } from './elk-layout.js';

export interface StackColumnOptions {
  nodeWidth?: number;
  nodeHeight?: number;
  verticalGap?: number;
  horizontalGap?: number;
  containerPaddingX?: number;
  containerPaddingTop?: number;
  containerPaddingBottom?: number;
  innerVerticalGap?: number;
  skipTypes?: ReadonlySet<string>;
}

interface ColumnItem {
  nodeId: string;
  split?: ColumnGroup;
}

interface Column {
  items: ColumnItem[];
}

interface ColumnGroup {
  columns: Column[];
}

interface SizedItem {
  nodeId: string;
  nodeWidth: number;
  nodeHeight: number;
  split?: SizedGroup;
}

interface SizedColumn {
  items: SizedItem[];
  width: number;
  height: number;
}

interface SizedGroup {
  columns: SizedColumn[];
  width: number;
  height: number;
}

export function computeStackColumnLayout(
  model: GraphModel,
  options: StackColumnOptions = {},
): ElkLayoutResult {
  const NODE_W = options.nodeWidth ?? 280;
  const NODE_H = options.nodeHeight ?? 53;
  const V_GAP = options.verticalGap ?? 40;
  const H_GAP = options.horizontalGap ?? 30;
  const PAD_X = options.containerPaddingX ?? 20;
  const PAD_TOP = options.containerPaddingTop ?? 40;
  const PAD_BOTTOM = options.containerPaddingBottom ?? 20;
  const INNER_V = options.innerVerticalGap ?? 30;
  const SKIP = options.skipTypes ?? new Set<string>();

  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  for (const e of model.edges) {
    const out = outgoing.get(e.source) ?? [];
    out.push(e.target);
    outgoing.set(e.source, out);
    const inc = incoming.get(e.target) ?? [];
    inc.push(e.source);
    incoming.set(e.target, inc);
  }

  const topLevelIds = new Set<string>();
  for (const n of model.nodes) {
    if (SKIP.has(n.type)) continue;
    if (!n.parentId || n.parentId === 'root') topLevelIds.add(n.id);
  }

  const placed = new Set<string>();

  function buildColumn(startId: string): Column {
    const items: ColumnItem[] = [];
    let id: string | undefined = startId;

    while (id && topLevelIds.has(id) && !placed.has(id)) {
      const targets: string[] = (outgoing.get(id) ?? []).filter((t: string) => topLevelIds.has(t));

      if (targets.length <= 1) {
        items.push({ nodeId: id });
        placed.add(id);
        if (targets.length === 0) break;
        const nextInc = (incoming.get(targets[0]!) ?? []).filter(t => topLevelIds.has(t));
        if (nextInc.length > 1) break;
        id = targets[0]!;
      } else {
        placed.add(id);
        const columns = targets.map((t: string) => buildColumn(t));
        items.push({ nodeId: id, split: { columns } });
        const convergence = findConvergence(targets);
        id = convergence;
      }
    }

    return { items };
  }

  function findConvergence(branchStarts: string[]): string | undefined {
    const reachable = branchStarts.map(s => {
      const set = new Set<string>();
      const queue = [s];
      while (queue.length) {
        const cur = queue.shift()!;
        if (set.has(cur)) continue;
        set.add(cur);
        for (const t of (outgoing.get(cur) ?? []).filter(x => topLevelIds.has(x))) queue.push(t);
      }
      return set;
    });
    if (reachable.length === 0) return undefined;
    let common = reachable[0]!;
    for (let i = 1; i < reachable.length; i++) {
      common = new Set([...common].filter(x => reachable[i]!.has(x)));
    }
    for (const id of common) {
      if (!branchStarts.includes(id) && !placed.has(id)) return id;
    }
    return undefined;
  }

  function computeContainerSize(parentId: string): { w: number; h: number } {
    const children = model.nodes.filter(n => n.parentId === parentId);
    if (children.length === 0) return { w: NODE_W, h: NODE_H };
    let y = PAD_TOP;
    let maxChildW = 0;
    for (const c of children) {
      const gc = model.nodes.filter(n => n.parentId === c.id);
      if (gc.length > 0) {
        const sub = computeContainerSize(c.id);
        maxChildW = Math.max(maxChildW, sub.w);
        y += sub.h + INNER_V;
      } else {
        maxChildW = Math.max(maxChildW, NODE_W);
        y += NODE_H + INNER_V;
      }
    }
    return { w: maxChildW + 2 * PAD_X, h: y - INNER_V + PAD_BOTTOM };
  }

  function getNodeSize(nodeId: string): { w: number; h: number } {
    const children = model.nodes.filter(n => n.parentId === nodeId);
    if (children.length > 0) return computeContainerSize(nodeId);
    return { w: NODE_W, h: NODE_H };
  }

  function sizeColumn(col: Column): SizedColumn {
    const items: SizedItem[] = [];
    let width = 0;
    let height = 0;

    for (let i = 0; i < col.items.length; i++) {
      const item = col.items[i]!;
      const ns = getNodeSize(item.nodeId);
      let sizedSplit: SizedGroup | undefined;

      if (item.split) {
        sizedSplit = sizeGroup(item.split);
        width = Math.max(width, ns.w, sizedSplit.width);
        height += ns.h + V_GAP + sizedSplit.height;
      } else {
        width = Math.max(width, ns.w);
        height += ns.h;
      }

      if (i < col.items.length - 1) height += V_GAP;

      items.push({
        nodeId: item.nodeId,
        nodeWidth: ns.w,
        nodeHeight: ns.h,
        ...(sizedSplit ? { split: sizedSplit } : {}),
      });
    }

    return { items, width, height };
  }

  function sizeGroup(group: ColumnGroup): SizedGroup {
    const columns = group.columns.map(sizeColumn);
    const width = columns.reduce((sum, c) => sum + c.width, 0) + (columns.length - 1) * H_GAP;
    const height = Math.max(...columns.map(c => c.height));
    return { columns, width, height };
  }

  const nodeLayouts = new Map<string, NodeLayout>();

  function positionColumn(col: SizedColumn, x: number, y: number): void {
    let currentY = y;
    for (const item of col.items) {
      const nodeX = x + (col.width - item.nodeWidth) / 2;
      nodeLayouts.set(item.nodeId, { x: nodeX, y: currentY, width: item.nodeWidth, height: item.nodeHeight });

      if (model.nodes.some(n => n.parentId === item.nodeId)) {
        layoutChildren(item.nodeId);
      }

      currentY += item.nodeHeight + V_GAP;

      if (item.split) {
        positionGroup(item.split, x, currentY, col.width);
        currentY += item.split.height + V_GAP;
      }
    }
  }

  function positionGroup(group: SizedGroup, x: number, y: number, parentWidth: number): void {
    const groupWidth = group.columns.reduce((sum, c) => sum + c.width, 0) + (group.columns.length - 1) * H_GAP;
    let startX = x + (parentWidth - groupWidth) / 2;

    optimiseColumnOrder(group);

    for (const col of group.columns) {
      const shift = group.height - col.height;
      positionColumn(col, startX, y + shift);
      startX += col.width + H_GAP;
    }
  }

  function layoutChildren(parentId: string): void {
    const children = model.nodes.filter(n => n.parentId === parentId);
    let y = PAD_TOP;
    const parentSize = computeContainerSize(parentId);
    const innerW = parentSize.w - 2 * PAD_X;
    for (const c of children) {
      const gc = model.nodes.filter(n => n.parentId === c.id);
      if (gc.length > 0) {
        const sub = computeContainerSize(c.id);
        nodeLayouts.set(c.id, { x: PAD_X, y, width: sub.w, height: sub.h });
        layoutChildren(c.id);
        y += sub.h + INNER_V;
      } else {
        nodeLayouts.set(c.id, { x: PAD_X, y, width: innerW, height: NODE_H });
        y += NODE_H + INNER_V;
      }
    }
  }

  // --- Escape edge optimisation ---

  function collectColumnNodeIds(col: SizedColumn): Set<string> {
    const ids = new Set<string>();
    for (const item of col.items) {
      ids.add(item.nodeId);
      if (item.split) {
        for (const subcol of item.split.columns) {
          for (const id of collectColumnNodeIds(subcol)) ids.add(id);
        }
      }
    }
    return ids;
  }

  function countCrossings(group: SizedGroup): number {
    const colNodeSets = group.columns.map(c => collectColumnNodeIds(c));
    let crossings = 0;

    for (const edge of model.edges) {
      let srcCol = -1;
      let tgtCol = -1;
      for (let i = 0; i < colNodeSets.length; i++) {
        if (colNodeSets[i]!.has(edge.source)) srcCol = i;
        if (colNodeSets[i]!.has(edge.target)) tgtCol = i;
      }
      if (srcCol >= 0 && tgtCol >= 0 && srcCol !== tgtCol) {
        crossings += Math.abs(srcCol - tgtCol);
      }
    }

    return crossings;
  }

  function optimiseColumnOrder(group: SizedGroup): void {
    if (group.columns.length <= 2) return;

    const baseCrossings = countCrossings(group);
    if (baseCrossings === 0) return;

    let bestCrossings = baseCrossings;
    let bestOrder = group.columns.map((_, i) => i);

    for (let i = 0; i < group.columns.length - 1; i++) {
      for (let j = i + 1; j < group.columns.length; j++) {
        const swapped = [...group.columns];
        [swapped[i], swapped[j]] = [swapped[j]!, swapped[i]!];
        const testGroup = { ...group, columns: swapped };
        const crossings = countCrossings(testGroup);
        if (crossings < bestCrossings) {
          bestCrossings = crossings;
          bestOrder = swapped.map((_, idx) => {
            const origIdx = group.columns.indexOf(swapped[idx]!);
            return origIdx;
          });
        }
      }
    }

    if (bestCrossings < baseCrossings) {
      const reordered = bestOrder.map(i => group.columns[i]!);
      group.columns.length = 0;
      group.columns.push(...reordered);
    }
  }

  // --- Main ---

  const startNodes = [...topLevelIds].filter(id => (incoming.get(id) ?? []).length === 0);
  const rootColumn: Column = { items: [] };

  for (const s of startNodes) {
    if (!placed.has(s)) {
      const col = buildColumn(s);
      rootColumn.items.push(...col.items);
    }
  }

  for (const id of topLevelIds) {
    if (!placed.has(id)) {
      rootColumn.items.push({ nodeId: id });
      placed.add(id);
    }
  }

  if (rootColumn.items.length > 0) {
    const sized = sizeColumn(rootColumn);
    positionColumn(sized, 0, 0);
  }

  return { nodeLayouts };
}
