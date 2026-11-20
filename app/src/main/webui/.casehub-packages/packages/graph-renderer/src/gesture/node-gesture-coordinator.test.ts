import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NodeGestureCoordinator } from './node-gesture-coordinator.js';
import type { NodeGestureConfig } from './node-gesture-coordinator.js';
import type { GraphModel } from '@casehubio/graph-core';
import type { MultiSelectState } from '../editing/types.js';

if (typeof globalThis.PointerEvent === 'undefined') {
  (globalThis as any).PointerEvent = class PointerEvent extends MouseEvent {
    readonly pointerId: number;
    readonly pointerType: string;
    constructor(type: string, init?: PointerEventInit) {
      super(type, init);
      this.pointerId = init?.pointerId ?? 0;
      this.pointerType = init?.pointerType ?? 'mouse';
    }
  };
}

const EMPTY_MODEL = { nodes: [], edges: [] } as unknown as GraphModel;

const NONE_SELECT: MultiSelectState = {
  selectedNodeIds: new Set<string>() as ReadonlySet<string>,
  mode: 'none',
  boundaryInput: null,
  boundaryOutput: null,
};

function makeConfig(overrides: Partial<NodeGestureConfig> = {}): NodeGestureConfig {
  return {
    onConnect: vi.fn(),
    onMove: vi.fn(),
    onSegmentMove: vi.fn(),
    getMultiSelectState: () => NONE_SELECT,
    getModel: () => EMPTY_MODEL,
    ...overrides,
  };
}

function firePointer(
  target: EventTarget,
  type: string,
  opts: Partial<PointerEventInit> & { clientX?: number; clientY?: number } = {},
): PointerEvent {
  const ev = new PointerEvent(type, {
    bubbles: true,
    composed: true,
    pointerId: 1,
    pointerType: 'mouse',
    clientX: 100,
    clientY: 100,
    ...opts,
  });
  target.dispatchEvent(ev);
  return ev;
}

function createNodeDOM(): { container: HTMLElement; node: HTMLElement; handle: HTMLElement } {
  const container = document.createElement('div');
  const node = document.createElement('div');
  node.className = 'react-flow__node';
  node.dataset['id'] = 'node-1';
  const handle = document.createElement('div');
  handle.className = 'stencil-source-handle';
  node.appendChild(handle);
  container.appendChild(node);
  document.body.appendChild(container);
  return { container, node, handle };
}

describe('NodeGestureCoordinator', () => {
  let container: HTMLElement;
  let node: HTMLElement;
  let handle: HTMLElement;
  let coordinator: NodeGestureCoordinator;

  beforeEach(() => {
    ({ container, node, handle } = createNodeDOM());
  });

  afterEach(() => {
    coordinator?.dispose();
    container?.remove();
  });

  it('CLICK: release before hold, no movement → no connect/move called', () => {
    const config = makeConfig();
    coordinator = new NodeGestureCoordinator(config);
    coordinator.attach(container);

    firePointer(node, 'pointerdown');
    firePointer(node, 'pointerup');

    expect(config.onConnect).not.toHaveBeenCalled();
    expect(config.onMove).not.toHaveBeenCalled();
  });

  it('CONNECT: quick drag >3px before 300ms → event replayed on handle', () => {
    const config = makeConfig();
    coordinator = new NodeGestureCoordinator(config);
    coordinator.attach(container);

    const handleCapture = vi.fn();
    handle.addEventListener('pointerdown', handleCapture);

    firePointer(node, 'pointerdown', { clientX: 100, clientY: 100 });
    firePointer(container, 'pointermove', { clientX: 110, clientY: 100 });

    expect(handleCapture).toHaveBeenCalled();
    expect(config.onMove).not.toHaveBeenCalled();
  });

  it('CONNECT on node without source handle → no action', () => {
    handle.remove();
    const config = makeConfig();
    coordinator = new NodeGestureCoordinator(config);
    coordinator.attach(container);

    firePointer(node, 'pointerdown', { clientX: 100, clientY: 100 });
    firePointer(container, 'pointermove', { clientX: 110, clientY: 100 });

    expect(config.onConnect).not.toHaveBeenCalled();
    expect(config.onMove).not.toHaveBeenCalled();
  });

  it('MOVE: hold 300ms then pointer still down → onMove called', async () => {
    const config = makeConfig();
    coordinator = new NodeGestureCoordinator(config);
    coordinator.attach(container);

    firePointer(node, 'pointerdown');
    await new Promise(r => setTimeout(r, 350));

    expect(config.onMove).toHaveBeenCalledWith(
      'node-1',
      expect.any(PointerEvent),
      expect.anything(),
    );
  });

  it('CONNECT replay does not re-enter coordinator — handle receives event exactly once', () => {
    const config = makeConfig();
    coordinator = new NodeGestureCoordinator(config);
    coordinator.attach(container);

    const handleEvents: PointerEvent[] = [];
    handle.addEventListener('pointerdown', (e) => handleEvents.push(e as PointerEvent));

    firePointer(node, 'pointerdown', { clientX: 100, clientY: 100 });
    firePointer(container, 'pointermove', { clientX: 110, clientY: 100 });

    expect(handleEvents).toHaveLength(1);
    expect(config.onConnect).toHaveBeenCalledTimes(1);
  });

  it('stencil-action button click passes through', () => {
    const actionBtn = document.createElement('button');
    actionBtn.className = 'stencil-action';
    node.appendChild(actionBtn);

    const config = makeConfig();
    coordinator = new NodeGestureCoordinator(config);
    coordinator.attach(container);

    const clickHandler = vi.fn();
    actionBtn.addEventListener('click', clickHandler);

    firePointer(actionBtn, 'pointerdown');
    actionBtn.click();

    expect(clickHandler).toHaveBeenCalled();
    expect(config.onConnect).not.toHaveBeenCalled();
    expect(config.onMove).not.toHaveBeenCalled();
  });

  it('second pointer during active classification is ignored', () => {
    const config = makeConfig();
    coordinator = new NodeGestureCoordinator(config);
    coordinator.attach(container);

    firePointer(node, 'pointerdown', { pointerId: 1 });
    firePointer(node, 'pointerdown', { pointerId: 2 });

    expect(config.onConnect).not.toHaveBeenCalled();
    expect(config.onMove).not.toHaveBeenCalled();
  });

  it('touch pointerType uses 10px tolerance — 5px move does NOT trigger CONNECT', () => {
    const config = makeConfig();
    coordinator = new NodeGestureCoordinator(config);
    coordinator.attach(container);

    const handleCapture = vi.fn();
    handle.addEventListener('pointerdown', handleCapture);

    firePointer(node, 'pointerdown', {
      pointerType: 'touch',
      clientX: 100,
      clientY: 100,
    });
    firePointer(container, 'pointermove', {
      pointerType: 'touch',
      clientX: 105,
      clientY: 100,
    });

    expect(handleCapture).not.toHaveBeenCalled();
  });

  it('touch pointerType — 12px move DOES trigger CONNECT', () => {
    const config = makeConfig();
    coordinator = new NodeGestureCoordinator(config);
    coordinator.attach(container);

    const handleCapture = vi.fn();
    handle.addEventListener('pointerdown', handleCapture);

    firePointer(node, 'pointerdown', {
      pointerType: 'touch',
      clientX: 100,
      clientY: 100,
    });
    firePointer(container, 'pointermove', {
      pointerType: 'touch',
      clientX: 112,
      clientY: 100,
    });

    expect(handleCapture).toHaveBeenCalled();
  });

  it('dispose clears hold timer and listeners', async () => {
    const config = makeConfig();
    coordinator = new NodeGestureCoordinator(config);
    coordinator.attach(container);

    firePointer(node, 'pointerdown');
    coordinator.dispose();
    await new Promise(r => setTimeout(r, 350));

    expect(config.onMove).not.toHaveBeenCalled();
  });

  it('multi-select constrained + selected node → onSegmentMove called immediately', () => {
    const segmentState: MultiSelectState = {
      selectedNodeIds: new Set(['node-1']) as ReadonlySet<string>,
      mode: 'constrained',
      boundaryInput: { id: 'e-in', source: 'src', target: 'node-1', type: 'default' } as any,
      boundaryOutput: { id: 'e-out', source: 'node-1', target: 'tgt', type: 'default' } as any,
    };
    const config = makeConfig({
      getMultiSelectState: () => segmentState,
    });
    coordinator = new NodeGestureCoordinator(config);
    coordinator.attach(container);

    firePointer(node, 'pointerdown');

    expect(config.onSegmentMove).toHaveBeenCalled();
    expect(config.onMove).not.toHaveBeenCalled();
  });

  it('multi-select constrained + non-selected node → clears multi-select, individual classification', () => {
    const segmentState: MultiSelectState = {
      selectedNodeIds: new Set(['other-node']) as ReadonlySet<string>,
      mode: 'constrained',
      boundaryInput: { id: 'e-in', source: 'src', target: 'other-node', type: 'default' } as any,
      boundaryOutput: { id: 'e-out', source: 'other-node', target: 'tgt', type: 'default' } as any,
    };
    const config = makeConfig({
      getMultiSelectState: () => segmentState,
    });
    coordinator = new NodeGestureCoordinator(config);
    coordinator.attach(container);

    firePointer(node, 'pointerdown');

    expect(config.onSegmentMove).not.toHaveBeenCalled();
    // Should proceed to individual classification (hold timer), not crash
  });

  it('pointerdown on non-node element does not intercept', () => {
    const config = makeConfig();
    coordinator = new NodeGestureCoordinator(config);
    coordinator.attach(container);

    const bubbleListener = vi.fn();
    container.addEventListener('pointerdown', bubbleListener);

    const outsideEl = document.createElement('div');
    container.appendChild(outsideEl);
    firePointer(outsideEl, 'pointerdown');

    expect(bubbleListener).toHaveBeenCalled();
    expect(config.onConnect).not.toHaveBeenCalled();
    expect(config.onMove).not.toHaveBeenCalled();
  });
});
