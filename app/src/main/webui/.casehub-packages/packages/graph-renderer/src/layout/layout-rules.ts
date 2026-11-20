import type { LayoutRule, HardConstraint, LayoutNode, LayoutViolation } from './types.js';

export const INTERNAL_PAD = 30;
export const HEADER_HEIGHT = 68;
const ROW_GAP = 20;
const DEFAULT_WIDTH = 280;
const DEFAULT_HEIGHT = 50;

function toNum(v: number | string | undefined, fallback: number): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') { const n = parseFloat(v); return isNaN(n) ? fallback : n; }
  return fallback;
}

export function nodeWidth(n: LayoutNode): number {
  return n.width ?? toNum(n.style?.['width'] as number | string | undefined, DEFAULT_WIDTH);
}

export function nodeHeight(n: LayoutNode): number {
  return n.height ?? toNum(n.style?.['height'] as number | string | undefined, DEFAULT_HEIGHT);
}

interface Rect { x: number; y: number; w: number; h: number }

function absoluteRect(node: LayoutNode, nodeMap: Map<string, LayoutNode>): Rect {
  let x = node.position.x;
  let y = node.position.y;
  let cur: LayoutNode | undefined = node;
  while (cur?.parentId) {
    const parent = nodeMap.get(cur.parentId);
    if (!parent) break;
    x += parent.position.x;
    y += parent.position.y;
    cur = parent;
  }
  return { x, y, w: nodeWidth(node), h: nodeHeight(node) };
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function horizontalInternalRule(containerType: string, childType: string, maxPerRow = 3): LayoutRule {
  return {
    id: 'horizontal-internal',
    phase: 'internal-layout',
    group: 'internal-layout',
    priority: 10,
    scope: 'global',
    guarantees: ['agents-positioned', 'containers-sized'],
    precondition: () => true,
    apply(nodes) {
      const containers = nodes.filter(n => n.style?.['width'] != null && n.type === containerType);
      for (const container of containers) {
        const children = nodes.filter(n => n.parentId === container.id && n.type === childType);
        if (children.length < 2) continue;

        let x = INTERNAL_PAD;
        let y = HEADER_HEIGHT;
        let rowMaxHeight = 0;
        let maxRowWidth = 0;
        let colInRow = 0;

        for (const child of children) {
          if (colInRow >= maxPerRow) {
            y += rowMaxHeight + ROW_GAP;
            if (x > maxRowWidth) maxRowWidth = x;
            x = INTERNAL_PAD;
            rowMaxHeight = 0;
            colInRow = 0;
          }
          child.position = { x, y };
          x += nodeWidth(child) + INTERNAL_PAD;
          rowMaxHeight = Math.max(rowMaxHeight, nodeHeight(child));
          colInRow++;
        }
        if (x > maxRowWidth) maxRowWidth = x;
        const newWidth = maxRowWidth;
        const newHeight = y + rowMaxHeight + INTERNAL_PAD;
        container.width = newWidth;
        container.height = newHeight;
        container.style = { ...(container.style ?? {}), width: newWidth, height: newHeight };
      }
    },
  };
}

export function verticalStackingRule(containerType: string, gap = 40): LayoutRule {
  return {
    id: 'vertical-stacking',
    phase: 'container-positioning',
    group: 'container-position',
    priority: 10,
    scope: 'global',
    requires: ['containers-sized'],
    guarantees: ['containers-positioned'],
    precondition: () => true,
    apply(nodes) {
      const roots = nodes.filter(n => n.type === containerType && !n.parentId);
      if (roots.length < 2) return;
      let y = 0;
      for (const container of roots) {
        container.position = { x: 0, y };
        y += nodeHeight(container) + gap;
      }
    },
  };
}

const FORWARD_TYPES = new Set(['org-supervises', 'org-delegates-to']);
const REVERSE_TYPES = new Set(['org-escalates-to', 'org-reports-to']);
const PEER_TYPES = new Set(['org-backs-up']);

export function positionAwareHandlesRule(
  forwardTypes?: ReadonlySet<string>,
  reverseTypes?: ReadonlySet<string>,
  peerTypes?: ReadonlySet<string>,
): LayoutRule {
  const fwd = forwardTypes ?? FORWARD_TYPES;
  const rev = reverseTypes ?? REVERSE_TYPES;
  const peer = peerTypes ?? PEER_TYPES;

  return {
    id: 'position-aware-handles',
    phase: 'edge-routing',
    priority: 10,
    scope: 'global',
    precondition: () => true,
    apply(nodes, edges) {
      const nodeMap = new Map(nodes.map(n => [n.id, n]));
      for (const edge of edges) {
        const src = nodeMap.get(edge.source);
        const tgt = nodeMap.get(edge.target);
        if (!src || !tgt) continue;
        const type = edge.type ?? '';
        const sameContainer = src.parentId && src.parentId === tgt.parentId;
        const dx = tgt.position.x - src.position.x;
        const dy = tgt.position.y - src.position.y;
        const horizontal = Math.abs(dx) > Math.abs(dy);

        if (fwd.has(type)) {
          if (sameContainer && horizontal) {
            edge.sourceHandle = dx > 0 ? 'source-right' : 'source-left';
            edge.targetHandle = dx > 0 ? 'target-left' : 'target-right';
          } else {
            edge.sourceHandle = 'source-bottom';
            edge.targetHandle = 'target-top';
          }
        } else if (rev.has(type)) {
          if (horizontal) {
            edge.sourceHandle = 'source-top';
            edge.targetHandle = 'target-top';
          } else {
            edge.sourceHandle = 'source-left';
            edge.targetHandle = 'target-left';
          }
        } else if (peer.has(type)) {
          edge.sourceHandle = dx > 0 ? 'source-right' : 'source-left';
          edge.targetHandle = dx > 0 ? 'target-left' : 'target-right';
        }
      }
    },
  };
}

export function noContainerOverlapConstraint(containerType: string): HardConstraint {
  return {
    id: 'HR1:no-container-overlap',
    check(nodes) {
      const nodeMap = new Map(nodes.map(n => [n.id, n]));
      const containers = nodes.filter(n => n.type === containerType);
      const violations: LayoutViolation[] = [];
      for (let i = 0; i < containers.length; i++) {
        for (let j = i + 1; j < containers.length; j++) {
          const a = containers[i]!;
          const b = containers[j]!;
          if (a.parentId === b.id || b.parentId === a.id) continue;
          const ra = absoluteRect(a, nodeMap as Map<string, LayoutNode>);
          const rb = absoluteRect(b, nodeMap as Map<string, LayoutNode>);
          if (rectsOverlap(ra, rb)) {
            violations.push({
              rule: 'HR1:no-container-overlap',
              severity: 'hard',
              message: `Containers ${a.id} and ${b.id} overlap`,
              nodeIds: [a.id, b.id],
            });
          }
        }
      }
      return violations;
    },
  };
}

export function childContainmentConstraint(childType: string): HardConstraint {
  return {
    id: 'HR2:agent-containment',
    check(nodes) {
      const violations: LayoutViolation[] = [];
      const nodeMap = new Map(nodes.map(n => [n.id, n]));
      for (const node of nodes) {
        if (node.type !== childType || !node.parentId) continue;
        const parent = nodeMap.get(node.parentId);
        if (!parent) continue;
        const pw = nodeWidth(parent as LayoutNode);
        const ph = nodeHeight(parent as LayoutNode);
        const ax = node.position.x;
        const ay = node.position.y;
        const aw = nodeWidth(node as LayoutNode);
        const ah = nodeHeight(node as LayoutNode);
        if (ax < 0 || ay < 0 || ax + aw > pw || ay + ah > ph) {
          violations.push({
            rule: 'HR2:agent-containment',
            severity: 'hard',
            message: `Child ${node.id} exceeds bounds of ${node.parentId} (child: ${ax},${ay} ${aw}x${ah}, container: ${pw}x${ph})`,
            nodeIds: [node.id, node.parentId],
          });
        }
      }
      return violations;
    },
  };
}

export function noSiblingOverlapConstraint(childType: string): HardConstraint {
  return {
    id: 'HR3:no-agent-overlap',
    check(nodes) {
      const violations: LayoutViolation[] = [];
      const byParent = new Map<string, (typeof nodes)[number][]>();
      for (const n of nodes) {
        if (n.type !== childType || !n.parentId) continue;
        let list = byParent.get(n.parentId);
        if (!list) { list = []; byParent.set(n.parentId, list); }
        list.push(n);
      }
      for (const [parentId, siblings] of byParent) {
        for (let i = 0; i < siblings.length; i++) {
          for (let j = i + 1; j < siblings.length; j++) {
            const a = siblings[i]!;
            const b = siblings[j]!;
            const ra: Rect = { x: a.position.x, y: a.position.y, w: nodeWidth(a as LayoutNode), h: nodeHeight(a as LayoutNode) };
            const rb: Rect = { x: b.position.x, y: b.position.y, w: nodeWidth(b as LayoutNode), h: nodeHeight(b as LayoutNode) };
            if (rectsOverlap(ra, rb)) {
              violations.push({
                rule: 'HR3:no-agent-overlap',
                severity: 'hard',
                message: `Siblings ${a.id} and ${b.id} overlap within ${parentId}`,
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
