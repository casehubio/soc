import type { GraphModel } from '@casehubio/graph-core';
import { rootNodes, childrenOf } from '@casehubio/graph-core';
import type { ElkLayoutResult, NodeLayout } from './elk-layout.js';

const NODE_WIDTH = 280;
const NODE_HEIGHT = 50;
const CONTAINER_PADDING = 48;
const HEADER_HEIGHT = 48;

export interface RadialLayoutOptions {
  spacing?: number;
}

export function computeRadialLayout(
  model: GraphModel,
  options: RadialLayoutOptions = {},
): ElkLayoutResult {
  const spacing = options.spacing ?? 120;
  const nodeLayouts = new Map<string, NodeLayout>();
  const roots = rootNodes(model);

  for (const root of roots) {
    const children = childrenOf(model, root.id);
    if (children.length === 0) {
      nodeLayouts.set(root.id, { x: 0, y: 0, width: NODE_WIDTH, height: NODE_HEIGHT });
      continue;
    }

    const hubEdgeCounts = new Map<string, number>();
    for (const child of children) {
      const outCount = model.edges.filter(e => e.source === child.id).length;
      const inCount = model.edges.filter(e => e.target === child.id).length;
      hubEdgeCounts.set(child.id, outCount + inCount);
    }
    const hubId = [...hubEdgeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const spokes = children.filter(c => c.id !== hubId);

    if (spokes.length === 0) {
      const cx = CONTAINER_PADDING;
      const cy = HEADER_HEIGHT;
      nodeLayouts.set(children[0]!.id, { x: cx, y: cy, width: NODE_WIDTH, height: NODE_HEIGHT });
      nodeLayouts.set(root.id, {
        x: 0, y: 0,
        width: NODE_WIDTH + 2 * CONTAINER_PADDING,
        height: NODE_HEIGHT + HEADER_HEIGHT + CONTAINER_PADDING,
      });
      continue;
    }

    const radius = spacing + NODE_WIDTH / 2;
    const angleStep = (2 * Math.PI) / spokes.length;
    const startAngle = -Math.PI / 2;

    const positions: { id: string; x: number; y: number }[] = [];
    for (let i = 0; i < spokes.length; i++) {
      const angle = startAngle + i * angleStep;
      positions.push({ id: spokes[i]!.id, x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
    }

    const spokeMinY = Math.min(...positions.map(p => p.y));
    const spokeMaxY = Math.max(...positions.map(p => p.y));
    const spokeSpanY = spokeMaxY - spokeMinY;
    if (spokeSpanY > 0) {
      for (const p of positions) {
        p.y = ((p.y - spokeMinY) / spokeSpanY - 0.5) * 2 * radius;
      }
    }

    positions.push({ id: hubId!, x: 0, y: 0 });

    const centerX = radius + CONTAINER_PADDING;
    const pMinY = Math.min(...positions.map(p => p.y - NODE_HEIGHT / 2));
    const centerY = -pMinY + HEADER_HEIGHT;

    for (const p of positions) {
      nodeLayouts.set(p.id, {
        x: centerX + p.x - NODE_WIDTH / 2,
        y: centerY + p.y - NODE_HEIGHT / 2,
        width: NODE_WIDTH, height: NODE_HEIGHT,
      });
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const child of children) {
      const l = nodeLayouts.get(child.id)!;
      minX = Math.min(minX, l.x);
      minY = Math.min(minY, l.y);
      maxX = Math.max(maxX, l.x + l.width);
      maxY = Math.max(maxY, l.y + l.height);
    }

    const contentH = maxY - minY;
    const containerH = contentH + HEADER_HEIGHT + CONTAINER_PADDING;
    const vertOffset = HEADER_HEIGHT + (containerH - HEADER_HEIGHT - contentH) / 2;

    for (const child of children) {
      const l = nodeLayouts.get(child.id)!;
      nodeLayouts.set(child.id, {
        x: l.x - minX + CONTAINER_PADDING,
        y: l.y - minY + vertOffset,
        width: l.width, height: l.height,
      });
    }

    const containerW = (maxX - minX) + 2 * CONTAINER_PADDING;
    nodeLayouts.set(root.id, { x: 0, y: 0, width: containerW, height: containerH });
  }

  return { nodeLayouts };
}
