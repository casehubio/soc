import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRubberBandSelect } from './rubber-band-select.js';
import { createGraph } from '@casehubio/graph-core';
import type { GraphNode, GraphEdge } from '@casehubio/graph-core';

if (typeof globalThis.PointerEvent === 'undefined') {
  (globalThis as any).PointerEvent = class PointerEvent extends MouseEvent {
    readonly pointerId: number;
    constructor(type: string, init?: PointerEventInit) {
      super(type, init);
      this.pointerId = init?.pointerId ?? 0;
    }
  };
}

function node(id: string): GraphNode {
  return { id, type: 'step', properties: {} };
}

function edge(id: string, source: string, target: string): GraphEdge {
  return { id, type: 'default', source, target };
}

function rfNode(id: string, x: number, y: number, w = 100, h = 50) {
  return { id, position: { x, y }, measured: { width: w, height: h }, type: 'custom', data: {} };
}

function fire(el: HTMLElement, type: string, opts: PointerEventInit & { shiftKey?: boolean } = {}) {
  el.dispatchEvent(new PointerEvent(type, { bubbles: true, ...opts }));
}

function shiftDragStart(el: HTMLElement, x: number, y: number) {
  fire(el, 'pointerdown', { clientX: x, clientY: y, pointerId: 1, shiftKey: true });
}

describe('RubberBandSelect', () => {
  let container: HTMLDivElement;
  let onComplete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement('div');
    container.setPointerCapture = vi.fn();
    container.releasePointerCapture = vi.fn();
    const viewport = document.createElement('div');
    viewport.classList.add('react-flow__viewport');
    container.appendChild(viewport);
    document.body.appendChild(container);
    onComplete = vi.fn();
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('selects valid segment inside rubber-band rectangle', () => {
    // A(0,0)→B(200,0)→C(400,0) — rectangle covers B only
    const model = createGraph(
      [node('A'), node('B'), node('C')],
      [edge('e1', 'A', 'B'), edge('e2', 'B', 'C')],
    );
    const nodes = [rfNode('A', 0, 0), rfNode('B', 200, 0), rfNode('C', 400, 0)];

    const rb = createRubberBandSelect({
      containerEl: container,
      screenToFlow: (x, y) => ({ x, y }),
      getNodes: () => nodes,
      getModel: () => model,
      onComplete,
    });
    rb.attach();

    shiftDragStart(container, 150, -10);
    fire(container, 'pointermove', { clientX: 350, clientY: 100, shiftKey: true });
    fire(container, 'pointerup', { clientX: 350, clientY: 100 });

    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      type: 'selected',
      nodeIds: new Set(['B']),
    }));
    rb.dispose();
  });

  it('selects multi-node contiguous segment', () => {
    // A→B→C→D, rectangle covers B and C
    const model = createGraph(
      [node('A'), node('B'), node('C'), node('D')],
      [edge('e1', 'A', 'B'), edge('e2', 'B', 'C'), edge('e3', 'C', 'D')],
    );
    const nodes = [rfNode('A', 0, 0), rfNode('B', 200, 0), rfNode('C', 400, 0), rfNode('D', 600, 0)];

    const rb = createRubberBandSelect({
      containerEl: container,
      screenToFlow: (x, y) => ({ x, y }),
      getNodes: () => nodes,
      getModel: () => model,
      onComplete,
    });
    rb.attach();

    shiftDragStart(container, 150, -10);
    fire(container, 'pointermove', { clientX: 550, clientY: 100, shiftKey: true });
    fire(container, 'pointerup', { clientX: 550, clientY: 100 });

    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      type: 'selected',
      nodeIds: new Set(['B', 'C']),
    }));
    rb.dispose();
  });

  it('returns empty when selection is invalid (disconnected node)', () => {
    const model = createGraph([node('A')], []);
    const nodes = [rfNode('A', 0, 0)];

    const rb = createRubberBandSelect({
      containerEl: container,
      screenToFlow: (x, y) => ({ x, y }),
      getNodes: () => nodes,
      getModel: () => model,
      onComplete,
    });
    rb.attach();

    shiftDragStart(container, -10, -10);
    fire(container, 'pointermove', { clientX: 200, clientY: 100, shiftKey: true });
    fire(container, 'pointerup', { clientX: 200, clientY: 100 });

    expect(onComplete).toHaveBeenCalledWith({ type: 'empty' });
    rb.dispose();
  });

  it('returns empty when rectangle covers no nodes', () => {
    const model = createGraph([node('A')], []);
    const nodes = [rfNode('A', 500, 500)];

    const rb = createRubberBandSelect({
      containerEl: container,
      screenToFlow: (x, y) => ({ x, y }),
      getNodes: () => nodes,
      getModel: () => model,
      onComplete,
    });
    rb.attach();

    shiftDragStart(container, 0, 0);
    fire(container, 'pointermove', { clientX: 100, clientY: 100, shiftKey: true });
    fire(container, 'pointerup', { clientX: 100, clientY: 100 });

    expect(onComplete).toHaveBeenCalledWith({ type: 'empty' });
    rb.dispose();
  });

  it('cancels on Escape', () => {
    const model = createGraph(
      [node('A'), node('B'), node('C')],
      [edge('e1', 'A', 'B'), edge('e2', 'B', 'C')],
    );
    const nodes = [rfNode('A', 0, 0), rfNode('B', 200, 0), rfNode('C', 400, 0)];

    const rb = createRubberBandSelect({
      containerEl: container,
      screenToFlow: (x, y) => ({ x, y }),
      getNodes: () => nodes,
      getModel: () => model,
      onComplete,
    });
    rb.attach();

    shiftDragStart(container, 150, -10);
    fire(container, 'pointermove', { clientX: 350, clientY: 100, shiftKey: true });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(onComplete).toHaveBeenCalledWith({ type: 'empty' });
    expect(rb.isActive).toBe(false);
    rb.dispose();
  });

  it('does not start drag when pointerdown is on a node element', () => {
    const model = createGraph([node('A'), node('B')], [edge('e1', 'A', 'B')]);
    const nodes = [rfNode('A', 0, 0), rfNode('B', 200, 0)];

    const rb = createRubberBandSelect({
      containerEl: container,
      screenToFlow: (x, y) => ({ x, y }),
      getNodes: () => nodes,
      getModel: () => model,
      onComplete,
    });
    rb.attach();

    const nodeEl = document.createElement('div');
    nodeEl.classList.add('react-flow__node');
    container.appendChild(nodeEl);

    nodeEl.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 50, clientY: 25, pointerId: 1 }));
    fire(container, 'pointermove', { clientX: 200, clientY: 100 });
    fire(container, 'pointerup', { clientX: 200, clientY: 100 });

    expect(onComplete).not.toHaveBeenCalled();
    rb.dispose();
  });

  it('creates and removes rectangle element during drag', () => {
    const model = createGraph([node('A'), node('B')], [edge('e1', 'A', 'B')]);
    const nodes = [rfNode('A', 0, 0), rfNode('B', 200, 0)];

    const rb = createRubberBandSelect({
      containerEl: container,
      screenToFlow: (x, y) => ({ x, y }),
      getNodes: () => nodes,
      getModel: () => model,
      onComplete,
    });
    rb.attach();

    shiftDragStart(container, 0, 0);
    fire(container, 'pointermove', { clientX: 100, clientY: 100, shiftKey: true });

    expect(document.querySelector('.multi-select-rect')).not.toBeNull();

    fire(container, 'pointerup', { clientX: 100, clientY: 100 });

    expect(document.querySelector('.multi-select-rect')).toBeNull();
    rb.dispose();
  });

  it('cancels drag when Shift is released mid-drag', () => {
    const model = createGraph(
      [node('A'), node('B'), node('C')],
      [edge('e1', 'A', 'B'), edge('e2', 'B', 'C')],
    );
    const nodes = [rfNode('A', 0, 0), rfNode('B', 200, 0), rfNode('C', 400, 0)];

    const rb = createRubberBandSelect({
      containerEl: container,
      screenToFlow: (x, y) => ({ x, y }),
      getNodes: () => nodes,
      getModel: () => model,
      onComplete,
    });
    rb.attach();

    shiftDragStart(container, 150, -10);
    fire(container, 'pointermove', { clientX: 350, clientY: 100, shiftKey: true });
    expect(document.querySelector('.multi-select-rect')).not.toBeNull();

    // Release Shift via keyup
    document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift' }));

    expect(document.querySelector('.multi-select-rect')).toBeNull();
    expect(onComplete).toHaveBeenCalledWith({ type: 'empty' });
    expect(rb.isActive).toBe(false);
    rb.dispose();
  });

  it('cancels drag when Shift is released during pointermove', () => {
    const model = createGraph(
      [node('A'), node('B'), node('C')],
      [edge('e1', 'A', 'B'), edge('e2', 'B', 'C')],
    );
    const nodes = [rfNode('A', 0, 0), rfNode('B', 200, 0), rfNode('C', 400, 0)];

    const rb = createRubberBandSelect({
      containerEl: container,
      screenToFlow: (x, y) => ({ x, y }),
      getNodes: () => nodes,
      getModel: () => model,
      onComplete,
    });
    rb.attach();

    shiftDragStart(container, 150, -10);
    // Move WITHOUT shiftKey — simulates user releasing Shift while dragging
    fire(container, 'pointermove', { clientX: 350, clientY: 100, shiftKey: false });

    expect(document.querySelector('.multi-select-rect')).toBeNull();
    expect(onComplete).toHaveBeenCalledWith({ type: 'empty' });
    rb.dispose();
  });

  it('isSelectable filter excludes non-selectable nodes from candidates', () => {
    // A→B→C, rectangle covers all three but B is non-selectable
    const model = createGraph(
      [node('A'), node('B'), node('C')],
      [edge('e1', 'A', 'B'), edge('e2', 'B', 'C')],
    );
    const nodes = [rfNode('A', 0, 0), rfNode('B', 200, 0), rfNode('C', 400, 0)];

    const rb = createRubberBandSelect({
      containerEl: container,
      screenToFlow: (x, y) => ({ x, y }),
      getNodes: () => nodes,
      getModel: () => model,
      isSelectable: (nodeId) => nodeId !== 'B',
      onComplete,
    });
    rb.attach();

    shiftDragStart(container, -10, -10);
    fire(container, 'pointermove', { clientX: 550, clientY: 100, shiftKey: true });
    fire(container, 'pointerup', { clientX: 550, clientY: 100 });

    // B excluded → only A and C in candidates → validateSelection returns empty
    // because A→C is not a contiguous selection without B
    expect(onComplete).toHaveBeenCalledWith({ type: 'empty' });
    rb.dispose();
  });

  it('does not start rubber-band without Shift key (allows pan)', () => {
    const model = createGraph(
      [node('A'), node('B'), node('C')],
      [edge('e1', 'A', 'B'), edge('e2', 'B', 'C')],
    );
    const nodes = [rfNode('A', 0, 0), rfNode('B', 200, 0), rfNode('C', 400, 0)];

    const rb = createRubberBandSelect({
      containerEl: container,
      screenToFlow: (x, y) => ({ x, y }),
      getNodes: () => nodes,
      getModel: () => model,
      onComplete,
    });
    rb.attach();

    // Plain drag without Shift — should NOT start rubber-band
    fire(container, 'pointerdown', { clientX: 150, clientY: -10, pointerId: 1 });
    fire(container, 'pointermove', { clientX: 350, clientY: 100, shiftKey: true });
    fire(container, 'pointerup', { clientX: 350, clientY: 100 });

    expect(onComplete).not.toHaveBeenCalled();
    expect(document.querySelector('.multi-select-rect')).toBeNull();
    rb.dispose();
  });
});
