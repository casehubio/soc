import { describe, it, expect } from 'vitest';
import { createGraph } from '@casehubio/graph-core';
import { computeElkLayout } from './layout/elk-layout.js';
import { toReactFlowGraph } from './mapping.js';
import type { Node, Edge } from '@xyflow/react';

const DEFAULT_NODE_WIDTH = 280;
const DEFAULT_NODE_HEIGHT = 50;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function nodeRect(node: Node): Rect {
  return {
    x: node.position.x,
    y: node.position.y,
    w: node.width ?? DEFAULT_NODE_WIDTH,
    h: node.height ?? DEFAULT_NODE_HEIGHT,
  };
}

function posFromHandleId(handleId: string | null | undefined): string | undefined {
  if (!handleId) return undefined;
  const match = handleId.match(/^(?:source|target)-(\w+)$/);
  return match ? match[1] : undefined;
}

function handleCenter(node: Node, type: 'source' | 'target', edge?: Edge): { x: number; y: number } {
  const r = nodeRect(node);
  const edgePos = edge
    ? posFromHandleId(type === 'source' ? edge.sourceHandle : edge.targetHandle)
    : undefined;
  const data = node.data;
  const pos = edgePos
    ?? (type === 'source'
      ? (data._sourceHandlePosition as string | undefined) ?? 'bottom'
      : (data._targetHandlePosition as string | undefined) ?? 'top');

  switch (pos) {
    case 'top': return { x: r.x + r.w / 2, y: r.y };
    case 'bottom': return { x: r.x + r.w / 2, y: r.y + r.h };
    case 'left': return { x: r.x, y: r.y + r.h / 2 };
    case 'right': return { x: r.x + r.w, y: r.y + r.h / 2 };
    default: return { x: r.x + r.w / 2, y: r.y + r.h };
  }
}

function lineIntersectsRect(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  rect: Rect,
  margin: number = 5,
): boolean {
  const r = { x: rect.x + margin, y: rect.y + margin, w: rect.w - 2 * margin, h: rect.h - 2 * margin };
  if (r.w <= 0 || r.h <= 0) return false;

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  let tMin = 0;
  let tMax = 1;

  const edges = [
    { p: -dx, q: -(r.x - p1.x) },
    { p: dx, q: (r.x + r.w - p1.x) },
    { p: -dy, q: -(r.y - p1.y) },
    { p: dy, q: (r.y + r.h - p1.y) },
  ];

  for (const { p, q } of edges) {
    if (Math.abs(p) < 1e-10) {
      if (q < 0) return false;
    } else {
      const t = q / p;
      if (p < 0) {
        if (t > tMax) return false;
        if (t > tMin) tMin = t;
      } else {
        if (t < tMin) return false;
        if (t < tMax) tMax = t;
      }
    }
  }
  return tMin <= tMax;
}

function segmentsIntersect(
  a1: { x: number; y: number }, a2: { x: number; y: number },
  b1: { x: number; y: number }, b2: { x: number; y: number },
): boolean {
  const d1x = a2.x - a1.x, d1y = a2.y - a1.y;
  const d2x = b2.x - b1.x, d2y = b2.y - b1.y;
  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 1e-10) return false;
  const t = ((b1.x - a1.x) * d2y - (b1.y - a1.y) * d2x) / cross;
  const u = ((b1.x - a1.x) * d1y - (b1.y - a1.y) * d1x) / cross;
  return t > 0.01 && t < 0.99 && u > 0.01 && u < 0.99;
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// Rule 1a: per-edge source and target handles must not be on the same side
// Rule 1b: per-node incoming and outgoing handles must not share a side
function assertNoSameHandleInOut(nodes: Node[], edges: Edge[]): void {
  for (const edge of edges) {
    const srcPos = posFromHandleId(edge.sourceHandle);
    const tgtPos = posFromHandleId(edge.targetHandle);
    if (!srcPos || !tgtPos) continue;

    expect(
      srcPos === tgtPos,
      `Edge ${edge.source}→${edge.target} has source and target on same handle '${srcPos}'`,
    ).toBe(false);
  }

  const outSides = new Map<string, Set<string>>();
  const inSides = new Map<string, Set<string>>();
  for (const edge of edges) {
    const sp = posFromHandleId(edge.sourceHandle);
    const tp = posFromHandleId(edge.targetHandle);
    if (sp) { const s = outSides.get(edge.source) ?? new Set(); s.add(sp); outSides.set(edge.source, s); }
    if (tp) { const s = inSides.get(edge.target) ?? new Set(); s.add(tp); inSides.set(edge.target, s); }
  }
  for (const [nodeId, outs] of outSides) {
    const ins = inSides.get(nodeId);
    if (!ins) continue;
    for (const side of outs) {
      expect(
        ins.has(side),
        `Node '${nodeId}' has both incoming and outgoing edges on '${side}' side`,
      ).toBe(false);
    }
  }
}

// Rule 2a: no edge line crosses any non-endpoint, non-sibling, non-container node rectangle
// Siblings sharing a source or target are expected to have overlapping bezier paths
function assertNoEdgeNodeCrossings(nodes: Node[], edges: Edge[]): void {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const parentIds = new Set(nodes.filter(n => n.parentId).map(n => n.parentId!));
  const fanSiblings = new Set<string>();
  const sourceGroups = new Map<string, string[]>();
  const targetGroups = new Map<string, string[]>();
  for (const e of edges) {
    const sg = sourceGroups.get(e.source) ?? [];
    sg.push(e.target);
    sourceGroups.set(e.source, sg);
    const tg = targetGroups.get(e.target) ?? [];
    tg.push(e.source);
    targetGroups.set(e.target, tg);
  }
  for (const targets of sourceGroups.values()) {
    if (targets.length > 1) targets.forEach(t => fanSiblings.add(t));
  }
  for (const sources of targetGroups.values()) {
    if (sources.length > 1) sources.forEach(s => fanSiblings.add(s));
  }

  for (const edge of edges) {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (!sourceNode || !targetNode) continue;

    const p1 = handleCenter(sourceNode, 'source', edge);
    const p2 = handleCenter(targetNode, 'target', edge);
    const _srcHandleDir = posFromHandleId(edge.sourceHandle)
      ?? (sourceNode.data)._sourceHandlePosition as string
      ?? 'bottom';
    const _tgtHandleDir = posFromHandleId(edge.targetHandle)
      ?? (targetNode.data)._targetHandlePosition as string
      ?? 'top';

    const srcParent = sourceNode.parentId;
    const tgtParent = targetNode.parentId;
    function inScope(node: Node): boolean {
      if (node.id === edge.source || node.id === edge.target) return false;
      if (node.id === srcParent || node.id === tgtParent) return false;
      if (!srcParent && !tgtParent) return !node.parentId;
      if (parentIds.has(node.id)) return node.parentId === srcParent || node.parentId === tgtParent || !node.parentId;
      return node.parentId === srcParent || node.parentId === tgtParent;
    }

    for (const node of nodes) {
      if (!inScope(node)) continue;
      // Skip fan siblings — bezier curves route around same-layer spread
      if (fanSiblings.has(node.id) && fanSiblings.has(edge.source)) continue;
      if (fanSiblings.has(node.id) && fanSiblings.has(edge.target)) continue;

      const rect = nodeRect(node);
      const crosses = lineIntersectsRect(p1, p2, rect);
      expect(
        crosses,
        `Edge ${edge.source} → ${edge.target} crosses node '${node.id}' at (${rect.x},${rect.y},${rect.w},${rect.h})`,
      ).toBe(false);
    }

    // Corridor is checked in the algorithm (combo selection) and assertShortestEdges,
    // not as a post-hoc assertion — bezier routing can navigate tight corridors.
  }
}

// Rule 2b: no edge line crosses any other edge line
function assertNoEdgeEdgeCrossings(nodes: Node[], edges: Edge[]): void {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const lines: { edge: Edge; p1: { x: number; y: number }; p2: { x: number; y: number } }[] = [];

  for (const edge of edges) {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (!sourceNode || !targetNode) continue;
    lines.push({
      edge,
      p1: handleCenter(sourceNode, 'source', edge),
      p2: handleCenter(targetNode, 'target', edge),
    });
  }

  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const a = lines[i]!;
      const b = lines[j]!;
      // Skip edges that share an endpoint — they naturally converge
      if (a.edge.source === b.edge.source || a.edge.target === b.edge.target ||
          a.edge.source === b.edge.target || a.edge.target === b.edge.source) continue;
      const crosses = segmentsIntersect(a.p1, a.p2, b.p1, b.p2);
      expect(
        crosses,
        `Edge ${a.edge.source}→${a.edge.target} crosses edge ${b.edge.source}→${b.edge.target}`,
      ).toBe(false);
    }
  }
}

// Rule 3: handle positions should produce shortest crossing-free, conflict-free edge length
function assertShortestEdges(nodes: Node[], edges: Edge[], direction?: string): void {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const parentIds = new Set(nodes.filter(n => n.parentId).map(n => n.parentId!));
  const _positions = ['top', 'bottom', 'left', 'right'] as const;

  const outSidesPerNode = new Map<string, Set<string>>();
  const inSidesPerNode = new Map<string, Set<string>>();
  for (const e of edges) {
    const sp = posFromHandleId(e.sourceHandle);
    const tp = posFromHandleId(e.targetHandle);
    if (sp) { const s = outSidesPerNode.get(e.source) ?? new Set(); s.add(sp); outSidesPerNode.set(e.source, s); }
    if (tp) { const s = inSidesPerNode.get(e.target) ?? new Set(); s.add(tp); inSidesPerNode.set(e.target, s); }
  }

  for (const edge of edges) {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (!sourceNode || !targetNode) continue;

    const _currentDist = dist(
      handleCenter(sourceNode, 'source', edge),
      handleCenter(targetNode, 'target', edge),
    );

    const srcRect = nodeRect(sourceNode);
    const tgtRect = nodeRect(targetNode);
    const dirDefaults: Record<string, { src: string; tgt: string }> = {
      DOWN: { src: 'bottom', tgt: 'top' },
      RIGHT: { src: 'right', tgt: 'left' },
      LEFT: { src: 'left', tgt: 'right' },
      UP: { src: 'top', tgt: 'bottom' },
    };
    const perpendicular: Record<string, { src: string; tgt: string }> = {
      DOWN: { src: 'right', tgt: 'left' },
      RIGHT: { src: 'bottom', tgt: 'top' },
      LEFT: { src: 'bottom', tgt: 'top' },
      UP: { src: 'right', tgt: 'left' },
    };
    const defs = dirDefaults[direction ?? 'DOWN'] ?? dirDefaults.DOWN!;
    const perp = perpendicular[direction ?? 'DOWN'] ?? perpendicular.DOWN!;

    const srcParent = sourceNode.parentId;
    const tgtParent = targetNode.parentId;
    function comboValid(sp: string, tp: string): boolean {
      if (sp === tp) return false;
      const srcIns = inSidesPerNode.get(edge.source);
      if (srcIns && srcIns.has(sp)) return false;
      const tgtOuts = outSidesPerNode.get(edge.target);
      if (tgtOuts && tgtOuts.has(tp)) return false;
      const srcPt = handleCenterForPos(srcRect, sp);
      const tgtPt = handleCenterForPos(tgtRect, tp);
      for (const node of nodes) {
        if (node.id === edge.source || node.id === edge.target) continue;
        if (node.id === srcParent || node.id === tgtParent) continue;
        if (!srcParent && !tgtParent) { if (node.parentId) continue; }
        else if (parentIds.has(node.id)) { if (node.parentId !== srcParent && node.parentId !== tgtParent && node.parentId) continue; }
        else { if (node.parentId !== srcParent && node.parentId !== tgtParent) continue; }
        const r = nodeRect(node);
        if (lineIntersectsRect(srcPt, tgtPt, r)) return false;
      }
      return true;
    }
    const currentSrc = posFromHandleId(edge.sourceHandle) ?? 'bottom';
    const currentTgt = posFromHandleId(edge.targetHandle) ?? 'top';
    const srcCx = srcRect.x + srcRect.w / 2;
    const srcCy = srcRect.y + srcRect.h / 2;
    const tgtCx = tgtRect.x + tgtRect.w / 2;
    const tgtCy = tgtRect.y + tgtRect.h / 2;
    const dir = direction ?? 'DOWN';
    const flowsForward = (dir === 'RIGHT' || dir === 'LEFT')
      ? (dir === 'RIGHT' ? tgtCx > srcCx : tgtCx < srcCx)
      : (dir === 'DOWN' ? tgtCy > srcCy : tgtCy < srcCy);
    const primary = flowsForward ? defs : perp;
    const secondary = flowsForward ? perp : defs;
    if (comboValid(primary.src, primary.tgt)) {
      expect(currentSrc, `Edge ${edge.source}→${edge.target}: primary ${primary.src}→${primary.tgt} is valid but got ${currentSrc}→${currentTgt}`).toBe(primary.src);
      expect(currentTgt, `Edge ${edge.source}→${edge.target}: primary ${primary.src}→${primary.tgt} is valid but got ${currentSrc}→${currentTgt}`).toBe(primary.tgt);
    } else if (comboValid(secondary.src, secondary.tgt)) {
      expect(currentSrc, `Edge ${edge.source}→${edge.target}: secondary ${secondary.src}→${secondary.tgt} is valid but got ${currentSrc}→${currentTgt}`).toBe(secondary.src);
      expect(currentTgt, `Edge ${edge.source}→${edge.target}: secondary ${secondary.src}→${secondary.tgt} is valid but got ${currentSrc}→${currentTgt}`).toBe(secondary.tgt);
    }
  }
}

function handleCenterForPos(rect: Rect, pos: string): { x: number; y: number } {
  switch (pos) {
    case 'top': return { x: rect.x + rect.w / 2, y: rect.y };
    case 'bottom': return { x: rect.x + rect.w / 2, y: rect.y + rect.h };
    case 'left': return { x: rect.x, y: rect.y + rect.h / 2 };
    case 'right': return { x: rect.x + rect.w, y: rect.y + rect.h / 2 };
    default: return { x: rect.x + rect.w / 2, y: rect.y + rect.h };
  }
}

function assertAllEdgeRules(nodes: Node[], edges: Edge[], direction?: string): void {
  assertNoSameHandleInOut(nodes, edges);
  assertNoEdgeNodeCrossings(nodes, edges);
  assertNoEdgeEdgeCrossings(nodes, edges);
  assertShortestEdges(nodes, edges, direction);
}

describe('handle position auto-detection', () => {
  it('DOWN layout: source handles are bottom for vertical flow', async () => {
    const model = createGraph(
      [
        { id: 'a', type: 'call', properties: { label: 'A' } },
        { id: 'b', type: 'call', properties: { label: 'B' } },
      ],
      [{ id: 'e1', type: 'flow', source: 'a', target: 'b' }],
    );
    const layout = await computeElkLayout(model, { direction: 'DOWN' });
    const { nodes } = toReactFlowGraph(model, layout, undefined, 'DOWN');
    const a = nodes.find(n => n.id === 'a')!;
    expect((a.data)._sourceHandlePosition).toBe('bottom');
  });

  it('RIGHT layout: source handles are right for horizontal flow', async () => {
    const model = createGraph(
      [
        { id: 'a', type: 'call', properties: { label: 'A' } },
        { id: 'b', type: 'call', properties: { label: 'B' } },
      ],
      [{ id: 'e1', type: 'flow', source: 'a', target: 'b' }],
    );
    const layout = await computeElkLayout(model, { direction: 'RIGHT' });
    const { nodes } = toReactFlowGraph(model, layout, undefined, 'RIGHT');
    const a = nodes.find(n => n.id === 'a')!;
    expect((a.data)._sourceHandlePosition).toBe('right');
  });

  it('DOWN layout: fan-out switch obeys all edge rules', async () => {
    const model = createGraph(
      [
        { id: 'switch', type: 'switch', properties: { label: 'routeByRisk' } },
        { id: 'left', type: 'call', properties: { label: 'siuReferral' } },
        { id: 'mid', type: 'call', properties: { label: 'humanReview' } },
        { id: 'right', type: 'set', properties: { label: 'autoApprove' } },
      ],
      [
        { id: 'e1', type: 'switch-case', source: 'switch', target: 'left' },
        { id: 'e2', type: 'switch-case', source: 'switch', target: 'mid' },
        { id: 'e3', type: 'switch-case', source: 'switch', target: 'right' },
      ],
    );
    const layout = await computeElkLayout(model, { direction: 'DOWN' });
    const { nodes, edges } = toReactFlowGraph(model, layout, undefined, 'DOWN');

    assertAllEdgeRules(nodes, edges, 'DOWN');
  });

  it('DOWN layout: fan-in merge obeys all edge rules', async () => {
    const model = createGraph(
      [
        { id: 'left', type: 'call', properties: { label: 'siuReferral' } },
        { id: 'mid', type: 'call', properties: { label: 'humanReview' } },
        { id: 'right', type: 'set', properties: { label: 'autoApprove' } },
        { id: 'merge', type: 'call', properties: { label: 'tryNotify' } },
      ],
      [
        { id: 'e1', type: 'flow', source: 'left', target: 'merge' },
        { id: 'e2', type: 'flow', source: 'mid', target: 'merge' },
        { id: 'e3', type: 'flow', source: 'right', target: 'merge' },
      ],
    );
    const layout = await computeElkLayout(model, { direction: 'DOWN' });
    const { nodes, edges } = toReactFlowGraph(model, layout, undefined, 'DOWN');
    assertAllEdgeRules(nodes, edges, 'DOWN');
  });

  it('fraud-ml-agent SWF — 6-node pipeline (direction RIGHT, wrapping)', async () => {
    const model = createGraph(
      [
        { id: 'start', type: 'start', properties: { label: 'Start' } },
        { id: 'fetchEnrichment', type: 'call', properties: { label: 'fetchEnrichment' } },
        { id: 'runModel', type: 'call', properties: { label: 'runModel' } },
        { id: 'computeScore', type: 'set', properties: { label: 'computeScore' } },
        { id: 'checkThreshold', type: 'switch', properties: { label: 'checkThreshold' } },
        { id: 'end', type: 'end', properties: { label: 'End' } },
      ],
      [
        { id: 'e1', type: 'flow', source: 'start', target: 'fetchEnrichment' },
        { id: 'e2', type: 'flow', source: 'fetchEnrichment', target: 'runModel' },
        { id: 'e3', type: 'flow', source: 'runModel', target: 'computeScore' },
        { id: 'e4', type: 'flow', source: 'computeScore', target: 'checkThreshold' },
        { id: 'e5', type: 'flow', source: 'checkThreshold', target: 'end' },
      ],
    );
    const layout = await computeElkLayout(model, { direction: 'RIGHT', wrapping: true });
    const { nodes, edges } = toReactFlowGraph(model, layout, undefined, 'RIGHT');
    assertAllEdgeRules(nodes, edges, 'RIGHT');
  });

  it('sanctions-agent SWF — 5-node pipeline (direction RIGHT, wrapping)', async () => {
    const model = createGraph(
      [
        { id: 'start', type: 'start', properties: { label: 'Start' } },
        { id: 'fetchPEPLists', type: 'call', properties: { label: 'fetchPEPLists' } },
        { id: 'screenClaimant', type: 'call', properties: { label: 'screenClaimant' } },
        { id: 'routeResult', type: 'switch', properties: { label: 'routeResult' } },
        { id: 'end', type: 'end', properties: { label: 'End' } },
      ],
      [
        { id: 'e1', type: 'flow', source: 'start', target: 'fetchPEPLists' },
        { id: 'e2', type: 'flow', source: 'fetchPEPLists', target: 'screenClaimant' },
        { id: 'e3', type: 'flow', source: 'screenClaimant', target: 'routeResult' },
        { id: 'e4', type: 'flow', source: 'routeResult', target: 'end' },
      ],
    );
    const layout = await computeElkLayout(model, { direction: 'RIGHT', wrapping: true });
    const { nodes, edges } = toReactFlowGraph(model, layout, undefined, 'RIGHT');
    assertAllEdgeRules(nodes, edges, 'RIGHT');
  });

  it('claim-review SWF — branching with try/catch (direction DOWN)', async () => {
    const model = createGraph(
      [
        { id: 'start', type: 'start', properties: { label: 'Start' } },
        { id: 'fetchClaim', type: 'call', properties: { label: 'fetchClaim' } },
        { id: 'validateEvidence', type: 'call', properties: { label: 'validateEvidence' } },
        { id: 'routeByRisk', type: 'switch', properties: { label: 'routeByRisk' } },
        { id: 'autoApprove', type: 'set', properties: { label: 'autoApprove' } },
        { id: 'humanReview', type: 'call', properties: { label: 'humanReview' } },
        { id: 'siuReferral', type: 'call', properties: { label: 'siuReferral' } },
        { id: 'tryNotify', type: 'try', properties: { label: 'tryNotify' } },
        { id: 'sendNotification', type: 'call', parentId: 'tryNotify', properties: { label: 'sendNotification' } },
        { id: 'catch', type: 'catch', parentId: 'tryNotify', properties: { label: 'catch' } },
        { id: 'logNotifyFailure', type: 'set', parentId: 'catch', properties: { label: 'logNotifyFailure' } },
        { id: 'recordOutcome', type: 'call', properties: { label: 'recordOutcome' } },
        { id: 'end', type: 'end', properties: { label: 'End' } },
      ],
      [
        { id: 'e1', type: 'flow', source: 'start', target: 'fetchClaim' },
        { id: 'e2', type: 'flow', source: 'fetchClaim', target: 'validateEvidence' },
        { id: 'e3', type: 'flow', source: 'validateEvidence', target: 'routeByRisk' },
        { id: 'e4', type: 'switch-case', source: 'routeByRisk', target: 'autoApprove' },
        { id: 'e5', type: 'switch-case', source: 'routeByRisk', target: 'humanReview' },
        { id: 'e6', type: 'switch-case', source: 'routeByRisk', target: 'siuReferral' },
        { id: 'e7', type: 'flow', source: 'autoApprove', target: 'tryNotify' },
        { id: 'e8', type: 'flow', source: 'humanReview', target: 'tryNotify' },
        { id: 'e9', type: 'flow', source: 'siuReferral', target: 'tryNotify' },
        { id: 'e10', type: 'flow', source: 'tryNotify', target: 'recordOutcome' },
        { id: 'e11', type: 'flow', source: 'recordOutcome', target: 'end' },
      ],
    );
    const layout = await computeElkLayout(model, { direction: 'DOWN' });
    const { nodes, edges } = toReactFlowGraph(model, layout, undefined, 'DOWN');
    assertAllEdgeRules(nodes, edges, 'DOWN');
  });

  it('case diagram — bindings to workers to milestones to goals (direction RIGHT)', async () => {
    const model = createGraph(
      [
        { id: 'b:fraud-detection', type: 'binding', properties: { label: 'fraud-detection' } },
        { id: 'b:sanctions-screening', type: 'binding', properties: { label: 'sanctions-screening' } },
        { id: 'b:routing-decision', type: 'binding', properties: { label: 'routing-decision' } },
        { id: 'b:intake-validation', type: 'binding', properties: { label: 'intake-validation' } },
        { id: 'w:fraud-ml-agent', type: 'worker', properties: { label: 'fraud-ml-agent' } },
        { id: 'w:sanctions-agent', type: 'worker', properties: { label: 'sanctions-agent' } },
        { id: 'w:routing-engine', type: 'worker', properties: { label: 'routing-engine' } },
        { id: 'w:schema-validator', type: 'worker', properties: { label: 'schema-validator' } },
        { id: 'm:risk-assessed', type: 'milestone', properties: { label: 'risk-assessed' } },
        { id: 'm:decision-made', type: 'milestone', properties: { label: 'decision-made' } },
        { id: 'g:claim-resolved', type: 'goal', properties: { label: 'claim-resolved' } },
      ],
      [
        { id: 'e1', type: 'dispatch', source: 'b:fraud-detection', target: 'w:fraud-ml-agent' },
        { id: 'e2', type: 'dispatch', source: 'b:sanctions-screening', target: 'w:sanctions-agent' },
        { id: 'e3', type: 'dispatch', source: 'b:routing-decision', target: 'w:routing-engine' },
        { id: 'e4', type: 'dispatch', source: 'b:intake-validation', target: 'w:schema-validator' },
        { id: 'e5', type: 'condition', source: 'b:fraud-detection', target: 'm:risk-assessed' },
        { id: 'e6', type: 'condition', source: 'b:sanctions-screening', target: 'm:risk-assessed' },
        { id: 'e7', type: 'condition', source: 'b:routing-decision', target: 'm:decision-made' },
        { id: 'e8', type: 'condition', source: 'm:decision-made', target: 'g:claim-resolved' },
      ],
    );
    const layout = await computeElkLayout(model, { direction: 'RIGHT' });
    const { nodes, edges } = toReactFlowGraph(model, layout, undefined, 'RIGHT');
    assertAllEdgeRules(nodes, edges, 'RIGHT');
  });

  it('claim-review SWF — actual rendered positions (direction DOWN)', () => {
    const model = createGraph(
      [
        { id: 'start', type: 'swf-start', properties: { label: 'Start' } },
        { id: 'fetchClaim', type: 'swf-call', properties: { label: 'fetchClaim' } },
        { id: 'validateEvidence', type: 'swf-call', properties: { label: 'validateEvidence' } },
        { id: 'routeByRisk', type: 'swf-switch', properties: { label: 'routeByRisk' } },
        { id: 'autoApprove', type: 'swf-set', properties: { label: 'autoApprove' } },
        { id: 'humanReview', type: 'swf-call', properties: { label: 'humanReview' } },
        { id: 'siuReferral', type: 'swf-call', properties: { label: 'siuReferral' } },
        { id: 'tryNotify', type: 'swf-try-catch', properties: { label: 'tryNotify' } },
        { id: 'recordOutcome', type: 'swf-call', properties: { label: 'recordOutcome' } },
        { id: 'end', type: 'swf-end', properties: { label: 'End' } },
      ],
      [
        { id: 'e1', type: 'flow', source: 'start', target: 'fetchClaim' },
        { id: 'e2', type: 'flow', source: 'fetchClaim', target: 'validateEvidence' },
        { id: 'e3', type: 'flow', source: 'validateEvidence', target: 'routeByRisk' },
        { id: 'e4', type: 'switch-case', source: 'routeByRisk', target: 'autoApprove' },
        { id: 'e5', type: 'switch-case', source: 'routeByRisk', target: 'humanReview' },
        { id: 'e6', type: 'switch-case', source: 'routeByRisk', target: 'siuReferral' },
        { id: 'e7', type: 'flow', source: 'autoApprove', target: 'tryNotify' },
        { id: 'e8', type: 'flow', source: 'humanReview', target: 'tryNotify' },
        { id: 'e9', type: 'flow', source: 'siuReferral', target: 'tryNotify' },
        { id: 'e10', type: 'flow', source: 'tryNotify', target: 'recordOutcome' },
        { id: 'e11', type: 'flow', source: 'recordOutcome', target: 'end' },
      ],
    );
    const layout = {
      nodeLayouts: new Map([
        ['start', { x: 95, y: 35, width: 280, height: 50 }],
        ['fetchClaim', { x: 95, y: 105, width: 280, height: 50 }],
        ['validateEvidence', { x: 95, y: 175, width: 280, height: 50 }],
        ['routeByRisk', { x: 95, y: 245, width: 280, height: 50 }],
        ['siuReferral', { x: 25, y: 325, width: 280, height: 50 }],
        ['humanReview', { x: 325, y: 325, width: 280, height: 50 }],
        ['autoApprove', { x: 625, y: 325, width: 280, height: 50 }],
        ['tryNotify', { x: 275, y: 395, width: 380, height: 300 }],
        ['recordOutcome', { x: 325, y: 715, width: 280, height: 50 }],
        ['end', { x: 325, y: 785, width: 280, height: 50 }],
      ]),
    };
    const { nodes, edges } = toReactFlowGraph(model, layout, undefined, 'DOWN');
    assertAllEdgeRules(nodes, edges, 'DOWN');
  });
});

describe('actual rendered diagrams — exact positions from browser', () => {
  it('fraud-ml-agent SWF drill-down — actual rendered positions (direction RIGHT)', () => {
    const model = createGraph(
      [
        { id: 'start', type: 'swf-start', properties: { label: 'Start' } },
        { id: 'fetchEnrichment', type: 'swf-call', properties: { label: 'fetchEnrichment' } },
        { id: 'runModel', type: 'swf-call', properties: { label: 'runModel' } },
        { id: 'computeScore', type: 'swf-set', properties: { label: 'computeScore' } },
        { id: 'checkThreshold', type: 'swf-switch', properties: { label: 'checkThreshold' } },
        { id: 'end', type: 'swf-end', properties: { label: 'End' } },
      ],
      [
        { id: 'e1', type: 'flow', source: 'start', target: 'fetchEnrichment' },
        { id: 'e2', type: 'flow', source: 'fetchEnrichment', target: 'runModel' },
        { id: 'e3', type: 'flow', source: 'runModel', target: 'computeScore' },
        { id: 'e4', type: 'flow', source: 'computeScore', target: 'checkThreshold' },
        { id: 'e5', type: 'flow', source: 'checkThreshold', target: 'end' },
      ],
    );
    const layout = {
      nodeLayouts: new Map([
        ['start', { x: 35, y: 35, width: 280, height: 50 }],
        ['fetchEnrichment', { x: 335, y: 35, width: 280, height: 50 }],
        ['runModel', { x: 35, y: 126, width: 280, height: 50 }],
        ['computeScore', { x: 35, y: 217, width: 280, height: 50 }],
        ['checkThreshold', { x: 335, y: 217, width: 280, height: 50 }],
        ['end', { x: 35, y: 308, width: 280, height: 50 }],
      ]),
    };
    const { nodes, edges } = toReactFlowGraph(model, layout, undefined, 'RIGHT');
    assertAllEdgeRules(nodes, edges, 'RIGHT');
  });

  it('claim-review SWF — actual rendered positions (direction DOWN)', () => {
    const model = createGraph(
      [
        { id: 'start', type: 'swf-start', properties: { label: 'Start' } },
        { id: 'fetchClaim', type: 'swf-call', properties: { label: 'fetchClaim' } },
        { id: 'validateEvidence', type: 'swf-call', properties: { label: 'validateEvidence' } },
        { id: 'routeByRisk', type: 'swf-switch', properties: { label: 'routeByRisk' } },
        { id: 'autoApprove', type: 'swf-set', properties: { label: 'autoApprove' } },
        { id: 'humanReview', type: 'swf-call', properties: { label: 'humanReview' } },
        { id: 'siuReferral', type: 'swf-call', properties: { label: 'siuReferral' } },
        { id: 'tryNotify', type: 'swf-try-catch', properties: { label: 'tryNotify' } },
        { id: 'recordOutcome', type: 'swf-call', properties: { label: 'recordOutcome' } },
        { id: 'end', type: 'swf-end', properties: { label: 'End' } },
      ],
      [
        { id: 'e1', type: 'flow', source: 'start', target: 'fetchClaim' },
        { id: 'e2', type: 'flow', source: 'fetchClaim', target: 'validateEvidence' },
        { id: 'e3', type: 'flow', source: 'validateEvidence', target: 'routeByRisk' },
        { id: 'e4', type: 'switch-case', source: 'routeByRisk', target: 'autoApprove' },
        { id: 'e5', type: 'switch-case', source: 'routeByRisk', target: 'humanReview' },
        { id: 'e6', type: 'switch-case', source: 'routeByRisk', target: 'siuReferral' },
        { id: 'e7', type: 'flow', source: 'autoApprove', target: 'tryNotify' },
        { id: 'e8', type: 'flow', source: 'humanReview', target: 'tryNotify' },
        { id: 'e9', type: 'flow', source: 'siuReferral', target: 'tryNotify' },
        { id: 'e10', type: 'flow', source: 'tryNotify', target: 'recordOutcome' },
        { id: 'e11', type: 'flow', source: 'recordOutcome', target: 'end' },
      ],
    );
    const layout = {
      nodeLayouts: new Map([
        ['start', { x: 95, y: 35, width: 280, height: 50 }],
        ['fetchClaim', { x: 95, y: 105, width: 280, height: 50 }],
        ['validateEvidence', { x: 95, y: 175, width: 280, height: 50 }],
        ['routeByRisk', { x: 95, y: 245, width: 280, height: 50 }],
        ['siuReferral', { x: 25, y: 325, width: 280, height: 50 }],
        ['humanReview', { x: 325, y: 325, width: 280, height: 50 }],
        ['autoApprove', { x: 625, y: 325, width: 280, height: 50 }],
        ['tryNotify', { x: 275, y: 395, width: 380, height: 300 }],
        ['recordOutcome', { x: 325, y: 715, width: 280, height: 50 }],
        ['end', { x: 325, y: 785, width: 280, height: 50 }],
      ]),
    };
    const { nodes, edges } = toReactFlowGraph(model, layout, undefined, 'DOWN');
    assertAllEdgeRules(nodes, edges, 'DOWN');
  });
});

describe('edge routing rules (no same-handle, no crossings, shortest path)', () => {
  it('vertical sequence', async () => {
    const model = createGraph(
      [
        { id: 'a', type: 'call', properties: { label: 'A' } },
        { id: 'b', type: 'call', properties: { label: 'B' } },
        { id: 'c', type: 'call', properties: { label: 'C' } },
        { id: 'd', type: 'call', properties: { label: 'D' } },
      ],
      [
        { id: 'e1', type: 'flow', source: 'a', target: 'b' },
        { id: 'e2', type: 'flow', source: 'b', target: 'c' },
        { id: 'e3', type: 'flow', source: 'c', target: 'd' },
      ],
    );
    const layout = await computeElkLayout(model, { direction: 'DOWN' });
    const { nodes, edges } = toReactFlowGraph(model, layout, undefined, 'DOWN');
    assertAllEdgeRules(nodes, edges, 'DOWN');
  });

  it('branching switch — no crossings (direction DOWN)', async () => {
    const model = createGraph(
      [
        { id: 'start', type: 'start', properties: { label: 'Start' } },
        { id: 'validate', type: 'call', properties: { label: 'validateEvidence' } },
        { id: 'switch', type: 'switch', properties: { label: 'routeByRisk' } },
        { id: 'branchA', type: 'call', properties: { label: 'siuReferral' } },
        { id: 'branchB', type: 'call', properties: { label: 'humanReview' } },
        { id: 'branchC', type: 'set', properties: { label: 'autoApprove' } },
        { id: 'merge', type: 'call', properties: { label: 'tryNotify' } },
        { id: 'end', type: 'call', properties: { label: 'recordOutcome' } },
      ],
      [
        { id: 'e1', type: 'flow', source: 'start', target: 'validate' },
        { id: 'e2', type: 'flow', source: 'validate', target: 'switch' },
        { id: 'e3', type: 'switch-case', source: 'switch', target: 'branchA' },
        { id: 'e4', type: 'switch-case', source: 'switch', target: 'branchB' },
        { id: 'e5', type: 'switch-case', source: 'switch', target: 'branchC' },
        { id: 'e6', type: 'flow', source: 'branchA', target: 'merge' },
        { id: 'e7', type: 'flow', source: 'branchB', target: 'merge' },
        { id: 'e8', type: 'flow', source: 'branchC', target: 'merge' },
        { id: 'e9', type: 'flow', source: 'merge', target: 'end' },
      ],
    );
    const layout = await computeElkLayout(model, { direction: 'DOWN' });
    const { nodes, edges } = toReactFlowGraph(model, layout, undefined, 'DOWN');
    assertAllEdgeRules(nodes, edges, 'DOWN');
  });

  it('horizontal chain — no crossings (direction RIGHT)', async () => {
    const model = createGraph(
      [
        { id: 'a', type: 'binding', properties: { label: 'intake' } },
        { id: 'b', type: 'worker', properties: { label: 'validator' } },
        { id: 'c', type: 'milestone', properties: { label: 'done' } },
      ],
      [
        { id: 'e1', type: 'dispatch', source: 'a', target: 'b' },
        { id: 'e2', type: 'condition', source: 'a', target: 'c' },
      ],
    );
    const layout = await computeElkLayout(model, { direction: 'RIGHT' });
    const { nodes, edges } = toReactFlowGraph(model, layout, undefined, 'RIGHT');
    assertAllEdgeRules(nodes, edges, 'RIGHT');
  });

  it('wrapped snake pipeline — no crossings (direction RIGHT, wrapping)', async () => {
    const steps = Array.from({ length: 10 }, (_, i) => ({
      id: `step-${i}`,
      type: 'call' as const,
      properties: { label: `step${i}` },
    }));
    const stepEdges = steps.slice(0, -1).map((s, i) => ({
      id: `e${i}`,
      type: 'flow' as const,
      source: s.id,
      target: steps[i + 1]!.id,
    }));

    const model = createGraph(steps, stepEdges);
    const layout = await computeElkLayout(model, { direction: 'RIGHT', wrapping: true });
    const { nodes, edges } = toReactFlowGraph(model, layout, undefined, 'RIGHT');
    assertAllEdgeRules(nodes, edges, 'RIGHT');
  });

  it('fan-out fan-in DAG — no crossings (direction DOWN)', async () => {
    const model = createGraph(
      [
        { id: 'root', type: 'dag-node', properties: { label: 'validate' } },
        { id: 'left', type: 'dag-node', properties: { label: 'enrich-policy' } },
        { id: 'right', type: 'dag-node', properties: { label: 'enrich-claimant' } },
        { id: 'merge', type: 'dag-node', properties: { label: 'aggregate' } },
        { id: 'final', type: 'dag-node', properties: { label: 'route' } },
      ],
      [
        { id: 'e1', type: 'dep', source: 'root', target: 'left' },
        { id: 'e2', type: 'dep', source: 'root', target: 'right' },
        { id: 'e3', type: 'dep', source: 'left', target: 'merge' },
        { id: 'e4', type: 'dep', source: 'right', target: 'merge' },
        { id: 'e5', type: 'dep', source: 'merge', target: 'final' },
      ],
    );
    const layout = await computeElkLayout(model, { direction: 'DOWN' });
    const { nodes, edges } = toReactFlowGraph(model, layout, undefined, 'DOWN');
    assertAllEdgeRules(nodes, edges, 'DOWN');
  });

  it('15-step pipeline with snake wrapping (direction RIGHT)', async () => {
    const steps = Array.from({ length: 15 }, (_, i) => ({
      id: `s${i}`,
      type: 'call' as const,
      properties: { label: `step${i}LongEnoughName` },
    }));
    const stepEdges = steps.slice(0, -1).map((s, i) => ({
      id: `e${i}`,
      type: 'flow' as const,
      source: s.id,
      target: steps[i + 1]!.id,
    }));

    const model = createGraph(steps, stepEdges);
    const layout = await computeElkLayout(model, { direction: 'RIGHT', wrapping: true });
    const { nodes, edges } = toReactFlowGraph(model, layout, undefined, 'RIGHT');
    assertAllEdgeRules(nodes, edges, 'RIGHT');
  });

  it('pipeline inside container node — container must not block handle detection', async () => {
    const container = { id: 'root', type: 'container', properties: { label: 'workflow' } };
    const start = { id: 'start', type: 'start', parentId: 'root', properties: { label: 'Start' } };
    const steps = Array.from({ length: 6 }, (_, i) => ({
      id: `s${i}`,
      type: 'call' as const,
      parentId: 'root',
      properties: { label: `step${i}LongName` },
    }));
    const end = { id: 'end', type: 'end', parentId: 'root', properties: { label: 'End' } };
    const allNodes = [container, start, ...steps, end];
    const allEdges = [
      { id: 'e-start', type: 'flow' as const, source: 'start', target: 's0' },
      ...steps.slice(0, -1).map((s, i) => ({
        id: `e${i}`,
        type: 'flow' as const,
        source: s.id,
        target: steps[i + 1]!.id,
      })),
      { id: 'e-end', type: 'flow' as const, source: steps[steps.length - 1]!.id, target: 'end' },
    ];
    const model = createGraph(allNodes, allEdges);
    const layout = await computeElkLayout(model, { direction: 'RIGHT', wrapping: true });
    const { nodes, edges } = toReactFlowGraph(model, layout, undefined, 'RIGHT');
    assertAllEdgeRules(nodes, edges, 'RIGHT');
  });

  it('fraud-ml-agent SWF — 6-node pipeline (direction RIGHT, wrapping)', async () => {
    const model = createGraph(
      [
        { id: 'start', type: 'start', properties: { label: 'Start' } },
        { id: 'fetchEnrichment', type: 'call', properties: { label: 'fetchEnrichment' } },
        { id: 'runModel', type: 'call', properties: { label: 'runModel' } },
        { id: 'computeScore', type: 'set', properties: { label: 'computeScore' } },
        { id: 'checkThreshold', type: 'switch', properties: { label: 'checkThreshold' } },
        { id: 'end', type: 'end', properties: { label: 'End' } },
      ],
      [
        { id: 'e1', type: 'flow', source: 'start', target: 'fetchEnrichment' },
        { id: 'e2', type: 'flow', source: 'fetchEnrichment', target: 'runModel' },
        { id: 'e3', type: 'flow', source: 'runModel', target: 'computeScore' },
        { id: 'e4', type: 'flow', source: 'computeScore', target: 'checkThreshold' },
        { id: 'e5', type: 'flow', source: 'checkThreshold', target: 'end' },
      ],
    );
    const layout = await computeElkLayout(model, { direction: 'RIGHT', wrapping: true });
    const { nodes, edges } = toReactFlowGraph(model, layout, undefined, 'RIGHT');
    assertAllEdgeRules(nodes, edges, 'RIGHT');
  });

  it('sanctions-agent SWF — 5-node pipeline (direction RIGHT, wrapping)', async () => {
    const model = createGraph(
      [
        { id: 'start', type: 'start', properties: { label: 'Start' } },
        { id: 'fetchPEPLists', type: 'call', properties: { label: 'fetchPEPLists' } },
        { id: 'screenClaimant', type: 'call', properties: { label: 'screenClaimant' } },
        { id: 'routeResult', type: 'switch', properties: { label: 'routeResult' } },
        { id: 'end', type: 'end', properties: { label: 'End' } },
      ],
      [
        { id: 'e1', type: 'flow', source: 'start', target: 'fetchPEPLists' },
        { id: 'e2', type: 'flow', source: 'fetchPEPLists', target: 'screenClaimant' },
        { id: 'e3', type: 'flow', source: 'screenClaimant', target: 'routeResult' },
        { id: 'e4', type: 'flow', source: 'routeResult', target: 'end' },
      ],
    );
    const layout = await computeElkLayout(model, { direction: 'RIGHT', wrapping: true });
    const { nodes, edges } = toReactFlowGraph(model, layout, undefined, 'RIGHT');
    assertAllEdgeRules(nodes, edges, 'RIGHT');
  });

  it('claim-review SWF — branching with try/catch (direction DOWN)', async () => {
    const model = createGraph(
      [
        { id: 'start', type: 'start', properties: { label: 'Start' } },
        { id: 'fetchClaim', type: 'call', properties: { label: 'fetchClaim' } },
        { id: 'validateEvidence', type: 'call', properties: { label: 'validateEvidence' } },
        { id: 'routeByRisk', type: 'switch', properties: { label: 'routeByRisk' } },
        { id: 'autoApprove', type: 'set', properties: { label: 'autoApprove' } },
        { id: 'humanReview', type: 'call', properties: { label: 'humanReview' } },
        { id: 'siuReferral', type: 'call', properties: { label: 'siuReferral' } },
        { id: 'tryNotify', type: 'try', properties: { label: 'tryNotify' } },
        { id: 'sendNotification', type: 'call', parentId: 'tryNotify', properties: { label: 'sendNotification' } },
        { id: 'catch', type: 'catch', parentId: 'tryNotify', properties: { label: 'catch' } },
        { id: 'logNotifyFailure', type: 'set', parentId: 'catch', properties: { label: 'logNotifyFailure' } },
        { id: 'recordOutcome', type: 'call', properties: { label: 'recordOutcome' } },
        { id: 'end', type: 'end', properties: { label: 'End' } },
      ],
      [
        { id: 'e1', type: 'flow', source: 'start', target: 'fetchClaim' },
        { id: 'e2', type: 'flow', source: 'fetchClaim', target: 'validateEvidence' },
        { id: 'e3', type: 'flow', source: 'validateEvidence', target: 'routeByRisk' },
        { id: 'e4', type: 'switch-case', source: 'routeByRisk', target: 'autoApprove' },
        { id: 'e5', type: 'switch-case', source: 'routeByRisk', target: 'humanReview' },
        { id: 'e6', type: 'switch-case', source: 'routeByRisk', target: 'siuReferral' },
        { id: 'e7', type: 'flow', source: 'autoApprove', target: 'tryNotify' },
        { id: 'e8', type: 'flow', source: 'humanReview', target: 'tryNotify' },
        { id: 'e9', type: 'flow', source: 'siuReferral', target: 'tryNotify' },
        { id: 'e10', type: 'flow', source: 'tryNotify', target: 'recordOutcome' },
        { id: 'e11', type: 'flow', source: 'recordOutcome', target: 'end' },
      ],
    );
    const layout = await computeElkLayout(model, { direction: 'DOWN' });
    const { nodes, edges } = toReactFlowGraph(model, layout, undefined, 'DOWN');
    assertAllEdgeRules(nodes, edges, 'DOWN');
  });

  it('case diagram — bindings to workers to milestones to goals (direction RIGHT)', async () => {
    const model = createGraph(
      [
        { id: 'b:fraud-detection', type: 'binding', properties: { label: 'fraud-detection' } },
        { id: 'b:sanctions-screening', type: 'binding', properties: { label: 'sanctions-screening' } },
        { id: 'b:routing-decision', type: 'binding', properties: { label: 'routing-decision' } },
        { id: 'b:intake-validation', type: 'binding', properties: { label: 'intake-validation' } },
        { id: 'w:fraud-ml-agent', type: 'worker', properties: { label: 'fraud-ml-agent' } },
        { id: 'w:sanctions-agent', type: 'worker', properties: { label: 'sanctions-agent' } },
        { id: 'w:routing-engine', type: 'worker', properties: { label: 'routing-engine' } },
        { id: 'w:schema-validator', type: 'worker', properties: { label: 'schema-validator' } },
        { id: 'm:risk-assessed', type: 'milestone', properties: { label: 'risk-assessed' } },
        { id: 'm:decision-made', type: 'milestone', properties: { label: 'decision-made' } },
        { id: 'g:claim-resolved', type: 'goal', properties: { label: 'claim-resolved' } },
      ],
      [
        { id: 'e1', type: 'dispatch', source: 'b:fraud-detection', target: 'w:fraud-ml-agent' },
        { id: 'e2', type: 'dispatch', source: 'b:sanctions-screening', target: 'w:sanctions-agent' },
        { id: 'e3', type: 'dispatch', source: 'b:routing-decision', target: 'w:routing-engine' },
        { id: 'e4', type: 'dispatch', source: 'b:intake-validation', target: 'w:schema-validator' },
        { id: 'e5', type: 'condition', source: 'b:fraud-detection', target: 'm:risk-assessed' },
        { id: 'e6', type: 'condition', source: 'b:sanctions-screening', target: 'm:risk-assessed' },
        { id: 'e7', type: 'condition', source: 'b:routing-decision', target: 'm:decision-made' },
        { id: 'e8', type: 'condition', source: 'm:decision-made', target: 'g:claim-resolved' },
      ],
    );
    const layout = await computeElkLayout(model, { direction: 'RIGHT' });
    const { nodes, edges } = toReactFlowGraph(model, layout, undefined, 'RIGHT');
    assertAllEdgeRules(nodes, edges, 'RIGHT');
  });

  it('claim-review SWF — actual rendered positions (direction DOWN)', () => {
    const model = createGraph(
      [
        { id: 'start', type: 'swf-start', properties: { label: 'Start' } },
        { id: 'fetchClaim', type: 'swf-call', properties: { label: 'fetchClaim' } },
        { id: 'validateEvidence', type: 'swf-call', properties: { label: 'validateEvidence' } },
        { id: 'routeByRisk', type: 'swf-switch', properties: { label: 'routeByRisk' } },
        { id: 'autoApprove', type: 'swf-set', properties: { label: 'autoApprove' } },
        { id: 'humanReview', type: 'swf-call', properties: { label: 'humanReview' } },
        { id: 'siuReferral', type: 'swf-call', properties: { label: 'siuReferral' } },
        { id: 'tryNotify', type: 'swf-try-catch', properties: { label: 'tryNotify' } },
        { id: 'recordOutcome', type: 'swf-call', properties: { label: 'recordOutcome' } },
        { id: 'end', type: 'swf-end', properties: { label: 'End' } },
      ],
      [
        { id: 'e1', type: 'flow', source: 'start', target: 'fetchClaim' },
        { id: 'e2', type: 'flow', source: 'fetchClaim', target: 'validateEvidence' },
        { id: 'e3', type: 'flow', source: 'validateEvidence', target: 'routeByRisk' },
        { id: 'e4', type: 'switch-case', source: 'routeByRisk', target: 'autoApprove' },
        { id: 'e5', type: 'switch-case', source: 'routeByRisk', target: 'humanReview' },
        { id: 'e6', type: 'switch-case', source: 'routeByRisk', target: 'siuReferral' },
        { id: 'e7', type: 'flow', source: 'autoApprove', target: 'tryNotify' },
        { id: 'e8', type: 'flow', source: 'humanReview', target: 'tryNotify' },
        { id: 'e9', type: 'flow', source: 'siuReferral', target: 'tryNotify' },
        { id: 'e10', type: 'flow', source: 'tryNotify', target: 'recordOutcome' },
        { id: 'e11', type: 'flow', source: 'recordOutcome', target: 'end' },
      ],
    );
    const layout = {
      nodeLayouts: new Map([
        ['start', { x: 95, y: 35, width: 280, height: 50 }],
        ['fetchClaim', { x: 95, y: 105, width: 280, height: 50 }],
        ['validateEvidence', { x: 95, y: 175, width: 280, height: 50 }],
        ['routeByRisk', { x: 95, y: 245, width: 280, height: 50 }],
        ['siuReferral', { x: 25, y: 325, width: 280, height: 50 }],
        ['humanReview', { x: 325, y: 325, width: 280, height: 50 }],
        ['autoApprove', { x: 625, y: 325, width: 280, height: 50 }],
        ['tryNotify', { x: 275, y: 395, width: 380, height: 300 }],
        ['recordOutcome', { x: 325, y: 715, width: 280, height: 50 }],
        ['end', { x: 325, y: 785, width: 280, height: 50 }],
      ]),
    };
    const { nodes, edges } = toReactFlowGraph(model, layout, undefined, 'DOWN');
    assertAllEdgeRules(nodes, edges, 'DOWN');
  });
});

describe('actual rendered diagrams — exact positions from browser', () => {
  it('fraud-ml-agent SWF drill-down — actual rendered positions (direction RIGHT)', () => {
    const model = createGraph(
      [
        { id: 'start', type: 'swf-start', properties: { label: 'Start' } },
        { id: 'fetchEnrichment', type: 'swf-call', properties: { label: 'fetchEnrichment' } },
        { id: 'runModel', type: 'swf-call', properties: { label: 'runModel' } },
        { id: 'computeScore', type: 'swf-set', properties: { label: 'computeScore' } },
        { id: 'checkThreshold', type: 'swf-switch', properties: { label: 'checkThreshold' } },
        { id: 'end', type: 'swf-end', properties: { label: 'End' } },
      ],
      [
        { id: 'e1', type: 'flow', source: 'start', target: 'fetchEnrichment' },
        { id: 'e2', type: 'flow', source: 'fetchEnrichment', target: 'runModel' },
        { id: 'e3', type: 'flow', source: 'runModel', target: 'computeScore' },
        { id: 'e4', type: 'flow', source: 'computeScore', target: 'checkThreshold' },
        { id: 'e5', type: 'flow', source: 'checkThreshold', target: 'end' },
      ],
    );
    const layout = {
      nodeLayouts: new Map([
        ['start', { x: 35, y: 35, width: 280, height: 50 }],
        ['fetchEnrichment', { x: 335, y: 35, width: 280, height: 50 }],
        ['runModel', { x: 35, y: 126, width: 280, height: 50 }],
        ['computeScore', { x: 35, y: 217, width: 280, height: 50 }],
        ['checkThreshold', { x: 335, y: 217, width: 280, height: 50 }],
        ['end', { x: 35, y: 308, width: 280, height: 50 }],
      ]),
    };
    const { nodes, edges } = toReactFlowGraph(model, layout, undefined, 'RIGHT');
    assertAllEdgeRules(nodes, edges, 'RIGHT');
  });

  it('claim-review SWF — actual rendered positions (direction DOWN)', () => {
    const model = createGraph(
      [
        { id: 'start', type: 'swf-start', properties: { label: 'Start' } },
        { id: 'fetchClaim', type: 'swf-call', properties: { label: 'fetchClaim' } },
        { id: 'validateEvidence', type: 'swf-call', properties: { label: 'validateEvidence' } },
        { id: 'routeByRisk', type: 'swf-switch', properties: { label: 'routeByRisk' } },
        { id: 'autoApprove', type: 'swf-set', properties: { label: 'autoApprove' } },
        { id: 'humanReview', type: 'swf-call', properties: { label: 'humanReview' } },
        { id: 'siuReferral', type: 'swf-call', properties: { label: 'siuReferral' } },
        { id: 'tryNotify', type: 'swf-try-catch', properties: { label: 'tryNotify' } },
        { id: 'recordOutcome', type: 'swf-call', properties: { label: 'recordOutcome' } },
        { id: 'end', type: 'swf-end', properties: { label: 'End' } },
      ],
      [
        { id: 'e1', type: 'flow', source: 'start', target: 'fetchClaim' },
        { id: 'e2', type: 'flow', source: 'fetchClaim', target: 'validateEvidence' },
        { id: 'e3', type: 'flow', source: 'validateEvidence', target: 'routeByRisk' },
        { id: 'e4', type: 'switch-case', source: 'routeByRisk', target: 'autoApprove' },
        { id: 'e5', type: 'switch-case', source: 'routeByRisk', target: 'humanReview' },
        { id: 'e6', type: 'switch-case', source: 'routeByRisk', target: 'siuReferral' },
        { id: 'e7', type: 'flow', source: 'autoApprove', target: 'tryNotify' },
        { id: 'e8', type: 'flow', source: 'humanReview', target: 'tryNotify' },
        { id: 'e9', type: 'flow', source: 'siuReferral', target: 'tryNotify' },
        { id: 'e10', type: 'flow', source: 'tryNotify', target: 'recordOutcome' },
        { id: 'e11', type: 'flow', source: 'recordOutcome', target: 'end' },
      ],
    );
    const layout = {
      nodeLayouts: new Map([
        ['start', { x: 95, y: 35, width: 280, height: 50 }],
        ['fetchClaim', { x: 95, y: 105, width: 280, height: 50 }],
        ['validateEvidence', { x: 95, y: 175, width: 280, height: 50 }],
        ['routeByRisk', { x: 95, y: 245, width: 280, height: 50 }],
        ['siuReferral', { x: 25, y: 325, width: 280, height: 50 }],
        ['humanReview', { x: 325, y: 325, width: 280, height: 50 }],
        ['autoApprove', { x: 625, y: 325, width: 280, height: 50 }],
        ['tryNotify', { x: 275, y: 395, width: 380, height: 300 }],
        ['recordOutcome', { x: 325, y: 715, width: 280, height: 50 }],
        ['end', { x: 325, y: 785, width: 280, height: 50 }],
      ]),
    };
    const { nodes, edges } = toReactFlowGraph(model, layout, undefined, 'DOWN');
    assertAllEdgeRules(nodes, edges, 'DOWN');
  });
});
