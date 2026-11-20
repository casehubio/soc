import type { Node, Edge } from '@xyflow/react';

export interface ValidationResult {
  pass: boolean;
  violations: string[];
}

function lineIntersectsRect(
  p1: { x: number; y: number }, p2: { x: number; y: number },
  rx: number, ry: number, rw: number, rh: number, margin = 5,
): boolean {
  const x = rx + margin, y = ry + margin, w = rw - 2 * margin, h = rh - 2 * margin;
  if (w <= 0 || h <= 0) return false;
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  let tMin = 0, tMax = 1;
  const sides = [{ p: -dx, q: -(x - p1.x) }, { p: dx, q: x + w - p1.x }, { p: -dy, q: -(y - p1.y) }, { p: dy, q: y + h - p1.y }];
  for (const { p, q } of sides) {
    if (Math.abs(p) < 1e-10) { if (q < 0) return false; }
    else { const t = q / p; if (p < 0) { if (t > tMax) return false; if (t > tMin) tMin = t; } else { if (t < tMin) return false; if (t < tMax) tMax = t; } }
  }
  return tMin <= tMax;
}

function handleCenter(node: Node, type: 'source' | 'target', edge: Edge, nodeMap: Map<string, Node>): { x: number; y: number } {
  const abs = absoluteRect(node, nodeMap);
  const x = abs.x, y = abs.y;
  const w = abs.w, h = abs.h;
  const handleId = type === 'source' ? edge.sourceHandle : edge.targetHandle;
  const pos = handleId?.replace(/^(source|target)-/, '')
    ?? (type === 'source'
      ? ((node.data)?._sourceHandlePosition as string) ?? 'bottom'
      : ((node.data)?._targetHandlePosition as string) ?? 'top');
  switch (pos) {
    case 'top': return { x: x + w / 2, y };
    case 'bottom': return { x: x + w / 2, y: y + h };
    case 'left': return { x, y: y + h / 2 };
    case 'right': return { x: x + w, y: y + h / 2 };
    default: return { x: x + w / 2, y: y + h };
  }
}

function absoluteRect(node: Node, nodeMap: Map<string, Node>): { x: number; y: number; w: number; h: number } {
  let x = node.position.x, y = node.position.y;
  let cur = node;
  while (cur.parentId) {
    const parent = nodeMap.get(cur.parentId);
    if (!parent) break;
    x += parent.position.x;
    y += parent.position.y;
    cur = parent;
  }
  return { x, y, w: node.width ?? 280, h: node.height ?? 50 };
}

export function validateEdgeRouting(nodes: Node[], edges: Edge[]): ValidationResult {
  const violations: string[] = [];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // 1. No node overlap (top-level nodes only)
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i]!, b = nodes[j]!;
      if (a.parentId || b.parentId) continue;
      const ar = absoluteRect(a, nodeMap);
      const br = absoluteRect(b, nodeMap);
      if (ar.x < br.x + br.w && ar.x + ar.w > br.x && ar.y < br.y + br.h && ar.y + ar.h > br.y) {
        violations.push(`Overlap: '${a.id}' (${ar.x},${ar.y} ${ar.w}x${ar.h}) overlaps '${b.id}' (${br.x},${br.y} ${br.w}x${br.h})`);
      }
    }
  }

  function ancestors(nodeId: string): Set<string> {
    const result = new Set<string>();
    let cur = nodeMap.get(nodeId);
    while (cur?.parentId) {
      result.add(cur.parentId);
      cur = nodeMap.get(cur.parentId);
    }
    return result;
  }

  // 2. No edge line crosses any shape
  for (const edge of edges) {
    const src = nodeMap.get(edge.source);
    const tgt = nodeMap.get(edge.target);
    if (!src || !tgt) continue;
    const p1 = handleCenter(src, 'source', edge, nodeMap);
    const p2 = handleCenter(tgt, 'target', edge, nodeMap);
    const srcAncestors = ancestors(edge.source);
    const tgtAncestors = ancestors(edge.target);

    for (const node of nodes) {
      if (node.id === edge.source || node.id === edge.target) continue;
      if (srcAncestors.has(node.id) || tgtAncestors.has(node.id)) continue;
      if (node.parentId === edge.source || node.parentId === edge.target) continue;
      const r = absoluteRect(node, nodeMap);
      if (lineIntersectsRect(p1, p2, r.x, r.y, r.w, r.h)) {
        violations.push(`Line crosses shape: ${edge.source}→${edge.target} crosses '${node.id}' (${r.x},${r.y} ${r.w}x${r.h})`);
      }
    }
  }

  // 3. No edge line crosses another edge line
  const lines: { edge: Edge; p1: { x: number; y: number }; p2: { x: number; y: number } }[] = [];
  for (const edge of edges) {
    const s = nodeMap.get(edge.source), t = nodeMap.get(edge.target);
    if (!s || !t) continue;
    lines.push({ edge, p1: handleCenter(s, 'source', edge, nodeMap), p2: handleCenter(t, 'target', edge, nodeMap) });
  }
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const a = lines[i]!, b = lines[j]!;
      if (a.edge.source === b.edge.source || a.edge.target === b.edge.target ||
          a.edge.source === b.edge.target || a.edge.target === b.edge.source) continue;
      const d1x = a.p2.x - a.p1.x, d1y = a.p2.y - a.p1.y;
      const d2x = b.p2.x - b.p1.x, d2y = b.p2.y - b.p1.y;
      const cross = d1x * d2y - d1y * d2x;
      if (Math.abs(cross) < 1e-10) continue;
      const t = ((b.p1.x - a.p1.x) * d2y - (b.p1.y - a.p1.y) * d2x) / cross;
      const u = ((b.p1.x - a.p1.x) * d1y - (b.p1.y - a.p1.y) * d1x) / cross;
      if (t > 0.01 && t < 0.99 && u > 0.01 && u < 0.99) {
        violations.push(`Line crosses line: ${a.edge.source}→${a.edge.target} crosses ${b.edge.source}→${b.edge.target}`);
      }
    }
  }

  return { pass: violations.length === 0, violations };
}
