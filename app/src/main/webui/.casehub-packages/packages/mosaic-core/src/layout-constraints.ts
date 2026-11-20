import type { HardConstraint, LayoutNode, LayoutViolation } from '@casehubio/graph-renderer';

const MIN_GAP = 60;

function nodeWidth(n: LayoutNode): number {
  const w = n.width ?? (typeof n.style?.['width'] === 'number' ? n.style['width'] as number : undefined);
  return w ?? 280;
}

function nodeHeight(n: LayoutNode): number {
  const h = n.height ?? (typeof n.style?.['height'] === 'number' ? n.style['height'] as number : undefined);
  return h ?? 50;
}

interface Rect { x: number; y: number; w: number; h: number }

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function nudgePeerOverlaps(nodes: LayoutNode[]): void {
  const byParent = new Map<string, LayoutNode[]>();
  for (const n of nodes) {
    const key = n.parentId ?? '__root__';
    let list = byParent.get(key);
    if (!list) { list = []; byParent.set(key, list); }
    list.push(n);
  }
  for (const peers of byParent.values()) {
    if (peers.length < 2) continue;
    const sorted = [...peers].sort((a, b) => a.position.y - b.position.y);
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!;
      const cur = sorted[i]!;
      const prevBottom = prev.position.y + nodeHeight(prev);
      const gap = cur.position.y - prevBottom;
      const xOverlaps = prev.position.x < cur.position.x + nodeWidth(cur) && prev.position.x + nodeWidth(prev) > cur.position.x;
      if (xOverlaps && gap < MIN_GAP) {
        cur.position = { ...cur.position, y: prevBottom + MIN_GAP };
      }
    }
    const sortedX = [...peers].sort((a, b) => a.position.x - b.position.x);
    for (let i = 1; i < sortedX.length; i++) {
      const prev = sortedX[i - 1]!;
      const cur = sortedX[i]!;
      const prevRight = prev.position.x + nodeWidth(prev);
      const gap = cur.position.x - prevRight;
      const yOverlaps = prev.position.y < cur.position.y + nodeHeight(cur) && prev.position.y + nodeHeight(prev) > cur.position.y;
      if (yOverlaps && gap < MIN_GAP) {
        cur.position = { ...cur.position, x: prevRight + MIN_GAP };
      }
    }
  }
}

export function noPeerOverlapConstraint(): HardConstraint {
  return {
    id: 'HR:no-peer-overlap',
    check(nodes: LayoutNode[]) {
      const violations: LayoutViolation[] = [];
      const byParent = new Map<string, LayoutNode[]>();
      for (const n of nodes) {
        const key = n.parentId ?? '__root__';
        let list = byParent.get(key);
        if (!list) { list = []; byParent.set(key, list); }
        list.push(n);
      }
      for (const peers of byParent.values()) {
        for (let i = 0; i < peers.length; i++) {
          for (let j = i + 1; j < peers.length; j++) {
            const a = peers[i]!;
            const b = peers[j]!;
            const ra: Rect = { x: a.position.x, y: a.position.y, w: nodeWidth(a), h: nodeHeight(a) };
            const rb: Rect = { x: b.position.x, y: b.position.y, w: nodeWidth(b), h: nodeHeight(b) };
            if (rectsOverlap(ra, rb)) {
              violations.push({
                rule: 'HR:no-peer-overlap',
                severity: 'hard',
                message: `Nodes ${a.id} and ${b.id} overlap`,
                nodeIds: [a.id, b.id],
              });
            }
          }
        }
      }
      return violations;
    },
  };
}
