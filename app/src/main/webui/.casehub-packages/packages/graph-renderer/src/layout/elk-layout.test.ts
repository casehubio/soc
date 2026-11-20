import { describe, it, expect } from 'vitest';
import { createGraph, type GraphModel } from '@casehubio/graph-core';
import { computeElkLayout } from './elk-layout.js';

const DEFAULT_NODE_WIDTH = 280;
const DEFAULT_NODE_HEIGHT = 53;

describe('computeElkLayout', () => {
  it('assigns positions to flat graph nodes', async () => {
    const model = createGraph(
      [
        { id: '1', type: 'a', properties: { label: 'Node 1' } },
        { id: '2', type: 'a', properties: { label: 'Node 2' } },
        { id: '3', type: 'a', properties: { label: 'Node 3' } },
      ],
      [
        { id: 'e1-2', type: '', source: '1', target: '2' },
        { id: 'e1-3', type: '', source: '1', target: '3' },
      ],
    );
    const result = await computeElkLayout(model);
    expect(result.nodeLayouts.size).toBe(3);
    const nonZero = [...result.nodeLayouts.values()].filter(
      l => l.x !== 0 || l.y !== 0,
    );
    expect(nonZero.length).toBeGreaterThan(0);
  });

  it('does not overlap flat nodes', async () => {
    const model = createGraph(
      [
        { id: '1', type: 'a', properties: {} },
        { id: '2', type: 'a', properties: {} },
        { id: '3', type: 'a', properties: {} },
      ],
      [
        { id: 'e1-2', type: '', source: '1', target: '2' },
        { id: 'e1-3', type: '', source: '1', target: '3' },
      ],
    );
    const result = await computeElkLayout(model);
    const layouts = [...result.nodeLayouts.values()];
    for (let i = 0; i < layouts.length; i++) {
      for (let j = i + 1; j < layouts.length; j++) {
        const a = layouts[i]!;
        const b = layouts[j]!;
        const overlaps =
          Math.abs(a.x - b.x) < 10 && Math.abs(a.y - b.y) < 10;
        expect(overlaps, `nodes overlap at (${a.x},${a.y}) and (${b.x},${b.y})`).toBe(false);
      }
    }
  });

  it('returns empty map for empty model', async () => {
    const model = createGraph([], []);
    const result = await computeElkLayout(model);
    expect(result.nodeLayouts.size).toBe(0);
  });

  it('lays out nested graph with parent containing children', async () => {
    const model = createGraph(
      [
        { id: 'parent', type: 'group', properties: {} },
        { id: 'child1', type: 'a', parentId: 'parent', properties: {} },
        { id: 'child2', type: 'a', parentId: 'parent', properties: {} },
      ],
      [{ id: 'ec', type: '', source: 'child1', target: 'child2' }],
    );
    const result = await computeElkLayout(model);
    expect(result.nodeLayouts.size).toBe(3);
    const parent = result.nodeLayouts.get('parent')!;
    expect(parent.width).toBeGreaterThan(DEFAULT_NODE_WIDTH);
    expect(parent.height).toBeGreaterThan(DEFAULT_NODE_HEIGHT);
  });

  it('handles deep nesting (grandparent → parent → child)', async () => {
    const model = createGraph(
      [
        { id: 'gp', type: 'group', properties: {} },
        { id: 'p', type: 'group', parentId: 'gp', properties: {} },
        { id: 'c', type: 'a', parentId: 'p', properties: {} },
      ],
      [],
    );
    const result = await computeElkLayout(model);
    expect(result.nodeLayouts.size).toBe(3);
    const gp = result.nodeLayouts.get('gp')!;
    const p = result.nodeLayouts.get('p')!;
    expect(gp.width).toBeGreaterThan(p.width);
  });

  it('applies containerPadding option', async () => {
    const model = createGraph(
      [
        { id: 'p', type: 'group', properties: {} },
        { id: 'c', type: 'a', parentId: 'p', properties: {} },
      ],
      [],
    );
    const narrow = await computeElkLayout(model, { containerPadding: 5 });
    const wide = await computeElkLayout(model, { containerPadding: 50 });
    const narrowP = narrow.nodeLayouts.get('p')!;
    const wideP = wide.nodeLayouts.get('p')!;
    expect(wideP.width).toBeGreaterThan(narrowP.width);
  });

  it('applies direction option', async () => {
    const model = createGraph(
      [
        { id: '1', type: 'a', properties: {} },
        { id: '2', type: 'a', properties: {} },
      ],
      [{ id: 'e1', type: '', source: '1', target: '2' }],
    );
    const down = await computeElkLayout(model, { direction: 'DOWN' });
    const right = await computeElkLayout(model, { direction: 'RIGHT' });
    const downLayouts = [...down.nodeLayouts.values()];
    const rightLayouts = [...right.nodeLayouts.values()];
    const downYSpread = Math.abs(downLayouts[0]!.y - downLayouts[1]!.y);
    const rightXSpread = Math.abs(rightLayouts[0]!.x - rightLayouts[1]!.x);
    expect(downYSpread).toBeGreaterThan(0);
    expect(rightXSpread).toBeGreaterThan(0);
  });

  it('handles cross-hierarchy edges', async () => {
    const model = createGraph(
      [
        { id: 'p', type: 'group', properties: {} },
        { id: 'c', type: 'a', parentId: 'p', properties: {} },
        { id: 'ext', type: 'a', properties: {} },
      ],
      [{ id: 'e1', type: '', source: 'c', target: 'ext' }],
    );
    const result = await computeElkLayout(model);
    expect(result.nodeLayouts.size).toBe(3);
  });

  it('throws on containment cycle instead of stack overflow', async () => {
    const model: GraphModel = {
      nodes: [
        { id: 'a', type: 'x', parentId: 'b', properties: {} },
        { id: 'b', type: 'x', parentId: 'a', properties: {} },
      ],
      edges: [],
    };
    await expect(computeElkLayout(model)).rejects.toThrow('Containment cycle');
  });

  it('applies nodeSizes override to leaf node dimensions', async () => {
    const model = createGraph(
      [
        { id: '1', type: 'a', properties: {} },
        { id: '2', type: 'a', properties: {} },
      ],
      [{ id: 'e1', type: '', source: '1', target: '2' }],
    );
    const nodeSizes = new Map([['1', { width: 300, height: 200 }]]);
    const result = await computeElkLayout(model, { nodeSizes });
    const layout1 = result.nodeLayouts.get('1')!;
    expect(layout1.width).toBe(300);
    expect(layout1.height).toBe(200);
    const layout2 = result.nodeLayouts.get('2')!;
    expect(layout2.width).toBe(DEFAULT_NODE_WIDTH);
    expect(layout2.height).toBe(DEFAULT_NODE_HEIGHT);
  });

  it('ignores nodeSizes entries for node IDs not in the model', async () => {
    const model = createGraph(
      [
        { id: '1', type: 'a', properties: {} },
        { id: '2', type: 'a', properties: {} },
      ],
      [{ id: 'e1', type: '', source: '1', target: '2' }],
    );
    const nodeSizes = new Map([['nonexistent', { width: 500, height: 400 }]]);
    const result = await computeElkLayout(model, { nodeSizes });
    expect(result.nodeLayouts.size).toBe(2);
    for (const layout of result.nodeLayouts.values()) {
      expect(layout.width).toBe(DEFAULT_NODE_WIDTH);
      expect(layout.height).toBe(DEFAULT_NODE_HEIGHT);
    }
  });

  it('includes width and height in every NodeLayout', async () => {
    const model = createGraph(
      [
        { id: '1', type: 'a', properties: {} },
        { id: '2', type: 'a', properties: {} },
      ],
      [{ id: 'e1', type: '', source: '1', target: '2' }],
    );
    const result = await computeElkLayout(model);
    for (const layout of result.nodeLayouts.values()) {
      expect(layout.width).toBeGreaterThan(0);
      expect(layout.height).toBeGreaterThan(0);
    }
  });
});

function boxesOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
         a.y < b.y + b.height && a.y + a.height > b.y;
}

function assertNoSiblingOverlaps(
  model: GraphModel,
  result: { nodeLayouts: ReadonlyMap<string, { x: number; y: number; width: number; height: number }> },
): void {
  const byParent = new Map<string, string[]>();
  for (const node of model.nodes) {
    const parent = node.parentId ?? '__root__';
    if (!byParent.has(parent)) byParent.set(parent, []);
    byParent.get(parent)!.push(node.id);
  }

  for (const [parent, siblings] of byParent) {
    for (let i = 0; i < siblings.length; i++) {
      for (let j = i + 1; j < siblings.length; j++) {
        const a = result.nodeLayouts.get(siblings[i]!)!;
        const b = result.nodeLayouts.get(siblings[j]!)!;
        expect(
          boxesOverlap(a, b),
          `siblings '${siblings[i]}' and '${siblings[j]}' (parent: ${parent}) overlap: ` +
          `(${a.x},${a.y},${a.width},${a.height}) vs (${b.x},${b.y},${b.width},${b.height})`,
        ).toBe(false);
      }
    }
  }
}

describe('no sibling overlaps', () => {
  it('auto-estimates node width from label text', async () => {
    const model = createGraph(
      [
        { id: '1', type: 'a', properties: { label: 'Short' } },
        { id: '2', type: 'a', properties: { label: 'Screen claimant against sanctions and PEP lists' } },
      ],
      [{ id: 'e1', type: '', source: '1', target: '2' }],
    );
    const result = await computeElkLayout(model);
    const layout1 = result.nodeLayouts.get('1')!;
    const layout2 = result.nodeLayouts.get('2')!;
    expect(layout1.width).toBe(DEFAULT_NODE_WIDTH);
    expect(layout2.width).toBeGreaterThan(DEFAULT_NODE_WIDTH);
  });

  it('switch with 3 branches merging to a single target (with labels)', async () => {
    const model = createGraph(
      [
        { id: 'start', type: 'start', properties: { label: 'Start' } },
        { id: 'validate', type: 'call', properties: { label: 'Validate incoming claim data' } },
        { id: 'switch', type: 'switch', properties: { label: 'Route by claim type' } },
        { id: 'branchA', type: 'call', properties: { label: 'Process standard auto claim' } },
        { id: 'branchB', type: 'call', properties: { label: 'Escalate high-value property claim' } },
        { id: 'branchC', type: 'set', properties: { label: 'Flag for manual liability review' } },
        { id: 'merge', type: 'call', properties: { label: 'Consolidate claim decision' } },
        { id: 'end', type: 'end', properties: { label: 'End' } },
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
    const result = await computeElkLayout(model);
    assertNoSiblingOverlaps(model, result);
  });

  it('SWF claim-review topology with labels: sequence + switch + try/catch', async () => {
    const model = createGraph(
      [
        { id: 'root', type: 'generic', properties: { label: 'Claim Review Workflow' } },
        { id: 'entry', type: 'start', parentId: 'root', properties: { label: 'Start' } },
        { id: 'exit', type: 'end', parentId: 'root', properties: { label: 'End' } },
        { id: 'fetch', type: 'call', parentId: 'root', properties: { label: 'Fetch claim from case management system' } },
        { id: 'validate', type: 'call', parentId: 'root', properties: { label: 'Validate claim data and attachments' } },
        { id: 'route', type: 'switch', parentId: 'root', properties: { label: 'Route by risk assessment score' } },
        { id: 'approve', type: 'set', parentId: 'root', properties: { label: 'Auto-approve low-risk claim' } },
        { id: 'review', type: 'call', parentId: 'root', properties: { label: 'Assign to senior adjuster for manual review' } },
        { id: 'siu', type: 'call', parentId: 'root', properties: { label: 'Refer to special investigation unit' } },
        { id: 'tryNotify', type: 'try-catch', parentId: 'root', properties: { label: 'Notification Block' } },
        { id: 'tryBlock', type: 'try', parentId: 'tryNotify', properties: { label: 'Try' } },
        { id: 'send', type: 'call', parentId: 'tryBlock', properties: { label: 'Send decision notification to claimant' } },
        { id: 'catchBlock', type: 'catch', parentId: 'tryNotify', properties: { label: 'Catch' } },
        { id: 'logFail', type: 'set', parentId: 'catchBlock', properties: { label: 'Log notification delivery failure' } },
        { id: 'record', type: 'call', parentId: 'root', properties: { label: 'Record final decision in audit trail' } },
      ],
      [
        { id: 'e1', type: 'flow', source: 'entry', target: 'fetch' },
        { id: 'e2', type: 'flow', source: 'fetch', target: 'validate' },
        { id: 'e3', type: 'flow', source: 'validate', target: 'route' },
        { id: 'e4', type: 'switch-case', source: 'route', target: 'approve' },
        { id: 'e5', type: 'switch-case', source: 'route', target: 'review' },
        { id: 'e6', type: 'switch-case', source: 'route', target: 'siu' },
        { id: 'e7', type: 'flow', source: 'approve', target: 'tryNotify' },
        { id: 'e8', type: 'flow', source: 'review', target: 'tryNotify' },
        { id: 'e9', type: 'flow', source: 'siu', target: 'tryNotify' },
        { id: 'e10', type: 'flow', source: 'tryNotify', target: 'record' },
        { id: 'e11', type: 'flow', source: 'record', target: 'exit' },
        { id: 'e12', type: 'flow', source: 'tryBlock', target: 'catchBlock' },
      ],
    );
    const result = await computeElkLayout(model);
    assertNoSiblingOverlaps(model, result);
  });

  it('DAG with fan-out and fan-in with labels (diamond pattern)', async () => {
    const model = createGraph(
      [
        { id: 'validate', type: 'dag-node', properties: { label: 'Validate incoming claim data' } },
        { id: 'enrich-policy', type: 'dag-node', properties: { label: 'Enrich with policy details from underwriting' } },
        { id: 'enrich-claimant', type: 'dag-node', properties: { label: 'Enrich with claimant history and prior claims' } },
        { id: 'sanctions', type: 'dag-node', properties: { label: 'Screen claimant against sanctions and PEP lists' } },
        { id: 'fraud', type: 'dag-node', properties: { label: 'Run ML fraud detection model on enriched data' } },
        { id: 'medical', type: 'dag-node', properties: { label: 'Extract and validate medical evidence from attachments' } },
        { id: 'aggregate', type: 'dag-node', properties: { label: 'Aggregate all enrichment and scoring results' } },
        { id: 'route', type: 'dag-node', properties: { label: 'Route claim to appropriate handler based on score' } },
      ],
      [
        { id: 'e1', type: 'dep', source: 'validate', target: 'enrich-policy' },
        { id: 'e2', type: 'dep', source: 'validate', target: 'enrich-claimant' },
        { id: 'e3', type: 'dep', source: 'enrich-claimant', target: 'sanctions' },
        { id: 'e4', type: 'dep', source: 'enrich-policy', target: 'fraud' },
        { id: 'e5', type: 'dep', source: 'enrich-claimant', target: 'fraud' },
        { id: 'e6', type: 'dep', source: 'enrich-policy', target: 'medical' },
        { id: 'e7', type: 'dep', source: 'fraud', target: 'aggregate' },
        { id: 'e8', type: 'dep', source: 'sanctions', target: 'aggregate' },
        { id: 'e9', type: 'dep', source: 'medical', target: 'aggregate' },
        { id: 'e10', type: 'dep', source: 'aggregate', target: 'route' },
      ],
    );
    const result = await computeElkLayout(model);
    assertNoSiblingOverlaps(model, result);
  });

  it('compound children are below the container header zone', async () => {
    const HEADER_HEIGHT = 30;

    const model = createGraph(
      [
        { id: 'container', type: 'try-catch', properties: { label: 'tryNotify' } },
        { id: 'tryBlock', type: 'try', parentId: 'container', properties: { label: 'tryNotify (try)' } },
        { id: 'innerCall', type: 'call', parentId: 'tryBlock', properties: { label: 'sendNotification' } },
        { id: 'catchBlock', type: 'catch', parentId: 'container', properties: { label: 'tryNotify (catch)' } },
        { id: 'catchCall', type: 'set', parentId: 'catchBlock', properties: { label: 'logNotifyFailure' } },
      ],
      [
        { id: 'e1', type: 'flow', source: 'tryBlock', target: 'catchBlock' },
      ],
    );
    const result = await computeElkLayout(model);

    for (const node of model.nodes) {
      if (!node.parentId) continue;
      const child = result.nodeLayouts.get(node.id)!;
      expect(
        child.y,
        `'${node.id}' top (${child.y}px) is inside parent '${node.parentId}' header zone (need >= ${HEADER_HEIGHT}px)`,
      ).toBeGreaterThanOrEqual(HEADER_HEIGHT);
    }
  });
});
